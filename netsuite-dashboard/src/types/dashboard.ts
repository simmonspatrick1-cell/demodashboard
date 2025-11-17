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
  aiGenerated?: boolean;
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
