/**
 * WebSocket Type Definitions for AI Girlfriend Platform
 * Real-time streaming conversation protocol
 */

/**
 * Emotional state during conversation
 */
export interface EmotionalState {
  primary: 'happy' | 'sad' | 'excited' | 'anxious' | 'calm' | 'loving' | 'playful';
  intensity: number; // 0-100
  timestamp: string;
}

/**
 * Message chunk types
 */
export type MessageChunkType = 'text' | 'emotion' | 'action' | 'thinking';

/**
 * Message chunk for streaming
 */
export interface MessageChunk {
  type: MessageChunkType;
  content: string;
  emotion?: EmotionalState;
  timestamp: string;
}

/**
 * Media attachment
 */
export interface MediaAttachment {
  type: 'image' | 'audio' | 'video';
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * Complete message object
 */
export interface Message {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  chunks?: MessageChunk[];
  emotion?: EmotionalState;
  media?: MediaAttachment[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket event types
 */
export type WSEventType =
  | 'auth'
  | 'message.send'
  | 'typing.start'
  | 'typing.stop'
  | 'message.chunk'
  | 'emotion.update'
  | 'message.complete'
  | 'error'
  | 'ping'
  | 'pong'
  | 'connection.ready';

/**
 * Base WebSocket message structure
 */
export interface WSMessage<T = unknown> {
  type: WSEventType;
  data?: T;
  timestamp?: string;
  requestId?: string; // For tracking request/response pairs
}

/**
 * Authentication event data
 */
export interface AuthEventData {
  token: string;
}

/**
 * Send message event data
 */
export interface SendMessageEventData {
  content: string;
  media?: MediaAttachment[];
  metadata?: Record<string, unknown>;
}

/**
 * Typing indicator event data
 */
export interface TypingEventData {
  isTyping: boolean;
}

/**
 * Message chunk event data
 */
export interface MessageChunkEventData {
  chunk: MessageChunk;
  messageId: string;
}

/**
 * Emotion update event data
 */
export interface EmotionUpdateEventData {
  emotion: EmotionalState;
  messageId?: string;
}

/**
 * Message complete event data
 */
export interface MessageCompleteEventData {
  message: Message;
}

/**
 * Error event data
 */
export interface ErrorEventData {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Specific WebSocket message types
 */
export type AuthMessage = WSMessage<AuthEventData> & { type: 'auth' };
export type SendMessageMessage = WSMessage<SendMessageEventData> & { type: 'message.send' };
export type TypingStartMessage = WSMessage<TypingEventData> & { type: 'typing.start' };
export type TypingStopMessage = WSMessage<TypingEventData> & { type: 'typing.stop' };
export type MessageChunkMessage = WSMessage<MessageChunkEventData> & { type: 'message.chunk' };
export type EmotionUpdateMessage = WSMessage<EmotionUpdateEventData> & { type: 'emotion.update' };
export type MessageCompleteMessage = WSMessage<MessageCompleteEventData> & { type: 'message.complete' };
export type ErrorMessage = WSMessage<ErrorEventData> & { type: 'error' };
export type PingMessage = WSMessage & { type: 'ping' };
export type PongMessage = WSMessage & { type: 'pong' };
export type ConnectionReadyMessage = WSMessage & { type: 'connection.ready' };

/**
 * Union type for all possible WebSocket messages
 */
export type AnyWSMessage =
  | AuthMessage
  | SendMessageMessage
  | TypingStartMessage
  | TypingStopMessage
  | MessageChunkMessage
  | EmotionUpdateMessage
  | MessageCompleteMessage
  | ErrorMessage
  | PingMessage
  | PongMessage
  | ConnectionReadyMessage;

/**
 * WebSocket connection state
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

/**
 * WebSocket connection options
 */
export interface WSConnectionOptions {
  conversationId: string;
  token: string;
  reconnectAttempts?: number;
  reconnectDelay?: number;
  pingInterval?: number;
  pongTimeout?: number;
}

/**
 * WebSocket server configuration
 */
export interface WSServerConfig {
  port: number;
  path: string;
  maxConnections?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  authTimeout?: number;
}

/**
 * Client connection metadata
 */
export interface ClientConnection {
  id: string;
  conversationId: string;
  userId: string;
  authenticated: boolean;
  connectedAt: Date;
  lastActivity: Date;
  messageQueue: Message[];
}

/**
 * Conversation stream configuration
 */
export interface StreamConfig {
  enableTypingIndicators: boolean;
  enableEmotionUpdates: boolean;
  chunkDelay?: number; // Artificial delay between chunks (ms)
  maxChunkSize?: number; // Maximum characters per chunk
}
