import React, { useState, useEffect } from 'react';
import { Zap, Loader, CheckCircle, AlertCircle, Wand2, RefreshCw } from 'lucide-react';
import APIService from './api-service.js';

export default function ScenarioGenerator({ onScenarioGenerated, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [customization, setCustomization] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await APIService.getScenarioTemplates();
      setTemplates(response.templates || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load scenario templates. Please check your connection.');
    } finally {
      setLoadingTemplates(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplate || !companyName || !industry) {
      setError('Please fill in all required fields');
      return;
    }

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

      // Transform the scenario data for the dashboard
      const transformedScenario = APIService.transformScenarioData(scenarioData);
      
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
    } catch (err) {
      console.error('Scenario generation failed:', err);
      setError(err.message || 'Failed to generate scenario. Please try again.');
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