'use client';

import { useState, useRef, useEffect } from 'react';
import MessageList from './message-list';
import SourcesDisplay from './sources-display';
import SourceSelector from './source-selector';
import { Send, Trash2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ text: string; score: number; id: string }>;
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedSource, setSelectedSource] = useState('legislacao');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const handleClearChat = () => {
    setMessages([]);
    setStreamingMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input?.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...(prev ?? []), userMessage]);
    setInput('');
    setIsLoading(true);
    setStreamingMessage('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: userMessage.content,
          source: selectedSource,
        }),
      });

      if (!response?.ok) {
        throw new Error('Erro na resposta do servidor');
      }

      const reader = response?.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let sources: Array<{ text: string; score: number; id: string }> = [];

      while (true) {
        const { done, value } = (await reader?.read()) ?? {
          done: true,
          value: undefined,
        };
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data?.type === 'sources') {
                sources = data?.data ?? [];
              } else if (data?.type === 'chunk') {
                fullText += data?.data ?? '';
                setStreamingMessage(fullText);
              } else if (data?.type === 'done') {
                // Streaming concluído
              } else if (data?.type === 'error') {
                throw new Error(data?.data ?? 'Erro desconhecido');
              }
            } catch (e) {
              console.error('Erro ao parsear chunk:', e);
            }
          }
        }
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: fullText,
        sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...(prev ?? []), assistantMessage]);
      setStreamingMessage('');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'Desculpe, ocorreu um erro ao processar sua pergunta. Por favor, tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...(prev ?? []), errorMessage]);
      setStreamingMessage('');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Consulta de Legislação Municipal
              </h1>
              <p className="text-blue-200 text-sm">
                Sistema de busca inteligente baseado em IA
              </p>
            </div>
            <SourceSelector
              selectedSource={selectedSource}
              onSourceChange={setSelectedSource}
            />
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-hidden flex flex-col max-w-7xl mx-auto w-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {messages?.length === 0 && !streamingMessage && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl mx-auto p-8">
                <div className="text-6xl mb-4">📜</div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                  Bem-vindo ao sistema de consulta
                </h2>
                <p className="text-gray-600 mb-6">
                  Faça perguntas sobre a legislação municipal e receba respostas
                  fundamentadas nos textos legais.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-left">
                  <p className="text-sm text-gray-700">
                    <strong>Exemplos de perguntas:</strong>
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-2 space-y-1">
                    <li>Quais são as regras para construção em áreas residenciais?</li>
                    <li>Qual o prazo para aprovação de projetos?</li>
                    <li>Quais documentos são necessários para licenciamento?</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <MessageList messages={messages} />

          {streamingMessage && (
            <div className="flex justify-start">
              <div className="bg-white rounded-lg shadow-md p-4 max-w-3xl border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold text-sm">IA</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {streamingMessage}
                      <span className="inline-block w-2 h-4 bg-blue-500 ml-1 animate-pulse" />
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t bg-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-4">
            {messages?.length > 0 && (
              <div className="mb-3 flex justify-end">
                <button
                  onClick={handleClearChat}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Limpar conversa
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e?.target?.value ?? '')}
                placeholder="Digite sua pergunta sobre a legislação..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isLoading || !input?.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2 font-medium"
              >
                <Send className="w-5 h-5" />
                {isLoading ? 'Processando...' : 'Enviar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}