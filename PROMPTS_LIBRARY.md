# 📚 Prompts Library - Organization Guide

## Overview

Your NetSuite Dashboard includes a **comprehensive Professional Services prompt library** that you can import and use for demo preparation, optimized for PSA-focused demos, project-based businesses, and services companies.

## 🎯 Prompt Source

### **Professional Services** (`prompts-ps.html`)
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

### Step 1: Import

1. Navigate to the **Prompts** tab
2. Click **"Load Prompts from Document"**
3. Review the import stats (12 categories, 50+ prompts)
4. Click **"Apply to Dashboard"**

### Step 2: Use

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

**Periodic Updates**
- Export current prompts as backup (JSON) before importing
- Import fresh prompts when the document updates
- Prompts are automatically saved to localStorage

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

### When the Document Changes

1. **Receive updated HTML file**
2. **Replace** `public/prompts-ps.html`
3. **Commit and push** to deploy
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
1. Navigate to Prompts tab
2. Click "Load Prompts from Document"
3. Click "Apply to Dashboard"
4. Search: "end-to-end service"
5. Copy prompt for complete scenario
6. Paste into Claude
7. Review generated data plan
```

### Scenario 2: Quick Project Setup

```
1. Open Prompts tab
2. Expand "Projects & Professional Services"
3. Copy "Project Setup" prompt
4. Customize with customer details
5. Generate demo data via Claude
```

### Scenario 3: Complete Sales Cycle

```
1. Search: "quote" or "invoice" or "sales order"
2. Copy relevant prompts
3. Build end-to-end sales workflow
4. Generate complete demo scenario
```

## 🎯 Prompt Categories Reference

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
└── prompts-ps.html          # Professional Services prompts

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
