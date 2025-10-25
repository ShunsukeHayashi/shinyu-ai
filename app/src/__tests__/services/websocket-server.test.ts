/**
 * Unit Tests for WebSocket Server
 * AI Girlfriend Platform - Real-time Communication
 */

import WebSocket from 'ws';
import { ConversationWebSocketServer } from '../../services/websocket-server';
import { generateToken } from '../../lib/jwt-auth';
import {
  WSMessage,
  AuthEventData,
  SendMessageEventData,
  WSServerConfig,
} from '../../types/websocket';

describe('ConversationWebSocketServer', () => {
  let server: ConversationWebSocketServer;
  let client: WebSocket;
  const TEST_PORT = 3002;
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
  });

  afterAll(async () => {
    await server.shutdown();
  });

  afterEach(() => {
    if (client && client.readyState === WebSocket.OPEN) {
      client.close();
    }
  });

  describe('Connection Handling', () => {
    test('should accept new connection', (done) => {
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      client.on('open', () => {
        expect(client.readyState).toBe(WebSocket.OPEN);
        done();
      });
    });

    test('should send connection.ready message on connect', (done) => {
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      client.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;
        if (message.type === 'connection.ready') {
          expect(message.type).toBe('connection.ready');
          expect(message.timestamp).toBeDefined();
          done();
        }
      });
    });

    test('should reject connection when server is full', async () => {
      const smallServerConfig: WSServerConfig = {
        ...config,
        port: TEST_PORT + 1,
        maxConnections: 1,
      };

      const smallServer = new ConversationWebSocketServer(smallServerConfig);

      // Create first connection
      const client1 = new WebSocket(`ws://localhost:${TEST_PORT + 1}${TEST_PATH}`);
      await new Promise((resolve) => client1.on('open', resolve));

      // Try second connection
      const client2 = new WebSocket(`ws://localhost:${TEST_PORT + 1}${TEST_PATH}`);

      await new Promise<void>((resolve) => {
        client2.on('message', (data: Buffer) => {
          const message = JSON.parse(data.toString()) as WSMessage;
          if (message.type === 'error') {
            expect(message.data?.code).toBe('SERVER_FULL');
            resolve();
          }
        });
      });

      client1.close();
      client2.close();
      await smallServer.shutdown();
    });
  });

  describe('Authentication', () => {
    test('should authenticate with valid token', (done) => {
      const token = generateToken('user123', 'conv123');
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let authenticated = false;

      client.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready' && !authenticated) {
          // Send auth message
          const authMessage: WSMessage<AuthEventData> = {
            type: 'auth',
            data: { token },
            timestamp: new Date().toISOString(),
          };
          client.send(JSON.stringify(authMessage));
          authenticated = true;
        }
      });

      // Wait for successful auth (no error message)
      setTimeout(() => {
        expect(client.readyState).toBe(WebSocket.OPEN);
        done();
      }, 1000);
    });

    test('should reject invalid token', (done) => {
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let readyReceived = false;

      client.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready' && !readyReceived) {
          readyReceived = true;
          // Send invalid token
          const authMessage: WSMessage<AuthEventData> = {
            type: 'auth',
            data: { token: 'invalid-token' },
            timestamp: new Date().toISOString(),
          };
          client.send(JSON.stringify(authMessage));
        }

        if (message.type === 'error' && message.data?.code === 'AUTH_FAILED') {
          expect(message.data.code).toBe('AUTH_FAILED');
          done();
        }
      });

      client.on('close', () => {
        done();
      });
    });

    test('should timeout unauthenticated connection', (done) => {
      const quickTimeoutConfig: WSServerConfig = {
        ...config,
        port: TEST_PORT + 2,
        authTimeout: 1000,
      };

      const quickServer = new ConversationWebSocketServer(quickTimeoutConfig);
      const testClient = new WebSocket(`ws://localhost:${TEST_PORT + 2}${TEST_PATH}`);

      testClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;
        if (message.type === 'error' && message.data?.code === 'AUTH_TIMEOUT') {
          expect(message.data.code).toBe('AUTH_TIMEOUT');
        }
      });

      testClient.on('close', async () => {
        await quickServer.shutdown();
        done();
      });
    }, 10000);
  });

  describe('Message Handling', () => {
    let authenticatedClient: WebSocket;
    let token: string;

    beforeEach((done) => {
      token = generateToken('user123', 'conv123');
      authenticatedClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      authenticatedClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready') {
          const authMessage: WSMessage<AuthEventData> = {
            type: 'auth',
            data: { token },
            timestamp: new Date().toISOString(),
          };
          authenticatedClient.send(JSON.stringify(authMessage));
          setTimeout(done, 500);
        }
      });
    });

    afterEach(() => {
      if (authenticatedClient.readyState === WebSocket.OPEN) {
        authenticatedClient.close();
      }
    });

    test('should handle message.send event', (done) => {
      const messageData: SendMessageEventData = {
        content: 'Hello AI girlfriend!',
      };

      const sendMessage: WSMessage<SendMessageEventData> = {
        type: 'message.send',
        data: messageData,
        timestamp: new Date().toISOString(),
      };

      let receivedTyping = false;
      let receivedChunks = 0;
      let receivedComplete = false;

      authenticatedClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'typing.start') {
          receivedTyping = true;
        }

        if (message.type === 'message.chunk') {
          receivedChunks++;
        }

        if (message.type === 'message.complete') {
          receivedComplete = true;
          expect(receivedTyping).toBe(true);
          expect(receivedChunks).toBeGreaterThan(0);
          expect(receivedComplete).toBe(true);
          done();
        }
      });

      authenticatedClient.send(JSON.stringify(sendMessage));
    }, 10000);

    test('should handle ping/pong', (done) => {
      const pingMessage: WSMessage = {
        type: 'ping',
        timestamp: new Date().toISOString(),
      };

      authenticatedClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'pong') {
          expect(message.type).toBe('pong');
          done();
        }
      });

      authenticatedClient.send(JSON.stringify(pingMessage));
    });

    test('should reject message from unauthenticated client', (done) => {
      const unauthClient = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      unauthClient.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready') {
          // Send message without auth
          const sendMessage: WSMessage<SendMessageEventData> = {
            type: 'message.send',
            data: { content: 'Hello' },
            timestamp: new Date().toISOString(),
          };
          unauthClient.send(JSON.stringify(sendMessage));
        }

        if (message.type === 'error' && message.data?.code === 'NOT_AUTHENTICATED') {
          expect(message.data.code).toBe('NOT_AUTHENTICATED');
          unauthClient.close();
          done();
        }
      });
    });
  });

  describe('Heartbeat', () => {
    test('should maintain connection with heartbeat', (done) => {
      client = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let pongCount = 0;

      client.on('ping', () => {
        pongCount++;
      });

      // Wait for multiple heartbeats
      setTimeout(() => {
        expect(pongCount).toBeGreaterThan(0);
        done();
      }, 6000);
    }, 10000);
  });

  describe('Server Management', () => {
    test('should get connections count', () => {
      const count = server.getConnectionsCount();
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should get conversation connections', () => {
      const connections = server.getConversationConnections('conv123');
      expect(Array.isArray(connections)).toBe(true);
    });

    test('should broadcast to conversation', (done) => {
      const token1 = generateToken('user1', 'conv456');
      const token2 = generateToken('user2', 'conv456');

      const client1 = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);
      const client2 = new WebSocket(`ws://localhost:${TEST_PORT}${TEST_PATH}`);

      let client1Ready = false;
      let client2Ready = false;
      let broadcastReceived = false;

      const checkReady = () => {
        if (client1Ready && client2Ready && !broadcastReceived) {
          broadcastReceived = true;
          // Broadcast test message
          server.broadcastToConversation('conv456', {
            type: 'emotion.update',
            data: {
              emotion: {
                primary: 'happy',
                intensity: 80,
                timestamp: new Date().toISOString(),
              },
            },
            timestamp: new Date().toISOString(),
          });
        }
      };

      client1.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready') {
          client1.send(
            JSON.stringify({
              type: 'auth',
              data: { token: token1 },
              timestamp: new Date().toISOString(),
            })
          );
          setTimeout(() => {
            client1Ready = true;
            checkReady();
          }, 500);
        }

        if (message.type === 'emotion.update') {
          expect(message.data?.emotion.primary).toBe('happy');
          client1.close();
        }
      });

      client2.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString()) as WSMessage;

        if (message.type === 'connection.ready') {
          client2.send(
            JSON.stringify({
              type: 'auth',
              data: { token: token2 },
              timestamp: new Date().toISOString(),
            })
          );
          setTimeout(() => {
            client2Ready = true;
            checkReady();
          }, 500);
        }

        if (message.type === 'emotion.update') {
          expect(message.data?.emotion.primary).toBe('happy');
          client2.close();
          done();
        }
      });
    }, 10000);
  });
});
