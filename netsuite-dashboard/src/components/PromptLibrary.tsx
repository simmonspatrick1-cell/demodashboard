import React, { useState } from 'react';
import { Search, ChevronDown, Copy, Star, Check } from 'lucide-react';
import { PromptCategory } from '../types/dashboard';

interface PromptLibraryProps {
  promptSearch: string;
  onPromptSearchChange: (value: string) => void;
  filteredPrompts: PromptCategory[];
  favorites: string[];
  toggleFavorite: (prompt: string) => void;
  copyPrompt: (prompt: string, index: string) => void;
  onApplyPrompt?: (prompt: string) => void;
  appliedPrompts?: string[];
  activeProspectName?: string;
}

export default function PromptLibrary({
  promptSearch,
  onPromptSearchChange,
  filteredPrompts,
  favorites,
  toggleFavorite,
  copyPrompt,
  onApplyPrompt,
  appliedPrompts = [],
  activeProspectName
}: PromptLibraryProps) {
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            value={promptSearch}
            onChange={(e) => onPromptSearchChange(e.target.value)}
            placeholder="Search prompt templates"
            className="pl-9 pr-3 py-2 rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent w-full"
          />
        </div>
        <button className="px-4 py-2 rounded-full border" onClick={() => onPromptSearchChange('')}>
          Clear
        </button>
      </div>

      {!onApplyPrompt && (
        <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-4 text-sm text-gray-500">
          Select a prospect in the Context tab to apply prompts directly.
        </div>
      )}

      <div className="space-y-4">
        {filteredPrompts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 p-10 text-center">
            <p className="text-gray-500">No prompts match your search.</p>
          </div>
        )}

        {filteredPrompts.map((category, categoryIndex) => {
          const isExpanded = expandedCategory === categoryIndex;
          return (
            <div key={category.name} className="rounded-2xl border bg-white dark:bg-gray-900">
              <button
                className="w-full flex justify-between items-center p-4 text-left"
                onClick={() => setExpandedCategory(isExpanded ? null : categoryIndex)}
                aria-expanded={isExpanded}
              >
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Category</p>
                  <h3 className="text-lg font-semibold">{category.name}</h3>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>
              {isExpanded && (
                <div className="border-t border-gray-200 dark:border-gray-800">
                  {category.prompts.map((prompt, promptIdx) => {
                    const promptId = `${categoryIndex}-${promptIdx}`;
                    const isFavorite = favorites.includes(prompt);
                    const isApplied = appliedPrompts.includes(prompt);
                    return (
                      <div key={promptIdx} className="p-4 border-b border-dashed last:border-0">
                        <p className="text-sm text-gray-700 dark:text-gray-200 mb-3">{prompt}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs inline-flex items-center gap-1"
                            onClick={() => copyPrompt(prompt, promptId)}
                          >
                            <Copy className="h-3 w-3" /> Copy Prompt
                          </button>
                          <button
                            className={`px-3 py-1 rounded-full border text-xs inline-flex items-center gap-1 ${
                              isFavorite ? 'border-yellow-400 text-yellow-500' : 'border-gray-300'
                            }`}
                            onClick={() => toggleFavorite(prompt)}
                          >
                            <Star className={`h-3 w-3 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                            {isFavorite ? 'Favorited' : 'Favorite'}
                          </button>
                          <button
                            className={`px-3 py-1 rounded-full border text-xs inline-flex items-center gap-1 ${
                              isApplied
                                ? 'border-green-500 text-green-600 bg-green-50 dark:bg-green-900/20'
                                : 'border-gray-300'
                            } ${!onApplyPrompt ? 'opacity-50 cursor-not-allowed' : ''}`}
                            disabled={!onApplyPrompt}
                            onClick={() => onApplyPrompt?.(prompt)}
                          >
                            <Check className="h-3 w-3" />
                            {isApplied ? 'Applied' : `Apply${activeProspectName ? ` to ${activeProspectName}` : ''}`}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
