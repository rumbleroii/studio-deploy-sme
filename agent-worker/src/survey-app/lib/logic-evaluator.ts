import { Expression, LogicCondition, Question } from '../types/survey';
import { generateDynamicOptions } from './masking';
import { extractLoopItems, findFirstLoopQuestion, resolveItemLabel, resolveResponseValue } from './loop-utils';

/**
 * Evaluates a logic expression against current survey responses
 * @param allQuestions - Optional: needed for underscore notation in matrix references
 */
export function evaluateExpression(
  expression: Expression,
  responses: Record<string, any>,
  allQuestions?: Question[]
): boolean {
  const { operator, left, right, conditions } = expression;

  // Handle compound expressions (and/or)
  if (operator === 'and' && conditions) {
    return conditions.every(cond => evaluateExpression(cond, responses, allQuestions));
  }
  if (operator === 'or' && conditions) {
    return conditions.some(cond => evaluateExpression(cond, responses, allQuestions));
  }

  // Get the actual value from responses
  // Handles: direct key, dot notation (Q.row), underscore notation (Q_row for matrix)
  let leftValue;
  if (left.includes('.') && left.split('.')[1] === 'length') {
    // Special case: Q.length for array length
    const [questionId] = left.split('.');
    const value = responses[questionId];
    leftValue = Array.isArray(value) ? value.length : 0;
  } else {
    leftValue = resolveResponseValue(left, responses, allQuestions);
  }

  // Simple comparisons
  switch (operator) {
    case 'eq':
      return leftValue === right;
    case 'neq':
      return leftValue !== right;
    case 'gt':
      return Number(leftValue) > Number(right);
    case 'lt':
      return Number(leftValue) < Number(right);
    case 'gte':
      return Number(leftValue) >= Number(right);
    case 'lte':
      return Number(leftValue) <= Number(right);
    case 'in':
      if (Array.isArray(leftValue)) {
        return leftValue.some(val => (right as any[]).includes(val));
      }
      return (right as any[]).includes(leftValue);
    case 'notIn':
      if (Array.isArray(leftValue)) {
        return !leftValue.some(val => (right as any[]).includes(val));
      }
      return !(right as any[]).includes(leftValue);
    case 'contains':
      if (typeof leftValue === 'string' && typeof right === 'string') {
        return leftValue.includes(right);
      }
      if (Array.isArray(leftValue)) {
        return leftValue.includes(right);
      }
      return false;
    default:
      return false;
  }
}

/**
 * Check if a question should be shown based on logic conditions
 */
export function shouldShowQuestion(
  question: Question,
  responses: Record<string, any>
): boolean {
  if (!question.logic || question.logic.length === 0) {
    return true;
  }

  // Check all show/hide logic
  for (const logic of question.logic) {
    if (logic.action === 'show') {
      return evaluateExpression(logic.when, responses);
    }
    if (logic.action === 'hide') {
      return !evaluateExpression(logic.when, responses);
    }
  }

  return true;
}

export interface LoopNavigationResult {
  nextQuestionId: string | null;
  loopAction?: 'start' | 'continue' | 'end';
  loopSourceId?: string;
  loopItems?: string[];
  nextLoopIndex?: number;
}

export function getNextQuestionId(
  currentQuestion: Question,
  responses: Record<string, any>,
  allQuestions: Question[],
  loopState?: { sourceQuestionId: string; currentIndex: number; items: string[] } | null
): string | null {
  if (currentQuestion.logic) {
    for (const logic of currentQuestion.logic) {
      if ((logic.action === 'skip' || logic.action === 'terminate') &&
          evaluateExpression(logic.when, responses)) {
        if (logic.action === 'terminate') {
          return 'TERMINATE';
        }
        return logic.destination || null;
      }
    }
  }

  if (currentQuestion.defaultNextQuestion) {
    return currentQuestion.defaultNextQuestion;
  }

  const currentIndex = allQuestions.findIndex(q => q.id === currentQuestion.id);
  if (currentIndex === -1 || currentIndex === allQuestions.length - 1) {
    return 'COMPLETE';
  }

  for (let i = currentIndex + 1; i < allQuestions.length; i++) {
    const nextQuestion = allQuestions[i];
    if (shouldShowQuestion(nextQuestion, responses)) {
      return nextQuestion.id;
    }
  }

  return 'COMPLETE';
}

export function getNextQuestionWithLoopSupport(
  currentQuestion: Question,
  responses: Record<string, any>,
  allQuestions: Question[],
  loopState: { sourceQuestionId: string; currentIndex: number; items: string[] } | null
): LoopNavigationResult {
  if (currentQuestion.logic) {
    for (const logic of currentQuestion.logic) {
      if ((logic.action === 'skip' || logic.action === 'terminate') &&
          evaluateExpression(logic.when, responses)) {
        if (logic.action === 'terminate') {
          return { nextQuestionId: 'TERMINATE' };
        }
        return { nextQuestionId: logic.destination || null };
      }
    }
  }

  const nextQuestionId = currentQuestion.defaultNextQuestion || null;
  let nextQuestion: Question | undefined;
  
  if (nextQuestionId) {
    nextQuestion = allQuestions.find(q => q.id === nextQuestionId);
  } else {
    const currentIndex = allQuestions.findIndex(q => q.id === currentQuestion.id);
    for (let i = currentIndex + 1; i < allQuestions.length; i++) {
      if (shouldShowQuestion(allQuestions[i], responses)) {
        nextQuestion = allQuestions[i];
        break;
      }
    }
  }

  // Check for loop continuation only when leaving the loop block
  // (i.e., next question is NOT in the same loop, or there's no next question)
  if (loopState && currentQuestion.metadata?.loopSourceQuestion) {
    const isNextQuestionInSameLoop = nextQuestion?.metadata?.loopSourceQuestion === loopState.sourceQuestionId;

    // If next question is still in the same loop, just proceed normally
    if (isNextQuestionInSameLoop) {
      return { nextQuestionId: nextQuestion!.id };
    }

    // We're leaving the loop block - check if we need to continue or end
    const nextLoopIndex = loopState.currentIndex + 1;
    if (nextLoopIndex < loopState.items.length) {
      // Continue loop - find first question in loop block
      const firstLoopQuestion = findFirstLoopQuestion(loopState.sourceQuestionId, allQuestions);
      return {
        nextQuestionId: firstLoopQuestion?.id || currentQuestion.id,
        loopAction: 'continue',
        loopSourceId: loopState.sourceQuestionId,
        loopItems: loopState.items,
        nextLoopIndex
      };
    } else {
      // End loop - proceed to next non-loop question
      if (nextQuestion) {
        return {
          nextQuestionId: nextQuestion.id,
          loopAction: 'end'
        };
      }
      // No next question found - survey complete
      return { nextQuestionId: 'COMPLETE', loopAction: 'end' };
    }
  }

  if (!nextQuestion) {
    return { nextQuestionId: 'COMPLETE' };
  }

  // Check if entering a new loop
  const loopMeta = nextQuestion.metadata;
  if (loopMeta?.loopSourceQuestion) {
    const sourceQuestion = allQuestions.find(q => q.id === loopMeta.loopSourceQuestion);
    const loopItems = extractLoopItems(loopMeta.loopSourceQuestion, responses, sourceQuestion);

    if (loopItems.length > 0) {
      return {
        nextQuestionId: nextQuestion.id,
        loopAction: 'start',
        loopSourceId: loopMeta.loopSourceQuestion,
        loopItems: loopItems,
        nextLoopIndex: 0
      };
    }

    // No valid loop items - skip loop questions
    const afterLoopIndex = allQuestions.findIndex(q => q.id === nextQuestion!.id);
    for (let i = afterLoopIndex + 1; i < allQuestions.length; i++) {
      if (shouldShowQuestion(allQuestions[i], responses)) {
        return { nextQuestionId: allQuestions[i].id };
      }
    }
    return { nextQuestionId: 'COMPLETE' };
  }

  return { nextQuestionId: nextQuestion.id };
}

export function calculateSumFromOptions(
  selectedValues: (string | number)[],
  options?: { value: string | number; numericValue?: number }[]
): number {
  if (!options) return 0;
  
  return selectedValues.reduce((sum: number, val) => {
    const option = options.find(opt => opt.value === val);
    return sum + (option?.numericValue || 0);
  }, 0);
}

export function calculateSelectedServicesPrice(selectedServices: string[]): number {
  const prices: Record<string, number> = {
    satellite: 15,
    enhanced_network: 10,
    enhanced_plus: 20,
    security: 8,
    protection: 12,
    international: 25
  };

  return selectedServices.reduce((sum, service) => {
    return sum + (prices[service] || 0);
  }, 0);
}

/**
 * Apply piping to question text - Enhanced with generic patterns
 *
 * Supported patterns:
 * - [INSERT Q1] or [INSERT Q1 RESPONSE] - Shows the raw answer value
 * - [INSERT Q1 LABEL] - Shows the label/text of the selected option(s)
 * - [INSERT Q4.SUM] - Custom calculation (legacy support)
 * - [INSERT LOOP_ITEM] - Current loop item value
 * - [INSERT LOOP_ITEM LABEL] - Current loop item label
 * - [INSERT META:KEY] - Respondent metadata value (e.g., META:COUNTRY)
 *
 * Fallback patterns (if questionnaire parsing missed conversion):
 * - {{Q1}}, {Q1}, <Q1> - Converts to raw value
 * - {{Q1 label}}, {Q1 option} - Converts to label
 *
 * @param text - The text containing piping placeholders
 * @param responses - All survey responses
 * @param allQuestions - Optional: All questions for label lookups
 * @param loopContext - Optional: Current loop item for loop questions
 * @param respondentMetadata - Optional: External respondent attributes
 */
export function applyPiping(
  text: string,
  responses: Record<string, any>,
  allQuestions?: Question[],
  loopContext?: { currentItem: string; sourceQuestionId: string } | null,
  respondentMetadata?: Record<string, string>
): string {
  let result = text;

  if (process.env.NODE_ENV === 'development' && text.includes('[INSERT')) {
    console.log('🔄 Piping applied to:', text.substring(0, 80), '...', 'Responses:', Object.keys(responses));
  }

  const metaPattern = /\[INSERT\s+META:([A-Z0-9_]+)\]/gi;
  result = result.replace(metaPattern, (match, metaKey) => {
    if (!respondentMetadata) return '[No metadata]';
    const value = respondentMetadata[metaKey] || respondentMetadata[metaKey.toLowerCase()];
    return value || '[No metadata]';
  });

  if (loopContext) {
    result = result.replace(/\[INSERT\s+LOOP_ITEM\s+LABEL\]/gi, () => {
      const sourceQuestion = allQuestions?.find(q => q.id === loopContext.sourceQuestionId);
      return resolveItemLabel(loopContext.currentItem, sourceQuestion);
    });

    result = result.replace(/\[INSERT\s+LOOP_ITEM\]/gi, () => {
      return loopContext.currentItem;
    });
  }

  // ========================================
  // FALLBACK PATTERNS (for missed conversions)
  // ========================================

  // Fallback 1: Handle curly braces {{Q1}} → raw value
  const curlyBracePattern = /\{\{([A-Z0-9_]+)(?:\s+response)?\}\}|\{([A-Z0-9_]+)(?:\s+response)?\}/gi;
  result = result.replace(curlyBracePattern, (match, id1, id2) => {
    const questionId = id1 || id2;
    const response = responses[questionId];
    if (response === undefined || response === null) return '[No response]';
    if (Array.isArray(response)) return response.join(', ');
    return response.toString();
  });

  // Fallback 2: Handle angle brackets <Q1> → raw value
  const angleBracketPattern = /<([A-Z0-9_]+)(?:\s+response)?>/gi;
  result = result.replace(angleBracketPattern, (match, questionId) => {
    const response = responses[questionId];
    if (response === undefined || response === null) return '[No response]';
    if (Array.isArray(response)) return response.join(', ');
    return response.toString();
  });

  // Fallback 3: Handle curly brace labels {{Q1 label}} → label
  const curlyBraceLabelPattern = /\{\{([A-Z0-9_]+)(?:\s+label|\s+option(?:\s+text)?)\}\}|\{([A-Z0-9_]+)(?:\s+label|\s+option(?:\s+text)?)\}/gi;
  result = result.replace(curlyBraceLabelPattern, (match, id1, id2) => {
    const questionId = id1 || id2;
    const response = responses[questionId];
    if (response === undefined || response === null || !allQuestions) return '[No response]';

    const question = allQuestions.find(q => q.id === questionId);
    if (!question || !question.options) {
      return Array.isArray(response) ? response.join(', ') : response.toString();
    }

    if (!Array.isArray(response)) {
      const option = question.options.find(opt => opt.value === response || opt.id === response);
      return option ? option.label : response.toString();
    }

    const labels = response
      .map(val => {
        const option = question.options!.find(opt => opt.value === val || opt.id === val);
        return option ? option.label : val.toString();
      })
      .filter(Boolean);

    return labels.length > 0 ? labels.join(', ') : '[No selection]';
  });

  // ========================================
  // GENERIC PIPING PATTERNS
  // ========================================

  // Pattern 1: [INSERT {QUESTION_ID}] or [INSERT {QUESTION_ID} RESPONSE]
  // Replace with raw answer value
  const responsePattern = /\[INSERT\s+([A-Z0-9_]+)(?:\s+RESPONSE)?\]/gi;
  result = result.replace(responsePattern, (match, questionId) => {
    const response = responses[questionId];
    if (response === undefined || response === null) {
      return '[No response]';
    }

    // Handle arrays (multiple choice)
    if (Array.isArray(response)) {
      return response.join(', ');
    }

    return response.toString();
  });

  const labelPattern = /\[INSERT\s+([A-Z0-9_]+)\s+LABEL\]/gi;
  result = result.replace(labelPattern, (match, questionId) => {
    const response = responses[questionId];
    if (response === undefined || response === null || !allQuestions) {
      return '[No response]';
    }

    const question = allQuestions.find(q => q.id === questionId);
    if (!question || !question.options) {
      return Array.isArray(response) ? response.join(', ') : response.toString();
    }

    if (!Array.isArray(response)) {
      const option = question.options.find(opt => opt.value === response || opt.id === response);
      return option ? option.label : response.toString();
    }

    const labels = response
      .map(val => {
        const option = question.options!.find(opt => opt.value === val || opt.id === val);
        return option ? option.label : val.toString();
      })
      .filter(Boolean);

    return labels.length > 0 ? labels.join(', ') : '[No selection]';
  });

  const otherTextPattern = /\[INSERT\s+([A-Z0-9_]+)\s+OTHER\]/gi;
  result = result.replace(otherTextPattern, (match, questionId) => {
    const otherKeys = Object.keys(responses).filter(k => k.startsWith(`${questionId}_other_`));
    const otherTexts = otherKeys
      .map(k => responses[k])
      .filter(v => v && typeof v === 'string' && v.trim());
    
    return otherTexts.length > 0 ? otherTexts.join(', ') : '[No other text]';
  });

  // Pattern: [INSERT Q4.SUM] - Calculate sum
  const sumPattern = /\[INSERT\s+([A-Z0-9_]+)\.SUM\]/gi;
  result = result.replace(sumPattern, (match, questionId) => {
    if (questionId === 'Q4') {
      const q4Response = responses['Q4'];
      if (Array.isArray(q4Response)) {
        return calculateSelectedServicesPrice(q4Response).toString();
      }
      return '0';
    }

    const response = responses[questionId];
    if (!allQuestions) return '0';

    const question = allQuestions.find(q => q.id === questionId);
    if (!question?.options || !Array.isArray(response)) return '0';

    const sum = calculateSumFromOptions(response, question.options);
    return sum.toString();
  });

  // Pattern: [INSERT Q4.COUNT] - Count number of selections
  const countPattern = /\[INSERT\s+([A-Z0-9_]+)\.COUNT\]/gi;
  result = result.replace(countPattern, (match, questionId) => {
    const response = responses[questionId];

    // For multiple choice (array of selections)
    if (Array.isArray(response)) {
      return response.length.toString();
    }

    // For single choice or text (1 if answered, 0 if not)
    if (response !== undefined && response !== null && response !== '') {
      return '1';
    }

    return '0';
  });

  if (result.includes('[INSERT CONCEPT NAME]')) {
    const conceptAssignment = responses['CONCEPT_ASSIGNMENT'];
    const conceptNames: Record<string, string> = {
      '1': 'Satellite Connectivity',
      '2': 'Enhanced Network',
      '3': 'Enhanced Network Plus'
    };
    result = result.replace('[INSERT CONCEPT NAME]', conceptNames[conceptAssignment] || '[Concept not assigned]');
  }

  return result;
}

/**
 * Validate question response
 */
export function validateResponse(
  question: Question,
  value: any,
  allResponses?: Record<string, any>,
  allQuestions?: Question[]
): { isValid: boolean; error?: string } {
  // Check if exclusive option is selected (for text/numeric inputs)
  if (allResponses && allResponses[`${question.id}_exclusive`] === true) {
    return { isValid: true }; // Exclusive option selected is valid
  }

  // Check required
  if (question.required) {
    if (value === undefined || value === null || value === '') {
      return { isValid: false, error: 'This question is required' };
    }
    if (Array.isArray(value) && value.length === 0) {
      return { isValid: false, error: 'Please select at least one option' };
    }
  }

  // Single choice and Multiple choice "Other" option validation
  if ((question.type === 'single_choice' || question.type === 'multiple_choice')) {
    const metadata = question.metadata || {};

    if (metadata.hasOtherOption && metadata.otherOptionId) {
      // Get actual options (either static or dynamically generated)
      let actualOptions = question.options || [];

      // If options are empty but question has dynamic piping, generate them
      if (actualOptions.length === 0 && metadata.pipeOptionsFrom && allQuestions && allResponses) {
        const sourceQuestion = allQuestions.find(q => q.id === metadata.pipeOptionsFrom?.sourceQuestionId);
        actualOptions = generateDynamicOptions(
          metadata.pipeOptionsFrom,
          allResponses,
          sourceQuestion,
          allQuestions
        );
      }

      // Find the "Other" option
      const otherOption = actualOptions.find(opt => String(opt.id) === String(metadata.otherOptionId));

      if (otherOption) {
        let isOtherSelected = false;

        // Check if "Other" is selected (different logic for single vs multiple choice)
        if (question.type === 'single_choice') {
          isOtherSelected = value === otherOption.value;
        } else if (question.type === 'multiple_choice') {
          isOtherSelected = Array.isArray(value) && value.includes(otherOption.value);
        }

        if (isOtherSelected) {
          // "Other" option is selected - check if text is provided
          const otherTextKey = `${question.id}_other_${otherOption.value}`;
          const otherText = allResponses?.[otherTextKey];

          // Require text by default (unless explicitly disabled)
          // Default behavior: ALWAYS require text when "Other" is selected
          const requireText = metadata.otherInputRequired !== false;

          if (requireText) {
            // Check if text is missing, empty, or only whitespace
            if (!otherText || typeof otherText !== 'string' || otherText.trim().length === 0) {
              return { 
                isValid: false, 
                error: 'Please enter your answer in the text box when selecting "Other (please specify)"' 
              };
            }
          }
        }
      }
    }
  }

  // Matrix validation: Check if all rows are answered
  if (question.type === 'matrix' && question.matrixRows) {
    const metadata = question.metadata || {};
    const requireAllRows = metadata.requireAllRows !== false; // Default: true

    if (requireAllRows) {
      if (!value || typeof value !== 'object') {
        return { isValid: false, error: 'Please answer all rows' };
      }

      const unansweredRows = question.matrixRows.filter(row => !value[row.id]);
      if (unansweredRows.length > 0) {
        return { isValid: false, error: 'Please answer all rows before proceeding' };
      }
    }
  }

  if (question.type === 'multi_grid' && question.matrixRows && question.matrixColumns) {
    const metadata = question.metadata || {};
    const requireAllRows = metadata.requireAllRows !== false;
    const otherRowIds = new Set(metadata.otherRowIds || []);
    const exclusiveRowIds = new Set(metadata.exclusiveRowIds || []);

    if (requireAllRows) {
      if (!value || typeof value !== 'object') {
        const hasOnlyOtherRows = question.matrixRows.every(r => otherRowIds.has(r.id));
        if (!hasOnlyOtherRows) {
          return { isValid: false, error: 'Please answer all rows' };
        }
      } else {
        const exclusiveRowSelected = question.matrixRows.some(row => {
          if (!exclusiveRowIds.has(row.id)) return false;
          const rowVal = value[row.id];
          if (!rowVal || typeof rowVal !== 'object') return false;
          return Object.values(rowVal).some(v => !!v);
        });

        if (!exclusiveRowSelected) {
          const unansweredRows = question.matrixRows.filter(row => {
            if (otherRowIds.has(row.id)) return false;
            
            const rowValue = value[row.id];
            if (!rowValue || typeof rowValue !== 'object') return true;
            const selectedColumns = Object.values(rowValue).filter(v => 
              Array.isArray(v) ? v.length > 0 : !!v
            );
            return selectedColumns.length === 0;
          });
          if (unansweredRows.length > 0) {
            return { isValid: false, error: 'Please answer all rows before proceeding' };
          }
        }
      }
    }

    if (metadata.maxPerColumn && typeof metadata.maxPerColumn === 'number') {
      const maxPerCol = metadata.maxPerColumn;
      for (const col of question.matrixColumns) {
        let countForColumn = 0;
        for (const row of question.matrixRows) {
          const rowVal = value?.[row.id];
          if (rowVal && typeof rowVal === 'object') {
            const colVal = rowVal[col.id ?? col.value];
            if (Array.isArray(colVal)) {
              countForColumn += colVal.length;
            } else if (colVal) {
              countForColumn += 1;
            }
          }
        }
        if (countForColumn > maxPerCol) {
          return { 
            isValid: false, 
            error: `You can select at most ${maxPerCol} items in the "${col.label}" column` 
          };
        }
      }
    }
  }

  // Ranking validation: Check min/max/exact rank constraints and no duplicates
  if (question.type === 'ranking' && question.options) {
    const metadata = question.metadata || {};
    
    if (!value || typeof value !== 'object') {
      if (question.required) {
        return { isValid: false, error: 'Please rank the options' };
      }
    } else {
      const rankedOptions = Object.entries(value)
        .filter(([, rank]) => rank !== null && rank !== undefined && rank !== '')
        .map(([optionId, rank]) => ({ optionId, rank: Number(rank) }));
      
      const rankedCount = rankedOptions.length;
      
      // Check for duplicate ranks
      const ranks = rankedOptions.map(r => r.rank);
      const uniqueRanks = new Set(ranks);
      if (ranks.length !== uniqueRanks.size) {
        return { isValid: false, error: 'Each rank can only be assigned once' };
      }
      
      // Check exactRank constraint
      if (metadata.exactRank !== undefined && rankedCount !== metadata.exactRank) {
        return { 
          isValid: false, 
          error: `Please rank exactly ${metadata.exactRank} option${metadata.exactRank === 1 ? '' : 's'}` 
        };
      }
      
      // Check minRank constraint
      if (metadata.minRank !== undefined && rankedCount < metadata.minRank) {
        return { 
          isValid: false, 
          error: `Please rank at least ${metadata.minRank} option${metadata.minRank === 1 ? '' : 's'}` 
        };
      }
      
      // Check maxRank constraint
      if (metadata.maxRank !== undefined && rankedCount > metadata.maxRank) {
        return { 
          isValid: false, 
          error: `Please rank at most ${metadata.maxRank} option${metadata.maxRank === 1 ? '' : 's'}` 
        };
      }
      
      // Validate rank values are within valid range (1 to N)
      const maxValidRank = question.options.length;
      for (const { rank } of rankedOptions) {
        if (rank < 1 || rank > maxValidRank || !Number.isInteger(rank)) {
          return { 
            isValid: false, 
            error: `Rank values must be whole numbers between 1 and ${maxValidRank}` 
          };
        }
      }
    }
  }

  // Multiple choice minSelections validation
  if (question.type === 'multiple_choice' && Array.isArray(value)) {
    const metadata = question.metadata || {};
    
    if (metadata.minSelections !== undefined && value.length < metadata.minSelections) {
      return { 
        isValid: false, 
        error: `Please select at least ${metadata.minSelections} option${metadata.minSelections === 1 ? '' : 's'}` 
      };
    }
    
    // maxSelections is already enforced in QuestionRenderer, but validate here too
    if (metadata.maxSelections !== undefined && value.length > metadata.maxSelections) {
      return { 
        isValid: false, 
        error: `Please select at most ${metadata.maxSelections} option${metadata.maxSelections === 1 ? '' : 's'}` 
      };
    }
  }

  // Check validation rules
  if (question.validation) {
    for (const rule of question.validation) {
      switch (rule.type) {
        case 'min':
          if (Number(value) < rule.value) {
            return { isValid: false, error: rule.message || `Minimum value is ${rule.value}` };
          }
          break;
        case 'max':
          if (Number(value) > rule.value) {
            return { isValid: false, error: rule.message || `Maximum value is ${rule.value}` };
          }
          break;
        case 'pattern':
          if (rule.value && !new RegExp(rule.value).test(value)) {
            return { isValid: false, error: rule.message || 'Invalid format' };
          }
          break;
        case 'custom':
          if (rule.value === 'sumTo100') {
            if (value && typeof value === 'object') {
              const total = Object.values(value).reduce((sum: number, v) => {
                const numValue = Number(v) || 0;
                return sum + numValue;
              }, 0);
              if (Math.abs(total - 100) > 0.01) {
                return {
                  isValid: false,
                  error: rule.message || `Values must sum to 100%. Current total: ${total}%`
                };
              }
            } else if (question.options) {
              let total = 0;
              for (const opt of question.options) {
                const optKey = `${question.id}_${opt.value}`;
                const optValue = allResponses?.[optKey];
                if (optValue !== undefined) {
                  total += Number(optValue) || 0;
                }
              }
              if (total > 0 && Math.abs(total - 100) > 0.01) {
                return {
                  isValid: false,
                  error: rule.message || `Values must sum to 100%. Current total: ${total}%`
                };
              }
            }
          }
          break;
      }
    }
  }

  // Cross-question sum validation (e.g., Q5 + Q5b must sum to 100%)
  const metadata = question.metadata || {};
  if (metadata.sumValidation && allResponses) {
    const { targetSum, linkedQuestionIds, errorMessage } = metadata.sumValidation;
    const currentValue = Number(value) || 0;
    const otherValues = linkedQuestionIds
      .filter(id => id !== question.id)
      .reduce((sum, id) => sum + (Number(allResponses[id]) || 0), 0);
    
    const total = currentValue + otherValues;
    
    // Only validate when all linked questions have values
    const allHaveValues = linkedQuestionIds.every(id => 
      id === question.id ? value !== undefined && value !== '' : 
      allResponses[id] !== undefined && allResponses[id] !== ''
    );
    
    if (allHaveValues && Math.abs(total - targetSum) > 0.01) {
      return {
        isValid: false,
        error: errorMessage || `Values must sum to ${targetSum}%. Current total: ${total}%`
      };
    }
  }

  return { isValid: true };
}
