// Survey Type Definitions
// This is the SOURCE OF TRUTH for all survey schemas
// If skills documentation contradicts this file, follow this file

export type QuestionType =
  | 'introduction'
  | 'single_choice'
  | 'multiple_choice'
  | 'matrix'
  | 'multi_grid'
  | 'ranking'
  | 'text'
  | 'numeric'
  | 'rating';

export type LogicAction = 'show' | 'hide' | 'skip' | 'terminate';

export type LogicOperator = 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'notIn' | 'contains' | 'and' | 'or';

export interface Expression {
  operator: LogicOperator;
  left: string; // question ID or value
  right: any;
  conditions?: Expression[]; // for nested logic (AND/OR)
}

export interface LogicCondition {
  action: LogicAction;
  when: Expression;
  destination?: string; // question ID to navigate to (for skip/terminate)
}

export interface Option {
  id: string | number;
  label: string;
  value: string | number;
  showIf?: Expression;
  numericValue?: number;
}

export interface MatrixRow {
  id: string;
  label: string;
  showIf?: Expression;
}

export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message?: string;
}

/**
 * Metadata for text input questions
 */
export interface TextMetadata {
  inputType?: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'number';
  placeholder?: string;
  rows?: number; // For textarea
  maxLength?: number;
  showCharCount?: boolean;
  trimWhitespace?: boolean; // Default: true
  rejectWhitespaceOnly?: boolean; // Default: true
  min?: number; // For number inputs
  max?: number; // For number inputs
  exclusiveOption?: string; // Label for exclusive checkbox (e.g., "Don't know", "Prefer not to answer")
}

/**
 * Metadata for single choice and multiple choice questions
 */
export interface MultipleChoiceMetadata {
  minSelections?: number; // Minimum selections required (multiple choice)
  maxSelections?: number; // Maximum selections allowed (multiple choice)
  exclusiveOptions?: number[]; // Option IDs that deselect all others (e.g., "None of the above")
  randomize?: boolean; // Randomize option order (keeps order consistent per respondent)
  anchor?: number[]; // Option IDs to keep at end when randomizing (e.g., [99, 999] for "Other", "None")
  order?: 'default' | 'alphabetical' | 'randomize'; // Note: Only 'randomize' is currently implemented
}

/**
 * Metadata for "Other (please specify)" options
 */
export interface OtherOptionMetadata {
  hasOtherOption: boolean; // Enable "Other" text input functionality
  otherOptionId: string | number; // Which option ID triggers the text input
  otherInputRequired?: boolean; // Text input required when "Other" selected (default: true)
  otherInputPlaceholder?: string;
  otherInputMaxLength?: number;
}

/**
 * Metadata for matrix questions
 */
export interface MatrixMetadata {
  requireAllRows?: boolean; // Must answer every row (default: true)
}

/**
 * Metadata for rating scale questions
 */
export interface RatingMetadata {
  questionType?: 'rating' | 'slider' | 'star'; // UI rendering type
  scale?: {
    min: number;
    max: number;
    minLabel?: string;
    maxLabel?: string;
  };
  isNPS?: boolean; // Net Promoter Score (0-10 scale)
}

/**
 * Metadata for numeric questions
 */
export interface NumericMetadata {
  inputType?: 'number';
  min?: number;
  max?: number;
  suffix?: string; // e.g., "%" for percentages
  exclusiveOption?: string; // Label for exclusive checkbox (e.g., "Don't know", "Prefer not to answer")
}

export interface OrderingConfig {
  type: 'fixed' | 'alphabetical' | 'random';
  randomSeed?: string;
  anchors?: {
    optionId: string | number;
    position: number | 'first' | 'last';
  }[];
  otherSpecifyPosition?: 'bottom' | 'above_exclusive';
  exclusiveAtBottom?: boolean;
}

export interface MultiGridMetadata {
  selectionMode: 'single' | 'multiple';
  maxPerColumn?: number;
  columnExclusiveOptions?: (string | number)[];
  otherRowIds?: string[];
  exclusiveRowIds?: string[];
  rowOtherSpecify?: {
    rowId: string;
    required?: boolean;
    placeholder?: string;
  }[];
  columnOtherSpecify?: {
    columnId: string | number;
    required?: boolean;
    placeholder?: string;
  }[];
  cellTerminations?: {
    rowId: string;
    columnId: string | number;
    action: 'terminate';
    destination?: string;
  }[];
}

export interface RankingQuestionMetadata {
  minRank?: number;
  maxRank?: number;
  exactRank?: number;
  uiMode?: 'drag_drop' | 'number_input' | 'select';
}

export type QuestionMetadata =
  & Partial<TextMetadata>
  & Partial<MultipleChoiceMetadata>
  & Partial<OtherOptionMetadata>
  & Partial<MatrixMetadata>
  & Partial<RatingMetadata>
  & Partial<NumericMetadata>
  & Partial<MultiGridMetadata>
  & Partial<RankingQuestionMetadata>
  & {
    piping?: string[];
    conceptAssigned?: string;
    ordering?: OrderingConfig;
    [key: string]: any;
  };

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
  metadata?: QuestionMetadata;
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
