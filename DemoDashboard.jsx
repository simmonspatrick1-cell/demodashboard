import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Settings, User, Users, Zap, ChevronRight, Copy, Check, BookOpen, ChevronDown, Target, Building2, Mail, Phone, MoreVertical, Play, Plus, FileText, Clock, TrendingUp, AlertCircle, Loader, RefreshCw, Database, Globe, X } from 'lucide-react';
// Import the NetSuite service
// import NetSuiteService from './netsuite-service';
import { exportViaEmail, createExportData, validateNetSuiteFields, computeIdempotencyKey } from './email-export-utils';
import { ITEM_CONFIG, ESTIMATE_PRESETS, AVAILABLE_ITEMS } from './src/itemConfig';
import ReferenceDataManager from './src/ReferenceDataManager';
import { ClassSelector, DepartmentSelector, LocationSelector } from './src/ReferenceDataSelector';
import PromptImporter from './src/PromptImporter';
// import { NETSUITE_CLASSES, NETSUITE_DEPARTMENTS, NETSUITE_EMPLOYEES, NETSUITE_LOCATIONS } from './src/netsuiteData';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getNewProspectTemplate = () => ({
  name: '',
  entityid: '',
  type: 'Company',
  status: 'CUSTOMER-Closed Won',
  demoDate: '',
  nsId: null,
  website: '',
  salesRep: 'Will Clark',
  leadSource: 'Web',
  subsidiary: '2',
  phone: '',
  email: '',
  invoiceEmail: 'ap@netsuite.com',
  paymentEmail: 'ap@netsuite.com'
});

export default function DemoDashboard() {
  // ============ STATE MANAGEMENT ============
  const [activeTab, setActiveTab] = useState('context'); // 'context', 'prompts', 'items', 'reference'
  const [selectedAccount, setSelectedAccount] = useState('services');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [promptSearch, setPromptSearch] = useState('');
  const [debouncedPromptSearch, setDebouncedPromptSearch] = useState('');
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [clipboardHistory, setClipboardHistory] = useState([]);
  const [showClipboardHistory, setShowClipboardHistory] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [formErrors, setFormErrors] = useState({});
  const [recentItems, setRecentItems] = useState([]); // Track recently viewed/used items
  const [exportHistory, setExportHistory] = useState([]); // Track export history
  const [showShortcutsModal, setShowShortcutsModal] = useState(false); // Keyboard shortcuts help
  const [quickFilter, setQuickFilter] = useState(null); // Quick filter state: 'lead', 'prospect', 'customer', null
  const [selectedItems, setSelectedItems] = useState(new Set()); // Bulk selection
  const [showBulkActions, setShowBulkActions] = useState(false); // Show bulk actions bar
  const [promptCategories, setPromptCategories] = useState([
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
  ]);

  // Refs for auto-focus
  const nameInputRef = useRef(null);
  const modalRef = useRef(null);
  const settingsModalRef = useRef(null);
  const statusRegionRef = useRef(null);
  const searchInputRef = useRef(null);
  const prospectSearchInputRef = useRef(null);
  const promptSearchInputRef = useRef(null);
  const STATUS_OPTIONS = [
    'LEAD-Unqualified',
    'LEAD-Qualified',
    'PROSPECT-In Discussion',
    'PROSPECT-Proposal',
    'PROSPECT-Scoping Completed',
    'CUSTOMER-Closed Won'
  ];

  const LEAD_SOURCE_OPTIONS = ['Ad', 'Other', 'Partner Referral', 'Trade Show', 'Web'];

  const [prospects, setProspects] = useState([
    { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'LEAD-Qualified', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161, website: 'advisorhr.com' },
    { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'PROSPECT-In Discussion', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834, website: 'gsbgroup.com' },
    { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'PROSPECT-Proposal', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938, website: 'innovatia.net' },
    { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy/Midstream', size: '100-150', status: 'PROSPECT-Scoping Completed', demoDate: 'Nov 12', focus: ['Project Accounting', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662, website: 'maraboumidstream.com' },
    { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'LEAD-Unqualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938, website: 'lovsesurveys.com' },
    { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'PROSPECT-Proposal', demoDate: 'Pending', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285, website: 'nfrontconsulting.com' },
    { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'CUSTOMER-Closed Won', demoDate: 'Nov 20', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938, website: 'formativegroup.com' },
  ]);
  const getStatusBadgeClass = (status) => {
    if (status.startsWith('LEAD-')) {
      return 'border-l-yellow-300 bg-yellow-50 text-yellow-700';
    }
    if (status.startsWith('PROSPECT-')) {
      return 'border-l-orange-300 bg-orange-50 text-orange-700';
    }
    if (status.startsWith('CUSTOMER-')) {
      return 'border-l-green-300 bg-green-50 text-green-700';
    }
    return 'border-l-gray-300 bg-gray-50 text-gray-600';
  };
  const [newProspect, setNewProspect] = useState(getNewProspectTemplate);

  // Load Prospects from local storage
  useEffect(() => {
    const savedProspects = localStorage.getItem('demodashboard_prospects');
    if (savedProspects) {
      try {
        setProspects(JSON.parse(savedProspects));
      } catch (e) {
        console.error('Failed to parse saved prospects', e);
      }
    }
  }, []);

  // Save Prospects to local storage
  useEffect(() => {
    localStorage.setItem('demodashboard_prospects', JSON.stringify(prospects));
  }, [prospects]);

  // Load Prompt Categories from local storage
  useEffect(() => {
    const savedPrompts = localStorage.getItem('demodashboard_prompts');
    if (savedPrompts) {
      try {
        setPromptCategories(JSON.parse(savedPrompts));
      } catch (e) {
        console.error('Failed to parse saved prompts', e);
      }
    }
  }, []);

  // Save Prompt Categories to local storage
  useEffect(() => {
    localStorage.setItem('demodashboard_prompts', JSON.stringify(promptCategories));
  }, [promptCategories]);

  // Load API Key from local storage
  useEffect(() => {
    const savedKey = localStorage.getItem('demodashboard_claude_key');
    if (savedKey) {
      setClaudeApiKey(savedKey);
    }
    // No default hardcoded key - rely on backend environment variables if not set
  }, []);

  // Save API Key to local storage
  const saveClaudeKey = (key) => {
    const trimmedKey = key.trim();
    setClaudeApiKey(trimmedKey);
    localStorage.setItem('demodashboard_claude_key', trimmedKey);
  };

  // Debounced search query
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPromptSearch(promptSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [promptSearch]);

  // Keyboard navigation: ESC to close modals, Cmd+K for search, Cmd+1-5 for tabs, Cmd+N for new prospect
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger shortcuts when typing in inputs, textareas, or modals are open
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || showAddProspectModal || showSettingsModal || showShortcutsModal) {
        if (e.key === 'Escape') {
          if (showAddProspectModal && !isGeneratingAI) {
            setShowAddProspectModal(false);
            setFormErrors({});
          }
          if (showSettingsModal) {
            setShowSettingsModal(false);
          }
        }
        return;
      }

        // Cmd+K or Ctrl+K: Focus search (context-aware)
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          if (activeTab === 'context') {
            prospectSearchInputRef.current?.focus();
          } else if (activeTab === 'prompts') {
            promptSearchInputRef.current?.focus();
          }
          return;
        }

      // Cmd+N or Ctrl+N: New prospect
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setShowAddProspectModal(true);
        return;
      }

      // Cmd+1-5: Switch tabs
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '5') {
        e.preventDefault();
        const tabMap = {
          '1': 'context',
          '2': 'prompts',
          '3': 'items',
          '4': 'projects',
          '5': 'reference'
        };
        const tabId = tabMap[e.key];
        if (tabId) {
          setActiveTab(tabId);
        }
        return;
      }

      // ?: Show keyboard shortcuts
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // ESC: Close modals
      if (e.key === 'Escape') {
        if (showAddProspectModal && !isGeneratingAI) {
          setShowAddProspectModal(false);
          setFormErrors({});
        }
        if (showSettingsModal) {
          setShowSettingsModal(false);
        }
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddProspectModal, showSettingsModal, isGeneratingAI, activeTab]);

  // Auto-focus first input when modal opens
  useEffect(() => {
    if (showAddProspectModal && nameInputRef.current) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [showAddProspectModal]);

  // Click outside to close modal
  const handleModalClickOutside = useCallback((e, modalRef, setModal) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      if (!isGeneratingAI) {
        setModal(false);
        setFormErrors({});
      }
    }
  }, [isGeneratingAI]);

  // Helper function to close Add Prospect modal
  const closeAddProspectModal = useCallback(() => {
    if (!isGeneratingAI) {
      setShowAddProspectModal(false);
      setFormErrors({});
    }
  }, [isGeneratingAI]);

  const validateField = useCallback((field, value, enforceRequired = false) => {
    const trimmedValue = value ? value.trim() : '';
    if (field === 'name') {
      if (enforceRequired && !trimmedValue) {
        return 'Company Name is required';
      }
      return null;
    }

    if (field === 'entityid') {
      if (enforceRequired && !trimmedValue) {
        return 'Entity ID is required';
      }
      if (trimmedValue && !/^[A-Za-z0-9_-]+$/.test(trimmedValue)) {
        return 'Entity ID can only contain letters, numbers, dashes, and underscores';
      }
      return null;
    }

    if (['email', 'invoiceEmail', 'paymentEmail'].includes(field)) {
      if (trimmedValue && !EMAIL_REGEX.test(trimmedValue)) {
        return 'Please enter a valid email address';
      }
    }

    return null;
  }, []);

  // AI Generation Handler
  // AI Response Cache (24 hour TTL)
  const getCachedAIResponse = (type, content) => {
    try {
      const cacheKey = `ai_cache_${type}_${typeof content === 'string' ? content : JSON.stringify(content)}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        const ttl = 24 * 60 * 60 * 1000; // 24 hours
        if (age < ttl) {
          return data;
        }
        localStorage.removeItem(cacheKey);
      }
    } catch (e) {
      // Ignore cache errors
    }
    return null;
  };

  const setCachedAIResponse = (type, content, data) => {
    try {
      const cacheKey = `ai_cache_${type}_${typeof content === 'string' ? content : JSON.stringify(content)}`;
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (e) {
      // Ignore cache errors (storage full, etc.)
    }
  };

  const generateFromAI = async (type, content, isRetry = false) => {
    // Check cache first (skip for retries)
    if (!isRetry) {
      const cached = getCachedAIResponse(type, content);
      if (cached) {
        setActionStatus('✓ Using cached result');
        setTimeout(() => setActionStatus(null), 2000);
        return cached;
      }
    }

    setIsGeneratingAI(true);
    setActionStatus(isRetry ? '🔄 Retrying with system key...' : '🤖 Analyzing...');
    
    try {
      // Ensure URL has protocol
      let url = content;
      if (type === 'analyze_url' && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      // If retrying, explicitly send NO key to force system key usage
      let payload = { 
        type, 
        content: url, 
        apiKey: isRetry ? '' : claudeApiKey 
      };
      
      // Add additional data for new AI types
      if (type === 'suggest_tasks' || type === 'generate_estimate' || type === 'generate_project') {
        payload = {
          type,
          content: '',
          apiKey: isRetry ? '' : claudeApiKey,
          projectData: content.projectData || {},
          customerData: content.customerData || {},
          tasks: content.tasks || [],
          currentProject: content.currentProject || {}
        };
      }

      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      // Check for API key errors and auto-retry
      if (!response.ok || data.error) {
        const errorMessage = data.error || `HTTP ${response.status}`;
        
        // If invalid key and we haven't retried yet
        if ((errorMessage.includes('invalid x-api-key') || errorMessage.includes('authentication_error')) && !isRetry && claudeApiKey) {
          console.log('Invalid custom key detected. Clearing and retrying with system key...');
          
          // Clear the bad key from storage and state
          localStorage.removeItem('demodashboard_claude_key');
          setClaudeApiKey('');
          
          // Retry immediately
          return generateFromAI(type, content, true);
        }
        
        throw new Error(errorMessage);
      }

      if (data.raw) {
        console.warn('Claude returned non-JSON:', data.raw);
        throw new Error('Could not parse AI response. Please try again.');
      }

      if (type === 'analyze_url') {
        // Auto-fill prospect form
        const updates = {
          website: content
        };
        
        if (data.name) updates.name = data.name;
        if (data.entityId) updates.entityid = data.entityId;
        if (data.type) updates.type = data.type;
        if (data.status) updates.status = data.status;
        updates.salesRep = data.salesRep || 'Will Clark';
        if (data.leadSource) updates.leadSource = data.leadSource;
        updates.subsidiary = data.subsidiary || '2';
        if (data.phone) updates.phone = data.phone;
        if (data.email) updates.email = data.email;
        updates.invoiceEmail = data.invoiceEmail || 'ap@netsuite.com';
        updates.paymentEmail = data.paymentEmail || 'ap@netsuite.com';
        
        console.log('Updating prospect with:', updates);
        
        setNewProspect(prev => ({
          ...prev,
          ...updates
        }));
        
        const fieldsUpdated = Object.keys(updates).filter(k => k !== 'website').length;
        setActionStatus(`✓ Analyzed! ${fieldsUpdated} fields found.`);
        
        // Auto-focus the first empty required field after analysis
        setTimeout(() => {
          if (!updates.name && nameInputRef.current) {
            nameInputRef.current.focus();
          } else if (!updates.entityid) {
            const entityInput = document.getElementById('entity-id');
            entityInput?.focus();
          }
        }, 100);
      } else if (type === 'summarize_clipboard') {
        // Copy summary to clipboard history as a new item
        const summary = `## AI Summary\n\n${data.summary}`;
        setClipboardHistory(prev => [{ text: summary, timestamp: new Date() }, ...prev]);
        // Also put it in the clipboard
        navigator.clipboard.writeText(summary);
        setActionStatus('✓ Summary copied to clipboard!');
        return data;
      } else if (type === 'suggest_tasks' || type === 'generate_estimate' || type === 'generate_project') {
        // For new AI types, just return the data - caller will handle it
        // Cache the response
        if (!isRetry) {
          setCachedAIResponse(type, content, data);
        }
        return data;
      }
      
      // Cache successful responses
      if (!isRetry && !data.error) {
        setCachedAIResponse(type, content, data);
      }
      
      return data;
    } catch (error) {
      console.error('AI Error:', error);
      setActionStatus(`⚠ AI Error: ${error.message}`);
      throw error; // Re-throw so caller can handle it
    } finally {
      setIsGeneratingAI(false);
      // Only auto-clear status for non-new types
      if (type !== 'suggest_tasks' && type !== 'generate_estimate' && type !== 'generate_project') {
        setTimeout(() => setActionStatus(null), 3000);
      }
    }
  };

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

  // ============ CUSTOMER FILTERING & SEARCH ============
  const filteredCustomers = useMemo(() => {
    let filtered = prospects;
    
    // Apply quick filter
    if (quickFilter) {
      filtered = filtered.filter(cust => {
        if (quickFilter === 'lead') return cust.status.startsWith('LEAD-');
        if (quickFilter === 'prospect') return cust.status.startsWith('PROSPECT-');
        if (quickFilter === 'customer') return cust.status.startsWith('CUSTOMER-');
        return true;
      });
    }
    
    // Apply search query
    const query = debouncedSearchQuery.toLowerCase();
    if (query) {
      filtered = filtered.filter(cust =>
        cust.name.toLowerCase().includes(query) ||
        (cust.industry && cust.industry.toLowerCase().includes(query)) ||
        cust.entityid.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [debouncedSearchQuery, prospects, quickFilter]);

  // Helper function to highlight search terms
  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 px-0.5 rounded">{part}</mark>
      ) : part
    );
  };

  const filteredPrompts = useMemo(() => {
    if (!debouncedPromptSearch) return promptCategories;
    return promptCategories.map(cat => ({
      ...cat,
      prompts: cat.prompts.filter(p => p.toLowerCase().includes(debouncedPromptSearch.toLowerCase()))
    })).filter(cat => cat.prompts.length > 0);
  }, [debouncedPromptSearch, promptCategories]);

  // ============ HELPER FUNCTIONS ============
  const formatPrompt = (prompt, customer) => {
    if (!customer) return prompt;
    
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    return prompt
      .replace(/\[Company Name\]/gi, customer.name)
      .replace(/\[Customer Name\]/gi, customer.name)
      .replace(/\[Customer\]/gi, customer.name)
      .replace(/\[Client\]/gi, customer.name)
      .replace(/\[Vertical\]/gi, customer.industry)
      .replace(/\[Industry\]/gi, customer.industry)
      .replace(/\[company size\]/gi, customer.size)
      .replace(/\[amount\]/gi, customer.budget)
      .replace(/\[Budget\]/gi, customer.budget)
      .replace(/\[Project Name\]/gi, `${customer.name} Implementation`)
      .replace(/\[PRJ####\]/gi, `PRJ-${customer.entityid}-${Math.floor(Math.random() * 1000)}`)
      .replace(/\[Date\]/gi, today)
      .replace(/\[Start\]/gi, today)
      .replace(/\[End\]/gi, futureDate)
      .replace(/\[contact info\]/gi, 'primary@example.com');
  };

  const copyToClipboard = (text, index, label = 'Copied!') => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setActionStatus(`✓ ${label}`);
    
    // Add to history
    setClipboardHistory(prev => {
      const newHistory = [{ text, timestamp: new Date() }, ...prev];
      return newHistory.slice(0, 20); // Keep last 20 items
    });
    
    // Track recent action
    setRecentItems(prev => {
      const newItem = { type: 'copy', text: text.substring(0, 50), timestamp: new Date() };
      return [newItem, ...prev.filter(item => item.text !== newItem.text)].slice(0, 10);
    });
    
    setTimeout(() => {
      setCopiedIndex(null);
      setActionStatus(null);
    }, 2000);
  };

  const toggleFavorite = (prompt) => {
    setFavorites(prev =>
      prev.includes(prompt) ? prev.filter(p => p !== prompt) : [...prev, prompt]
    );
  };

  // Handler for importing prompts from external source
  const handlePromptsImported = (importedPrompts) => {
    // Convert imported prompts to dashboard format
    const newCategories = Object.values(importedPrompts).map(cat => ({
      name: cat.label,
      prompts: cat.prompts.map(p => {
        // Handle both string prompts and object prompts with label/prompt/tags
        if (typeof p === 'string') {
          return p;
        } else if (p.prompt) {
          return p.prompt;
        } else {
          return p.label || '';
        }
      }).filter(prompt => prompt && prompt.trim().length > 0) // Remove empty prompts
    }));

    // Filter out any categories with no prompts
    const validCategories = newCategories.filter(cat => cat.prompts.length > 0);

    // Merge with existing prompts (imported prompts come first)
    const mergedCategories = [...validCategories, ...promptCategories];
    setPromptCategories(mergedCategories);

    setActionStatus(`✓ Imported ${validCategories.length} categories with prompts!`);
    setTimeout(() => setActionStatus(null), 5000);
  };

  const handleAddProspect = () => {
    const errors = {};
    ['name', 'entityid', 'email', 'invoiceEmail', 'paymentEmail'].forEach(field => {
      const enforceRequired = field === 'name' || field === 'entityid';
      const error = validateField(field, newProspect[field], enforceRequired);
      if (error) {
        errors[field] = error;
      }
    });

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      setActionStatus('⚠️ Please fix the errors below');
      setTimeout(() => setActionStatus(null), 3000);
      return;
    }

    const prospectToAdd = {
      ...newProspect,
      name: newProspect.name.trim(),
      entityid: newProspect.entityid.trim(),
      id: prospects.length + 1,
      nsId: null // Will be assigned when created in NetSuite
    };

    setProspects(prev => [...prev, prospectToAdd]);
    setShowAddProspectModal(false);
    setFormErrors({});
    setActionStatus('✓ Prospect added to list!');
    setTimeout(() => setActionStatus(null), 3000);

    // Auto-select the newly added prospect
    setSelectedCustomer(prospectToAdd.id);
    
    // Scroll to the new prospect in the list after a brief delay
    setTimeout(() => {
      const prospectElement = document.querySelector(`[data-prospect-id="${prospectToAdd.id}"]`);
      if (prospectElement) {
        prospectElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);

    // Reset form
    setNewProspect(getNewProspectTemplate());
    
    // Reset focus
    if (nameInputRef.current) {
      nameInputRef.current.blur();
    }
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (isGeneratingAI) return;
    handleAddProspect();
  };

  const syncNetsuiteFields = async () => {
    if (!selectedCustData) return;
    
    setSyncLoading(true);
    setActionStatus('Syncing from NetSuite...');
    
    try {
      // Prepare payload - either ID or search params
      const payload = {
        account: selectedAccount
      };

      if (selectedCustData.nsId) {
        payload.customerId = selectedCustData.nsId;
      } else {
        payload.entityId = selectedCustData.entityid;
        payload.companyName = selectedCustData.name;
      }

      // Call the Vercel API endpoint to fetch real NetSuite data
      const response = await fetch('/api/netsuite/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // If 404 and we were searching, just warn
        if (response.status === 404 && !selectedCustData.nsId) {
          throw new Error('Customer not found in NetSuite yet. Please wait a few minutes for the script to run.');
        }
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const customerData = await response.json();

      // If we found a new match for a local prospect, update it!
      if (!selectedCustData.nsId && customerData.id) {
        setProspects(prev => prev.map(p => 
          p.id === selectedCustData.id 
            ? { ...p, nsId: customerData.id, email: customerData.email, phone: customerData.phone } 
            : p
        ));
        setActionStatus('✓ Found & Linked to NetSuite!');
      } else {
        setActionStatus('✓ Synced successfully');
      }

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

    } catch (error) {
      console.error('Sync error:', error);
      
      if (!selectedCustData.nsId) {
         setActionStatus(`⚠ ${error.message}`);
      } else {
        setActionStatus('⚠ Sync Failed: ' + error.message);
        
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
      
      }
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

      // Prepare export data with hashtags (only NetSuite-compatible fields)
      const exportData = createExportData(customerData, null, {
        memo: demoNotes[selectedCustData.id] || '',
        estimate: {
          type: 'T&M',
          customer: selectedCustData.name,
          status: 'PENDING'
        }
      });

      // Validate fields before export
      const validation = validateNetSuiteFields(exportData);

      // Show validation feedback
      if (validation.warnings.length > 0) {
        const warningText = validation.warnings.map(w => w.replace('⚠️ ', '')).join('; ');
        setActionStatus(`⚠️ Export filtered invalid fields: ${warningText}`);
        setTimeout(() => {
          // Continue with export after showing warning
          performEmailExport(exportData);
        }, 2000);
      } else {
        performEmailExport(exportData);
      }

    } catch (error) {
      console.error('Email export error:', error);
      setActionStatus('⚠ Email export failed');
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  // Load export history from local storage
  useEffect(() => {
    const saved = localStorage.getItem('demodashboard_export_history');
    if (saved) {
      try {
        setExportHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse export history', e);
      }
    }
  }, []);

  // Save export history to local storage
  useEffect(() => {
    if (exportHistory.length > 0) {
      localStorage.setItem('demodashboard_export_history', JSON.stringify(exportHistory));
    }
  }, [exportHistory]);

  const performEmailExport = (exportData) => {
    try {
      // Export via email
      exportViaEmail(exportData, {
        recipientEmail: 'simmonspatrick1@gmail.com',
        includeInstructions: true,
        includeValidation: true
      });

      // Track export history
      const exportRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        customer: selectedCustData?.name || 'Unknown',
        customerId: selectedCustData?.id || null,
        type: 'email',
        data: {
          projectName: exportData.projectName || 'N/A',
          estimateType: exportData.estimate?.type || 'N/A',
          itemCount: exportData.items?.length || 0
        }
      };
      setExportHistory(prev => [exportRecord, ...prev.slice(0, 49)]); // Keep last 50

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
      memo: selectedCustData ? (demoNotes[selectedCustData.id] || '') : ''
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
          memo: demoNotes[selectedCustData.id] || ''
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
      action: async () => {
        if (!selectedCustData) {
          setActionStatus('⚠ Please select a customer first');
          setTimeout(() => setActionStatus(null), 2000);
          return;
        }

        // Check if user wants AI-generated estimate (if project tasks exist)
        // For now, use configured items - AI generation can be added as separate action
        const lineItems = customItems;
        
        // Calculate total from line items
        const calculatedTotal = Object.values(lineItems).reduce((sum, item) => {
          return sum + ((item.quantity || 1) * (item.salesPrice || item.rate || 0));
        }, 0);
        
        const estimateData = {
          type: 'T&M',
          customerId: selectedCustData.nsId,
          customer: selectedCustData.name,
          total: calculatedTotal,
          status: 'PENDING',
          dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
          class: selectedClass?.name || selectedClass?.id,
          classId: selectedClass?.id,
          department: selectedDepartment?.name || selectedDepartment?.id,
          departmentId: selectedDepartment?.id,
          location: selectedLocation?.name || selectedLocation?.id,
          locationId: selectedLocation?.id,
          items: Object.values(lineItems).map(item => ({
            name: item.name,  // NetSuite item ID (for mapping)
            displayName: item.displayName || item.name,  // Display name (for UI/export)
            description: item.description,
            quantity: item.quantity || 1,
            rate: item.salesPrice || item.rate || 0,
            purchasePrice: item.purchasePrice || 0
          }))
        };
        // Compute a deterministic idempotency key for this estimate to prevent duplicates in NetSuite
        const idKey = computeIdempotencyKey({
          customerId: estimateData.customerId,
          projectId: estimateData.projectId || null,
          dueDate: estimateData.dueDate || null,
          items: estimateData.items.map(it => ({
            name: it.name,
            displayName: it.displayName,
            qty: it.quantity,
            rate: it.rate
          }))
        });
        // Attach as externalId (preferred) and include top-level idempotencyKey for SuiteScript fallback
        estimateData.externalId = idKey;
        
        const exportData = createExportData(selectedCustData, null, {
          estimate: estimateData,
          memo: demoNotes[selectedCustData.id] || '',
          idempotencyKey: idKey
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
      action: syncNetsuiteFields
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Quick Actions</h3>
        {actionStatus && (
          <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm transition-all duration-300 animate-fade-in ${
            actionStatus.startsWith('✓') 
              ? 'text-green-700 bg-green-50 border border-green-200' 
              : actionStatus.startsWith('⚠') || actionStatus.startsWith('⚠️')
              ? 'text-orange-700 bg-orange-50 border border-orange-200'
              : actionStatus.startsWith('🔄')
              ? 'text-blue-700 bg-blue-50 border border-blue-200'
              : 'text-gray-700 bg-gray-50 border border-gray-200'
          }`}>
             {actionStatus.startsWith('✓') && <Check size={12} />}
             {actionStatus.startsWith('⚠') && <AlertCircle size={12} />}
             {actionStatus.startsWith('🔄') && <Loader size={12} className="animate-spin" />}
             <span>{actionStatus.replace(/^[✓⚠🔄]+\s*/, '')}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const isLoading = syncLoading && action.id === 'sync-netsuite';
          const isDisabled = (syncLoading && action.id !== 'sync-netsuite') || (!selectedCustData);
          const isLocalOnly = action.id === 'sync-netsuite' && selectedCustData && !selectedCustData.nsId;
          
          return (
            <button
              key={action.id}
              onClick={action.action}
              disabled={isDisabled}
              title={isLocalOnly ? 'Click to search and link to NetSuite record' : action.label}
              className={`
                relative group flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-200
                ${isLoading 
                  ? 'bg-blue-50 border-blue-100 text-blue-600 cursor-wait' 
                  : isDisabled 
                    ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                    : isLocalOnly
                      ? 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-300 hover:shadow-md hover:-translate-y-0.5'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5'
                }
              `}
            >
              <div className={`
                p-2 rounded-lg transition-colors
                ${isLocalOnly ? 'bg-orange-100 text-orange-600' : isDisabled ? 'bg-gray-100' : 'bg-gray-50 group-hover:bg-blue-50 group-hover:text-blue-600'}
              `}>
                {isLoading ? <Loader size={18} className="animate-spin" /> : <Icon size={18} />}
              </div>
              <span className="text-[10px] font-semibold text-center leading-tight">{action.label}</span>
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
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
             <RefreshCw size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-900">NetSuite Data Not Synced</p>
            <p className="text-xs text-blue-700 mt-0.5">Click "Sync NetSuite Data" to load custom fields.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Object.entries(fields).map(([key, value]) => (
          <div key={key} className="bg-gray-50 rounded-xl border border-gray-100 p-3 hover:bg-white hover:border-gray-200 hover:shadow-sm transition-all">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
            <p className="text-sm font-medium text-gray-900 truncate" title={value}>{value}</p>
          </div>
        ))}
      </div>
    );
  };

  // ============ COMPONENT: CUSTOMER CONTEXT PANEL ============
  const CustomerContextPanel = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-180px)] min-h-[600px]">
      {/* Customer List - Left Sidebar */}
      <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Users size={18} className="text-blue-600" /> Prospects
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                {filteredCustomers.length}
              </span>
              <button
                onClick={() => setShowShortcutsModal(true)}
                className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
                title="Keyboard Shortcuts (?)"
              >
                <BookOpen size={14} className="text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => setQuickFilter(quickFilter === 'lead' ? null : 'lead')}
              className={`text-xs px-2 py-1 rounded-md transition-all ${
                quickFilter === 'lead'
                  ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Leads
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === 'prospect' ? null : 'prospect')}
              className={`text-xs px-2 py-1 rounded-md transition-all ${
                quickFilter === 'prospect'
                  ? 'bg-orange-100 text-orange-700 border border-orange-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Prospects
            </button>
            <button
              onClick={() => setQuickFilter(quickFilter === 'customer' ? null : 'customer')}
              className={`text-xs px-2 py-1 rounded-md transition-all ${
                quickFilter === 'customer'
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Customers
            </button>
          </div>
          
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              ref={prospectSearchInputRef}
              type="text"
              placeholder="Search... (⌘K)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>
          
          {/* Bulk Selection Toggle */}
          <div className="mt-2 flex items-center justify-between">
            <button
              onClick={() => {
                if (selectedItems.size > 0) {
                  setSelectedItems(new Set());
                  setShowBulkActions(false);
                } else {
                  setShowBulkActions(true);
                }
              }}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              {showBulkActions ? 'Cancel Selection' : 'Select Multiple'}
            </button>
          </div>
          
          {/* Bulk Actions Bar */}
          {selectedItems.size > 0 && (
            <div className="mt-2 flex items-center justify-between p-2 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-xs font-medium text-blue-700">
                {selectedItems.size} selected
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    // Bulk export selected items
                    const selectedCustomers = prospects.filter(c => selectedItems.has(c.id));
                    setActionStatus(`✓ Preparing export for ${selectedCustomers.length} customers...`);
                    setTimeout(() => {
                      setSelectedItems(new Set());
                      setShowBulkActions(false);
                      setActionStatus(null);
                    }, 2000);
                  }}
                  className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Export Selected
                </button>
                <button
                  onClick={() => {
                    setSelectedItems(new Set());
                    setShowBulkActions(false);
                  }}
                  className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {filteredCustomers.map((customer) => {
            const statusBadgeClass = getStatusBadgeClass(customer.status);
            return (
              <button
                key={customer.id}
                data-prospect-id={customer.id}
                onClick={() => setSelectedCustomer(customer.id)}
                className={`w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-all group border-l-4 ${
                  selectedCustomer === customer.id 
                    ? 'bg-blue-50/50 border-l-blue-600' 
                    : 'border-l-transparent'
                }`}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {showBulkActions && (
                      <input
                        type="checkbox"
                        checked={selectedItems.has(customer.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSelected = new Set(selectedItems);
                          if (e.target.checked) {
                            newSelected.add(customer.id);
                          } else {
                            newSelected.delete(customer.id);
                          }
                          setSelectedItems(newSelected);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5"
                      />
                    )}
                    <span className={`font-semibold text-sm truncate ${selectedCustomer === customer.id ? 'text-blue-700' : 'text-gray-900'}`}>
                      {debouncedSearchQuery ? highlightText(customer.name, debouncedSearchQuery) : customer.name}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${statusBadgeClass}`}>
                    {customer.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{customer.industry}</span>
                  {!customer.nsId && (
                    <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                      LOCAL
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="p-3 border-t border-gray-100 bg-gray-50">
          <button
            onClick={() => setShowAddProspectModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-300 rounded-lg transition-all text-sm font-medium shadow-sm hover:shadow"
          >
            <Plus size={16} />
            Add New Prospect
          </button>
        </div>
      </div>

      {/* Details Area */}
      <div className="lg:col-span-8 xl:col-span-9 h-full overflow-y-auto pr-2 pb-4 custom-scrollbar">
        {selectedCustData ? (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-600 text-white p-2 rounded-lg shadow-md">
                      <Building2 size={24} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 leading-none">{selectedCustData.name}</h2>
                      <p className="text-sm text-gray-500 mt-1 font-medium">{selectedCustData.industry} • {selectedCustData.size} Employees</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                     {selectedCustData.focus.map((area, idx) => (
                      <span key={idx} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md border border-blue-100">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <a
                    href={`https://${currentAccount?.instance}.app.netsuite.com/app/common/entity/customer.nl?id=${selectedCustData.nsId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
                      selectedCustData.nsId 
                        ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <Target size={16} />
                    {selectedCustData.nsId ? 'Open in NetSuite' : 'Not in NetSuite'}
                    {selectedCustData.nsId && <ChevronRight size={14} />}
                  </a>
                  {selectedCustData.website && (
                    <a 
                      href={selectedCustData.website.startsWith('http') ? selectedCustData.website : `https://${selectedCustData.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-gray-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                    >
                      <Globe size={12} />
                      {selectedCustData.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                </div>
              </div>

              {/* Local Warning Banner */}
              {!selectedCustData.nsId && (
                <div className="mt-5 bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-3 animate-fade-in">
                  <AlertCircle size={18} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-orange-800">Prospect Not Synced</p>
                    <p className="text-xs text-orange-700 mt-0.5">
                      Use the <strong>Create Prospect</strong> action below to push this record to NetSuite.
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Quick Actions Grid */}
            <QuickActionsPanel />

            {/* Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {/* Reference Data */}
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:col-span-2">
                 <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                   <Database size={16} className="text-gray-400" />
                   Classification
                 </h3>
                 <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">Class</label>
                      <ClassSelector
                        value={selectedClass?.id || selectedClass?.name}
                        onChange={setSelectedClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">Department</label>
                      <DepartmentSelector
                        value={selectedDepartment?.id || selectedDepartment?.name}
                        onChange={setSelectedDepartment}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">Location</label>
                      <LocationSelector
                        value={selectedLocation?.id || selectedLocation?.name}
                        onChange={setSelectedLocation}
                      />
                    </div>
                 </div>
               </div>

               {/* Key Metrics */}
               <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                 <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                   <TrendingUp size={16} className="text-gray-400" />
                   Opportunity
                 </h3>
                 <div className="space-y-4">
                   <div>
                     <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">Budget</p>
                     <p className="text-lg font-bold text-green-600">{selectedCustData.budget}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">Demo Date</p>
                     <p className="text-sm font-medium text-gray-900">{selectedCustData.demoDate}</p>
                   </div>
                   <div>
                     <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wide">Entity ID</p>
                     <p className="text-sm font-mono text-gray-600">{selectedCustData.entityid}</p>
                   </div>
                 </div>
               </div>
            </div>

            {/* Custom Fields */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 ml-1">Synced Data</h3>
              <CustomFieldsPanel />
            </div>

            {/* AI Notes */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <Zap size={16} className="text-purple-500" />
                  AI Strategy & Notes
                </h3>
                <button 
                  onClick={() => {
                    // Add a copy action for notes
                    navigator.clipboard.writeText(demoNotes[selectedCustData.id] || '');
                    setActionStatus('✓ Notes copied!');
                    setTimeout(() => setActionStatus(null), 2000);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Copy
                </button>
              </div>
              <textarea
                value={demoNotes[selectedCustData.id] || ''}
                onChange={(e) => setDemoNotes({...demoNotes, [selectedCustData.id]: e.target.value})}
                placeholder="Paste your AI-generated strategy, meeting notes, or key pain points here..."
                className="w-full h-40 p-4 border border-gray-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono bg-gray-50/50 leading-relaxed"
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white rounded-xl border border-gray-200 border-dashed">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Users size={40} className="text-blue-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Prospect Selected</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              Select a prospect from the list on the left to view their details, strategy notes, and quick actions.
            </p>
            <button
              onClick={() => setShowAddProspectModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <Plus size={18} />
              Add New Prospect
            </button>
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
        
        {/* Rename Feature Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900 mb-2">🎯 Automatic Item Copy & Rename</p>
              <p className="text-xs text-blue-700 mb-2">
                When you add a <strong>Display Name</strong>, the system will:
              </p>
              <ol className="text-xs text-blue-700 space-y-1 ml-4">
                <li>1. Check if an item with that name already exists in NetSuite</li>
                <li>2. If not, <strong>copy the source NetSuite item</strong> and rename it</li>
                <li>3. The new item inherits all properties (rate, accounts, etc.) from the source</li>
                <li>4. Use the new item in your estimate</li>
              </ol>
              <p className="text-xs text-blue-700 mt-2">
                <strong>Example:</strong> Rename "PS - Post Go-Live Support" to "Implementation Services" → 
                Creates a new NetSuite item called "Implementation Services" with the same rate ($175/hr) and settings.
              </p>
            </div>
          </div>
        </div>
        
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
                        quantity: item.quantity || 1,
                        salesPrice: item.salesPrice || item.rate || 0,
                        purchasePrice: item.purchasePrice || 0,
                        rate: item.rate || item.salesPrice || 0
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Estimate Line Items</h3>
          <button
            onClick={async () => {
              if (!selectedCustData) {
                setActionStatus('⚠ Please select a customer first');
                setTimeout(() => setActionStatus(null), 2000);
                return;
              }

              setIsGeneratingAI(true);
              setActionStatus('🤖 Generating estimate from project tasks...');

              try {
                // Get tasks from project config if available, otherwise use empty array
                // Note: This requires tasks to be in a shared state or passed differently
                // For now, we'll generate based on customer data and industry
                const result = await generateFromAI('generate_estimate', {
                  projectData: {
                    name: 'Demo Project',
                    budget: customFieldsData.custentity_esc_annual_revenue || 100000
                  },
                  customerData: {
                    name: selectedCustData.name,
                    industry: customFieldsData.custentity_esc_industry || selectedCustData.industry || 'Professional Services',
                    annualRevenue: customFieldsData.custentity_esc_annual_revenue || 100000
                  },
                  tasks: [] // Could be enhanced to get from project config
                });

                if (result.error) {
                  throw new Error(result.error);
                }

                if (result.items && Array.isArray(result.items)) {
                  // Convert AI response to customItems format
                  const newItems = {};
                  result.items.forEach((item, idx) => {
                    const key = `item_${idx + 1}`;
                    newItems[key] = {
                      name: item.name || 'PS - Post Go-Live Support',
                      displayName: item.name,
                      description: item.description || '',
                      quantity: item.quantity || 1,
                      salesPrice: item.rate || 0,
                      rate: item.rate || 0,
                      purchasePrice: 0
                    };
                  });

                  setCustomItems(newItems);
                  setActionStatus(`✓ Generated ${result.items.length} estimate line items! ${result.recommendations ? `(${result.recommendations})` : ''}`);
                } else {
                  throw new Error('Invalid estimate format');
                }
              } catch (error) {
                console.error('Estimate generation error:', error);
                setActionStatus(`⚠ Error: ${error.message}`);
              } finally {
                setIsGeneratingAI(false);
                setTimeout(() => setActionStatus(null), 5000);
              }
            }}
            disabled={!selectedCustData || isGeneratingAI}
            className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            title="AI-powered estimate generation based on customer and industry"
          >
            {isGeneratingAI ? (
              <>
                <Loader size={14} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Zap size={14} />
                AI Generate Estimate
              </>
            )}
          </button>
        </div>
        
        <div className="space-y-4">
          {Object.entries(customItems).map(([key, item]) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              {/* Display Name (Optional Rename) */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Name (Optional - creates a copy in NetSuite)
                </label>
                <input
                  type="text"
                  value={item.displayName || ''}
                  onChange={(e) => {
                    setCustomItems(prev => ({
                      ...prev,
                      [key]: { ...prev[key], displayName: e.target.value }
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={`Leave blank to use: ${item.name}`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 If you enter a name here, the system will copy the NetSuite item below and rename it. The new item will inherit all settings (rate, accounts, etc.).
                </p>
              </div>

              {/* NetSuite Item Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  NetSuite Item <span className="text-red-500">*</span>
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
              <div className="mb-4">
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

              {/* Quantity, Purchase Price, Sales Price */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={item.quantity || 1}
                    onChange={(e) => {
                      setCustomItems(prev => ({
                        ...prev,
                        [key]: { ...prev[key], quantity: parseInt(e.target.value) || 1 }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="1"
                  />
                </div>

                {/* Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.purchasePrice || 0}
                    onChange={(e) => {
                      setCustomItems(prev => ({
                        ...prev,
                        [key]: { ...prev[key], purchasePrice: parseFloat(e.target.value) || 0 }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                {/* Sales Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sales Price (Rate)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.salesPrice || item.rate || 0}
                    onChange={(e) => {
                      setCustomItems(prev => ({
                        ...prev,
                        [key]: { ...prev[key], salesPrice: parseFloat(e.target.value) || 0, rate: parseFloat(e.target.value) || 0 }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Total Amount Display */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700">Total Estimate Amount:</span>
            <span className="text-lg font-bold text-green-600">
              ${Object.values(customItems).reduce((sum, item) => sum + ((item.quantity || 1) * (item.salesPrice || item.rate || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">💡 This is calculated from: Quantity × Sales Price for each line item</p>
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

  // ============ COMPONENT: PROJECT CONFIGURATION ============
  const ProjectConfigPanel = () => {
    // Auto-load saved project data
    const loadSavedProject = () => {
      try {
        const saved = localStorage.getItem('demodashboard_project_draft');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.customerId === selectedCustData?.id) {
            return data;
          }
        }
      } catch (e) {
        // Ignore errors
      }
      return null;
    };

    const savedProject = loadSavedProject();
    
    const [projectName, setProjectName] = useState(
      savedProject?.projectName || (selectedCustData ? `${selectedCustData.name} - Demo Project` : '')
    );
    const [projectCode, setProjectCode] = useState(
      savedProject?.projectCode || (selectedCustData ? `PRJ-${selectedCustData?.entityid}-${Date.now()}` : `PRJ-${Date.now()}`)
    );
    const [projectManager, setProjectManager] = useState(savedProject?.projectManager || '');
    const [projectStatus, setProjectStatus] = useState(savedProject?.projectStatus || 'OPEN');
    const [billingType, setBillingType] = useState(savedProject?.billingType || 'Charge-Based');
    const [billingSchedule, setBillingSchedule] = useState(savedProject?.billingSchedule || '');
    const [tasks, setTasks] = useState(savedProject?.tasks || [
      {
        name: 'Discovery & Design',
        estimatedHours: 40,
        plannedWork: 40,
        status: 'Not Started',
        resource: '',
        serviceItem: 'PS - Discovery & Design Strategy',
        billingClass: '1',
        unitCost: 150
      },
      {
        name: 'Implementation',
        estimatedHours: 120,
        plannedWork: 120,
        status: 'Not Started',
        resource: '',
        serviceItem: 'SVC_PR_Development',
        billingClass: '1',
        unitCost: 175
      },
      {
        name: 'Training & UAT',
        estimatedHours: 32,
        plannedWork: 32,
        status: 'Not Started',
        resource: '',
        serviceItem: 'PS - Training Services',
        billingClass: '4',
        unitCost: 150
      }
    ]);

    const disabled = !selectedCustData;

    // Auto-save project data
    useEffect(() => {
      if (selectedCustData) {
        const projectData = {
          customerId: selectedCustData.id,
          projectName,
          projectCode,
          projectManager,
          projectStatus,
          billingType,
          billingSchedule,
          tasks
        };
        localStorage.setItem('demodashboard_project_draft', JSON.stringify(projectData));
      }
    }, [projectName, projectCode, projectManager, projectStatus, billingType, billingSchedule, tasks, selectedCustData]);

    const addTask = () =>
      setTasks((prev) => [
        ...prev,
        {
          name: `Task ${prev.length + 1}`,
          estimatedHours: 8,
          plannedWork: 8,
          status: 'Not Started',
          resource: '',
          serviceItem: 'PS - Post Go-Live Support',
          billingClass: '1',
          unitCost: 150
        }
      ]);

    const updateTask = (idx, updates) =>
      setTasks((prev) => prev.map((t, i) => (i === idx ? { ...t, ...updates } : t)));

    const removeTask = (idx) => setTasks((prev) => prev.filter((_, i) => i !== idx));

    const generateCompleteProject = async () => {
      if (!selectedCustData) {
        setActionStatus('⚠ Please select a customer first');
        return;
      }

      // Save current state for undo
      const previousState = {
        projectName,
        projectCode,
        projectManager,
        projectStatus,
        billingType,
        billingSchedule,
        tasks: JSON.parse(JSON.stringify(tasks))
      };

      // Warn if project has data
      const hasExistingData = projectName || tasks.length > 0;
      if (hasExistingData && !window.confirm('This will overwrite your current project configuration. Continue?')) {
        return;
      }

      setIsGeneratingAI(true);
      setActionStatus('🤖 Generating complete project configuration...');

      try {
        const customFields = customFieldsData[selectedCustData.id] || {};
        const industry = customFields.custentity_esc_industry || selectedCustData.industry || 'Professional Services';
        const budget = customFields.custentity_esc_annual_revenue || selectedCustData.budget || 100000;
        const size = customFields.custentity_esc_no_of_employees || selectedCustData.size || '50-100';
        
        const result = await generateFromAI('generate_project', {
          projectData: {
            name: projectName || `${selectedCustData.name} - Demo Project`,
            billingType: billingType,
            industry: industry,
            budget: budget
          },
          customerData: {
            name: selectedCustData.name,
            industry: industry,
            size: size,
            budget: budget,
            annualRevenue: budget,
            focus: selectedCustData.focus || [],
            custentity_esc_industry: customFields.custentity_esc_industry || selectedCustData.industry,
            custentity_esc_annual_revenue: customFields.custentity_esc_annual_revenue || selectedCustData.budget,
            custentity_esc_no_of_employees: customFields.custentity_esc_no_of_employees || selectedCustData.size
          },
          currentProject: {
            projectName: projectName,
            projectCode: projectCode,
            billingType: billingType
          }
        });

        if (result.error) {
          throw new Error(result.error);
        }

        // Validate AI response structure
        if (!result || typeof result !== 'object') {
          throw new Error('Invalid response format from AI');
        }

        // Populate all project fields from AI response with validation
        if (result.projectName && typeof result.projectName === 'string') {
          setProjectName(result.projectName.trim());
        }
        if (result.projectCode && typeof result.projectCode === 'string') {
          setProjectCode(result.projectCode.trim());
        }
        if (result.projectManager && typeof result.projectManager === 'string') {
          setProjectManager(result.projectManager.trim());
        }
        if (result.projectStatus && typeof result.projectStatus === 'string') {
          setProjectStatus(result.projectStatus);
        }
        if (result.billingType && typeof result.billingType === 'string') {
          setBillingType(result.billingType);
        }
        if (result.billingSchedule !== undefined) {
          setBillingSchedule(result.billingSchedule ? String(result.billingSchedule).trim() : '');
        }
        
        if (Array.isArray(result.tasks) && result.tasks.length > 0) {
          // Map AI response to task format with validation
          const suggestedTasks = result.tasks
            .filter(task => task && typeof task === 'object')
            .map(task => ({
              name: (task.name || 'Unnamed Task').trim(),
              estimatedHours: Math.max(1, parseInt(task.estimatedHours || task.plannedWork || 8, 10)),
              plannedWork: Math.max(1, parseInt(task.plannedWork || task.estimatedHours || 8, 10)),
              status: task.status || 'Not Started',
              resource: String(task.resource || '').trim(),
              serviceItem: (task.serviceItem || 'PS - Post Go-Live Support').trim(),
              billingClass: String(task.billingClass || '1'),
              unitCost: Math.max(0, parseFloat(task.unitCost || 150))
            }));

          console.log('AI returned tasks:', result.tasks.length);
          console.log('Valid tasks after filtering:', suggestedTasks.length);
          console.log('Tasks array:', suggestedTasks);

          if (suggestedTasks.length > 0) {
            // Clear existing tasks first to ensure clean state update
            setTasks([]);
            // Use setTimeout to ensure React batches the state update properly
            setTimeout(() => {
              setTasks([...suggestedTasks]);
              // Use the original count from AI response for the message
              const taskCount = result.tasks.length;
              const validCount = suggestedTasks.length;
              if (taskCount !== validCount) {
                setActionStatus(`✓ Generated complete project with ${validCount} tasks! (${taskCount - validCount} filtered out)`);
              } else {
                setActionStatus(`✓ Generated complete project with ${validCount} tasks!`);
              }
            }, 10);
          } else {
            throw new Error('No valid tasks in AI response');
          }
        } else {
          // If no tasks, at least update the project fields
          setActionStatus(`✓ Generated project configuration! (No tasks included)`);
        }

        // Store undo state
        window.__projectUndoState = previousState;
      } catch (error) {
        console.error('Project generation error:', error);
        setActionStatus(`⚠ Error: ${error.message}`);
        // Optionally restore previous state on error
        // setProjectName(previousState.projectName);
        // setProjectCode(previousState.projectCode);
        // ... etc
      } finally {
        setIsGeneratingAI(false);
      }
    };

    const generateTaskSuggestions = async () => {
      if (!selectedCustData) {
        setActionStatus('⚠ Please select a customer first');
        return;
      }

      setIsGeneratingAI(true);
      setActionStatus('🤖 Generating task suggestions...');

      try {
        const result = await generateFromAI('suggest_tasks', {
          projectData: {
            name: projectName || `${selectedCustData.name} - Demo Project`,
            billingType: billingType,
            industry: customFieldsData.custentity_esc_industry || selectedCustData.industry || 'Professional Services',
            budget: customFieldsData.custentity_esc_annual_revenue || 100000
          },
          customerData: {
            name: selectedCustData.name,
            industry: customFieldsData.custentity_esc_industry || selectedCustData.industry || 'Professional Services',
            annualRevenue: customFieldsData.custentity_esc_annual_revenue || 100000
          }
        });

        if (result.error) {
          throw new Error(result.error);
        }

        if (Array.isArray(result) && result.length > 0) {
          // Map AI response to task format
          const suggestedTasks = result.map(task => ({
            name: task.name || 'Unnamed Task',
            estimatedHours: task.estimatedHours || task.plannedWork || 8,
            plannedWork: task.plannedWork || task.estimatedHours || 8,
            status: task.status || 'Not Started',
            resource: task.resource || '',
            serviceItem: task.serviceItem || 'PS - Post Go-Live Support',
            billingClass: task.billingClass || '1',
            unitCost: task.unitCost || 150
          }));

          setTasks(suggestedTasks);
          setActionStatus(`✓ Generated ${suggestedTasks.length} task suggestions!`);
        } else {
          throw new Error('Invalid task suggestions format');
        }
      } catch (error) {
        console.error('Task generation error:', error);
        setActionStatus(`⚠ Error: ${error.message}`);
      } finally {
        setIsGeneratingAI(false);
      }
    };

    const handleExportProject = () => {
      if (disabled) return;

      const projectData = {
        name: projectName || `${selectedCustData.name} - Project`,
        entityid: projectCode || `PRJ-${selectedCustData.entityid}-${Date.now()}`,
        customerId: selectedCustData.nsId,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: projectStatus,
        description: `Project Manager: ${projectManager || 'Unassigned'} • Billing Type: ${billingType || 'N/A'} • Billing Schedule: ${billingSchedule || 'N/A'}`
      };

      const exportData = createExportData(selectedCustData, projectData, {
        // Export tasks; SuiteScript already parses and creates project tasks
        tasks: tasks.map((t) => ({
          name: t.name,
          estimatedHours: t.estimatedHours,
          plannedWork: t.plannedWork,
          status: t.status,
          resource: t.resource,
          serviceItem: t.serviceItem,
          billingClass: t.billingClass,
          unitCost: t.unitCost
        })),
        // Include for downstream flows or SuiteScript logging
        billingType,
        billingSchedule
      });

      exportViaEmail(exportData, {
        recipientEmail: 'simmonspatrick1@gmail.com',
        includeInstructions: true,
        includeValidation: true
      });

      setActionStatus('✓ Project export opened in email');
      setTimeout(() => setActionStatus(null), 2500);
    };

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">Project Configuration</h2>
              {selectedCustData && (
                <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                  <Check size={12} />
                  Auto-saved
                </span>
              )}
            </div>
            {!selectedCustData && (
              <span className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-700 border border-orange-200">
                Select a customer in Context to enable exports
              </span>
            )}
          </div>

          {/* AI Generate Complete Project Button */}
          {selectedCustData && (
            <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Zap size={16} className="text-purple-600" />
                    AI-Powered Project Generation
                  </h3>
                  <p className="text-xs text-gray-600 mb-2">
                    Generate a complete, context-aware project configuration based on <strong>{selectedCustData.name}</strong>'s industry ({selectedCustData.industry || 'Professional Services'}), budget ({selectedCustData.budget || '$100K-200K'}), and focus areas. Saves 10-15 minutes per demo prep.
                  </p>
                  {window.__projectUndoState && (
                    <button
                      onClick={() => {
                        const undo = window.__projectUndoState;
                        setProjectName(undo.projectName);
                        setProjectCode(undo.projectCode);
                        setProjectManager(undo.projectManager);
                        setProjectStatus(undo.projectStatus);
                        setBillingType(undo.billingType);
                        setBillingSchedule(undo.billingSchedule);
                        setTasks(undo.tasks);
                        delete window.__projectUndoState;
                        setActionStatus('✓ Restored previous project configuration');
                        setTimeout(() => setActionStatus(null), 2000);
                      }}
                      className="text-xs text-purple-600 hover:text-purple-700 underline"
                    >
                      ↶ Undo last generation
                    </button>
                  )}
                </div>
                <button
                  onClick={generateCompleteProject}
                  disabled={isGeneratingAI}
                  className="ml-4 px-4 py-2 text-sm bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-sm transition-all"
                  title="Generate complete project with name, code, manager, billing type, schedule, and tasks"
                  aria-label="Generate complete project using AI"
                >
                  {isGeneratingAI ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Generate Complete Project
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Acme Implementation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project ID (Entity ID)
              </label>
              <input
                type="text"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., PRJ-ACME-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Manager</label>
              <input
                type="text"
                value={projectManager}
                onChange={(e) => setProjectManager(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Status</label>
              <select
                value={projectStatus}
                onChange={(e) => setProjectStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="ON_HOLD">ON_HOLD</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Type
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  Select a method to bill project costs to the customer
                </span>
              </label>
              <select
                value={billingType}
                onChange={(e) => setBillingType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="Charge-Based">Charge-Based</option>
                <option value="Fixed Bid, Interval">Fixed Bid, Interval</option>
                <option value="Fixed Bid Milestone">Fixed Bid Milestone</option>
                <option value="Time and Materials">Time and Materials</option>
              </select>
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-gray-700 font-medium mb-1">
                  {billingType === 'Charge-Based' && (
                    <>
                      <strong>Charge-Based:</strong> Billable amounts are represented by charges. Charges are generated based on charge rules based on fixed dates, milestones, project progress, or time entries. This option requires that you have enabled the Charge-Based Billing feature.
                    </>
                  )}
                  {billingType === 'Fixed Bid, Interval' && (
                    <>
                      <strong>Fixed Bid, Interval:</strong> Bill customers at predefined intervals for a portion of the fixed amount based on project percent complete.
                    </>
                  )}
                  {billingType === 'Fixed Bid Milestone' && (
                    <>
                      <strong>Fixed Bid Milestone:</strong> Bill customers as milestones are completed for the percentage of the total project amount specified for the milestone.
                    </>
                  )}
                  {billingType === 'Time and Materials' && (
                    <>
                      <strong>Time and Materials:</strong> Bill customers for time and expenses entered against the project.
                    </>
                  )}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Included in export JSON and memo. Estimate creation can honor this setting.
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Billing Schedule
                <span className="text-xs text-gray-500 ml-2 font-normal">
                  Determines when and how to bill a customer over the duration of the project
                </span>
              </label>
              <input
                type="text"
                value={billingSchedule}
                onChange={(e) => setBillingSchedule(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={billingType === 'Fixed Bid Milestone' ? 'Private schedule (project-specific)' : 'Select or create a public schedule'}
              />
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-gray-700">
                  {billingType === 'Fixed Bid Milestone' ? (
                    <>
                      <strong>Private Schedule:</strong> A Fixed Bid, Milestone billing schedule is private and used only for the project it is created for.
                    </>
                  ) : (
                    <>
                      <strong>Public Schedule:</strong> Billing schedules for {billingType === 'Charge-Based' ? 'Charge-Based' : billingType} projects are public schedules and can be shared across projects.
                    </>
                  )}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {billingType === 'Fixed Bid Milestone' 
                  ? 'This schedule will be created specifically for this project and cannot be shared.'
                  : 'This schedule can be reused across multiple projects.'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
            <div className="flex gap-2">
              <button
                onClick={generateTaskSuggestions}
                disabled={disabled || isGeneratingAI}
                className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="AI-powered task suggestions based on industry and project type"
              >
                {isGeneratingAI ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Zap size={14} />
                    AI Suggest Tasks
                  </>
                )}
              </button>
              <button
                onClick={addTask}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Task
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {tasks.map((t, idx) => (
              <div
                key={idx}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Task Name</label>
                    <input
                      type="text"
                      value={t.name}
                      onChange={(e) => updateTask(idx, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder={`Task ${idx + 1}`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={t.status || 'Not Started'}
                      onChange={(e) => updateTask(idx, { status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                      <option value="On Hold">On Hold</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Planned Work (hrs)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={t.plannedWork || 0}
                      onChange={(e) =>
                        updateTask(idx, { plannedWork: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Est. Hours
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={t.estimatedHours || 0}
                      onChange={(e) =>
                        updateTask(idx, { estimatedHours: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="8"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Unit Cost ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={t.unitCost || 0}
                      onChange={(e) =>
                        updateTask(idx, { unitCost: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                      placeholder="150"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Total Cost
                    </label>
                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 font-semibold">
                      ${((t.plannedWork || 0) * (t.unitCost || 0)).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Resource Assigned</label>
                    <select
                      value={t.resource || ''}
                      onChange={(e) => updateTask(idx, { resource: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- Select Resource --</option>
                      <option value="912">Business Analyst</option>
                      <option value="913">Consultant</option>
                      <option value="914">Project Manager</option>
                      <option value="915">Technical Consultant</option>
                      <option value="916">Trainer</option>
                    </select>
                    {t.resource && (
                      <p className="text-xs text-gray-500 mt-1">
                        Resource ID: {t.resource} ({t.resource === '912' ? 'Business Analyst' : t.resource === '913' ? 'Consultant' : t.resource === '914' ? 'Project Manager' : t.resource === '915' ? 'Technical Consultant' : t.resource === '916' ? 'Trainer' : ''})
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Service Item</label>
                    <select
                      value={t.serviceItem || ''}
                      onChange={(e) => updateTask(idx, { serviceItem: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- Select Service Item --</option>
                      <option value="PS - Post Go-Live Support">PS - Post Go-Live Support</option>
                      <option value="PS - Go-Live Support">PS - Go-Live Support</option>
                      <option value="PS - Training Services">PS - Training Services</option>
                      <option value="PS - Data Migration">PS - Data Migration</option>
                      <option value="PS - Discovery & Design Strategy">PS - Discovery & Design Strategy</option>
                      <option value="SVC_PR_Consulting">SVC_PR_Consulting</option>
                      <option value="SVC_PR_Project Management">SVC_PR_Project Management</option>
                      <option value="SVC_PR_Development">SVC_PR_Development</option>
                      <option value="SVC_PR_Testing">SVC_PR_Testing</option>
                      <option value="SVC_PR_Training">SVC_PR_Training</option>
                      <option value="SVC_PR_Integration">SVC_PR_Integration</option>
                      <option value="SVC_PR_Business Analysis">SVC_PR_Business Analysis</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Billing Class</label>
                    <select
                      value={t.billingClass || ''}
                      onChange={(e) => updateTask(idx, { billingClass: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">-- Select Class --</option>
                      <option value="1">Professional Services</option>
                      <option value="2">Software Sales</option>
                      <option value="3">Consulting</option>
                      <option value="4">Training</option>
                      <option value="5">Support Services</option>
                      <option value="6">Implementation</option>
                      <option value="7">Managed Services</option>
                      <option value="8">Cloud Services</option>
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => removeTask(idx)}
                    className="px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100"
                  >
                    Remove Task
                  </button>
                </div>
              </div>
            ))}
            {tasks.length === 0 && (
              <div className="text-sm text-gray-500">
                No tasks yet. Click "Add Task" to include project tasks in the export.
              </div>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Project Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Total Tasks</div>
                  <div className="text-lg font-bold text-gray-900">{tasks.length}</div>
                </div>
                <div>
                  <div className="text-gray-600">Total Planned Hours</div>
                  <div className="text-lg font-bold text-gray-900">
                    {tasks.reduce((sum, t) => sum + (t.plannedWork || 0), 0).toFixed(1)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Total Budget</div>
                  <div className="text-lg font-bold text-blue-700">
                    ${tasks.reduce((sum, t) => sum + ((t.plannedWork || 0) * (t.unitCost || 0)), 0).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-gray-600">Avg. Hourly Rate</div>
                  <div className="text-lg font-bold text-gray-900">
                    ${tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + (t.unitCost || 0), 0) / tasks.length) : 0}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportProject}
            disabled={disabled}
            className={`px-5 py-3 rounded-lg text-white font-semibold ${
              disabled ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Export Project + Tasks to NetSuite
          </button>
        </div>
      </div>
    );
  };

  // ============ COMPONENT: PROMPT LIBRARY ============
  const PromptLibrary = () => (
    <div className="space-y-4">
      {/* Workflow Guide Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 rounded-full p-2 mt-0.5">
            <Zap size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">🚀 AI-Powered Workflow</h3>
            <ol className="text-sm text-gray-700 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[20px]">1.</span>
                <span><strong>Select a prospect</strong> from the Context tab (or add a new one)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[20px]">2.</span>
                <span><strong>Copy a prompt</strong> below — it auto-fills with your prospect's details!</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[20px]">3.</span>
                <span><strong>Paste into Claude</strong> to generate strategy, project plans, or estimates</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[20px]">4.</span>
                <span><strong>Paste Claude's output</strong> into the "AI Strategy / Notes" field (Context tab)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-blue-600 min-w-[20px]">5.</span>
                <span><strong>Export to NetSuite</strong> via Quick Actions — your notes are included!</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Prompt Importer */}
      <PromptImporter onPromptsImported={handlePromptsImported} />

      {/* Search Bar with Context Indicator */}
      <div className="space-y-2">
        {selectedCustData && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 flex items-center gap-2">
            <Check size={16} className="text-green-600" />
            <span className="text-sm text-green-800">
              <strong>{selectedCustData.name}</strong> selected — prompts are auto-filled with their details!
            </span>
          </div>
        )}
        
        <div className="relative">
          <Search size={18} className="absolute left-3 top-3 text-gray-400" />
          <input
            ref={promptSearchInputRef}
            type="text"
            placeholder="Search prompts... (⌘K)"
            value={promptSearch}
            onChange={(e) => setPromptSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
                  const formattedPrompt = formatPrompt(prompt, selectedCustData);
                  
                  return (
                    <div key={promptIdx} className="p-4 hover:bg-gray-50 transition-colors">
                      <p className="text-sm text-gray-700 mb-3 leading-relaxed whitespace-pre-wrap">{formattedPrompt}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(formattedPrompt, globalIdx)}
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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      {/* Aria-live region for status updates */}
      <div
        ref={statusRegionRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {actionStatus}
      </div>

      {/* Global Toast Notification */}
      {actionStatus && (
        <div className="fixed top-4 right-4 z-[60] animate-slide-in-right">
          <div className={`flex items-center gap-2 text-sm font-medium px-4 py-3 rounded-lg shadow-lg border backdrop-blur-sm max-w-md ${
            actionStatus.startsWith('✓') 
              ? 'text-green-800 bg-green-50 border-green-200' 
              : actionStatus.startsWith('⚠') || actionStatus.startsWith('⚠️')
              ? 'text-orange-800 bg-orange-50 border-orange-200'
              : actionStatus.startsWith('🔄')
              ? 'text-blue-800 bg-blue-50 border-blue-200'
              : 'text-gray-800 bg-gray-50 border-gray-200'
          }`}>
            {actionStatus.startsWith('✓') && <Check size={16} className="flex-shrink-0" />}
            {actionStatus.startsWith('⚠') && <AlertCircle size={16} className="flex-shrink-0" />}
            {actionStatus.startsWith('🔄') && <Loader size={16} className="animate-spin flex-shrink-0" />}
            <span>{actionStatus.replace(/^[✓⚠🔄]+\s*/, '')}</span>
            <button
              onClick={() => setActionStatus(null)}
              className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-1.5 rounded-lg shadow-sm">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Demo Master</h1>
                <p className="text-xs text-gray-500 font-medium">NetSuite PSA Hub</p>
              </div>
            </div>

            {/* Navigation Tabs - Centered */}
            <div className="hidden md:flex space-x-1 bg-gray-100/50 p-1 rounded-xl">
              {[
                { id: 'context', label: 'Context', icon: User },
                { id: 'prompts', label: 'Prompts', icon: BookOpen },
                { id: 'items', label: 'Items', icon: Settings },
                { id: 'projects', label: 'Projects', icon: FileText },
                { id: 'reference', label: 'Reference', icon: Database }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                      isActive
                        ? 'bg-white text-blue-700 shadow-sm ring-1 ring-gray-200 scale-105'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 hover:scale-102'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            
            {/* Right Side Actions */}
            <div className="flex items-center gap-3">
              {/* Account Switcher Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors">
                  <Building2 size={16} />
                  <span className="max-w-[100px] truncate">{currentAccount?.name}</span>
                  <ChevronDown size={14} />
                </button>
                {/* Dropdown Menu */}
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-gray-100 hidden group-hover:block z-50 p-1">
                   <p className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Select Account</p>
                   {accounts.map(account => (
                    <button
                      key={account.id}
                      onClick={() => setSelectedAccount(account.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                        selectedAccount === account.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{account.name}</span>
                      {selectedAccount === account.id && <Check size={14} />}
                    </button>
                   ))}
                </div>
              </div>

              <div className="h-6 w-px bg-gray-200 mx-1"></div>

              {/* Settings Button */}
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all relative"
                title="AI Settings"
              >
                <Settings size={18} />
                {!claudeApiKey && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
                )}
              </button>

              {/* Clipboard History */}
              <div className="relative">
                <button
                  onClick={() => setShowClipboardHistory(!showClipboardHistory)}
                  className={`p-2 rounded-lg transition-all relative ${showClipboardHistory ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}
                  title="Clipboard History"
                >
                  <Copy size={18} />
                  {clipboardHistory.length > 0 && (
                    <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-blue-600 text-white text-[10px] flex items-center justify-center rounded-full ring-2 ring-white font-bold">
                      {clipboardHistory.length}
                    </span>
                  )}
                </button>
                
                {showClipboardHistory && (
                  <div className="absolute right-0 top-full mt-3 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 max-h-96 overflow-y-auto ring-1 ring-black/5">
                    <div className="p-3 border-b border-gray-100 bg-gray-50/50 sticky top-0 backdrop-blur-sm z-10">
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-gray-900 text-xs uppercase tracking-wide">Clipboard History</h3>
                        <button 
                          onClick={() => setClipboardHistory([])}
                          className="text-[10px] font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded"
                        >
                          CLEAR ALL
                        </button>
                      </div>
                      {clipboardHistory.length > 0 && (
                        <button
                          onClick={() => generateFromAI('summarize_clipboard', clipboardHistory.map(h => h.text).join('\n\n'))}
                          disabled={isGeneratingAI}
                          className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:from-purple-700 hover:to-indigo-700 transition-all shadow-sm flex items-center justify-center gap-1.5"
                        >
                          {isGeneratingAI ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                          Summarize with AI
                        </button>
                      )}
                    </div>
                    {clipboardHistory.length === 0 ? (
                      <div className="p-8 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                        <Copy size={24} className="opacity-20" />
                        No history yet
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {clipboardHistory.map((item, idx) => (
                          <div key={idx} className="p-3 hover:bg-gray-50 group relative transition-colors">
                            <p className="text-xs text-gray-600 line-clamp-3 pr-6 font-mono leading-relaxed">{item.text}</p>
                            <span className="text-[10px] text-gray-400 mt-1.5 block font-medium">
                              {item.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(item.text);
                                setShowClipboardHistory(false);
                                setActionStatus('✓ Copied from history');
                                setTimeout(() => setActionStatus(null), 2000);
                              }}
                              className="absolute right-2 top-3 p-1.5 bg-white border border-gray-200 rounded-md text-blue-600 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-blue-50"
                              title="Copy again"
                            >
                              <Copy size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Mobile Tab Navigation (Visible only on small screens) */}
          <div className="md:hidden border-t border-gray-100 py-2 overflow-x-auto">
             <div className="flex space-x-1">
              {[
                { id: 'context', label: 'Context', icon: User },
                { id: 'prompts', label: 'Prompts', icon: BookOpen },
                { id: 'items', label: 'Items', icon: Settings },
                { id: 'projects', label: 'Projects', icon: FileText },
                { id: 'reference', label: 'Reference', icon: Database }
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-gray-600'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'context' ? <CustomerContextPanel /> :
         activeTab === 'prompts' ? <PromptLibrary /> :
         activeTab === 'items' ? <ItemConfigPanel /> :
         activeTab === 'projects' ? <ProjectConfigPanel /> :
         activeTab === 'reference' ? <ReferenceDataManager /> : null}
      </div>

      {/* Add Prospect Modal */}
      {showAddProspectModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={(e) => handleModalClickOutside(e, modalRef, setShowAddProspectModal)}
          aria-modal="true"
          aria-labelledby="modal-title"
          role="dialog"
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transform transition-all duration-200 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 id="modal-title" className="text-xl font-bold text-gray-900">Add New Prospect</h2>
              <button
                onClick={() => {
                  if (!isGeneratingAI) {
                    setShowAddProspectModal(false);
                    setFormErrors({});
                  }
                }}
                disabled={isGeneratingAI}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            <form
              className="p-6 space-y-4"
              onSubmit={handleFormSubmit}
              aria-busy={isGeneratingAI}
              aria-label="Add new prospect"
            >
              {/* Form Error Summary */}
              {Object.keys(formErrors).length > 0 && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg" role="alert">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-red-900 mb-1">Please fix the following errors:</p>
                      <ul className="text-xs text-red-800 list-disc list-inside space-y-1">
                        {Object.values(formErrors).filter(e => e).map((error, idx) => (
                          <li key={idx}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Website Analysis */}
              <div className="mb-6 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                <label className="block text-sm font-medium text-indigo-900 mb-2">
                  🤖 Auto-Fill from Website
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newProspect.website}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, website: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="https://company.com"
                  />
                  <button
                    type="button"
                    onClick={() => generateFromAI('analyze_url', newProspect.website)}
                    disabled={!newProspect.website || isGeneratingAI}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isGeneratingAI ? <Loader className="animate-spin" size={16} /> : <Zap size={16} />}
                    Analyze
                  </button>
                </div>
                <p className="text-xs text-indigo-600 mt-2">
                  💡 Enter a website URL to auto-generate company details, industry focus, and project suggestions using Claude AI.
                </p>
              </div>

              {/* Primary Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">Primary Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 mb-1">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="company-name"
                      ref={nameInputRef}
                      type="text"
                      value={newProspect.name}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewProspect(prev => ({ ...prev, name: value }));
                        setFormErrors(prev => {
                          const updated = { ...prev };
                          const error = validateField('name', value);
                          if (error) {
                            updated.name = error;
                          } else {
                            delete updated.name;
                          }
                          return updated;
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g., Acme Corporation"
                      aria-invalid={!!formErrors.name}
                      aria-describedby={formErrors.name ? 'name-error' : undefined}
                    />
                    {formErrors.name && (
                      <p id="name-error" className="mt-1 text-xs text-red-600" role="alert">
                        {formErrors.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="entity-id" className="block text-sm font-medium text-gray-700 mb-1">
                      Entity ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="entity-id"
                      type="text"
                      value={newProspect.entityid}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewProspect(prev => ({ ...prev, entityid: value }));
                        setFormErrors(prev => {
                          const updated = { ...prev };
                          const error = validateField('entityid', value);
                          if (error) {
                            updated.entityid = error;
                          } else {
                            delete updated.entityid;
                          }
                          return updated;
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.entityid ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="e.g., ACME-Demo"
                      aria-invalid={!!formErrors.entityid}
                      aria-describedby={formErrors.entityid ? 'entityid-error' : undefined}
                    />
                    {formErrors.entityid && (
                      <p id="entityid-error" className="mt-1 text-xs text-red-600" role="alert">
                        {formErrors.entityid}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={newProspect.type}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Company">Company</option>
                      <option value="Individual">Individual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                  <select
                    value={newProspect.status}
                    onChange={(e) => setNewProspect(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sales Rep
                    </label>
                    <input
                      type="text"
                      value={newProspect.salesRep}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, salesRep: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Will Clark"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Lead Source
                    </label>
                    <select
                      value={newProspect.leadSource || 'Web'}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, leadSource: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {LEAD_SOURCE_OPTIONS.map(option => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subsidiary
                    </label>
                    <input
                      type="text"
                      value={newProspect.subsidiary}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, subsidiary: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Parent Company"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2 pt-2">Contact Information</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone
                    </label>
                    <input
                      type="text"
                      value={newProspect.phone}
                      onChange={(e) => setNewProspect(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={newProspect.email}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewProspect(prev => ({ ...prev, email: value }));
                        setFormErrors(prev => {
                          const updated = { ...prev };
                          const error = validateField('email', value);
                          if (error) {
                            updated.email = error;
                          } else {
                            delete updated.email;
                          }
                          return updated;
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="contact@company.com"
                      aria-invalid={!!formErrors.email}
                      aria-describedby={formErrors.email ? 'email-error' : undefined}
                    />
                    {formErrors.email && (
                      <p id="email-error" className="mt-1 text-xs text-red-600" role="alert">
                        {formErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="invoice-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Invoice Email
                    </label>
                    <input
                      id="invoice-email"
                      type="email"
                      value={newProspect.invoiceEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewProspect(prev => ({ ...prev, invoiceEmail: value }));
                        setFormErrors(prev => {
                          const updated = { ...prev };
                          const error = validateField('invoiceEmail', value);
                          if (error) {
                            updated.invoiceEmail = error;
                          } else {
                            delete updated.invoiceEmail;
                          }
                          return updated;
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.invoiceEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="ap@company.com"
                      aria-invalid={!!formErrors.invoiceEmail}
                      aria-describedby={formErrors.invoiceEmail ? 'invoice-email-error' : undefined}
                    />
                    {formErrors.invoiceEmail && (
                      <p id="invoice-email-error" className="mt-1 text-xs text-red-600" role="alert">
                        {formErrors.invoiceEmail}
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="payment-email" className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Notification Email
                    </label>
                    <input
                      id="payment-email"
                      type="email"
                      value={newProspect.paymentEmail}
                      onChange={(e) => {
                        const value = e.target.value;
                        setNewProspect(prev => ({ ...prev, paymentEmail: value }));
                        setFormErrors(prev => {
                          const updated = { ...prev };
                          const error = validateField('paymentEmail', value);
                          if (error) {
                            updated.paymentEmail = error;
                          } else {
                            delete updated.paymentEmail;
                          }
                          return updated;
                        });
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        formErrors.paymentEmail ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="payments@company.com"
                      aria-invalid={!!formErrors.paymentEmail}
                      aria-describedby={formErrors.paymentEmail ? 'payment-email-error' : undefined}
                    />
                    {formErrors.paymentEmail && (
                      <p id="payment-email-error" className="mt-1 text-xs text-red-600" role="alert">
                        {formErrors.paymentEmail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (!isGeneratingAI) {
                      setShowAddProspectModal(false);
                      setFormErrors({});
                    }
                  }}
                  disabled={isGeneratingAI}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Cancel and close modal"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingAI}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  aria-label="Add new prospect to list"
                >
                  {isGeneratingAI && <Loader size={16} className="animate-spin" />}
                  Add Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal (Claude API Key) */}
      {showSettingsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={(e) => handleModalClickOutside(e, settingsModalRef, setShowSettingsModal)}
          aria-modal="true"
          aria-labelledby="settings-modal-title"
          role="dialog"
        >
          <div 
            ref={settingsModalRef}
            className="bg-white rounded-lg max-w-md w-full shadow-xl transform transition-all duration-200 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 id="settings-modal-title" className="text-xl font-bold text-gray-900">Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label="Close settings modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-900 font-medium mb-2">💡 System API Key Configured</p>
                <p className="text-xs text-blue-800">
                  The dashboard has a system-wide API key configured. You can leave the field below <strong>empty</strong> to use the system key, or enter your own to override it.
                </p>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Claude API Key (Optional)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={claudeApiKey}
                  onChange={(e) => setClaudeApiKey(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm pr-16"
                  placeholder="Leave empty to use system key..."
                />
                {claudeApiKey && (
                  <button
                    onClick={() => setClaudeApiKey('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500 hover:text-red-600 bg-gray-100 px-2 py-1 rounded"
                  >
                    Clear
                  </button>
                )}
              </div>
              {!localStorage.getItem('demodashboard_claude_key') && claudeApiKey && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  ✓ Using default API key. You can change it here if needed.
                </p>
              )}
              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-900 font-medium mb-2">📝 How to get your own API key:</p>
                <ol className="text-xs text-blue-800 space-y-1 ml-4 list-decimal">
                  <li>Go to <a href="https://console.anthropic.com/" target="_blank" rel="noopener noreferrer" className="underline">console.anthropic.com</a></li>
                  <li>Sign in or create an account</li>
                  <li>Navigate to "API Keys" section</li>
                  <li>Click "Create Key" and copy it</li>
                  <li>Paste the full key here (starts with "sk-ant-api03-")</li>
                </ol>
              </div>
              <p className="text-xs text-gray-500 mt-3">
                🔒 Your API key is stored locally in your browser and sent directly to Claude's API. It is never stored on our servers.
              </p>
              
              {/* Export History */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Export History</h3>
                {exportHistory.length === 0 ? (
                  <p className="text-xs text-gray-500">No exports yet</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {exportHistory.slice(0, 10).map((exportItem) => (
                      <div key={exportItem.id} className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-900">{exportItem.customer}</span>
                          <span className="text-gray-500">
                            {new Date(exportItem.timestamp).toLocaleDateString()} {new Date(exportItem.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="text-gray-600">
                          {exportItem.data.projectName} • {exportItem.data.itemCount} items
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {exportHistory.length > 0 && (
                  <button
                    onClick={() => {
                      setExportHistory([]);
                      localStorage.removeItem('demodashboard_export_history');
                      setActionStatus('✓ Export history cleared');
                      setTimeout(() => setActionStatus(null), 2000);
                    }}
                    className="mt-2 text-xs text-gray-500 hover:text-red-600"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {/* Cache Management */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Cache Management</h3>
                <button
                  onClick={() => {
                    // Clear all AI cache
                    let cleared = 0;
                    for (let i = 0; i < localStorage.length; i++) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith('ai_cache_')) {
                        localStorage.removeItem(key);
                        cleared++;
                      }
                    }
                    setActionStatus(`✓ Cleared ${cleared} cached AI responses`);
                    setTimeout(() => setActionStatus(null), 3000);
                  }}
                  className="w-full px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                >
                  <RefreshCw size={14} className="inline mr-2" />
                  Clear AI Cache ({Object.keys(localStorage).filter(k => k.startsWith('ai_cache_')).length} items)
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  AI responses are cached for 24 hours to reduce API costs. Clear cache to force fresh responses.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const trimmedKey = claudeApiKey.trim();
                  if (trimmedKey && !trimmedKey.startsWith('sk-ant-api03-')) {
                    setActionStatus('⚠ Invalid API key format. Must start with "sk-ant-api03-"');
                    setTimeout(() => setActionStatus(null), 4000);
                    return;
                  }
                  saveClaudeKey(trimmedKey);
                  setShowSettingsModal(false);
                  setActionStatus(trimmedKey ? '✓ API Key saved!' : '✓ Using system key');
                  setTimeout(() => setActionStatus(null), 2000);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claudeApiKey ? 'Save Custom Key' : 'Use System Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-200"
          onClick={() => setShowShortcutsModal(false)}
          aria-modal="true"
          aria-labelledby="shortcuts-modal-title"
          role="dialog"
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl transform transition-all duration-200 scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 id="shortcuts-modal-title" className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label="Close shortcuts modal"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Navigation</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Switch to Context Tab</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘1</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Switch to Prompts Tab</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘2</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Switch to Items Tab</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘3</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Switch to Projects Tab</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘4</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Switch to Reference Tab</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘5</kbd>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wide">Actions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Focus Search</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘K</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">New Prospect</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">⌘N</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Show Shortcuts</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">?</kbd>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">Close Modal</span>
                      <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">ESC</kbd>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  💡 Tip: Shortcuts work when you're not typing in input fields. Press <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-xs font-mono">?</kbd> anytime to see this help.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200">
              <button
                onClick={() => setShowShortcutsModal(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Got it!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
