import { Expression, LogicCondition, Question } from '../types/survey';

/**
 * Evaluates a logic expression against current survey responses
 */
export function evaluateExpression(
  expression: Expression,
  responses: Record<string, any>
): boolean {
  const { operator, left, right, conditions } = expression;

  // Handle compound expressions (and/or)
  if (operator === 'and' && conditions) {
    return conditions.every(cond => evaluateExpression(cond, responses));
  }
  if (operator === 'or' && conditions) {
    return conditions.some(cond => evaluateExpression(cond, responses));
  }

  // Get the actual value from responses
  // Handle property access (e.g., "Q4.length")
  let leftValue;
  if (left.includes('.')) {
    const [questionId, property] = left.split('.');
    const value = responses[questionId];
    if (property === 'length' && Array.isArray(value)) {
      leftValue = value.length;
    } else {
      leftValue = value?.[property];
    }
  } else {
    leftValue = responses[left];
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

/**
 * Get the next question ID based on current question and responses
 */
export function getNextQuestionId(
  currentQuestion: Question,
  responses: Record<string, any>,
  allQuestions: Question[]
): string | null {
  // Check for conditional logic first
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

  // Use default next question if specified
  if (currentQuestion.defaultNextQuestion) {
    return currentQuestion.defaultNextQuestion;
  }

  // Otherwise, get the next question in sequence
  const currentIndex = allQuestions.findIndex(q => q.id === currentQuestion.id);
  if (currentIndex === -1 || currentIndex === allQuestions.length - 1) {
    return 'COMPLETE';
  }

  // Find next visible question
  for (let i = currentIndex + 1; i < allQuestions.length; i++) {
    const nextQuestion = allQuestions[i];
    if (shouldShowQuestion(nextQuestion, responses)) {
      return nextQuestion.id;
    }
  }

  return 'COMPLETE';
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
 *
 * Fallback patterns (if questionnaire parsing missed conversion):
 * - {{Q1}}, {Q1}, <Q1> - Converts to raw value
 * - {{Q1 label}}, {Q1 option} - Converts to label
 *
 * @param text - The text containing piping placeholders
 * @param responses - All survey responses
 * @param allQuestions - Optional: All questions for label lookups
 */
export function applyPiping(
  text: string,
  responses: Record<string, any>,
  allQuestions?: Question[]
): string {
  let result = text;

  // Debug logging
  if (process.env.NODE_ENV === 'development' && text.includes('[INSERT')) {
    console.log('🔄 Piping applied to:', text.substring(0, 80), '...', 'Responses:', Object.keys(responses));
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
  allResponses?: Record<string, any>
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
  if ((question.type === 'single_choice' || question.type === 'multiple_choice') && question.options) {
    const metadata = question.metadata || {};

    if (metadata.hasOtherOption && metadata.otherOptionId) {
      // Find the "Other" option
      const otherOption = question.options.find(opt => String(opt.id) === String(metadata.otherOptionId));

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
      }
    }
  }

  return { isValid: true };
}
