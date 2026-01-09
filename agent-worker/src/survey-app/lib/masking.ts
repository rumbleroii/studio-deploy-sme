import { Option, MatrixRow, Expression } from '../types/survey';
import { evaluateExpression } from './logic-evaluator';

export function filterOptions(
  options: Option[],
  responses: Record<string, any>
): Option[] {
  if (!options || options.length === 0) return options;
  
  return options.filter(option => {
    if (!(option as any).showIf) return true;
    return evaluateExpression((option as any).showIf, responses);
  });
}

export function filterMatrixRows(
  rows: MatrixRow[],
  responses: Record<string, any>
): MatrixRow[] {
  if (!rows || rows.length === 0) return rows;
  
  return rows.filter(row => {
    if (!(row as any).showIf) return true;
    return evaluateExpression((row as any).showIf, responses);
  });
}

export function filterMatrixColumns(
  columns: Option[],
  responses: Record<string, any>
): Option[] {
  return filterOptions(columns, responses);
}

export interface DynamicRowsConfig {
  sourceQuestionId: string;
  generateFrom: 'selected_options' | 'all_options';
  includeOtherText?: boolean;
}

export function generateDynamicRows(
  config: DynamicRowsConfig,
  responses: Record<string, any>,
  sourceQuestion?: { options?: Option[] }
): MatrixRow[] {
  const sourceValue = responses[config.sourceQuestionId];
  
  if (!sourceQuestion?.options) return [];
  
  let selectedValues: (string | number)[];
  
  if (config.generateFrom === 'all_options') {
    selectedValues = sourceQuestion.options.map(opt => opt.value);
  } else {
    if (!Array.isArray(sourceValue)) {
      selectedValues = sourceValue ? [sourceValue] : [];
    } else {
      selectedValues = sourceValue;
    }
  }
  
  const rows: MatrixRow[] = [];
  
  for (const value of selectedValues) {
    const option = sourceQuestion.options.find(opt => opt.value === value);
    if (option) {
      rows.push({
        id: String(option.value),
        label: option.label,
      });
    }
  }
  
  if (config.includeOtherText) {
    const otherTextKeys = Object.keys(responses).filter(
      key => key.startsWith(`${config.sourceQuestionId}_other_`)
    );
    
    for (const key of otherTextKeys) {
      const otherText = responses[key];
      if (otherText && typeof otherText === 'string' && otherText.trim()) {
        rows.push({
          id: `other_${key}`,
          label: otherText.trim(),
        });
      }
    }
  }
  
  return rows;
}
