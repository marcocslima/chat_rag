'use client';

import SourcesDisplay from './sources-display';
import { User, Bot } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ text: string; score: number; id: string }>;
  timestamp: Date;
}

interface MessageListProps {
  messages: Message[];
}

export default function MessageList({ messages }: MessageListProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      {messages?.map?.((message) => (
        <div
          key={message?.id}
          className={`flex ${message?.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div
            className={`max-w-3xl w-full ${
              message?.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white border-l-4 border-blue-500'
            } rounded-lg shadow-md p-4`}
          >
            <div className="flex items-start gap-3">
              {message?.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-xs ${
                      message?.role === 'user'
                        ? 'text-blue-100'
                        : 'text-gray-500'
                    }`}
                  >
                    {message?.role === 'user' ? 'Você' : 'Assistente IA'} •{' '}
                    {formatTime(message?.timestamp)}
                  </span>
                </div>
                <p
                  className={`whitespace-pre-wrap ${
                    message?.role === 'user' ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  {message?.content}
                </p>

                {message?.role === 'assistant' &&
                  message?.sources &&
                  message?.sources?.length > 0 && (
                    <div className="mt-4">
                      <SourcesDisplay sources={message.sources} />
                    </div>
                  )}
              </div>

              {message?.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
      )) ?? null}
    </>
  );
}