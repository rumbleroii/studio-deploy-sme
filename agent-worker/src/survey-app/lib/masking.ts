import { Option, MatrixRow, Expression, DynamicRowsConfig } from '../types/survey';
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

export function generateDynamicRows(
  config: DynamicRowsConfig,
  responses: Record<string, any>,
  sourceQuestion?: { options?: Option[]; metadata?: any },
  allQuestions?: { id: string; options?: Option[]; metadata?: any }[]
): MatrixRow[] {
  const sourceValue = responses[config.sourceQuestionId];

  if (!sourceQuestion) return [];

  // Check if source is a matrix question (object with row IDs)
  if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) && (sourceQuestion as any).type === 'matrix') {
    const matrixRows = (sourceQuestion as any).matrixRows || [];

    // Extract answered row IDs (non-null, non-empty values)
    const answeredRowIds = Object.keys(sourceValue).filter(
      rowId => sourceValue[rowId] !== undefined &&
               sourceValue[rowId] !== null &&
               sourceValue[rowId] !== ''
    );

    // Apply excludeValues filter if specified
    const excludeSet = new Set(config.excludeValues || []);
    const filteredRowIds = answeredRowIds.filter(id => !excludeSet.has(id));

    const rows: MatrixRow[] = [];
    for (const rowId of filteredRowIds) {
      const sourceRow = matrixRows.find((r: any) => r.id === rowId);
      if (sourceRow) {
        rows.push({ id: sourceRow.id, label: sourceRow.label });
      }
    }
    return rows;
  }

  // Get the actual options from the source question
  // If the source question also uses dynamic piping, we need to resolve it first
  let sourceOptions: Option[] = sourceQuestion.options || [];

  if (sourceOptions.length === 0 && sourceQuestion.metadata?.pipeOptionsFrom && allQuestions) {
    // Source question also uses dynamic piping - resolve it recursively
    const nestedSourceQuestion = allQuestions.find(
      q => q.id === sourceQuestion.metadata.pipeOptionsFrom.sourceQuestionId
    );
    sourceOptions = generateDynamicOptions(
      sourceQuestion.metadata.pipeOptionsFrom,
      responses,
      nestedSourceQuestion,
      allQuestions
    );
  }

  if (sourceOptions.length === 0) return [];

  let selectedValues: (string | number)[];

  if (config.generateFrom === 'all_options') {
    selectedValues = sourceOptions.map(opt => opt.value);
  } else {
    if (!Array.isArray(sourceValue)) {
      selectedValues = sourceValue ? [sourceValue] : [];
    } else {
      selectedValues = sourceValue;
    }
  }

  // Filter out excluded values
  const excludeSet = new Set(config.excludeValues || []);

  // When includeOtherText is true, automatically exclude option values that have "other" text
  // This prevents showing both "Other (please specify)" row and the typed text row
  if (config.includeOtherText) {
    const otherTextKeys = Object.keys(responses).filter(
      key => key.startsWith(`${config.sourceQuestionId}_other_`)
    );

    for (const key of otherTextKeys) {
      const otherText = responses[key];
      if (otherText && typeof otherText === 'string' && otherText.trim()) {
        // Extract the option value from the key: "Q9_other_other" → "other"
        const optionValue = key.replace(`${config.sourceQuestionId}_other_`, '');
        excludeSet.add(optionValue);
      }
    }
  }

  selectedValues = selectedValues.filter(v => !excludeSet.has(v));

  const rows: MatrixRow[] = [];

  for (const value of selectedValues) {
    const option = sourceOptions.find(opt => opt.value === value);
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

export interface DynamicOptionsConfig {
  sourceQuestionId: string;
  generateFrom: 'selected_options' | 'all_options';
  includeOtherText?: boolean;
  excludeValues?: (string | number)[];
}

export function generateDynamicOptions(
  config: DynamicOptionsConfig,
  responses: Record<string, any>,
  sourceQuestion?: { options?: Option[]; metadata?: any },
  allQuestions?: { id: string; options?: Option[]; metadata?: any }[]
): Option[] {
  const sourceValue = responses[config.sourceQuestionId];

  if (!sourceQuestion) return [];

  // Check if source is a matrix question (object with row IDs)
  if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue) && (sourceQuestion as any).type === 'matrix') {
    const matrixRows = (sourceQuestion as any).matrixRows || [];

    // Extract answered row IDs (non-null, non-empty values)
    const answeredRowIds = Object.keys(sourceValue).filter(
      rowId => sourceValue[rowId] !== undefined &&
               sourceValue[rowId] !== null &&
               sourceValue[rowId] !== ''
    );

    // Apply excludeValues filter if specified
    const excludeSet = new Set(config.excludeValues || []);
    const filteredRowIds = answeredRowIds.filter(id => !excludeSet.has(id));

    const options: Option[] = [];
    for (const rowId of filteredRowIds) {
      const sourceRow = matrixRows.find((r: any) => r.id === rowId);
      if (sourceRow) {
        options.push({
          id: Math.floor(Math.random() * 10000), // Generate unique ID
          label: sourceRow.label,
          value: sourceRow.id,
        });
      }
    }
    return options;
  }

  // Get the actual options from the source question
  // If the source question also uses dynamic piping, we need to resolve it first
  let sourceOptions: Option[] = sourceQuestion.options || [];

  if (sourceOptions.length === 0 && sourceQuestion.metadata?.pipeOptionsFrom && allQuestions) {
    // Source question also uses dynamic piping - resolve it recursively
    const nestedSourceQuestion = allQuestions.find(
      q => q.id === sourceQuestion.metadata.pipeOptionsFrom.sourceQuestionId
    );
    sourceOptions = generateDynamicOptions(
      sourceQuestion.metadata.pipeOptionsFrom,
      responses,
      nestedSourceQuestion,
      allQuestions
    );
  }

  if (sourceOptions.length === 0) return [];

  let selectedValues: (string | number)[];

  if (config.generateFrom === 'all_options') {
    selectedValues = sourceOptions.map(opt => opt.value);
  } else {
    if (!Array.isArray(sourceValue)) {
      selectedValues = sourceValue ? [sourceValue] : [];
    } else {
      selectedValues = sourceValue;
    }
  }

  // Filter out excluded values
  const excludeSet = new Set(config.excludeValues || []);

  // When includeOtherText is true, automatically exclude option values that have "other" text
  // This prevents showing both "Other (please specify)" and the typed text
  if (config.includeOtherText) {
    const otherTextKeys = Object.keys(responses).filter(
      key => key.startsWith(`${config.sourceQuestionId}_other_`)
    );

    for (const key of otherTextKeys) {
      const otherText = responses[key];
      if (otherText && typeof otherText === 'string' && otherText.trim()) {
        // Extract the option value from the key: "Q9_other_other" → "other"
        const optionValue = key.replace(`${config.sourceQuestionId}_other_`, '');
        excludeSet.add(optionValue);
      }
    }
  }

  selectedValues = selectedValues.filter(v => !excludeSet.has(v));

  const options: Option[] = [];

  for (const value of selectedValues) {
    const option = sourceOptions.find(opt => opt.value === value);
    if (option) {
      options.push({
        id: option.id,
        label: option.label,
        value: option.value,
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
        options.push({
          id: 999,
          label: otherText.trim(),
          value: `other_${otherText.trim().toLowerCase().replace(/\s+/g, '_')}`,
        });
      }
    }
  }

  return options;
}
