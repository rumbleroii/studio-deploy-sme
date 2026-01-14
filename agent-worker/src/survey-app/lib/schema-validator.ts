import { Survey, Question, Option } from '../types/survey';

export interface ValidationWarning {
  severity: 'error' | 'warning' | 'info';
  questionId: string;
  message: string;
  suggestion?: string;
}

/**
 * Validates survey schema structure (not content)
 * Checks for missing required fields, invalid configurations, etc.
 * Does NOT do text pattern matching - only validates structure
 */
export function validateSurveySchema(survey: Survey): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const allQuestions = survey.sections.flatMap(s => s.questions);

  for (const question of allQuestions) {
    // Structural validation only - no text pattern matching

    // Check 1: Required fields validation
    if (['single_choice', 'multiple_choice'].includes(question.type)) {
      const hasDynamicPiping = question.metadata?.pipeOptionsFrom;
      const hasStaticOptions = question.options && question.options.length > 0;

      if (!hasDynamicPiping && !hasStaticOptions) {
        warnings.push({
          severity: 'error',
          questionId: question.id,
          message: `${question.type} question has no options and no pipeOptionsFrom metadata`,
          suggestion: 'Add options array or configure pipeOptionsFrom in metadata'
        });
      }
    }

    // Check 6: Matrix questions
    if (question.type === 'matrix') {
      const hasDynamicRows = question.metadata?.pipeRowsFrom;
      const hasStaticRows = question.matrixRows && question.matrixRows.length > 0;

      if (!hasDynamicRows && !hasStaticRows) {
        warnings.push({
          severity: 'error',
          questionId: question.id,
          message: 'Matrix question has no rows and no pipeRowsFrom metadata',
          suggestion: 'Add matrixRows array or configure pipeRowsFrom in metadata'
        });
      }

      if (!question.matrixColumns || question.matrixColumns.length === 0) {
        warnings.push({
          severity: 'error',
          questionId: question.id,
          message: 'Matrix question has no columns defined',
          suggestion: 'Add matrixColumns array'
        });
      }
    }
  }

  return warnings;
}

/**
 * Prints validation warnings to console in a readable format
 */
export function printValidationWarnings(warnings: ValidationWarning[]): void {
  if (warnings.length === 0) {
    console.log('✅ Survey schema validation passed with no warnings');
    return;
  }

  console.log(`\n⚠️  Found ${warnings.length} validation warning(s):\n`);

  const errors = warnings.filter(w => w.severity === 'error');
  const warningList = warnings.filter(w => w.severity === 'warning');
  const info = warnings.filter(w => w.severity === 'info');

  if (errors.length > 0) {
    console.log('🔴 ERRORS:');
    errors.forEach(w => {
      console.log(`  ${w.questionId}: ${w.message}`);
      if (w.suggestion) console.log(`    → ${w.suggestion}`);
    });
    console.log('');
  }

  if (warningList.length > 0) {
    console.log('🟡 WARNINGS:');
    warningList.forEach(w => {
      console.log(`  ${w.questionId}: ${w.message}`);
      if (w.suggestion) console.log(`    → ${w.suggestion}`);
    });
    console.log('');
  }

  if (info.length > 0) {
    console.log('ℹ️  INFO:');
    info.forEach(w => {
      console.log(`  ${w.questionId}: ${w.message}`);
      if (w.suggestion) console.log(`    → ${w.suggestion}`);
    });
  }
}
