import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Zap,
  Loader,
  CheckCircle,
  AlertCircle,
  Wand2,
  RefreshCw,
  Info,
  PlusCircle,
  Save,
  Clipboard as ClipboardIcon,
  FileJson,
  Download,
  Edit3,
  Trash2
} from 'lucide-react';
import APIService from './api-service';
import { config } from './config';

interface ScenarioGeneratorProps {
  onScenarioGenerated: (scenario: any) => void;
  onClose: () => void;
  apiClient?: ScenarioApiClient;
  featureFlags?: ScenarioGeneratorFeatureFlags;
  defaultCompanyName?: string;
  defaultIndustry?: string;
  defaultWebsite?: string;
}

type ScenarioGeneratorFeatureFlags = {
  templateSync?: boolean;
};

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  focusAreas: string[];
  budgetRange: string;
  suggestedSize: string;
  prompt: string;
  defaultStatus?: string;
  synced?: boolean;
  website?: string;
}

interface TemplateFormState {
  id?: string;
  name: string;
  description: string;
  industry: string;
  focusAreas: string;
  budgetRange: string;
  suggestedSize: string;
  prompt: string;
  defaultStatus?: string;
}

const FALLBACK_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'services-scale',
    name: 'Services Scale-Up',
    description: 'Multi-entity professional services org preparing for PSA roll-out.',
    industry: 'Professional Services',
    focusAreas: ['Resource Planning', 'Billing Automation', 'Utilization'],
    budgetRange: '$250K-$450K',
    suggestedSize: '250-400 employees',
    prompt: 'Create PSA scenario with 3 delivery pods, cross-entity billing, and utilization dashboards.',
    defaultStatus: 'Active'
  },
  {
    id: 'saas-expansion',
    name: 'SaaS Expansion Playbook',
    description: 'Subscription-based services group expanding into new markets.',
    industry: 'SaaS & Subscription',
    focusAreas: ['Revenue Forecasting', 'Subscriptions', 'Project Financials'],
    budgetRange: '$180K-$320K',
    suggestedSize: '150-220 employees',
    prompt: 'Model ARR growth, project delivery, and subscription renewals with SuiteProjects.',
    defaultStatus: 'Hot'
  },
  {
    id: 'energy-field',
    name: 'Energy Field Services',
    description: 'Field operations with heavy resource scheduling and compliance tracking.',
    industry: 'Energy & Utilities',
    focusAreas: ['Resource Scheduling', 'Compliance', 'Multi-Subsidiary Billing'],
    budgetRange: '$300K-$600K',
    suggestedSize: '300-500 employees',
    prompt: 'Create multi-subsidiary field operations scenario with crews, compliance costs, and asset billing.',
    defaultStatus: 'Qualified'
  }
];

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  id: '',
  name: '',
  description: '',
  industry: '',
  focusAreas: '',
  budgetRange: '',
  suggestedSize: '',
  prompt: '',
  defaultStatus: 'Qualified'
};

const buildPromptBundle = (scenario: any, fallbackCustomization: string) => {
  const focusAreas = Array.isArray(scenario?.focus) ? scenario.focus.join(', ') : scenario?.focus;
  return [
    `Scenario: ${scenario?.name}`,
    `Industry: ${scenario?.industry}`,
    `Budget: ${scenario?.budget}`,
    `Status: ${scenario?.status}`,
    `Focus Areas: ${focusAreas || 'Resource Planning'}`,
    '',
    'Prompt',
    scenario?.prompt,
    '',
    'Customization',
    scenario?.customization || fallbackCustomization || 'Standard professional services demo scenario'
  ].join('\n');
};

type ScenarioApiClient = Pick<typeof APIService, 'getTemplates' | 'generateScenario' | 'saveTemplate'>;

export default function ScenarioGenerator({
  onScenarioGenerated,
  onClose,
  apiClient = APIService,
  featureFlags,
  defaultCompanyName,
  defaultIndustry,
  defaultWebsite
}: ScenarioGeneratorProps) {
  const [baseTemplates, setBaseTemplates] = useState<ScenarioTemplate[]>(FALLBACK_TEMPLATES);
  const [customTemplates, setCustomTemplates] = useState<ScenarioTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>(defaultCompanyName || '');
  const [industry, setIndustry] = useState<string>(defaultIndustry || '');
  const [website, setWebsite] = useState<string>(defaultWebsite || '');
  const [customization, setCustomization] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [generatedScenario, setGeneratedScenario] = useState<any | null>(null);
  const [showTemplateManager, setShowTemplateManager] = useState<boolean>(false);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM);

  const templates = useMemo(() => [...baseTemplates, ...customTemplates], [baseTemplates, customTemplates]);
  const templateStorageKey = config.storage.scenarioTemplates;
  const templateSyncEnabled = Boolean(
    featureFlags?.templateSync ?? config.features?.templateSync
  );

  const normalizeTemplate = useCallback((template: any, idx: number): ScenarioTemplate => ({
    id: template?.id || template?.templateId || `template-${idx}`,
    name: template?.name || template?.title || `Custom Scenario ${idx + 1}`,
    description: template?.description || 'Imported template',
    industry: template?.industry || template?.category || 'Professional Services',
    focusAreas: template?.focusAreas || template?.focus || ['Resource Planning', 'Billing'],
    budgetRange: template?.budgetRange || template?.budget || '$150K-$300K',
    suggestedSize: template?.suggestedSize || template?.size || '150-250 employees',
    prompt: template?.prompt || template?.instructions || 'Design a NetSuite PSA scenario highlighting utilization and billing.',
    defaultStatus: template?.defaultStatus || undefined,
    synced: template?.synced !== false
  }), []);

  const persistCustomTemplates = useCallback(
    (nextTemplates: ScenarioTemplate[] | ((prev: ScenarioTemplate[]) => ScenarioTemplate[])) => {
      setCustomTemplates((prev) => {
        const resolved =
          typeof nextTemplates === 'function'
            ? nextTemplates(prev)
            : nextTemplates;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(templateStorageKey, JSON.stringify(resolved));
          }
        } catch (err) {
          console.error('Failed to persist custom templates', err);
        }
        return resolved;
      });
    },
    [templateStorageKey]
  );

  const syncTemplateToApi = useCallback(
    async (template: ScenarioTemplate, opts: { silent?: boolean } = {}) => {
      if (!templateSyncEnabled) return;
      try {
        await apiClient.saveTemplate(template);
        persistCustomTemplates((prev) =>
          prev.map((tpl) =>
            tpl.id === template.id ? { ...tpl, synced: true } : tpl
          )
        );
        if (!opts.silent) {
          setStatusMessage('Template synced to managed library.');
        }
      } catch (err) {
        console.warn('Template sync failed:', err);
        if (!opts.silent) {
          setError('Template saved locally but sync failed.');
        }
      }
    },
    [apiClient, persistCustomTemplates, templateSyncEnabled]
  );

  const loadLocalTemplates = useCallback(async () => {
    try {
      const response = await fetch('/data/scenario-templates.json');
      if (!response.ok) {
        throw new Error('Local templates asset missing');
      }
      const payload = await response.json();
      const templatePayload = Array.isArray(payload) ? payload : [];
      if (templatePayload.length > 0) {
        setBaseTemplates(templatePayload.map((tpl: any, idx: number) => normalizeTemplate(tpl, idx)));
        setStatusMessage('Loaded built-in template pack.');
        return;
      }
    } catch (err) {
      console.warn('Failed to load local templates, using embedded fallback.', err);
    }
    setBaseTemplates(FALLBACK_TEMPLATES);
    setStatusMessage('Loaded embedded template pack.');
  }, [normalizeTemplate]);

  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const response = await apiClient.getTemplates();
      const templatePayload = Array.isArray(response?.templates)
        ? response.templates
        : Array.isArray(response)
          ? response
          : [];
      if (templatePayload.length > 0) {
        setBaseTemplates(templatePayload.map((tpl: any, idx: number) => normalizeTemplate(tpl, idx)));
        setStatusMessage(null);
      } else {
        await loadLocalTemplates();
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load templates:', err);
      await loadLocalTemplates();
      setError(null);
    } finally {
      setLoadingTemplates(false);
    }
  }, [apiClient, loadLocalTemplates, normalizeTemplate]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    setCompanyName(defaultCompanyName || '');
  }, [defaultCompanyName]);

  useEffect(() => {
    setIndustry(defaultIndustry || '');
  }, [defaultIndustry]);

  useEffect(() => {
    setWebsite(defaultWebsite || '');
  }, [defaultWebsite]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(templateStorageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          persistCustomTemplates(parsed.map((tpl: any, idx: number) => normalizeTemplate(tpl, idx)));
        }
      }
    } catch (err) {
      console.error('Failed to load custom templates', err);
    }
  }, [templateStorageKey, persistCustomTemplates, normalizeTemplate]);

  useEffect(() => {
    if (!templateSyncEnabled || customTemplates.length === 0) return;
    const pendingSync = customTemplates.filter((tpl) => tpl.synced === false);
    pendingSync.forEach((template) => {
      syncTemplateToApi(template, { silent: true });
    });
  }, [customTemplates, templateSyncEnabled, syncTemplateToApi]);

  const normalizeScenario = (data: any, templateMeta?: ScenarioTemplate) => {
    const now = new Date();
    const sanitizedName = companyName?.trim() || data?.name || 'AI Scenario Company';
    return {
      id: data?.id || now.getTime(),
      name: data?.name || sanitizedName,
      entityid:
        data?.entityid ||
        `${sanitizedName.replace(/\s+/g, '-').toUpperCase().slice(0, 12)}-${now.getFullYear()}`,
      industry: data?.industry || industry || templateMeta?.industry || 'Professional Services',
      size: data?.size || templateMeta?.suggestedSize || '150-250 employees',
      status: data?.status || templateMeta?.defaultStatus || 'AI Generated',
      demoDate: data?.demoDate || now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      focus: data?.focus || templateMeta?.focusAreas || ['Resource Planning', 'Billing'],
      budget: data?.budget || templateMeta?.budgetRange || '$200K-$350K',
      nsId: data?.nsId || Math.floor(Math.random() * 4000) + 2000,
      aiGenerated: true,
      createdAt: now,
      description: data?.description || templateMeta?.description,
      prompt: data?.prompt || templateMeta?.prompt,
      category: data?.category || templateMeta?.industry || 'AI Scenario',
      companyName: sanitizedName,
      customization: customization || 'Standard professional services demo scenario',
      website: data?.website || website || templateMeta?.website
    };
  };

  const buildOfflineScenario = (templateMeta?: ScenarioTemplate) => {
    const promptSeed = templateMeta?.prompt || 'Design a NetSuite PSA scenario highlighting utilization and billing.';
    return normalizeScenario(
      {
        name: companyName || templateMeta?.name,
        industry,
        description: `${promptSeed}${customization ? `\nCustomization: ${customization}` : ''}`,
        prompt: promptSeed,
        website
      },
      templateMeta
    );
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !companyName || !industry) {
      setError('Please fill in all required fields');
      return;
    }

    const templateMeta = templates.find((tpl) => tpl.id === selectedTemplate);
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const scenarioData = await apiClient.generateScenario({
        template: selectedTemplate,
        companyName,
        industry,
        website,
        websiteUrl: website,
        customization: customization || 'Standard professional services demo scenario'
      });

      const transformedScenario = normalizeScenario(scenarioData, templateMeta);
      setStatusMessage('Scenario ready to export and share.');

      if (transformedScenario) {
        setSuccess(true);
        setGeneratedScenario(transformedScenario);
        if (onScenarioGenerated) {
          onScenarioGenerated(transformedScenario);
        }
      } else {
        throw new Error('Invalid scenario data received');
      }
    } catch (err: any) {
      console.error('Scenario generation failed:', err);
      const fallbackScenario = buildOfflineScenario(templateMeta);
      setStatusMessage('Generated scenario using offline template pack.');
      setSuccess(true);
      setGeneratedScenario(fallbackScenario);
      if (onScenarioGenerated) {
        onScenarioGenerated(fallbackScenario);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setCompanyName(defaultCompanyName || '');
    setIndustry(defaultIndustry || '');
    setWebsite(defaultWebsite || '');
    setCustomization('');
    setError(null);
    setSuccess(false);
    setGeneratedScenario(null);
    setStatusMessage(null);
  };

  const handleTemplateFormChange = (field: keyof TemplateFormState, value: string) => {
    setTemplateForm((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const saveTemplateDraft = () => {
    if (!templateForm.name.trim() || !templateForm.prompt.trim()) {
      setError('Template name and prompt are required.');
      return;
    }

    const templatePayload: ScenarioTemplate = {
      id: templateForm.id?.trim() || `custom-${Date.now()}`,
      name: templateForm.name.trim(),
      description: templateForm.description.trim() || 'Custom template',
      industry: templateForm.industry.trim() || 'Professional Services',
      focusAreas: templateForm.focusAreas
        ? templateForm.focusAreas.split(',').map((area) => area.trim()).filter(Boolean)
        : ['Resource Planning'],
      budgetRange: templateForm.budgetRange.trim() || '$150K-$300K',
      suggestedSize: templateForm.suggestedSize.trim() || '150-250 employees',
      prompt: templateForm.prompt.trim(),
      defaultStatus: templateForm.defaultStatus?.trim() || 'Qualified',
      synced: templateSyncEnabled ? false : true
    };

    const alreadyExists = customTemplates.some((tpl) => tpl.id === templatePayload.id);
    const updatedTemplates = alreadyExists
      ? customTemplates.map((tpl) => (tpl.id === templatePayload.id ? templatePayload : tpl))
      : [...customTemplates, templatePayload];

    persistCustomTemplates(updatedTemplates);
    setStatusMessage(
      alreadyExists
        ? 'Template updated.'
        : templateSyncEnabled
          ? 'Template saved locally. Syncing to managed pack...'
          : 'Template saved locally.'
    );
    setError(null);
    setTemplateForm(DEFAULT_TEMPLATE_FORM);

    if (templateSyncEnabled) {
      syncTemplateToApi(templatePayload);
    }
  };

  const handleEditTemplate = (template: ScenarioTemplate) => {
    setShowTemplateManager(true);
    setTemplateForm({
      id: template.id,
      name: template.name,
      description: template.description,
      industry: template.industry,
      focusAreas: template.focusAreas?.join(', ') || '',
      budgetRange: template.budgetRange,
      suggestedSize: template.suggestedSize,
      prompt: template.prompt,
      defaultStatus: template.defaultStatus || 'Qualified'
    });
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updatedTemplates = customTemplates.filter((tpl) => tpl.id !== templateId);
    persistCustomTemplates(updatedTemplates);
    if (selectedTemplate === templateId) {
      setSelectedTemplate('');
    }
    setStatusMessage('Template removed.');
  };

  const copyScenarioJSON = async () => {
    if (!generatedScenario) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(generatedScenario, null, 2));
      setStatusMessage('Scenario JSON copied to clipboard.');
    } catch (err) {
      console.error('Failed to copy scenario JSON', err);
      setError('Clipboard copy failed. Please copy manually.');
    }
  };

  const copyPromptBundle = async () => {
    if (!generatedScenario) return;
    try {
      await navigator.clipboard.writeText(buildPromptBundle(generatedScenario, customization));
      setStatusMessage('Prompt bundle copied to clipboard.');
    } catch (err) {
      console.error('Failed to copy prompt bundle', err);
      setError('Clipboard copy failed. Please copy manually.');
    }
  };

  const downloadScenario = () => {
    if (!generatedScenario) return;
    const blob = new Blob([JSON.stringify(generatedScenario, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${generatedScenario.name.replace(/\s+/g, '-').toLowerCase()}-scenario.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    setStatusMessage('Scenario downloaded.');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full" role="dialog" aria-label="AI Scenario Generator">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-500" />
          AI Scenario Generator
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          aria-label="Close scenario generator"
        >
          ×
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {statusMessage && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
          <Info className="w-4 h-4" />
          <span className="text-sm">{statusMessage}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm">Scenario generated successfully!</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between gap-3 mb-1">
            <label className="block text-sm font-medium text-gray-700">
              Scenario Template *
            </label>
            <button
              type="button"
              onClick={() => setShowTemplateManager((prev) => !prev)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              <PlusCircle className="w-3 h-3" />
              {showTemplateManager ? 'Hide manager' : 'Manage templates'}
            </button>
          </div>
          {loadingTemplates ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader className="w-4 h-4 animate-spin" />
              Loading templates...
            </div>
          ) : (
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          )}
        </div>

        {showTemplateManager && (
          <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-3">
            <div className="text-xs text-gray-600">
              Custom templates are stored locally in your browser. Use them to tailor scenarios for specific industries.
            </div>
            <div className="grid gap-2">
              <input
                type="text"
                value={templateForm.name}
                onChange={(e) => handleTemplateFormChange('name', e.target.value)}
                placeholder="Template name"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                value={templateForm.description}
                onChange={(e) => handleTemplateFormChange('description', e.target.value)}
                placeholder="Short description"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={templateForm.industry}
                  onChange={(e) => handleTemplateFormChange('industry', e.target.value)}
                  placeholder="Industry"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={templateForm.defaultStatus}
                  onChange={(e) => handleTemplateFormChange('defaultStatus', e.target.value)}
                  placeholder="Default status"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <input
                type="text"
                value={templateForm.focusAreas}
                onChange={(e) => handleTemplateFormChange('focusAreas', e.target.value)}
                placeholder="Focus areas (comma separated)"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={templateForm.budgetRange}
                  onChange={(e) => handleTemplateFormChange('budgetRange', e.target.value)}
                  placeholder="Budget range"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                <input
                  type="text"
                  value={templateForm.suggestedSize}
                  onChange={(e) => handleTemplateFormChange('suggestedSize', e.target.value)}
                  placeholder="Suggested size"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <textarea
                value={templateForm.prompt}
                onChange={(e) => handleTemplateFormChange('prompt', e.target.value)}
                placeholder="Prompt details"
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                rows={3}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setTemplateForm(DEFAULT_TEMPLATE_FORM);
                  setError(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTemplateDraft}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Save className="w-3 h-3" />
                {templateForm.id ? 'Update template' : 'Save template'}
              </button>
            </div>
            {customTemplates.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-700">Your templates</div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {customTemplates.map((template) => (
                    <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-gray-800">{template.name}</div>
                          <div className="text-gray-500">{template.industry}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditTemplate(template)}
                            className="text-blue-500 hover:text-blue-600 p-1"
                            aria-label={`Edit template ${template.name}`}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-500 hover:text-red-600 p-1"
                            aria-label={`Delete template ${template.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company Name *
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Professional Services"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Industry *
          </label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Professional Services, Manufacturing"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website URL
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://prospect-site.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
          {defaultWebsite && (
            <p className="text-xs text-gray-500 mt-1">Pulled from the selected prospect.</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Special Requirements
          </label>
          <textarea
            value={customization}
            onChange={(e) => setCustomization(e.target.value)}
            placeholder="Any specific requirements or focus areas for the demo..."
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={resetForm}
          className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          disabled={isLoading}
        >
          <RefreshCw className="w-4 h-4 inline mr-2" />
          Reset
        </button>
        <button
          onClick={handleGenerate}
          disabled={isLoading || !selectedTemplate || !companyName || !industry}
          className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Generate Scenario
            </>
          )}
        </button>
      </div>

      {generatedScenario && (
        <div className="mt-6 border-t border-gray-200 pt-4">
          <div className="text-sm font-medium text-gray-800 mb-2">Share or export</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={copyScenarioJSON}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <FileJson className="w-4 h-4 text-gray-600" />
              Copy JSON
            </button>
            <button
              type="button"
              onClick={copyPromptBundle}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <ClipboardIcon className="w-4 h-4 text-gray-600" />
              Prompt bundle
            </button>
            <button
              type="button"
              onClick={downloadScenario}
              className="flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
            >
              <Download className="w-4 h-4 text-gray-600" />
              Download
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Powered by Claude AI • Serverless Architecture
        </div>
      </div>
    </div>
  );
}
