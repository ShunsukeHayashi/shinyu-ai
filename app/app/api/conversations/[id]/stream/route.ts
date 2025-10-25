/**
 * WebSocket API Endpoint for Real-time Conversations
 * Next.js API Route Handler
 *
 * Endpoint: WS /api/conversations/:id/stream
 */

import { NextRequest } from 'next/server';
import { getWebSocketServer, initializeWebSocketServer } from '@/src/services/websocket-server';
import { WSServerConfig } from '@/src/types/websocket';

/**
 * WebSocket server configuration
 */
const WS_CONFIG: WSServerConfig = {
  port: parseInt(process.env.WS_PORT || '3001', 10),
  path: '/api/conversations/stream',
  maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '1000', 10),
  heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
  messageQueueSize: parseInt(process.env.WS_MESSAGE_QUEUE_SIZE || '100', 10),
  authTimeout: parseInt(process.env.WS_AUTH_TIMEOUT || '10000', 10),
};

/**
 * Initialize WebSocket server on module load
 */
if (process.env.NODE_ENV !== 'test') {
  try {
    initializeWebSocketServer(WS_CONFIG);
    console.log('WebSocket server initialized');
  } catch (error) {
    console.error('Failed to initialize WebSocket server:', error);
  }
}

/**
 * GET handler - Returns WebSocket connection information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  const conversationId = params.id;

  try {
    const server = getWebSocketServer();
    const connections = server.getConversationConnections(conversationId);

    return Response.json({
      conversationId,
      wsEndpoint: `ws://${process.env.NEXT_PUBLIC_WS_HOST || 'localhost'}:${WS_CONFIG.port}${WS_CONFIG.path}`,
      activeConnections: connections.length,
      totalConnections: server.getConnectionsCount(),
      protocol: {
        events: [
          'auth',
          'message.send',
          'typing.start',
          'typing.stop',
          'message.chunk',
          'emotion.update',
          'message.complete',
          'error',
          'ping',
          'pong',
        ],
        authRequired: true,
        heartbeat: WS_CONFIG.heartbeatInterval,
      },
    });
  } catch (error) {
    console.error('Error getting WebSocket info:', error);
    return Response.json(
      { error: 'Failed to get WebSocket information' },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Not applicable for WebSocket connections
 * Returns upgrade instructions
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  return Response.json(
    {
      error: 'WebSocket connection required',
      message: 'This endpoint requires a WebSocket upgrade. Use a WebSocket client to connect.',
      instructions: {
        endpoint: `ws://${process.env.NEXT_PUBLIC_WS_HOST || 'localhost'}:${WS_CONFIG.port}${WS_CONFIG.path}`,
        headers: {
          'Upgrade': 'websocket',
          'Connection': 'Upgrade',
        },
        authFlow: [
          '1. Connect to WebSocket endpoint',
          '2. Send auth message with JWT token',
          '3. Wait for connection.ready event',
          '4. Start sending messages',
        ],
      },
    },
    { status: 400 }
  );
}
