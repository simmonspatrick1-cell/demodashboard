# CustomerSelector Integration Example

This guide shows how to integrate the CustomerSelector component into your existing project creation flow.

## Quick Start Example

Here's a complete example of a form that uses the CustomerSelector:

```tsx
import React, { useState } from 'react';
import CustomerSelector from './components/CustomerSelector';
import APIService from './api-service';

function ProjectCreationForm() {
  // Form state
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [account, setAccount] = useState('');
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [industry, setIndustry] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Handle customer selection
  const handleCustomerSelect = (id: string, name?: string) => {
    setCustomerId(id);
    if (name) {
      setCustomerName(name);
      // Auto-fill account if needed
      setAccount(name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10));
    }
  };

  // Handle prompt changes
  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const addPrompt = () => {
    setPrompts([...prompts, '']);
  };

  const removePrompt = (index: number) => {
    setPrompts(prompts.filter((_, i) => i !== index));
  };

  // Submit the project
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId || !account || prompts.filter(p => p.trim()).length === 0) {
      alert('Please fill in all required fields');
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
        focusAreas: ['Resource Planning', 'Project Management']
      };

      const response = await APIService.syncProject(payload);

      if (response.success) {
        setResult({
          success: true,
          message: 'Project synced successfully!',
          data: response.data
        });
        // Reset form or navigate away
      } else {
        setResult({
          success: false,
          message: response.error || 'Failed to sync project'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold mb-6">Create New Project</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Customer Selector */}
        <CustomerSelector
          onSelect={handleCustomerSelect}
          className="mb-4"
        />

        {/* Account Field */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">
            Account Code *
          </label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="e.g., ACCT-001"
            className="border border-gray-300 rounded px-3 py-2 w-full"
            required
          />
        </div>

        {/* Industry Field */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">
            Industry
          </label>
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 w-full"
          >
            <option value="">Select industry...</option>
            <option value="Professional Services">Professional Services</option>
            <option value="SaaS & Subscription">SaaS & Subscription</option>
            <option value="Energy & Utilities">Energy & Utilities</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Technology">Technology</option>
          </select>
        </div>

        {/* Website Field */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">
            Website
          </label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://example.com"
            className="border border-gray-300 rounded px-3 py-2 w-full"
          />
        </div>

        {/* Prompts */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">
            Project Prompts *
          </label>
          {prompts.map((prompt, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => handlePromptChange(index, e.target.value)}
                placeholder="Enter project requirement..."
                className="border border-gray-300 rounded px-3 py-2 flex-1"
              />
              {prompts.length > 1 && (
                <button
                  type="button"
                  onClick={() => removePrompt(index)}
                  className="px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPrompt}
            className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            + Add Prompt
          </button>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-semibold mb-1 text-gray-700">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional project notes..."
            rows={4}
            className="border border-gray-300 rounded px-3 py-2 w-full"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !customerId}
          className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Project...' : 'Create Project'}
        </button>

        {/* Result Message */}
        {result && (
          <div
            className={`p-4 rounded ${
              result.success
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            <p className="font-semibold">{result.message}</p>
            {result.success && result.data && (
              <div className="mt-2 text-sm">
                <p>Project ID: {result.data.projectId}</p>
                <p>Tasks Created: {result.data.tasksCreated || 0}</p>
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}

export default ProjectCreationForm;
```

## Integration with ScenarioGenerator

If you want to add customer selection to the existing ScenarioGenerator, here's how:

### 1. Import the Component

```tsx
import CustomerSelector from './components/CustomerSelector';
```

### 2. Add State for Customer

```tsx
const [customerId, setCustomerId] = useState<string>('');
const [customerName, setCustomerName] = useState<string>('');
```

### 3. Add CustomerSelector to the Form

Find where you have the company name input and add the CustomerSelector above it:

```tsx
{/* Add this before the company name field */}
<CustomerSelector
  onSelect={(id, name) => {
    setCustomerId(id);
    setCustomerName(name || '');
    // Optionally auto-fill company name
    if (name && !companyName) {
      setCompanyName(name);
    }
  }}
/>
```

### 4. Use Customer ID When Syncing to NetSuite

When you call the sync API, include the customer ID:

```tsx
const syncToNetSuite = async () => {
  const payload = {
    customerId: Number(customerId),
    account: `PRJ-${Date.now()}`,
    prospectName: companyName,
    industry,
    prompts: generatedScenario.prompts,
    notes: generatedScenario.notes,
    website,
    focusAreas: selectedTemplate?.focusAreas || []
  };

  const result = await APIService.syncProject(payload);
  // Handle result...
};
```

## Standalone Usage

You can also use CustomerSelector as a standalone component:

```tsx
import CustomerSelector from './components/CustomerSelector';

function MyComponent() {
  return (
    <CustomerSelector
      onSelect={(customerId, customerName) => {
        console.log('Selected customer:', customerId, customerName);
      }}
      initialValue="1001" // Optional: pre-select a customer
      className="my-4" // Optional: add custom classes
    />
  );
}
```

## Props Reference

### CustomerSelector Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `onSelect` | `(customerId: string, customerName?: string) => void` | Yes | Callback when customer is selected |
| `initialValue` | `string` | No | Pre-selected customer ID |
| `className` | `string` | No | Additional CSS classes |

## Testing the Integration

1. **Start the backend**:
   ```bash
   npm run dev
   ```

2. **Start the frontend** (in netsuite-dashboard directory):
   ```bash
   cd netsuite-dashboard
   npm start
   ```

3. **Test the flow**:
   - Select a customer from the dropdown
   - Fill in other form fields
   - Submit the form
   - Check the backend logs for the API call
   - Verify in NetSuite (if connected)

## Mock Data vs Real Data

### Development (Mock Mode)
Set in `.env`:
```bash
MOCK_NETSUITE_SYNC=true
```

You'll see these mock customers:
- Ecotone Analytics
- Acme Corporation
- TechStart Inc
- Global Dynamics
- Innovation Labs

### Production (Real NetSuite)
Set in `.env`:
```bash
MOCK_NETSUITE_SYNC=false
```

The component will fetch real customers from NetSuite via the RESTlet.

## Common Use Cases

### 1. Auto-fill Company Name from Customer

```tsx
<CustomerSelector
  onSelect={(id, name) => {
    setCustomerId(id);
    setCompanyName(name || ''); // Auto-fill
  }}
/>
```

### 2. Require Customer Selection Before Proceeding

```tsx
<button
  disabled={!customerId}
  onClick={handleNext}
>
  Next Step
</button>
```

### 3. Clear Selection

```tsx
const clearCustomer = () => {
  setCustomerId('');
  // CustomerSelector will reset automatically when the key changes
};
```

## Troubleshooting

### Customer list is empty
- Check that backend is running on port 3004
- Verify MOCK_NETSUITE_SYNC is set to true for testing
- Check browser console for errors
- Verify API endpoint: `http://localhost:3004/api/customers/search`

### Search not working
- Check network tab in browser dev tools
- Verify the API is receiving the query parameter
- Check backend logs for errors

### Can't select customer
- Ensure onSelect callback is properly defined
- Check React dev tools for state updates
- Verify customerId state is being set

## Next Steps

1. Test the component in mock mode
2. Deploy NetSuite RESTlet (see NETSUITE_DEPLOYMENT.md)
3. Switch to production mode
4. Test with real customer data
5. Integrate with your project creation workflow
