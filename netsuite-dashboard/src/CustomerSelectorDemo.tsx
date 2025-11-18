import React, { useState } from 'react';
import CustomerSelector from './components/CustomerSelector';
import APIService from './api-service';
import { CheckCircle, AlertCircle, Send } from 'lucide-react';

/**
 * Standalone demo page for testing the CustomerSelector component
 * Access at: /customer-demo
 */
function CustomerSelectorDemo() {
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [account, setAccount] = useState('');
  const [prompts, setPrompts] = useState<string[]>(['Create PSA scenario with resource planning']);
  const [industry, setIndustry] = useState('Professional Services');
  const [notes, setNotes] = useState('Test project created from Customer Selector Demo');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleCustomerSelect = (id: string, name?: string) => {
    setCustomerId(id);
    if (name) {
      setCustomerName(name);
      // Auto-generate account code from customer name
      const accountCode = name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10);
      setAccount(`ACCT-${accountCode}`);
    }
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const addPrompt = () => {
    setPrompts([...prompts, '']);
  };

  const removePrompt = (index: number) => {
    if (prompts.length > 1) {
      setPrompts(prompts.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId || !account || prompts.filter(p => p.trim()).length === 0) {
      setResult({
        success: false,
        message: 'Please fill in all required fields'
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const payload = {
        customerId: Number(customerId),
        account,
        prospectName: customerName,
        industry,
        prompts: prompts.filter(p => p.trim()),
        notes,
        website,
        focusAreas: ['Resource Planning', 'Project Management', 'Billing Automation']
      };

      console.log('Syncing project with payload:', payload);

      const response = await APIService.syncProject(payload);

      if (response.success) {
        setResult({
          success: true,
          message: 'Project synced successfully!',
          data: response.data
        });
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to sync project'
        });
      }
    } catch (error: any) {
      console.error('Project sync error:', error);
      setResult({
        success: false,
        message: error.message || 'An unexpected error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCustomerId('');
    setCustomerName('');
    setAccount('');
    setPrompts(['Create PSA scenario with resource planning']);
    setIndustry('Professional Services');
    setNotes('Test project created from Customer Selector Demo');
    setWebsite('');
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Customer Selector Demo
          </h1>
          <p className="text-gray-600">
            Test the customer search and project creation flow
          </p>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Currently running in{' '}
              <span className="font-semibold">mock mode</span>. Set{' '}
              <code className="bg-blue-100 px-2 py-1 rounded">MOCK_NETSUITE_SYNC=false</code>{' '}
              in your .env to connect to real NetSuite.
            </p>
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Selector */}
            <div>
              <CustomerSelector
                onSelect={handleCustomerSelect}
                className="mb-2"
              />
              {customerId && customerName && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle size={16} />
                    <span className="text-sm font-medium">
                      Selected: {customerName} (ID: {customerId})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Account Code */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Account Code *
              </label>
              <input
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="e.g., ACCT-001"
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-generated from customer name, or enter manually
              </p>
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Industry
              </label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select industry...</option>
                <option value="Professional Services">Professional Services</option>
                <option value="SaaS & Subscription">SaaS & Subscription</option>
                <option value="Energy & Utilities">Energy & Utilities</option>
                <option value="Manufacturing">Manufacturing</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Technology">Technology</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Retail">Retail</option>
              </select>
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Project Prompts */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Project Prompts *
              </label>
              <div className="space-y-3">
                {prompts.map((prompt, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => handlePromptChange(index, e.target.value)}
                      placeholder={`Requirement ${index + 1}...`}
                      className="border border-gray-300 rounded-lg px-4 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {prompts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePrompt(index)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addPrompt}
                className="mt-3 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                + Add Another Prompt
              </button>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Project Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional project details, requirements, or notes..."
                rows={4}
                className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !customerId}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                <Send size={18} />
                {isSubmitting ? 'Creating Project...' : 'Create Project in NetSuite'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-colors"
              >
                Reset
              </button>
            </div>
          </form>

          {/* Result Display */}
          {result && (
            <div
              className={`mt-6 p-5 rounded-lg border-2 ${
                result.success
                  ? 'bg-green-50 border-green-300'
                  : 'bg-red-50 border-red-300'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="text-green-600 mt-1" size={24} />
                ) : (
                  <AlertCircle className="text-red-600 mt-1" size={24} />
                )}
                <div className="flex-1">
                  <p
                    className={`font-semibold text-lg ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {result.message}
                  </p>
                  {result.success && result.data && (
                    <div className="mt-4 space-y-2 text-sm text-green-800">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="font-medium">Project ID:</p>
                          <p className="font-mono bg-green-100 px-2 py-1 rounded">
                            {result.data.projectId}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Project Name:</p>
                          <p className="bg-green-100 px-2 py-1 rounded">
                            {result.data.projectName}
                          </p>
                        </div>
                      </div>
                      {result.data.tasks && result.data.tasks.length > 0 && (
                        <div className="mt-3">
                          <p className="font-medium mb-2">
                            Created {result.data.tasks.length} task(s):
                          </p>
                          <ul className="space-y-1">
                            {result.data.tasks.map((task: any, idx: number) => (
                              <li key={idx} className="bg-green-100 px-3 py-2 rounded">
                                <span className="font-medium">{task.name}</span>
                                <span className="text-xs ml-2 text-green-600">
                                  ({task.status})
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-green-300">
                        <p className="text-xs">
                          Synced at: {new Date(result.data.syncedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-800 text-gray-100 rounded-lg p-4 text-xs font-mono">
          <p className="text-gray-400 mb-2">Debug Info:</p>
          <pre className="overflow-x-auto">
            {JSON.stringify(
              {
                customerId,
                customerName,
                account,
                promptCount: prompts.filter(p => p.trim()).length,
                industry,
                hasWebsite: !!website
              },
              null,
              2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default CustomerSelectorDemo;
