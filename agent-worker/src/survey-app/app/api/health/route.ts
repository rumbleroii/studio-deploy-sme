/**
 * GET /api/health
 * Health check endpoint for the survey deployment
 * Called from the main studio app to verify survey is live
 */

import { NextResponse } from 'next/server';
import type { HealthCheckResponse } from '../../../types/api';

export async function GET() {
  try {
    // TODO: Add actual health checks:
    // - Database connection status
    // - Survey configuration loaded
    // - Any other critical dependencies

    // For now, return healthy status
    const response: HealthCheckResponse = {
      status: 'healthy',
      surveyId: process.env.NEXT_PUBLIC_SURVEY_ID || 'unknown',
      timestamp: new Date().toISOString(),
      version: 1,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);

    const response: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: 1,
      error: error instanceof Error ? error.message : 'Health check failed',
    };

    return NextResponse.json(response, { status: 503 });
  }
}

// Disable caching for health check
export const dynamic = 'force-dynamic';
