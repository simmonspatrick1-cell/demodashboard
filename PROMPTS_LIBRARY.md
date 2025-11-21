# 📚 Prompts Library - Organization Guide

## Overview

Your NetSuite Dashboard now includes **two comprehensive prompt libraries** that you can import and use for demo preparation. Each library is optimized for different use cases.

## 🎯 Available Prompt Sources

### 1. **Comprehensive Guide** (`prompts-source.html`)
**Best for**: General demo preparation across all NetSuite modules

**Categories Included**:
- Customer Setup
- Project & PSA
- Billing & Revenue
- Industry Scenarios (Environmental, PEO, Energy, etc.)

**Use when**:
- Preparing demos for mixed audiences
- Need industry-specific scenarios
- Want comprehensive coverage

---

### 2. **Professional Services** (`prompts-ps.html`)
**Best for**: PSA-focused demos, project-based businesses, services companies

**Categories Included**:

#### **Core Operations**
- Customer Management (Basic & Detailed)
- Projects & Professional Services
  - Project Setup
  - Project Tasks
  - Time Tracking
- Items & Inventory
  - Service Items
  - Inventory Items
  - Item Groups & Kits

#### **Sales & Financial**
- Sales Process
  - Quotes/Estimates
  - Sales Orders
  - Invoicing
- Purchasing
  - Vendors
  - Purchase Orders
  - Bills
- Financial Transactions
  - Journal Entries
  - Payments

#### **Advanced**
- Resources & Employees
- Complex Demo Scenarios
  - End-to-End Service Company
  - End-to-End Product Company
  - Project-Based Business
  - Subscription Business
- Data Analysis & Reporting
- Bulk Operations
- Scenario-Based Prompts

**Use when**:
- Demoing to professional services companies
- Focus on project accounting
- Need resource management scenarios
- Showing subscription/SaaS models

---

## 🚀 How to Use

### Step 1: Choose Your Source

In the Prompts tab, use the dropdown to select:
- **Comprehensive Guide** - Broader coverage
- **Professional Services** - PSA/Services focus

### Step 2: Import

1. Click "Load Prompts from Document"
2. Review the import stats
3. Click "Apply to Dashboard"

### Step 3: Use

- Search and filter imported prompts
- Copy prompts (auto-fills with customer data)
- Paste into Claude for generation

## 📊 Prompt Organization Strategy

### By Complexity

**Simple Prompts** (1-2 records)
```
"Create 5 customers for my demo with different industries"
"Set up a project for Q1 Website Redesign"
```

**Medium Prompts** (3-5 related records)
```
"Create a project with tasks, time entries, and invoice"
"Set up customer with billing and shipping addresses"
```

**Complex Prompts** (End-to-end scenarios)
```
"Create a complete professional services demo:
customer, project, tasks, time entries, and invoice"

"Build a complete order-to-cash flow: customer, quote,
sales order, fulfillment, invoice, payment"
```

### By Business Process

**Quote-to-Cash**
1. Create customer
2. Create quote/estimate
3. Create sales order
4. Create invoice
5. Create payment

**Project-to-Cash**
1. Create customer
2. Create project
3. Create tasks & assignments
4. Log time entries
5. Generate invoice from time

**Procure-to-Pay**
1. Create vendor
2. Create purchase order
3. Receive items
4. Create bill
5. Make payment

## 💡 Pro Tips

### Importing Strategy

**Option 1: Merge Both Libraries**
- Import Comprehensive Guide first
- Then import Professional Services
- Get best of both worlds

**Option 2: Selective Import**
- Choose based on demo audience
- Keep library focused and relevant

**Option 3: Periodic Updates**
- Export current prompts as backup (JSON)
- Import fresh prompts when documents update
- Restore custom prompts if needed

### Organizing After Import

Your prompts will be organized by category automatically:

```
Customer Management
├── Basic Creation
└── With Details

Projects & Professional Services
├── Project Setup
├── Project Tasks
└── Time Tracking

Sales Process
├── Quotes/Estimates
├── Sales Orders
└── Invoicing

...and so on
```

### Search Tips

Use the search bar to find prompts by:
- **Record type**: "customer", "project", "invoice"
- **Feature**: "time tracking", "billing", "resource"
- **Industry**: "services", "retail", "manufacturing"
- **Complexity**: "complete", "end-to-end", "scenario"

## 🔄 Updating Prompts

### When Documents Change

1. **Receive updated HTML file**
2. **Replace** `public/prompts-source.html` or `public/prompts-ps.html`
3. **Commit and push**
4. **Re-import** in dashboard
5. **Apply** to update library

### Version Control

All prompts are:
- ✅ Stored in localStorage (persist across sessions)
- ✅ Version controlled in git (track changes)
- ✅ Exportable as JSON (backup/share)
- ✅ Mergeable (combine multiple sources)

## 📈 Usage Scenarios

### Scenario 1: New Demo for PSA Company

```
1. Select: "Professional Services"
2. Import prompts
3. Search: "end-to-end service"
4. Copy prompt for complete scenario
5. Paste into Claude
6. Review generated data plan
```

### Scenario 2: Industry-Specific Demo

```
1. Select: "Comprehensive Guide"
2. Import prompts
3. Search: "environmental" or "PEO" or "energy"
4. Copy industry scenario prompt
5. Customize with customer details
6. Generate demo data
```

### Scenario 3: Custom Hybrid

```
1. Import "Comprehensive Guide"
2. Import "Professional Services" (merges)
3. Search across both
4. Build custom workflow
```

## 🎯 Prompt Categories Reference

### Comprehensive Guide Categories
1. Customer Setup
2. Project & PSA
3. Billing & Revenue
4. Industry Scenarios

**Total**: ~20-30 prompts

### Professional Services Categories
1. Customer Management (Basic & Detailed)
2. Projects & Professional Services (Setup, Tasks, Time)
3. Items & Inventory (Services, Inventory, Kits)
4. Sales Process (Quotes, Orders, Invoicing)
5. Purchasing (Vendors, POs, Bills)
6. Financial Transactions (JEs, Payments)
7. Resources & Employees
8. Complex Demo Scenarios (4 types)
9. Data Analysis & Reporting
10. Bulk Operations
11. Scenario-Based

**Total**: ~80-100 prompts

## 🛠️ Technical Details

### File Locations
```
public/
├── prompts-source.html      # Comprehensive Guide
└── prompts-ps.html          # Professional Services

src/
├── promptParser.js          # HTML parsing utility
└── PromptImporter.jsx       # Import UI component
```

### Data Flow
```
HTML File
  ↓ (fetch)
promptParser.js
  ↓ (parse & structure)
PromptImporter
  ↓ (convert format)
DemoDashboard
  ↓ (merge & save)
localStorage
```

### Storage
- **Key**: `demodashboard_prompts`
- **Format**: JSON array of categories
- **Persistence**: Survives page refresh
- **Size**: ~50-100KB (depending on import)

---

## 📞 Support

- **Add new prompts**: Update HTML files and re-import
- **Reset prompts**: Clear localStorage and re-import
- **Export prompts**: Use "Export as JSON" button
- **Share prompts**: Commit HTML files to git

---

**Your prompt library is now fully organized and ready for professional demo preparation!** 🎉
