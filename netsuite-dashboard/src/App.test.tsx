import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('Demo Dashboard App', () => {
  test('renders dashboard header, account switcher, and guidance panels', () => {
    render(<App />);

    expect(screen.getByText(/Demo Master Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Demo Account/i)).toBeInTheDocument();
    expect(screen.getByText(/Guided Demo Checklist/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Prospects/i)).toBeInTheDocument();

    const accountSwitcher = screen.getByRole('button', { name: /Services Stairway/i });
    expect(accountSwitcher).toBeInTheDocument();
  });

  test('filters customer list based on search input', async () => {
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Search customers/i);
    await userEvent.type(searchInput, 'AdvisorHR');

    expect(screen.getAllByText('AdvisorHR').length).toBeGreaterThan(0);
    expect(screen.queryByText('GSB Group')).not.toBeInTheDocument();
  });

  test('selecting a customer reveals detailed context and actions', async () => {
    render(<App />);

    const customerButton = screen.getAllByRole('button', { name: /AdvisorHR/i })[0];
    await userEvent.click(customerButton);

    expect(screen.getByText(/Synced NetSuite Fields/i)).toBeInTheDocument();
    const quickActionsPanel = screen.getByText(/Quick Demo Tasks/i);
    expect(quickActionsPanel).toBeInTheDocument();

    expect(screen.getByText(/Entity ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Company Size/i)).toBeInTheDocument();
    expect(screen.getByText(/Budget Range/i)).toBeInTheDocument();
  });
});
