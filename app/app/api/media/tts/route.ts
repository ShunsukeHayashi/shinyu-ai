/**
 * Text-to-Speech API Endpoint
 *
 * POST /api/media/tts
 *
 * Converts text to speech with emotion control and returns audio data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSpeechService } from '@/src/services/speech-service';
import { EmotionType } from '@/src/types/speech';

/**
 * POST /api/media/tts
 *
 * Request body:
 * {
 *   text: string
 *   voiceId?: string
 *   emotion?: 'happy' | 'soft' | 'energetic' | 'neutral'
 *   pitch?: number (-1.0 to 1.0)
 *   speed?: number (0.5 to 2.0)
 * }
 *
 * Response:
 * {
 *   audioData: string (base64)
 *   format: string
 *   duration: number
 *   processingTime: number
 *   voiceId: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();

    // Validate required fields
    if (!body.text || typeof body.text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: text is required and must be a string' },
        { status: 400 }
      );
    }

    // Validate optional fields
    if (body.emotion && !['happy', 'soft', 'energetic', 'neutral'].includes(body.emotion)) {
      return NextResponse.json(
        { error: 'Invalid emotion type. Must be: happy, soft, energetic, or neutral' },
        { status: 400 }
      );
    }

    if (body.pitch !== undefined && (body.pitch < -1.0 || body.pitch > 1.0)) {
      return NextResponse.json(
        { error: 'Invalid pitch value. Must be between -1.0 and 1.0' },
        { status: 400 }
      );
    }

    if (body.speed !== undefined && (body.speed < 0.5 || body.speed > 2.0)) {
      return NextResponse.json(
        { error: 'Invalid speed value. Must be between 0.5 and 2.0' },
        { status: 400 }
      );
    }

    // Create speech service
    const speechService = createSpeechService();

    // Convert text to speech
    const result = await speechService.textToSpeech(body.text, {
      voiceId: body.voiceId,
      emotion: body.emotion as EmotionType,
      pitch: body.pitch,
      speed: body.speed,
    });

    // Return response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('TTS API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `TTS processing failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error during TTS processing' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/media/tts
 *
 * Returns API information
 */
export async function GET() {
  return NextResponse.json(
    {
      endpoint: '/api/media/tts',
      method: 'POST',
      description: 'Convert text to speech with emotion control',
      parameters: {
        text: 'string (required) - Text to convert to speech',
        voiceId: 'string (optional) - Voice ID from voice library',
        emotion: "string (optional) - Emotion type: 'happy' | 'soft' | 'energetic' | 'neutral'",
        pitch: 'number (optional) - Pitch adjustment: -1.0 to 1.0',
        speed: 'number (optional) - Speech speed: 0.5 to 2.0',
      },
      response: {
        audioData: 'string - Base64-encoded audio data',
        format: 'string - Audio format (e.g., mp3, wav)',
        duration: 'number - Audio duration in milliseconds',
        processingTime: 'number - Processing time in milliseconds (target: <200ms)',
        voiceId: 'string - Voice ID used for synthesis',
      },
    },
    { status: 200 }
  );
}
