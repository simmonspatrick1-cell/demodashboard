import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeAll(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockResolvedValue(undefined)
    },
    configurable: true
  });
});

describe('Demo Dashboard App', () => {
  test('renders mission banner and account switcher', () => {
    render(<App />);

    expect(screen.getByText(/NetSuite Resource Planner/i)).toBeInTheDocument();
    expect(screen.getByText(/Demo Prep Mission/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Services Stairway/i })).toBeInTheDocument();
  });

  test('filters customer list based on search input', async () => {
    render(<App />);

    const searchInput = screen.getByPlaceholderText(/Search prospects or industries/i);
    await userEvent.clear(searchInput);
    await userEvent.type(searchInput, 'AdvisorHR');

    expect(screen.getAllByText('AdvisorHR').length).toBeGreaterThan(0);
    expect(screen.queryByText('GSB Group')).not.toBeInTheDocument();
  });

  test('sync quick action populates custom fields', async () => {
    render(<App />);

    const syncButtons = await screen.findAllByRole('button', { name: /Sync NetSuite/i });
    await userEvent.click(syncButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/AI Generated Summary/i)).toBeInTheDocument();
    });
  });
});
