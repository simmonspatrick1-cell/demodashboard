import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

beforeEach(() => {
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn(() => Promise.resolve())
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
    await act(async () => {
      await userEvent.clear(searchInput);
      await userEvent.type(searchInput, 'AdvisorHR');
    });

    expect(screen.getAllByText('AdvisorHR').length).toBeGreaterThan(0);
    expect(screen.queryByText('GSB Group')).not.toBeInTheDocument();
  });

  test('sync quick action populates custom fields', async () => {
    render(<App />);

    const syncButtons = await screen.findAllByRole('button', { name: /Sync NetSuite/i });
    await act(async () => {
      await userEvent.click(syncButtons[0]);
    });

    await waitFor(() => {
      expect(screen.getByText(/AI Generated Summary/i)).toBeInTheDocument();
    });
  });

  test('prompt copy button triggers clipboard mock', async () => {
    render(<App />);

    const promptTab = screen.getByRole('button', { name: /Demo Prompts/i });
    await act(async () => {
      await userEvent.click(promptTab);
    });

    const categoryToggle = await screen.findByRole('button', { name: /Customer Setup/i });
    await act(async () => {
      await userEvent.click(categoryToggle);
    });

    const copyButtons = await screen.findAllByRole('button', { name: /^Copy Prompt$/i });
    await act(async () => {
      await userEvent.click(copyButtons[0]);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  test('launching AI scenario builder opens modal', async () => {
    render(<App />);

    const demoBuilderTab = screen.getByRole('button', { name: /Demo Builder/i });
    await act(async () => {
      await userEvent.click(demoBuilderTab);
    });

    const launchButton = screen.getByRole('button', { name: /Launch Scenario Generator/i });
    await act(async () => {
      await userEvent.click(launchButton);
    });

    await waitFor(() => {
      expect(screen.getByText(/AI Scenario Generator/i)).toBeInTheDocument();
    });
  });
});
