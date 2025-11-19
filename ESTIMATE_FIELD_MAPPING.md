# Estimate Field Mapping: Dashboard → NetSuite

This document shows how estimate fields from the DemoDashboard are mapped to NetSuite Estimate record fields.

## Header Fields

| Dashboard Field | NetSuite Field | NetSuite Field ID | Notes |
|----------------|----------------|-------------------|-------|
| `estimate.customerId` | Customer | `entity` | **Required** - Internal ID of customer |
| `estimate.customer` | Customer Name | - | Display only, not used in API |
| `estimate.type` | - | - | Not currently mapped (T&M vs Fixed) |
| `estimate.status` | Status | `status` | Mapped: PENDING→'B', OPEN→'A', CLOSED→'C', EXPIRED→'D' |
| `estimate.dueDate` | Due Date | `duedate` | Date field |
| `estimate.total` | Total | - | Calculated from line items |
| `project.id` | Job/Project | `job` | Optional - Links estimate to project |
| (auto) | Transaction Date | `trandate` | Set to today's date |
| `estimate.memo` | Memo | `memo` | Optional message/notes |

## Line Item Fields

| Dashboard Field | NetSuite Field | NetSuite Field ID | Notes |
|----------------|----------------|-------------------|-------|
| `items[].name` | Item | `item` | Used to search for NetSuite item by name/itemid |
| `items[].description` | Description | `description` | Detailed description (overrides item default) |
| `items[].quantity` | Quantity | `quantity` | Numeric, defaults to 1 |
| `items[].rate` | Rate | `rate` | Price per unit |
| (calculated) | Amount | `amount` | quantity × rate |

## Example: Dashboard Export Data

```javascript
{
  type: 'T&M',
  customerId: 3161,
  customer: 'AdvisorHR',
  total: '100000',
  status: 'PENDING',
  dueDate: '2025-12-19',
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
}
```

## Example: NetSuite Record Creation

```javascript
// Create estimate record
var estimateRecord = record.create({
  type: record.Type.ESTIMATE,
  isDynamic: true
});

// Set header fields
estimateRecord.setValue({ fieldId: 'entity', value: 3161 });          // Customer
estimateRecord.setValue({ fieldId: 'status', value: 'B' });           // PENDING
estimateRecord.setValue({ fieldId: 'duedate', value: new Date('2025-12-19') });
estimateRecord.setValue({ fieldId: 'trandate', value: new Date() });  // Today

// Add line items
estimateRecord.selectNewLine({ sublistId: 'item' });
estimateRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'item', value: itemId });
estimateRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'description', value: 'Professional Services - Implementation and Configuration' });
estimateRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'quantity', value: 1 });
estimateRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'rate', value: 60000 });
estimateRecord.setCurrentSublistValue({ sublistId: 'item', fieldId: 'amount', value: 60000 });
estimateRecord.commitLine({ sublistId: 'item' });

// Save
var estimateId = estimateRecord.save();
```

## Status Mapping

The dashboard sends human-readable status values that are mapped to NetSuite's internal status codes:

| Dashboard Status | NetSuite Status Code | NetSuite Status Label |
|-----------------|---------------------|----------------------|
| `PENDING` | `B` | Pending |
| `OPEN` | `A` | Open |
| `CLOSED` | `C` | Closed |
| `EXPIRED` | `D` | Expired |

## Item Lookup Logic

The SuiteScript searches for items in this order:

1. **Search by exact name**: `item.name === 'PS - Post Go-Live Support'`
2. **Search by item ID**: `item.itemid === 'PS - Post Go-Live Support'`
3. **Fallback**: Find any active service item in NetSuite

If no item is found, the line item is skipped and an error is logged.

## Important Notes

1. **Customer ID is required** - The estimate cannot be created without a valid customer internal ID
2. **At least one line item is required** - NetSuite will reject estimates with no line items
3. **Item must exist** - The `name` field must match an existing NetSuite item (name or itemid)
4. **Description overrides default** - The `description` field from the dashboard will replace the item's default description
5. **Dates must be valid** - Invalid date formats will be caught and logged as errors
6. **Dynamic record mode** - The estimate is created in dynamic mode to handle calculations automatically

## Troubleshooting

### "You must enter at least one line item"
- **Cause**: No items in the `items[]` array or all items failed to add
- **Fix**: Ensure `estimate.items` array has at least one valid item

### "Could not find item ID for: PS - Post Go-Live Support"
- **Cause**: Item doesn't exist in NetSuite with that exact name
- **Fix**: 
  1. Create the item in NetSuite with name "PS - Post Go-Live Support"
  2. Or update dashboard to use an existing item name
  3. Or ensure fallback service item exists

### "Invalid login attempt" or "Permission violation"
- **Cause**: NetSuite access token doesn't have permission to create estimates
- **Fix**: Ensure the role has "Transactions → Estimates" permission set to "Full"

### Line items have wrong description
- **Cause**: Description field not being set correctly
- **Fix**: Verify `items[].description` is populated in dashboard export

## Field Validation

| Field | Required | Type | Validation |
|-------|----------|------|------------|
| `entity` (customer) | ✅ Yes | Integer | Must be valid customer internal ID |
| `status` | ❌ No | String | Must be 'A', 'B', 'C', or 'D' |
| `duedate` | ❌ No | Date | Must be valid date |
| `trandate` | ✅ Yes | Date | Auto-set to today |
| `item` (line) | ✅ Yes | Integer | Must be valid item internal ID |
| `quantity` (line) | ✅ Yes | Number | Must be > 0 |
| `rate` (line) | ✅ Yes | Number | Can be 0 or positive |
| `description` (line) | ❌ No | String | Max 4000 chars |

---

**Last Updated**: November 2025

