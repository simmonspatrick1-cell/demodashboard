import React, { useState, useMemo, useEffect } from 'react';
import { Search, Settings, User, Users, Zap, ChevronRight, Copy, Check, BookOpen, ChevronDown, Target, Building2, Mail, Phone, MoreVertical, Play, Plus, FileText, Clock, TrendingUp, AlertCircle, Loader, RefreshCw, Database } from 'lucide-react';
// Import the NetSuite service
// import NetSuiteService from './netsuite-service';
import { exportViaEmail, createExportData } from './email-export-utils';
import { ITEM_CONFIG, ESTIMATE_PRESETS, AVAILABLE_ITEMS } from './src/itemConfig';
import ReferenceDataManager from './src/ReferenceDataManager';
import { ClassSelector, DepartmentSelector, LocationSelector } from './src/ReferenceDataSelector';
// import { NETSUITE_CLASSES, NETSUITE_DEPARTMENTS, NETSUITE_EMPLOYEES, NETSUITE_LOCATIONS } from './src/netsuiteData';

export default function DemoDashboard() {
  // ============ STATE MANAGEMENT ============
  const [activeTab, setActiveTab] = useState('context'); // 'context', 'prompts', 'items', 'reference'
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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [clipboardHistory, setClipboardHistory] = useState([]);
  const [showClipboardHistory, setShowClipboardHistory] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [prospects, setProspects] = useState([
    { id: 1, name: 'AdvisorHR', entityid: 'AdvisorHR-Demo', industry: 'PEO Services', size: '500-1000', status: 'Hot', demoDate: 'Oct 30', focus: ['Resource Planning', 'Multi-Entity', 'Billing'], budget: '$200K-500K', nsId: 3161, website: 'advisorhr.com' },
    { id: 2, name: 'GSB Group', entityid: 'GSB-Demo', industry: 'Consulting', size: '50-100', status: 'Active', demoDate: 'Nov 5', focus: ['Project Accounting', 'PSA'], budget: '$100K-200K', nsId: 1834, website: 'gsbgroup.com' },
    { id: 3, name: 'Innovatia Technical', entityid: 'Innovatia-Demo', industry: 'Tech Consulting', size: '200-300', status: 'Active', demoDate: 'Nov 8', focus: ['Resource Utilization', 'Forecasting'], budget: '$150K-300K', nsId: 1938, website: 'innovatia.net' },
    { id: 4, name: 'Marabou Midstream', entityid: 'Marabou-Demo', industry: 'Energy/Midstream', size: '100-150', status: 'Active', demoDate: 'Nov 12', focus: ['Project Accounting', 'Multi-Entity', 'Consolidation'], budget: '$250K+', nsId: 2662, website: 'maraboumidstream.com' },
    { id: 5, name: 'Lovse Surveys', entityid: 'Lovse-Demo', industry: 'Professional Services', size: '75-100', status: 'Qualified', demoDate: 'Nov 15', focus: ['Time & Expense', 'Billing'], budget: '$100K-150K', nsId: 1938, website: 'lovsesurveys.com' },
    { id: 6, name: 'nFront Consulting', entityid: 'nFront-Demo', industry: 'Energy Consulting', size: '150-200', status: 'Proposal', demoDate: 'Pending', focus: ['Resource Planning', 'Project Accounting', 'Multi-Entity'], budget: '$5.2M', nsId: 4285, website: 'nfrontconsulting.com' },
    { id: 7, name: 'Formative Group', entityid: 'Formative-Demo', industry: 'Salesforce Consulting', size: '80-120', status: 'Active', demoDate: 'Nov 20', focus: ['Scaling Operations', 'Acquisitions', 'Resource Mgmt'], budget: '$200K-400K', nsId: 1938, website: 'formativegroup.com' },
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
    nsId: null,
    website: ''
  });

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

  // AI Generation Handler
  const generateFromAI = async (type, content) => {
    // If no key in settings, we'll try without it and let the backend use its env var
    // if (!claudeApiKey) {
    //   setShowSettingsModal(true);
    //   setActionStatus('⚠ Please enter your Claude API Key first');
    //   setTimeout(() => setActionStatus(null), 3000);
    //   return;
    // }

    setIsGeneratingAI(true);
    setActionStatus('🤖 Analyzing website...');
    
    try {
      // Ensure URL has protocol
      let url = content;
      if (type === 'analyze_url' && !url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      const response = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: url, apiKey: claudeApiKey })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Response:', data); // Debug log
      
      if (data.error) throw new Error(data.error);
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
        if (data.industry) updates.industry = data.industry;
        if (data.size) updates.size = data.size;
        if (data.revenue) updates.budget = data.revenue;
        if (data.focus_areas && Array.isArray(data.focus_areas)) {
          updates.focus = data.focus_areas;
        }
        
        console.log('Updating prospect with:', updates);
        
        setNewProspect(prev => ({
          ...prev,
          ...updates
        }));
        
        const fieldsUpdated = Object.keys(updates).filter(k => k !== 'website').length;
        setActionStatus(`✓ Website analyzed! ${fieldsUpdated} field(s) auto-filled.`);
      } else if (type === 'summarize_clipboard') {
        // Copy summary to clipboard history as a new item
        const summary = `## AI Summary\n\n${data.summary}`;
        setClipboardHistory(prev => [{ text: summary, timestamp: new Date() }, ...prev]);
        // Also put it in the clipboard
        navigator.clipboard.writeText(summary);
        setActionStatus('✓ Summary copied to clipboard!');
      }
    } catch (error) {
      console.error('AI Error:', error);
      setActionStatus(`⚠ AI Error: ${error.message}`);
    } finally {
      setIsGeneratingAI(false);
      setTimeout(() => setActionStatus(null), 3000);
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

      // Prepare export data with hashtags
      const exportData = createExportData(customerData, null, {
        memo: demoNotes[selectedCustData.id] || '',
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
      action: () => {
        if (!selectedCustData) {
          setActionStatus('⚠ Please select a customer first');
          setTimeout(() => setActionStatus(null), 2000);
          return;
        }

        // Create estimate via email export using configured items
        // Use items from the Items Configuration tab (customItems state)
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

        const exportData = createExportData(selectedCustData, null, {
          estimate: estimateData,
          memo: demoNotes[selectedCustData.id] || ''
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
          // Only disable sync if no customer is selected or if another sync is running
          const isDisabled = (syncLoading && action.id !== 'sync-netsuite') || (!selectedCustData);
          const isLocalOnly = action.id === 'sync-netsuite' && selectedCustData && !selectedCustData.nsId;
          
          return (
            <button
              key={action.id}
              onClick={action.action}
              disabled={isDisabled}
              title={isLocalOnly ? 'Click to search and link to NetSuite record' : ''}
              className={`p-3 rounded-lg transition-all text-xs font-medium flex flex-col items-center justify-center gap-2 ${
                isLoading
                  ? 'bg-blue-100 text-blue-700 cursor-wait'
                  : isDisabled
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isLocalOnly 
                  ? 'bg-gradient-to-br from-orange-50 to-orange-100 text-orange-700 hover:from-orange-100 hover:to-orange-200 active:scale-95 border border-orange-200'
                  : 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 hover:from-blue-100 hover:to-blue-200 active:scale-95'
              }`}
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
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-gray-800">{customer.name}</p>
                    {!customer.nsId && (
                      <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 text-[10px] font-semibold rounded">
                        LOCAL
                      </span>
                    )}
                  </div>
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
                  <div className="flex items-center gap-2">
                    <h2 className="text-2xl font-bold">{selectedCustData.name}</h2>
                    {!selectedCustData.nsId && (
                      <span className="px-2 py-1 bg-orange-500 text-white text-xs font-semibold rounded">
                        LOCAL ONLY
                      </span>
                    )}
                  </div>
                  <p className="text-blue-100 mt-1">{selectedCustData.industry}</p>
                </div>
                <span className="bg-blue-500 px-3 py-1 rounded-full text-sm font-semibold">
                  {selectedCustData.status}
                </span>
              </div>
            </div>

            {/* Local Prospect Warning */}
            {!selectedCustData.nsId && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-orange-900">This prospect is not in NetSuite yet</p>
                    <p className="text-xs text-orange-700 mt-1">
                      Click <strong>"Create Prospect"</strong> below to send this customer to NetSuite via email. 
                      The SuiteScript will process it and create the customer record. 
                      After 1-2 minutes, click <strong>"Sync NetSuite Data"</strong> to pull the customer ID back.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Reference Data Selectors */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-3">Estimate Reference Data (Optional)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <ClassSelector
                  value={selectedClass?.id || selectedClass?.name}
                  onChange={setSelectedClass}
                />
                <DepartmentSelector
                  value={selectedDepartment?.id || selectedDepartment?.name}
                  onChange={setSelectedDepartment}
                />
                <LocationSelector
                  value={selectedLocation?.id || selectedLocation?.name}
                  onChange={setSelectedLocation}
                />
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
              {selectedCustData.website && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-xs text-gray-500 font-semibold uppercase">Website</p>
                  <a 
                    href={selectedCustData.website.startsWith('http') ? selectedCustData.website : `https://${selectedCustData.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-semibold text-indigo-600 hover:text-indigo-800 mt-1 block truncate"
                  >
                    {selectedCustData.website}
                  </a>
                </div>
              )}
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

            {/* AI Strategy / Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-semibold uppercase mb-2">AI Strategy / Notes</p>
              <textarea
                value={demoNotes[selectedCustData.id] || ''}
                onChange={(e) => setDemoNotes({...demoNotes, [selectedCustData.id]: e.target.value})}
                placeholder="Paste your AI-generated strategy, meeting notes, or key pain points here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 font-mono bg-gray-50"
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
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Estimate Line Items</h3>
        
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
            type="text"
            placeholder="Search prompts..."
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
            
            {/* Settings Button */}
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors relative mr-2"
              title="AI Settings"
            >
              <Settings size={20} />
              {!claudeApiKey && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>

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
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-gray-700 text-sm">Clipboard History</h3>
                      <button 
                        onClick={() => setClipboardHistory([])}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Clear
                      </button>
                    </div>
                    {clipboardHistory.length > 0 && (
                      <button
                        onClick={() => generateFromAI('summarize_clipboard', clipboardHistory.map(h => h.text).join('\n\n'))}
                        disabled={isGeneratingAI}
                        className="w-full py-1.5 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors flex items-center justify-center gap-1"
                      >
                        {isGeneratingAI ? <Loader size={12} className="animate-spin" /> : <Zap size={12} />}
                        Summarize with Claude
                      </button>
                    )}
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
            <button
              onClick={() => setActiveTab('reference')}
              className={`px-4 py-2 font-medium transition-colors border-b-2 ${
                activeTab === 'reference'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              <span className="flex items-center gap-2">
                <Database size={18} />
                Reference Data
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'context' ? <CustomerContextPanel /> :
         activeTab === 'prompts' ? <PromptLibrary /> :
         activeTab === 'items' ? <ItemConfigPanel /> :
         activeTab === 'reference' ? <ReferenceDataManager /> : null}
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

      {/* Settings Modal (Claude API Key) */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Claude API Settings</h2>
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
    </div>
  );
}
