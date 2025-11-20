import React from 'react';
import { QuickAction } from '../types/dashboard';

interface QuickActionsDeckProps {
  actions: QuickAction[];
  actionStatus: string | { type: 'success' | 'error' | 'info'; message: string } | null;
}

export default function QuickActionsDeck({ actions, actionStatus }: QuickActionsDeckProps) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Quick Action Deck</p>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            disabled={action.disabled}
            className="text-left border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-500 transition disabled:opacity-50"
          >
            <p className="text-sm font-semibold">{action.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{action.description}</p>
          </button>
        ))}
      </div>
      {actionStatus && (
        <div
          className={`mt-4 rounded-xl border p-3 text-sm ${
            typeof actionStatus === 'string'
              ? 'border-blue-200 text-blue-700'
              : actionStatus.type === 'success'
              ? 'border-green-200 text-green-700'
              : actionStatus.type === 'error'
              ? 'border-red-200 text-red-700'
              : 'border-blue-200 text-blue-700'
          }`}
        >
          {typeof actionStatus === 'string' ? actionStatus : actionStatus.message}
        </div>
      )}
    </div>
  );
}
