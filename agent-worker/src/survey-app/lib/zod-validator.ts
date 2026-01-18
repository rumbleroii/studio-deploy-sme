import { z } from 'zod';

/**
 * Zod Schema Validator for Survey Types
 *
 * This provides runtime validation for survey schemas to catch:
 * - Type mismatches (string vs number in showIf conditions)
 * - Missing required fields
 * - Invalid structures
 * - Logic errors
 *
 * NON-BREAKING: Validation runs in development mode only and logs warnings
 */

// ============================================================================
// ENUMS AND BASIC TYPES
// ============================================================================

export const QuestionTypeSchema = z.enum([
  'introduction',
  'single_choice',
  'multiple_choice',
  'matrix',
  'multi_grid',
  'ranking',
  'text',
  'numeric',
  'rating'
]);

export const LogicActionSchema = z.enum(['show', 'hide', 'skip', 'terminate']);

export const LogicOperatorSchema = z.enum([
  'eq',
  'neq',
  'gt',
  'lt',
  'gte',
  'lte',
  'in',
  'notIn',
  'contains',
  'and',
  'or'
]);

// ============================================================================
// EXPRESSION AND LOGIC
// ============================================================================

export const ExpressionSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    operator: LogicOperatorSchema,
    left: z.string().optional(), // Optional for compound operators (and/or)
    right: z.any().optional(), // Optional for compound operators (and/or)
    conditions: z.array(ExpressionSchema).optional() // Required for compound operators (and/or)
  }).superRefine((expr, ctx) => {
    // For compound operators (and/or), conditions array is required
    if (expr.operator === 'and' || expr.operator === 'or') {
      if (!expr.conditions || expr.conditions.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Operator "${expr.operator}" requires a non-empty conditions array`,
          path: ['conditions']
        });
      }
    } else {
      // For non-compound operators, left and right are required
      if (expr.left === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Operator "${expr.operator}" requires a "left" field (question ID)`,
          path: ['left']
        });
      }
      if (expr.right === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Operator "${expr.operator}" requires a "right" field (comparison value)`,
          path: ['right']
        });
      }
    }
  })
);

export const LogicConditionSchema = z.object({
  action: LogicActionSchema,
  when: ExpressionSchema,
  destination: z.string().optional()
});

// ============================================================================
// OPTIONS AND ROWS
// ============================================================================

export const OptionSchema = z.object({
  id: z.union([z.string(), z.number()]),
  label: z.string().min(1, 'Option label cannot be empty'),
  value: z.union([z.string(), z.number()]),
  showIf: ExpressionSchema.optional(),
  numericValue: z.number().optional(),
  tooltip: z.string().optional()
});

export const MatrixRowSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Matrix row label cannot be empty'),
  showIf: ExpressionSchema.optional()
});

// ============================================================================
// VALIDATION RULES
// ============================================================================

export const ValidationRuleSchema = z.object({
  type: z.enum(['required', 'min', 'max', 'pattern', 'custom']),
  value: z.any().optional(),
  message: z.string().optional()
});

// ============================================================================
// METADATA SCHEMAS
// ============================================================================

export const TextMetadataSchema = z.object({
  inputType: z.enum(['text', 'textarea', 'email', 'tel', 'url', 'number']).optional(),
  placeholder: z.string().optional(),
  rows: z.number().optional(),
  maxLength: z.number().optional(),
  showCharCount: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  rejectWhitespaceOnly: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  exclusiveOption: z.string().optional(),
  terminationPattern: z.string().optional(),
  terminationWarning: z.string().optional()
});

export const DynamicOptionsConfigSchema = z.object({
  sourceQuestionId: z.string(),
  generateFrom: z.enum(['selected_options', 'all_options']),
  excludeValues: z.array(z.union([z.string(), z.number()])).optional(),
  includeOtherText: z.boolean().optional()
});

export const MultipleChoiceMetadataSchema = z.object({
  minSelections: z.number().optional(),
  maxSelections: z.number().optional(),
  exclusiveOptions: z.array(z.number()).optional(),
  randomize: z.boolean().optional(),
  anchor: z.array(z.number()).optional(),
  order: z.enum(['default', 'alphabetical', 'randomize']).optional(),
  pipeOptionsFrom: DynamicOptionsConfigSchema.optional()
});

export const OtherOptionMetadataSchema = z.object({
  hasOtherOption: z.boolean(),
  otherOptionId: z.union([z.string(), z.number()]),
  otherInputRequired: z.boolean().optional(),
  otherInputPlaceholder: z.string().optional(),
  otherInputMaxLength: z.number().optional()
});

export const DynamicRowsConfigSchema = z.object({
  sourceQuestionId: z.string(),
  generateFrom: z.enum(['selected_options', 'all_options']),
  excludeValues: z.array(z.union([z.string(), z.number()])).optional(),
  includeOtherText: z.boolean().optional()
});

export const MatrixMetadataSchema = z.object({
  requireAllRows: z.boolean().optional(),
  randomizeRows: z.boolean().optional(),
  randomizeColumns: z.boolean().optional(),
  flipColumns: z.boolean().optional(),
  pipeRowsFrom: DynamicRowsConfigSchema.optional(),
  rowOtherSpecify: z.array(
    z.object({
      rowId: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean().optional()
    })
  ).optional()
});

export const RatingMetadataSchema = z.object({
  questionType: z.enum(['rating', 'slider', 'star']).optional(),
  scale: z.object({
    min: z.number(),
    max: z.number(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional()
  }).optional(),
  isNPS: z.boolean().optional()
});

export const NumericMetadataSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
  suffix: z.string().optional(),
  exclusiveOption: z.string().optional()
});

export const SumValidationConfigSchema = z.object({
  targetSum: z.number(),
  linkedQuestionIds: z.array(z.string()),
  errorMessage: z.string().optional()
});

export const OrderingConfigSchema = z.object({
  type: z.enum(['fixed', 'alphabetical', 'random']),
  randomSeed: z.string().optional(),
  anchors: z.array(
    z.object({
      optionId: z.union([z.string(), z.number()]),
      position: z.union([z.number(), z.enum(['first', 'last'])])
    })
  ).optional(),
  otherSpecifyPosition: z.enum(['bottom', 'above_exclusive']).optional(),
  exclusiveAtBottom: z.boolean().optional()
});

export const MultiGridMetadataSchema = z.object({
  selectionMode: z.enum(['single', 'multiple']),
  maxPerColumn: z.number().optional(),
  columnExclusiveOptions: z.array(z.union([z.string(), z.number()])).optional(),
  otherRowIds: z.array(z.string()).optional(),
  exclusiveRowIds: z.array(z.string()).optional(),
  perColumnExclusiveRows: z.array(z.string()).optional(),
  rowOtherSpecify: z.array(
    z.object({
      rowId: z.string(),
      required: z.boolean().optional(),
      placeholder: z.string().optional(),
      alwaysVisible: z.boolean().optional()
    })
  ).optional(),
  columnOtherSpecify: z.array(
    z.object({
      columnId: z.union([z.string(), z.number()]),
      required: z.boolean().optional(),
      placeholder: z.string().optional()
    })
  ).optional(),
  cellTerminations: z.array(
    z.object({
      rowId: z.string(),
      columnId: z.union([z.string(), z.number()]),
      action: z.literal('terminate'),
      destination: z.string().optional()
    })
  ).optional()
});

export const RankingQuestionMetadataSchema = z.object({
  minRank: z.number().optional(),
  maxRank: z.number().optional(),
  exactRank: z.number().optional(),
  uiMode: z.enum(['drag_drop', 'number_input', 'select']).optional()
});

export const LoopQuestionMetadataSchema = z.object({
  loopSourceQuestion: z.string(),
  loopItemKey: z.string().optional(),
  loopDisplayTemplate: z.string().optional()
});

// Combined metadata schema (all metadata types are optional)
export const QuestionMetadataSchema = z.object({
  // Text metadata
  inputType: z.enum(['text', 'textarea', 'email', 'tel', 'url', 'number']).optional(),
  placeholder: z.string().optional(),
  rows: z.number().optional(),
  maxLength: z.number().optional(),
  showCharCount: z.boolean().optional(),
  trimWhitespace: z.boolean().optional(),
  rejectWhitespaceOnly: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  exclusiveOption: z.string().optional(),
  terminationPattern: z.string().optional(),
  terminationWarning: z.string().optional(),

  // Multiple choice metadata
  minSelections: z.number().optional(),
  maxSelections: z.number().optional(),
  exclusiveOptions: z.array(z.number()).optional(),
  randomize: z.boolean().optional(),
  anchor: z.array(z.number()).optional(),
  order: z.enum(['default', 'alphabetical', 'randomize']).optional(),
  pipeOptionsFrom: DynamicOptionsConfigSchema.optional(),

  // Other option metadata
  hasOtherOption: z.boolean().optional(),
  otherOptionId: z.union([z.string(), z.number()]).optional(),
  otherInputRequired: z.boolean().optional(),
  otherInputPlaceholder: z.string().optional(),
  otherInputMaxLength: z.number().optional(),

  // Matrix metadata
  requireAllRows: z.boolean().optional(),
  randomizeRows: z.boolean().optional(),
  randomizeColumns: z.boolean().optional(),
  flipColumns: z.boolean().optional(),
  pipeRowsFrom: DynamicRowsConfigSchema.optional(),
  rowOtherSpecify: z.array(
    z.object({
      rowId: z.string(),
      placeholder: z.string().optional(),
      required: z.boolean().optional()
    })
  ).optional(),

  // Rating metadata
  questionType: z.enum(['rating', 'slider', 'star']).optional(),
  scale: z.object({
    min: z.number(),
    max: z.number(),
    minLabel: z.string().optional(),
    maxLabel: z.string().optional()
  }).optional(),
  isNPS: z.boolean().optional(),

  // Numeric metadata
  suffix: z.string().optional(),

  // Multi-grid metadata
  selectionMode: z.enum(['single', 'multiple']).optional(),
  maxPerColumn: z.number().optional(),
  columnExclusiveOptions: z.array(z.union([z.string(), z.number()])).optional(),
  otherRowIds: z.array(z.string()).optional(),
  exclusiveRowIds: z.array(z.string()).optional(),
  perColumnExclusiveRows: z.array(z.string()).optional(),
  columnOtherSpecify: z.array(
    z.object({
      columnId: z.union([z.string(), z.number()]),
      required: z.boolean().optional(),
      placeholder: z.string().optional()
    })
  ).optional(),
  cellTerminations: z.array(
    z.object({
      rowId: z.string(),
      columnId: z.union([z.string(), z.number()]),
      action: z.literal('terminate'),
      destination: z.string().optional()
    })
  ).optional(),

  // Ranking metadata
  minRank: z.number().optional(),
  maxRank: z.number().optional(),
  exactRank: z.number().optional(),
  uiMode: z.enum(['drag_drop', 'number_input', 'select']).optional(),

  // Loop metadata
  loopSourceQuestion: z.string().optional(),
  loopItemKey: z.string().optional(),
  loopDisplayTemplate: z.string().optional(),

  // General metadata
  piping: z.array(z.string()).optional(),
  conceptAssigned: z.string().optional(),
  ordering: OrderingConfigSchema.optional(),
  sumValidation: SumValidationConfigSchema.optional(),
  displayGroup: z.string().optional()
}).catchall(z.any()); // Allow additional custom properties

// ============================================================================
// QUESTION SCHEMA
// ============================================================================

export const QuestionSchema = z.object({
  id: z.string().min(1, 'Question ID is required'),
  type: QuestionTypeSchema,
  text: z.string().min(1, 'Question text is required'),
  description: z.string().optional(),
  required: z.boolean(),
  validation: z.array(ValidationRuleSchema).optional(),
  logic: z.array(LogicConditionSchema).optional(),
  options: z.array(OptionSchema).optional(),
  matrixRows: z.array(MatrixRowSchema).optional(),
  matrixColumns: z.array(OptionSchema).optional(),
  defaultNextQuestion: z.string().optional(),
  metadata: QuestionMetadataSchema.optional(),
  notes: z.array(z.string()).optional()
}).superRefine((question, ctx) => {
  // Question type-specific validation

  // Single choice and multiple choice must have options (unless dynamic piping)
  if ((question.type === 'single_choice' || question.type === 'multiple_choice')) {
    const hasDynamicOptions = question.metadata?.pipeOptionsFrom;
    if (!hasDynamicOptions && (!question.options || question.options.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${question.type} question "${question.id}" must have options array (or use pipeOptionsFrom for dynamic options)`,
        path: ['options']
      });
    }
  }

  // Matrix must have rows and columns (unless dynamic rows)
  if (question.type === 'matrix') {
    const hasDynamicRows = question.metadata?.pipeRowsFrom;
    const hasStaticRows = question.matrixRows && question.matrixRows.length > 0;

    if (!hasDynamicRows && !hasStaticRows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Matrix question "${question.id}" must have EITHER:\n  1. matrixRows array with at least one row (static rows), OR\n  2. metadata.pipeRowsFrom configuration (dynamic rows)\n  Currently has neither - matrix will have no rows to display!`,
        path: ['matrixRows']
      });
    }

    if (hasStaticRows && hasDynamicRows) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Matrix question "${question.id}" has BOTH static matrixRows AND pipeRowsFrom. Use only one: either define static rows OR use dynamic row piping, not both. For dynamic piping, set matrixRows: []`,
        path: ['matrixRows']
      });
    }

    if (!question.matrixColumns || question.matrixColumns.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Matrix question "${question.id}" must have matrixColumns array with at least one column`,
        path: ['matrixColumns']
      });
    }
  }

  // Multi-grid must have rows and columns
  if (question.type === 'multi_grid') {
    if (!question.matrixRows || question.matrixRows.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Multi-grid question "${question.id}" must have matrixRows array`,
        path: ['matrixRows']
      });
    }
    if (!question.matrixColumns || question.matrixColumns.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Multi-grid question "${question.id}" must have matrixColumns array`,
        path: ['matrixColumns']
      });
    }
  }

  // Ranking must have options
  if (question.type === 'ranking') {
    if (!question.options || question.options.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Ranking question "${question.id}" must have options array`,
        path: ['options']
      });
    }
  }

  // Validate "Other" option metadata
  if (question.metadata?.hasOtherOption) {
    if (!question.metadata.otherOptionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Question "${question.id}" has hasOtherOption=true but missing otherOptionId`,
        path: ['metadata', 'otherOptionId']
      });
    } else {
      // Check if otherOptionId exists in options
      const otherOptionExists = question.options?.some(
        opt => String(opt.id) === String(question.metadata!.otherOptionId)
      );
      if (!otherOptionExists && !question.metadata.pipeOptionsFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question "${question.id}" otherOptionId "${question.metadata.otherOptionId}" not found in options array`,
          path: ['metadata', 'otherOptionId']
        });
      }
    }
  }

  // Validate exclusive options exist in options array
  if (question.metadata?.exclusiveOptions && question.options) {
    question.metadata.exclusiveOptions.forEach(exclusiveId => {
      const optionExists = question.options!.some(opt => Number(opt.id) === exclusiveId);
      if (!optionExists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question "${question.id}" exclusiveOption ID ${exclusiveId} not found in options array`,
          path: ['metadata', 'exclusiveOptions']
        });
      }
    });
  }

  // Validate anchor options exist in options array
  if (question.metadata?.anchor && question.options) {
    question.metadata.anchor.forEach(anchorId => {
      const optionExists = question.options!.some(opt => Number(opt.id) === anchorId);
      if (!optionExists) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Question "${question.id}" anchor ID ${anchorId} not found in options array`,
          path: ['metadata', 'anchor']
        });
      }
    });
  }
});

// ============================================================================
// SECTION AND SURVEY SCHEMAS
// ============================================================================

export const SectionSchema = z.object({
  id: z.string().min(1, 'Section ID is required'),
  title: z.string().min(1, 'Section title is required'),
  description: z.string().optional(),
  questions: z.array(QuestionSchema).min(1, 'Section must have at least one question')
});

export const SurveyMetadataSchema = z.object({
  title: z.string().min(1, 'Survey title is required'),
  description: z.string().optional(),
  objectives: z.array(z.string()),
  audience: z.object({
    description: z.string(),
    sampleSize: z.number().positive(),
    quotas: z.array(z.string()).optional()
  }),
  version: z.number().positive()
});

export const RespondentMetadataFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  defaultValue: z.string().optional(),
  pipingKey: z.string().optional()
});

export const RespondentMetadataConfigSchema = z.object({
  fields: z.array(RespondentMetadataFieldSchema)
});

export const HiddenVariableSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['computed', 'derived', 'url_param', 'timestamp', 'random']),
  rules: z.array(
    z.object({
      condition: z.string(),
      value: z.union([z.string(), z.number()])
    })
  ).optional(),
  formula: z.string().optional(),
  computeOn: z.string().optional(),
  source: z.string().optional(),
  defaultValue: z.union([z.string(), z.number()]).optional(),
  dataType: z.enum(['string', 'number', 'boolean']).optional()
});

export const SurveySchema = z.object({
  id: z.string().min(1, 'Survey ID is required'),
  metadata: SurveyMetadataSchema,
  sections: z.array(SectionSchema).min(1, 'Survey must have at least one section'),
  settings: z.object({
    allowBack: z.boolean(),
    showProgress: z.boolean(),
    autoSave: z.boolean(),
    timeLimit: z.number().optional(),
    showTimer: z.boolean().optional()
  }).optional(),
  respondentMetadata: RespondentMetadataConfigSchema.optional(),
  hiddenVariables: z.array(HiddenVariableSchema).optional()
});

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export interface ValidationError {
  path: string;
  message: string;
  questionId?: string;
}

export interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validates a survey schema and returns detailed errors
 * NON-BREAKING: Does not throw, returns validation result
 */
export function validateSurvey(survey: any): ValidationResult {
  const result: ValidationResult = {
    success: true,
    errors: [],
    warnings: []
  };

  try {
    SurveySchema.parse(survey);
  } catch (error) {
    if (error instanceof z.ZodError) {
      result.success = false;
      result.errors = (error as z.ZodError).issues.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        questionId: extractQuestionId(err.path)
      }));
    } else {
      result.success = false;
      result.errors = [{
        path: 'survey',
        message: error instanceof Error ? error.message : 'Unknown validation error'
      }];
    }
  }

  // Additional semantic validation (warnings)
  result.warnings = performSemanticValidation(survey);

  return result;
}

/**
 * Extract question ID from error path for better debugging
 */
function extractQuestionId(path: (string | number)[]): string | undefined {
  const questionsIndex = path.indexOf('questions');
  if (questionsIndex !== -1 && path.length > questionsIndex + 2) {
    const questionIndex = path[questionsIndex + 1];
    if (typeof questionIndex === 'number') {
      return `questions[${questionIndex}]`;
    }
  }
  return undefined;
}

/**
 * Perform semantic validation that goes beyond basic schema validation
 * These are warnings that don't prevent the survey from working but indicate potential issues
 */
function performSemanticValidation(survey: any): ValidationError[] {
  const warnings: ValidationError[] = [];

  if (!survey.sections) return warnings;

  // Collect all question IDs and option values
  const questionIds = new Set<string>();
  const questionMap = new Map<string, any>();

  survey.sections.forEach((section: any, sectionIndex: number) => {
    section.questions?.forEach((question: any, questionIndex: number) => {
      if (question.id) {
        if (questionIds.has(question.id)) {
          warnings.push({
            path: `sections[${sectionIndex}].questions[${questionIndex}].id`,
            message: `Duplicate question ID: "${question.id}"`,
            questionId: question.id
          });
        }
        questionIds.add(question.id);
        questionMap.set(question.id, question);
      }

      // Check showIf value type consistency
      if (question.options) {
        question.options.forEach((option: any, optionIndex: number) => {
          if (option.showIf) {
            const sourceQuestionId = option.showIf.left;
            const compareValue = option.showIf.right;

            // Find source question to check value type
            const sourceQuestion = questionMap.get(sourceQuestionId);
            if (sourceQuestion?.options) {
              const sourceOptions = sourceQuestion.options;
              const sourceOptionValue = sourceOptions[0]?.value;

              if (sourceOptionValue !== undefined && typeof sourceOptionValue !== typeof compareValue) {
                warnings.push({
                  path: `sections[${sectionIndex}].questions[${questionIndex}].options[${optionIndex}].showIf`,
                  message: `Type mismatch in showIf: source question "${sourceQuestionId}" has ${typeof sourceOptionValue} values, but comparing to ${typeof compareValue}. This will cause the condition to ALWAYS fail (${typeof sourceOptionValue} !== ${typeof compareValue})`,
                  questionId: question.id
                });
              }
            }
          }
        });
      }

      // Check for "ASK IF" pattern - source routing + target show condition
      if (question.logic) {
        const hasShowCondition = question.logic.some((l: any) => l.action === 'show');
        if (hasShowCondition) {
          // This is a target question with show condition
          // Check if there's a source question with routing logic
          const showCondition = question.logic.find((l: any) => l.action === 'show');
          const sourceQuestionId = showCondition?.when?.left;

          if (sourceQuestionId) {
            const sourceQuestion = questionMap.get(sourceQuestionId);
            if (sourceQuestion) {
              const hasSkipLogic = sourceQuestion.logic?.some((l: any) =>
                l.action === 'skip' && l.destination === question.id
              );

              if (!hasSkipLogic) {
                warnings.push({
                  path: `sections[${sectionIndex}].questions[${questionIndex}].logic`,
                  message: `"ASK IF" pattern incomplete: Question "${question.id}" has show condition based on "${sourceQuestionId}", but "${sourceQuestionId}" lacks skip logic to route to "${question.id}". Add skip logic with destination: "${question.id}" to source question for reliable routing.`,
                  questionId: question.id
                });
              }
            }
          }
        }
      }
    });
  });

  return warnings;
}

/**
 * Format validation results for console output
 */
export function formatValidationResults(result: ValidationResult, surveyId: string): string {
  const lines: string[] = [];

  lines.push(`\n${'='.repeat(80)}`);
  lines.push(`📋 SURVEY VALIDATION RESULTS: ${surveyId}`);
  lines.push(`${'='.repeat(80)}\n`);

  if (result.success && result.errors.length === 0 && result.warnings.length === 0) {
    lines.push('✅ Survey schema is valid with no warnings!\n');
    return lines.join('\n');
  }

  if (result.errors.length > 0) {
    lines.push(`❌ ERRORS (${result.errors.length}):\n`);
    result.errors.forEach((error, index) => {
      lines.push(`${index + 1}. ${error.path}`);
      lines.push(`   ${error.message}`);
      if (error.questionId) {
        lines.push(`   (in ${error.questionId})`);
      }
      lines.push('');
    });
  }

  if (result.warnings.length > 0) {
    lines.push(`⚠️  WARNINGS (${result.warnings.length}):\n`);
    result.warnings.forEach((warning, index) => {
      lines.push(`${index + 1}. ${warning.path}`);
      lines.push(`   ${warning.message}`);
      if (warning.questionId) {
        lines.push(`   (in ${warning.questionId})`);
      }
      lines.push('');
    });
  }

  lines.push(`${'='.repeat(80)}\n`);

  return lines.join('\n');
}
