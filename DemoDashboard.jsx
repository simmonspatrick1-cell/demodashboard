import React, { useState, useMemo, useEffect } from 'react';
import { Search, Settings, User, Users, Zap, ChevronRight, Copy, Check, BookOpen, ChevronDown, Target, Building2, Mail, Phone, MoreVertical, Play, Plus, FileText, Clock, TrendingUp, AlertCircle, Loader, RefreshCw } from 'lucide-react';
// Import the NetSuite service
// import NetSuiteService from './netsuite-service';

export default function DemoDashboard() {
  // ============ STATE MANAGEMENT ============
  const [activeTab, setActiveTab] = useState('context'); // 'context', 'prompts'
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
    return keyProspects.filter(cust =>
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.entityid.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

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
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleFavorite = (prompt) => {
    setFavorites(prev =>
      prev.includes(prompt) ? prev.filter(p => p !== prompt) : [...prev, prompt]
    );
  };

  const syncNetsuiteFieFds = async () => {
    if (!selectedCustData) return;
    setSyncLoading(true);
    setActionStatus('Syncing from NetSuite...');
    
    try {
      // STEP 1: This would use your Claude MCP tool integration
      // In a real implementation, this calls your backend which has access to the MCP tools
      // For now, we'll show the integration pattern
      
      const payload = {
        action: 'fetchCustomer',
        customerId: selectedCustData.nsId,
        account: selectedAccount,
        fields: ['id', 'entityid', 'companyname', 'custentity13', 'custentity16', 'custentity15', 
                 'custentity_esc_industry', 'custentity_esc_annual_revenue', 'custentity_esc_no_of_employees', 
                 'email', 'phone']
      };

      // In production, this would POST to your backend:
      // const response = await fetch('/api/netsuite/sync', { method: 'POST', body: JSON.stringify(payload) });
      
      // For now, we'll demonstrate with the mock data that would come back
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

      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 800));

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

      setActionStatus('✓ Synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
      setActionStatus('⚠ Sync failed - check console');
    } finally {
      setSyncLoading(false);
      setLastSyncTime(new Date());
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  const quickActions = [
    {
      id: 'create-project',
      label: 'Create Demo Project',
      icon: Plus,
      action: () => {
        const prompt = `Create a project for ${selectedCustData?.name} titled "[Demo Project Name]" with entity ID [PRJ-DEMO-####]. Add 3-5 task estimates for typical ${selectedCustData?.industry} workflows.`;
        copyToClipboard(prompt, 'action-project');
        setActionStatus('✓ Project prompt copied');
        setTimeout(() => setActionStatus(null), 2000);
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
      label: 'Generate Estimate',
      icon: FileText,
      action: () => {
        const prompt = `Create an estimate for ${selectedCustData?.name} from the demo project. Include line items for: Professional Services (60%), Travel & Expenses (20%), Software Licensing (20%). Set total value to ${selectedCustData?.budget?.split('-')[0]}.`;
        copyToClipboard(prompt, 'action-estimate');
        setActionStatus('✓ Estimate prompt copied');
        setTimeout(() => setActionStatus(null), 2000);
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
    }
  ];

  const currentAccount = accounts.find(a => a.id === selectedAccount);
  const selectedCustData = keyProspects.find(c => c.id === selectedCustomer);

  // ============ COMPONENT: QUICK ACTIONS PANEL ============
  const QuickActionsPanel = () => (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-gray-500 font-semibold uppercase">Quick Demo Tasks</p>
        {actionStatus && (
          <span className="text-xs text-green-600 font-medium">{actionStatus}</span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
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
        
        <div className="p-3 border-b">
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
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'context' ? <CustomerContextPanel /> : <PromptLibrary />}
      </div>
    </div>
  );
}
