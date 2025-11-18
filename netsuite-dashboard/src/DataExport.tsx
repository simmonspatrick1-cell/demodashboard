// Data Export Utility Component
import React, { useState } from 'react';
import { Download, FileText, Table, Database, Calendar, Loader2 } from 'lucide-react';
import { ExportOptions } from './api-service';

interface ExportComponentProps {
  data?: any[];
  className?: string;
  onExportComplete?: (success: boolean, filename?: string) => void;
}

export default function DataExport({ data = [], className = '', onExportComplete }: ExportComponentProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'json',
    includeFields: [],
    dateRange: undefined
  });
  const [showOptions, setShowOptions] = useState(false);

  // Available fields for export
  const availableFields = [
    { id: 'customerId', label: 'Customer ID', selected: true },
    { id: 'name', label: 'Customer Name', selected: true },
    { id: 'industry', label: 'Industry', selected: true },
    { id: 'status', label: 'Status', selected: true },
    { id: 'account', label: 'NetSuite Account', selected: true },
    { id: 'entityId', label: 'Entity ID', selected: true },
    { id: 'netsuiteId', label: 'NetSuite Internal ID', selected: true },
    { id: 'syncedAt', label: 'Synced At', selected: true },
    { id: 'projectId', label: 'Project ID', selected: true },
    { id: 'projectName', label: 'Project Name', selected: true },
    { id: 'projectSyncedAt', label: 'Project Synced At', selected: true },
    { id: 'email', label: 'Email', selected: false },
    { id: 'phone', label: 'Phone', selected: false },
    { id: 'projectSource', label: 'Project Source', selected: false },
    { id: 'projectPrompts', label: 'Project Prompts', selected: false },
    { id: 'projectTasks', label: 'Project Tasks', selected: false },
    { id: 'customFields', label: 'Custom Fields', selected: true },
    { id: 'raw', label: 'Raw Payload', selected: false }
  ];

  const [selectedFields, setSelectedFields] = useState(
    availableFields.filter(f => f.selected).map(f => f.id)
  );

  // Handle field selection toggle
  const toggleField = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    );
  };

  // Export as JSON
  const exportAsJSON = async () => {
    try {
      setIsExporting(true);
      
      // Filter data based on selected fields
      const filteredData = data.map(item => {
        const filtered: any = {};
        selectedFields.forEach(field => {
          if (item.hasOwnProperty(field)) {
            filtered[field] = item[field];
          }
        });
        return filtered;
      });

      const exportData = {
        exportedAt: new Date().toISOString(),
        format: 'json',
        recordCount: filteredData.length,
        fields: selectedFields,
        data: filteredData
      };

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      downloadFile(blob, `netsuite-dashboard-export-${formatDate(new Date())}.json`);
      
      onExportComplete?.(true, `netsuite-dashboard-export-${formatDate(new Date())}.json`);
    } catch (error) {
      console.error('JSON export failed:', error);
      onExportComplete?.(false);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as CSV
  const exportAsCSV = async () => {
    try {
      setIsExporting(true);

      // Convert data to CSV format
      const headers = selectedFields.join(',');
      const rows = data.map(item => 
        selectedFields.map(field => {
          const value = item[field];
          if (value === null || value === undefined) return '';
          if (typeof value === 'object') return JSON.stringify(value);
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      );

      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      downloadFile(blob, `netsuite-dashboard-export-${formatDate(new Date())}.csv`);
      
      onExportComplete?.(true, `netsuite-dashboard-export-${formatDate(new Date())}.csv`);
    } catch (error) {
      console.error('CSV export failed:', error);
      onExportComplete?.(false);
    } finally {
      setIsExporting(false);
    }
  };

  // Export as Excel (basic implementation)
  const exportAsExcel = async () => {
    try {
      setIsExporting(true);

      // For now, we'll export as CSV with .xlsx extension
      // In a real implementation, you'd use a library like xlsx
      await exportAsCSV();
      
    } catch (error) {
      console.error('Excel export failed:', error);
      onExportComplete?.(false);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle export based on format
  const handleExport = async () => {
    if (data.length === 0) {
      alert('No data available to export');
      return;
    }

    if (selectedFields.length === 0) {
      alert('Please select at least one field to export');
      return;
    }

    switch (exportOptions.format) {
      case 'json':
        await exportAsJSON();
        break;
      case 'csv':
        await exportAsCSV();
        break;
      case 'xlsx':
        await exportAsExcel();
        break;
      default:
        await exportAsJSON();
    }

    setShowOptions(false);
  };

  // Utility function to download file
  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Format date for filename
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Quick export actions
  const quickExportActions = [
    {
      format: 'json' as const,
      icon: <Database className="w-4 h-4" />,
      label: 'JSON',
      description: 'Structured data format'
    },
    {
      format: 'csv' as const,
      icon: <Table className="w-4 h-4" />,
      label: 'CSV',
      description: 'Spreadsheet format'
    },
    {
      format: 'xlsx' as const,
      icon: <FileText className="w-4 h-4" />,
      label: 'Excel',
      description: 'Microsoft Excel format'
    }
  ];

  return (
    <div className={className}>
      {/* Export Button */}
      <div className="relative">
        <button
          onClick={() => setShowOptions(!showOptions)}
          disabled={isExporting || data.length === 0}
          aria-expanded={showOptions}
          aria-controls="export-options-panel"
          className={`
            inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium
            ${data.length === 0 
              ? 'text-gray-400 bg-gray-100 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed' 
              : 'text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500'
            }
            transition-colors
          `}
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isExporting ? 'Exporting...' : 'Export'}
          {data.length > 0 && !isExporting && (
            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200 text-xs rounded-full">
              {data.length}
            </span>
          )}
        </button>

        {/* Export Options Panel */}
        {showOptions && (
          <div id="export-options-panel" className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Export Options</h4>
                <button
                  onClick={() => setShowOptions(false)}
                  aria-label="Close export options"
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                <div className="grid grid-cols-1 gap-2">
                  {quickExportActions.map((action) => (
                    <button
                      key={action.format}
                      onClick={() => setExportOptions({ ...exportOptions, format: action.format })}
                      className={`
                        p-3 text-left border rounded-lg transition-colors
                        ${exportOptions.format === action.format
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center">
                        {action.icon}
                        <span className="ml-2 font-medium">{action.label}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Field Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fields to Include
                  <button
                    onClick={() => setSelectedFields(
                      selectedFields.length === availableFields.length 
                        ? [] 
                        : availableFields.map(f => f.id)
                    )}
                    className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                  >
                    {selectedFields.length === availableFields.length ? 'None' : 'All'}
                  </button>
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableFields.map((field) => (
                    <label key={field.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedFields.includes(field.id)}
                        onChange={() => toggleField(field.id)}
                        className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Date Range (Optional)
                </label>
                <div className="flex items-center space-x-2 text-sm">
                  <input
                    type="date"
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      dateRange: {
                        ...exportOptions.dateRange,
                        start: e.target.value ? new Date(e.target.value) : undefined
                      }
                    })}
                    className="border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="date"
                    onChange={(e) => setExportOptions({
                      ...exportOptions,
                      dateRange: {
                        ...exportOptions.dateRange,
                        end: e.target.value ? new Date(e.target.value) : undefined
                      }
                    })}
                    className="border-gray-300 rounded dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              {/* Export Summary */}
              <div className="bg-gray-50 dark:bg-gray-700 dark:text-gray-200 rounded p-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Records to export:</span>
                  <span className="font-medium">{data.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Selected fields:</span>
                  <span className="font-medium">{selectedFields.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Format:</span>
                  <span className="font-medium uppercase">{exportOptions.format}</span>
                </div>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting || selectedFields.length === 0}
                className={`
                  w-full py-2 px-4 rounded-lg font-medium transition-colors
                  ${selectedFields.length === 0
                    ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }
                `}
              >
                {isExporting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Download className="w-4 h-4 mr-2" />
                    Export {exportOptions.format.toUpperCase()}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
