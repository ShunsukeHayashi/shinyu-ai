/**
 * GET /api/media/avatar/jobs/[jobId]
 *
 * Retrieve avatar generation job status by job ID.
 * Used for polling the status of async avatar generation requests.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAvatarGenerator } from '@/src/services/avatar-generator';
import { AvatarGenerationError } from '@/src/types/avatar';

/**
 * GET handler for job status retrieval
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      );
    }

    // Get avatar generator instance
    const generator = getAvatarGenerator();

    // Get job status
    const metadata = await generator.getJobStatus(jobId);

    // Return job metadata
    return NextResponse.json({
      success: true,
      data: {
        jobId: metadata.jobId,
        companionId: metadata.companionId,
        status: metadata.status,
        progress: metadata.progress,
        estimatedTimeRemaining: metadata.estimatedTimeRemaining,
        request: metadata.request,
        createdAt: metadata.createdAt,
        updatedAt: metadata.updatedAt,
      },
    });
  } catch (error) {
    console.error('Get job status error:', error);

    // Handle AvatarGenerationError
    if (error instanceof AvatarGenerationError) {
      const statusCode = getErrorStatusCode(error.code);
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: statusCode }
      );
    }

    // Handle unknown errors
    return NextResponse.json(
      {
        error: 'Failed to get job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Map error code to HTTP status code
 */
function getErrorStatusCode(code: string): number {
  const statusMap: Record<string, number> = {
    INVALID_REQUEST: 400,
    INVALID_COMPANION: 404,
    RATE_LIMIT: 429,
    QUOTA_EXCEEDED: 402,
    TIMEOUT: 408,
    API_ERROR: 500,
    GENERATION_FAILED: 500,
  };

  return statusMap[code] || 500;
}
