import React, { useState } from 'react';
import { Prospect } from '../types/dashboard';

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
    demoDate: 'TBD',
    notes: '',
    salesRep: 'Will Clark',
    leadSource: '',
    subsidiary: 'Internal ID 2',
    phone: '',
    email: '',
    invoiceEmail: '',
    paymentNotificationEmail: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validation functions
  const validateEmail = (email: string): boolean => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateUrl = (url: string): boolean => {
    if (!url) return true; // Optional field
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const validatePhone = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    return phoneRegex.test(phone);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!form.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    if (!form.industry.trim()) {
      newErrors.industry = 'Industry is required';
    }

    if (form.website && !validateUrl(form.website)) {
      newErrors.website = 'Please enter a valid URL';
    }

    if (form.email && !validateEmail(form.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (form.invoiceEmail && !validateEmail(form.invoiceEmail)) {
      newErrors.invoiceEmail = 'Please enter a valid email';
    }

    if (form.paymentNotificationEmail && !validateEmail(form.paymentNotificationEmail)) {
      newErrors.paymentNotificationEmail = 'Please enter a valid email';
    }

    if (form.phone && !validatePhone(form.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to generate demo contact info
  const generateDemoContactInfo = (companyName: string, website: string) => {
    const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

    setForm(prev => ({
      ...prev,
      phone: '(555) 123-4567',
      email: `contact@${domain}`,
      invoiceEmail: `ap@${domain}`,
      paymentNotificationEmail: `payments@${domain}`,
      leadSource: 'Web'
    }));
  };

  // Auto-populate when website changes
  const handleWebsiteChange = (newWebsite: string) => {
    setForm(prev => ({ ...prev, website: newWebsite }));
    // Clear website error when user types
    if (errors.website) {
      setErrors(prev => ({ ...prev, website: '' }));
    }

    if (newWebsite.trim() && form.name.trim()) {
      generateDemoContactInfo(form.name, newWebsite);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    // Clear error when user types
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleReset = () => {
    setForm({
      name: '',
      industry: '',
      status: 'Active',
      size: '100-200',
      budget: '$150K+',
      focus: 'Resource Planning, Billing',
      website: '',
      demoDate: 'TBD',
      notes: '',
      salesRep: 'Will Clark',
      leadSource: '',
      subsidiary: 'Internal ID 2',
      phone: '',
      email: '',
      invoiceEmail: '',
      paymentNotificationEmail: ''
    });
    setErrors({});
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onCreate({
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
        website: form.website,
        notes: form.notes.trim() || undefined,
        salesRep: form.salesRep || undefined,
        leadSource: form.leadSource || undefined,
        subsidiary: form.subsidiary || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        invoiceEmail: form.invoiceEmail || undefined,
        paymentNotificationEmail: form.paymentNotificationEmail || undefined
      });
    }
  };

  const isValid = form.name.trim() && form.industry.trim();

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-xs uppercase text-gray-500">Company Name *</label>
          <input
            value={form.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            className={`input ${errors.name ? 'border-red-500' : ''}`}
            placeholder="Acme Corp"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Industry *</label>
          <input
            value={form.industry}
            onChange={(e) => handleFieldChange('industry', e.target.value)}
            className={`input ${errors.industry ? 'border-red-500' : ''}`}
            placeholder="Professional Services"
            aria-invalid={!!errors.industry}
            aria-describedby={errors.industry ? 'industry-error' : undefined}
          />
          {errors.industry && (
            <p id="industry-error" className="text-red-500 text-xs mt-1">{errors.industry}</p>
          )}
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
            onChange={(e) => handleWebsiteChange(e.target.value)}
            className={`input ${errors.website ? 'border-red-500' : ''}`}
            placeholder="https://example.com"
            aria-invalid={!!errors.website}
            aria-describedby={errors.website ? 'website-error' : undefined}
          />
          {errors.website && (
            <p id="website-error" className="text-red-500 text-xs mt-1">{errors.website}</p>
          )}
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Sales Rep</label>
          <input
            value={form.salesRep}
            onChange={(e) => setForm({ ...form, salesRep: e.target.value })}
            className="input"
            placeholder="e.g., Will Clark"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Lead Source</label>
          <input
            value={form.leadSource}
            onChange={(e) => setForm({ ...form, leadSource: e.target.value })}
            className="input"
            placeholder="e.g., Web"
          />
        </div>
        <div>
          <label className="text-xs uppercase text-gray-500">Subsidiary</label>
          <input
            value={form.subsidiary}
            onChange={(e) => setForm({ ...form, subsidiary: e.target.value })}
            className="input"
            placeholder="e.g., Parent Company"
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
            aria-label="Select prospect status"
          >
            <option value="Hot">Hot</option>
            <option value="Active">Active</option>
            <option value="Qualified">Qualified</option>
            <option value="Proposal">Proposal</option>
          </select>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">Contact Information</h4>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-xs uppercase text-gray-500">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => handleFieldChange('phone', e.target.value)}
              className={`input ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="(555) 123-4567"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {errors.phone && (
              <p id="phone-error" className="text-red-500 text-xs mt-1">{errors.phone}</p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase text-gray-500">Email</label>
            <input
              value={form.email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              className={`input ${errors.email ? 'border-red-500' : ''}`}
              placeholder="contact@company.com"
              type="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="text-red-500 text-xs mt-1">{errors.email}</p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase text-gray-500">Invoice Email</label>
            <input
              value={form.invoiceEmail}
              onChange={(e) => handleFieldChange('invoiceEmail', e.target.value)}
              className={`input ${errors.invoiceEmail ? 'border-red-500' : ''}`}
              placeholder="ap@company.com"
              type="email"
              aria-invalid={!!errors.invoiceEmail}
              aria-describedby={errors.invoiceEmail ? 'invoice-email-error' : undefined}
            />
            {errors.invoiceEmail && (
              <p id="invoice-email-error" className="text-red-500 text-xs mt-1">{errors.invoiceEmail}</p>
            )}
          </div>
          <div>
            <label className="text-xs uppercase text-gray-500">Payment Notification Email</label>
            <input
              value={form.paymentNotificationEmail}
              onChange={(e) => handleFieldChange('paymentNotificationEmail', e.target.value)}
              className={`input ${errors.paymentNotificationEmail ? 'border-red-500' : ''}`}
              placeholder="payments@company.com"
              type="email"
              aria-invalid={!!errors.paymentNotificationEmail}
              aria-describedby={errors.paymentNotificationEmail ? 'payment-email-error' : undefined}
            />
            {errors.paymentNotificationEmail && (
              <p id="payment-email-error" className="text-red-500 text-xs mt-1">{errors.paymentNotificationEmail}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="md:col-span-2">
          <label className="text-xs uppercase text-gray-500">Discovery Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="input min-h-[90px]"
            placeholder="What are they trying to solve? Key website observations?"
            aria-label="Discovery notes"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          className="px-4 py-2 rounded-full border hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          onClick={handleReset}
          type="button"
          aria-label="Reset form"
        >
          Reset
        </button>
        <button
          className="px-4 py-2 rounded-full border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors"
          disabled={!isValid}
          onClick={handleSubmit}
          type="button"
          aria-label="Create prospect"
        >
          Create Prospect
        </button>
      </div>
    </div>
  );
};

export default QuickCreateForm;
