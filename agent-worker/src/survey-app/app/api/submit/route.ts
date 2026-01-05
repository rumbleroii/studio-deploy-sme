/**
 * POST /api/submit
 * Saves survey responses to MongoDB
 * Called after each question is answered
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SubmitPayload, SubmitResponse } from '../../../types/api';
import { getDb, COLLECTIONS } from '../../../lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const body: SubmitPayload = await request.json();

    // Validate required fields
    if (!body.surveyId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: surveyId' },
        { status: 400 }
      );
    }

    if (!body.responses || !Array.isArray(body.responses)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid field: responses' },
        { status: 400 }
      );
    }

    if (!body.status || !['incomplete', 'complete', 'terminated'].includes(body.status)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid field: status' },
        { status: 400 }
      );
    }

    // Generate respondentId if not provided (first submission)
    const respondentId = body.respondentId || generateRespondentId();
    const now = new Date().toISOString();

    // Connect to MongoDB and save
    const db = await getDb();
    const collection = db.collection(COLLECTIONS.RESPONSES);

    // Upsert: Update if respondentId exists, otherwise insert
    await collection.updateOne(
      { surveyId: body.surveyId, respondentId },
      {
        $set: {
          surveyId: body.surveyId,
          respondentId,
          responses: body.responses,
          status: body.status,
          currentQuestionId: body.currentQuestionId,
          visitedQuestions: body.visitedQuestions,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    console.log(`Saved response for survey ${body.surveyId}, respondent ${respondentId}`);

    // Return success response
    const response: SubmitResponse = {
      success: true,
      respondentId,
      status: body.status,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('Error in /api/submit:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique respondent ID
 */
function generateRespondentId(): string {
  return `resp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Disable caching for this API route
export const dynamic = 'force-dynamic';
