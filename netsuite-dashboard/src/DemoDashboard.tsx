import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, Menu, X, Building2, Check, BookOpen, ChevronDown, ChevronRight, Zap, Target, Users, Clock, FileText, TrendingUp, Loader, BarChart3, Download, ListChecks, AlertCircle, Plus, Copy, User, Wand2 } from 'lucide-react';  // Import all needed icons
import ScenarioGenerator from './ScenarioGenerator';
import DataVisualization from './DataVisualization';
import AdvancedSearch from './AdvancedSearch';
import DataExport from './DataExport';
import storageService from './storage-service';

const KEY_PROSPECTS = [
  { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'Hot', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161, website: 'https://advisorhr.com' },
  { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'Active', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834, website: 'https://gsbgroup.com' },
  { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'Active', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938, website: 'https://innovatia.tech' },
  { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy', size: '100-150', status: 'Proposal', demoDate: 'Pending', focus: ['Pipeline Management', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662, website: 'https://marabou-midstream.com' },
  { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'Qualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938, website: 'https://lovse.com' },
  { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'Active', demoDate: 'Nov 20', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285, website: 'https://nfront.com' },
  { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'Active', demoDate: 'Nov 25', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938, website: 'https://formativegroup.com' },
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

const DASHBOARD_TABS = [
  { id: 'context', label: 'Customer Context', icon: User },
  { id: 'prompts', label: 'Demo Prompts', icon: BookOpen },
  { id: 'demo-builder', label: 'Demo Builder', icon: Zap },
  { id: 'export', label: 'Export', icon: Download }
] as const;

const PREP_FOCUS_POINTS = [
  {
    id: 'intake',
    title: 'Discovery Intake',
    description: 'Capture entities, industries, pain points, and demo focus areas for every prospect.'
  },
  {
    id: 'generation',
    title: 'AI Scenario Builder',
    description: 'Generate NetSuite prompts, SuiteQL, and demo scripts in seconds with the AI builder.'
  },
  {
    id: 'execution',
    title: 'Run & Share',
    description: 'Push data into NetSuite, sync records, and export talk tracks or dashboards for handoff.'
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
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [demoNotes, setDemoNotes] = useState<{[key: number]: string}>({});
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
    demoDate: 'TBD',
    website: ''
  });

  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showClipboardPanel, setShowClipboardPanel] = useState(true);

  const accounts = [
    { id: 'services', name: 'Services', instance: 'td3049589' },
    { id: 'demo', name: 'Demo Sandbox', instance: 'td3049589' }
  ];

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

  const lastSyncDisplay = useMemo(() => {
    const activeSync = selectedCustData ? syncHistory[selectedCustData.id] : lastSyncTime;
    if (!activeSync) return 'Not synced yet';
    return activeSync.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, [lastSyncTime, selectedCustData, syncHistory]);

  const prepWorkflow = useMemo(() => {
    const hasProspect = Boolean(selectedCustomer);
    const hasSyncedFields = selectedCustData ? Boolean(customFieldsData[selectedCustData.id]) : false;
    const hasGeneratedScenario = dynamicCustomers.some((cust: any) => cust.aiGenerated);
    const hasCopiedPrompt = clipboardHistory.length > 0;
    const hasExport = netsuiteExportData.length > 0;

    return [
      {
        id: 'prospect',
        title: 'Capture Discovery',
        description: 'Add a prospect with industry, size, and focus areas.',
        done: hasProspect
      },
      {
        id: 'sync',
        title: 'Sync NetSuite',
        description: 'Pull NetSuite data or AI summaries for context.',
        done: hasSyncedFields
      },
      {
        id: 'generate',
        title: 'Generate Scenario',
        description: 'Build AI-driven prompts & prep assets.',
        done: hasGeneratedScenario
      },
      {
        id: 'share',
        title: 'Share Assets',
        description: 'Copy prompts or export SuiteQL/talk tracks.',
        done: hasCopiedPrompt || hasExport
      }
    ];
  }, [selectedCustomer, selectedCustData, customFieldsData, dynamicCustomers, clipboardHistory, netsuiteExportData]);

  const completedPrepSteps = prepWorkflow.filter((step) => step.done).length;
  const prepCompletion = Math.round((completedPrepSteps / prepWorkflow.length) * 100);
  const nextPrepStep = prepWorkflow.find((step) => !step.done);

  const nextPrepAction = (() => {
    if (!selectedCustomer) {
      return {
        label: 'Add Prospect',
        description: 'Capture discovery data to anchor the rest of the workflow.',
        action: () => setShowQuickCreate(true)
      };
    }

    if (selectedCustData && !customFieldsData[selectedCustData.id]) {
      return {
        label: 'Sync NetSuite Data',
        description: 'Pull context fields and summaries for this account.',
        action: () => syncNetsuiteFields()
      };
    }

    if (!clipboardHistory.length) {
      return {
        label: 'Copy Demo Prompt',
        description: 'Hop into Demo Prompts to seed SuiteQL or data creation.',
        action: () => setActiveTab('prompts')
      };
    }

    if (!netsuiteExportData.length) {
      return {
        label: 'Export Assets',
        description: 'Download SuiteQL, talk tracks, or sync logs to share.',
        action: () => setActiveTab('export')
      };
    }

    return {
      label: 'Open Demo Builder',
      description: 'Fine-tune prompts & generate scenario collateral.',
      action: () => setActiveTab('demo-builder')
    };
  })();

  // Helper functions
  const handleScenarioGenerated = useCallback((newScenario: any) => {
    // Add the new AI-generated scenario to the dynamic customers list
    setDynamicCustomers((prev: any) => [newScenario, ...prev]);

    // Auto-select the new scenario
    setSelectedCustomer(newScenario.id);

    // close AI builder sheet if open
    setShowScenarioGenerator(false);

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
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedIndex(index);
        setClipboardHistory((prev: any) => {
          const entry = { id: `${index}-${Date.now()}`, label, text, timestamp: new Date() };
          return [entry, ...prev].slice(0, 10);
        });
        setTimeout(() => setCopiedIndex(null), 2000);
        pushToast('✓ Copied to clipboard', 'success');
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        pushToast('Failed to copy to clipboard', 'error');
      });
  }, [pushToast]);

  const toggleFavorite = useCallback((prompt: string) => {
    setFavorites((prev: string[]) =>
      prev.includes(prompt) ? prev.filter((p: string) => p !== prompt) : [...prev, prompt]
    );
  }, []);

  const syncNetsuiteFields = useCallback(async () => {
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
  }, [selectedCustData, selectedAccount, pushToast]);

  const quickActions = useMemo(() => [
    {
      id: 'create-project',
      label: 'Create Demo Project',
      icon: Plus,
      action: () => {
        if (!selectedCustData) return;
        const prompt = `Create a project for ${selectedCustData.name} titled "[Demo Project Name]" with entity ID [PRJ-DEMO-####]. Add 3-5 task estimates for typical ${selectedCustData.industry} workflows.`;
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
        if (!selectedCustData) return;
        const prompt = `Create 10 approved time entries for the demo project for ${selectedCustData.name} across 3 different team members. Include billable hours, task assignments, and realistic dates spread across ${new Date().getFullYear()}.`;
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
        if (!selectedCustData) return;
        const prompt = `Create an estimate for ${selectedCustData.name} from the demo project. Include line items for: Professional Services (60%), Travel & Expenses (20%), Software Licensing (20%). Set total value to ${selectedCustData.budget?.split('-')[0]}.`;
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
        if (!selectedCustData) return;
        const prompt = `Create resource allocation forecast for ${selectedCustData.name} demo project with these roles: ${selectedCustData.focus.join(', ')}. Include 10-15 team members with varied utilization rates (60-100%) across 12 weeks.`;
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
  ], [selectedCustData, copyToClipboard, syncNetsuiteFields]);

  // Component: Global Search
  const GlobalSearch = React.memo(() => (
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
  ));

  // Component: Quick Create Form
  const QuickCreateForm = () => {
    const isFormValid = quickProspect.name.trim() && quickProspect.industry.trim();

    return (
      <div className="modal-backdrop fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label="Quick prospect">
        <div className="quick-create-modal bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="quick-create-hero p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-white">Create New Prospect</h3>
                <p className="text-blue-100 text-sm mt-1">Add a custom demo scenario to your workspace</p>
              </div>
              <button
                onClick={() => setShowQuickCreate(false)}
                aria-label="Close quick prospect"
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
          </div>
          <div className="p-6 space-y-5">
            {/* Required Fields Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <AlertCircle size={16} />
                Required Information
              </h4>
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-1">
                    Company Name <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={quickProspect.name}
                    onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Horizon Labs, TechCorp Solutions"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-gray-700 mb-1.5 block flex items-center gap-1">
                    Industry <span className="text-red-500">*</span>
                  </span>
                  <input
                    value={quickProspect.industry}
                    onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, industry: e.target.value }))}
                    placeholder="e.g., Professional Services, Tech Consulting"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </label>
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Status</span>
                <select
                  value={quickProspect.status}
                  onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="Hot">🔥 Hot</option>
                  <option value="Active">✅ Active</option>
                  <option value="Qualified">⭐ Qualified</option>
                  <option value="Proposal">📋 Proposal</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Company Size</span>
                <input
                  value={quickProspect.size}
                  onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, size: e.target.value }))}
                  placeholder="e.g., 100-200"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Budget Range</span>
                <input
                  value={quickProspect.budget}
                  onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, budget: e.target.value }))}
                  placeholder="e.g., $150K-$300K"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </label>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-1.5 block">NetSuite ID (optional)</span>
                <input
                  value={quickProspect.nsId}
                  onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, nsId: e.target.value }))}
                  placeholder="e.g., 3161"
                  type="number"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </label>
            </div>

            {/* Website URL */}
            <div>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Company Website</span>
                <input
                  type="url"
                  value={quickProspect.website}
                  onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://company-website.com"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Used for generating tailored demo scenarios in Demo Builder</p>
              </label>
            </div>

            {/* Focus Areas */}
            <div>
              <label className="block">
                <span className="text-sm font-semibold text-gray-700 mb-1.5 block">Demo Focus Areas</span>
                <input
                  value={quickProspect.focusText}
                  onChange={(e) => setQuickProspect((prev: any) => ({ ...prev, focusText: e.target.value }))}
                  placeholder="Resource Planning, Billing Automation, Multi-Entity"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple areas with commas</p>
              </label>
            </div>
            {/* Focus Areas Preview */}
            {quickProspect.focusText.trim() && (
              <div className="bg-gradient-to-br from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Focus Areas Preview:</p>
                <div className="flex flex-wrap gap-2">
                  {quickProspect.focusText
                    .split(',')
                    .map((item: string) => item.trim())
                    .filter(Boolean)
                    .map((chip: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-sm rounded-full font-medium shadow-sm">
                        {chip}
                      </span>
                    ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2 border-t">
              <button
                disabled={!isFormValid}
                className={`flex-1 rounded-lg py-3 px-6 font-semibold transition-all shadow-sm ${
                  isFormValid
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:shadow-md'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (!isFormValid) return;
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
                    nsId: quickProspect.nsId ? Number(quickProspect.nsId) : Math.floor(Math.random() * 4000) + 2000,
                    website: quickProspect.website || ''
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
                    demoDate: 'TBD',
                    website: ''
                  });
                  setSelectedCustomer(newProspect.id);
                  pushToast(`✓ ${newProspect.name} added to workspace`, 'success');
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Check size={18} />
                  Create Prospect
                </div>
              </button>
              <button
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                onClick={() => setShowQuickCreate(false)}
              >
                Cancel
              </button>
            </div>

            {!isFormValid && (
              <p className="text-xs text-red-600 text-center -mt-2">
                Please fill in all required fields (marked with *)
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const ScenarioGeneratorModal = () => {
    if (!showScenarioGenerator) {
      return null;
    }

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 bg-slate-900/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="AI scenario generator"
      >
        <div
          className="absolute inset-0"
          aria-hidden="true"
          onClick={() => setShowScenarioGenerator(false)}
        />
        <div className="relative z-10 w-full max-w-2xl">
          <ScenarioGenerator
            onScenarioGenerated={handleScenarioGenerated}
            onClose={() => setShowScenarioGenerator(false)}
          />
        </div>
      </div>
    );
  };

  // Component: Toast Stack
  const ToastStack = React.memo(() => (
    <div className="toast-stack fixed top-4 right-4 space-y-2 z-50" aria-live="polite">
      {toasts.map((toast: ToastMessage) => (
        <div key={toast.id} className={`toast toast--${toast.type} p-4 rounded-lg shadow-lg max-w-sm`}>
          <span className="text-sm">{toast.message}</span>
        </div>
      ))}
    </div>
  ));

  // Component: Clipboard History Panel
  const ClipboardHistoryPanel = () => (
    <div className={`clipboard-panel fixed right-0 top-0 h-full bg-white border-l-2 border-blue-200 shadow-2xl transition-transform duration-300 z-40 ${showClipboardPanel ? 'translate-x-0' : 'translate-x-full'}`} style={{ width: '420px' }}>
      {/* Header */}
      <div className="clipboard-header sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 border-b border-blue-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Copy size={20} />
            <h3 className="text-lg font-bold">Clipboard History</h3>
          </div>
          <button
            onClick={() => setShowClipboardPanel(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close clipboard panel"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-blue-100 text-xs">Recently copied prompts and text</p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-blue-200">{clipboardHistory.length} items</span>
          {clipboardHistory.length > 0 && (
            <button
              onClick={() => setClipboardHistory([])}
              className="text-blue-100 hover:text-white text-xs underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Clipboard Items */}
      <div className="clipboard-content overflow-y-auto" style={{ height: 'calc(100vh - 140px)' }}>
        {clipboardHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Copy size={32} className="text-gray-400" />
            </div>
            <h4 className="text-gray-700 font-semibold mb-2">No items yet</h4>
            <p className="text-gray-500 text-sm">
              Copied prompts will appear here
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {clipboardHistory.map((item: any, idx: number) => (
              <div
                key={item.id}
                className="clipboard-item bg-gradient-to-br from-gray-50 to-blue-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </div>
                    <span className="text-xs font-semibold text-blue-700">{item.label}</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Item Content */}
                <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
                    {item.text}
                  </p>
                </div>

                {/* Item Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(item.text);
                      pushToast('✓ Re-copied to clipboard', 'success');
                    }}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-xs font-medium"
                  >
                    <Copy size={14} />
                    Copy Again
                  </button>
                  <button
                    onClick={() => {
                      setClipboardHistory((prev: any) => prev.filter((i: any) => i.id !== item.id));
                    }}
                    className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-xs"
                    aria-label="Remove item"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Component: Account Switcher
  const AccountSwitcher = React.memo(() => (
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
  ));

  const PrepMissionBanner = React.memo(() => {
    const missionAccount = selectedCustData?.name || 'your next prospect';
    const nextStepLabel = nextPrepStep ? nextPrepStep.title : 'Ready to share assets';

    return (
      <div className="prep-mission">
        <div className="prep-mission__main">
          <p className="prep-mission__eyebrow">Demo Prep Mission</p>
          <h2>Get {missionAccount} demo-ready in minutes</h2>
          <p className="prep-mission__subtext">
            Standardize discovery intake, AI scenario generation, and NetSuite execution so you can move from idea to polished story fast.
          </p>
          <div className="prep-mission__meta">
            <div className="prep-progress">
              <div className="prep-progress__value">{prepCompletion}%</div>
              <div className="prep-progress__label">
                workflow complete
                <span>{completedPrepSteps} / {prepWorkflow.length} tasks</span>
              </div>
            </div>
            <div className="prep-next-step">
              <span className="prep-next-step__label">Next up</span>
              <strong>{nextStepLabel}</strong>
            </div>
          </div>
        </div>
        {nextPrepAction && (
          <div className="prep-mission__action">
            <p>{nextPrepAction.description}</p>
            <button type="button" onClick={nextPrepAction.action}>
              {nextPrepAction.label}
            </button>
          </div>
        )}
      </div>
    );
  });

  const PrepWorkflowGuide = React.memo(() => (
    <div className="prep-workflow-section">
      <div className="prep-workflow-grid">
        {prepWorkflow.map((step, idx) => (
          <div key={step.id} className={`prep-workflow-card ${step.done ? 'is-complete' : ''}`}>
            <div className="prep-workflow-card__label">Step {idx + 1}</div>
            <div>
              <h4>{step.title}</h4>
              <p>{step.description}</p>
            </div>
            <span className="prep-workflow-card__status">
              {step.done ? 'Complete' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
      <div className="prep-focus-grid">
        {PREP_FOCUS_POINTS.map((point) => (
          <div key={point.id} className="prep-focus-card">
            <p className="prep-focus-card__label">{point.title}</p>
            <p className="prep-focus-card__text">{point.description}</p>
          </div>
        ))}
      </div>
    </div>
  ));

  const ActionStatusBanner = React.memo(() => {
    if (!actionStatus) return null;
    const resolvedStatus = typeof actionStatus === 'string'
      ? {
          message: actionStatus,
          type: actionStatus.includes('✓') ? 'success' : actionStatus.includes('⚠') ? 'warning' : 'info'
        }
      : actionStatus;
    const TypeIcon = resolvedStatus.type === 'success' ? Check : resolvedStatus.type === 'warning' ? AlertCircle : Loader;

    return (
      <div className={`action-status action-status--${resolvedStatus.type || 'info'}`}>
        <TypeIcon size={16} />
        <span>{resolvedStatus.message}</span>
      </div>
    );
  });

  // Component: Summary Highlights
  const SummaryHighlights = React.memo(() => (
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
  ));

  // Industry-specific prompts helper
  const getIndustryPrompts = (industry: string) => {
    const industryMap: Record<string, string[]> = {
      'PEO Services': [
        'Set up multi-entity payroll processing with 250+ employees',
        'Create compliance tracking dashboard for HR operations',
        'Build employee onboarding workflow with automated provisioning'
      ],
      'Consulting': [
        'Create project-based billing with milestone tracking',
        'Set up resource allocation across multiple client engagements',
        'Build time & expense tracking with approval workflows'
      ],
      'Tech Consulting': [
        'Configure agile project management with sprint tracking',
        'Set up utilization dashboard showing billable vs non-billable hours',
        'Create technical resource planning with skill-based allocation'
      ],
      'Energy': [
        'Build pipeline segment tracking across multiple states',
        'Set up equipment inventory with maintenance scheduling',
        'Create environmental compliance tracking and reporting'
      ],
      'Professional Services': [
        'Configure project accounting with WIP and revenue recognition',
        'Set up client billing with retainer and hourly rate options',
        'Build resource forecasting with capacity planning'
      ]
    };

    return industryMap[industry] || [
      'Create demo project with sample tasks and milestones',
      'Set up time tracking and expense management',
      'Configure billing and invoicing workflows'
    ];
  };

  // Component: Prospect Selector
  const ProspectSelector = () => (
    <div className="prospect-selector-card bg-gradient-to-br from-white to-blue-50 rounded-2xl border-2 border-blue-200 p-6 shadow-lg mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-1">Select Your Prospect</h3>
          <p className="text-sm text-gray-600">Choose an existing prospect or create a new one to get started</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowQuickCreate(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} />
            New Prospect
          </button>
          <button
            type="button"
            onClick={() => setShowScenarioGenerator(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg border-2 border-dashed border-blue-400 text-blue-700 font-semibold bg-white/70 hover:bg-white transition-colors"
          >
            <Wand2 size={18} />
            AI Scenario
          </button>
        </div>
      </div>

      {/* Prospect Grid */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto">
        {filteredCustomers.map((prospect: any) => (
          <button
            key={prospect.id}
            onClick={() => setSelectedCustomer(prospect.id)}
            className={`text-left p-4 rounded-xl border-2 transition-all ${
              selectedCustomer === prospect.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm">{prospect.name}</h4>
              {selectedCustomer === prospect.id && (
                <Check size={18} className="text-blue-600 flex-shrink-0" />
              )}
            </div>
            <p className="text-xs text-gray-600 mb-2">{prospect.industry}</p>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                prospect.status === 'Hot' ? 'bg-red-100 text-red-700' :
                prospect.status === 'Active' ? 'bg-green-100 text-green-700' :
                prospect.status === 'Qualified' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {prospect.status}
              </span>
              <span className="text-xs text-gray-500">{prospect.budget}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  // Component: Customer Context Panel
  const CustomerContextPanel = () => (
    <div className="customer-context">
      <PrepMissionBanner />
      <PrepWorkflowGuide />
      <SummaryHighlights />

      {/* Prospect Selector */}
      <ProspectSelector />

      {selectedCustData ? (
        <>
        <div className="customer-layout grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Industry-Specific Prompts */}
          <div className="industry-prompts-panel lg:col-span-1">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Zap size={18} className="text-purple-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">Industry Prompts</h4>
                  <p className="text-xs text-gray-500">{selectedCustData.industry}</p>
                </div>
              </div>
              <div className="space-y-2">
                {getIndustryPrompts(selectedCustData.industry).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const fullPrompt = `For ${selectedCustData.name}: ${prompt}`;
                      copyToClipboard(fullPrompt, `industry-${idx}`, 'Industry prompt');
                      pushToast('Industry prompt copied!', 'success');
                    }}
                    className="w-full text-left p-3 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors group"
                  >
                    <p className="text-sm text-gray-700 mb-2">{prompt}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-purple-600 font-medium">Click to copy</span>
                      <Copy size={14} className="text-purple-400 group-hover:text-purple-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-panel lg:col-span-1">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target size={18} className="text-blue-600" />
                </div>
                <h4 className="text-sm font-semibold text-gray-900">Quick Actions</h4>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Active workspace: <strong>{currentAccount?.name}</strong>
              </p>
              <ActionStatusBanner />
              <div className="quick-actions-meta">
                <div>
                  <span>Last Sync</span>
                  <strong>{lastSyncDisplay}</strong>
                </div>
                <div>
                  <span>Clipboard</span>
                  <strong>{clipboardHistory.length} items</strong>
                </div>
              </div>

              <div className="space-y-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  const isLoading = syncLoading && action.id === 'sync-netsuite';
                  const isDisabled = !selectedCustData || isLoading;
                  return (
                    <button
                      key={action.id}
                      onClick={action.action}
                      disabled={isDisabled}
                      className={`quick-actions-panel__button ${isLoading ? 'is-loading' : ''} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''} w-full p-3 rounded-lg border shadow-sm hover:shadow-md transition-shadow`}
                      title={!selectedCustData ? 'Select a prospect first' : ''}
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
          </div>

          {/* Customer Details */}
          <div className="context-panel lg:col-span-1">
            <div className="bg-white rounded-xl border shadow-sm p-5">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b">
                <div className="p-2 bg-green-100 rounded-lg">
                  <User size={18} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{selectedCustData.name}</h3>
                  <p className="text-sm text-gray-600">{selectedCustData.industry}</p>
                </div>
              </div>

              {/* Key Details Grid */}
              <div className="space-y-3 mb-4">
                {[
                  { label: 'Entity ID', value: selectedCustData.entityid },
                  { label: 'Company Size', value: `${selectedCustData.size} employees` },
                  { label: 'Budget Range', value: selectedCustData.budget },
                  { label: 'Demo Date', value: selectedCustData.demoDate },
                  { label: 'Status', value: selectedCustData.status }
                ].map((info: any) => (
                  <div key={info.label} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{info.label}:</span>
                    <strong className="text-gray-900">{info.value}</strong>
                  </div>
                ))}
                {selectedCustData.website && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Website:</span>
                    <a
                      href={selectedCustData.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                    >
                      Visit Site
                    </a>
                  </div>
                )}
              </div>

              {/* Focus Areas */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Focus Areas:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedCustData.focus.map((area: string, idx: number) => (
                    <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {area}
                    </span>
                  ))}
                </div>
              </div>

              {/* Quick Notes */}
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">Quick Notes</p>
                <textarea
                  value={demoNotes[selectedCustData.id] || ''}
                  onChange={(e) => {
                    const customerId = selectedCustData.id;
                    const newValue = e.target.value;
                    setDemoNotes((prev) => ({...prev, [customerId]: newValue}));
                  }}
                  placeholder="Add demo notes, pain points, or follow-up items..."
                  className="w-full h-[80px] p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={3}
                />
              </div>

              {/* NetSuite Links */}
              <div className="space-y-2">
                <a
                  href={`https://${currentAccount?.instance}.app.netsuite.com/app/common/entity/customer.nl?id=${selectedCustData.nsId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full text-sm font-medium"
                >
                  <Target size={16} />
                  Open in NetSuite
                  <ChevronRight size={16} />
                </a>
                <button
                  onClick={syncNetsuiteFields}
                  disabled={syncLoading}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors w-full text-sm font-medium"
                >
                  {syncLoading ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Loader size={16} />
                  )}
                  {syncLoading ? 'Syncing...' : 'Sync NetSuite Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="insights-grid">
          <div className="insights-card">
            <DemoChecklist />
          </div>
          <div className="insights-card">
            <h4 className="insights-card__title">NetSuite Custom Fields</h4>
            <CustomFieldsPanel />
          </div>
          <div className="insights-card insights-card--wide">
            <h4 className="insights-card__title">Demo Intelligence</h4>
            <p className="insights-card__subtitle">Mock analytics to illustrate adoption and prep velocity</p>
            <DataVisualization className="insights-analytics" />
          </div>
        </div>
        </>
      ) : (
        <div className="text-center py-12">
          <Users size={48} className="text-gray-400 mb-4 mx-auto" />
          <p className="text-gray-500 text-lg mb-2">No Prospect Selected</p>
          <p className="text-gray-400 text-sm mb-6">Select a prospect from the list above to get started</p>
          <button
            onClick={() => setShowQuickCreate(true)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-semibold"
          >
            <Plus size={20} />
            Create Your First Prospect
          </button>
        </div>
      )}
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

  // Component: Demo Builder Panel
  const DemoBuilderPanel = () => {
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [generatedScenarios, setGeneratedScenarios] = useState<string[]>([]);
    const selectedWebsite = selectedCustData?.website;

    // Auto-populate website when prospect is selected
    useEffect(() => {
      if (selectedWebsite) {
        setCompanyWebsite(selectedWebsite);
      }
    }, [selectedWebsite]);

    const demoPromptTemplates = [
      {
        category: 'Initial Setup',
        icon: Target,
        prompts: [
          {
            title: 'Complete Customer Record',
            template: `Create a complete customer record for ${selectedCustData?.name || '[Company Name]'} in NetSuite with the following details:\n- Industry: ${selectedCustData?.industry || '[Industry]'}\n- Company Size: ${selectedCustData?.size || '[Size]'} employees\n- Budget: ${selectedCustData?.budget || '[Budget]'}\n- Primary Contact: [Contact Name and Email]\n- Billing Address: [Address]\n- Payment Terms: Net 30\n- Currency: USD\n- Tax Status: Taxable`
          },
          {
            title: 'Subsidiary & Entity Structure',
            template: `Set up a multi-entity structure for ${selectedCustData?.name || '[Company Name]'}:\n- Parent Entity: ${selectedCustData?.name || '[Company Name]'} Holdings\n- Operating Subsidiaries: [List 2-3 subsidiaries]\n- Configure intercompany relationships and elimination accounts\n- Set up consolidated financial reporting`
          }
        ]
      },
      {
        category: 'Demo Data Creation',
        icon: FileText,
        prompts: [
          {
            title: 'Sample Project Setup',
            template: `Create a realistic demo project for ${selectedCustData?.name || '[Company Name]'} titled "${selectedCustData?.focus?.[0] || 'Implementation'} Project - Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}":\n- Project Type: ${selectedCustData?.industry || 'Professional Services'}\n- Budget: ${selectedCustData?.budget?.split('-')[0] || '$150K'}\n- Timeline: 12 weeks\n- Add 8-10 tasks with realistic estimates\n- Include milestones at 25%, 50%, 75%, and 100% completion\n- Add 3-4 team member assignments with different roles`
          },
          {
            title: 'Time & Expense Entries',
            template: `Generate realistic time and expense data for ${selectedCustData?.name || '[Company Name]'}:\n- Create 15-20 approved time entries across 4 team members\n- Date range: Last 30 days\n- Include billable and non-billable hours\n- Add 5-7 expense reports with receipts:\n  * Travel expenses\n  * Client meals\n  * Software/tools\n  * Office supplies\n- Ensure entries align with project tasks`
          },
          {
            title: 'Invoice & Revenue',
            template: `Create invoicing scenario for ${selectedCustData?.name || '[Company Name]'}:\n- Generate 3 invoices for the demo project\n- Invoice 1: Initial deposit (30% of project value)\n- Invoice 2: Mid-project milestone (40% of project value)  \n- Invoice 3: Final delivery (30% of project value)\n- Include line items for professional services, expenses, and any additional charges\n- Set appropriate tax codes and payment terms`
          }
        ]
      },
      {
        category: 'Advanced Scenarios',
        icon: Zap,
        prompts: [
          {
            title: 'Resource Planning Setup',
            template: `Build a resource planning demonstration for ${selectedCustData?.name || '[Company Name]'}:\n- Create resource allocation plan for next 12 weeks\n- Add 10-12 team members with different skill sets: ${selectedCustData?.focus?.join(', ') || 'PM, Developer, QA, Designer'}\n- Set utilization targets: Billable 70-85%, Internal 15-30%\n- Create project assignments with varying allocations (25%, 50%, 75%, 100%)\n- Include PTO and holidays\n- Show capacity vs demand analysis`
          },
          {
            title: 'Multi-Currency Scenario',
            template: `Configure multi-currency demonstration:\n- Enable currencies: USD, EUR, GBP, CAD\n- Create transactions in different currencies for ${selectedCustData?.name || '[Company Name]'}\n- Set up currency exchange rate tables\n- Show consolidated reporting in base currency (USD)\n- Demonstrate gain/loss calculations`
          },
          {
            title: 'Approval Workflow',
            template: `Set up approval workflows for ${selectedCustData?.name || '[Company Name]'}:\n- Time entry approvals (Manager → Department Head)\n- Expense report approvals (Manager → Finance, amounts >$500)\n- Purchase order approvals (Tiered by amount)\n- Demonstrate pending approvals dashboard\n- Show email notifications and mobile approvals`
          }
        ]
      },
      {
        category: 'Reporting & Analytics',
        icon: BarChart3,
        prompts: [
          {
            title: 'Executive Dashboard',
            template: `Create executive dashboard for ${selectedCustData?.name || '[Company Name]'} showing:\n- Revenue recognition summary\n- Project profitability metrics\n- Resource utilization rates\n- Outstanding AR/AP\n- Budget vs actual analysis\n- Top 5 projects by revenue\n- Quarterly comparison charts`
          },
          {
            title: 'Custom Reports',
            template: `Build custom saved searches and reports:\n- Project Status Report: All active projects with budget, actual costs, % complete\n- Resource Utilization Report: By employee, showing billable vs non-billable hours\n- Revenue Forecast: Pipeline and projected revenue for next 2 quarters\n- Client Profitability Analysis: For ${selectedCustData?.name || '[Company Name]'} and similar clients\n- Time Entry Detail: Exportable CSV for payroll processing`
          }
        ]
      }
    ];

    const generateWebsiteScenarios = () => {
      if (!companyWebsite.trim()) return;

      const scenarios = [
        `Analyze the website ${companyWebsite} and create a NetSuite demo scenario that addresses the company's apparent business needs. Include specific features they would likely value based on their industry and service offerings.`,
        `Based on ${companyWebsite}, identify 3-5 pain points this company likely faces that NetSuite could solve. Create demo talking points for each.`,
        `Review ${companyWebsite} and suggest a complete NetSuite module suite recommendation (which modules to demo and why) based on their business model.`
      ];

      setGeneratedScenarios(scenarios);
      pushToast('✓ Website scenarios generated', 'success');
    };

    return (
      <div className="demo-builder-panel max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-2">
            <Zap size={28} />
            <h2 className="text-2xl font-bold">Demo Builder</h2>
          </div>
          <p className="text-purple-100">Generate AI prompts to build comprehensive NetSuite demonstrations</p>
          {selectedCustData && (
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 inline-block">
              <span className="text-sm">Building for: <strong>{selectedCustData.name}</strong></span>
            </div>
          )}
        </div>

        {/* Website Analysis Section */}
        <div className="mb-6 bg-white rounded-xl border-2 border-indigo-200 p-6 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <Target size={20} className="text-indigo-600" />
            <h3 className="text-lg font-bold text-gray-900">Company Website Analysis</h3>
          </div>
          <p className="text-sm text-gray-600 mb-4">Paste a company website URL to generate tailored demo scenarios and talking points</p>

          <div className="flex gap-3">
            <input
              type="url"
              value={companyWebsite}
              onChange={(e) => setCompanyWebsite(e.target.value)}
              placeholder="https://company-website.com"
              className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <button
              onClick={generateWebsiteScenarios}
              disabled={!companyWebsite.trim()}
              className={`px-6 py-3 rounded-lg font-semibold transition-all ${
                companyWebsite.trim()
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-md'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Generate Scenarios
            </button>
          </div>

          {generatedScenarios.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700 mb-2">Generated Prompts:</p>
              {generatedScenarios.map((scenario, idx) => (
                <div key={idx} className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-3">{scenario}</p>
                  <button
                    onClick={() => {
                      copyToClipboard(scenario, `website-${idx}`, 'Website analysis prompt');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                  >
                    <Copy size={14} />
                    Copy Prompt
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prompt Templates */}
        <div className="space-y-6">
          {demoPromptTemplates.map((category, catIdx) => {
            const CategoryIcon = category.icon;
            return (
              <div key={catIdx} className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4 pb-3 border-b">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <CategoryIcon size={20} className="text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{category.category}</h3>
                  <span className="ml-auto text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">
                    {category.prompts.length} templates
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {category.prompts.map((prompt, promptIdx) => (
                    <div key={promptIdx} className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-gray-900 text-sm">{prompt.title}</h4>
                        <button
                          onClick={() => {
                            copyToClipboard(prompt.template, `template-${catIdx}-${promptIdx}`, prompt.title);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                        >
                          <Copy size={12} />
                          Copy
                        </button>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                          {prompt.template}
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* No Prospect Selected State */}
        {!selectedCustData && (
          <div className="mt-6 bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 text-center">
            <AlertCircle size={32} className="text-yellow-600 mx-auto mb-3" />
            <h4 className="font-semibold text-gray-900 mb-2">No Prospect Selected</h4>
            <p className="text-sm text-gray-600 mb-4">
              Select a prospect from the Customer Context tab to personalize these demo prompts
            </p>
            <button
              onClick={() => setActiveTab('context')}
              className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Customer Context
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

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
          onExportComplete={(success: boolean, filename?: string) => {
            if (success) {
              const filenameStr = filename ? ` ${filename}` : '';
              setActionStatus({
                type: 'success',
                message: `Export completed:${filenameStr}`
              });
              pushToast(`Export completed:${filenameStr}`, 'success');
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
              <button
                className="ghost-button px-3 py-2 text-sm flex items-center gap-2"
                onClick={() => setShowClipboardPanel(!showClipboardPanel)}
              >
                <Copy size={16} />
                Clipboard ({clipboardHistory.length})
              </button>
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
            type="button"
            className="lg:hidden ml-auto mb-4"
            aria-label="Toggle workspace controls"
            aria-expanded={isMobileMenuOpen}
            aria-controls="dashboard-controls"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Account Switcher - Responsive */}
          <div
            id="dashboard-controls"
            className={`header-accounts ${isMobileMenuOpen ? 'block' : 'hidden lg:block'}`}
          >
            <AccountSwitcher />
          </div>

          {/* Tab Navigation - Responsive */}
          <nav
            className="dashboard-tabs flex flex-col sm:flex-row overflow-x-auto lg:overflow-visible gap-2 lg:gap-0"
            role="tablist"
            aria-label="Dashboard sections"
          >
            {DASHBOARD_TABS.map(({ id, label, icon: Icon }) => {
              const buttonId = `dashboard-tab-${id}`;
              const panelId = `dashboard-panel-${id}`;
              return (
                <button
                  key={id}
                  id={buttonId}
                  role="tab"
                  aria-selected={activeTab === id}
                  aria-controls={panelId}
                  onClick={() => {
                    setActiveTab(id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`dashboard-tab flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${activeTab === id ? 'is-active bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  <Icon size={18} />
                  <span className="hidden sm:inline">{label}</span>
                  {activeTab === id && <Check size={16} />}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-main max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Global Search - Hidden on mobile, shown on desktop */}
        {activeTab !== 'context' && <GlobalSearch />}

        {/* Tab Content */}
        {activeTab === 'context' && (
          <section
            id="dashboard-panel-context"
            role="tabpanel"
            aria-labelledby="dashboard-tab-context"
          >
            <CustomerContextPanel />
          </section>
        )}
        {activeTab === 'prompts' && (
          <section
            id="dashboard-panel-prompts"
            role="tabpanel"
            aria-labelledby="dashboard-tab-prompts"
          >
            <div className="space-y-6">
              <AdvancedSearch
                onFiltersChange={(filters: SearchFilters) => setPromptSearch(filters.query)} // Local search for prompts
                className="w-full"
              />
              <PromptLibrary />
            </div>
          </section>
        )}
        {activeTab === 'demo-builder' && (
          <section
            id="dashboard-panel-demo-builder"
            role="tabpanel"
            aria-labelledby="dashboard-tab-demo-builder"
          >
            <DemoBuilderPanel />
          </section>
        )}
        {activeTab === 'export' && (
          <section
            id="dashboard-panel-export"
            role="tabpanel"
            aria-labelledby="dashboard-tab-export"
          >
            <ExportPanel />
          </section>
        )}

        {/* Quick Create Modal */}
        {showQuickCreate && <QuickCreateForm />}

        {/* AI Scenario Generator */}
        <ScenarioGeneratorModal />

        {/* Toast Notifications */}
        <ToastStack />

        {/* Clipboard History Panel */}
        <ClipboardHistoryPanel />
      </div>
    </div>
  );
}
