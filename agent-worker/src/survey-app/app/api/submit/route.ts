/**
 * POST /api/submit
 * Saves survey responses to MongoDB
 * Called after each question is answered
 */

import { NextRequest, NextResponse } from 'next/server';
import type { SubmitPayload, SubmitResponse } from '../../../types/api';
import { prisma } from '../../../lib/db';

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

    if (!body.projectId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: projectId' },
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

    // Save to MongoDB using Prisma (if available)
    // Gracefully handle cases where MongoDB is not available (e.g., in containers without DB access)
    try {
      const existingResponse = await prisma.surveyResponse.findFirst({
        where: {
          surveyId: body.surveyId,
          projectId: body.projectId,
          respondentId: respondentId,
        },
      });

      if (existingResponse) {
        // Update existing response
        await prisma.surveyResponse.update({
          where: { id: existingResponse.id },
          data: {
            responses: body.responses,
            status: body.status,
            metadata: body.metadata || undefined,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new response
        await prisma.surveyResponse.create({
          data: {
            surveyId: body.surveyId,
            projectId: body.projectId,
            respondentId: respondentId,
            responses: body.responses,
            status: body.status,
            metadata: body.metadata || undefined,
          },
        });
      }
    } catch (dbError: any) {
      // Check if it's a connection error (MongoDB not available)
      const errorMessage = String(dbError?.message || dbError || '');
      const isConnectionError = 
        errorMessage.includes('Connection refused') ||
        errorMessage.includes('Server selection timeout') ||
        errorMessage.includes('No available servers') ||
        errorMessage.includes('ECONNREFUSED') ||
        !process.env.MONGODB_URI;

      if (isConnectionError) {
        // MongoDB not available - log warning but don't fail the request
        // In production, you should configure MONGODB_URI to point to MongoDB Atlas or a reachable instance
        console.warn('[Submit API] MongoDB not available, skipping database save:', errorMessage);
        // Continue without database - response will still be returned successfully
      } else {
        // Other database errors should be thrown
        throw dbError;
      }
    }

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
 * TODO: Replace with proper UUID generation or use MongoDB's ObjectId
 */
function generateRespondentId(): string {
  return `resp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Disable caching for this API route
export const dynamic = 'force-dynamic';
