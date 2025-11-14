import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, User, Users, Zap, ChevronRight, Copy, Check, BookOpen, ChevronDown, Target, Building2, Plus, FileText, Clock, TrendingUp, AlertCircle, Loader, Wand2, BarChart3, Download, ListChecks, Info } from 'lucide-react';
// Import enhanced components and services
import ScenarioGenerator from './ScenarioGenerator';
import DataVisualization from './DataVisualization';
import AdvancedSearch from './AdvancedSearch';
import DataExport from './DataExport';

const KEY_PROSPECTS = [
  { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'Hot', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161 },
  { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'Active', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834 },
  { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'Active', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938 },
  { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy/Midstream', size: '100-150', status: 'Active', demoDate: 'Nov 12', focus: ['Project Accounting', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662 },
  { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'Qualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938 },
  { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'Proposal', demoDate: 'Pending', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285 },
  { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'Active', demoDate: 'Nov 20', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938 },
];

const PROMPT_CATEGORIES = [
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

export default function DemoDashboard() {
  // ============ STATE MANAGEMENT ============
  const [activeTab, setActiveTab] = useState('context'); // 'context', 'prompts', 'analytics', 'export'
  const [selectedAccount, setSelectedAccount] = useState('services');
  const [analyticsData] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [promptSearch, setPromptSearch] = useState<string>('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [demoNotes, setDemoNotes] = useState<{[key: number]: string}>({});
  const [netsuiteSyncEnabled, setNetsuiteSyncEnabled] = useState<boolean>(true);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [customFieldsData, setCustomFieldsData] = useState<{[key: number]: any}>({});
  const [actionStatus, setActionStatus] = useState<string | {type: string, message: string} | null>(null);
  const [nsData, setNsData] = useState<any>({}); // Store NetSuite API responses
  const [showScenarioGenerator, setShowScenarioGenerator] = useState<boolean>(false);
  const [dynamicCustomers, setDynamicCustomers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clipboardHistory, setClipboardHistory] = useState<{ id: string; label: string; text: string; timestamp: Date }[]>([]);
  const [syncHistory, setSyncHistory] = useState<{[key: number]: Date}>({});
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickProspect, setQuickProspect] = useState({
    name: '',
    industry: '',
    status: 'Active',
    size: '100-200',
    budget: '$150K+',
    focusText: 'Resource Planning',
    nsId: '',
    demoDate: 'TBD'
  });

  // ============ DATA SOURCES ============
  const accounts = [
    { id: 'services', name: 'Services Stairway', instance: 'td3049589', vertical: 'Professional Services' },
    { id: 'software', name: 'Software Stairway', instance: 'td3049589-soft', vertical: 'SaaS' },
    { id: 'saas', name: 'NS Services SaaS', instance: 'td3049589-saas', vertical: 'Services & SaaS' }
  ];

  // ============ CUSTOMER FILTERING & SEARCH ============
  // Combine static and dynamic customers
  const allCustomers = useMemo(() => {
    return [...KEY_PROSPECTS, ...dynamicCustomers];
  }, [dynamicCustomers]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter(cust => {
      const matchesSearch =
        cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.industry.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cust.entityid.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || cust.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, allCustomers, statusFilter]);

  const netsuiteExportData = useMemo(() => {
    return Object.entries(nsData).map(([custId, recordData]: [string, any]) => {
      const numericId = Number(custId);
      const customer = allCustomers.find(c => c.id === numericId);
      const syncedAt = recordData?.syncedAt || syncHistory[numericId]?.toISOString() || '';
      const customFields = customFieldsData[numericId] || {};
      return {
        customerId: numericId,
        name: customer?.name || recordData?.companyname,
        industry: customer?.industry || recordData?.custentity_esc_industry,
        status: customer?.status || 'Synced',
        account: recordData?.account || selectedAccount,
        entityId: recordData?.entityid,
        netsuiteId: recordData?.id || customer?.nsId,
        syncedAt,
        email: recordData?.email,
        phone: recordData?.phone,
        customFields,
        source: 'NetSuite',
        raw: recordData
      };
    }).sort((a, b) => new Date(b.syncedAt || 0).getTime() - new Date(a.syncedAt || 0).getTime());
  }, [nsData, allCustomers, customFieldsData, syncHistory, selectedAccount]);
  useEffect(() => {
    if (!selectedCustomer && filteredCustomers.length > 0) {
      setSelectedCustomer(filteredCustomers[0].id);
    }
  }, [filteredCustomers, selectedCustomer]);

  const statusCounts = useMemo(() => {
    return allCustomers.reduce((acc: Record<string, number>, cust) => {
      acc[cust.status] = (acc[cust.status] || 0) + 1;
      return acc;
    }, {});
  }, [allCustomers]);

  const currentAccount = accounts.find(a => a.id === selectedAccount);
  const selectedCustData = allCustomers.find(c => c.id === selectedCustomer);

  const checklistState = useMemo(() => {
    const hasSyncedFields = selectedCustData ? Boolean(customFieldsData[selectedCustData.id]) : false;
    const hasNotes = selectedCustData ? Boolean(demoNotes[selectedCustData.id]?.trim()) : false;
    return [
      { id: 'account', label: 'Choose demo account', done: Boolean(selectedAccount) },
      { id: 'customer', label: 'Select a prospect', done: Boolean(selectedCustomer) },
      { id: 'sync', label: 'Sync NetSuite data', done: hasSyncedFields },
      { id: 'notes', label: 'Capture demo notes', done: hasNotes },
    ];
  }, [selectedAccount, selectedCustomer, customFieldsData, selectedCustData, demoNotes]);

  const formattedLastSync = useMemo(() => {
    if (!lastSyncTime) return null;
    return lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [lastSyncTime]);

  const filteredPrompts = useMemo(() => {
    if (!promptSearch) return PROMPT_CATEGORIES;
    return PROMPT_CATEGORIES.map(cat => ({
      ...cat,
      prompts: cat.prompts.filter(p => p.toLowerCase().includes(promptSearch.toLowerCase()))
    })).filter(cat => cat.prompts.length > 0);
  }, [promptSearch]);

  // ============ HELPER FUNCTIONS ============
  const handleScenarioGenerated = (newScenario: any) => {
    // Add the new AI-generated scenario to the dynamic customers list
    setDynamicCustomers(prev => [newScenario, ...prev]);
    
    // Auto-select the new scenario
    setSelectedCustomer(newScenario.id);
    
    // Show success message
    setActionStatus({
      type: 'success',
      message: `AI scenario "${newScenario.name}" generated successfully!`
    });
    
    // Clear success message after 5 seconds
    setTimeout(() => setActionStatus(null), 5000);
  };

  const copyToClipboard = (text: string, index: string, label: string = 'Prompt copied') => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setClipboardHistory(prev => {
      const entry = { id: `${index}-${Date.now()}`, label, text, timestamp: new Date() };
      return [entry, ...prev].slice(0, 6);
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const toggleFavorite = (prompt: string) => {
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

      const syncTimestamp = new Date();

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
      
      setNsData((prev: any) => ({
        ...prev,
        [selectedCustData.id]: {
          ...mockNsResponse,
          account: selectedAccount,
          syncedAt: syncTimestamp.toISOString()
        }
      }));
      setSyncHistory(prev => ({
        ...prev,
        [selectedCustData.id]: syncTimestamp
      }));
      setLastSyncTime(syncTimestamp);
      setActionStatus('✓ Synced successfully');
    } catch (error) {
      console.error('Sync error:', error);
      setActionStatus('⚠ Sync failed - check console');
    } finally {
      setSyncLoading(false);
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
        copyToClipboard(prompt, 'action-project', 'Project creation prompt');
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
        copyToClipboard(prompt, 'action-time', 'Time entry prompt');
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
        copyToClipboard(prompt, 'action-estimate', 'Estimate prompt');
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
        copyToClipboard(prompt, 'action-resource', 'Resource allocation prompt');
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

  // ============ COMPONENT: QUICK ACTIONS PANEL ============
  const QuickActionsPanel = () => (
    <div className="quick-actions-panel">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#5a6780] font-semibold uppercase tracking-wide">Quick Demo Tasks</p>
        <div className="flex items-center gap-3 text-xs">
          {formattedLastSync && (
            <span className="text-[#5a6780]">Last sync: {formattedLastSync}</span>
          )}
          {actionStatus && (
            <span className="text-[#0eb07b] font-medium">
              {typeof actionStatus === 'string' ? actionStatus : actionStatus.message}
            </span>
          )}
        </div>
      </div>
      <p className="quick-actions-hint">Each button copies a ready-to-run script to your clipboard so you can paste it into Claude or NetSuite.</p>
      <div className="quick-actions-panel__grid">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const isLoading = syncLoading && action.id === 'sync-netsuite';
          return (
            <button
              key={action.id}
              onClick={action.action}
              disabled={syncLoading && action.id !== 'sync-netsuite'}
              className={`quick-actions-panel__button ${isLoading ? 'is-loading' : ''}`}
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
    const fields = selectedCustData?.id ? customFieldsData[selectedCustData.id] : undefined;
    
    if (!fields) {
      return (
        <div className="bg-gradient-to-br from-[#e3f3ff] to-[#f1f7ff] rounded-2xl border border-[#c7dffc] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-[#0f7cc5] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#0b2745]">NetSuite Custom Fields</p>
              <p className="text-xs text-[#1a4c7a] mt-1">
                Click "Sync NetSuite Data" above to load real-time fields from your account.
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="bg-white rounded-2xl border border-[#e3e7ef] p-3 shadow-sm">
            <p className="text-xs text-[#738097] font-semibold uppercase tracking-wide">
              {key.replace(/([A-Z])/g, ' $1')}
            </p>
            <p className="text-sm font-semibold text-[#0b2036] mt-1 line-clamp-2">{String(value)}</p>
          </div>
        ))}
      </div>
    );
  };
  const AccountSwitcher = () => (
    <div className="account-switcher">
      {accounts.map(account => (
        <button
          key={account.id}
          onClick={() => setSelectedAccount(account.id)}
          className={`switcher-pill ${selectedAccount === account.id ? 'is-active' : ''}`}
        >
          <Building2 size={16} />
          <span>{account.name}</span>
          {account.id === selectedAccount && <Check size={16} />}
        </button>
      ))}
    </div>
  );

  const SummaryHighlights = () => (
    <div className="summary-grid">
      {[
        { label: 'Active Prospects', value: allCustomers.length, icon: Zap, accent: '#13a0d8' },
        { label: 'Hot Accounts', value: statusCounts['Hot'] || 0, icon: Target, accent: '#ff8054' },
        { label: 'Active Pipeline', value: statusCounts['Active'] || 0, icon: Users, accent: '#4d91ff' },
        { label: 'Saved Favorites', value: favorites.length, icon: BookOpen, accent: '#0fb69f' }
      ].map(({ label, value, icon: Icon, accent }) => (
        <div key={label} className="summary-card">
          <div className="summary-icon" style={{ background: accent }}>
            <Icon size={22} />
          </div>
          <div>
            <p className="summary-card__label">{label}</p>
            <p className="summary-card__value">{value}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const DemoChecklist = () => (
    <div className="checklist-panel">
      <div className="checklist-header">
        <ListChecks size={18} />
        <p>Guided Demo Checklist</p>
      </div>
      <div className="checklist-list">
        {checklistState.map(item => (
          <div
            key={item.id}
            className={`checklist-item ${item.done ? 'is-complete' : ''}`}
          >
            <div className="checklist-meta">
              <div className="checklist-icon">
                <Check size={14} />
              </div>
              <span>{item.label}</span>
            </div>
            <span className="checklist-status">{item.done ? 'Done' : 'Pending'}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const FlowGuide = () => {
    const steps = [
      {
        title: '1. Pick a Prospect',
        description: 'Choose a key account on the left to load their context, notes, and NetSuite link.'
      },
      {
        title: '2. Sync & Prep',
        description: 'Run Quick Actions or Sync NetSuite Data to pull their latest custom fields.'
      },
      {
        title: '3. Use Demo Prompts',
        description: 'Copy prompts or project scripts to your clipboard and paste directly into NetSuite or Claude.'
      }
    ];
    return (
      <div className="flow-guide">
        {steps.map((step) => (
          <div key={step.title} className="flow-card">
            <h4>{step.title}</h4>
            <p>{step.description}</p>
          </div>
        ))}
      </div>
    );
  };

  const ClipboardDock = () => {
    if (clipboardHistory.length === 0) {
      return (
        <div className="clipboard-dock empty">
          <p>Copy prompts or quick actions to see them collected here.</p>
        </div>
      );
    }

    const copyAll = () => {
      const aggregate = clipboardHistory.map(entry => `• ${entry.label}\n${entry.text}`).join('\n\n');
      navigator.clipboard.writeText(aggregate);
    };

    return (
      <div className="clipboard-dock">
        <div className="clipboard-dock__header">
          <div>
            <p className="section-label">Clipboard Queue</p>
            <span>{clipboardHistory.length} items ready to paste</span>
          </div>
          <button onClick={copyAll} className="primary-button small">Copy All</button>
        </div>
        <div className="clipboard-dock__items">
          {clipboardHistory.map(entry => (
            <div key={entry.id} className="clipboard-item">
              <div>
                <p className="clipboard-item__label">{entry.label}</p>
                <p className="clipboard-item__text">{entry.text}</p>
              </div>
              <button onClick={() => navigator.clipboard.writeText(entry.text)} className="ghost-button small">
                Copy Again
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ============ COMPONENT: CUSTOMER CONTEXT PANEL ============
  const CustomerContextPanel = () => (
    <div className="customer-context">
      <SummaryHighlights />
      <div className="customer-layout">
      {/* Customer List */}
      <div className="customer-panel">
        <div className="p-4 bg-gradient-to-r from-[#0c2146] via-[#12315f] to-[#0f3b6f] text-white border-b border-white/10">
          <div className="customer-panel__header">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Users size={18} /> Key Prospects
              </h3>
              <p className="text-xs text-white/70 mt-1">{currentAccount?.vertical}</p>
            </div>
            <span className="customer-count">
              {filteredCustomers.length} prospects
            </span>
          </div>
        </div>
        
        <div className="p-4 border-b border-[#eef2fb] bg-white/90">
          <div className="customer-search">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="customer-search__input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="customer-search__clear"
              >
                Clear
              </button>
            )}
          </div>
          <div className="status-chips">
            {['all', 'Hot', 'Active', 'Qualified', 'Proposal'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`status-chip ${statusFilter === status ? 'is-active' : ''}`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>
          <div className="panel-actions">
            <button
              onClick={() => setShowScenarioGenerator(true)}
              className="panel-button"
            >
              <Wand2 size={16} />
              Generate AI Scenario
            </button>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setSelectedCustomer(filteredCustomers[0]?.id ?? null);
              }}
              className="panel-button panel-button--ghost"
            >
              Reset View
            </button>
            <button
              onClick={() => setShowQuickCreate(true)}
              className="panel-button panel-button--ghost"
            >
              + Quick Add Prospect
            </button>
          </div>
          {showQuickCreate && <QuickCreateForm />}
        </div>
        <div className="customer-panel__list">
          {filteredCustomers.length === 0 ? (
            <div className="panel-empty">
              <Info size={18} />
              No customers match your filters. Try clearing the search or switching the status chip.
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomer(customer.id)}
                className={`customer-row ${selectedCustomer === customer.id ? 'is-active' : ''}`}
                aria-label={`${customer.name} ${customer.industry} ${customer.status}`}
              >
                <div>
                  <p>{customer.name}</p>
                  <span title={customer.industry}>{customer.industry}</span>
                </div>
                <span
                  className={`status-pill status-pill--${customer.status.toLowerCase()}`}
                >
                  {customer.status}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Context Details */}
      <div className="context-panel">
        {selectedCustData ? (
          <>
            {/* Header */}
            <div className="context-hero">
              <div>
                <h2>{selectedCustData.name}</h2>
                <p>{selectedCustData.industry}</p>
              </div>
              <span>{selectedCustData.status}</span>
            </div>

            {/* Quick Actions + Checklist */}
            <div className="context-grid">
              <QuickActionsPanel />
              <DemoChecklist />
            </div>

            {/* Key Details Grid */}
            <div className="detail-grid">
              {[
                { label: 'Entity ID', value: selectedCustData.entityid },
                { label: 'Company Size', value: `${selectedCustData.size} employees` },
                { label: 'Budget Range', value: selectedCustData.budget },
                { label: 'Demo Date', value: selectedCustData.demoDate }
              ].map(info => (
                <div key={info.label} className="detail-card">
                  <p>{info.label}</p>
                  <strong>{info.value}</strong>
                </div>
              ))}
            </div>

            {/* Custom Fields from NetSuite */}
            <div>
              <p className="section-label">Synced NetSuite Fields</p>
              <CustomFieldsPanel />
            </div>

            {/* Focus Areas */}
            <div className="detail-card focus-card">
              <p className="section-label">Demo Focus Areas</p>
              <div className="focus-chips">
                {selectedCustData.focus.map((area: string, idx: number) => (
                  <span key={idx}>{area}</span>
                ))}
              </div>
            </div>

            {/* Quick Notes */}
            <div className="detail-card note-card">
              <p className="section-label">Quick Notes</p>
              <textarea
                value={demoNotes[selectedCustData.id] || ''}
                onChange={(e) => setDemoNotes({...demoNotes, [selectedCustData.id]: e.target.value})}
                placeholder="Add demo notes, pain points, or follow-up items..."
              />
            </div>

            {/* NetSuite Link */}
            <div className="primary-link-group">
              <a
                href={`https://${currentAccount?.instance}.app.netsuite.com/app/common/entity/customer.nl?login=T&id=${selectedCustData.nsId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="primary-link"
              >
                <Target size={16} />
                Open in NetSuite
                <ChevronRight size={16} />
              </a>
              <a
                href="https://td3049589.app.netsuite.com/app/login/secure/enterpriselogin.nl?c=TD2892895"
                target="_blank"
                rel="noopener noreferrer"
                className="secondary-link"
              >
                Sign In Again
              </a>
            </div>
          </>
        ) : (
          <div className="panel-empty">
            <Users size={48} />
            <p>Select a prospect to view details</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );

  const QuickCreateForm = () => (
    <div className="quick-create-card">
      <div className="quick-create-header">
        <p className="section-label">Quick Prospect</p>
        <button onClick={() => setShowQuickCreate(false)} aria-label="Close quick prospect">✕</button>
      </div>
      <div className="quick-create-grid">
        <label>
          <span>Name</span>
          <input
            value={quickProspect.name}
            onChange={(e) => setQuickProspect(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Horizon Labs"
          />
        </label>
        <label>
          <span>Industry</span>
          <input
            value={quickProspect.industry}
            onChange={(e) => setQuickProspect(prev => ({ ...prev, industry: e.target.value }))}
            placeholder="Industry"
          />
        </label>
        <label>
          <span>Status</span>
          <select
            value={quickProspect.status}
            onChange={(e) => setQuickProspect(prev => ({ ...prev, status: e.target.value }))}
          >
            <option value="Hot">Hot</option>
            <option value="Active">Active</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
          </select>
        </label>
        <label>
          <span>Size</span>
          <input
            value={quickProspect.size}
            onChange={(e) => setQuickProspect(prev => ({ ...prev, size: e.target.value }))}
            placeholder="100-200"
          />
        </label>
        <label>
          <span>Budget</span>
          <input
            value={quickProspect.budget}
            onChange={(e) => setQuickProspect(prev => ({ ...prev, budget: e.target.value }))}
            placeholder="$150K+"
          />
        </label>
        <label>
          <span>Focus Areas (comma separated)</span>
          <input
            value={quickProspect.focusText}
            onChange={(e) => setQuickProspect(prev => ({ ...prev, focusText: e.target.value }))}
            placeholder="Resource Planning, Billing"
          />
        </label>
      </div>
      <div className="quick-create-actions">
        <button
          className="ghost-button small"
          onClick={() => {
            setQuickProspect({
              name: '',
              industry: '',
              status: 'Active',
              size: '100-200',
              budget: '$150K+',
              focusText: 'Resource Planning',
              nsId: '',
              demoDate: 'TBD'
            });
            setShowQuickCreate(false);
          }}
        >
          Cancel
        </button>
        <button
          className="primary-button small"
          onClick={() => {
            if (!quickProspect.name.trim()) {
              setActionStatus('Enter a prospect name');
              return;
            }
            const nowId = Date.now();
            const focusList = quickProspect.focusText
              .split(',')
              .map(item => item.trim())
              .filter(Boolean);
            const newProspect = {
              id: nowId,
              name: quickProspect.name.trim(),
              entityid: `${quickProspect.name.trim().replace(/\s+/g, '-')}-Demo`,
              industry: quickProspect.industry || 'General',
              size: quickProspect.size || '100',
              status: quickProspect.status,
              demoDate: quickProspect.demoDate,
              focus: focusList.length ? focusList : ['Resource Planning'],
              budget: quickProspect.budget || '$150K+',
              nsId: quickProspect.nsId ? Number(quickProspect.nsId) : Math.floor(Math.random() * 4000) + 2000
            };
            setDynamicCustomers(prev => [newProspect, ...prev]);
            setQuickProspect({
              name: '',
              industry: '',
              status: 'Active',
              size: '100-200',
              budget: '$150K+',
              focusText: 'Resource Planning',
              nsId: '',
              demoDate: 'TBD'
            });
            setShowQuickCreate(false);
            setSelectedCustomer(newProspect.id);
            setActionStatus('✓ Prospect added');
            setTimeout(() => setActionStatus(null), 2000);
          }}
        >
          Save Prospect
        </button>
      </div>
    </div>
  );

  // ============ COMPONENT: PROMPT LIBRARY ============
  const PromptLibrary = () => (
    <div className="space-y-4">
      <div className="prompt-toolbar">
        <div className="prompt-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search scenarios, prompts, or industries"
            value={promptSearch}
            onChange={(e) => setPromptSearch(e.target.value)}
          />
        </div>
        <div className="prompt-filters">
          {['AI Generated', 'This Week', 'Technology', 'Templates'].map(filter => (
            <button key={filter}>{filter}</button>
          ))}
        </div>
      </div>
      <p className="prompt-intro">
        Browse the prompt library to jumpstart scripted walk-throughs. Click <strong>Copy</strong> to place a prompt on your clipboard, then paste it into NetSuite, Suitescript, or Claude to execute.
      </p>

      <div className="prompt-search prompt-search--secondary">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search prompts..."
          value={promptSearch}
          onChange={(e) => setPromptSearch(e.target.value)}
        />
      </div>

      <div className="prompt-accordion">
        {filteredPrompts.map((category, catIdx) => (
          <div key={catIdx} className="prompt-card">
            <button
              onClick={() => setExpandedCategory(expandedCategory === catIdx ? null : catIdx)}
              className="prompt-card__header"
            >
              <span className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#00a6d3]" />
                {category.name}
              </span>
              <ChevronDown size={18} className={`transition-transform ${expandedCategory === catIdx ? 'rotate-180' : ''}`} />
            </button>

            {expandedCategory === catIdx && (
              <div className="prompt-card__body">
                {category.prompts.map((prompt, promptIdx) => {
                  const globalIdx = catIdx * 100 + promptIdx;
                  const isFav = favorites.includes(prompt);
                  
                  return (
                    <div key={promptIdx} className="prompt-item">
                      <p>{prompt}</p>
                      <div className="prompt-item__actions">
                        <button
                            onClick={() => copyToClipboard(prompt, `${globalIdx}`, `Prompt: ${category.name}`)}
                          className="prompt-copy"
                        >
                            {copiedIndex === `${globalIdx}` ? (
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
                          className={`prompt-favorite ${isFav ? 'is-favorite' : ''}`}
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
    <div className="dashboard-shell">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header__inner">
          <div className="header-main">
            <div className="header-icon">
              <Zap size={26} />
            </div>
            <div>
              <p className="header-eyebrow">NetSuite Resource Planner</p>
              <h1 className="header-title">Demo Master Dashboard</h1>
              <p className="header-subtitle">Deliver polished demos with live resource insights and AI accelerators.</p>
            </div>
          </div>
          <div className="header-actions">
            <a
              className="ghost-button"
              href="https://demodashboard-68zxune6c-pat-simmons-projects.vercel.app/api/health"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Playbook
            </a>
            <a
              className="primary-button"
              href="https://td3049589.app.netsuite.com/app/login/secure/enterpriselogin.nl?c=TD2892895"
              target="_blank"
              rel="noopener noreferrer"
            >
              Launch NetSuite
            </a>
          </div>
        </div>

        {/* Account Switcher */}
        <div className="header-accounts">
          <p className="section-label">Active Demo Account</p>
          <AccountSwitcher />
        </div>

        {/* Tab Navigation */}
        <div className="dashboard-tabs">
          <button
            onClick={() => setActiveTab('context')}
            className={`dashboard-tab ${activeTab === 'context' ? 'is-active' : ''}`}
          >
            <User size={18} />
            Customer Context
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`dashboard-tab ${activeTab === 'prompts' ? 'is-active' : ''}`}
          >
            <BookOpen size={18} />
            Demo Prompts ({favorites.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`dashboard-tab ${activeTab === 'analytics' ? 'is-active' : ''}`}
          >
            <BarChart3 size={18} />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`dashboard-tab ${activeTab === 'export' ? 'is-active' : ''}`}
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        <FlowGuide />
        <ClipboardDock />
        {activeTab === 'context' && <CustomerContextPanel />}
        {activeTab === 'prompts' && (
          <div>
            {/* Enhanced Search */}
            <AdvancedSearch
              onFiltersChange={(filters) => console.log('Filters changed:', filters)}
              className="mb-6"
            />
            <PromptLibrary />
          </div>
        )}
        {activeTab === 'analytics' && (
          <DataVisualization 
            className="space-y-6"
            data={analyticsData}
          />
        )}
        {activeTab === 'export' && (
          <div className="space-y-6">
            <div className="bg-white/95 rounded-3xl border border-[#e0e7f4] p-6 shadow-[0_20px_50px_rgba(3,21,43,0.08)]">
              <h3 className="text-lg font-semibold text-[#0f1f33] mb-4 flex items-center">
                <Download className="w-5 h-5 mr-2 text-[#00a6d3]" />
                Data Export
              </h3>
              <p className="text-[#5c667c] mb-6">
                Export NetSuite data you’ve synced from the Customer Context tab. Run “Sync NetSuite Data” on a prospect, then choose your format here.
              </p>
              <DataExport
                data={netsuiteExportData}
                onExportComplete={(success, filename) => {
                  if (success) {
                    setActionStatus({
                      type: 'success',
                      message: `Export completed: ${filename}`
                    });
                  } else {
                    setActionStatus({
                      type: 'error',
                      message: 'Export failed. Please try again.'
                    });
                  }
                  setTimeout(() => setActionStatus(null), 5000);
                }}
              />
            </div>
            
            {/* Export History */}
            <div className="bg-white/95 rounded-3xl border border-[#e0e7f4] p-6 shadow-[0_20px_50px_rgba(3,21,43,0.06)]">
              <h4 className="text-md font-semibold text-[#0f1f33] mb-4">Export Statistics</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-2xl p-4 border border-[#dbe7ff] bg-gradient-to-br from-[#ecf4ff] to-[#f4f8ff]">
                  <div className="text-2xl font-bold text-[#0d3d7a]">{netsuiteExportData.length}</div>
                  <div className="text-sm text-[#31527a]">Synced Records</div>
                </div>
                <div className="rounded-2xl p-4 border border-[#cfeee1] bg-gradient-to-br from-[#e6fbf4] to-[#f1fdf8]">
                  <div className="text-2xl font-bold text-[#11996b]">
                    {netsuiteExportData.filter(c => c.account === 'services').length}
                  </div>
                  <div className="text-sm text-[#1f6c52]">Services Account</div>
                </div>
                <div className="rounded-2xl p-4 border border-[#dfd8ff] bg-gradient-to-br from-[#f1eaff] to-[#f8f4ff]">
                  <div className="text-2xl font-bold text-[#5c3df0]">
                    {new Set(netsuiteExportData.map(c => c.industry)).size}
                  </div>
                  <div className="text-sm text-[#4a3bb2]">Industries</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Scenario Generator Modal */}
      {showScenarioGenerator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <ScenarioGenerator
            onScenarioGenerated={handleScenarioGenerated}
            onClose={() => setShowScenarioGenerator(false)}
          />
        </div>
      )}
    </div>
  );
}
