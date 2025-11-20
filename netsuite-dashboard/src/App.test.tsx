import React, { act } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import APIService from './api-service';

jest.mock('./api-service', () => ({
  __esModule: true,
  default: {
    generateScenario: jest.fn(),
    getTemplates: jest.fn()
  }
}));

const mockTemplates = [
  {
    id: 'mock-template',
    name: 'SaaS Playbook',
    description: 'API-delivered scenario seed',
    industry: 'SaaS',
    focusAreas: ['ARR'],
    budgetRange: '$100K-$200K',
    suggestedSize: '120-200 employees',
    prompt: 'Build a SaaS scaling scenario',
    defaultStatus: 'Hot'
  }
];

const mockScenarioResponse = {
  id: 'scenario-123',
  name: 'Mock Generated Co',
  industry: 'SaaS',
  prompt: 'Mock prompt text',
  status: 'Active',
  focus: ['ARR'],
  budget: '$150K-$250K'
};

const mockedApiService = APIService as jest.Mocked<typeof APIService>;

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn(() => Promise.resolve())
    },
    configurable: true
  });
  mockedApiService.getTemplates.mockResolvedValue({ templates: mockTemplates });
  mockedApiService.generateScenario.mockResolvedValue(mockScenarioResponse);
});

const openScenarioGenerator = async () => {
  const demoBuilderTab = screen.getByRole('button', { name: /Demo Builder/i });
  await act(async () => {
    await userEvent.click(demoBuilderTab);
  });

  const launchButton = screen.getByRole('button', { name: /Launch Scenario Generator/i });
  await act(async () => {
    await userEvent.click(launchButton);
  });

  await screen.findByText(/AI Scenario Generator/i);
};

const typeText = async (element: HTMLElement, value: string) => {
  await act(async () => {
    await userEvent.type(element, value);
  });
};

const copyFirstPrompt = async () => {
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
};

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

    await copyFirstPrompt();

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  test('launching AI scenario builder opens modal', async () => {
    render(<App />);

    await openScenarioGenerator();

    expect(screen.getByText(/AI Scenario Generator/i)).toBeInTheDocument();
  });

  test('allows saving custom templates via the template manager', async () => {
    render(<App />);

    await openScenarioGenerator();

    const manageTemplatesButton = await screen.findByRole('button', { name: /Manage templates/i });
    await act(async () => {
      await userEvent.click(manageTemplatesButton);
    });

    await typeText(screen.getByPlaceholderText(/Template name/i), 'Enterprise Field Ops');
    await typeText(screen.getByPlaceholderText(/Short description/i), 'Field services stress test');
    await typeText(screen.getByPlaceholderText(/^Industry$/i), 'Energy & Utilities');
    await typeText(screen.getByPlaceholderText(/Default status/i), 'Qualified');
    await typeText(
      screen.getByPlaceholderText(/Focus areas \(comma separated\)/i),
      'Field Service, Compliance'
    );
    await typeText(screen.getByPlaceholderText(/Budget range/i), '$350K-$500K');
    await typeText(screen.getByPlaceholderText(/Suggested size/i), '250-400 employees');
    await typeText(
      screen.getByPlaceholderText(/Prompt details/i),
      'Build a compliance-heavy field ops demo'
    );

    const saveButton = screen.getByRole('button', { name: /Save template/i });
    await act(async () => {
      await userEvent.click(saveButton);
    });

    await screen.findByText(/Template saved locally/i);

    const newOption = screen.getByRole('option', {
      name: /Enterprise Field Ops - Field services stress test/i
    });
    expect(newOption).toBeInTheDocument();
  });

  test('provides scenario export helpers after generation', async () => {
    render(<App />);

    await openScenarioGenerator();

    const generatorModal = screen.getByRole('dialog', { name: /AI Scenario Generator/i });
    const templateSelect = within(generatorModal).getByRole('combobox');
    await within(generatorModal).findByRole('option', {
      name: /SaaS Playbook - API-delivered scenario seed/i
    });
    await act(async () => {
      await userEvent.selectOptions(templateSelect, 'mock-template');
    });

    await typeText(
      screen.getByPlaceholderText(/Acme Professional Services/i),
      'Aviato Services'
    );
    await typeText(
      screen.getByPlaceholderText(/Professional Services, Manufacturing/i),
      'SaaS'
    );
    await typeText(
      screen.getByPlaceholderText(/specific requirements/i),
      'Highlight ARR forecasting and usage-based billing.'
    );

    const generateButton = screen.getByRole('button', { name: /Generate Scenario/i });
    await waitFor(() => {
      expect(generateButton).not.toBeDisabled();
    });
    await act(async () => {
      await userEvent.click(generateButton);
    });

    const copyJsonButton = await screen.findByRole('button', { name: /Copy JSON/i });
    const promptBundleButton = screen.getByRole('button', { name: /Prompt bundle/i });
    const downloadButton = screen.getByRole('button', { name: /Download/i });

    const clipboardMock = navigator.clipboard.writeText as jest.Mock;
    const initialCalls = clipboardMock.mock.calls.length;
    await act(async () => {
      await userEvent.click(copyJsonButton);
    });
    expect(clipboardMock.mock.calls.length).toBe(initialCalls + 1);
    expect(clipboardMock.mock.calls.at(-1)?.[0]).toContain('"name": "Mock Generated Co"');

    const callsBeforeBundle = clipboardMock.mock.calls.length;
    await act(async () => {
      await userEvent.click(promptBundleButton);
    });
    expect(clipboardMock.mock.calls.length).toBe(callsBeforeBundle + 1);
    expect(clipboardMock.mock.calls.at(-1)?.[0]).toContain('Scenario: Mock Generated Co');

    const anchorClickSpy = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    let urlCreateSpy: jest.SpyInstance | null = null;
    let urlCreateFallback: jest.Mock | null = null;
    if (typeof URL.createObjectURL === 'function') {
      urlCreateSpy = jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    } else {
      urlCreateFallback = jest.fn().mockReturnValue('blob:mock');
      (URL as unknown as { createObjectURL?: jest.Mock }).createObjectURL = urlCreateFallback;
    }

    let urlRevokeSpy: jest.SpyInstance | null = null;
    let urlRevokeFallback: jest.Mock | null = null;
    if (typeof URL.revokeObjectURL === 'function') {
      urlRevokeSpy = jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    } else {
      urlRevokeFallback = jest.fn();
      (URL as unknown as { revokeObjectURL?: jest.Mock }).revokeObjectURL = urlRevokeFallback;
    }

    await act(async () => {
      await userEvent.click(downloadButton);
    });
    expect(anchorClickSpy).toHaveBeenCalled();
    if (urlCreateSpy) {
      expect(urlCreateSpy).toHaveBeenCalled();
    } else {
      expect(urlCreateFallback).toHaveBeenCalled();
    }

    anchorClickSpy.mockRestore();
    urlCreateSpy?.mockRestore();
    urlRevokeSpy?.mockRestore();
  });

  test('clipboard drawer toggles via keyboard shortcut', async () => {
    render(<App />);

    await copyFirstPrompt();

    await act(async () => {
      fireEvent.keyDown(window, { key: 'c', ctrlKey: true, shiftKey: true });
    });

    const panelHeading = await screen.findByText(/Clipboard History/i);
    expect(screen.getByText(/Recently copied prompts/i)).toBeInTheDocument();
    const clipboardPanel = panelHeading.closest('[role="dialog"]') as HTMLElement;

    const closeButton = screen.getByLabelText(/Close clipboard history/i);
    await act(async () => {
      await userEvent.click(closeButton);
    });

    await waitFor(() => {
      expect(clipboardPanel.className).toContain('translate-x-full');
    });
  });

  test('quick create modal opens from header button', async () => {
    render(<App />);

    const addProspectButton = screen.getAllByRole('button', { name: /Add Prospect/i })[0];
    await act(async () => {
      await userEvent.click(addProspectButton);
    });

    await screen.findByText(/Create New Prospect/i);
    expect(screen.getByText(/Capture discovery context/i)).toBeInTheDocument();

    const closeQuickCreate = screen.getByLabelText(/Close quick create modal/i);
    await act(async () => {
      await userEvent.click(closeQuickCreate);
    });

    await waitFor(() => {
      expect(screen.queryByText(/Create New Prospect/i)).not.toBeInTheDocument();
    });
  });
});
