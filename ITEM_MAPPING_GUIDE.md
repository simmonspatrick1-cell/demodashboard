# Item Mapping Guide: Dashboard → NetSuite

This guide explains how items from the DemoDashboard are mapped to NetSuite items, and how to configure custom mappings.

## How Item Mapping Works

The SuiteScript uses a **3-tier fallback system** to ensure items are always found or created:

### Tier 1: Item Name Mapping (Recommended)
Maps dashboard item names to existing NetSuite items using the `ITEM_NAME_MAPPINGS` configuration.

### Tier 2: Partial Match Search
If exact match fails, searches for items containing keywords like "Professional", "Service", or "Consulting".

### Tier 3: Auto-Create Item
If no match is found, automatically creates a new Service Item in NetSuite.

### Tier 4: Generic Fallback
If creation fails, uses any available active Service Item as a fallback.

---

## Configuring Item Mappings

### Location in SuiteScript

Edit the `ITEM_NAME_MAPPINGS` object in `EmailProcessor.suite-script.js` (around line 1036):

```javascript
var ITEM_NAME_MAPPINGS = {
    // Dashboard item name : NetSuite item name or ID
    'PS - Post Go-Live Support': 'Professional Services',
    'Professional Services': 'Professional Services',
    'Travel & Expenses': 'Travel & Expenses',
    'Software Licensing': 'Software Licensing',
    'Implementation Services': 'Professional Services',
    'Consulting Services': 'Professional Services',
    'Training Services': 'Professional Services',
    'Support Services': 'Professional Services'
};
```

### How to Add Mappings

1. **Find your NetSuite item name**:
   - Go to NetSuite → Lists → Accounting → Items
   - Find the item you want to use
   - Note the **Name/Item ID** field

2. **Add mapping to SuiteScript**:
   ```javascript
   'Dashboard Item Name': 'NetSuite Item Name',
   ```

3. **Save and redeploy** the SuiteScript

---

## Current Dashboard Items

The dashboard currently exports these item names:

| Dashboard Item Name | Description | Suggested NetSuite Mapping |
|-------------------|-------------|---------------------------|
| `PS - Post Go-Live Support` | Professional services line item | → `Professional Services` |

### Example: Estimate Line Items

When you click "Create Estimate" in the dashboard, it sends:

```javascript
items: [
  {
    name: 'PS - Post Go-Live Support',
    description: 'Professional Services - Implementation and Configuration',
    quantity: 1,
    rate: 60000
  },
  {
    name: 'PS - Post Go-Live Support',
    description: 'Travel & Expenses - On-site Support',
    quantity: 1,
    rate: 20000
  },
  {
    name: 'PS - Post Go-Live Support',
    description: 'Software Licensing - Annual Subscription',
    quantity: 1,
    rate: 20000
  }
]
```

All three use the same item name (`PS - Post Go-Live Support`) but have different descriptions.

---

## Recommended Setup Options

### Option 1: Map to Single Item (Current Setup)
**Best for**: Simple setups where you want all services under one item

```javascript
'PS - Post Go-Live Support': 'Professional Services'
```

**Result**: All line items use "Professional Services" item, descriptions differentiate them.

---

### Option 2: Map to Multiple Items (Advanced)
**Best for**: Detailed tracking with separate items for each service type

**Step 1**: Create items in NetSuite:
- `Professional Services` (for implementation/consulting)
- `Travel & Expenses` (for travel costs)
- `Software Licensing` (for licenses/subscriptions)

**Step 2**: Update dashboard to export different item names per line:

Edit `DemoDashboard.jsx` (line ~340):

```javascript
items: [
  { 
    name: 'Professional Services',  // Changed from 'PS - Post Go-Live Support'
    description: 'Implementation and Configuration', 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * 0.6 
  },
  { 
    name: 'Travel & Expenses',  // Changed
    description: 'On-site Support', 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * 0.2 
  },
  { 
    name: 'Software Licensing',  // Changed
    description: 'Annual Subscription', 
    quantity: 1, 
    rate: parseFloat(budgetAmount) * 0.2 
  }
]
```

**Step 3**: Update SuiteScript mappings:

```javascript
var ITEM_NAME_MAPPINGS = {
    'Professional Services': 'Professional Services',
    'Travel & Expenses': 'Travel & Expenses',
    'Software Licensing': 'Software Licensing'
};
```

---

## Auto-Create Item Feature

If an item is not found in NetSuite, the script will **automatically create** a new Service Item.

### What Gets Created

```javascript
// Example: Dashboard sends 'PS - Post Go-Live Support'
// NetSuite creates:
{
  itemid: 'PS_Post_Go_Live_Support',  // Safe alphanumeric ID
  displayname: 'PS - Post Go-Live Support',  // Original name
  description: 'Professional Services - Implementation...',  // From line item
  type: 'Service Item',
  rate: 0  // Default rate (can be overridden on transaction)
}
```

### When Auto-Create Happens

1. Item name not found in `ITEM_NAME_MAPPINGS`
2. No exact match in NetSuite by name or itemid
3. No partial match found
4. Script has permission to create items

### Permissions Required

For auto-create to work, the script's role needs:
- **Lists → Items** permission set to **Full** or **Create**

---

## Troubleshooting

### Issue: "Could not find item ID for: PS - Post Go-Live Support"

**Cause**: Item doesn't exist and auto-create failed

**Solutions**:

1. **Add mapping** (Recommended):
   ```javascript
   'PS - Post Go-Live Support': 'Professional Services'
   ```

2. **Create item manually** in NetSuite:
   - Go to Lists → Accounting → Items → New
   - Type: Service Item
   - Item Name/Number: `PS - Post Go-Live Support`
   - Save

3. **Check permissions**: Ensure role has "Lists → Items" permission

4. **Check logs**: Look for "Create Service Item Error" in execution log

---

### Issue: Items created but with wrong names

**Cause**: Auto-create is working but you want specific NetSuite items

**Solution**: Add mappings to redirect to existing items:

```javascript
'Dashboard Name': 'Existing NetSuite Item Name'
```

---

### Issue: All items use the same NetSuite item

**Cause**: All dashboard items have the same name

**Solution**: Update dashboard to export different item names (see Option 2 above)

---

## Search Logic Details

### Step 1: Exact Match
```javascript
// Searches for:
name = 'Professional Services' OR itemid = 'Professional Services'
// AND
isinactive = false
```

### Step 2: Partial Match
```javascript
// Searches for:
(name CONTAINS 'Professional' OR name CONTAINS 'Service' OR name CONTAINS 'Consulting')
// AND
isinactive = false
```

### Step 3: Create Item
```javascript
// Creates new Service Item with:
itemid = sanitized_name  // 'PS_Post_Go_Live_Support'
displayname = original_name  // 'PS - Post Go-Live Support'
description = line_description
```

### Step 4: Generic Fallback
```javascript
// Finds any active Service Item:
type = 'Service Item'
// AND
isinactive = false
```

---

## Best Practices

### 1. Use Mappings for Consistency
Always map dashboard items to existing NetSuite items for better reporting and consistency.

### 2. Create Items Before First Use
Manually create items in NetSuite before running the script to avoid auto-created items with unexpected names.

### 3. Use Descriptive Item Names
Make item names clear and consistent between dashboard and NetSuite.

### 4. Test with One Estimate First
Create a test estimate to verify mappings before bulk processing.

### 5. Monitor Execution Logs
Check NetSuite script logs to see which items were found, created, or failed.

---

## Quick Reference: Common Mappings

```javascript
var ITEM_NAME_MAPPINGS = {
    // Professional Services
    'PS - Post Go-Live Support': 'Professional Services',
    'Professional Services': 'Professional Services',
    'Consulting': 'Professional Services',
    'Implementation': 'Professional Services',
    
    // Travel
    'Travel & Expenses': 'Travel Expenses',
    'Travel': 'Travel Expenses',
    
    // Software/Licensing
    'Software Licensing': 'Software License',
    'License': 'Software License',
    'Subscription': 'Software License',
    
    // Training
    'Training': 'Training Services',
    'Training Services': 'Training Services',
    
    // Support
    'Support': 'Support Services',
    'Support Services': 'Support Services',
    'Maintenance': 'Support Services'
};
```

---

## Updating the Dashboard

If you want to change what item names the dashboard sends, edit `DemoDashboard.jsx`:

```javascript
// Find the "Create Estimate" action (around line 330)
items: [
  { 
    name: 'YOUR_ITEM_NAME_HERE',  // ← Change this
    description: 'Description here',
    quantity: 1,
    rate: amount
  }
]
```

Then update the mapping in the SuiteScript to match.

---

**Last Updated**: November 2025

