/**
 * Real-time Speech-to-Text WebSocket API Endpoint
 *
 * WS /api/media/stt/stream
 *
 * Provides real-time streaming STT with WebSocket connection.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSpeechService } from '@/src/services/speech-service';

/**
 * GET /api/media/stt/stream
 *
 * This endpoint provides WebSocket URL for real-time STT streaming.
 * The actual WebSocket connection should be established to the BytePlus endpoint.
 *
 * Query parameters:
 * - language?: string (e.g., 'ja-JP', 'en-US')
 *
 * Response:
 * {
 *   wsUrl: string - WebSocket URL with authentication
 *   protocol: 'wss'
 *   description: string
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') || undefined;

    // Create speech service
    const speechService = createSpeechService();

    // Get WebSocket URL
    const wsUrl = speechService.createStreamingSTTUrl(language);

    // Return response
    return NextResponse.json(
      {
        wsUrl,
        protocol: 'wss',
        description: 'Real-time speech-to-text streaming endpoint',
        usage: {
          connect: 'Connect to wsUrl using WebSocket client',
          send: 'Send binary audio chunks (recommended: 20-100ms per chunk)',
          receive: 'Receive JSON messages with partial and final transcriptions',
          messageTypes: {
            connected: 'Connection established',
            partial: 'Partial transcription (real-time)',
            final: 'Final transcription for audio segment',
            error: 'Error message',
            closed: 'Connection closed',
          },
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('STT streaming API error:', error);

    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Failed to create streaming connection: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error while creating streaming connection' },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS /api/media/stt/stream
 *
 * CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
