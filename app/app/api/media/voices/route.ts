/**
 * Voice Library API Endpoint
 *
 * GET /api/media/voices
 *
 * Returns list of available voices (50+) from BytePlus voice library.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSpeechService } from '@/src/services/speech-service';
import { EmotionType } from '@/src/types/speech';

/**
 * GET /api/media/voices
 *
 * Query parameters:
 * - locale?: string (e.g., 'ja-JP', 'en-US')
 * - gender?: 'male' | 'female' | 'neutral'
 * - emotion?: 'happy' | 'soft' | 'energetic' | 'neutral'
 *
 * Response:
 * {
 *   total: number
 *   voices: Array<{
 *     id: string
 *     name: string
 *     gender: 'male' | 'female' | 'neutral'
 *     locale: string
 *     ageRange: 'child' | 'teen' | 'adult' | 'senior'
 *     supportedEmotions: Array<string>
 *     description: string
 *     sampleUrl?: string
 *   }>
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get('locale') || undefined;
    const gender = searchParams.get('gender') as 'male' | 'female' | 'neutral' | null;
    const emotion = searchParams.get('emotion') as EmotionType | null;

    // Validate gender parameter
    if (gender && !['male', 'female', 'neutral'].includes(gender)) {
      return NextResponse.json(
        { error: 'Invalid gender parameter. Must be: male, female, or neutral' },
        { status: 400 }
      );
    }

    // Validate emotion parameter
    if (emotion && !['happy', 'soft', 'energetic', 'neutral'].includes(emotion)) {
      return NextResponse.json(
        { error: 'Invalid emotion parameter. Must be: happy, soft, energetic, or neutral' },
        { status: 400 }
      );
    }

    // Create speech service
    const speechService = createSpeechService();

    // Get voices with filters
    const result = await speechService.getVoices({
      locale,
      gender: gender || undefined,
      emotion: emotion || undefined,
    });

    // Return response
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Voice library API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to fetch voice library: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while fetching voice library' },
      { status: 500 }
    );
  }
}
