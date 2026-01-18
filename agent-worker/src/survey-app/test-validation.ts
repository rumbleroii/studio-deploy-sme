/**
 * Test script to validate sample-survey.ts with Zod
 * Run with: npx ts-node test-validation.ts
 */

import { sampleSurvey } from './data/sample-survey';
import { validateSurvey, formatValidationResults } from './lib/zod-validator';

console.log('🔍 Testing Zod validation on sample-survey.ts...\n');

const result = validateSurvey(sampleSurvey);

console.log(formatValidationResults(result, sampleSurvey.id));

if (result.success && result.errors.length === 0 && result.warnings.length === 0) {
  console.log('✅ All tests passed! Survey is valid.\n');
  process.exit(0);
} else {
  console.log('❌ Validation found issues (see above)\n');
  process.exit(result.errors.length > 0 ? 1 : 0); // Only exit with error code if there are errors, not warnings
}
