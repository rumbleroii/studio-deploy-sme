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
  left?: string; // question ID or value (optional for compound operators)
  right?: any; // value (optional for compound operators)
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
  /** Tooltip/hover text for extended option descriptions */
  tooltip?: string;
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

export interface TextMetadata {
  inputType?: 'text' | 'textarea' | 'email' | 'tel' | 'url' | 'number';
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
  trimWhitespace?: boolean;
  rejectWhitespaceOnly?: boolean;
  min?: number;
  max?: number;
  exclusiveOption?: string;
  terminationPattern?: string;
  terminationWarning?: string;
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
  pipeOptionsFrom?: DynamicOptionsConfig; // Generate options dynamically from previous question responses
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
 * Metadata for dynamic option piping (generating options from previous question responses)
 */
export interface DynamicOptionsConfig {
  sourceQuestionId: string; // Question ID to pull options from (e.g., 'Q9')
  generateFrom: 'selected_options' | 'all_options'; // What to use: user selections or all available options
  excludeValues?: (string | number)[]; // Values to filter out (e.g., ['none', 'other'])
  includeOtherText?: boolean; // If true, includes user-typed "Other" text as an option
}

/**
 * Dynamic row piping configuration - generates matrix rows from another question
 *
 * Supports:
 * - Multiple choice sources (selected options become rows)
 * - Matrix sources (answered rows become rows)
 * - Chained piping (Q9 → Q10 → Q11)
 *
 * @example
 * {
 *   sourceQuestionId: 'Q9',
 *   generateFrom: 'selected_options',
 *   excludeValues: ['none_of_above'],
 *   includeOtherText: true
 * }
 */
export interface DynamicRowsConfig {
  sourceQuestionId: string; // Question ID to pull rows from (e.g., 'Q9')
  generateFrom: 'selected_options' | 'all_options' | 'answered_rows'; // What to use: user selections, all options, or answered matrix rows
  excludeValues?: (string | number)[]; // Values to filter out (e.g., ['none', 'other'])
  includeOtherText?: boolean; // If true, includes user-typed "Other" text as a row
}

/**
 * Metadata for matrix questions
 */
export interface MatrixMetadata {
  requireAllRows?: boolean; // Must answer every row (default: true)
  randomizeRows?: boolean;
  randomizeColumns?: boolean;
  flipColumns?: boolean; // Reverse column order 50% of time per respondent
  pipeRowsFrom?: DynamicRowsConfig; // Generate rows dynamically from previous question responses
  rowOtherSpecify?: Array<{ rowId: string; placeholder?: string; required?: boolean }>;
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
  // inputType is handled by TextMetadata for broader compatibility
  min?: number;
  max?: number;
  suffix?: string; // e.g., "%" for percentages
  exclusiveOption?: string; // Label for exclusive checkbox (e.g., "Don't know", "Prefer not to answer")
}

/**
 * Sum validation configuration for questions that must sum to a target value
 * Used for percentage allocation questions (e.g., "allocate 100% across options")
 */
export interface SumValidationConfig {
  targetSum: number;
  linkedQuestionIds: string[];
  errorMessage?: string;
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
  /** Row IDs that are exclusive per-column (selecting this row in a column clears other rows in that column) */
  perColumnExclusiveRows?: string[];
  rowOtherSpecify?: {
    rowId: string;
    required?: boolean;
    placeholder?: string;
    alwaysVisible?: boolean; // Show text input even before row selection
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

/**
 * Loop question configuration - iterates through each value from a source question
 *
 * Response Storage:
 * - Loop responses are stored with iteration-specific keys
 * - Format: `${questionId}_${loopItem}` (e.g., "Q5_corona", "Q5_pacifico")
 * - Enables multiple iterations without overwriting responses
 *
 * Loop Source:
 * - Can be multiple_choice (array of selected values)
 * - Can be matrix (object keys = row IDs with non-null values)
 * - Exclusive options are automatically filtered out
 *
 * @example
 * {
 *   loopSourceQuestion: 'Q9',  // Multi-select: [corona, pacifico, modelo]
 *   loopItemKey: 'brand',      // Optional key name for metadata
 *   loopDisplayTemplate: 'Q10_[LOOP_INDEX]'  // Optional display format
 * }
 *
 * Results in questions: Q10_corona, Q10_pacifico, Q10_modelo
 */
export interface LoopQuestionMetadata {
  loopSourceQuestion: string;
  loopItemKey?: string;
  loopDisplayTemplate?: string;
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
  & Partial<LoopQuestionMetadata>
  & {
    piping?: string[];
    conceptAssigned?: string;
    ordering?: OrderingConfig;
    sumValidation?: SumValidationConfig;
    displayGroup?: string; // Questions with same displayGroup render on same screen
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
    timeLimit?: number;
    showTimer?: boolean;
  };
  respondentMetadata?: RespondentMetadataConfig;
  hiddenVariables?: HiddenVariable[];
}

export interface RespondentMetadataConfig {
  fields: RespondentMetadataField[];
}

export interface RespondentMetadataField {
  key: string;
  label: string;
  defaultValue?: string;
  pipingKey?: string;
}

/**
 * Hidden variable types for computed/derived values
 */
export type HiddenVariableType = 'computed' | 'derived' | 'url_param' | 'timestamp' | 'random';

export interface DerivedRule {
  condition: string; // Expression string like "Q3 in ['3_US', '4_US']"
  value: string | number;
}

export interface HiddenVariable {
  id: string;
  name: string;
  type: HiddenVariableType;
  // For 'derived' type - rules evaluated in order, first match wins
  rules?: DerivedRule[];
  // For 'computed' type - formula string
  formula?: string;
  // Question ID that triggers computation
  computeOn?: string;
  // For 'url_param' type
  source?: string;
  defaultValue?: string | number;
  // Data type of the result
  dataType?: 'string' | 'number' | 'boolean';
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
