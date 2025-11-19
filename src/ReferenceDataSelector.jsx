import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Building2, Users, MapPin } from 'lucide-react';
import { getDisplayName, NETSUITE_CLASSES, NETSUITE_DEPARTMENTS, NETSUITE_LOCATIONS } from './netsuiteData';

/**
 * Reference Data Selector Component
 *
 * Dropdown selectors for Class, Department, and Location
 * Used when creating estimates or other transactions
 */
export default function ReferenceDataSelector({ value, onChange, type, label, icon: Icon, placeholder }) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState([]);
  const [search, setSearch] = useState('');

  // Load data from localStorage or use defaults
  useEffect(() => {
    const savedData = localStorage.getItem(`netsuite_${type}`);
    if (savedData) {
      setData(JSON.parse(savedData));
    } else {
      // Fallback to defaults if no local data exists
      switch (type) {
        case 'classes':
          setData(NETSUITE_CLASSES);
          break;
        case 'departments':
          setData(NETSUITE_DEPARTMENTS);
          break;
        case 'locations':
          setData(NETSUITE_LOCATIONS);
          break;
        default:
          setData([]);
      }
    }
  }, [type]);

  // Filter data based on search
  const filteredData = data.filter(item => {
    const displayName = getDisplayName(item);
    const searchLower = search.toLowerCase();
    return (
      displayName.toLowerCase().includes(searchLower) ||
      item.name.toLowerCase().includes(searchLower) ||
      (item.id && item.id.toString().toLowerCase().includes(searchLower))
    );
  });

  // Get selected item
  const selectedItem = data.find(item => item.id === value || item.name === value);
  const selectedDisplay = selectedItem ? getDisplayName(selectedItem) : null;

  // Handle selection
  const handleSelect = (item) => {
    onChange({
      id: item.id,
      name: item.name,
      displayName: item.displayName
    });
    setIsOpen(false);
    setSearch('');
  };

  // Clear selection
  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  return (
    <div className="relative">
      {/* Label */}
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}

      {/* Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 border rounded-lg transition-all ${
          isOpen
            ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-30'
            : 'border-gray-300 hover:border-gray-400'
        } bg-white`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {Icon && <Icon size={18} className="text-gray-400 flex-shrink-0" />}
          {selectedDisplay ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm text-gray-900 truncate">{selectedDisplay}</span>
              {selectedItem?.displayName && (
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                  Custom
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500">{placeholder || `Select ${label}`}</span>
          )}
        </div>

        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
          {selectedDisplay && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Clear selection"
            >
              <X size={14} className="text-gray-500" />
            </button>
          )}
          <ChevronDown
            size={18}
            className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setSearch('');
            }}
          />

          {/* Options */}
          <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden">
            {/* Search */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label?.toLowerCase()}...`}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
                onClick={(e) => e.stopPropagation()}
                autoFocus
              />
            </div>

            {/* Options List */}
            <div className="overflow-y-auto max-h-52">
              {filteredData.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No {label?.toLowerCase()} found
                </div>
              ) : (
                filteredData.map(item => {
                  const displayName = getDisplayName(item);
                  const isSelected = item.id === value || item.name === value;
                  const isRenamed = item.displayName !== null;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={`w-full px-4 py-2.5 text-left hover:bg-blue-50 transition-colors ${
                        isSelected ? 'bg-blue-100' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {displayName}
                            </span>
                            {isRenamed && (
                              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded flex-shrink-0">
                                Custom
                              </span>
                            )}
                          </div>
                          {isRenamed && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              Original: {item.name}
                            </p>
                          )}
                          {item.email && type === 'employees' && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {item.email}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                          ID: {item.id}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Quick component for Class selector
 */
export function ClassSelector({ value, onChange, label = 'Class' }) {
  return (
    <ReferenceDataSelector
      value={value}
      onChange={onChange}
      type="classes"
      label={label}
      icon={Building2}
      placeholder="Select class (optional)"
    />
  );
}

/**
 * Quick component for Department selector
 */
export function DepartmentSelector({ value, onChange, label = 'Department' }) {
  return (
    <ReferenceDataSelector
      value={value}
      onChange={onChange}
      type="departments"
      label={label}
      icon={Users}
      placeholder="Select department (optional)"
    />
  );
}

/**
 * Quick component for Location selector
 */
export function LocationSelector({ value, onChange, label = 'Location' }) {
  return (
    <ReferenceDataSelector
      value={value}
      onChange={onChange}
      type="locations"
      label={label}
      icon={MapPin}
      placeholder="Select location (optional)"
    />
  );
}
