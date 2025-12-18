// Survey Type Definitions

export type QuestionType =
  | 'introduction'
  | 'single_choice'
  | 'multiple_choice'
  | 'matrix'
  | 'text'
  | 'numeric'
  | 'rating';

export type LogicAction = 'show' | 'hide' | 'skip' | 'terminate';

export type LogicOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'contains' | 'and' | 'or';

export interface Expression {
  operator: LogicOperator;
  left: string; // question ID or value
  right: any;
  conditions?: Expression[]; // for nested logic
}

export interface LogicCondition {
  action: LogicAction;
  when: Expression;
  destination?: string; // question ID to navigate to
}

export interface Option {
  id: string | number;
  label: string;
  value: string | number;
}

export interface MatrixRow {
  id: string;
  label: string;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  description?: string;
  required: boolean;
  validation?: ValidationRule[];
  logic?: LogicCondition[];
  options?: Option[];
  matrixRows?: MatrixRow[];
  matrixColumns?: Option[];
  defaultNextQuestion?: string;
  metadata?: {
    randomize?: boolean;
    anchor?: number[];
    piping?: string[];
    [key: string]: any;
  };
  notes?: string[];
}

export interface Section {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
}

export interface SurveyMetadata {
  title: string;
  description?: string;
  objectives: string[];
  audience: {
    description: string;
    sampleSize: number;
    quotas?: string[];
  };
  version: number;
}

export interface Survey {
  id: string;
  metadata: SurveyMetadata;
  sections: Section[];
  settings?: {
    allowBack: boolean;
    showProgress: boolean;
    autoSave: boolean;
    timeLimit?: number; // Time limit in seconds (optional)
    showTimer?: boolean; // Whether to display the timer to respondents
  };
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Record<string, any>;
  currentQuestionId: string;
  visitedQuestions: string[];
  startedAt: Date;
  lastSavedAt: Date;
  completedAt?: Date;
  status: 'in_progress' | 'completed' | 'terminated';
}
