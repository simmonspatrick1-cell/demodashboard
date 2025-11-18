# ScenarioGenerator Integration Guide

This guide shows how to integrate the CustomerSelector component into your existing ScenarioGenerator component.

## Option 1: Quick Integration (Recommended)

Add these changes to `ScenarioGenerator.tsx`:

### Step 1: Import the Component

At the top of the file, add:

```tsx
import CustomerSelector from './components/CustomerSelector';
```

### Step 2: Add State for Customer

Around line 140, add these state variables:

```tsx
const [customerId, setCustomerId] = useState<string>('');
const [customerName, setCustomerName] = useState<string>('');
```

### Step 3: Add Customer Selection Handler

Add this handler function after the state declarations:

```tsx
const handleCustomerSelect = (id: string, name?: string) => {
  setCustomerId(id);
  if (name) {
    setCustomerName(name);
    // Auto-fill company name if it's empty
    if (!companyName) {
      setCompanyName(name);
    }
  }
};
```

### Step 4: Add CustomerSelector to the Form

Around line 707, BEFORE the "Company Name" input, add:

```tsx
{/* Customer Selection - Optional */}
<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
  <div className="flex items-center gap-2 mb-2">
    <Info className="w-4 h-4 text-blue-600" />
    <h3 className="text-sm font-semibold text-blue-900">
      Link to NetSuite Customer (Optional)
    </h3>
  </div>
  <CustomerSelector
    onSelect={handleCustomerSelect}
  />
  {customerId && customerName && (
    <div className="mt-2 text-sm text-blue-800 bg-blue-100 px-3 py-2 rounded">
      Selected: <strong>{customerName}</strong> (ID: {customerId})
    </div>
  )}
</div>
```

### Step 5: Update the Reset Function

Find the `resetForm` function (around line 387) and add:

```tsx
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
  // Add these lines:
  setCustomerId('');
  setCustomerName('');
};
```

### Step 6: Use Customer ID When Syncing (Optional)

If you want to sync the generated scenario to NetSuite with the customer link, you can modify your sync function to include the customerId. Find where you might be calling an API and add the customerId to the payload.

## Option 2: Full Integration Example

Here's a complete code snippet showing all the changes together:

```tsx
import CustomerSelector from './components/CustomerSelector';

// ... in the component

function ScenarioGenerator({ ... }: ScenarioGeneratorProps) {
  // ... existing state
  const [companyName, setCompanyName] = useState<string>(defaultCompanyName || '');
  const [industry, setIndustry] = useState<string>(defaultIndustry || '');
  const [website, setWebsite] = useState<string>(defaultWebsite || '');

  // NEW: Add customer selection state
  const [customerId, setCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');

  // NEW: Customer selection handler
  const handleCustomerSelect = (id: string, name?: string) => {
    setCustomerId(id);
    if (name) {
      setCustomerName(name);
      if (!companyName) {
        setCompanyName(name);
      }
    }
  };

  // Update resetForm
  const resetForm = () => {
    // ... existing resets
    setCustomerId('');
    setCustomerName('');
  };

  return (
    // ... template selection UI

    {/* NEW: Customer Selector */}
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Info className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-900">
          Link to NetSuite Customer (Optional)
        </h3>
      </div>
      <p className="text-xs text-blue-700 mb-3">
        Search for and select an existing NetSuite customer to link this scenario to.
      </p>
      <CustomerSelector onSelect={handleCustomerSelect} />
      {customerId && customerName && (
        <div className="mt-2 text-sm text-blue-800 bg-blue-100 px-3 py-2 rounded flex items-center justify-between">
          <span>Selected: <strong>{customerName}</strong></span>
          <button
            onClick={() => {
              setCustomerId('');
              setCustomerName('');
            }}
            className="text-blue-600 hover:text-blue-800 text-xs underline"
          >
            Clear
          </button>
        </div>
      )}
    </div>

    {/* Existing Company Name field */}
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
      {customerName && companyName === customerName && (
        <p className="text-xs text-gray-500 mt-1">
          Auto-filled from selected customer
        </p>
      )}
    </div>

    // ... rest of the form
  );
}
```

## Testing the Integration

1. **Start your backend**:
   ```bash
   npm run dev
   ```

2. **Start your frontend**:
   ```bash
   cd netsuite-dashboard
   npm start
   ```

3. **Test the flow**:
   - Open the Scenario Generator
   - Try selecting a customer from the dropdown
   - Notice the company name gets auto-filled
   - Generate a scenario as usual

## Visual Placement

The CustomerSelector should appear:
```
┌─────────────────────────────────────┐
│  Template Selection                  │
│  (existing dropdown)                 │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  🔵 Link to NetSuite Customer       │ ← NEW
│  Search: [____________]              │
│  Select: [Acme Corp ▼]              │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  Company Name *                      │
│  [Acme Corp]  ← auto-filled         │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│  Industry *                          │
│  [Professional Services]             │
└─────────────────────────────────────┘
```

## Benefits

1. **Optional** - Doesn't break existing workflow
2. **Auto-fill** - Reduces typing for users
3. **NetSuite Integration** - Ready to sync with actual customer records
4. **Visual Feedback** - Shows selected customer clearly
5. **Clearable** - Easy to change selection

## Alternative: Minimal Integration

If you want the absolute minimum change, just add the CustomerSelector without any auto-fill:

```tsx
{/* Before Company Name field */}
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-1">
    NetSuite Customer (Optional)
  </label>
  <CustomerSelector
    onSelect={(id, name) => {
      console.log('Selected customer:', id, name);
      // You can store these in state if needed
    }}
  />
</div>
```

This gives you customer selection without changing any existing behavior.

## Next Steps

1. Implement one of the integration approaches above
2. Test with mock data first
3. Deploy NetSuite RESTlet when ready
4. Switch to production mode (`MOCK_NETSUITE_SYNC=false`)
5. Test with real customer data
