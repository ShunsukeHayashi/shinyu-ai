/**
 * WebSocket Server for Real-time Streaming Conversations
 * AI Girlfriend Platform - Real-time Communication Layer
 */

import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import * as jwt from 'jsonwebtoken';
import {
  WSMessage,
  AnyWSMessage,
  AuthEventData,
  SendMessageEventData,
  ClientConnection,
  WSServerConfig,
  ConnectionState,
  ErrorEventData,
  MessageChunk,
  EmotionalState,
  Message,
  StreamConfig,
} from '../types/websocket';

/**
 * Extended WebSocket with client metadata
 */
interface ExtendedWebSocket extends WebSocket {
  clientId?: string;
  conversationId?: string;
  userId?: string;
  authenticated?: boolean;
  isAlive?: boolean;
  authTimer?: NodeJS.Timeout;
}

/**
 * WebSocket Server Manager
 */
export class ConversationWebSocketServer {
  private wss: WebSocketServer;
  private clients: Map<string, ExtendedWebSocket>;
  private connections: Map<string, ClientConnection>;
  private config: Required<WSServerConfig>;
  private heartbeatInterval?: NodeJS.Timeout;

  constructor(config: WSServerConfig) {
    this.config = {
      maxConnections: 1000,
      heartbeatInterval: 30000,
      messageQueueSize: 100,
      authTimeout: 10000,
      ...config,
    };

    this.clients = new Map();
    this.connections = new Map();

    this.wss = new WebSocketServer({
      port: this.config.port,
      path: this.config.path,
      maxPayload: 1024 * 1024, // 1MB
    });

    this.initialize();
  }

  /**
   * Initialize server and set up event handlers
   */
  private initialize(): void {
    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    console.log(`WebSocket server started on port ${this.config.port}, path ${this.config.path}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: ExtendedWebSocket, request: IncomingMessage): void {
    const clientId = this.generateClientId();
    ws.clientId = clientId;
    ws.authenticated = false;
    ws.isAlive = true;

    // Check connection limit
    if (this.clients.size >= this.config.maxConnections) {
      this.sendError(ws, 'SERVER_FULL', 'Server has reached maximum connections');
      ws.close();
      return;
    }

    this.clients.set(clientId, ws);

    // Set authentication timeout
    ws.authTimer = setTimeout(() => {
      if (!ws.authenticated) {
        this.sendError(ws, 'AUTH_TIMEOUT', 'Authentication timeout');
        ws.close();
      }
    }, this.config.authTimeout);

    // Set up event handlers
    ws.on('message', (data: Buffer) => this.handleMessage(ws, data));
    ws.on('pong', () => this.handlePong(ws));
    ws.on('close', () => this.handleClose(ws));
    ws.on('error', (error) => this.handleError(ws, error));

    // Send connection ready message
    this.sendMessage(ws, { type: 'connection.ready', timestamp: new Date().toISOString() });

    console.log(`New connection: ${clientId}`);
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(ws: ExtendedWebSocket, data: Buffer): Promise<void> {
    try {
      const message: AnyWSMessage = JSON.parse(data.toString());

      // Update last activity
      if (ws.clientId && this.connections.has(ws.clientId)) {
        const connection = this.connections.get(ws.clientId)!;
        connection.lastActivity = new Date();
      }

      // Handle different message types
      switch (message.type) {
        case 'auth':
          await this.handleAuth(ws, message.data as AuthEventData);
          break;

        case 'message.send':
          if (!ws.authenticated) {
            this.sendError(ws, 'NOT_AUTHENTICATED', 'Client must authenticate first');
            return;
          }
          await this.handleSendMessage(ws, message.data as SendMessageEventData);
          break;

        case 'typing.start':
          if (!ws.authenticated) {
            this.sendError(ws, 'NOT_AUTHENTICATED', 'Client must authenticate first');
            return;
          }
          await this.handleTypingStart(ws);
          break;

        case 'typing.stop':
          if (!ws.authenticated) {
            this.sendError(ws, 'NOT_AUTHENTICATED', 'Client must authenticate first');
            return;
          }
          await this.handleTypingStop(ws);
          break;

        case 'ping':
          this.sendMessage(ws, { type: 'pong', timestamp: new Date().toISOString() });
          break;

        default:
          this.sendError(ws, 'UNKNOWN_MESSAGE_TYPE', `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.sendError(ws, 'INVALID_MESSAGE', 'Failed to parse message');
    }
  }

  /**
   * Handle authentication
   */
  private async handleAuth(ws: ExtendedWebSocket, data: AuthEventData): Promise<void> {
    try {
      if (!data.token) {
        this.sendError(ws, 'MISSING_TOKEN', 'Authentication token is required');
        return;
      }

      // Verify JWT token
      const decoded = await this.verifyToken(data.token);

      ws.userId = decoded.userId;
      ws.conversationId = decoded.conversationId;
      ws.authenticated = true;

      // Clear auth timeout
      if (ws.authTimer) {
        clearTimeout(ws.authTimer);
        ws.authTimer = undefined;
      }

      // Create connection record
      if (ws.clientId) {
        this.connections.set(ws.clientId, {
          id: ws.clientId,
          conversationId: ws.conversationId,
          userId: ws.userId,
          authenticated: true,
          connectedAt: new Date(),
          lastActivity: new Date(),
          messageQueue: [],
        });
      }

      console.log(`Client authenticated: ${ws.clientId}, userId: ${ws.userId}, conversationId: ${ws.conversationId}`);
    } catch (error) {
      console.error('Authentication error:', error);
      this.sendError(ws, 'AUTH_FAILED', 'Invalid or expired token');
      ws.close();
    }
  }

  /**
   * Handle send message event
   */
  private async handleSendMessage(ws: ExtendedWebSocket, data: SendMessageEventData): Promise<void> {
    try {
      if (!ws.conversationId || !ws.userId) {
        this.sendError(ws, 'INVALID_STATE', 'Missing conversation or user context');
        return;
      }

      // Create user message
      const userMessage: Message = {
        id: this.generateMessageId(),
        conversationId: ws.conversationId,
        role: 'user',
        content: data.content,
        media: data.media,
        timestamp: new Date().toISOString(),
        metadata: data.metadata,
      };

      // Send message complete confirmation to user
      this.sendMessage(ws, {
        type: 'message.complete',
        data: { message: userMessage },
        timestamp: new Date().toISOString(),
      });

      // Start typing indicator
      this.sendMessage(ws, {
        type: 'typing.start',
        timestamp: new Date().toISOString(),
      });

      // Stream AI response
      await this.streamAIResponse(ws, userMessage);

      // Stop typing indicator
      this.sendMessage(ws, {
        type: 'typing.stop',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error handling send message:', error);
      this.sendError(ws, 'MESSAGE_FAILED', 'Failed to process message');
    }
  }

  /**
   * Stream AI response with chunks
   */
  private async streamAIResponse(ws: ExtendedWebSocket, userMessage: Message): Promise<void> {
    // This is a placeholder - actual implementation will integrate with conversation engine
    const messageId = this.generateMessageId();

    // Simulate streaming response
    const response = "I understand you're feeling that way. Let me help you with that...";
    const words = response.split(' ');

    for (let i = 0; i < words.length; i++) {
      const chunk: MessageChunk = {
        type: 'text',
        content: words[i] + (i < words.length - 1 ? ' ' : ''),
        timestamp: new Date().toISOString(),
      };

      this.sendMessage(ws, {
        type: 'message.chunk',
        data: { chunk, messageId },
        timestamp: new Date().toISOString(),
      });

      // Artificial delay for streaming effect
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // Send emotion update
    const emotion: EmotionalState = {
      primary: 'loving',
      intensity: 75,
      timestamp: new Date().toISOString(),
    };

    this.sendMessage(ws, {
      type: 'emotion.update',
      data: { emotion, messageId },
      timestamp: new Date().toISOString(),
    });

    // Send complete message
    const aiMessage: Message = {
      id: messageId,
      conversationId: userMessage.conversationId,
      role: 'assistant',
      content: response,
      emotion,
      timestamp: new Date().toISOString(),
    };

    this.sendMessage(ws, {
      type: 'message.complete',
      data: { message: aiMessage },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle typing start
   */
  private async handleTypingStart(ws: ExtendedWebSocket): Promise<void> {
    // Broadcast typing indicator to other clients in same conversation
    console.log(`User ${ws.userId} started typing in conversation ${ws.conversationId}`);
  }

  /**
   * Handle typing stop
   */
  private async handleTypingStop(ws: ExtendedWebSocket): Promise<void> {
    // Broadcast typing stop to other clients in same conversation
    console.log(`User ${ws.userId} stopped typing in conversation ${ws.conversationId}`);
  }

  /**
   * Handle pong response
   */
  private handlePong(ws: ExtendedWebSocket): void {
    ws.isAlive = true;
  }

  /**
   * Handle connection close
   */
  private handleClose(ws: ExtendedWebSocket): void {
    if (ws.clientId) {
      this.clients.delete(ws.clientId);
      this.connections.delete(ws.clientId);
      console.log(`Connection closed: ${ws.clientId}`);
    }

    if (ws.authTimer) {
      clearTimeout(ws.authTimer);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(ws: ExtendedWebSocket, error: Error): void {
    console.error('WebSocket error:', error);
    this.sendError(ws, 'WEBSOCKET_ERROR', error.message);
  }

  /**
   * Send message to client
   */
  private sendMessage(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message to client
   */
  private sendError(ws: WebSocket, code: string, error: string, details?: Record<string, unknown>): void {
    const errorData: ErrorEventData = { error, code, details };
    this.sendMessage(ws, {
      type: 'error',
      data: errorData,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<{ userId: string; conversationId: string }> {
    return new Promise((resolve, reject) => {
      const secret = process.env.JWT_SECRET || 'your-secret-key';

      jwt.verify(token, secret, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded as { userId: string; conversationId: string });
        }
      });
    });
  }

  /**
   * Start heartbeat to detect dead connections
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((ws, clientId) => {
        if (!ws.isAlive) {
          console.log(`Terminating dead connection: ${clientId}`);
          ws.terminate();
          this.clients.delete(clientId);
          this.connections.delete(clientId);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, this.config.heartbeatInterval);
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active connections count
   */
  public getConnectionsCount(): number {
    return this.clients.size;
  }

  /**
   * Get connection by client ID
   */
  public getConnection(clientId: string): ClientConnection | undefined {
    return this.connections.get(clientId);
  }

  /**
   * Get all connections for a conversation
   */
  public getConversationConnections(conversationId: string): ClientConnection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.conversationId === conversationId
    );
  }

  /**
   * Broadcast message to all clients in a conversation
   */
  public broadcastToConversation(conversationId: string, message: WSMessage): void {
    this.clients.forEach((ws) => {
      if (ws.conversationId === conversationId && ws.authenticated) {
        this.sendMessage(ws, message);
      }
    });
  }

  /**
   * Shutdown server gracefully
   */
  public async shutdown(): Promise<void> {
    console.log('Shutting down WebSocket server...');

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    this.clients.forEach((ws) => {
      ws.close(1000, 'Server shutting down');
    });

    // Close server
    return new Promise((resolve, reject) => {
      this.wss.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('WebSocket server closed');
          resolve();
        }
      });
    });
  }
}

// Singleton instance
let serverInstance: ConversationWebSocketServer | null = null;

/**
 * Get WebSocket server instance (singleton)
 */
export function getWebSocketServer(config?: WSServerConfig): ConversationWebSocketServer {
  if (!serverInstance && config) {
    serverInstance = new ConversationWebSocketServer(config);
  }

  if (!serverInstance) {
    throw new Error('WebSocket server not initialized. Provide config on first call.');
  }

  return serverInstance;
}

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(config: WSServerConfig): ConversationWebSocketServer {
  if (serverInstance) {
    console.warn('WebSocket server already initialized');
    return serverInstance;
  }

  serverInstance = new ConversationWebSocketServer(config);
  return serverInstance;
}
