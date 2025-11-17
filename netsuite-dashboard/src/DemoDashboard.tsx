import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { X, Building2, Check, BookOpen, ChevronDown, Zap, Clock, FileText, TrendingUp, Loader, Download, Plus, Copy, User, Wand2, Moon, Sun, Star } from 'lucide-react';  // Import all needed icons
import ScenarioGenerator from './ScenarioGenerator';
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

  const notesRef = useRef<HTMLTextAreaElement>(null);

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

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Focus main search with "/"
      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const input = document.querySelector('input[placeholder="Search scenarios, prompts, or descriptions..."]') as HTMLInputElement | null;
        if (input) {
          e.preventDefault();
          input.focus();
        }
      }
      // Quick create with "n"
      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) {
        // avoid when typing in inputs
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) return;
        setShowQuickCreate(true);
      }
      // Toggle filters with "f"
      if ((e.key === 'f' || e.key === 'F') && !e.metaKey && !e.ctrlKey) {
        const filterBtn = document.querySelector('button[aria-label="Toggle filters"]') as HTMLButtonElement | null;
        if (filterBtn) {
          e.preventDefault();
          filterBtn.click();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!isFormValid) return;
      const newProspect = {
        ...quickProspect,
        id: Date.now(),
        entityid: `${quickProspect.name.replace(/\s+/g, '-').toLowerCase()}-demo`,
        focus: quickProspect.focusText.split(',').map(f => f.trim()),
        aiGenerated: false
      };
      setDynamicCustomers(prev => [newProspect, ...prev]);
      setSelectedCustomer(newProspect.id);
      setShowQuickCreate(false);
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
      pushToast('Prospect created successfully!', 'success');
    };

    const handleChange = (field: string, value: string) => {
      setQuickProspect(prev => ({ ...prev, [field]: value }));
    };

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
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Required Fields Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Required Fields</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={quickProspect.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Acme Corp"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry *</label>
                  <select
                    value={quickProspect.industry}
                    onChange={(e) => handleChange('industry', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select Industry</option>
                    <option value="Consulting">Consulting</option>
                    <option value="PEO Services">PEO Services</option>
                    <option value="Energy">Energy</option>
                    <option value="Tech Consulting">Tech Consulting</option>
                    <option value="Professional Services">Professional Services</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optional Fields Section */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={quickProspect.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Active">Active</option>
                  <option value="Hot">Hot</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Qualified">Qualified</option>
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                  <select
                    value={quickProspect.size}
                    onChange={(e) => handleChange('size', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="50-100">50-100</option>
                    <option value="100-200">100-200</option>
                    <option value="200-500">200-500</option>
                    <option value="500-1000">500-1000</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
                  <input
                    type="text"
                    value={quickProspect.budget}
                    onChange={(e) => handleChange('budget', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., $150K+"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Focus Areas (comma-separated)</label>
                <input
                  type="text"
                  value={quickProspect.focusText}
                  onChange={(e) => handleChange('focusText', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Resource Planning, Billing"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Demo Date</label>
                  <input
                    type="text"
                    value={quickProspect.demoDate}
                    onChange={(e) => handleChange('demoDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., Nov 20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="url"
                    value={quickProspect.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NetSuite ID (optional)</label>
                <input
                  type="text"
                  value={quickProspect.nsId}
                  onChange={(e) => handleChange('nsId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 1234"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowQuickCreate(false)}
                className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isFormValid}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isFormValid
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Prospect
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Main Dashboard JSX
  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold">NetSuite Demo Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="select max-w-[260px]"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.instance})
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowQuickCreate(true)}
                className="btn-primary flex items-center space-x-2"
              >
                <Plus size={16} />
                <span>Add Prospect</span>
              </button>
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="btn-ghost p-2"
              >
                {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Global Search */}
        <GlobalSearch />

        {/* Status Filter */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Prospects ({filteredCustomers.length})</h2>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="select max-w-[220px]"
          >
            <option value="all">All Statuses</option>
            {Object.keys(statusCounts).map((status) => (
              <option key={status} value={status}>
                {status} ({statusCounts[status]})
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            {DASHBOARD_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon size={18} />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'context' && (
            <div>
              {/* Customer List */}
              {filteredCustomers.length === 0 ? (
                <div className="p-10 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 text-center">
                  <h3 className="text-lg font-semibold mb-2">No prospects found</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Try adjusting filters or create a new prospect to get started.</p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={() => setShowQuickCreate(true)}
                      className="btn-primary"
                    >
                      Add Prospect
                    </button>
                    <button
                      onClick={() => { setGlobalSearchQuery(''); setStatusFilter('all'); }}
                      className="btn-secondary"
                    >
                      Clear Filters
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => setSelectedCustomer(customer.id)}
                      className={`p-6 rounded-lg border cursor-pointer transition-colors ${
                        selectedCustomer === customer.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-semibold text-lg">{customer.name}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            customer.status === 'Hot'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : customer.status === 'Active'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {customer.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{customer.industry}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{customer.size}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">{customer.entityid}</p>
                      <div className="space-y-1 text-xs text-gray-500 dark:text-gray-500">
                        <p>Budget: {customer.budget}</p>
                        <p>Demo: {customer.demoDate}</p>
                        {customer.website && (
                          <p>
                            <a href={customer.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                              Website
                            </a>
                          </p>
                        )}
                        {customer.focus && (
                          <p>Focus: {customer.focus.join(', ')}</p>
                        )}
                      </div>
                      {selectedCustData?.id === customer.id && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <textarea
                            ref={notesRef}
                            value={demoNotes[customer.id] || ''}
                            onChange={(e) => setDemoNotes({ ...demoNotes, [customer.id]: e.target.value })}
                            placeholder="Demo notes..."
                            className="input"
                            rows={3}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quick Actions for Selected Customer */}
              {selectedCustData && (
                <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">Quick Actions for {selectedCustData.name}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {quickActions.map((action) => (
                      <button
                        key={action.id}
                        onClick={action.action}
                        className="flex flex-col items-center p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <action.icon size={20} className="mb-2 text-gray-500" />
                        <span className="text-sm text-center">{action.label}</span>
                      </button>
                    ))}
                  </div>
                  {actionStatus && (
                    <div className={`mt-4 p-3 rounded-lg ${
                      typeof actionStatus === 'string' 
                        ? 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                        : actionStatus.type === 'success' 
                          ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {typeof actionStatus === 'string' ? actionStatus : actionStatus.message}
                    </div>
                  )}
                </div>
              )}

              {/* Prep Workflow */}
              <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Demo Prep Workflow</h3>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                    <span className="text-sm font-medium">Progress: {prepCompletion}%</span>
                  </div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{completedPrepSteps}/{prepWorkflow.length} steps</span>
                </div>
                <div className="space-y-3">
                  {prepWorkflow.map((step) => (
                    <div key={step.id} className={`flex items-center space-x-3 p-3 rounded-lg ${
                      step.done ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800'
                    }`}>
                      <Check className={`h-5 w-5 ${step.done ? 'text-green-600' : 'text-gray-400'}`} />
                      <div>
                        <p className="font-medium">{step.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {nextPrepAction && (
                  <button
                    onClick={nextPrepAction.action}
                    className="mt-4 w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Next: {nextPrepAction.label}
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div>
              <input
                type="text"
                value={promptSearch}
                onChange={(e) => setPromptSearch(e.target.value)}
                placeholder="Search prompts..."
                className="input mb-6"
              />
              {filteredPrompts.length === 0 ? (
                <div className="p-8 border rounded-lg text-center bg-white dark:bg-gray-800 dark:border-gray-700">
                  <h3 className="font-semibold mb-2">No prompts match your search</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Try different keywords or clear the search.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredPrompts.map((category, index) => (
                    <div key={category.name} className="border rounded-lg">
                      <button
                        onClick={() => setExpandedCategory(expandedCategory === index ? null : index)}
                        className="w-full flex justify-between items-center p-4 font-medium text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <span>{category.name}</span>
                        <ChevronDown className={`h-5 w-5 transition-transform ${expandedCategory === index ? 'rotate-180' : ''}`} />
                      </button>
                      {expandedCategory === index && (
                        <div className="space-y-2 p-4 border-t">
                          {category.prompts.map((prompt: string, promptIndex: number) => (
                            <div key={promptIndex} className="p-3 bg-gray-50 dark:bg-gray-800 rounded border-l-4 border-blue-500">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-medium">{prompt.substring(0, 60)}...</h4>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => copyToClipboard(prompt, `prompt-${index}-${promptIndex}`, 'Prompt copied')}
                                    className={`p-1 rounded hover:bg-gray-200 ${copiedIndex === `prompt-${index}-${promptIndex}` ? 'text-green-600' : ''}`}
                                  >
                                    <Copy size={16} />
                                  </button>
                                  <button
                                    onClick={() => toggleFavorite(prompt)}
                                    className={`p-1 rounded hover:bg-gray-200 ${favorites.includes(prompt) ? 'text-yellow-500 fill-current' : ''}`}
                                  >
                                    <Star size={16} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{prompt}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {favorites.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Favorites</h3>
                  <div className="space-y-3">
                    {favorites.map((prompt: string, index: number) => (
                      <div key={index} className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded border">
                        <p className="text-sm">{prompt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'demo-builder' && (
            <div>
              <button
                onClick={() => setShowScenarioGenerator(true)}
                className="mb-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition-all"
              >
                <Wand2 className="inline mr-2 h-5 w-5" />
                Generate AI Scenario
              </button>
              {showScenarioGenerator && (
                <ScenarioGenerator onScenarioGenerated={handleScenarioGenerated} onClose={() => setShowScenarioGenerator(false)} />
              )}
              {/* Checklist for current customer */}
              {selectedCustData && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Prep Checklist for {selectedCustData.name}</h3>
                  {checklistState.map((item) => (
                    <div key={item.id} className={`flex items-center space-x-3 p-3 rounded-lg ${
                      item.done ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-200'
                    }`}>
                      <Check className={`h-5 w-5 ${item.done ? 'text-green-600' : 'text-gray-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                  {syncLoading && <Loader className="h-5 w-5 animate-spin text-blue-600" />}
                  <p className="text-sm text-gray-600 dark:text-gray-400">Last sync: {lastSyncDisplay}</p>
                  <button
                    onClick={syncNetsuiteFields}
                    disabled={syncLoading}
                    className="btn-primary disabled:opacity-50"
                  >
                    {syncLoading ? 'Syncing...' : 'Sync NetSuite Data'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div>
              <DataExport data={netsuiteExportData} />
              {clipboardHistory.length > 0 && showClipboardPanel && (
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">
                    Clipboard History
                    <button onClick={() => setShowClipboardPanel(false)} className="text-gray-500 hover:text-gray-700">
                      <X size={16} />
                    </button>
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {clipboardHistory.map((item) => (
                      <div key={item.id} className="p-3 bg-white dark:bg-gray-700 rounded border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-xs text-gray-500">{item.timestamp.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={item.text}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className={`p-4 rounded-lg shadow-lg max-w-sm ${
              toast.type === 'success' ? 'bg-green-500 text-white' :
              toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            } animate-slide-in-right`}
          >
            {toast.message}
          </div>
        ))}
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      {showQuickCreate && <QuickCreateForm />}
    </div>
  );
}
