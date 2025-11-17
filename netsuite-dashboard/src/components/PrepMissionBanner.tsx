import React from 'react';
import { BarChart3 } from 'lucide-react';
import { PrepWorkflowStep, Prospect } from '../types/dashboard';

interface PrepMissionBannerProps {
  selectedCustomer: Prospect | null;
  prepCompletion: number;
  completedSteps: number;
  prepWorkflow: PrepWorkflowStep[];
  lastSyncDisplay: string;
  statusCounts: Record<string, number>;
}

export default function PrepMissionBanner({
  selectedCustomer,
  prepCompletion,
  completedSteps,
  prepWorkflow,
  lastSyncDisplay,
  statusCounts
}: PrepMissionBannerProps) {
  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.3em] text-blue-100">Demo Prep Mission</p>
        <h2 className="text-2xl font-semibold mt-1">
          Get {selectedCustomer?.name || 'your next prospect'} demo-ready in minutes
        </h2>
        <p className="text-blue-100 mt-2">
          Capture discovery, generate AI prompts, sync NetSuite data, and share assets from a single workspace.
        </p>
        <div className="flex flex-wrap gap-4 mt-6">
          <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-4 py-3">
            <div>
              <p className="text-3xl font-bold">{prepCompletion}%</p>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100">Workflow Complete</p>
            </div>
            <div className="text-xs text-blue-100/90">
              <p>
                {completedSteps} / {prepWorkflow.length} steps
              </p>
              <p>Last sync: {lastSyncDisplay}</p>
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="grid grid-cols-2 gap-2">
              {prepWorkflow.map((step) => (
                <div
                  key={step.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    step.done ? 'border-green-400 bg-white/20' : 'border-white/40 bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${step.done ? 'bg-green-300' : 'bg-white/60'}`} />
                    <span>{step.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold">Pipeline Snapshot</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">{status}</p>
              <p className="text-2xl font-semibold">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
