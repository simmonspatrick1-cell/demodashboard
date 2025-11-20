export interface Prospect {
  id: number;
  name: string;
  entityid: string;
  industry: string;
  size: string;
  status: string;
  demoDate: string;
  focus: string[];
  budget: string;
  nsId: number;
  website?: string;
  notes?: string;
  aiGenerated?: boolean;
  prompt?: string;
  description?: string;
  salesRep?: string;
  leadSource?: string;
  subsidiary?: string;
  phone?: string;
  email?: string;
  invoiceEmail?: string;
  paymentNotificationEmail?: string;
}

export interface PrepWorkflowStep {
  id: string;
  label: string;
  description?: string;
  done: boolean;
}

export interface PromptCategory {
  name: string;
  prompts: string[];
}

export interface QuickAction {
  id: string;
  label: string;
  description: string;
  action: () => void;
  disabled?: boolean;
}

export interface ProjectRecord {
  projectId: string;
  projectName: string;
  syncedAt: string;
  prompts: string[];
  notes?: string;
  website?: string;
  source: 'Manual' | 'Scenario Builder';
  tasks: { name: string; owner: string; status: 'Scheduled' | 'Pending' | 'Ready' }[];
}
