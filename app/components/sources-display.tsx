'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, FileText } from 'lucide-react';

interface Source {
  text: string;
  score: number;
  id: string;
}

interface SourcesDisplayProps {
  sources: Source[];
}

export default function SourcesDisplay({ sources }: SourcesDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!sources || sources?.length === 0) return null;

  return (
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
      >
        <FileText className="w-4 h-4" />
        <span>
          {sources?.length ?? 0}{' '}
          {sources?.length === 1 ? 'trecho' : 'trechos'} da legislação
          consultados
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          {sources?.map?.((source, idx) => (
            <div
              key={source?.id ?? idx}
              className="bg-gray-50 rounded-lg p-3 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">
                  Trecho {idx + 1}
                </span>
                <span className="text-xs text-gray-500">
                  Relevância: {((source?.score ?? 0) * 100).toFixed(1)}%
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {source?.text ?? 'Texto não disponível'}
              </p>
            </div>
          )) ?? null}
        </div>
      )}
    </div>
  );
}