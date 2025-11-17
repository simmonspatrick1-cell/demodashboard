import React, { useMemo, useState } from 'react';
import type { Story } from '@ladle/react';
import ScenarioGenerator from '../ScenarioGenerator';
import '../index.css';

const MOCK_TEMPLATES = [
  {
    id: 'story-services',
    name: 'Services Scale-Up',
    description: 'Multi-entity PSA rollout',
    industry: 'Professional Services',
    focusAreas: ['Utilization', 'Billing'],
    budgetRange: '$250K-$400K',
    suggestedSize: '200-350 employees',
    prompt: 'Design a service org scenario with utilization dashboards and billing workflows.',
    defaultStatus: 'Hot'
  },
  {
    id: 'story-saas',
    name: 'SaaS Expansion Playbook',
    description: 'ARR growth and renewals',
    industry: 'SaaS',
    focusAreas: ['ARR', 'Renewals'],
    budgetRange: '$150K-$250K',
    suggestedSize: '150-220 employees',
    prompt: 'Model ARR forecasting, churn mitigation, and renewal automation.',
    defaultStatus: 'Active'
  }
];

const createMockApi = (overrides?: Partial<typeof defaultApi>): typeof defaultApi => ({
  ...defaultApi,
  ...overrides
});

const defaultApi = {
  getTemplates: async () => ({
    templates: MOCK_TEMPLATES
  }),
  generateScenario: async ({ companyName, template }: any) => ({
    id: Date.now(),
    name: `${companyName} - Generated`,
    industry: 'Professional Services',
    prompt: `Generated from template ${template}`,
    status: 'AI Generated',
    focus: ['Resource Planning'],
    budget: '$200K-$350K'
  }),
  saveTemplate: async () => ({
    success: true,
    message: 'Synced template'
  })
};

const StoryShell: React.FC<{
  title: string;
  apiClient?: typeof defaultApi;
  featureFlags?: { templateSync?: boolean };
}> = ({ title, apiClient, featureFlags }) => {
  const [lastScenario, setLastScenario] = useState<any | null>(null);
  const [status, setStatus] = useState<string>('Waiting for generation...');

  const logScenario = (scenario: any) => {
    setLastScenario(scenario);
    setStatus(`Generated ${scenario.name} (${scenario.industry})`);
  };

  const effectiveFlags = useMemo(() => featureFlags ?? {}, [featureFlags]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-4">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <ScenarioGenerator
        onScenarioGenerated={logScenario}
        onClose={() => setStatus('Scenario generator closed')}
        apiClient={apiClient}
        featureFlags={effectiveFlags}
      />
      <div className="max-w-2xl w-full rounded-2xl border bg-white shadow-sm p-4">
        <h3 className="text-sm font-semibold mb-2">Storybook Event Log</h3>
        <p className="text-sm text-gray-600 mb-2">{status}</p>
        {lastScenario && (
          <pre className="text-xs bg-gray-900 text-green-200 p-3 rounded overflow-auto max-h-60">
            {JSON.stringify(lastScenario, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
};

export const Default: Story = () => (
  <StoryShell title="Scenario Generator" apiClient={defaultApi} featureFlags={{ templateSync: false }} />
);

export const WithTemplateSync: Story = () => (
  <StoryShell title="Template Sync Enabled" apiClient={defaultApi} featureFlags={{ templateSync: true }} />
);

export const ApiFallback: Story = () => {
  const failingApi = createMockApi({
    getTemplates: async () => {
      throw new Error('API unavailable');
    }
  });
  return (
    <StoryShell
      title="API Down (Fallback Templates)"
      apiClient={failingApi}
      featureFlags={{ templateSync: false }}
    />
  );
};
