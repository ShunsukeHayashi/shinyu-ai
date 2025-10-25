/**
 * Integration Tests for WebSocket with Conversation Engine
 * AI Girlfriend Platform - End-to-End Testing
 */

import WebSocket from 'ws';
import { ConversationWebSocketServer } from '../../services/websocket-server';
import { ConversationEngine, ConversationContext } from '../../services/conversation-engine';
import { generateToken } from '../../lib/jwt-auth';
import {
  WSMessage,
  AuthEventData,
  SendMessageEventData,
  WSServerConfig,
  Message,
} from '../../types/websocket';

describe('WebSocket + Conversation Engine Integration', () => {
  let server: ConversationWebSocketServer;
  let conversationEngine: ConversationEngine;
  let client: WebSocket;
  const TEST_PORT = 3003;
  const TEST_PATH = '/test/stream';

  const config: WSServerConfig = {
    port: TEST_PORT,
    path: TEST_PATH,
    maxConnections: 10,
    heartbeatInterval: 5000,
    messageQueueSize: 50,
    authTimeout: 5000,
  };

  beforeAll(() => {
    server = new ConversationWebSocketServer(config);
    conversationEngine = new ConversationEngine({
      enableTypingIndicators: true,
      enableEmotionUpdates: true,
      chunkDelay: 50,
      maxChunkSize: 5,
    });
  });

  afterAll(async () => {
    await server.shutdown();
  });

  afterEach(() => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  describe('Full Conversation Flow', () => {
    test('should complete full conversation with streaming', (done) => {
      const token = generateToken('user123', 'conv123');
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let authenticated = false;
      let receivedTypingStart = false;
      let receivedChunks = 0;
      let receivedEmotion = false;
      let receivedComplete = false;

      const events: string[] = [];

      client.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;
        events.push(message.type);

        if (message.type === 'connection.ready' && !authenticated) {
          // Authenticate
          const authMessage: WSMessage<AuthEventData> = {
            type: 'auth',
            data: { token },
            timestamp: new Date().toISOString(),
          };
          client.send(JSON.stringify(authMessage));
          authenticated = true;

          // Send user message after auth
          setTimeout(() => {
            const sendMessage: WSMessage<SendMessageEventData> = {
              type: 'message.send',
              data: {
                content: "I'm feeling stressed today, can you help me?",
              },
              timestamp: new Date().toISOString(),
            };
            client.send(JSON.stringify(sendMessage));
          }, 500);
        }

        if (message.type === 'typing.start') {
          receivedTypingStart = true;
        }

        if (message.type === 'message.chunk') {
          receivedChunks++;
        }

        if (message.type === 'emotion.update') {
          receivedEmotion = true;
          expect(message.data?.emotion).toBeDefined();
          expect(message.data?.emotion.primary).toBeTruthy();
          expect(message.data?.emotion.intensity).toBeGreaterThan(0);
        }

        if (message.type === 'message.complete') {
          if (message.data?.message.role === 'assistant') {
            receivedComplete = true;

            // Verify full flow
            expect(events).toContain('connection.ready');
            expect(events).toContain('typing.start');
            expect(events).toContain('message.chunk');
            expect(events).toContain('emotion.update');
            expect(events).toContain('message.complete');

            expect(receivedTypingStart).toBe(true);
            expect(receivedChunks).toBeGreaterThan(0);
            expect(receivedEmotion).toBe(true);
            expect(receivedComplete).toBe(true);

            expect(message.data.message.content).toBeTruthy();
            expect(message.data.message.role).toBe('assistant');

            done();
          }
        }
      });
    }, 15000);

    test('should handle multiple messages in conversation', (done) => {
      const token = generateToken('user123', 'conv456');
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let authenticated = false;
      let messagesReceived = 0;

      client.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready' && !authenticated) {
          const authMessage: WSMessage<AuthEventData> = {
            type: 'auth',
            data: { token },
            timestamp: new Date().toISOString(),
          };
          client.send(JSON.stringify(authMessage));
          authenticated = true;

          setTimeout(() => {
            // Send first message
            const sendMessage1: WSMessage<SendMessageEventData> = {
              type: 'message.send',
              data: { content: 'Hello!' },
              timestamp: new Date().toISOString(),
            };
            client.send(JSON.stringify(sendMessage1));
          }, 500);
        }

        if (message.type === 'message.complete' && message.data?.message.role === 'assistant') {
          messagesReceived++;

          if (messagesReceived === 1) {
            // Send second message after receiving first response
            setTimeout(() => {
              const sendMessage2: WSMessage<SendMessageEventData> = {
                type: 'message.send',
                data: { content: 'How are you?' },
                timestamp: new Date().toISOString(),
              };
              client.send(JSON.stringify(sendMessage2));
            }, 500);
          }

          if (messagesReceived === 2) {
            expect(messagesReceived).toBe(2);
            done();
          }
        }
      });
    }, 20000);
  });

  describe('Conversation Engine Integration', () => {
    test('should generate response with conversation context', async () => {
      const userMessage: Message = {
        id: 'msg_123',
        conversationId: 'conv_123',
        role: 'user',
        content: 'I need help with my anxiety',
        timestamp: new Date().toISOString(),
      };

      const context: ConversationContext = {
        conversationId: 'conv_123',
        userId: 'user_123',
        characterId: 'char_123',
        history: [],
      };

      const chunks: string[] = [];
      let emotion: any = null;
      let completeMessage: Message | null = null;

      await conversationEngine.generateResponse(userMessage, context, {
        onChunk: (chunk) => {
          chunks.push(chunk.content);
        },
        onEmotion: (emo) => {
          emotion = emo;
        },
        onComplete: (msg) => {
          completeMessage = msg;
        },
        onError: (error) => {
          throw error;
        },
      });

      expect(chunks.length).toBeGreaterThan(0);
      expect(emotion).not.toBeNull();
      expect(emotion.primary).toBeTruthy();
      expect(completeMessage).not.toBeNull();
      expect(completeMessage?.role).toBe('assistant');
      expect(completeMessage?.content).toBeTruthy();
    });

    test('should analyze emotion correctly', async () => {
      const userMessage: Message = {
        id: 'msg_124',
        conversationId: 'conv_124',
        role: 'user',
        content: 'I feel wonderful today!',
        timestamp: new Date().toISOString(),
      };

      const context: ConversationContext = {
        conversationId: 'conv_124',
        userId: 'user_124',
        history: [],
      };

      let detectedEmotion: any = null;

      await conversationEngine.generateResponse(userMessage, context, {
        onChunk: () => {},
        onEmotion: (emotion) => {
          detectedEmotion = emotion;
        },
        onComplete: () => {},
        onError: (error) => {
          throw error;
        },
      });

      expect(detectedEmotion).not.toBeNull();
      expect(detectedEmotion.intensity).toBeGreaterThan(0);
      expect(detectedEmotion.intensity).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    test('should handle connection errors gracefully', (done) => {
      // Try to connect to wrong port
      const badClient = new WebSocket(`ws://localhost:9999${TEST_PATH}`);

      badClient.on('error', (error) => {
        expect(error).toBeDefined();
        done();
      });
    });

    test('should handle malformed messages', (done) => {
      const token = generateToken('user123', 'conv789');
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let authenticated = false;

      client.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready' && !authenticated) {
          const authMessage: WSMessage<AuthEventData> = {
            type: 'auth',
            data: { token },
            timestamp: new Date().toISOString(),
          };
          client.send(JSON.stringify(authMessage));
          authenticated = true;

          setTimeout(() => {
            // Send malformed message
            client.send('this is not valid JSON');
          }, 500);
        }

        if (message.type === 'error' && message.data?.code === 'INVALID_MESSAGE') {
          expect(message.data.code).toBe('INVALID_MESSAGE');
          done();
        }
      });
    }, 10000);
  });

  describe('Concurrent Connections', () => {
    test('should handle multiple clients in same conversation', (done) => {
      const token1 = generateToken('user1', 'conv_shared');
      const token2 = generateToken('user2', 'conv_shared');

      const client1 = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);
      const client2 = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let client1Ready = false;
      let client2Ready = false;
      let broadcastReceived1 = false;
      let broadcastReceived2 = false;

      const checkCompletion = () => {
        if (broadcastReceived1 && broadcastReceived2) {
          client1.close();
          client2.close();
          done();
        }
      };

      client1.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready' && !client1Ready) {
          client1.send(
            JSON.stringify({
              type: 'auth',
              data: { token: token1 },
              timestamp: new Date().toISOString(),
            })
          );
          client1Ready = true;

          if (client2Ready) {
            // Broadcast test message
            setTimeout(() => {
              server.broadcastToConversation('conv_shared', {
                type: 'emotion.update',
                data: {
                  emotion: {
                    primary: 'excited',
                    intensity: 85,
                    timestamp: new Date().toISOString(),
                  },
                },
                timestamp: new Date().toISOString(),
              });
            }, 1000);
          }
        }

        if (message.type === 'emotion.update') {
          broadcastReceived1 = true;
          checkCompletion();
        }
      });

      client2.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready' && !client2Ready) {
          client2.send(
            JSON.stringify({
              type: 'auth',
              data: { token: token2 },
              timestamp: new Date().toISOString(),
            })
          );
          client2Ready = true;

          if (client1Ready) {
            // Broadcast test message
            setTimeout(() => {
              server.broadcastToConversation('conv_shared', {
                type: 'emotion.update',
                data: {
                  emotion: {
                    primary: 'excited',
                    intensity: 85,
                    timestamp: new Date().toISOString(),
                  },
                },
                timestamp: new Date().toISOString(),
              });
            }, 1000);
          }
        }

        if (message.type === 'emotion.update') {
          broadcastReceived2 = true;
          checkCompletion();
        }
      });
    }, 15000);
  });
});
