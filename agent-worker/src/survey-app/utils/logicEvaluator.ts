import { Expression, LogicCondition, LogicOperator } from '../types/survey';

/**
 * Evaluates a logic expression against current survey responses
 * @param expression The expression to evaluate
 * @param responses Current survey responses (questionId -> value)
 * @returns boolean indicating if the condition is met
 */
export function evaluateExpression(
  expression: Expression,
  responses: Record<string, any>
): boolean {
  const { operator, left, right, conditions } = expression;

  // Get the actual value from responses
  const leftValue = left ? responses[left] : undefined;

  switch (operator) {
    case 'eq':
      return leftValue === right;

    case 'neq':
      return leftValue !== right;

    case 'gt':
      return leftValue > right;

    case 'lt':
      return leftValue < right;

    case 'gte':
      return leftValue >= right;

    case 'lte':
      return leftValue <= right;

    case 'in':
      // Check if leftValue is in the right array
      if (Array.isArray(right)) {
        return right.includes(leftValue);
      }
      return false;

    case 'notIn':
      // Check if leftValue is not in the right array
      if (Array.isArray(right)) {
        return !right.includes(leftValue);
      }
      return true;

    case 'contains':
      // Check if leftValue (array) contains the right value
      if (Array.isArray(leftValue)) {
        return leftValue.includes(right);
      }
      return false;

    case 'and':
      // All nested conditions must be true
      if (conditions && conditions.length > 0) {
        return conditions.every(cond => evaluateExpression(cond, responses));
      }
      return true;

    case 'or':
      // At least one nested condition must be true
      if (conditions && conditions.length > 0) {
        return conditions.some(cond => evaluateExpression(cond, responses));
      }
      return false;

    default:
      console.warn(`Unknown operator: ${operator}`);
      return false;
  }
}

/**
 * Evaluates all logic conditions for a question
 * @param logic Array of logic conditions
 * @param responses Current survey responses
 * @returns The first matching logic condition, or null if none match
 */
export function evaluateLogic(
  logic: LogicCondition[] | undefined,
  responses: Record<string, any>
): LogicCondition | null {
  if (!logic || logic.length === 0) {
    return null;
  }

  // Find the first condition that evaluates to true
  for (const condition of logic) {
    if (evaluateExpression(condition.when, responses)) {
      return condition;
    }
  }

  return null;
}

/**
 * Determines if a question should be shown based on its logic
 * @param questionId The question ID to check
 * @param allQuestions Map of all questions (id -> question)
 * @param responses Current survey responses
 * @param orderedQuestionIds Optional array of question IDs in order (for terminate logic)
 * @returns boolean indicating if the question should be shown
 */
export function shouldShowQuestion(
  questionId: string,
  allQuestions: Map<string, any>,
  responses: Record<string, any>,
  orderedQuestionIds?: string[]
): boolean {
  // First check if survey has been terminated
  // If any previous question has a terminate condition that's met, hide all subsequent questions
  if (orderedQuestionIds) {
    const currentIndex = orderedQuestionIds.indexOf(questionId);

    for (let i = 0; i < currentIndex; i++) {
      const previousQuestionId = orderedQuestionIds[i];
      const previousQuestion = allQuestions.get(previousQuestionId);

      // Only evaluate if the previous question has been answered
      if (responses[previousQuestionId] !== undefined && previousQuestion?.logic) {
        for (const logicCondition of previousQuestion.logic) {
          if (logicCondition.action === 'terminate') {
            const conditionMet = evaluateExpression(logicCondition.when, responses);
            if (conditionMet) {
              // Survey terminated at previous question, hide all subsequent questions
              return false;
            }
          }
        }
      }
    }
  }

  // Check if any other question has logic that affects this question
  for (const [otherQuestionId, question] of allQuestions.entries()) {
    if (!question.logic) continue;

    for (const logicCondition of question.logic) {
      // Only evaluate if the other question has been answered
      if (responses[otherQuestionId] === undefined) continue;

      const conditionMet = evaluateExpression(logicCondition.when, responses);

      if (conditionMet) {
        // If action is 'show' and destination matches this question, show it
        if (logicCondition.action === 'show' && logicCondition.destination === questionId) {
          return true;
        }

        // If action is 'hide' and destination matches this question, hide it
        if (logicCondition.action === 'hide' && logicCondition.destination === questionId) {
          return false;
        }
      }
    }
  }

  // By default, show the question
  return true;
}

/**
 * Gets the next question ID based on logic evaluation
 * @param currentQuestionId Current question ID
 * @param responses Current survey responses
 * @param question Current question object
 * @param orderedQuestionIds Array of all question IDs in order
 * @returns Next question ID or null if survey should end
 */
export function getNextQuestionId(
  currentQuestionId: string,
  responses: Record<string, any>,
  question: any,
  orderedQuestionIds: string[],
  allQuestions: Map<string, any>
): string | null {
  // Evaluate logic conditions
  const matchedLogic = evaluateLogic(question.logic, responses);

  if (matchedLogic) {
    // Handle terminate action
    if (matchedLogic.action === 'terminate') {
      return null;
    }

    // Handle skip action (go to destination)
    if (matchedLogic.action === 'skip' && matchedLogic.destination) {
      return matchedLogic.destination;
    }

    // Handle show action (go to destination)
    if (matchedLogic.action === 'show' && matchedLogic.destination) {
      return matchedLogic.destination;
    }
  }

  // Use default next question if specified
  if (question.defaultNextQuestion) {
    return question.defaultNextQuestion;
  }

  // Otherwise, go to the next question in order
  const currentIndex = orderedQuestionIds.indexOf(currentQuestionId);
  if (currentIndex === -1 || currentIndex === orderedQuestionIds.length - 1) {
    return null; // End of survey
  }

  // Find the next visible question
  for (let i = currentIndex + 1; i < orderedQuestionIds.length; i++) {
    const nextQuestionId = orderedQuestionIds[i];
    if (shouldShowQuestion(nextQuestionId, allQuestions, responses)) {
      return nextQuestionId;
    }
  }

  return null; // No more visible questions
}
