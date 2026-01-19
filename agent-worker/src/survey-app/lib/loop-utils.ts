import { Question } from '../types/survey';

/**
 * Loop state tracking for survey navigation
 */
export interface LoopState {
  sourceQuestionId: string;
  currentIndex: number;
  items: string[];
}

/**
 * Extract loop items from a source question's response
 * Handles arrays (multiple choice), objects (matrix), and single values
 */
export function extractLoopItems(
  sourceQuestionId: string,
  responses: Record<string, any>,
  sourceQuestion: Question | undefined
): string[] {
  const sourceValue = responses[sourceQuestionId];

  if (!sourceValue) return [];

  // Array response (multiple choice)
  if (Array.isArray(sourceValue)) {
    return sourceValue.map(v => String(v));
  }

  // Object response (matrix) - extract answered row IDs
  if (typeof sourceValue === 'object' && sourceQuestion?.type === 'matrix') {
    return Object.keys(sourceValue).filter(
      rowId => sourceValue[rowId] != null && sourceValue[rowId] !== ''
    );
  }

  // Single value
  return [String(sourceValue)];
}

/**
 * Get the effective question ID for response storage
 * For loop questions, appends the current item: Q14 -> Q14_corona
 */
export function getEffectiveQuestionId(
  questionId: string,
  loopState: LoopState | null,
  currentLoopItem: string | null
): string {
  if (loopState && currentLoopItem) {
    return `${questionId}_${currentLoopItem}`;
  }
  return questionId;
}

/**
 * Find the first question in a loop block
 */
export function findFirstLoopQuestion(
  loopSourceId: string,
  allQuestions: Question[]
): Question | undefined {
  return allQuestions.find(q =>
    q.metadata?.loopSourceQuestion === loopSourceId
  );
}

/**
 * Resolve a label for an item value from any source type
 * Checks options, matrixRows, and matrixColumns
 */
export function resolveItemLabel(itemValue: string, sourceQuestion?: Question): string {
  if (!sourceQuestion) return itemValue;

  // Check options (single/multiple choice)
  const option = sourceQuestion.options?.find(
    o => String(o.value) === itemValue || String(o.id) === itemValue
  );
  if (option) return option.label;

  // Check matrixRows (matrix/multi_grid)
  const row = sourceQuestion.matrixRows?.find(r => r.id === itemValue);
  if (row) return row.label;

  // Check matrixColumns
  const col = sourceQuestion.matrixColumns?.find(c => c.id === itemValue || String(c.value) === itemValue);
  if (col) return col.label;

  return itemValue;
}

/**
 * Resolve response value handling both dot and underscore notation for matrix
 * - Direct key: responses[key]
 * - Dot notation: Q.row -> responses[Q][row]
 * - Underscore notation: Q_row -> responses[Q][row] (if Q is matrix)
 */
export function resolveResponseValue(
  key: string,
  responses: Record<string, any>,
  allQuestions?: Question[]
): any {
  // Try direct lookup first
  if (responses[key] !== undefined) return responses[key];

  // Try dot notation: Q.row
  if (key.includes('.')) {
    const [qId, prop] = key.split('.');
    return responses[qId]?.[prop];
  }

  // Try underscore notation: Q_row (for matrix questions)
  if (key.includes('_') && allQuestions) {
    const parts = key.split('_');
    // Find longest matching question ID prefix
    for (let i = parts.length - 1; i >= 1; i--) {
      const qId = parts.slice(0, i).join('_');
      const prop = parts.slice(i).join('_');
      const sourceQ = allQuestions.find(q => q.id === qId);
      if (sourceQ && (sourceQ.type === 'matrix' || sourceQ.type === 'multi_grid')) {
        return responses[qId]?.[prop];
      }
    }
  }

  return undefined;
}
