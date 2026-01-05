/**
 * Consolidated API Functions
 * All API calls for the survey app
 */

import type {
  SubmitPayload,
  SubmitResponse,
  HealthCheckResponse,
  ResponseSchema,
  SurveyStatus
} from '../types/api';

// ─── Environment Constants ───
export const isProduction = process.env.NEXT_PUBLIC_DEPLOYMENT === 'production';

// Survey identifier from environment (set during deployment)
// Falls back to default for local development
// This is the key used to store/retrieve responses in MongoDB
export const SURVEY_ID = process.env.NEXT_PUBLIC_SURVEY_ID || 'sample-survey';

// ─── API Endpoints ───

/**
 * Submit survey responses to the backend
 * Called after each question is answered
 */
export async function submitResponses(payload: SubmitPayload): Promise<SubmitResponse> {
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit responses');
    }

    const data: SubmitResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error submitting responses:', error);
    throw error;
  }
}

/**
 * Check health status of the survey deployment
 */
export async function checkHealth(): Promise<HealthCheckResponse> {
  try {
    const response = await fetch('/api/health', {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error('Health check failed');
    }

    const data: HealthCheckResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}

// ─── LocalStorage Utils for RespondentId ───

const RESPONDENT_ID_KEY = 'respondentId';

/**
 * Get respondent ID from localStorage
 */
export function getRespondentId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(RESPONDENT_ID_KEY);
}

/**
 * Save respondent ID to localStorage
 */
export function setRespondentId(respondentId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(RESPONDENT_ID_KEY, respondentId);
}

/**
 * Clear respondent ID from localStorage
 * Should be called when survey is complete or terminated
 */
export function clearRespondentId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(RESPONDENT_ID_KEY);
}

/**
 * Helper to build submit payload
 */
export function buildSubmitPayload(
  surveyId: string,
  responses: Record<string, unknown>,
  status: SurveyStatus,
  currentQuestionId: string | undefined,
  visitedQuestions: string[],
  allQuestions: Array<{ id: string; type: string }>
): SubmitPayload {
  const respondentId = getRespondentId() || undefined;

  // Convert responses object to ResponseSchema array
  const responseArray: ResponseSchema[] = Object.entries(responses).map(
    ([questionId, answer]) => {
      // Look up question type from allQuestions
      const question = allQuestions.find(q => q.id === questionId);
      const questionType = question?.type || 'unknown';

      return {
        questionId,
        questionType,
        answer,
        answeredAt: new Date().toISOString(),
      };
    }
  );

  return {
    surveyId,
    respondentId,
    responses: responseArray,
    status,
    currentQuestionId,
    visitedQuestions,
  };
}
