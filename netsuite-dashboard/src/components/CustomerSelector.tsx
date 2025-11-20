import { useState, useEffect } from 'react';
import { config } from '../config';

interface Customer {
  id: string;
  name: string;
  email?: string;
}

interface CustomerSelectorProps {
  onSelect: (customerId: string, customerName?: string) => void;
  initialValue?: string;
  className?: string;
}

export default function CustomerSelector({ onSelect, initialValue, className = '' }: CustomerSelectorProps) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialValue || '');

  // Load initial customer list on mount
  useEffect(() => {
    loadCustomers('');
  }, []);

  async function loadCustomers(searchQuery: string) {
    setLoading(true);
    setError(null);

    try {
      const url = `${config.api.baseUrl}/customers/search?q=${encodeURIComponent(searchQuery)}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load customers: ${response.statusText}`);
      }

      const data = await response.json();
      setCustomers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load customers';
      setError(errorMessage);
      console.error('Customer search error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    setQuery(value);
    await loadCustomers(value);
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const customerId = e.target.value;
    setSelectedCustomerId(customerId);

    const selectedCustomer = customers.find(c => c.id === customerId);
    onSelect(customerId, selectedCustomer?.name);
  }

  return (
    <div className={className}>
      <label className="block text-sm font-semibold mb-1 text-gray-700">
        Customer
      </label>

      {/* Search bar */}
      <input
        type="text"
        value={query}
        onChange={handleSearch}
        placeholder="Search customers by name or email..."
        className="border border-gray-300 rounded px-3 py-2 w-full mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      />

      {/* Error message */}
      {error && (
        <div className="text-red-600 text-sm mb-2 p-2 bg-red-50 rounded">
          {error}
        </div>
      )}

      {/* Dropdown */}
      <select
        value={selectedCustomerId}
        onChange={handleSelectChange}
        className="border border-gray-300 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        disabled={loading}
      >
        <option value="">
          {loading ? 'Loading customers...' : 'Select a customer'}
        </option>

        {!loading && customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.name}
            {customer.email ? ` (${customer.email})` : ''}
          </option>
        ))}
      </select>

      {/* Loading indicator */}
      {loading && (
        <div className="text-sm text-gray-500 mt-1">
          Searching...
        </div>
      )}

      {/* Results count */}
      {!loading && customers.length > 0 && (
        <div className="text-sm text-gray-500 mt-1">
          {customers.length} customer{customers.length !== 1 ? 's' : ''} found
        </div>
      )}

      {/* No results message */}
      {!loading && customers.length === 0 && query && (
        <div className="text-sm text-gray-500 mt-1">
          No customers found matching "{query}"
        </div>
      )}
    </div>
  );
}
