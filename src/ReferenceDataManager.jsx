import React, { useState, useEffect } from 'react';
import { Edit2, Save, X, Check, Search, Filter, RefreshCw } from 'lucide-react';
import { NETSUITE_CLASSES, NETSUITE_DEPARTMENTS, NETSUITE_EMPLOYEES, NETSUITE_LOCATIONS, getDisplayName } from './netsuiteData';

/**
 * Reference Data Manager Component
 *
 * Allows users to view and rename NetSuite reference data (classes, departments, employees, locations)
 * with a clean, intuitive UI.
 */
export default function ReferenceDataManager({ onDataChange }) {
  const [activeTab, setActiveTab] = useState('classes');
  const [classes, setClasses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRenamed, setShowOnlyRenamed] = useState(false);

  // Load data from localStorage or use defaults
  useEffect(() => {
    const savedClasses = localStorage.getItem('netsuite_classes');
    const savedDepartments = localStorage.getItem('netsuite_departments');
    const savedEmployees = localStorage.getItem('netsuite_employees');
    const savedLocations = localStorage.getItem('netsuite_locations');

    setClasses(savedClasses ? JSON.parse(savedClasses) : [...NETSUITE_CLASSES]);
    setDepartments(savedDepartments ? JSON.parse(savedDepartments) : [...NETSUITE_DEPARTMENTS]);
    setEmployees(savedEmployees ? JSON.parse(savedEmployees) : [...NETSUITE_EMPLOYEES]);
    setLocations(savedLocations ? JSON.parse(savedLocations) : [...NETSUITE_LOCATIONS]);
  }, []);

  // Save to localStorage when data changes
  const saveData = (type, data) => {
    localStorage.setItem(`netsuite_${type}`, JSON.stringify(data));
    if (onDataChange) {
      onDataChange({ classes, departments, employees, locations });
    }
  };

  // Start editing a record
  const startEdit = (id, currentDisplayName, originalName) => {
    setEditingId(id);
    setEditValue(currentDisplayName || originalName);
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  // Save edited display name
  const saveEdit = (type) => {
    const updateData = (records) => {
      return records.map(record => {
        if (record.id === editingId) {
          // If edit value matches original name, set displayName to null
          const newDisplayName = editValue.trim() === record.name ? null : editValue.trim();
          return { ...record, displayName: newDisplayName };
        }
        return record;
      });
    };

    let updatedData;
    switch (type) {
      case 'classes':
        updatedData = updateData(classes);
        setClasses(updatedData);
        saveData('classes', updatedData);
        break;
      case 'departments':
        updatedData = updateData(departments);
        setDepartments(updatedData);
        saveData('departments', updatedData);
        break;
      case 'employees':
        updatedData = updateData(employees);
        setEmployees(updatedData);
        saveData('employees', updatedData);
        break;
      case 'locations':
        updatedData = updateData(locations);
        setLocations(updatedData);
        saveData('locations', updatedData);
        break;
    }

    cancelEdit();
  };

  // Reset display name to original
  const resetDisplayName = (type, id) => {
    const updateData = (records) => {
      return records.map(record =>
        record.id === id ? { ...record, displayName: null } : record
      );
    };

    let updatedData;
    switch (type) {
      case 'classes':
        updatedData = updateData(classes);
        setClasses(updatedData);
        saveData('classes', updatedData);
        break;
      case 'departments':
        updatedData = updateData(departments);
        setDepartments(updatedData);
        saveData('departments', updatedData);
        break;
      case 'employees':
        updatedData = updateData(employees);
        setEmployees(updatedData);
        saveData('employees', updatedData);
        break;
      case 'locations':
        updatedData = updateData(locations);
        setLocations(updatedData);
        saveData('locations', updatedData);
        break;
    }
  };

  // Reset all to defaults
  const resetAll = (type) => {
    if (!window.confirm('Reset all records to NetSuite defaults? This will remove all custom display names.')) {
      return;
    }

    switch (type) {
      case 'classes':
        setClasses([...NETSUITE_CLASSES]);
        saveData('classes', NETSUITE_CLASSES);
        break;
      case 'departments':
        setDepartments([...NETSUITE_DEPARTMENTS]);
        saveData('departments', NETSUITE_DEPARTMENTS);
        break;
      case 'employees':
        setEmployees([...NETSUITE_EMPLOYEES]);
        saveData('employees', NETSUITE_EMPLOYEES);
        break;
      case 'locations':
        setLocations([...NETSUITE_LOCATIONS]);
        saveData('locations', NETSUITE_LOCATIONS);
        break;
    }
  };

  // Filter records based on search and renamed filter
  const filterRecords = (records) => {
    return records.filter(record => {
      const matchesSearch = searchTerm === '' ||
        record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (record.displayName && record.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (record.email && record.email.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesRenamed = !showOnlyRenamed || record.displayName !== null;

      return matchesSearch && matchesRenamed;
    });
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'classes': return filterRecords(classes);
      case 'departments': return filterRecords(departments);
      case 'employees': return filterRecords(employees);
      case 'locations': return filterRecords(locations);
      default: return [];
    }
  };

  // Render a single record row
  const renderRecord = (record) => {
    const isEditing = editingId === record.id;
    const displayName = getDisplayName(record);
    const isRenamed = record.displayName !== null;

    return (
      <div
        key={record.id}
        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono">ID: {record.id}</span>
            {isRenamed && (
              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                Renamed
              </span>
            )}
          </div>

          {isEditing ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="flex-1 px-3 py-2 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Enter display name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit(activeTab);
                  if (e.key === 'Escape') cancelEdit();
                }}
              />
              <button
                onClick={() => saveEdit(activeTab)}
                className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                title="Save"
              >
                <Check size={16} />
              </button>
              <button
                onClick={cancelEdit}
                className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Cancel"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="mt-1">
              <p className="text-sm font-medium text-gray-900">{displayName}</p>
              {isRenamed && (
                <p className="text-xs text-gray-500 mt-0.5">Original: {record.name}</p>
              )}
              {record.email && (
                <p className="text-xs text-gray-500 mt-0.5">{record.email}</p>
              )}
              {record.department && activeTab === 'employees' && (
                <p className="text-xs text-gray-500 mt-0.5">Dept: {record.department}</p>
              )}
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={() => startEdit(record.id, record.displayName, record.name)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit display name"
            >
              <Edit2 size={16} />
            </button>
            {isRenamed && (
              <button
                onClick={() => resetDisplayName(activeTab, record.id)}
                className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                title="Reset to original name"
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'classes', label: 'Classes', count: classes.filter(c => c.displayName !== null).length },
    { id: 'departments', label: 'Departments', count: departments.filter(d => d.displayName !== null).length },
    { id: 'employees', label: 'Employees', count: employees.filter(e => e.displayName !== null).length },
    { id: 'locations', label: 'Locations', count: locations.filter(l => l.displayName !== null).length }
  ];

  const currentData = getCurrentData();
  const totalRenamed = tabs.find(t => t.id === activeTab)?.count || 0;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">NetSuite Reference Data</h2>
        <p className="text-gray-600">
          Manage and customize display names for classes, departments, employees, and locations.
          Custom names will be used in the dashboard while maintaining NetSuite integration.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
                setShowOnlyRenamed(false);
                cancelEdit();
              }}
              className={`px-4 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors">
          <input
            type="checkbox"
            checked={showOnlyRenamed}
            onChange={(e) => setShowOnlyRenamed(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <Filter size={16} className="text-gray-600" />
          <span className="text-sm text-gray-700">Show Only Renamed ({totalRenamed})</span>
        </label>

        <button
          onClick={() => resetAll(activeTab)}
          className="px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 border border-orange-300 rounded-lg transition-colors"
        >
          Reset All
        </button>
      </div>

      {/* Records List */}
      <div className="space-y-2">
        {currentData.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
            <p className="text-gray-500">
              {searchTerm || showOnlyRenamed
                ? 'No matching records found'
                : `No ${activeTab} available`}
            </p>
          </div>
        ) : (
          currentData.map(record => renderRecord(record))
        )}
      </div>

      {/* Footer Stats */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-blue-900">
            <strong>{currentData.length}</strong> {activeTab}
            {searchTerm && ' (filtered)'}
          </span>
          <span className="text-blue-700">
            <strong>{totalRenamed}</strong> custom display names
          </span>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-2">How it works:</h3>
        <ul className="text-sm text-gray-700 space-y-1">
          <li>• Click the edit icon to rename any record with a custom display name</li>
          <li>• Custom names appear in the dashboard, but NetSuite records remain unchanged</li>
          <li>• When exporting, both original and custom names are sent to maintain compatibility</li>
          <li>• Click the reset icon to revert to the original NetSuite name</li>
          <li>• All changes are saved automatically to your browser's local storage</li>
        </ul>
      </div>
    </div>
  );
}
