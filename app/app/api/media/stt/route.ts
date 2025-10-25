/**
 * Speech-to-Text API Endpoint
 *
 * POST /api/media/stt
 *
 * Converts speech to text with high accuracy (98%+ for CJK languages).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSpeechService } from '@/src/services/speech-service';

/**
 * POST /api/media/stt
 *
 * Request body:
 * {
 *   audioData: string (base64-encoded audio)
 *   language?: string (e.g., 'ja-JP', 'en-US', 'zh-CN')
 *   enableSpeakerDiarization?: boolean
 * }
 *
 * Response:
 * {
 *   text: string
 *   language: string
 *   confidence: number (0.0 to 1.0)
 *   processingTime: number
 *   speakers?: Array<{
 *     speaker: string
 *     startTime: number
 *     endTime: number
 *     text: string
 *     confidence: number
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.audioData || typeof body.audioData !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: audioData is required and must be a base64 string' },
        { status: 400 }
      );
    }

    // Validate base64 format
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(body.audioData)) {
      return NextResponse.json(
        { error: 'Invalid audioData: must be valid base64 string' },
        { status: 400 }
      );
    }

    // Create speech service
    const speechService = createSpeechService();

    // Convert speech to text
    const result = await speechService.speechToText(body.audioData, {
      language: body.language,
      enableSpeakerDiarization: body.enableSpeakerDiarization,
    });

    // Return response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('STT API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `STT processing failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during STT processing' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/media/stt
 *
 * Returns API information
 */
export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/media/stt',
      method: 'POST',
      description: 'Convert speech to text with high accuracy (98%+ for CJK)',
      parameters: {
        audioData: 'string (required) - Base64-encoded audio data',
        language: "string (optional) - Language code (e.g., 'ja-JP', 'en-US', 'zh-CN')",
        enableSpeakerDiarization: 'boolean (optional) - Enable speaker identification',
      },
      response: {
        text: 'string - Transcribed text',
        language: 'string - Detected language code',
        confidence: 'number - Confidence score (0.0 to 1.0, target: 0.98+ for CJK)',
        processingTime: 'number - Processing time in milliseconds',
        speakers:
          'array (optional) - Speaker segments if diarization is enabled',
      },
    },
    { status: 200 }
  );
}
