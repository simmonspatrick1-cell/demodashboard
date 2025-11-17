// Advanced Search and Filtering Component
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, Filter, X, Calendar, Tag, Zap, Clock, SortAsc, SortDesc } from 'lucide-react';
import storageService from './storage-service';

interface SearchFilters {
  query: string;
  industry: string[];
  category: string[];
  aiGenerated: boolean | null;
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  tags: string[];
  sortBy: 'name' | 'date' | 'category' | 'relevance';
  sortOrder: 'asc' | 'desc';
}

interface AdvancedSearchProps {
  onFiltersChange: (filters: SearchFilters) => void;
  availableIndustries?: string[];
  availableCategories?: string[];
  availableTags?: string[];
  className?: string;
  showAdvancedFilters?: boolean;
}

const defaultFilters: SearchFilters = {
  query: '',
  industry: [],
  category: [],
  aiGenerated: null,
  dateRange: { start: null, end: null },
  tags: [],
  sortBy: 'relevance',
  sortOrder: 'desc'
};

export default function AdvancedSearch({
  onFiltersChange,
  availableIndustries = ['Technology', 'Healthcare', 'Finance', 'Manufacturing', 'Retail', 'Education'],
  availableCategories = ['Customer Onboarding', 'Project Planning', 'Resource Allocation', 'Performance Review', 'Strategic Planning'],
  availableTags = ['urgent', 'demo', 'template', 'ai-generated', 'custom'],
  className = '',
  showAdvancedFilters = false
}: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [showFilters, setShowFilters] = useState(showAdvancedFilters);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const debouncedFilterChangeRef = useRef<((filters: SearchFilters) => void) | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(storageService.getRecentSearches());
  }, []);

  // Debounced filter change handler
  useEffect(() => {
    debouncedFilterChangeRef.current = debounce((newFilters: SearchFilters) => {
      onFiltersChange(newFilters);

      if (newFilters.query.trim()) {
        storageService.addRecentSearch(newFilters.query);
        setRecentSearches(storageService.getRecentSearches());
      }
    }, 300);

    return () => {
      debouncedFilterChangeRef.current = null;
    };
  }, [onFiltersChange]);

  // Update filters and trigger change
  const updateFilters = (updates: Partial<SearchFilters>) => {
    const newFilters = { ...filters, ...updates };
    setFilters(newFilters);
    if (debouncedFilterChangeRef.current) {
      debouncedFilterChangeRef.current(newFilters);
    } else {
      onFiltersChange(newFilters);
    }
  };

  // Handle search input change
  const handleSearchChange = (value: string) => {
    updateFilters({ query: value });
  };

  // Handle multi-select filters
  const toggleArrayFilter = (key: keyof SearchFilters, value: any) => {
    const currentArray = filters[key] as any[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilters({ [key]: newArray });
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
  };

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.industry.length > 0) count++;
    if (filters.category.length > 0) count++;
    if (filters.aiGenerated !== null) count++;
    if (filters.dateRange.start || filters.dateRange.end) count++;
    if (filters.tags.length > 0) count++;
    return count;
  }, [filters]);

  // Quick filter presets
  const quickFilters = [
    { label: 'AI Generated', action: () => updateFilters({ aiGenerated: true }) },
    { label: 'This Week', action: () => {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      updateFilters({ dateRange: { start, end: new Date() } });
    }},
    { label: 'Technology', action: () => updateFilters({ industry: ['Technology'] }) },
    { label: 'Templates', action: () => updateFilters({ tags: ['template'] }) }
  ];

  return (
    <div className={`${className} space-y-4`}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search scenarios, prompts, or descriptions..."
            value={filters.query}
            onChange={(e) => handleSearchChange(e.target.value)}
            onFocus={() => setShowSearchSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
            className="input pl-10 pr-12 py-3"
          />
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {filters.query && (
              <button
                onClick={() => handleSearchChange('')}
                className="btn-ghost p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              aria-label="Toggle filters"
              title="Toggle filters (F)"
              onClick={() => setShowFilters(!showFilters)}
              className={`relative btn-ghost p-1 ${activeFilterCount > 0 ? 'text-blue-600 bg-blue-50' : 'text-gray-400'} hover:text-blue-600`}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search Suggestions */}
        {showSearchSuggestions && (filters.query || recentSearches.length > 0) && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
            {filters.query && (
              <div className="p-2 border-b">
                <div className="text-xs font-medium text-gray-500 mb-1">Search for:</div>
                <button
                  onClick={() => setShowSearchSuggestions(false)}
                  className="w-full text-left px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm"
                >
                  "{filters.query}"
                </button>
              </div>
            )}
            {recentSearches.length > 0 && (
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 mb-1">Recent searches:</div>
                {recentSearches.slice(0, 5).map((search, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      handleSearchChange(search);
                      setShowSearchSuggestions(false);
                    }}
                    className="w-full text-left px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded text-sm flex items-center"
                  >
                    <Clock className="w-3 h-3 mr-2 text-gray-400" />
                    {search}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        {quickFilters.map((filter, index) => (
          <button
            key={index}
            onClick={filter.action}
            className="btn-secondary px-3 py-1 text-sm rounded-full"
          >
            {filter.label}
          </button>
        ))}
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors flex items-center"
          >
            <X className="w-3 h-3 mr-1" />
            Clear All
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4 border dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Advanced Filters</h4>
            <button
              onClick={() => setShowFilters(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Industry Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Industry</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableIndustries.map((industry) => (
                  <label key={industry} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.industry.includes(industry)}
                      onChange={() => toggleArrayFilter('industry', industry)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{industry}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {availableCategories.map((category) => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.category.includes(category)}
                      onChange={() => toggleArrayFilter('category', category)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* AI Generated Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
              <div className="space-y-1">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="aiGenerated"
                    checked={filters.aiGenerated === null}
                    onChange={() => updateFilters({ aiGenerated: null })}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">All</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="aiGenerated"
                    checked={filters.aiGenerated === true}
                    onChange={() => updateFilters({ aiGenerated: true })}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Zap className="w-3 h-3 ml-2 mr-1 text-blue-500" />
                  <span className="text-sm text-gray-700">AI Generated</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="aiGenerated"
                    checked={filters.aiGenerated === false}
                    onChange={() => updateFilters({ aiGenerated: false })}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Manual</span>
                </label>
              </div>
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.dateRange.start?.toISOString().split('T')[0] || ''}
                onChange={(e) => updateFilters({
                  dateRange: { ...filters.dateRange, start: e.target.value ? new Date(e.target.value) : null }
                })}
                className="select text-sm w-auto"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={filters.dateRange.end?.toISOString().split('T')[0] || ''}
                onChange={(e) => updateFilters({
                  dateRange: { ...filters.dateRange, end: e.target.value ? new Date(e.target.value) : null }
                })}
                className="input text-sm w-auto"
              />
            </div>
          </div>

          {/* Tags Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleArrayFilter('tags', tag)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    filters.tags.includes(tag)
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Tag className="w-3 h-3 inline mr-1" />
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Sorting */}
          <div className="flex items-center space-x-4 pt-2 border-t">
            <label className="block text-sm font-medium text-gray-700">Sort by:</label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value as any })}
                className="input text-sm w-auto"
            >
              <option value="relevance">Relevance</option>
              <option value="name">Name</option>
              <option value="date">Date</option>
              <option value="category">Category</option>
            </select>
            <button
              onClick={() => updateFilters({ sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
              className="p-1 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white"
              title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {filters.sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.industry.map((industry) => (
            <span
              key={`industry-${industry}`}
              className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
            >
              Industry: {industry}
              <button
                onClick={() => toggleArrayFilter('industry', industry)}
                className="ml-1 text-blue-600 hover:text-blue-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.category.map((category) => (
            <span
              key={`category-${category}`}
              className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full"
            >
              Category: {category}
              <button
                onClick={() => toggleArrayFilter('category', category)}
                className="ml-1 text-green-600 hover:text-green-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {filters.aiGenerated !== null && (
            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
              {filters.aiGenerated ? 'AI Generated' : 'Manual'}
              <button
                onClick={() => updateFilters({ aiGenerated: null })}
                className="ml-1 text-purple-600 hover:text-purple-800"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  }) as T;
}
