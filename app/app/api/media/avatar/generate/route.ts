/**
 * POST /api/media/avatar/generate
 *
 * Avatar generation endpoint for creating AI-driven video avatars.
 * Supports photo-realistic synthesis with emotion-driven facial expressions.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAvatarGenerator } from '@/src/services/avatar-generator';
import { EmotionalState, AvatarOutputFormat, AvatarGenerationError } from '@/src/types/avatar';

/**
 * Request body schema
 */
interface GenerateAvatarRequest {
  companionId: string;
  text: string;
  emotion: EmotionalState;
  duration?: number;
  format?: AvatarOutputFormat;
  waitForCompletion?: boolean;
  voiceParams?: {
    speed?: number;
    pitch?: number;
    volume?: number;
  };
}

/**
 * POST handler for avatar generation
 *
 * Creates a new avatar generation job with the specified parameters.
 * Optionally waits for completion if waitForCompletion is true.
 */
export async function POST(request: NextRequest) {
  try {
    const body: GenerateAvatarRequest = await request.json();

    // Validate required fields
    if (!body.companionId) {
      return NextResponse.json(
        { error: 'companionId is required' },
        { status: 400 }
      );
    }

    if (!body.text) {
      return NextResponse.json(
        { error: 'text is required' },
        { status: 400 }
      );
    }

    if (!body.emotion) {
      return NextResponse.json(
        { error: 'emotion is required' },
        { status: 400 }
      );
    }

    // Validate emotion
    const validEmotions: EmotionalState[] = ['happiness', 'excitement', 'affection', 'curiosity'];
    if (!validEmotions.includes(body.emotion)) {
      return NextResponse.json(
        {
          error: `Invalid emotion. Must be one of: ${validEmotions.join(', ')}`,
          validEmotions,
        },
        { status: 400 }
      );
    }

    // Validate format
    if (body.format && !['video', 'audio', 'both'].includes(body.format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be one of: video, audio, both' },
        { status: 400 }
      );
    }

    // Validate duration
    if (body.duration && (body.duration <= 0 || body.duration > 60)) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 60 seconds' },
        { status: 400 }
      );
    }

    // Get avatar generator instance
    const generator = getAvatarGenerator();

    // Generate avatar
    const startTime = Date.now();

    let response;
    if (body.waitForCompletion) {
      // Wait for completion (blocking request)
      response = await generator.generateAndWait({
        companionId: body.companionId,
        text: body.text,
        emotion: body.emotion,
        duration: body.duration,
        format: body.format,
        customVoiceParams: body.voiceParams,
      });
    } else {
      // Async generation (returns job ID immediately)
      response = await generator.generate({
        companionId: body.companionId,
        text: body.text,
        emotion: body.emotion,
        duration: body.duration,
        format: body.format,
        customVoiceParams: body.voiceParams,
      });
    }

    const processingTime = Date.now() - startTime;

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        jobId: response.jobId,
        status: response.status,
        videoUrl: response.videoUrl,
        audioUrl: response.audioUrl,
        lipSyncQuality: response.lipSyncQuality,
        generationTime: response.generationTime,
        processingTime,
        createdAt: response.createdAt,
        completedAt: response.completedAt,
      },
      metadata: {
        companionId: body.companionId,
        emotion: body.emotion,
        duration: body.duration || 10,
        format: body.format || 'both',
        waitedForCompletion: body.waitForCompletion || false,
      },
    });
  } catch (error) {
    console.error('Avatar generation error:', error);

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
        error: 'Failed to generate avatar',
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
