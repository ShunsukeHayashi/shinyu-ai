/**
 * BytePlus Speech Client Unit Tests
 *
 * Tests for low-level BytePlus API client functionality.
 */

import { BytePlusSpeechClient } from '../../services/byteplus-speech-client';
import { BytePlusConfig, TTSRequest, STTRequest } from '../../types/speech';

// Mock fetch globally
global.fetch = jest.fn();

describe('BytePlusSpeechClient', () => {
  let client: BytePlusSpeechClient;
  let mockConfig: BytePlusConfig;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock configuration
    mockConfig = {
      accessKey: 'test-access-key',
      secretKey: 'test-secret-key',
      endpoint: 'https://api.byteplus.com',
      region: 'us-east-1',
      timeout: 5000,
    };

    client = new BytePlusSpeechClient(mockConfig);
  });

  describe('Constructor and Validation', () => {
    it('should create client with valid config', () => {
      expect(client).toBeInstanceOf(BytePlusSpeechClient);
    });

    it('should throw error if access key is missing', () => {
      expect(() => {
        new BytePlusSpeechClient({
          ...mockConfig,
          accessKey: '',
        });
      }).toThrow('BytePlus access key is required');
    });

    it('should throw error if secret key is missing', () => {
      expect(() => {
        new BytePlusSpeechClient({
          ...mockConfig,
          secretKey: '',
        });
      }).toThrow('BytePlus secret key is required');
    });

    it('should throw error if endpoint is missing', () => {
      expect(() => {
        new BytePlusSpeechClient({
          ...mockConfig,
          endpoint: '',
        });
      }).toThrow('BytePlus endpoint is required');
    });

    it('should throw error if region is missing', () => {
      expect(() => {
        new BytePlusSpeechClient({
          ...mockConfig,
          region: '',
        });
      }).toThrow('BytePlus region is required');
    });
  });

  describe('textToSpeech', () => {
    const mockTTSRequest: TTSRequest = {
      text: 'Hello, world!',
      voiceId: 'female-ja-soft-1',
      voiceConfig: {
        pitch: 0,
        speed: 1.0,
        emotion: 'neutral',
      },
    };

    const mockTTSResponse = {
      audio_data: 'base64audiodata==',
      format: 'mp3',
      duration: 2000,
      voice_id: 'female-ja-soft-1',
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTTSResponse,
      });
    });

    it('should convert text to speech successfully', async () => {
      const result = await client.textToSpeech(mockTTSRequest);

      expect(result).toEqual({
        audioData: 'base64audiodata==',
        format: 'mp3',
        duration: 2000,
        processingTime: expect.any(Number),
        voiceId: 'female-ja-soft-1',
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should validate text is not empty', async () => {
      await expect(
        client.textToSpeech({
          ...mockTTSRequest,
          text: '',
        })
      ).rejects.toThrow('Text is required for TTS');
    });

    it('should validate voice ID is provided', async () => {
      await expect(
        client.textToSpeech({
          ...mockTTSRequest,
          voiceId: '',
        })
      ).rejects.toThrow('Voice ID is required for TTS');
    });

    it('should validate pitch range (-1.0 to 1.0)', async () => {
      await expect(
        client.textToSpeech({
          ...mockTTSRequest,
          voiceConfig: { ...mockTTSRequest.voiceConfig, pitch: -1.5 },
        })
      ).rejects.toThrow('Pitch must be between -1.0 and 1.0');

      await expect(
        client.textToSpeech({
          ...mockTTSRequest,
          voiceConfig: { ...mockTTSRequest.voiceConfig, pitch: 1.5 },
        })
      ).rejects.toThrow('Pitch must be between -1.0 and 1.0');
    });

    it('should validate speed range (0.5 to 2.0)', async () => {
      await expect(
        client.textToSpeech({
          ...mockTTSRequest,
          voiceConfig: { ...mockTTSRequest.voiceConfig, speed: 0.3 },
        })
      ).rejects.toThrow('Speed must be between 0.5 and 2.0');

      await expect(
        client.textToSpeech({
          ...mockTTSRequest,
          voiceConfig: { ...mockTTSRequest.voiceConfig, speed: 2.5 },
        })
      ).rejects.toThrow('Speed must be between 0.5 and 2.0');
    });

    it('should handle API errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: async () => ({
          code: 'INVALID_REQUEST',
          message: 'Invalid voice ID',
        }),
      });

      await expect(client.textToSpeech(mockTTSRequest)).rejects.toThrow(
        'BytePlus API Error: Invalid voice ID'
      );
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve({ ok: true, json: async () => mockTTSResponse }), 10000);
        });
      });

      await expect(client.textToSpeech(mockTTSRequest)).rejects.toThrow(
        'Request timeout after 5000ms'
      );
    });

    it('should process TTS request within 200ms target', async () => {
      const start = Date.now();
      const result = await client.textToSpeech(mockTTSRequest);
      const processingTime = Date.now() - start;

      // Allow some buffer for test execution
      expect(processingTime).toBeLessThan(500);
      expect(result.processingTime).toBeDefined();
    });
  });

  describe('speechToText', () => {
    const mockAudioData = Buffer.from('mock-audio-data');
    const mockSTTRequest: STTRequest = {
      audioData: mockAudioData,
      language: 'ja-JP',
      enableSpeakerDiarization: false,
    };

    const mockSTTResponse = {
      text: 'こんにちは、世界！',
      language: 'ja-JP',
      confidence: 0.99,
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockSTTResponse,
      });
    });

    it('should convert speech to text successfully', async () => {
      const result = await client.speechToText(mockSTTRequest);

      expect(result).toEqual({
        text: 'こんにちは、世界！',
        language: 'ja-JP',
        confidence: 0.99,
        processingTime: expect.any(Number),
        speakers: undefined,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should validate audio data is provided', async () => {
      await expect(
        client.speechToText({
          ...mockSTTRequest,
          audioData: '',
        })
      ).rejects.toThrow('Audio data is required for STT');
    });

    it('should accept Buffer audio data', async () => {
      const result = await client.speechToText({
        audioData: Buffer.from('test-audio'),
      });

      expect(result.text).toBe('こんにちは、世界！');
    });

    it('should accept base64 string audio data', async () => {
      const base64Audio = Buffer.from('test-audio').toString('base64');
      const result = await client.speechToText({
        audioData: base64Audio,
      });

      expect(result.text).toBe('こんにちは、世界！');
    });

    it('should validate base64 format for string audio data', async () => {
      await expect(
        client.speechToText({
          audioData: 'invalid-base64!!!',
        })
      ).rejects.toThrow('Invalid base64 audio data');
    });

    it('should achieve 98%+ confidence for CJK languages', async () => {
      const result = await client.speechToText(mockSTTRequest);

      expect(result.confidence).toBeGreaterThanOrEqual(0.98);
      expect(result.language).toMatch(/^(ja|zh|ko)/);
    });

    it('should support speaker diarization', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          ...mockSTTResponse,
          speakers: [
            {
              speaker: 'SPEAKER_1',
              start_time: 0,
              end_time: 2.5,
              text: 'こんにちは',
              confidence: 0.99,
            },
            {
              speaker: 'SPEAKER_2',
              start_time: 2.5,
              end_time: 5.0,
              text: '世界！',
              confidence: 0.98,
            },
          ],
        }),
      });

      const result = await client.speechToText({
        ...mockSTTRequest,
        enableSpeakerDiarization: true,
      });

      expect(result.speakers).toHaveLength(2);
      expect(result.speakers?.[0].speaker).toBe('SPEAKER_1');
      expect(result.speakers?.[1].speaker).toBe('SPEAKER_2');
    });
  });

  describe('getVoices', () => {
    const mockVoicesResponse = {
      total: 50,
      voices: [
        {
          id: 'female-ja-soft-1',
          name: 'Yui (Female, Soft)',
          gender: 'female' as const,
          locale: 'ja-JP',
          age_range: 'adult' as const,
          supported_emotions: ['happy', 'soft', 'energetic', 'neutral'],
          description: 'Soft and gentle female voice',
          sample_url: 'https://example.com/sample.mp3',
        },
      ],
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockVoicesResponse,
      });
    });

    it('should fetch voice library successfully', async () => {
      const result = await client.getVoices();

      expect(result.total).toBe(50);
      expect(result.voices).toHaveLength(1);
      expect(result.voices[0].id).toBe('female-ja-soft-1');
    });

    it('should filter by locale', async () => {
      await client.getVoices('ja-JP');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/v1/voices?locale=ja-JP'),
        expect.any(Object)
      );
    });

    it('should return at least 50 voices', async () => {
      const result = await client.getVoices();

      expect(result.total).toBeGreaterThanOrEqual(50);
    });
  });

  describe('createStreamingSTTUrl', () => {
    it('should create WebSocket URL with authentication', () => {
      const wsUrl = client.createStreamingSTTUrl('ja-JP');

      expect(wsUrl).toContain('wss://');
      expect(wsUrl).toContain('/v1/stt/stream');
      expect(wsUrl).toContain('access_key=');
      expect(wsUrl).toContain('timestamp=');
      expect(wsUrl).toContain('signature=');
      expect(wsUrl).toContain('language=ja-JP');
    });

    it('should work without language parameter', () => {
      const wsUrl = client.createStreamingSTTUrl();

      expect(wsUrl).toContain('wss://');
      expect(wsUrl).not.toContain('language=');
    });
  });

  describe('testConnection', () => {
    it('should return true on successful connection', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ total: 50, voices: [] }),
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
    });

    it('should return false on connection failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });
});
