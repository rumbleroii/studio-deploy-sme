/**
 * API Types and Schemas for Survey App
 * These types define the contract between the survey app and the backend
 */

// ─── Response Schema ───
export interface ResponseSchema {
  questionId: string;    // Maps to Question.id (e.g., "S1", "Q4")
  questionType: string;  // e.g., "single_choice", "matrix", custom types
  answer: unknown;       // Flexible - structure depends on questionType
  answeredAt: string;    // ISO timestamp when answered
}

/**
 * Answer structure examples by question type:
 *
 * - single_choice: { id: 1, label: "Yes", value: "yes" }
 * - multiple_choice: [{ id: 1, label: "A", value: "a" }, { id: 2, label: "B", value: "b" }]
 * - matrix: { row1: { id: 1, label: "Agree", value: 5 }, row2: { ... } }
 * - text: "Open ended response text"
 * - numeric: 42
 * - rating: 4
 *
 * AI-invented types can have any structure
 */

// ─── Survey Status ───
export type SurveyStatus = 'incomplete' | 'complete' | 'terminated';

// ─── Submit Payload (Request) ───
export interface SubmitPayload {
  // Survey identification
  surveyId: string;
  projectId: string;

  // Respondent identification
  respondentId?: string;  // Omit on first call, include on subsequent
  userId?: string;        // External user ID (optional)

  // Response data
  responses: ResponseSchema[];

  // Survey progress
  status: SurveyStatus;
  currentQuestionId?: string;
  visitedQuestions: string[];

  // Optional metadata (device info, timestamps, etc)
  metadata?: Record<string, unknown>;
}

// ─── Submit Response ───
export interface SubmitResponse {
  success: boolean;
  respondentId: string;  // Use this for subsequent calls
  status: SurveyStatus;
  error?: string;
}

// ─── Health Check Response ───
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  surveyId?: string;
  timestamp: string;
  version: number;
  error?: string;
}

// ─── Error Response ───
export interface ErrorResponse {
  success: false;
  error: string;
}
