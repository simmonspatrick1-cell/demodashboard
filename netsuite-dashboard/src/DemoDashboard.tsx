import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Search, Menu, X, Building2, Check, BookOpen, ChevronDown, ChevronRight, Zap, Target, Users, Clock, FileText, TrendingUp, Loader, BarChart3, Download, ListChecks, AlertCircle, Plus, Copy, User, Wand2 } from 'lucide-react';
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
  const [showClipboardPanel, setShowClipboardPanel] = useState(false);
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
        email
