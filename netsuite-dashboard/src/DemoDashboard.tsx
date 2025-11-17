import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Building2, Check, ClipboardList, Download, Menu, Moon, Plus, Search, Sun, X, Users, Wand2 } from 'lucide-react';
import ScenarioGenerator from './ScenarioGenerator';
import AdvancedSearch from './AdvancedSearch';
import DataExport from './DataExport';
import storageService from './storage-service';
import PrepMissionBanner from './components/PrepMissionBanner';
import PromptLibrary from './components/PromptLibrary';
import QuickActionsDeck from './components/QuickActionsDeck';
import { PrepWorkflowStep, PromptCategory, Prospect, QuickAction } from './types/dashboard';

const FOCUSABLE_SELECTORS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const focusFirstElement = (container: HTMLElement | null) => {
  if (!container) return;
  const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
  const target = focusable[0] || container;
  target.focus();
};

const trapFocus = (event: React.KeyboardEvent, container: HTMLElement | null) => {
  if (event.key !== 'Tab' || !container) return;
  const focusable = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS);
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
};

const handleOverlayKeyDown = (
  event: React.KeyboardEvent,
  onClose: () => void,
  container: HTMLElement | null
) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    onClose();
  } else if (event.key === 'Tab') {
    trapFocus(event, container);
  }
};

interface SearchFilters {
  query: string;
  status?: string;
}

type Tab = 'context' | 'prompts' | 'demo-builder' | 'export';

type ToastMessage = { id: string; message: string; type: 'success' | 'error' | 'info' };

const KEY_PROSPECTS: Prospect[] = [
  { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'Hot', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161, website: 'https://advisorhr.com' },
  { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'Active', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834, website: 'https://gsbgroup.com' },
  { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'Active', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938, website: 'https://innovatia.tech' },
  { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy', size: '100-150', status: 'Proposal', demoDate: 'Pending', focus: ['Pipeline Management', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662, website: 'https://marabou-midstream.com' },
  { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'Qualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938, website: 'https://lovse.com' },
  { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'Proposal', demoDate: 'Pending', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285, website: 'https://nfront.com' },
  { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'Active', demoDate: 'Nov 25', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938, website: 'https://formativegroup.com' }
];

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    name: 'Customer Setup',
    prompts: [
      'Create a new customer for [Company Name] in the [Vertical] industry with [company size] employees, annual revenue of [amount], and primary contact [contact info].',
      'Set up a multi-subsidiary structure with parent [Parent Co] and subsidiaries [List]; enable consolidated reporting.',
      'Create a customer with custom fields populated: Industry Type=[X], Annual Revenue=[X], No. of Employees=[X], and AI Generated Summary=[summary].'
    ]
  },
  {
    name: 'Project & PSA',
    prompts: [
      'Create a project for [Customer Name] titled "[Project Name]" with code [PRJ####], PM=[Person], Budget=[Amount], Start=[Date], End=[Date], plus 4-5 tasks.',
      'Set up resource allocation forecast for project PRJ#### with roles: [Engineer-500hrs@$150/hr], [Technician-300hrs@$75/hr], [QA-200hrs@$120/hr].',
      'Create time entries for [Employee Name] on [Project]: [Date] - [Hours] for [Task]. Mark entries approved + billable.'
    ]
  },
  {
    name: 'Billing & Revenue',
    prompts: [
      'Create an estimate for [Customer Name] including [Item 1-Qty-Rate], [Item 2-Qty-Rate]; set status pending with due date [Date].',
      'Generate an invoice from estimate [EST####]; remove [Item], add [New Item-Qty-Rate], adjust billing date to [Date].',
      'Create a purchase order from vendor bill [VB####] for [Vendor Name] totaling $[Amount]. Link to project [PRJ####].'
    ]
  },
  {
    name: 'Industry Scenarios',
    prompts: [
      'Environmental Consulting: build demo with 5 stream restoration projects, 12 team members, 2400 billable hours YTD, 85% utilization, multi-entity consolidation.',
      'PEO Services: set up AdvisorHR demo with 3 subsidiaries, 250+ employees, daily time tracking, multi-entity revenue recognition, compliance tracking.',
      'Midstream Energy: model pipeline scenario with 4-state operations, equipment tracking, compliance charges, resource crews, multi-entity allocations.'
    ]
  }
];

const ACCOUNTS = [
  { id: 'services', name: 'Services Stairway', instance: 'td3049589', vertical: 'Professional Services' },
  { id: 'software', name: 'Software Stairway', instance: 'td3049589-soft', vertical: 'SaaS' },
  { id: 'saas', name: 'NS Services SaaS', instance: 'td3049589-saas', vertical: 'Hybrid Services' }
];

const DASHBOARD_TABS = [
  { id: 'context', label: 'Customer Context', icon: Users },
  { id: 'prompts', label: 'Demo Prompts', icon: BookOpen },
  { id: 'demo-builder', label: 'Demo Builder', icon: Wand2 },
  { id: 'export', label: 'Exports', icon: Download }
] as const;

const formatStatus = (status: string) => {
  switch (status) {
    case 'Hot':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    case 'Active':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
    case 'Qualified':
      return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'Proposal':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
};

const DemoDashboard: React.FC = () => {
  const preferencesRef = useRef(storageService.getPreferences());
  const [activeTab, setActiveTab] = useState<Tab>('context');
  const [selectedAccount, setSelectedAccount] = useState<string>(preferencesRef.current.lastAccountId || 'services');
  const [dynamicCustomers, setDynamicCustomers] = useState<Prospect[]>(() => storageService.getProspects());
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(
    preferencesRef.current.lastCustomerId ?? KEY_PROSPECTS[0].id
  );
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [promptSearch, setPromptSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(storageService.getFavorites());
  const [clipboardHistory, setClipboardHistory] = useState<{ id: string; label: string; text: string; timestamp: Date }[]>([]);
  const [demoNotes, setDemoNotes] = useState<{ [key: number]: string }>(storageService.getNoteDrafts());
  const [nsData, setNsData] = useState<Record<number, any>>({});
  const [customFieldsData, setCustomFieldsData] = useState<Record<number, any>>({});
  const [syncHistory, setSyncHistory] = useState<Record<number, Date>>({});
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | { type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [showScenarioGenerator, setShowScenarioGenerator] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(preferencesRef.current.theme === 'dark' ? 'dark' : 'light');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [showClipboardPanel, setShowClipboardPanel] = useState(false);
  const quickCreateRef = useRef<HTMLDivElement | null>(null);
  const scenarioRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    storageService.saveProspects(dynamicCustomers);
  }, [dynamicCustomers]);

  useEffect(() => {
    Object.entries(demoNotes).forEach(([id, value]) => {
      storageService.saveNoteDraft(Number(id), value || '');
    });
  }, [demoNotes]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    storageService.setPreferences({ theme });
  }, [theme]);

  useEffect(() => {
    storageService.setPreferences({ lastAccountId: selectedAccount });
  }, [selectedAccount]);

  useEffect(() => {
    storageService.setPreferences({ lastCustomerId: selectedCustomer });
  }, [selectedCustomer]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setShowClipboardPanel((prev) => !prev);
        return;
      }

      if (e.key === '/' && !e.metaKey && !e.ctrlKey) {
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Search prospects or industries"]');
        if (input) {
          e.preventDefault();
          input.focus();
        }
        return;
      }

      if ((e.key === 'n' || e.key === 'N') && !e.metaKey && !e.ctrlKey) {
        const active = document.activeElement;
        if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) return;
        e.preventDefault();
        setShowQuickCreate(true);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showQuickCreate) {
      focusFirstElement(quickCreateRef.current);
    }
  }, [showQuickCreate]);

  useEffect(() => {
    if (showScenarioGenerator) {
      focusFirstElement(scenarioRef.current);
    }
  }, [showScenarioGenerator]);

  const allCustomers = useMemo(() => [...KEY_PROSPECTS, ...dynamicCustomers], [dynamicCustomers]);

  const filteredCustomers = useMemo(() => {
    return allCustomers.filter((cust) => {
      const matchesSearch =
        cust.name.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        cust.industry.toLowerCase().includes(globalSearchQuery.toLowerCase()) ||
        cust.entityid.toLowerCase().includes(globalSearchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || cust.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allCustomers, globalSearchQuery, statusFilter]);

  useEffect(() => {
    if (!selectedCustomer && filteredCustomers.length > 0) {
      setSelectedCustomer(filteredCustomers[0].id);
    }
  }, [filteredCustomers, selectedCustomer]);

  const selectedCustData = useMemo(() => allCustomers.find((cust) => cust.id === selectedCustomer) || null, [allCustomers, selectedCustomer]);

  const statusCounts = useMemo(() => {
    return allCustomers.reduce<Record<string, number>>((acc, cust) => {
      acc[cust.status] = (acc[cust.status] || 0) + 1;
      return acc;
    }, {});
  }, [allCustomers]);

  const netsuiteExportData = useMemo(() => {
    return Object.entries(nsData).map(([custId, recordData]) => {
      const numericId = Number(custId);
      const customer = allCustomers.find((c) => c.id === numericId);
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
    });
  }, [nsData, allCustomers, customFieldsData, syncHistory, selectedAccount]);

  const prepWorkflow: PrepWorkflowStep[] = useMemo(() => {
    const hasProspect = Boolean(selectedCustData);
    const hasSyncedFields = selectedCustData ? Boolean(customFieldsData[selectedCustData.id]) : false;
    const hasScenario = dynamicCustomers.some((cust) => cust.aiGenerated);
    const hasClipboard = clipboardHistory.length > 0;
    const hasExport = netsuiteExportData.length > 0;

    return [
      { id: 'prospect', label: 'Capture Discovery', done: hasProspect },
      { id: 'sync', label: 'Sync NetSuite', done: hasSyncedFields },
      { id: 'build', label: 'Generate Scenario', done: hasScenario },
      { id: 'share', label: 'Share Assets', done: hasClipboard || hasExport }
    ];
  }, [selectedCustData, customFieldsData, dynamicCustomers, clipboardHistory, netsuiteExportData]);

  const completedSteps = prepWorkflow.filter((step) => step.done).length;
  const prepCompletion = Math.round((completedSteps / prepWorkflow.length) * 100);

  const lastSyncDisplay = useMemo(() => {
    if (!selectedCustData) return 'Select a prospect to sync data';
    const date = syncHistory[selectedCustData.id] || lastSyncTime;
    return date ? date.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Not synced yet';
  }, [lastSyncTime, selectedCustData, syncHistory]);

  const pushToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const copyToClipboard = useCallback(
    (text: string, index: string, label: string) => {
      navigator.clipboard.writeText(text)
        .then(() => {
          setClipboardHistory((prev) => {
            const entry = { id: `${index}-${Date.now()}`, label, text, timestamp: new Date() };
            return [entry, ...prev].slice(0, 12);
          });
          pushToast('Copied to clipboard', 'success');
        })
        .catch(() => pushToast('Clipboard copy failed', 'error'));
    },
    [pushToast]
  );

  const handlePromptCopy = useCallback(
    (prompt: string, index: string) => copyToClipboard(prompt, index, 'Prompt copied'),
    [copyToClipboard]
  );

  const toggleFavorite = useCallback((prompt: string) => {
    setFavorites((prev) => {
      if (prev.includes(prompt)) {
        storageService.removeFavorite(prompt);
        return prev.filter((item) => item !== prompt);
      }
      storageService.addFavorite(prompt);
      return [...prev, prompt];
    });
  }, []);

  const handleScenarioGenerated = useCallback((newScenario: Prospect) => {
    setDynamicCustomers((prev) => [newScenario, ...prev]);
    setSelectedCustomer(newScenario.id);
    setShowScenarioGenerator(false);
    pushToast(`Scenario "${newScenario.name}" added`, 'success');
  }, [pushToast]);

  const syncNetsuiteFields = useCallback(async () => {
    if (!selectedCustData) return;
    setSyncLoading(true);
    setActionStatus('Syncing NetSuite data...');

    try {
      const mockNsResponse = {
        id: selectedCustData.nsId,
        companyname: selectedCustData.name,
        custentity13: `AI Summary for ${selectedCustData.name}: Focus on ${selectedCustData.focus.join(', ')}.`,
        custentity16: selectedCustData.industry,
        custentity15: selectedCustData.size,
        email: `contact@${selectedCustData.entityid.toLowerCase()}.com`,
        phone: '(555) 123-4567'
      };
      const timestamp = new Date();
      setCustomFieldsData((prev) => ({
        ...prev,
        [selectedCustData.id]: {
          'AI Generated Summary': mockNsResponse.custentity13,
          'Industry Type': mockNsResponse.custentity16,
          'Company Size': mockNsResponse.custentity15,
          'Email': mockNsResponse.email,
          'Phone': mockNsResponse.phone
        }
      }));
      setNsData((prev) => ({
        ...prev,
        [selectedCustData.id]: { ...mockNsResponse, syncedAt: timestamp.toISOString(), account: selectedAccount }
      }));
      setSyncHistory((prev) => ({ ...prev, [selectedCustData.id]: timestamp }));
      setLastSyncTime(timestamp);
      setActionStatus({ type: 'success', message: 'NetSuite data synced' });
      pushToast('NetSuite data synced', 'success');
    } catch (err) {
      console.error(err);
      setActionStatus({ type: 'error', message: 'Sync failed - check console' });
      pushToast('Sync failed', 'error');
    } finally {
      setSyncLoading(false);
      setTimeout(() => setActionStatus(null), 4000);
    }
  }, [selectedCustData, selectedAccount, pushToast]);

  const handleNoteChange = (value: string) => {
    if (!selectedCustData) return;
    setDemoNotes((prev) => ({ ...prev, [selectedCustData.id]: value }));
  };

  const quickActions: QuickAction[] = useMemo(() => {
    if (!selectedCustData) {
      return [];
    }
    return [
      {
        id: 'project',
        label: 'Create Demo Project',
        description: 'Seed SuiteProjects with scoped tasks',
        action: () =>
          copyToClipboard(
            `Create a project for ${selectedCustData.name} titled "[Demo Project]" with entity ID [PRJ-DEMO-####] and 5 tasks tied to ${selectedCustData.industry}.`,
            'quick-project',
            'Project prompt'
          )
      },
      {
        id: 'time',
        label: 'Generate Time Entries',
        description: '10 entries across 3 consultants',
        action: () =>
          copyToClipboard(
            `Create 10 approved time entries for ${selectedCustData.name} demo covering 3 resources with realistic hours across ${new Date().getFullYear()}.`,
            'quick-time',
            'Time entry prompt'
          )
      },
      {
        id: 'estimate',
        label: 'Draft Estimate',
        description: 'Services + T&E mix',
        action: () =>
          copyToClipboard(
            `Create an estimate for ${selectedCustData.name} with Professional Services (60%), Travel (20%), and Software (20%) totaling ${
              selectedCustData.budget.split('-')[0] || '$150K'
            }.`,
            'quick-estimate',
            'Estimate prompt'
          )
      },
      {
        id: 'resource',
        label: 'Resource Forecast',
        description: '12-week utilization model',
        action: () =>
          copyToClipboard(
            `Build resource allocation forecast for ${selectedCustData.name} with roles ${selectedCustData.focus.join(', ')} at 60-100% utilization across 12 weeks.`,
            'quick-resource',
            'Resource prompt'
          )
      },
      {
        id: 'sync',
        label: syncLoading ? 'Syncing...' : 'Sync NetSuite',
        description: lastSyncDisplay,
        action: syncNetsuiteFields,
        disabled: syncLoading
      }
    ];
  }, [selectedCustData, syncLoading, lastSyncDisplay, copyToClipboard, syncNetsuiteFields]);

  const filteredPrompts: PromptCategory[] = useMemo(() => {
    if (!promptSearch) return PROMPT_CATEGORIES;
    return PROMPT_CATEGORIES.map((cat) => ({
      ...cat,
      prompts: cat.prompts.filter((prompt) => prompt.toLowerCase().includes(promptSearch.toLowerCase()))
    })).filter((cat) => cat.prompts.length > 0);
  }, [promptSearch]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`sticky top-0 z-40 border-b ${theme === 'dark' ? 'bg-gray-900/90 border-gray-800' : 'bg-white/90 border-gray-200'} backdrop-blur` }>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Building2 className="h-9 w-9 text-blue-600" />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Demo Prep</p>
              <h1 className="text-2xl font-semibold">NetSuite Resource Planner</h1>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {ACCOUNTS.map((account) => (
              <button
                key={account.id}
                onClick={() => setSelectedAccount(account.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                  account.id === selectedAccount
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-transparent text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {account.name}
              </button>
            ))}
            <button
              onClick={() => setShowClipboardPanel(true)}
              className="px-4 py-2 rounded-full border border-gray-300 dark:border-gray-700 text-sm font-medium"
            >
              Clipboard ({clipboardHistory.length})
            </button>
            <button
              onClick={() => setShowQuickCreate(true)}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow"
            >
              <Plus size={16} /> Add Prospect
            </button>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="p-2 rounded-full border border-gray-300 dark:border-gray-700"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
          </div>
          <button
            className="md:hidden p-2 rounded-lg border border-gray-300"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <Menu size={20} />
          </button>
        </div>
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              {ACCOUNTS.map((account) => (
                <button
                  key={account.id}
                  onClick={() => setSelectedAccount(account.id)}
                  className={`flex-1 min-w-[150px] px-4 py-2 rounded-full text-sm font-medium border ${
                    account.id === selectedAccount
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 dark:border-gray-700'
                  }`}
                >
                  {account.name}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700"
                onClick={() => setShowClipboardPanel(true)}
                aria-label="Open clipboard history"
              >
                Clipboard ({clipboardHistory.length})
              </button>
              <button className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={() => setShowQuickCreate(true)}>
                <Plus size={16} className="inline mr-2" /> Add Prospect
              </button>
              <button
                className="p-2 rounded-lg border border-gray-300 dark:border-gray-700"
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <PrepMissionBanner
          selectedCustomer={selectedCustData}
          prepCompletion={prepCompletion}
          completedSteps={completedSteps}
          prepWorkflow={prepWorkflow}
          lastSyncDisplay={lastSyncDisplay}
          statusCounts={statusCounts}
        />

        <AdvancedSearch
          onFiltersChange={(filters: SearchFilters) => {
            setGlobalSearchQuery(filters.query);
            if (filters.status) {
              setStatusFilter(filters.status);
            }
          }}
          className="mb-4"
          showAdvancedFilters
        />

        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex gap-4">
            {DASHBOARD_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 text-sm font-semibold border-b-2 pb-2 ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'context' && (
          <section className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1 space-y-4">
              <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">Prospects</h3>
                    <p className="text-xs text-gray-500">{ACCOUNTS.find((a) => a.id === selectedAccount)?.vertical}</p>
                  </div>
                </div>
                <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      value={globalSearchQuery}
                      onChange={(e) => setGlobalSearchQuery(e.target.value)}
                      placeholder="Search prospects or industries"
                      className="pl-9 pr-3 py-2 w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-transparent"
                    />
                  </div>
                </div>
                <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800">
                  {filteredCustomers.map((prospect) => (
                    <button
                      key={prospect.id}
                      onClick={() => setSelectedCustomer(prospect.id)}
                      className={`w-full text-left px-4 py-3 flex flex-col gap-1 transition-colors ${
                        selectedCustomer === prospect.id ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{prospect.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${formatStatus(prospect.status)}`}>
                          {prospect.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{prospect.industry}</p>
                      <p className="text-xs text-gray-400">Budget {prospect.budget} • Demo {prospect.demoDate}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border bg-white dark:bg-gray-900 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="h-4 w-4 text-blue-600" />
                  <h4 className="font-semibold text-sm">Guided Checklist</h4>
                </div>
                <div className="space-y-3">
                  {prepWorkflow.map((step) => (
                    <div key={step.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Check className={`h-4 w-4 ${step.done ? 'text-green-500' : 'text-gray-400'}`} />
                        <span>{step.label}</span>
                      </div>
                      <span className="text-xs text-gray-500">{step.done ? 'Done' : 'Pending'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              {selectedCustData ? (
                <div className="space-y-6">
                  <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-sm">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.3em] text-blue-100">Active Prospect</p>
                          <h2 className="text-2xl font-semibold">{selectedCustData.name}</h2>
                          <p className="text-blue-100">{selectedCustData.industry}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${formatStatus(selectedCustData.status)}`}>
                          {selectedCustData.status}
                        </span>
                      </div>
                      {selectedCustData.website && (
                        <a
                          href={selectedCustData.website}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-blue-100 underline mt-2"
                        >
                          View company site
                        </a>
                      )}
                    </div>

                    <div className="p-6 space-y-6">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Entity ID</p>
                          <p className="text-lg font-semibold">{selectedCustData.entityid}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Company Size</p>
                          <p className="text-lg font-semibold">{selectedCustData.size}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Budget</p>
                          <p className="text-lg font-semibold">{selectedCustData.budget}</p>
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Demo Date</p>
                          <p className="text-lg font-semibold">{selectedCustData.demoDate}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Focus Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCustData.focus.map((item) => (
                            <span key={item} className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 border border-blue-200">
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      <QuickActionsDeck actions={quickActions} actionStatus={actionStatus} />

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-gray-500 mb-2">Demo Notes</p>
                          <textarea
                            value={demoNotes[selectedCustData.id] || ''}
                            onChange={(e) => handleNoteChange(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent p-3"
                            rows={4}
                            placeholder="Capture storylines, objections, or next steps"
                          />
                        </div>
                        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Custom Fields</p>
                            <button
                              onClick={syncNetsuiteFields}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Refresh
                            </button>
                          </div>
                          {!customFieldsData[selectedCustData.id] ? (
                            <div className="text-sm text-gray-500">Sync NetSuite to load AI summaries + contact info.</div>
                          ) : (
                            <div className="space-y-2 text-sm">
                              {Object.entries(customFieldsData[selectedCustData.id]).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-xs border-b border-dashed border-gray-200 dark:border-gray-700 pb-1">
                                  <span className="text-gray-500">{key}</span>
                                  <span className="font-semibold">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <a
                          href={`https://${ACCOUNTS.find((a) => a.id === selectedAccount)?.instance}.app.netsuite.com/app/common/entity/customer.nl?id=${selectedCustData.nsId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-medium"
                        >
                          Open in NetSuite
                        </a>
                        <button
                          onClick={syncNetsuiteFields}
                          className="px-5 py-2 rounded-full border border-blue-600 text-blue-600 text-sm font-medium"
                          disabled={syncLoading}
                        >
                          {syncLoading ? 'Syncing...' : 'Sync NetSuite Data'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border bg-white dark:bg-gray-900 p-10 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="text-lg font-semibold mt-4">Select a prospect to get started</h3>
                  <p className="text-gray-500 mt-2">Choose a customer from the list to view quick actions, custom fields, and prep guidance.</p>
                  <button className="mt-6 px-6 py-3 rounded-full bg-blue-600 text-white" onClick={() => setShowQuickCreate(true)}>
                    Add New Prospect
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'prompts' && (
          <PromptLibrary
            promptSearch={promptSearch}
            onPromptSearchChange={setPromptSearch}
            filteredPrompts={filteredPrompts}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            copyPrompt={handlePromptCopy}
          />
        )}

        {activeTab === 'demo-builder' && (
          <section className="space-y-6">
            <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wand2 className="h-5 w-5 text-purple-600" />
                <h3 className="text-lg font-semibold">AI Scenario Builder</h3>
              </div>
              <p className="text-sm text-gray-500 mb-4">Generate website-specific prompts, module recommendations, and demo talk tracks.</p>
              <button
                className="px-4 py-2 rounded-full bg-purple-600 text-white"
                onClick={() => setShowScenarioGenerator(true)}
              >
                Launch Scenario Generator
              </button>
            </div>
          </section>
        )}

        {activeTab === 'export' && (
          <section className="space-y-6">
            <div className="rounded-2xl border bg-white dark:bg-gray-900 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Download className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold">Export Synced Records</h3>
              </div>
              <DataExport data={netsuiteExportData} onExportComplete={(success) => pushToast(success ? 'Export complete' : 'Export failed', success ? 'success' : 'error')} />
            </div>
          </section>
        )}
      </main>

      {showQuickCreate && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          onKeyDown={(event) => handleOverlayKeyDown(event, () => setShowQuickCreate(false), quickCreateRef.current)}
        >
          <div
            ref={quickCreateRef}
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold">Create New Prospect</h3>
                <p className="text-sm text-gray-500">Capture discovery context so you can build demos faster.</p>
              </div>
              <button className="p-2" onClick={() => setShowQuickCreate(false)} aria-label="Close quick create modal">
                <X size={18} />
              </button>
            </div>
            <QuickCreateForm
              onCreate={(prospect) => {
                setDynamicCustomers((prev) => [prospect, ...prev]);
                setSelectedCustomer(prospect.id);
                setShowQuickCreate(false);
                pushToast(`${prospect.name} added`, 'success');
              }}
            />
          </div>
        </div>
      )}

      {showScenarioGenerator && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4"
          onKeyDown={(event) => handleOverlayKeyDown(event, () => setShowScenarioGenerator(false), scenarioRef.current)}
        >
          <div
            ref={scenarioRef}
            tabIndex={-1}
            className="bg-white dark:bg-gray-900 rounded-2xl p-4 max-w-3xl w-full shadow-2xl"
          >
            <button
              className="ml-auto mb-2 p-2 text-gray-500 hover:text-gray-700"
              onClick={() => setShowScenarioGenerator(false)}
              aria-label="Close scenario generator"
            >
              <X size={18} />
            </button>
            <ScenarioGenerator onScenarioGenerated={handleScenarioGenerated} onClose={() => setShowScenarioGenerator(false)} />
          </div>
        </div>
      )}

      <ClipboardHistoryPanel
        show={showClipboardPanel}
        history={clipboardHistory}
        onClose={() => setShowClipboardPanel(false)}
        onClear={() => setClipboardHistory([])}
        onCopy={(text) => copyToClipboard(text, 'history', 'Re-copied prompt')}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
};

interface QuickCreateFormProps {
  onCreate: (prospect: Prospect) => void;
}

const QuickCreateForm: React.FC<QuickCreateFormProps> = ({ onCreate }) => {
  const [form, setForm] = useState({
    name: '',
    industry: '',
    status: 'Active',
    size: '100-200',
    budget: '$150K+',
    focus: 'Resource Planning, Billing',
    website: '',
    demoDate: 'TBD'
  });

  const isValid = form.name.trim() && form.industry.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase text-gray-500">Company Name *</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
            placeholder="Acme Corp"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Industry *</label>
          <input
            value={form.industry}
            onChange={(e) => setForm({ ...form, industry: e.target.value })}
            className="input"
            placeholder="Professional Services"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Company Size</label>
          <input
            value={form.size}
            onChange={(e) => setForm({ ...form, size: e.target.value })}
            className="input"
            placeholder="100-200"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Budget</label>
          <input
            value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })}
            className="input"
            placeholder="$250K"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Focus Areas</label>
          <input
            value={form.focus}
            onChange={(e) => setForm({ ...form, focus: e.target.value })}
            className="input"
            placeholder="Resource Planning, Billing"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Website</label>
          <input
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="input"
            placeholder="https://example.com"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Demo Date</label>
          <input
            value={form.demoDate}
            onChange={(e) => setForm({ ...form, demoDate: e.target.value })}
            className="input"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="input"
          >
            <option value="Hot">Hot</option>
            <option value="Active">Active</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 rounded-full border" onClick={() => setForm({
          name: '',
          industry: '',
          status: 'Active',
          size: '100-200',
          budget: '$150K+',
          focus: 'Resource Planning, Billing',
          website: '',
          demoDate: 'TBD'
        })}>
          Reset
        </button>
        <button
          className="px-4 py-2 rounded-full border"
          disabled={!isValid}
          onClick={() => onCreate({
            id: Date.now(),
            name: form.name,
            entityid: `${form.name.replace(/\s+/g, '-')}-Demo`,
            industry: form.industry,
            size: form.size,
            status: form.status,
            demoDate: form.demoDate || 'TBD',
            focus: form.focus.split(',').map((item) => item.trim()).filter(Boolean),
            budget: form.budget || '$150K+',
            nsId: Math.floor(Math.random() * 4000) + 2000,
            website: form.website
          })}
        >
          Create Prospect
        </button>
      </div>
    </div>
  );
};

interface ClipboardHistoryProps {
  show: boolean;
  history: { id: string; label: string; text: string; timestamp: Date }[];
  onClose: () => void;
  onClear: () => void;
  onCopy: (text: string) => void;
}

const ClipboardHistoryPanel: React.FC<ClipboardHistoryProps> = ({ show, history, onClose, onClear, onCopy }) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (show) {
      focusFirstElement(panelRef.current);
    }
  }, [show]);

  return (
    <div
      className={`fixed right-0 top-0 h-full w-full max-w-sm transform duration-300 z-40 ${
        show ? 'translate-x-0' : 'translate-x-full'
      }`}
      role="dialog"
      aria-modal="true"
      onKeyDown={(event) => handleOverlayKeyDown(event, onClose, panelRef.current)}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-xl flex flex-col"
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-semibold">Clipboard History</h4>
            <p className="text-xs text-gray-500">Recently copied prompts</p>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button className="text-xs text-blue-600" onClick={onClear}>
                Clear
              </button>
            )}
            <button className="p-1" onClick={onClose} aria-label="Close clipboard history">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 && (
            <p className="text-sm text-gray-500">Copy prompts to see them here.</p>
          )}
          {history.map((item) => (
            <div key={item.id} className="border rounded-xl p-3">
              <p className="text-xs tracking-[0.2em] uppercase text-gray-500">{item.label}</p>
              <p className="text-sm mt-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{item.text}</p>
              <div className="flex items-center justify-between mt-3 text-xs text-gray-500">
                <span>{item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <button className="text-blue-600" onClick={() => onCopy(item.text)}>Copy Again</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ToastStack: React.FC<{ toasts: ToastMessage[] }> = ({ toasts }) => (
  <div className="fixed bottom-6 right-6 space-y-3 z-50">
    {toasts.map((toast) => (
      <div
        key={toast.id}
        className={`px-4 py-3 rounded-xl shadow-lg text-white ${
          toast.type === 'success'
            ? 'bg-green-500'
            : toast.type === 'error'
            ? 'bg-red-500'
            : 'bg-blue-500'
        }`}
      >
        {toast.message}
      </div>
    ))}
  </div>
);

export default DemoDashboard;
