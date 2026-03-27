import { NextRequest } from 'next/server';
import { getSourceConfig } from '@/config/sources';

export const dynamic = 'force-dynamic';

interface ChatRequest {
  query: string;
  source: string;
}

interface PineconeMatch {
  id: string;
  score: number;
  metadata?: {
    text?: string;
    [key: string]: any;
  };
}

interface PineconeResponse {
  matches?: PineconeMatch[];
}

/**
 * Busca chunks relevantes no Pinecone usando integrated embedding
 */
async function searchPinecone(
  query: string,
  namespace: string,
  host: string
): Promise<Array<{ text: string; score: number; id: string }>> {
  try {
    const response = await fetch(`${host}/query`, {
      method: 'POST',
      headers: {
        'Api-Key': process.env.PINECONE_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        namespace,
        topK: 5,
        includeMetadata: true,
        query: {
          inputs: {
            text: query,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Pinecone search failed: ${response.status}`);
    }

    const data: PineconeResponse = await response.json();
    const matches = data?.matches ?? [];

    return matches.map((match: PineconeMatch) => ({
      text: match?.metadata?.text ?? '',
      score: match?.score ?? 0,
      id: match?.id ?? '',
    }));
  } catch (error) {
    console.error('Erro ao buscar no Pinecone:', error);
    return [];
  }
}

/**
 * Chama a Gemini API com streaming
 */
async function callGeminiAPI(
  prompt: string
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  return response.body as ReadableStream<Uint8Array>;
}

/**
 * Monta o prompt com contexto dos chunks recuperados
 */
function buildPrompt(query: string, chunks: Array<{ text: string }>): string {
  const context = chunks
    .map((chunk, idx) => `[Trecho ${idx + 1}]\n${chunk?.text ?? ''}`)
    .join('\n\n');

  return `Você é um assistente especializado em legislação municipal brasileira. Sua função é responder perguntas com base nos trechos da legislação fornecidos abaixo.

INSTRUÇÕES:
- Responda de forma clara, objetiva e profissional
- Use linguagem acessível mas técnica quando necessário
- Cite os trechos relevantes da legislação em sua resposta
- Se a informação não estiver nos trechos fornecidos, informe que não há dados suficientes
- Mantenha tom institucional e respeitoso

TRECHOS DA LEGISLAÇÃO:
${context}

PERGUNTA DO USUÁRIO:
${query}

RESPOSTA:`;
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { query, source } = body;

    if (!query || !source) {
      return new Response(
        JSON.stringify({ error: 'Query e source são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Busca configuração da fonte
    const sourceConfig = getSourceConfig(source);
    if (!sourceConfig) {
      return new Response(
        JSON.stringify({ error: 'Fonte RAG não encontrada' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Busca chunks relevantes no Pinecone
    const chunks = await searchPinecone(
      query,
      sourceConfig.pineconeNamespace,
      sourceConfig.pineconeHost
    );

    if (chunks.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Nenhum trecho relevante encontrado na legislação',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Monta prompt com contexto
    const prompt = buildPrompt(query, chunks);

    // Chama Gemini API com streaming
    const geminiStream = await callGeminiAPI(prompt);

    // Cria stream de resposta que processa chunks da Gemini e envia progressivamente
    const stream = new ReadableStream({
      async start(controller) {
        const reader = geminiStream.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = '';
        let fullText = '';

        try {
          // Primeiro, envia as fontes
          const sourcesData = JSON.stringify({
            type: 'sources',
            data: chunks.map((c) => ({
              text: c?.text ?? '',
              score: c?.score ?? 0,
              id: c?.id ?? '',
            })),
          });
          controller.enqueue(encoder.encode(`data: ${sourcesData}\n\n`));

          // Processa stream da Gemini
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (line.trim() === '') continue;

              try {
                const parsed = JSON.parse(line);
                const text =
                  parsed?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

                if (text) {
                  fullText += text;
                  const chunkData = JSON.stringify({
                    type: 'chunk',
                    data: text,
                  });
                  controller.enqueue(encoder.encode(`data: ${chunkData}\n\n`));
                }
              } catch (e) {
                // Ignora linhas que não são JSON válido
                console.error('Erro ao parsear linha:', e);
              }
            }
          }

          // Envia sinal de conclusão
          const doneData = JSON.stringify({
            type: 'done',
            data: fullText,
          });
          controller.enqueue(encoder.encode(`data: ${doneData}\n\n`));
        } catch (error) {
          console.error('Erro no streaming:', error);
          const errorData = JSON.stringify({
            type: 'error',
            data: 'Erro ao processar resposta',
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro na API de chat:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}