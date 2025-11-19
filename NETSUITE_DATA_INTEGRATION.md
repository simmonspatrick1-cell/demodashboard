# NetSuite Data Integration Guide

This guide explains how classes, departments, employees, locations, and items are integrated into the dashboard with renaming capabilities that flow through to NetSuite.

## Overview

The system now supports:
1. **Items** - Service items with copy & rename functionality
2. **Classes** - NetSuite classifications for tracking
3. **Departments** - Department assignments
4. **Employees** - Employee/resource assignments
5. **Locations** - Location/office assignments

All of these can be renamed in the dashboard, and the renamed values will flow through the email export to NetSuite.

## File Structure

```
/src/netsuiteData.js          # Reference data for classes, departments, employees, locations
/email-export-utils.js        # Email formatting with renamed data support
/EmailProcessor.suite-script.js  # NetSuite SuiteScript processor
/DemoDashboard.jsx            # Main dashboard (to be updated)
```

## How It Works

### 1. Data Storage ([src/netsuiteData.js](src/netsuiteData.js))

This file contains all NetSuite reference data exported from your account:

```javascript
export const NETSUITE_CLASSES = [
  { id: '1', name: 'Professional Services', displayName: null },
  { id: '2', name: 'Software Sales', displayName: 'SaaS Sales' }, // Renamed
  // ...
];
```

**Fields:**
- `id` - NetSuite internal ID
- `name` - Original NetSuite name (never changes)
- `displayName` - Custom display name (null = use original name)

### 2. Email Export ([email-export-utils.js](email-export-utils.js))

When you export data via email, the system includes:

**For Estimates:**
```javascript
#estimateClass: Professional Services
#estimateDepartment: Sales
#estimateLocation: San Francisco HQ
```

**For Reference Data (when renamed):**
```javascript
#classes:
  - ID: 1, Name: Professional Services, DisplayName: Professional Services
  - ID: 2, Name: Software Sales, DisplayName: SaaS Sales

#departments:
  - ID: 1, Name: Sales, DisplayName: Sales Team
```

### 3. NetSuite Processing ([EmailProcessor.suite-script.js](EmailProcessor.suite-script.js))

The SuiteScript now:
1. **Looks up records by name or display name**
2. **Finds the NetSuite internal ID**
3. **Sets the field on the estimate/transaction**

**New Functions:**
- `getClassIdByName(classNameOrId)` - Lookup class by name or ID
- `getDepartmentIdByName(deptNameOrId)` - Lookup department
- `getLocationIdByName(locNameOrId)` - Lookup location

**Estimate Fields Set:**
```javascript
// OPTIONAL: Class
if (estimateData.class) {
  var classId = getClassIdByName(estimateData.class);
  estimateRecord.setValue({ fieldId: 'class', value: classId });
}

// OPTIONAL: Department
// OPTIONAL: Location
```

## Usage Guide

### Step 1: Load Your NetSuite Data

Export your NetSuite data and update [src/netsuiteData.js](src/netsuiteData.js):

**From NetSuite:**
1. Go to Lists → Accounting → Classes
2. Export to Excel/CSV
3. Update `NETSUITE_CLASSES` array

Repeat for Departments, Employees, and Locations.

### Step 2: Rename in Dashboard (Coming Soon)

The dashboard will have a UI to:
1. View all classes/departments/etc.
2. Rename them with custom display names
3. Save the renamed data

Example:
```
Original: "Professional Services"
Renamed:  "PS - Consulting"
```

### Step 3: Create Estimate with Renamed Data

When you create an estimate:
1. Select a class (shows "PS - Consulting")
2. Export via email
3. Email includes both names:
   ```
   #estimateClass: Professional Services
   #classes:
     - ID: 1, Name: Professional Services, DisplayName: PS - Consulting
   ```

### Step 4: NetSuite Processes the Email

The SuiteScript:
1. Receives `#estimateClass: Professional Services`
2. Calls `getClassIdByName('Professional Services')`
3. Finds class ID = 1
4. Sets `estimateRecord.setValue({ fieldId: 'class', value: 1 })`
5. NetSuite estimate created with correct class!

## Renaming vs. Creating

### When to Rename
**Rename** when you want a different display name but use the same NetSuite record:
- "Professional Services" → "PS Consulting" (same class, different label)

### When to Create New
**Create New** when you want a completely new NetSuite record:
- Copy "PS - Post Go-Live Support" → Create "PS - Custom Implementation"
- This creates a NEW item in NetSuite with different ID

## Field Mapping Reference

### Estimate Fields

| Dashboard Field | Email Hashtag | NetSuite Field | Type |
|----------------|---------------|----------------|------|
| Class | `#estimateClass` | `class` | Classification |
| Department | `#estimateDepartment` | `department` | Department |
| Location | `#estimateLocation` | `location` | Location |
| Items | `#estimateItems` | `item` sublist | Service Items |

### Item Fields

| Dashboard Field | NetSuite Field | Notes |
|----------------|----------------|-------|
| `name` | Item Name | Original NS name (for lookup) |
| `displayName` | Display Name | Custom name (if renamed) |
| `description` | Description | Line item description |
| `quantity` | Quantity | Qty on estimate line |
| `rate` | Rate | Price per unit |

## Examples

### Example 1: Estimate with Class and Department

**Dashboard Selection:**
- Class: "Professional Services" (renamed to "PS Consulting")
- Department: "Sales" (renamed to "Sales Team")

**Email Export:**
```
#recordType: customer
#estimateClass: Professional Services
#estimateDepartment: Sales

--- JSON DATA ---
{
  "estimate": {
    "class": "Professional Services",
    "department": "Sales",
    "items": [...]
  },
  "classes": [
    { "id": "1", "name": "Professional Services", "displayName": "PS Consulting" }
  ],
  "departments": [
    { "id": "1", "name": "Sales", "displayName": "Sales Team" }
  ]
}
```

**NetSuite Result:**
- Estimate created with Class = "Professional Services" (ID: 1)
- Estimate created with Department = "Sales" (ID: 1)

### Example 2: Renamed Item

**Dashboard:**
- Select item: "PS - Post Go-Live Support"
- Rename to: "Implementation Services"

**Email Export:**
```json
{
  "estimate": {
    "items": [
      {
        "name": "PS - Post Go-Live Support",
        "displayName": "Implementation Services",
        "description": "Custom implementation and configuration",
        "quantity": 1,
        "rate": 175
      }
    ]
  }
}
```

**NetSuite Processing:**
1. SuiteScript sees `displayName !== name`
2. Searches for item "Implementation Services" - not found
3. Copies "PS - Post Go-Live Support" with new name
4. Creates new item: "Implementation Services"
5. Uses new item on estimate line

## Troubleshooting

### Class/Department Not Found

**Problem:** Email export shows class name, but NetSuite can't find it.

**Solution:**
1. Check spelling matches exactly
2. Verify class is not inactive in NetSuite
3. Check SuiteScript logs for search results

### Renamed Item Not Created

**Problem:** Item rename doesn't create new NetSuite item.

**Solution:**
1. Verify source item exists in NetSuite
2. Check `copyAndRenameItem()` function logs
3. Ensure permissions to create items

### Display Names Not Showing

**Problem:** Dashboard shows original names, not renamed versions.

**Solution:**
1. Check `displayName` field in netsuiteData.js
2. Use `getDisplayName(record)` helper function
3. Verify dashboard is importing netsuiteData.js

## Next Steps

### Dashboard UI Enhancement (Coming Soon)

The dashboard will be updated to include:

1. **Reference Data Management Tab**
   - View all classes, departments, employees, locations
   - Rename any record with custom display names
   - Save renamed data to localStorage

2. **Estimate Creation with Dropdowns**
   - Select class from dropdown (shows display names)
   - Select department from dropdown
   - Select location from dropdown

3. **Visual Indicators**
   - Show which records have been renamed
   - Display both original and custom names
   - Reset to original name option

## API Reference

### Helper Functions

```javascript
// Get display name (falls back to original if not renamed)
getDisplayName(record)

// Find record by name, display name, or ID
findRecord(records, searchName)

// Update display name for a record
updateDisplayName(records, recordId, newDisplayName)
```

### SuiteScript Lookup Functions

```javascript
// Look up class by name or ID
getClassIdByName(classNameOrId)

// Look up department by name or ID
getDepartmentIdByName(deptNameOrId)

// Look up location by name or ID
getLocationIdByName(locNameOrId)

// Look up item by name (existing function)
getItemIdByName(itemName)
```

## Summary

✅ **Classes, Departments, Employees, Locations** - Reference data structure created
✅ **Email Export** - Includes renamed data in export
✅ **NetSuite SuiteScript** - Lookup functions for all reference data
✅ **Item Renaming** - Existing copy & rename functionality
⏳ **Dashboard UI** - Coming soon for easy renaming

Your system now has complete support for NetSuite reference data with renaming capabilities that flow seamlessly from the dashboard to NetSuite!
