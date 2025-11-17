import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Loader, CheckCircle, AlertCircle, Wand2, RefreshCw, Info } from 'lucide-react';
import APIService from './api-service';

interface ScenarioGeneratorProps {
  onScenarioGenerated: (scenario: any) => void;
  onClose: () => void;
}

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

export default function ScenarioGenerator({ onScenarioGenerated, onClose }: ScenarioGeneratorProps) {
  const [templates, setTemplates] = useState<ScenarioTemplate[]>(FALLBACK_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [industry, setIndustry] = useState<string>('');
  const [customization, setCustomization] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const normalizeTemplate = (template: any, idx: number): ScenarioTemplate => ({
    id: template?.id || template?.templateId || `template-${idx}`,
    name: template?.name || template?.title || `Custom Scenario ${idx + 1}`,
    description: template?.description || 'Imported template',
    industry: template?.industry || template?.category || 'Professional Services',
    focusAreas: template?.focusAreas || template?.focus || ['Resource Planning', 'Billing'],
    budgetRange: template?.budgetRange || template?.budget || '$150K-$300K',
    suggestedSize: template?.suggestedSize || template?.size || '150-250 employees',
    prompt: template?.prompt || template?.instructions || 'Design a NetSuite PSA scenario highlighting utilization and billing.',
    defaultStatus: template?.defaultStatus || undefined
  });

  const loadLocalTemplates = useCallback(async () => {
    try {
      const response = await fetch('/data/scenario-templates.json');
      if (!response.ok) {
        throw new Error('Local templates asset missing');
      }
      const payload = await response.json();
      const templatePayload = Array.isArray(payload) ? payload : [];
      if (templatePayload.length > 0) {
        setTemplates(templatePayload.map((tpl: any, idx: number) => normalizeTemplate(tpl, idx)));
        setStatusMessage('Loaded built-in template pack.');
        return;
      }
    } catch (err) {
      console.warn('Failed to load local templates, using embedded fallback.', err);
    }
    setTemplates(FALLBACK_TEMPLATES);
    setStatusMessage('Loaded embedded template pack.');
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setLoadingTemplates(true);
      const response = await APIService.getTemplates();
      const templatePayload = Array.isArray(response?.templates)
        ? response.templates
        : Array.isArray(response)
          ? response
          : [];
      if (templatePayload.length > 0) {
        setTemplates(templatePayload.map((tpl: any, idx: number) => normalizeTemplate(tpl, idx)));
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
  }, [loadLocalTemplates]);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

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
      customization: customization || 'Standard professional services demo scenario'
    };
  };

  const buildOfflineScenario = (templateMeta?: ScenarioTemplate) => {
    const promptSeed = templateMeta?.prompt || 'Design a NetSuite PSA scenario highlighting utilization and billing.';
    return normalizeScenario(
      {
        name: companyName || templateMeta?.name,
        industry,
        description: `${promptSeed}${customization ? `\nCustomization: ${customization}` : ''}`,
        prompt: promptSeed
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
      const scenarioData = await APIService.generateScenario({
        template: selectedTemplate,
        companyName,
        industry,
        customization: customization || 'Standard professional services demo scenario'
      });

      const transformedScenario = normalizeScenario(scenarioData, templateMeta);
      setStatusMessage(null);

      if (transformedScenario) {
        setSuccess(true);
        // Call the parent callback with the new scenario
        if (onScenarioGenerated) {
          onScenarioGenerated(transformedScenario);
        }
        
        // Auto-close after success
        setTimeout(() => {
          if (onClose) onClose();
        }, 2000);
      } else {
        throw new Error('Invalid scenario data received');
      }
    } catch (err: any) {
      console.error('Scenario generation failed:', err);
      const fallbackScenario = buildOfflineScenario(templateMeta);
      setStatusMessage('Generated scenario using offline template pack.');
      setSuccess(true);
      if (onScenarioGenerated) {
        onScenarioGenerated(fallbackScenario);
      }
      setTimeout(() => {
        if (onClose) onClose();
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedTemplate('');
    setCompanyName('');
    setIndustry('');
    setCustomization('');
    setError(null);
    setSuccess(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-blue-500" />
          AI Scenario Generator
        </h3>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl font-bold"
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
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scenario Template *
          </label>
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

        {/* Company Name */}
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

        {/* Industry */}
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

        {/* Customization */}
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

      {/* Action Buttons */}
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

      {/* API Status */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          Powered by Claude AI • Serverless Architecture
        </div>
      </div>
    </div>
  );
}
