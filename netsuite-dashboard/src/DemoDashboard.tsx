import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Menu, X, Building2, Check, BookOpen, ChevronDown, ChevronRight, Zap, Target, Users, Clock, FileText, TrendingUp, Loader, Wand2, BarChart3, Download, ListChecks, AlertTriangle, Info } from 'lucide-react';  // Import all needed icons
import ScenarioGenerator from './ScenarioGenerator';
import DataVisualization from './DataVisualization';
import AdvancedSearch from './AdvancedSearch';
import DataExport from './DataExport';
import storageService from './storage-service';

const KEY_PROSPECTS = [
  { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'Hot', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161 },
  { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'Active', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834 },
  { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'Active', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938 },
  { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy', size: '100-150', status: 'Proposal', demoDate: 'Pending', focus: ['Pipeline Management', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662 },
  { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'Qualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938 },
  { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'Active', demoDate: 'Nov 20', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285 },
  { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'Active', demoDate: 'Nov 25', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938 },
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

type ToastMessage = { id: string; message: string; type: 'success' | 'error' | 'info' };

interface SearchFilters {
  query: string;
  status?: string;
}

export default function DemoDashboard() {
  // State management
  const [activeTab, setActiveTab] = useState('context');
  const [selectedAccount, setSelectedAccount] = useState('services');
  const [analyticsData] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [demoNotes, setDemoNotes] = useState<{[key: number]: string}>({});
  const [netsuiteSyncEnabled, setNetsuiteSyncEnabled] = useState<boolean>(true);
  const [syncLoading, setSyncLoading] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [customFieldsData, setCustomFieldsData] = useState<{[key: number]: any}>({});
  const [actionStatus, setActionStatus] = useState<string | {type: string, message: string} | null>(null);
  const [nsData, setNsData] = useState<any>({});
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

  // Data sources
  useEffect(() => {
    const saved = storageService.getProspects();
    if (saved.length) {
      setDynamicCustomers(saved);
    }
  }, []);

  useEffect(() => {
    storageService.saveProspects(dynamicCustomers);
  }, [dynamicCustomers]);

  useEffect(() => {
    const pref = storageService.getPreferences().theme;
    setTheme(pref === 'light' ? 'light' : 'dark');
  }, []);

  useEffect(() => {
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(theme === 'light' ? 'theme-light' : 'theme-dark');
    storageService.setPreferences({ theme });
  }, [theme]);

  // Global search & filtering
  const allCustomers = useMemo(() => {
    return [...KEY_PROSPECTS, ...dynamicCustomers];
  }, [dynamicCustomers]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((cust: any) => {
      const matchesGlobalSearch =
        cust.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        cust.industry.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        cust.entityid.toLowerCase().includes(globalSearchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || cust.status === statusFilter;
      return matchesGlobalSearch && matchesStatus;
    });
  }, [globalSearchQuery, allCustomers, statusFilter]);

  // Filter prompts for prompts tab
  const filteredPrompts = useMemo(() => {
    if (!promptSearch) return PROMPT_CATEGORIES;
    return PROMPT_CATEGORIES.map((cat: any) => ({
      ...cat,
      prompts: cat.prompts.filter((p: string) => p.toLowerCase().includes(promptSearch.toLowerCase()))
    })).filter((cat: any) => cat.prompts.length > 0);
  }, [promptSearch]);

  const netsuiteExportData = useMemo(() => {
    return Object.entries(nsData).map(([custId, recordData]: [string, any]) => {
      const numericId = Number(custId);
      const customer = allCustomers.find((c: any) => c.id === numericId);
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
    return allCustomers.reduce((acc: Record<string, number>, cust: any) => {
      acc[cust.status] = (acc[cust.status] || 0) + 1;
      return acc;
    }, {});
  }, [allCustomers]);

  const currentAccount = accounts.find((a: any) => a.id === selectedAccount);
  const selectedCustData = allCustomers.find((c: any) => c.id === selectedCustomer);

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

  // Helper functions
  const handleScenarioGenerated = useCallback((newScenario: any) => {
    // Add the new AI-generated scenario to the dynamic customers list
    setDynamicCustomers((prev: any) => [newScenario, ...prev]);

    // Auto-select the new scenario
    setSelectedCustomer(newScenario.id);

    // Show success message
    setActionStatus({
      type: 'success',
      message: `AI scenario "${newScenario.name}" generated successfully!`
    });

    // Clear success message after 5 seconds
    setTimeout(() => setActionStatus(null), 5000);
  }, []);

  const pushToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev: any) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev: any) => prev.filter((toast: any) => toast.id !== id));
    }, 3200);
  }, []);

  const copyToClipboard = useCallback((text: string, index: string, label: string = 'Copied') => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setClipboardHistory((prev: any) => {
      const entry = { id: `${index}-${Date.now()}`, label, text, timestamp: new Date() };
      return [entry, ...prev].slice(0, 6);
    });
  }, []);

  const toggleFavorite = (prompt: string) => {
    setFavorites((prev: string[]) =>
      prev.includes(prompt) ? prev.filter((p: string) => p !== prompt) : [...prev, prompt]
    );
  };

  const syncNetsuiteFields = async () => {
    if (!selectedCustData) return;
    setSyncLoading(true);
    setActionStatus('Syncing from NetSuite...');

    try {
      // Simulate API call or use actual NetSuite API integration
      const mockNsResponse = {
        id: selectedCustData.nsId,
        companyname: selectedCustData.name,
        custentity13: `AI Summary for ${selectedCustData.name}: Generated on ${new Date().toLocaleDateString()}. Key focus: ${selectedCustData.focus.join(', ')}. Revenue projection: ${selectedCustData.budget}.`,
        custentity16: selectedCustData.industry,
        custentity15: selectedCustData.size,
        email: selectedCustData.email || `contact@${selectedCustData.entityid.toLowerCase()}.com`,
        phone: selectedCustData.phone || '(555) 123-4567'
      };

      const syncTimestamp = new Date();

      setCustomFieldsData((prev: any) => ({
        ...prev,
        [selectedCustData.id]: {
          'AI Generated Summary': mockNsResponse.custentity13,
          'Industry Type': mockNsResponse.custentity16,
          'Annual Revenue': selectedCustData.budget,
          'Employee Count': mockNsResponse.custentity15,
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
      setSyncHistory((prev: any) => ({
        ...prev,
        [selectedCustData.id]: syncTimestamp
      }));
      setLastSyncTime(syncTimestamp);
      setActionStatus('✓ Synced successfully');
      pushToast('NetSuite data synced', 'success');
    } catch (error) {
      setActionStatus('⚠ Sync failed - check console');
      pushToast('Sync failed - check settings', 'error');
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
      action: syncNetsuiteFields
    }
  ];

  // Component: Global Search
  const GlobalSearch = () => (
    <div className="global-search mb-6">
      <AdvancedSearch
        onFiltersChange={(filters: SearchFilters) => {
          setGlobalSearchQuery(filters.query);
          if (filters.status) setStatusFilter(filters.status);
        }}
        className="w-full"
        showAdvancedFilters={true}
      />
    </div>
  );

  // Component: Quick Create Form
  const QuickCreateForm = () => (
    <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Quick prospect">
      <div className="quick-create-modal bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="quick-create-hero p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Quick Prospect</h3>
            <button onClick={() => setShowQuickCreate(false)} aria-label="Close quick prospect" className="text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="quick-create-grid grid grid-cols-1 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Name</span>
              <input
                value={quickProspect.name}
                onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Horizon Labs"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Industry</span>
              <input
                value={quickProspect.industry}
                onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, industry: e.target.value }))}
                placeholder="Industry"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Status</span>
              <select
                value={quickProspect.status}
                onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Hot">Hot</option>
                <option value="Active">Active</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal">Proposal</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Company Size</span>
              <input
                value={quickProspect.size}
                onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, size: e.target.value }))}
                placeholder="100-200"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Budget</span>
              <input
                value={quickProspect.budget}
                onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, budget: e.target.value }))}
                placeholder="$150K+"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">NS Internal ID (optional)</span>
              <input
                value={quickProspect.nsId}
                onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, nsId: e.target.value }))}
                placeholder="3161"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700 mb-1 block">Focus Areas (comma separated)</span>
              <input
                value={quickProspect.focusText}
                onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, focusText: e.target.value }))}
                placeholder="Resource Planning, Billing Automation"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
          </div>
          <div className="focus-preview flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
            {quickProspect.focusText
              .split(',')
              .map((item: string) => item.trim())
              .filter(Boolean)
              .map((chip: string, idx: number) => (
                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                  {chip}
                </span>
              ))}
          </div>
          <div className="quick-create-actions flex gap-3 pt-4">
            <button
              className="flex-1 bg-gray-300 text-gray-700 rounded-lg py-2 px-4 hover:bg-gray-400 transition-colors"
              onClick={() => {
                setShowQuickCreate(false);
                const nowId = Date.now();
                const focusList = quickProspect.focusText
                  .split(',')
                  .map((item: string) => item.trim())
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
                setDynamicCustomers((prev: any) => [newProspect, ...prev]);
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
                setSelectedCustomer(newProspect.id);
                pushToast('Prospect saved to workspace', 'success');
              }}
            >
              Save Prospect
            </button>
            <button
              className="flex-1 bg-red-600 text-white rounded-lg py-2 px-4 hover:bg-red-700 transition-colors"
              onClick={() => setShowQuickCreate(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Component: Toast Stack
  const ToastStack = () => (
    <div className="toast-stack fixed top-4 right-4 space-y-2 z-50" aria-live="polite">
      {toasts.map((toast: ToastMessage) => (
        <div key={toast.id} className={`toast toast--${toast.type} p-4 rounded-lg shadow-lg max-w-sm`}>
          <span className="text-sm">{toast.message}</span>
        </div>
      ))}
    </div>
  );

  // Component: Account Switcher
  const AccountSwitcher = () => (
    <div className="account-switcher">
      {accounts.map((account: any) => (
        <button
          key={account.id}
          onClick={() => setSelectedAccount(account.id)}
          className={`switcher-pill ${selectedAccount === account.id ? 'is-active' : ''} px-3 py-2 rounded-full border shadow-sm flex items-center gap-1`}
        >
          <Building2 size={16} />
          <span className="hidden sm:inline">{account.name}</span>
          {account.id === selectedAccount && <Check size={16} />}
        </button>
      ))}
    </div>
  );

  // Component: Summary Highlights
  const SummaryHighlights = () => (
    <div className="summary-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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

  // Component: Customer Context Panel
  const CustomerContextPanel = () => (
    <div className="customer-context">
      <SummaryHighlights />
      <div className="customer-layout grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="quick-actions-panel lg:col-span-1">
          <div className="panel-header flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold">Quick Actions</h4>
          </div>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const isLoading = syncLoading && action.id === 'sync-netsuite';
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={isLoading}
                  className={`quick-actions-panel__button ${isLoading ? 'is-loading' : ''} w-full p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow`}
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

        {/* Customer Details */}
        <div className="context-panel lg:col-span-2">
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
                ].map((info: any) => (
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

              {/* Quick Notes - Fixed to prevent jump */}
              <div className="detail-card note-card bg-white rounded-xl p-4 border shadow-sm">
                <p className="section-label text-sm font-semibold text-gray-700 mb-3">Quick Notes</p>
                <div className="relative">
                  <textarea
                    value={demoNotes[selectedCustData.id] || ''}
                    onChange={(e) => setDemoNotes({...demoNotes, [selectedCustData.id]: e.target.value})}
                    placeholder="Add demo notes, pain points, or follow-up items..."
                    className="w-full min-h-[96px] p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base leading-relaxed"
                    rows={3}
                    style={{ height: '96px' }}  // Fixed height to prevent layout jump
                  />
                </div>
              </div>

              {/* NetSuite Link */}
              <div className="primary-link-group">
                <a
                  href={`https://${currentAccount?.instance}.app.netsuite.com/app/common/entity/customer.nl?id=${selectedCustData.nsId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="primary-link flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full"
                >
                  <Target size={16} />
                  Open in NetSuite
                  <ChevronRight size={16} />
                </a>
                <a
                  href="https://td3049589.app.netsuite.com/app/login/secure/enterpriselogin.nl?c=TD2892895"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="secondary-link flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors w-full"
                >
                  Sign In Again
                </a>
              </div>
            </>
          ) : (
            <div className="panel-empty flex flex-col items-center justify-center py-12 text-center">
              <Users size={48} className="text-gray-400 mb-4" />
              <p className="text-gray-500">Select a prospect to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Component: Prompt Library
  const PromptLibrary = () => (
    <div className="prompt-library">
      {/* Quick Actions */}
      <div className="prompt-toolbar flex flex-col sm:flex-row gap-4 mb-6">
        <div className="prompt-search flex-1">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search scenarios, prompts, or industries"
            value={promptSearch}
            onChange={(e) => setPromptSearch(e.target.value)}
            className="prompt-search__input flex-1 ml-2"
          />
        </div>
        <button
          onClick={() => setShowQuickCreate(true)}
          className="panel-button"
        >
          <Plus size={16} />
          Quick Add Prospect
        </button>
      </div>

      <div className="prompt-accordion">
        {filteredPrompts.map((category: any, catIdx: number) => (
          <div key={catIdx} className="prompt-card bg-white rounded-xl border shadow-sm overflow-hidden">
            <button
              onClick={() => setExpandedCategory(expandedCategory === catIdx ? null : catIdx)}
              className="prompt-card__header w-full text-left p-4 border-b hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <BookOpen size={18} className="text-[#00a6d3]" />
                {category.name}
              </span>
              <ChevronDown size={18} className={`transition-transform ml-auto ${expandedCategory === catIdx ? 'rotate-180' : ''}`} />
            </button>

            {expandedCategory === catIdx && (
              <div className="prompt-card__body p-4 space-y-3">
                {category.prompts.map((prompt: string, promptIdx: number) => {
                  const globalIdx = catIdx * 100 + promptIdx;
                  const isFav = favorites.includes(prompt);

                  return (
                    <div key={promptIdx} className="prompt-item p-3 bg-gray-50 rounded-lg border">
                      <p className="text-sm text-gray-700 mb-2">{prompt}</p>
                      <div className="prompt-item__actions flex gap-2 justify-end">
                        <button
                          onClick={() => copyToClipboard(prompt, `${globalIdx}`, 'Prompt copied')}
                          className="prompt-copy flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors text-sm"
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
                          className={`prompt-favorite ${isFav ? 'is-favorite' : ''} flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors text-sm`}
                        >
                          {isFav ? '★' : '☆'}
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

  // Component: Analytics Panel
  const AnalyticsPanel = () => (
    <div className="analytics-panel">
      <div className="analytics-header flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Analytics Dashboard</h3>
        <div className="text-xs text-gray-500">
          Last sync: {formattedLastSync || 'No sync yet'}
        </div>
      </div>
      <DataVisualization 
        className="space-y-6"
        data={analyticsData}
      />
    </div>
  );

  // Component: Export Panel
  const ExportPanel = () => (
    <div className="export-panel">
      <div className="bg-white/95 rounded-3xl border border-[#e0e7f4] p-6 shadow-[0_20px_50px_rgba(3,21,43,0.08)]">
        <h3 className="text-lg font-semibold text-[#0f1f33] mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2 text-[#00a6d3]" />
          Data Export
        </h3>
        <p className="text-[#5c667c] mb-6">
          Export NetSuite data you've synced from the Customer Context tab. Run "Sync NetSuite Data" on a prospect, then choose your format here.
        </p>
        <DataExport
          data={netsuiteExportData}
          onExportComplete={(success: boolean, filename: string) => {
            if (success) {
              setActionStatus({
                type: 'success',
                message: `Export completed: ${filename}`
              });
              pushToast(`Export completed: ${filename}`, 'success');
            } else {
              setActionStatus({
                type: 'error',
                message: 'Export failed. Please try again.'
              });
              pushToast('Export failed. Please try again.', 'error');
            }
            setTimeout(() => setActionStatus(null), 5000);
          }}
        />
      </div>

      {/* Export Statistics */}
      <div className="export-stats grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="rounded-2xl p-4 border border-[#dbe7ff] bg-gradient-to-br from-[#ecf4ff] to-[#f4f8ff]">
          <div className="text-2xl font-bold text-[#0d3d7a]">{netsuiteExportData.length}</div>
          <div className="text-sm text-[#31527a]">Synced Records</div>
        </div>
        <div className="rounded-2xl p-4 border border-[#cfeee1] bg-gradient-to-br from-[#e6fbf4] to-[#f1fdf8]">
          <div className="text-2xl font-bold text-[#11996b]">
            {netsuiteExportData.filter((c: any) => c.account === 'services').length}
          </div>
          <div className="text-sm text-[#1f6c52]">Services Account</div>
        </div>
        <div className="rounded-2xl p-4 border border-[#dfd8ff] bg-gradient-to-br from-[#f1eaff] to-[#f8f4ff]">
          <div className="text-2xl font-bold text-[#5c3df0]">
            {new Set(netsuiteExportData.map((c: any) => c.industry)).size}
          </div>
          <div className="text-sm text-[#4a3bb2]">Industries</div>
        </div>
      </div>
    </div>
  );

  // Component: Demo Checklist
  const DemoChecklist = () => (
    <div className="checklist-panel">
      <div className="checklist-header">
        <ListChecks size={18} />
        <p>Guided Demo Checklist</p>
      </div>
      <div className="checklist-list">
        {checklistState.map((item: any) => (
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

  // Component: Custom Fields Panel
  const CustomFieldsPanel = () => {
    const fields = selectedCustData?.id ? customFieldsData[selectedCustData.id] : undefined;

    if (syncLoading) {
      return (
        <div className="skeleton-grid">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="skeleton-box" />
          ))}
        </div>
      );
    }

    if (!fields) {
      return (
        <div className="bg-gradient-to-br from-[#e3f3ff] to-[#f1f7ff] rounded-2xl border border-[#c7dffc] p-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={18} className="text-[#0f7cc5] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-[#0b2036]">NetSuite Custom Fields</p>
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
          <div key={key} className="bg-white rounded-2xl border p-3 shadow-sm">
            <p className="text-xs text-[#738097] font-semibold uppercase tracking-wide">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
            <p className="text-sm font-semibold text-[#0b2036] mt-1 line-clamp-2">{String(value)}</p>
          </div>
        ))}
      </div>
    );
  };

  // Render
  return (
    <div className={`dashboard-shell ${theme === 'light' ? 'is-light' : 'is-dark'}`}>
      {/* Header */}
      <div className={`dashboard-header ${theme === 'light' ? 'is-light' : ''}`}>
        <div className="dashboard-header__inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="header-main flex items-start lg:items-center gap-4">
              <div className="header-icon">
                <Zap size={26} />
              </div>
              <div>
                <p className="header-eyebrow">NetSuite Resource Planner</p>
                <h1 className="header-title">Demo Master Dashboard</h1>
                <p className="header-subtitle">Streamline your NetSuite demos with AI-powered scenarios and real-time data sync.</p>
              </div>
            </div>
            <div className="header-actions flex flex-col sm:flex-row gap-2">
              <AccountSwitcher />
              <button
                className="ghost-button px-3 py-2 text-sm"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden ml-auto mb-4"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Account Switcher - Responsive */}
          <div className={`header-accounts ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}>
            <AccountSwitcher />
          </div>

          {/* Tab Navigation - Responsive */}
          <div className="dashboard-tabs flex flex-col sm:flex-row overflow-x-auto lg:overflow-visible gap-2 lg:gap-0">
            {[
              { tab: 'context', label: 'Customer Context', icon: User },
              { tab: 'prompts', label: 'Demo Prompts', icon: BookOpen },
              { tab: 'analytics', label: 'Analytics', icon: BarChart3 },
              { tab: 'export', label: 'Export', icon: Download }
            ].map(({ tab, label, icon: Icon }) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setIsMobileMenuOpen(false); // Close mobile menu
                }}
                className={`dashboard-tab flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === tab ? 'is-active bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <Icon size={18} />
                <span className="hidden sm:inline">{label}</span>
                {activeTab === tab && <Check size={16} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Global Search - Hidden on mobile, shown on desktop */}
        {activeTab !== 'context' && <GlobalSearch />}

        {/* Tab Content */}
        {activeTab === 'context' && <CustomerContextPanel />}
        {activeTab === 'prompts' && (
          <div className="space-y-6">
            <AdvancedSearch
              onFiltersChange={(filters: SearchFilters) => setPromptSearch(filters.query)} // Local search for prompts
              className="w-full"
            />
            <PromptLibrary />
          </div>
        )}
        {activeTab === 'analytics' && <AnalyticsPanel />}
        {activeTab === 'export' && <ExportPanel />}

        {/* Quick Create Modal */}
        {showQuickCreate && <QuickCreateForm />}

        {/* Toast Notifications */}
        <ToastStack />
      </div>
    </div>
  );
}
