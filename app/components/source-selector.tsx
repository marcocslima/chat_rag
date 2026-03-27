'use client';

import { getAllSources } from '@/config/sources';
import { ChevronDown } from 'lucide-react';

interface SourceSelectorProps {
  selectedSource: string;
  onSourceChange: (source: string) => void;
}

export default function SourceSelector({
  selectedSource,
  onSourceChange,
}: SourceSelectorProps) {
  const sources = getAllSources();
  const currentSource = sources?.find?.((s) => s?.id === selectedSource);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-blue-200 mb-2">
        Fonte de Consulta
      </label>
      <div className="relative">
        <select
          value={selectedSource}
          onChange={(e) => onSourceChange(e?.target?.value ?? '')}
          className="appearance-none w-full sm:w-64 bg-white text-gray-800 px-4 py-2 pr-10 rounded-lg border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer font-medium"
        >
          {sources?.map?.((source) => (
            <option key={source?.id} value={source?.id}>
              {source?.icon} {source?.name}
            </option>
          )) ?? null}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <ChevronDown className="w-5 h-5 text-gray-600" />
        </div>
      </div>
      {currentSource?.description && (
        <p className="text-xs text-blue-200 mt-1">
          {currentSource?.description}
        </p>
      )}
    </div>
  );
}