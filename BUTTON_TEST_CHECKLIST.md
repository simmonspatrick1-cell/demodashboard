# Button Test Checklist

## Test Environment Setup
- [ ] Dev server running on http://localhost:5173
- [ ] Browser console open (F12) to check for errors
- [ ] Network tab open to verify API calls

---

## 1. Navigation & Tab Buttons

### Tab Navigation
- [ ] **Context Tab** - Click to view prospect list
- [ ] **Prompts Tab** - Click to view prompt library
- [ ] **Items Tab** - Click to configure estimate items
- [ ] **Projects Tab** - Click to configure projects
- [ ] **Reference Tab** - Click to manage reference data

**Expected:** Tabs switch correctly, content loads without errors

---

## 2. Prospect Management Buttons

### Add Prospect Button (Multiple Locations)
- [ ] **"Add New Prospect" button** in prospect list sidebar
- [ ] **"Add New Prospect" button** in empty state (when no prospect selected)
- [ ] **Keyboard shortcut: Cmd+N / Ctrl+N** opens modal

**Test Steps:**
1. Click "Add New Prospect"
2. Modal should open
3. Fill in required fields (Name, Entity ID)
4. Fill in optional fields (Email, Phone, etc.)
5. Click "Add Prospect"
6. **Expected:** Prospect added to list, modal closes, prospect auto-selected, details panel shows

**Edge Cases:**
- [ ] Create prospect with only required fields (name, entityid)
- [ ] Create prospect with all fields filled
- [ ] Try to submit with missing required fields (should show errors)
- [ ] Close modal with X button
- [ ] Close modal with ESC key
- [ ] Close modal by clicking outside

---

## 3. Quick Action Buttons (Requires Selected Prospect)

### Test Setup
1. Select a prospect from the list
2. Verify Quick Actions panel is visible

### Individual Button Tests

#### Create Prospect
- [ ] **Button:** "Create Prospect"
- [ ] **Action:** Opens Add Prospect modal
- [ ] **Expected:** Modal opens, can create new prospect

#### Create Project
- [ ] **Button:** "Create Project" 
- [ ] **Action:** Creates project via email export
- [ ] **Expected:** Shows "✓ Creating project via email..." status, opens email client
- [ ] **Test without prospect:** Should show "⚠ Please select a customer first"

#### Add Sample Time Entries
- [ ] **Button:** "Add Sample Time Entries"
- [ ] **Action:** Copies time entry prompt to clipboard
- [ ] **Expected:** Shows "✓ Time entry prompt copied" status
- [ ] **Verify:** Check clipboard contains the prompt

#### Create Estimate
- [ ] **Button:** "Create Estimate"
- [ ] **Action:** Creates estimate via email export
- [ ] **Expected:** Shows "✓ Creating estimate via email..." status, opens email client
- [ ] **Test without prospect:** Should show "⚠ Please select a customer first"
- [ ] **Test with items configured:** Should include configured items in export

#### Resource Allocation
- [ ] **Button:** "Resource Allocation"
- [ ] **Action:** Copies resource forecast prompt to clipboard
- [ ] **Expected:** Shows "✓ Resource prompt copied" status
- [ ] **Verify:** Check clipboard contains the prompt

#### Sync NetSuite Data
- [ ] **Button:** "Sync NetSuite Data"
- [ ] **Action:** Syncs prospect data from NetSuite API
- [ ] **Expected:** Shows loading state, then success/error message
- [ ] **Test with prospect that has nsId:** Should sync successfully
- [ ] **Test with prospect without nsId:** Should search and link to NetSuite record
- [ ] **Test API error:** Should show error message gracefully

#### Export to Email
- [ ] **Button:** "Export to Email"
- [ ] **Action:** Exports current prospect data via email
- [ ] **Expected:** Shows "✓ Opening email client..." status, opens email client
- [ ] **Test without prospect:** Button should be disabled

### Button States
- [ ] **No prospect selected:** All buttons except "Create Prospect" should be disabled (grayed out)
- [ ] **Prospect selected:** All buttons should be enabled
- [ ] **During sync:** "Sync NetSuite Data" shows loading spinner, other buttons disabled
- [ ] **Local-only prospect (no nsId):** "Sync NetSuite Data" shows orange highlight

---

## 4. Form Buttons in Add Prospect Modal

### Form Submission
- [ ] **"Add Prospect" button** - Submits form
- [ ] **"Cancel" button** - Closes modal without saving
- [ ] **Enter key** - Submits form (when not in textarea)

### Website Analysis
- [ ] **"Analyze" button** - Analyzes website URL with AI
- [ ] **Test with valid URL:** Should auto-fill form fields
- [ ] **Test with invalid URL:** Should show error or handle gracefully
- [ ] **Test while analyzing:** Button should show loading state

---

## 5. Prospect List Interaction

### Selection
- [ ] **Click prospect in list:** Selects prospect, shows details
- [ ] **Search bar:** Filters prospects as you type
- [ ] **Quick filters:** "Leads", "Prospects", "Customers" buttons filter list
- [ ] **Select all checkbox:** Selects all visible prospects

### Actions on Selected Prospects
- [ ] **Bulk actions** (if available): Test any bulk operation buttons

---

## 6. Project Configuration Buttons

### In Projects Tab
- [ ] **"Generate with AI" button** - Generates project configuration
- [ ] **"Export Project + Tasks" button** - Exports project data
- [ ] **"Save Project" button** - Saves project configuration
- [ ] **Form fields:** Test all input fields update correctly

---

## 7. Item Configuration Buttons

### In Items Tab
- [ ] **Add item buttons** - Add new items to estimate
- [ ] **Remove item buttons** - Remove items from estimate
- [ ] **Save configuration** - Saves item configuration
- [ ] **Reset to defaults** - Resets to default items

---

## 8. Reference Data Buttons

### In Reference Tab
- [ ] **Edit buttons** - Edit reference data entries
- [ ] **Save buttons** - Save changes
- [ ] **Cancel buttons** - Cancel editing
- [ ] **Refresh buttons** - Refresh data from NetSuite

---

## 9. Prompt Library Buttons

### In Prompts Tab
- [ ] **Copy prompt buttons** - Copy prompts to clipboard
- [ ] **Favorite buttons** - Toggle favorite status
- [ ] **Search bar** - Filter prompts
- [ ] **Category expansion** - Expand/collapse categories
- [ ] **Import prompts** - Import prompts from file

---

## 10. Settings & Utility Buttons

### Settings Modal
- [ ] **Settings icon/button** - Opens settings modal
- [ ] **Close settings** - Closes modal
- [ ] **Save settings** - Saves configuration
- [ ] **API key input** - Updates API key

### Keyboard Shortcuts Modal
- [ ] **Shortcuts button** - Opens shortcuts modal
- [ ] **Close shortcuts** - Closes modal

---

## 11. Error Handling Tests

### Test Error Scenarios
- [ ] **Network error:** Buttons should show appropriate error messages
- [ ] **Validation errors:** Form buttons should show field errors
- [ ] **API timeout:** Should handle gracefully
- [ ] **Missing data:** Should handle undefined/null values gracefully

---

## 12. Accessibility Tests

- [ ] **Keyboard navigation:** All buttons should be accessible via keyboard
- [ ] **Focus indicators:** Buttons should show focus states
- [ ] **ARIA labels:** Buttons should have proper labels
- [ ] **Screen reader:** Test with screen reader (if available)

---

## Test Results Summary

**Date:** _______________
**Tester:** _______________

### Overall Status
- [ ] ✅ All buttons working correctly
- [ ] ⚠️ Some buttons have issues (list below)
- [ ] ❌ Critical issues found (list below)

### Issues Found
1. 
2. 
3. 

### Notes
_Add any additional notes or observations here_

