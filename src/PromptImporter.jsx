import React, { useState } from 'react';
import { Upload, Download, RefreshCw, CheckCircle, AlertCircle, FileText, Loader } from 'lucide-react';
import { loadPromptsFromURL, convertToDashboardFormat } from './promptParser';

/**
 * Prompt Importer Component
 * Allows importing and updating prompts from external sources
 */
export default function PromptImporter({ onPromptsImported }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [importedData, setImportedData] = useState(null);
  const handleImportFromFile = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const sourceUrl = '/prompts-ps.html';
      // Load from the selected prompts file in public folder
      const parsedPrompts = await loadPromptsFromURL(sourceUrl);

      if (parsedPrompts.error) {
        setStatus({
          type: 'error',
          message: `Failed to load prompts: ${parsedPrompts.error}`
        });
        setLoading(false);
        return;
      }

      // Convert to dashboard format
      const dashboardPrompts = convertToDashboardFormat(parsedPrompts);

      setImportedData({
        raw: parsedPrompts,
        dashboard: dashboardPrompts,
        stats: {
          categories: parsedPrompts.categories.length,
          totalPrompts: parsedPrompts.allPrompts.length
        }
      });

      setStatus({
        type: 'success',
        message: `Successfully loaded ${parsedPrompts.allPrompts.length} prompts from ${parsedPrompts.categories.length} categories`
      });
    } catch (error) {
      setStatus({
        type: 'error',
        message: `Error importing prompts: ${error.message}`
      });
    }

    setLoading(false);
  };

  const handleApplyPrompts = () => {
    if (importedData && onPromptsImported) {
      onPromptsImported(importedData.dashboard);
      setStatus({
        type: 'success',
        message: 'Prompts successfully applied to dashboard!'
      });
    }
  };

  const handleExportPrompts = () => {
    if (importedData) {
      const dataStr = JSON.stringify(importedData.dashboard, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'netsuite-prompts.json';
      link.click();
      URL.revokeObjectURL(url);

      setStatus({
        type: 'success',
        message: 'Prompts exported successfully!'
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Upload className="text-blue-600" size={24} />
          <h3 className="text-lg font-semibold text-gray-900">Import Prompts</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Import and update demo preparation prompts from the Professional Services guide.
          This will load prompts from the included reference document and make them
          available in your prompt library.
        </p>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleImportFromFile}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader className="animate-spin" size={16} />
            ) : (
              <FileText size={16} />
            )}
            Load Prompts from Document
          </button>

          {importedData && (
            <>
              <button
                onClick={handleApplyPrompts}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <CheckCircle size={16} />
                Apply to Dashboard
              </button>

              <button
                onClick={handleExportPrompts}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Download size={16} />
                Export as JSON
              </button>
            </>
          )}
        </div>

        {status && (
          <div
            className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              status.type === 'success'
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
            role="alert"
          >
            {status.type === 'success' ? (
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  status.type === 'success' ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {status.message}
              </p>
            </div>
          </div>
        )}

        {importedData && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Import Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Categories:</span>
                <span className="ml-2 font-semibold text-blue-900">
                  {importedData.stats.categories}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Total Prompts:</span>
                <span className="ml-2 font-semibold text-blue-900">
                  {importedData.stats.totalPrompts}
                </span>
              </div>
            </div>

            {importedData.raw.categories.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-blue-700 font-medium mb-1">Categories Found:</p>
                <div className="flex flex-wrap gap-1">
                  {importedData.raw.categories.map((cat, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      {cat.name} ({cat.prompts.length})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="text-yellow-600 flex-shrink-0" size={20} />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Note:</p>
            <p>
              Importing prompts will add new categories and prompts to your library. Existing
              prompts with the same names will be overwritten. Consider exporting your current
              prompts before importing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
