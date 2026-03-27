/**
 * Configuração centralizada de fontes RAG
 * Para adicionar novas fontes, basta adicionar um novo objeto neste arquivo
 */
export const RAG_SOURCES = {
  legislacao: {
    id: "legislacao",
    name: "Legislação Municipal",
    pineconeNamespace: "legislacao",
    pineconeHost: "https://legislacao-ik17xee.svc.aped-4627-b74a.pinecone.io",
    description: "Consulte leis complementares e legislação municipal",
    icon: "📜"
  }
  // Novas fontes podem ser adicionadas aqui:
  // emails: { id: "emails", name: "E-mails Recebidos", ... },
  // reclamacoes: { id: "reclamacoes", name: "Reclamações de Munícipes", ... }
};

export const getSourceConfig = (sourceId) => {
  return RAG_SOURCES[sourceId] ?? null;
};

export const getAllSources = () => {
  return Object.values(RAG_SOURCES);
};