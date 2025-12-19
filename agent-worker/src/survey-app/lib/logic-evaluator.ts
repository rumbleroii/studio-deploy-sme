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

/**
 * Calculate sum of selected prices from Q4 for Q5 piping
 */
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

  // Pattern 2: [INSERT {QUESTION_ID} LABEL]
  // Replace with the label(s) of selected option(s)
  const labelPattern = /\[INSERT\s+([A-Z0-9_]+)\s+LABEL\]/gi;
  result = result.replace(labelPattern, (match, questionId) => {
    const response = responses[questionId];
    if (response === undefined || response === null || !allQuestions) {
      return '[No response]';
    }

    // Find the question in the survey
    const question = allQuestions.find(q => q.id === questionId);
    if (!question || !question.options) {
      // If no options (e.g., text question), return raw value
      return Array.isArray(response) ? response.join(', ') : response.toString();
    }

    // Handle single choice (response is a value)
    if (!Array.isArray(response)) {
      const option = question.options.find(opt => opt.value === response || opt.id === response);
      return option ? option.label : response.toString();
    }

    // Handle multiple choice (response is an array)
    const labels = response
      .map(val => {
        const option = question.options!.find(opt => opt.value === val || opt.id === val);
        return option ? option.label : val.toString();
      })
      .filter(Boolean);

    return labels.length > 0 ? labels.join(', ') : '[No selection]';
  });

  // ========================================
  // LEGACY PATTERNS (Backward Compatibility)
  // ========================================

  // Legacy: Replace [INSERT Q4.SUM] with calculated price
  if (result.includes('[INSERT Q4.SUM]')) {
    const q4Response = responses['Q4'];
    if (Array.isArray(q4Response)) {
      const sum = calculateSelectedServicesPrice(q4Response);
      result = result.replace('[INSERT Q4.SUM]', sum.toString());
    }
  }

  // Legacy: Replace [INSERT CONCEPT NAME] with concept name
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
  value: any
): { isValid: boolean; error?: string } {
  // Check required
  if (question.required) {
    if (value === undefined || value === null || value === '') {
      return { isValid: false, error: 'This question is required' };
    }
    if (Array.isArray(value) && value.length === 0) {
      return { isValid: false, error: 'Please select at least one option' };
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
