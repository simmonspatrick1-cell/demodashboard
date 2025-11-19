# 🚀 AI-Powered NetSuite Workflow Guide

## Overview

This dashboard creates a seamless workflow between **your prospect data**, **Claude AI**, and **NetSuite**. The system automatically fills prompts with customer details, lets you generate AI strategies, and exports everything to NetSuite with one click.

---

## The Complete Workflow

### Step 1: Select or Add a Prospect

**Option A: Select Existing Prospect**
1. Go to the **Context** tab
2. Click **"Sync NetSuite Data"** to pull live customer data from NetSuite
3. Click on any prospect in the list to select them

**Option B: Add New Prospect**
1. Go to the **Context** tab
2. Click **"Add New Prospect"** button
3. Fill in the form:
   - Company Name
   - Industry
   - Company Size
   - Budget Range
   - Focus Areas (comma-separated)
4. Click **"Add Prospect"**
5. The new prospect appears in your list and is automatically selected

---

### Step 2: Copy AI Prompts (Auto-Filled!)

1. Go to the **Demo Prompts** tab
2. You'll see a green banner confirming your selected prospect
3. Browse the prompt library:
   - **Discovery & Planning**: Initial analysis, pain point identification
   - **Project Setup**: Implementation plans, resource allocation
   - **Estimation & Pricing**: Budget breakdowns, ROI analysis
   - **Demo Scenarios**: Industry-specific use cases
   - **Post-Demo Follow-up**: Next steps, proposal templates

4. **Click any "Copy Prompt" button** — the prompt is automatically filled with:
   - `[Company Name]` → Your prospect's actual name
   - `[Industry]` → Their industry vertical
   - `[company size]` → Employee count
   - `[Budget]` → Budget range
   - `[Project Name]` → Auto-generated project name
   - `[Date]`, `[Start]`, `[End]` → Current and future dates

5. The prompt is copied to your clipboard and added to **Clipboard History** (top right)

---

### Step 3: Generate Strategy with Claude

1. Open **Claude.ai** (or your Claude interface)
2. **Paste the copied prompt** (Cmd+V / Ctrl+V)
3. Claude generates a detailed response based on your prospect's context:
   - Implementation strategy
   - Project timeline
   - Resource requirements
   - Risk analysis
   - Pricing recommendations
   - Custom demo scenarios

4. **Copy Claude's output** to your clipboard

---

### Step 4: Save AI Strategy to Dashboard

1. Return to the dashboard's **Context** tab
2. Scroll to the **"AI Strategy / Notes"** text area
3. **Paste Claude's output** (Cmd+V / Ctrl+V)
4. The notes are automatically saved and will be included in all exports

**Pro Tip**: You can also add your own notes here:
- Meeting takeaways
- Pain points discussed
- Follow-up items
- Custom requirements

---

### Step 5: Export to NetSuite

Now that you have a prospect selected and AI-generated strategy, use **Quick Actions**:

#### **Create Prospect** (New Customer)
- Creates a new Customer record in NetSuite
- Includes all prospect details + your AI notes
- Sends via email → SuiteScript processes it

#### **Create Project**
- Creates a Project record linked to the customer
- Auto-generates project name, dates, and budget
- Includes your AI strategy in the project description

#### **Create Estimate**
- Creates an Estimate with line items from the **Configure Items** tab
- Uses your configured NetSuite items (PS - Post Go-Live Support, etc.)
- Includes budget allocation and your AI notes in the memo field
- Status: PENDING, Due Date: 30 days from now

#### **Export to Email**
- Sends all customer data + AI notes to your NetSuite inbox
- The SuiteScript processes it and creates/updates records
- Includes custom fields, focus areas, and memo

---

## Key Features

### 🎯 Smart Prompt Replacement

The system automatically replaces these placeholders:

| Placeholder | Replaced With | Example |
|-------------|---------------|---------|
| `[Company Name]` | Prospect's name | "Acme Corp" |
| `[Customer Name]` | Prospect's name | "Acme Corp" |
| `[Customer]` | Prospect's name | "Acme Corp" |
| `[Client]` | Prospect's name | "Acme Corp" |
| `[Vertical]` | Industry | "Manufacturing" |
| `[Industry]` | Industry | "Manufacturing" |
| `[company size]` | Employee count | "250-500" |
| `[amount]` | Budget range | "$200K-500K" |
| `[Budget]` | Budget range | "$200K-500K" |
| `[Project Name]` | Auto-generated | "Acme Corp Implementation" |
| `[PRJ####]` | Project ID | "PRJ-ACME-847" |
| `[Date]` | Today's date | "2025-11-19" |
| `[Start]` | Today's date | "2025-11-19" |
| `[End]` | 90 days from now | "2026-02-17" |

### 📋 Clipboard History

- Located in the **top right** of the dashboard (clipboard icon)
- Shows a badge with the count of copied items
- Click to view your last 20 copied prompts
- Click any item to copy it again
- Click "Clear All" to reset

### 🔄 NetSuite Sync

- **"Sync NetSuite Data"** button pulls live customer records
- Syncs custom fields:
  - `custentity_esc_industry`
  - `custentity_esc_annual_revenue`
  - `custentity_esc_no_of_employees`
- Updates the dashboard with real NetSuite data
- Falls back to demo data if API is unavailable

### 📝 AI Strategy / Notes Field

- Located in the **Context** tab
- Larger text area (monospace font for readability)
- Automatically included in all exports:
  - Customer creation → Comments field
  - Project creation → Description field
  - Estimate creation → Memo field
  - Email export → `#memo:` hashtag

---

## Example Workflow

### Scenario: New Prospect "TechStart Inc"

1. **Add Prospect**:
   - Name: TechStart Inc
   - Industry: SaaS
   - Size: 50-100
   - Budget: $100K-200K
   - Focus: Resource Planning, Billing

2. **Copy Prompt** (Demo Prompts tab):
   - Select: "Create a comprehensive discovery document..."
   - Prompt auto-fills: "Create a comprehensive discovery document for **TechStart Inc**, a **SaaS** company with **50-100** employees..."

3. **Generate with Claude**:
   - Paste into Claude
   - Claude generates a 5-page discovery document with:
     - Current state analysis
     - Pain points specific to SaaS companies
     - NetSuite modules recommended
     - Implementation timeline
     - Budget breakdown

4. **Save Strategy**:
   - Copy Claude's output
   - Paste into "AI Strategy / Notes" field
   - Notes are saved automatically

5. **Create Estimate**:
   - Go to **Configure Items** tab (optional: customize line items)
   - Click **"Create Estimate"** in Quick Actions
   - Email is sent with:
     - Customer: TechStart Inc
     - Line items: PS - Post Go-Live Support, Travel Expenses, etc.
     - Budget allocation: $100K split across items
     - Memo: Your AI-generated strategy
   - SuiteScript processes the email and creates the estimate in NetSuite

6. **Result**:
   - NetSuite now has a complete estimate with your AI-powered strategy
   - All fields are properly mapped
   - You can open the estimate directly from the dashboard

---

## Tips & Best Practices

### 🎨 Customize Prompts
- Edit prompts before copying if you need specific details
- Add your own custom prompts to the library
- Use the search bar to quickly find relevant prompts

### 📊 Configure Items First
- Go to **Configure Items** tab before creating estimates
- Use presets (Standard, Premium, Enterprise) or customize
- Adjust budget percentages to match your pricing model
- All items are mapped to existing NetSuite items

### 🔍 Review Before Export
- Always review the AI Strategy / Notes before exporting
- Ensure the prospect's details are accurate
- Sync NetSuite data to get the latest custom fields

### 🚀 Batch Processing
- Select a prospect
- Copy multiple prompts to Clipboard History
- Generate all strategies in Claude
- Save and export in one session

### 📈 Track Progress
- Use the "AI Strategy / Notes" field to track conversation history
- Add timestamps for different strategy iterations
- Reference specific Claude conversations

---

## Troubleshooting

### Prompts Not Auto-Filling?
- Ensure a prospect is selected (green banner should appear)
- Refresh the page and reselect the prospect
- Check that the prospect has all required fields filled

### AI Notes Not Exporting?
- Verify the notes are saved in the "AI Strategy / Notes" field
- Check the email body for `#memo:` hashtag
- Ensure the SuiteScript is processing the memo field

### Clipboard History Not Working?
- Check browser permissions for clipboard access
- Try copying a prompt again
- Clear browser cache and reload

### NetSuite Records Not Created?
- Check the SuiteScript execution log in NetSuite
- Verify the email was received at `simmonspatrick1@gmail.com`
- Ensure the SuiteScript scheduled script is running
- Check for item mapping errors (see ITEM_MAPPING_GUIDE.md)

---

## Related Documentation

- **[EMAIL_EXPORT_GUIDE.md](./EMAIL_EXPORT_GUIDE.md)**: Email integration setup
- **[ITEM_MAPPING_GUIDE.md](./ITEM_MAPPING_GUIDE.md)**: NetSuite item configuration
- **[CUSTOMIZE_ITEMS_GUIDE.md](./CUSTOMIZE_ITEMS_GUIDE.md)**: Dashboard item customization
- **[ESTIMATE_FIELD_MAPPING.md](./ESTIMATE_FIELD_MAPPING.md)**: Estimate field reference
- **[HOW_IT_WORKS.md](./HOW_IT_WORKS.md)**: Technical architecture

---

## Support

For issues or questions:
1. Check the execution logs in NetSuite (Setup > Scheduled Scripts)
2. Review the browser console for frontend errors
3. Test the `/api/netsuite/test` endpoint for API connectivity
4. Verify environment variables in Vercel

---

**Last Updated**: November 19, 2025
**Version**: 2.0 (AI Workflow Integration)

