import React, { useState, useMemo, useEffect } from 'react';
import { Search, Settings, User, Users, Zap, ChevronRight, Copy, Check, BookOpen, ChevronDown, Target, Building2, Mail, Phone, MoreVertical, Play, Plus, FileText, Clock, TrendingUp, AlertCircle, Loader, RefreshCw } from 'lucide-react';
// Import the NetSuite service
// import NetSuiteService from './netsuite-service';
import { exportViaEmail, createExportData } from './email-export-utils';
import { ITEM_CONFIG, ESTIMATE_PRESETS, AVAILABLE_ITEMS } from './src/itemConfig';

export default function DemoDashboard() {
  // ============ STATE MANAGEMENT ============
  const [activeTab, setActiveTab] = useState('context'); // 'context', 'prompts', 'items'
  const [selectedAccount, setSelectedAccount] = useState('services');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedCategory, setExpandedCategory] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [demoNotes, setDemoNotes] = useState({});
  const [netsuiteSyncEnabled, setNetsuiteSyncEnabled] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());
  const [customFieldsData, setCustomFieldsData] = useState({});
  const [actionStatus, setActionStatus] = useState(null);
  const [nsData, setNsData] = useState({}); // Store NetSuite API responses
  const [selectedEstimatePreset, setSelectedEstimatePreset] = useState('standard');
  const [customItems, setCustomItems] = useState(ITEM_CONFIG.estimateLineItems);
  const [showAddProspectModal, setShowAddProspectModal] = useState(false);
  const [clipboardHistory, setClipboardHistory] = useState([]);
  const [showClipboardHistory, setShowClipboardHistory] = useState(false);
  const [prospects, setProspects] = useState([
    { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'Hot', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161 },
    { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'Active', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834 },
    { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'Active', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938 },
    { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy/Midstream', size: '100-150', status: 'Active', demoDate: 'Nov 12', focus: ['Project Accounting', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662 },
    { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'Qualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938 },
    { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'Proposal', demoDate: 'Pending', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285 },
    { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'Active', demoDate: 'Nov 20', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938 },
  ]);
  const [newProspect, setNewProspect] = useState({
    name: '',
    entityid: '',
    industry: '',
    size: '',
    status: 'Qualified',
    demoDate: '',
    focus: [],
    budget: '',
    nsId: null
  });

  // ============ DATA SOURCES ============
  const accounts = [
    { id: 'services', name: 'Services Stairway', instance: 'td3049589', vertical: 'Professional Services' },
    { id: 'software', name: 'Software Stairway', instance: 'td3049589-soft', vertical: 'SaaS' },
    { id: 'saas', name: 'NS Services SaaS', instance: 'td3049589-saas', vertical: 'Services & SaaS' }
  ];

  const keyProspects = [
    { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'Hot', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161 },
    { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'Active', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834 },
    { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'Active', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938 },
    { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy/Midstream', size: '100-150', status: 'Active', demoDate: 'Nov 12', focus: ['Project Accounting', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662 },
    { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'Qualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938 },
    { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'Proposal', demoDate: 'Pending', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285 },
    { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'Active', demoDate: 'Nov 20', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938 },
  ];

  const promptCategories = [
    {
      name: 'Customer Setup',
      prompts: [
        'Create a new customer for [Company Name] in the [Vertical] industry with [company size] employees, annual revenue of [amount], and primary contact [contact info].',
        'Set up a multi-subsidiary customer structure where the parent company is [Parent Co] and subsidiaries include [List]. Configure consolidated reporting.',
        'Create a customer with custom fields populated: Industry Type=[X], Annual Revenue=[X], No. of Employees=[X], and AI Generated Summary=[summary].',
      ]
    },
    {
      name: 'Project & PSA',
      prompts: [
        'Create a project for [Customer Name] titled "[Project Name]" with: Project Code=[PRJ####], Customer=[Customer], Project Manager=[Person], Estimated Budget=[Amount], Start=[Date], End=[Date], and add task estimates for: [list tasks].',
        'Set up resource allocation forecast for project PRJ#### with these roles: [Environmental Engineer-500hrs@$150/hr], [Field Technician-300hrs@$75/hr], [QA Officer-200hrs@$120/hr].',
        'Create time entries for [Employee Name] on [Project]: [Date] - [Hours] hours for [Task], [Date] - [Hours] hours for [Task]. Mark as approved and billable.',
      ]
    },
    {
      name: 'Billing & Revenue',
      prompts: [
        'Create an estimate for [Customer Name] from project [PRJ####] including: [Item 1-Qty-Rate], [Item 2-Qty-Rate]. Set as pending, customer=[Customer], due date=[Date].',
        'Generate an invoice from estimate [EST####] with these modifications: remove [Item], add [New Item-Qty-Rate], adjust billing date to [Date].',
        'Create a purchase order from vendor bill [VB####] for [Vendor Name] totaling $[Amount] for [Description]. Link to project [PRJ####] for cost allocation.',
      ]
    },
    {
      name: 'Industry Scenarios',
      prompts: [
        'Environmental Consulting: Create a complete demo scenario for [Client] including: 5 stream restoration projects, 12 project team members, 2400 billable hours YTD, resource utilization dashboard showing 85% utilization, multi-entity consolidation across 3 regions.',
        'PEO Services: Set up AdvisorHR demo with: 3 subsidiary companies (staffing, payroll, HR operations), 250+ employees across entities, daily time tracking, multi-entity revenue recognition, compliance tracking.',
        'Midstream Energy: Build Marabou pipeline scenario with: pipeline segment projects across 4 states, equipment tracking, environmental compliance charges, resource crews with seasonal allocation, multi-entity cost allocation.',
      ]
    }
  ];

  // ============ CUSTOMER FILTERING & SEARCH ============
  const filteredCustomers = useMemo(() => {
    return prospects.filter(cust =>
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.entityid.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, prospects]);

  const filteredPrompts = useMemo(() => {
    if (!promptSearch) return promptCategories;
    return promptCategories.map(cat => ({
      ...cat,
      prompts: cat.prompts.filter(p => p.toLowerCase().includes(promptSearch.toLowerCase()))
    })).filter(cat => cat.prompts.length > 0);
  }, [promptSearch]);

  // ============ HELPER FUNCTIONS ============
  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    
    // Add to history
    setClipboardHistory(prev => {
      const newHistory = [{ text, timestamp: new Date() }, ...prev];
      return newHistory.slice(0, 20); // Keep last 20 items
    });
    
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleFavorite = (prompt) => {
    setFavorites(prev =>
      prev.includes(prompt) ? prev.filter(p => p !== prompt) : [...prev, prompt]
    );
  };

  const handleAddProspect = () => {
    if (!newProspect.name || !newProspect.entityid) {
      setActionStatus('⚠️ Please fill in Name and Entity ID');
      setTimeout(() => setActionStatus(null), 3000);
      return;
    }

    const prospectToAdd = {
      ...newProspect,
      id: prospects.length + 1,
      nsId: null // Will be assigned when created in NetSuite
    };

    setProspects(prev => [...prev, prospectToAdd]);
    setShowAddProspectModal(false);
    setActionStatus('✓ Prospect added to list!');
    setTimeout(() => setActionStatus(null), 3000);

    // Reset form
    setNewProspect({
      name: '',
      entityid: '',
      industry: '',
      size: '',
      status: 'Qualified',
      demoDate: '',
      focus: [],
      budget: '',
      nsId: null
    });
  };

  const toggleFocusArea = (area) => {
    setNewProspect(prev => ({
      ...prev,
      focus: prev.focus.includes(area)
        ? prev.focus.filter(f => f !== area)
        : [...prev.focus, area]
    }));
  };

  const syncNetsuiteFieFds = async () => {
    if (!selectedCustData) return;
    setSyncLoading(true);
    setActionStatus('Syncing from NetSuite...');
    
    try {
      // Call the Vercel API endpoint to fetch real NetSuite data
      const response = await fetch('/api/netsuite/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: selectedCustData.nsId,
          account: selectedAccount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const customerData = await response.json();

      // Map NetSuite fields to display format
      setCustomFieldsData(prev => ({
        ...prev,
        [selectedCustData.id]: {
          'AI Generated Summary': customerData.custentity13 || customerData.custentity_esc_ai_summary || 'Not populated',
          'Industry Type': customerData.custentity16 || customerData.custentity_esc_industry || 'Not specified',
          'Annual Revenue': customerData.custentity_esc_annual_revenue || customerData.custentity16 || 'Not specified',
          'Employee Count': customerData.custentity_esc_no_of_employees || customerData.custentity_esc_employees || 'Not specified',
          'Opportunity Summary': customerData.custentity15 || customerData.custentity_esc_opportunity || 'Not specified',
          'Email': customerData.email || 'Not available',
          'Phone': customerData.phone || 'Not available'
        }
      }));
      
      setNsData(prev => ({
        ...prev,
        [selectedCustData.id]: customerData
      }));

      setActionStatus('✓ Synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
      
      // Fallback to mock data if API fails (for demo purposes)
      const mockNsResponse = {
        id: selectedCustData.nsId,
        entityid: selectedCustData.entityid,
        companyname: selectedCustData.name,
        custentity13: `Leading ${selectedCustData.industry} firm with expertise in complex implementations`,
        custentity16: selectedCustData.industry,
        custentity15: selectedCustData.focus.join(', '),
        custentity_esc_industry: selectedCustData.industry,
        custentity_esc_annual_revenue: selectedCustData.budget,
        custentity_esc_no_of_employees: selectedCustData.size,
        email: `contact@${selectedCustData.entityid.toLowerCase()}.com`,
        phone: '(555) 123-4567'
      };

      setCustomFieldsData(prev => ({
        ...prev,
        [selectedCustData.id]: {
          'AI Generated Summary': mockNsResponse.custentity13,
          'Industry Type': mockNsResponse.custentity16,
          'Annual Revenue': mockNsResponse.custentity_esc_annual_revenue,
          'Employee Count': mockNsResponse.custentity_esc_no_of_employees,
          'Opportunity Summary': mockNsResponse.custentity15,
          'Email': mockNsResponse.email,
          'Phone': mockNsResponse.phone
        }
      }));
      
      setNsData(prev => ({
        ...prev,
        [selectedCustData.id]: mockNsResponse
      }));

      setActionStatus(`⚠ API unavailable - showing demo data (${error.message})`);
    } finally {
      setSyncLoading(false);
      setLastSyncTime(new Date());
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const exportToEmail = () => {
    if (!selectedCustData) {
      setActionStatus('⚠ Please select a customer first');
      setTimeout(() => setActionStatus(null), 2000);
      return;
    }

    try {
      // Get synced NetSuite data if available, otherwise use dashboard data
      const nsResponse = nsData[selectedCustData.id];
      const customerData = nsResponse ? {
        ...selectedCustData,
        ...nsResponse,
        custentity_esc_industry: nsResponse.custentity_esc_industry || selectedCustData.industry,
        custentity_esc_annual_revenue: nsResponse.custentity_esc_annual_revenue || selectedCustData.budget,
        custentity_esc_no_of_employees: nsResponse.custentity_esc_no_of_employees || selectedCustData.size
      } : selectedCustData;

      // Prepare export data with hashtags
      const exportData = createExportData(customerData, null, {
        modules: selectedCustData.focus || [],
        estimate: {
          type: 'T&M',
          customer: selectedCustData.name,
          status: 'PENDING'
        }
      });

      // Export via email
      exportViaEmail(exportData, {
        recipientEmail: 'simmonspatrick1@gmail.com',
        includeInstructions: true
      });

      setActionStatus('✓ Opening email client...');
      setTimeout(() => setActionStatus(null), 3000);
    } catch (error) {
      console.error('Email export error:', error);
      setActionStatus('⚠ Email export failed');
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const createNewProspect = () => {
    // Create a new prospect from current selection or use defaults
    const prospectData = selectedCustData || {
      name: 'New Prospect',
      entityid: `PROSPECT-${Date.now()}`,
      industry: 'Professional Services',
      size: '50-100',
      budget: '$100K-200K',
      focus: ['Resource Planning', 'Billing']
    };

    // Prepare export data for new customer creation
    const exportData = createExportData(prospectData, null, {
      modules: prospectData.focus || []
    });

    // Export via email - this will create the customer in NetSuite
    exportViaEmail(exportData, {
      recipientEmail: 'simmonspatrick1@gmail.com',
      includeInstructions: true
    });

    setActionStatus('✓ Creating prospect via email...');
    setTimeout(() => setActionStatus(null), 3000);
  };

  const quickActions = [
    {
      id: 'create-prospect',
      label: 'Create Prospect',
      icon: Users,
      action: createNewProspect
    },
    {
      id: 'create-project',
      label: 'Create Project',
      icon: Plus,
      action: () => {
        if (!selectedCustData) {
          setActionStatus('⚠ Please select a customer first');
          setTimeout(() => setActionStatus(null), 2000);
          return;
        }
        
        // Create project via email export (actual NetSuite creation)
        const projectData = {
          name: `${selectedCustData.name} - Demo Project`,
          entityid: `PRJ-${selectedCustData.entityid}-${Date.now()}`,
          customerId: selectedCustData.nsId,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90*24*60*60*1000).toISOString().split('T')[0],
          budget: selectedCustData.budget?.split('-')[0]?.replace('$', '').replace('K', '000') || '100000',
          status: 'OPEN',
          description: `Demo project for ${selectedCustData.industry} - ${selectedCustData.focus?.join(', ')}`
        };

        const exportData = createExportData(selectedCustData, projectData, {
          modules: selectedCustData.focus || []
        });

        exportViaEmail(exportData, {
          recipientEmail: 'simmonspatrick1@gmail.com',
          includeInstructions: true
        });

        setActionStatus('✓ Creating project via email...');
        setTimeout(() => setActionStatus(null), 3000);
      }
    },
    {
      id: 'time-entries',
      label: 'Add Sample Time Entries',
      icon: Clock,
      action: () => {
        const prompt = `Create 10 approved time entries for the demo project for ${selectedCustData?.name} across 3 different team members. Include billable hours, task assignments, and realistic dates spread across ${new Date().getFullYear()}.`;
        copyToClipboard(prompt, 'action-time');
        setActionStatus('✓ Time entry prompt copied');
        setTimeout(() => setActionStatus(null), 2000);
      }
    },
    {
      id: 'create-estimate',
      label: 'Create Estimate',
      icon: FileText,
      action: () => {
        if (!selectedCustData) {
          setActionStatus('⚠ Please select a customer first');
          setTimeout(() => setActionStatus(null), 2000);
          return;
        }

        // Create estimate via email export using configured items
        const budgetAmount = selectedCustData.budget?.split('-')[0]?.replace('$', '').replace('K', '000') || '100000';
        
        // Use items from the Items Configuration tab (customItems state)
        // Falls back to default config if not customized
        const lineItems = customItems;
        
        const estimateData = {
          type: 'T&M',
          customerId: selectedCustData.nsId,
          customer: selectedCustData.name,
          total: budgetAmount,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          items: Object.values(lineItems).map(item => ({
            name: item.name,
            description: item.description,
            quantity: 1,
            rate: parseFloat(budgetAmount) * item.percentOfBudget
          }))
        };

        const exportData = createExportData(selectedCustData, null, {
          estimate: estimateData,
          modules: selectedCustData.focus || []
        });

        exportViaEmail(exportData, {
          recipientEmail: 'simmonspatrick1@gmail.com',
          includeInstructions: true
        });

        setActionStatus('✓ Creating estimate via email...');
        setTimeout(() => setActionStatus(null), 3000);
      }
    },
    {
      id: 'resource-forecast',
      label: 'Resource Allocation',
      icon: TrendingUp,
      action: () => {
        const prompt = `Create resource allocation forecast for ${selectedCustData?.name} demo project with these roles: ${selectedCustData?.focus.join(', ')}. Include 10-15 team members with varied utilization rates (60-100%) across 12 weeks.`;
        copyToClipboard(prompt, 'action-resource');
        setActionStatus('✓ Resource prompt copied');
        setTimeout(() => setActionStatus(null), 2000);
      }
    },
    {
      id: 'sync-netsuite',
      label: 'Sync NetSuite Data',
      icon: Loader,
      action: syncNetsuiteFieFds
    },
    {
      id: 'export-email',
      label: 'Export to Email',
      icon: Mail,
      action: exportToEmail
    }
  ];

  const currentAccount = accounts.find(a => a.id === selectedAccount);
  const selectedCustData = prospects.find(c => c.id === selectedCustomer);

  // ============ COMPONENT: QUICK ACTIONS PANEL ============
  const QuickActionsPanel = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 font-semibold uppercase">Quick Demo Tasks</p>
        {actionStatus && (
          <span className="text-xs text-green-600 font-medium">{actionStatus}</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const isLoading = syncLoading && action.id === 'sync-netsuite';
          return (
            <button
              key={action.id}
              onClick={action.action}
              disabled={syncLoading && action.id !== 'sync-netsuite'}
              className={`p-3 rounded-lg transition-all text-xs font-medium flex flex-col items-center justify-center gap-2 ${
                isLoading
                  ? 'bg-blue-100 text-blue-700 cursor-wait'
                  : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 active:scale-95'
              } disabled:opacity-50`}
            >
              {isLoading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Icon size={18} />
              )}
              <span className="text-center leading-tight">{action.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ============ COMPONENT: CUSTOM FIELDS DISPLAY ============
  const CustomFieldsPanel = () => {
    const fields = customFieldsData[selectedCustData?.id];
    
    if (!fields) {
      return (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-blue-900">NetSuite Custom Fields</p>
              <p className="text-xs text-blue-700 mt-1">Click "Sync NetSuite Data" above to load custom fields from your account.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="bg-white rounded-lg border border-gray-200 p-3">
            <p className="text-xs text-gray-500 font-semibold uppercase">{key.replace(/([A-Z])/g, ' $1')}</p>
            <p className="text-sm font-medium text-gray-800 mt-1 line-clamp-2">{value}</p>
          </div>
        ))}
      </div>
    );
  };
  const AccountSwitcher = () => (
    <div className="flex gap-2 flex-wrap">
      {accounts.map(account => (
        <button
          key={account.id}
          onClick={() => setSelectedAccount(account.id)}
          className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
            selectedAccount === account.id
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <Building2 size={16} />
          {account.name}
          {account.id === selectedAccount && <Check size={16} />}
        </button>
      ))}
    </div>
  );

  // ============ COMPONENT: CUSTOMER CONTEXT PANEL ============
  const CustomerContextPanel = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Customer List */}
      <div className="lg:col-span-1 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} /> Key Prospects
          </h3>
          <p className="text-xs text-gray-600 mt-1">{currentAccount?.vertical}</p>
        </div>
        
        <div className="p-3 border-b space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-2 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowAddProspectModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus size={16} />
            Add New Prospect
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.map((customer) => (
            <button
              key={customer.id}
              onClick={() => setSelectedCustomer(customer.id)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                selectedCustomer === customer.id ? 'bg-blue-100 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="font-semibold text-sm text-gray-800">{customer.name}</p>
                  <p className="text-xs text-gray-500">{customer.industry}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  customer.status === 'Hot' ? 'bg-red-100 text-red-700' :
                  customer.status === 'Active' ? 'bg-green-100 text-green-700' :
                  customer.status === 'Proposal' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {customer.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Context Details */}
      <div className="lg:col-span-2 space-y-4">
        {selectedCustData ? (
          <>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold">{selectedCustData.name}</h2>
                  <p className="text-blue-100 mt-1">{selectedCustData.industry}</p>
                </div>
                <span className="bg-blue-500 px-3 py-1 rounded-full text-sm font-semibold">
                  {selectedCustData.status}
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <QuickActionsPanel />

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase">Entity ID</p>
                <p className="text-lg font-semibold text-gray-800 mt-1">{selectedCustData.entityid}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase">Company Size</p>
                <p className="text-lg font-semibold text-gray-800 mt-1">{selectedCustData.size} employees</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase">Budget Range</p>
                <p className="text-lg font-semibold text-green-700 mt-1">{selectedCustData.budget}</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase">Demo Date</p>
                <p className="text-lg font-semibold text-blue-700 mt-1">{selectedCustData.demoDate}</p>
              </div>
            </div>

            {/* Custom Fields from NetSuite */}
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Synced NetSuite Fields</p>
              <CustomFieldsPanel />
            </div>

            {/* Focus Areas */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Demo Focus Areas</p>
              <div className="flex flex-wrap gap-2">
                {selectedCustData.focus.map((area, idx) => (
                  <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            {/* Quick Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2">Quick Notes</p>
              <textarea
                value={demoNotes[selectedCustData.id] || ''}
                onChange={(e) => setDemoNotes({...demoNotes, [selectedCustData.id]: e.target.value})}
                placeholder="Add demo notes, pain points, or follow-up items..."
                className="w-full h-24 p-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* NetSuite Link */}
            <a
              href={`https://${currentAccount?.instance}.app.netsuite.com/app/common/entity/customer.nl?id=${selectedCustData.nsId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
            >
              <Target size={16} />
              Open in NetSuite
              <ChevronRight size={16} />
            </a>
          </>
        ) : (
          <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
            <Users size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Select a prospect to view details</p>
          </div>
        )}
      </div>
    </div>
  );

  // ============ COMPONENT: ITEM CONFIGURATION PANEL ============
  const ItemConfigPanel = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Configure Estimate Items</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose which NetSuite items to use when creating estimates. All items listed exist in your NetSuite account.
        </p>
        
        {/* Preset Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(ESTIMATE_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedEstimatePreset(key);
                  // Update custom items with preset
                  const presetItems = {};
                  preset.items.forEach((item, idx) => {
                    const keys = ['professionalServices', 'travelExpenses', 'softwareLicensing', 'additional1', 'additional2'];
                    if (keys[idx]) {
                      presetItems[keys[idx]] = {
                        name: item.name,
                        description: item.description,
                        percentOfBudget: item.percentOfBudget
                      };
                    }
                  });
                  setCustomItems(presetItems);
                }}
                className={`px-4 py-3 rounded-lg border-2 transition-all ${
                  selectedEstimatePreset === key
                    ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-sm font-medium">{preset.name}</div>
                <div className="text-xs text-gray-500 mt-1">{preset.items.length} items</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Line Items Configuration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estimate Line Items</h3>
        
        <div className="space-y-4">
          {Object.entries(customItems).map(([key, item]) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Item Name Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    NetSuite Item
                  </label>
                  <select
                    value={item.name}
                    onChange={(e) => {
                      setCustomItems(prev => ({
                        ...prev,
                        [key]: { ...prev[key], name: e.target.value }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <optgroup label="Professional Services">
                      <option value="PS - Post Go-Live Support">PS - Post Go-Live Support ($175/hr)</option>
                      <option value="PS - Go-Live Support">PS - Go-Live Support ($200/hr)</option>
                      <option value="PS - Training Services">PS - Training Services ($150/hr)</option>
                      <option value="PS - Data Migration">PS - Data Migration ($140/hr)</option>
                      <option value="PS - Discovery & Design Strategy">PS - Discovery & Design Strategy ($275/hr)</option>
                    </optgroup>
                    <optgroup label="Project Services">
                      <option value="SVC_PR_Consulting">SVC_PR_Consulting ($200/hr)</option>
                      <option value="SVC_PR_Project Management">SVC_PR_Project Management ($375/hr)</option>
                      <option value="SVC_PR_Development">SVC_PR_Development ($220/hr)</option>
                      <option value="SVC_PR_Testing">SVC_PR_Testing ($200/hr)</option>
                      <option value="SVC_PR_Training">SVC_PR_Training ($120/hr)</option>
                      <option value="SVC_PR_Integration">SVC_PR_Integration ($220/hr)</option>
                      <option value="SVC_PR_Data Migration">SVC_PR_Data Migration ($125/hr)</option>
                      <option value="SVC_PR_Business Analysis">SVC_PR_Business Analysis ($120/hr)</option>
                    </optgroup>
                    <optgroup label="Expenses">
                      <option value="EXP_Travel Expenses">EXP_Travel Expenses</option>
                      <option value="SVC_PR_Travel">SVC_PR_Travel ($200/hr)</option>
                    </optgroup>
                    <optgroup label="Software/Licensing">
                      <option value="NIN_AA1: SaaS License A">NIN_AA1: SaaS License A ($24,000)</option>
                      <option value="NIN_AA1: Perpetual License">NIN_AA1: Perpetual License</option>
                      <option value="NIN_AA1: Platinum Support">NIN_AA1: Platinum Support ($12,000)</option>
                    </optgroup>
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      setCustomItems(prev => ({
                        ...prev,
                        [key]: { ...prev[key], description: e.target.value }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Line item description"
                  />
                </div>

                {/* Percentage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    % of Budget
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={item.percentOfBudget * 100}
                    onChange={(e) => {
                      setCustomItems(prev => ({
                        ...prev,
                        [key]: { ...prev[key], percentOfBudget: parseFloat(e.target.value) / 100 }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Percentage Check */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Percentage:</span>
            <span className={`text-lg font-bold ${
              Math.abs(Object.values(customItems).reduce((sum, item) => sum + item.percentOfBudget, 0) - 1) < 0.01
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {(Object.values(customItems).reduce((sum, item) => sum + item.percentOfBudget, 0) * 100).toFixed(0)}%
            </span>
          </div>
          {Math.abs(Object.values(customItems).reduce((sum, item) => sum + item.percentOfBudget, 0) - 1) >= 0.01 && (
            <p className="text-xs text-red-600 mt-2">⚠️ Percentages should add up to 100%</p>
          )}
        </div>

        {/* Save Button */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              // Save to local storage or update config
              localStorage.setItem('customEstimateItems', JSON.stringify(customItems));
              setActionStatus('✓ Item configuration saved!');
              setTimeout(() => setActionStatus(null), 3000);
            }}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Save Configuration
          </button>
          <button
            onClick={() => {
              setCustomItems(ITEM_CONFIG.estimateLineItems);
              setActionStatus('✓ Reset to defaults');
              setTimeout(() => setActionStatus(null), 2000);
            }}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Available Items Reference */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available NetSuite Items</h3>
        <p className="text-sm text-gray-600 mb-4">
          All items from your NetSuite account (ItemSearchResults891.xls)
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Professional Services</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• PS - Post Go-Live Support ($175/hr)</li>
              <li>• PS - Go-Live Support ($200/hr)</li>
              <li>• PS - Training Services ($150/hr)</li>
              <li>• PS - Data Migration ($140/hr)</li>
              <li>• PS - Discovery & Design Strategy ($275/hr)</li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Project Services</h4>
            <ul className="space-y-1 text-gray-600">
              <li>• SVC_PR_Consulting ($200/hr)</li>
              <li>• SVC_PR_Project Management ($375/hr)</li>
              <li>• SVC_PR_Development ($220/hr)</li>
              <li>• SVC_PR_Testing ($200/hr)</li>
              <li>• SVC_PR_Training ($120/hr)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // ============ COMPONENT: PROMPT LIBRARY ============
  const PromptLibrary = () => (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Search prompts..."
          value={promptSearch}
          onChange={(e) => setPromptSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-3">
        {filteredPrompts.map((category, catIdx) => (
          <div key={catIdx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === catIdx ? null : catIdx)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between font-semibold text-gray-800 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen size={18} className="text-blue-600" />
                {category.name}
              </span>
              <ChevronDown size={18} className={`transition-transform ${expandedCategory === catIdx ? 'rotate-180' : ''}`} />
            </button>

            {expandedCategory === catIdx && (
              <div className="divide-y">
                {category.prompts.map((prompt, promptIdx) => {
                  const globalIdx = catIdx * 100 + promptIdx;
                  const isFav = favorites.includes(prompt);
                  
                  return (
                    <div key={promptIdx} className="p-4 hover:bg-gray-50 transition-colors">
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed">{prompt}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(prompt, globalIdx)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium text-sm"
                        >
                          {copiedIndex === globalIdx ? (
                            <>
                              <Check size={16} /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy size={16} /> Copy
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => toggleFavorite(prompt)}
                          className={`px-3 py-2 rounded-lg transition-colors ${
                            isFav
                              ? 'bg-yellow-100 text-yellow-600'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          ★
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ============ RENDER ============
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Zap size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Demo Master Dashboard</h1>
                <p className="text-sm text-gray-600">NetSuite PSA Demo Prep Hub</p>
              </div>
            </div>
            
            {/* Clipboard History */}
            <div className="relative">
              <button
                onClick={() => setShowClipboardHistory(!showClipboardHistory)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative"
                title="Clipboard History"
              >
                <Copy size={20} />
                {clipboardHistory.length > 0 && (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-blue-600 text-white text-xs flex items-center justify-center rounded-full">
                    {clipboardHistory.length}
                  </span>
                )}
              </button>
              
              {showClipboardHistory && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-700 text-sm">Clipboard History</h3>
                    <button 
                      onClick={() => setClipboardHistory([])}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear
                    </button>
                  </div>
                  {clipboardHistory.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      No history yet
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {clipboardHistory.map((item, idx) => (
                        <div key={idx} className="p-3 hover:bg-gray-50 group relative">
                          <p className="text-xs text-gray-800 line-clamp-2 pr-6">{item.text}</p>
                          <span className="text-[10px] text-gray-400 mt-1 block">
                            {item.timestamp.toLocaleTimeString()}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(item.text);
                              setShowClipboardHistory(false);
                              setActionStatus('✓ Copied from history');
                              setTimeout(() => setActionStatus(null), 2000);
                            }}
                            className="absolute right-2 top-3 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy again"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Switcher */}
          <div className="mb-6">
            <p className="text-xs text-gray-600 font-semibold uppercase mb-3">Active Demo Account</p>
            <AccountSwitcher />
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-t border-gray-200 pt-4">
            <button
              onClick={() => setActiveTab('context')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'context'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <User size={18} />
                Customer Context
              </span>
            </button>
            <button
              onClick={() => setActiveTab('prompts')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'prompts'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <BookOpen size={18} />
                Demo Prompts ({favorites.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab('items')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'items'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Settings size={18} />
                Configure Items
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'context' ? <CustomerContextPanel /> : activeTab === 'prompts' ? <PromptLibrary /> : <ItemConfigPanel />}
      </div>

      {/* Add Prospect Modal */}
      {showAddProspectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Add New Prospect</h2>
              <button
                onClick={() => setShowAddProspectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProspect.name}
                  onChange={(e) => setNewProspect(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              {/* Entity ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entity ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProspect.entityid}
                  onChange={(e) => setNewProspect(prev => ({ ...prev, entityid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ACME-Demo"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={newProspect.industry}
                  onChange={(e) => setNewProspect(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Professional Services"
                />
              </div>

              {/* Size and Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <input
                    type="text"
                    value={newProspect.size}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, size: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., 100-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <select
                    value={newProspect.status}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Qualified">Qualified</option>
                    <option value="Active">Active</option>
                    <option value="Hot">Hot</option>
                    <option value="Proposal">Proposal</option>
                  </select>
                </div>
              </div>

              {/* Budget and Demo Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Budget
                  </label>
                  <input
                    type="text"
                    value={newProspect.budget}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, budget: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $100K-200K"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Demo Date
                  </label>
                  <input
                    type="text"
                    value={newProspect.demoDate}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, demoDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Dec 15"
                  />
                </div>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Focus Areas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Resource Planning', 'Project Accounting', 'Multi-Entity', 'Billing', 'Time & Expense', 'Forecasting', 'PSA', 'Consolidation'].map(area => (
                    <button
                      key={area}
                      onClick={() => toggleFocusArea(area)}
                      className={`px-3 py-2 rounded-lg border-2 text-sm transition-all ${
                        newProspect.focus.includes(area)
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowAddProspectModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProspect}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Add Prospect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
