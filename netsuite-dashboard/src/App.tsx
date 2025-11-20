import React, { useState, useEffect } from 'react';
import DemoDashboard from './DemoDashboard';
import CustomerSelectorDemo from './CustomerSelectorDemo';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-demo'>('dashboard');

  useEffect(() => {
    // Check URL hash for routing
    const hash = window.location.hash.slice(1);
    if (hash === 'customer-demo') {
      setCurrentView('customer-demo');
    }
  }, []);

  const handleViewChange = (view: 'dashboard' | 'customer-demo') => {
    setCurrentView(view);
    window.location.hash = view === 'dashboard' ? '' : view;
  };

  return (
    <ErrorBoundary>
      <div className="App">
        {/* Navigation Toggle */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => handleViewChange('dashboard')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'dashboard'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-600 border-2 border-blue-600 hover:bg-blue-50'
            }`}
            aria-label="Switch to Dashboard view"
            aria-current={currentView === 'dashboard' ? 'page' : undefined}
          >
            Dashboard
          </button>
          <button
            onClick={() => handleViewChange('customer-demo')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              currentView === 'customer-demo'
                ? 'bg-green-600 text-white'
                : 'bg-white text-green-600 border-2 border-green-600 hover:bg-green-50'
            }`}
            aria-label="Switch to Customer Demo view"
            aria-current={currentView === 'customer-demo' ? 'page' : undefined}
          >
            Customer Demo
          </button>
        </div>

        {/* Content */}
        <ErrorBoundary>
          {currentView === 'dashboard' ? <DemoDashboard /> : <CustomerSelectorDemo />}
        </ErrorBoundary>
      </div>
    </ErrorBoundary>
  );
}

export default App;
