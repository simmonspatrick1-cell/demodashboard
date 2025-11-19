# How to Customize Items in Your Dashboard

This guide shows you how to easily rename and customize the NetSuite items used when creating estimates from the dashboard.

## Quick Start: Change Item Names

### Step 1: Open the Configuration File

Edit this file: **`src/itemConfig.js`**

### Step 2: Update the Item Names

Find the `estimateLineItems` section and change the `name` field to any item from your NetSuite account:

```javascript
estimateLineItems: {
  professionalServices: {
    name: 'PS - Post Go-Live Support',  // ← Change this to any NetSuite item
    description: 'Professional Services - Implementation and Configuration',
    percentOfBudget: 0.6
  },
  
  travelExpenses: {
    name: 'EXP_Travel Expenses',  // ← Change this
    description: 'Travel & Expenses - On-site Support',
    percentOfBudget: 0.2
  },
  
  softwareLicensing: {
    name: 'NIN_AA1: SaaS License A',  // ← Change this
    description: 'Software Licensing - Annual Subscription',
    percentOfBudget: 0.2
  }
}
```

### Step 3: Save and Rebuild

```bash
npm run build
vercel --prod
```

That's it! Your estimates will now use the new items.

---

## Your Available NetSuite Items

Here are all the service items from your NetSuite account that you can use:

### Professional Services Items
- `PS - Post Go-Live Support` (Rate: $175/hr)
- `PS - Go-Live Support` (Rate: $200/hr)
- `PS - Training Services` (Rate: $150/hr)
- `PS - Data Migration` (Rate: $140/hr)
- `PS - Discovery & Design Strategy` (Rate: $275/hr)

### Project Services (SVC_PR_*)
- `SVC_PR_Consulting` (Rate: $200/hr)
- `SVC_PR_Project Management` (Rate: $375/hr)
- `SVC_PR_Development` (Rate: $220/hr)
- `SVC_PR_Testing` (Rate: $200/hr)
- `SVC_PR_Training` (Rate: $120/hr)
- `SVC_PR_Integration` (Rate: $220/hr)
- `SVC_PR_Data Migration` (Rate: $125/hr)
- `SVC_PR_Business Analysis` (Rate: $120/hr)
- `SVC_PR_Hourly Support` (Rate: $50/hr)
- `SVC_PR_Travel` (Rate: $200/hr)

### Expense Items
- `EXP_Travel Expenses`
- `EXP_3rd Party Services`

### Software/Licensing
- `NIN_AA1: SaaS License A` (Rate: $24,000)
- `NIN_AA1: Perpetual License`
- `NIN_AA1: Platinum Support` (Rate: $12,000)

### Service Operations (SVC_SO_*)
- `SVC_SO_IT Consulting` (Rate: $200/hr)
- `SVC_SO_IT Install` (Rate: $160/hr)
- `SVC_SO_IT Testing` (Rate: $200/hr)

### Field Services (SVC-*)
- `SVC-001: Field Technician Labor` (Rate: $200/hr)
- `SVC-002: Senior Engineer Labor` (Rate: $225/hr)
- `SVC-003: Project Manager Services` (Rate: $150/day)
- `SVC-004: Inspection Services` (Rate: $150/day)
- `SVC-005: Emergency Response Services` (Rate: $200/hr)

---

## Example Configurations

### Example 1: Use Different Service Items

```javascript
estimateLineItems: {
  professionalServices: {
    name: 'SVC_PR_Consulting',  // Changed to Consulting
    description: 'Strategic Consulting Services',
    percentOfBudget: 0.6
  },
  
  travelExpenses: {
    name: 'SVC_PR_Travel',  // Changed to Travel service
    description: 'Travel and On-site Support',
    percentOfBudget: 0.2
  },
  
  softwareLicensing: {
    name: 'NIN_AA1: Platinum Support',  // Changed to Platinum Support
    description: 'Premium Support Package',
    percentOfBudget: 0.2
  }
}
```

### Example 2: Development Project Items

```javascript
estimateLineItems: {
  professionalServices: {
    name: 'SVC_PR_Development',
    description: 'Custom Development Services',
    percentOfBudget: 0.5
  },
  
  travelExpenses: {
    name: 'SVC_PR_Testing',
    description: 'Quality Assurance and Testing',
    percentOfBudget: 0.3
  },
  
  softwareLicensing: {
    name: 'SVC_PR_Training',
    description: 'End User Training',
    percentOfBudget: 0.2
  }
}
```

### Example 3: Field Services Project

```javascript
estimateLineItems: {
  professionalServices: {
    name: 'SVC-002: Senior Engineer Labor',
    description: 'Senior Engineering Services',
    percentOfBudget: 0.5
  },
  
  travelExpenses: {
    name: 'SVC-001: Field Technician Labor',
    description: 'Field Technician Support',
    percentOfBudget: 0.3
  },
  
  softwareLicensing: {
    name: 'SVC-004: Inspection Services',
    description: 'Inspection and Quality Control',
    percentOfBudget: 0.2
  }
}
```

---

## Using Estimate Presets

The configuration file includes pre-built estimate templates. To use a preset:

### Step 1: Choose a Preset

Available presets in `src/itemConfig.js`:
- `standard` - Standard implementation (PS items)
- `consulting` - Consulting-focused project
- `development` - Custom development project
- `dataMigration` - Data migration project

### Step 2: Modify Dashboard to Use Preset

Edit `DemoDashboard.jsx` and change the estimate creation to use a preset:

```javascript
// Instead of using ITEM_CONFIG.estimateLineItems
// Use a preset:
const preset = ESTIMATE_PRESETS.consulting;  // or .development, .dataMigration

const estimateData = {
  type: 'T&M',
  customerId: selectedCustData.nsId,
  customer: selectedCustData.name,
  total: budgetAmount,
  status: 'PENDING',
  dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
  items: preset.items.map(item => ({
    name: item.name,
    description: item.description,
    quantity: 1,
    rate: parseFloat(budgetAmount) * item.percentOfBudget
  }))
};
```

---

## Advanced: Add More Line Items

To add more than 3 line items to your estimates:

### Step 1: Add to Configuration

```javascript
estimateLineItems: {
  professionalServices: {
    name: 'PS - Post Go-Live Support',
    description: 'Professional Services',
    percentOfBudget: 0.4  // 40%
  },
  
  travelExpenses: {
    name: 'EXP_Travel Expenses',
    description: 'Travel & Expenses',
    percentOfBudget: 0.15  // 15%
  },
  
  softwareLicensing: {
    name: 'NIN_AA1: SaaS License A',
    description: 'Software Licensing',
    percentOfBudget: 0.15  // 15%
  },
  
  // NEW ITEMS:
  projectManagement: {
    name: 'SVC_PR_Project Management',
    description: 'Project Management Services',
    percentOfBudget: 0.15  // 15%
  },
  
  training: {
    name: 'PS - Training Services',
    description: 'End User Training',
    percentOfBudget: 0.15  // 15%
  }
}
```

### Step 2: Update Dashboard

Edit `DemoDashboard.jsx` and add the new items to the `items` array:

```javascript
items: [
  { 
    name: lineItems.professionalServices.name, 
    description: lineItems.professionalServices.description, 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * lineItems.professionalServices.percentOfBudget 
  },
  { 
    name: lineItems.travelExpenses.name, 
    description: lineItems.travelExpenses.description, 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * lineItems.travelExpenses.percentOfBudget 
  },
  { 
    name: lineItems.softwareLicensing.name, 
    description: lineItems.softwareLicensing.description, 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * lineItems.softwareLicensing.percentOfBudget 
  },
  // ADD NEW ITEMS:
  { 
    name: lineItems.projectManagement.name, 
    description: lineItems.projectManagement.description, 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * lineItems.projectManagement.percentOfBudget 
  },
  { 
    name: lineItems.training.name, 
    description: lineItems.training.description, 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * lineItems.training.percentOfBudget 
  }
]
```

---

## Troubleshooting

### Issue: "Could not find item ID for: [Item Name]"

**Cause**: The item name doesn't exactly match a NetSuite item.

**Solution**: 
1. Check the exact spelling in NetSuite (Lists → Accounting → Items)
2. Copy the exact name from the "Name" column
3. Update `src/itemConfig.js` with the exact name

### Issue: Items created with wrong NetSuite item

**Cause**: The SuiteScript mapping is using a different item.

**Solution**: 
1. Update the mapping in `EmailProcessor.suite-script.js` (line ~1044)
2. Add your item name to the `ITEM_NAME_MAPPINGS` object:

```javascript
var ITEM_NAME_MAPPINGS = {
  'Your Dashboard Item Name': 'Exact NetSuite Item Name'
};
```

### Issue: Percentages don't add up to 100%

**Cause**: The `percentOfBudget` values don't sum to 1.0.

**Solution**: Make sure all percentages add up to 1.0 (100%):
- 0.6 + 0.2 + 0.2 = 1.0 ✅
- 0.4 + 0.3 + 0.2 = 0.9 ❌ (only 90%)

---

## Quick Reference: File Locations

| What to Change | File Location |
|---------------|---------------|
| **Item names** | `src/itemConfig.js` |
| **Item descriptions** | `src/itemConfig.js` |
| **Budget percentages** | `src/itemConfig.js` |
| **Number of line items** | `DemoDashboard.jsx` (line ~344) |
| **Item mappings** | `EmailProcessor.suite-script.js` (line ~1044) |

---

## Testing Your Changes

1. **Save all files**
2. **Rebuild**: `npm run build`
3. **Deploy**: `vercel --prod`
4. **Test**: Click "Create Estimate" in the dashboard
5. **Verify**: Check the email body for correct item names
6. **Confirm**: Check NetSuite after the script runs

---

**Last Updated**: November 2025

