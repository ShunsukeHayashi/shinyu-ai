/**
 * Speech Service Unit Tests
 *
 * Tests for high-level speech service with emotion control, caching, and rate limiting.
 */

import { SpeechService } from '../../services/speech-service';
import { BytePlusSpeechClient } from '../../services/byteplus-speech-client';
import { TTSResponse, STTResponse, VoiceLibraryResponse } from '../../types/speech';

// Mock BytePlusSpeechClient
jest.mock('../../services/byteplus-speech-client');

describe('SpeechService', () => {
  let service: SpeechService;
  let mockClient: jest.Mocked<BytePlusSpeechClient>;

  const mockTTSResponse: TTSResponse = {
    audioData: 'base64audiodata==',
    format: 'mp3',
    duration: 2000,
    processingTime: 150,
    voiceId: 'female-ja-soft-1',
  };

  const mockSTTResponse: STTResponse = {
    text: 'こんにちは、世界！',
    language: 'ja-JP',
    confidence: 0.99,
    processingTime: 100,
  };

  const mockVoicesResponse: VoiceLibraryResponse = {
    total: 50,
    voices: [
      {
        id: 'female-ja-soft-1',
        name: 'Yui (Female, Soft)',
        gender: 'female',
        locale: 'ja-JP',
        ageRange: 'adult',
        supportedEmotions: ['happy', 'soft', 'energetic', 'neutral'],
        description: 'Soft and gentle female voice',
        sampleUrl: 'https://example.com/sample.mp3',
      },
      {
        id: 'male-ja-energetic-1',
        name: 'Takeshi (Male, Energetic)',
        gender: 'male',
        locale: 'ja-JP',
        ageRange: 'adult',
        supportedEmotions: ['energetic', 'neutral'],
        description: 'Energetic male voice',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock client
    mockClient = {
      textToSpeech: jest.fn().mockResolvedValue(mockTTSResponse),
      speechToText: jest.fn().mockResolvedValue(mockSTTResponse),
      getVoices: jest.fn().mockResolvedValue(mockVoicesResponse),
      createStreamingSTTUrl: jest.fn().mockReturnValue('wss://example.com/stream'),
      testConnection: jest.fn().mockResolvedValue(true),
      getUsageStats: jest.fn().mockResolvedValue({
        ttsRequests: 100,
        sttRequests: 50,
        totalDuration: 10000,
        lastResetDate: '2025-01-01',
      }),
    } as any;

    // Create service with mock client
    service = new SpeechService(mockClient, {
      enableCache: true,
      cacheTTL: 60000, // 1 minute for testing
      enableRateLimit: false, // Disable for most tests
    });
  });

  describe('Text-to-Speech', () => {
    it('should convert text to speech with default options', async () => {
      const result = await service.textToSpeech('Hello, world!');

      expect(result).toEqual(mockTTSResponse);
      expect(mockClient.textToSpeech).toHaveBeenCalledWith({
        text: 'Hello, world!',
        voiceId: 'female-ja-soft-1',
        voiceConfig: {
          pitch: 0,
          speed: 1.0,
          emotion: 'neutral',
        },
      });
    });

    it('should support custom voice ID', async () => {
      await service.textToSpeech('Hello', { voiceId: 'male-en-1' });

      expect(mockClient.textToSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceId: 'male-en-1',
        })
      );
    });

    it('should support emotion control', async () => {
      await service.textToSpeech('Hello', { emotion: 'happy' });

      expect(mockClient.textToSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceConfig: expect.objectContaining({
            emotion: 'happy',
          }),
        })
      );
    });

    it('should support pitch adjustment', async () => {
      await service.textToSpeech('Hello', { pitch: 0.5 });

      expect(mockClient.textToSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceConfig: expect.objectContaining({
            pitch: 0.5,
          }),
        })
      );
    });

    it('should support speed adjustment', async () => {
      await service.textToSpeech('Hello', { speed: 1.5 });

      expect(mockClient.textToSpeech).toHaveBeenCalledWith(
        expect.objectContaining({
          voiceConfig: expect.objectContaining({
            speed: 1.5,
          }),
        })
      );
    });

    it('should cache TTS responses', async () => {
      // First request
      await service.textToSpeech('Hello', { emotion: 'happy' });

      // Second request (should use cache)
      await service.textToSpeech('Hello', { emotion: 'happy' });

      // Client should only be called once
      expect(mockClient.textToSpeech).toHaveBeenCalledTimes(1);
    });

    it('should not cache different requests', async () => {
      await service.textToSpeech('Hello', { emotion: 'happy' });
      await service.textToSpeech('Hello', { emotion: 'soft' });

      // Different emotions = different cache keys
      expect(mockClient.textToSpeech).toHaveBeenCalledTimes(2);
    });

    it('should warn if processing time exceeds 200ms', async () => {
      const slowResponse = { ...mockTTSResponse, processingTime: 250 };
      mockClient.textToSpeech.mockResolvedValue(slowResponse);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.textToSpeech('Hello');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TTS processing time (250ms) exceeded target (<200ms)')
      );

      consoleSpy.mockRestore();
    });

    it('should support all emotion types', async () => {
      const emotions = ['happy', 'soft', 'energetic', 'neutral'] as const;

      for (const emotion of emotions) {
        await service.textToSpeech('Test', { emotion });

        expect(mockClient.textToSpeech).toHaveBeenCalledWith(
          expect.objectContaining({
            voiceConfig: expect.objectContaining({ emotion }),
          })
        );
      }
    });
  });

  describe('Speech-to-Text', () => {
    it('should convert speech to text', async () => {
      const audioData = Buffer.from('mock-audio');
      const result = await service.speechToText(audioData);

      expect(result).toEqual(mockSTTResponse);
      expect(mockClient.speechToText).toHaveBeenCalledWith({
        audioData,
        language: undefined,
        enableSpeakerDiarization: undefined,
      });
    });

    it('should support language specification', async () => {
      const audioData = Buffer.from('mock-audio');
      await service.speechToText(audioData, { language: 'en-US' });

      expect(mockClient.speechToText).toHaveBeenCalledWith({
        audioData,
        language: 'en-US',
        enableSpeakerDiarization: undefined,
      });
    });

    it('should support speaker diarization', async () => {
      const audioData = Buffer.from('mock-audio');
      await service.speechToText(audioData, { enableSpeakerDiarization: true });

      expect(mockClient.speechToText).toHaveBeenCalledWith({
        audioData,
        language: undefined,
        enableSpeakerDiarization: true,
      });
    });

    it('should warn if CJK confidence is below 98%', async () => {
      const lowConfidenceResponse = { ...mockSTTResponse, confidence: 0.95 };
      mockClient.speechToText.mockResolvedValue(lowConfidenceResponse);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.speechToText(Buffer.from('audio'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('STT confidence (0.95) below target (0.98+) for CJK language')
      );

      consoleSpy.mockRestore();
    });

    it('should not warn for non-CJK languages with lower confidence', async () => {
      const englishResponse = { ...mockSTTResponse, language: 'en-US', confidence: 0.95 };
      mockClient.speechToText.mockResolvedValue(englishResponse);

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.speechToText(Buffer.from('audio'));

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Voice Library', () => {
    it('should fetch available voices', async () => {
      const result = await service.getVoices();

      expect(result).toEqual(mockVoicesResponse);
      expect(mockClient.getVoices).toHaveBeenCalledWith(undefined);
    });

    it('should filter by locale', async () => {
      await service.getVoices({ locale: 'ja-JP' });

      expect(mockClient.getVoices).toHaveBeenCalledWith('ja-JP');
    });

    it('should filter by gender', async () => {
      const result = await service.getVoices({ gender: 'female' });

      expect(result.voices).toHaveLength(1);
      expect(result.voices[0].gender).toBe('female');
    });

    it('should filter by emotion', async () => {
      const result = await service.getVoices({ emotion: 'soft' });

      expect(result.voices).toHaveLength(1);
      expect(result.voices[0].id).toBe('female-ja-soft-1');
    });

    it('should cache voice library', async () => {
      await service.getVoices();
      await service.getVoices();

      // Should only call API once
      expect(mockClient.getVoices).toHaveBeenCalledTimes(1);
    });
  });

  describe('Recommended Voice', () => {
    it('should recommend voice based on emotion', async () => {
      const voice = await service.getRecommendedVoice('soft', 'ja-JP');

      expect(voice).toBeDefined();
      expect(voice?.id).toBe('female-ja-soft-1');
      expect(voice?.supportedEmotions).toContain('soft');
    });

    it('should prioritize adult female voices', async () => {
      const voice = await service.getRecommendedVoice('neutral', 'ja-JP');

      expect(voice?.gender).toBe('female');
      expect(voice?.ageRange).toBe('adult');
    });

    it('should return null if no matching voices', async () => {
      mockClient.getVoices.mockResolvedValue({ total: 0, voices: [] });

      const voice = await service.getRecommendedVoice('happy', 'ja-JP');

      expect(voice).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      service = new SpeechService(mockClient, {
        enableRateLimit: true,
        maxRequestsPerMinute: 5,
      });
    });

    it('should enforce rate limit', async () => {
      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        await service.textToSpeech('Test');
      }

      // 6th request should trigger rate limit warning
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.textToSpeech('Test');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rate limit reached')
      );

      consoleSpy.mockRestore();
    }, 10000);
  });

  describe('Cache Management', () => {
    it('should clear cache', () => {
      service.clearCache();

      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should provide cache statistics', async () => {
      await service.textToSpeech('Hello');

      const stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('Streaming STT', () => {
    it('should create streaming STT URL', () => {
      const url = service.createStreamingSTTUrl('ja-JP');

      expect(url).toBe('wss://example.com/stream');
      expect(mockClient.createStreamingSTTUrl).toHaveBeenCalledWith('ja-JP');
    });
  });

  describe('Connection Testing', () => {
    it('should test API connection', async () => {
      const result = await service.testConnection();

      expect(result).toBe(true);
      expect(mockClient.testConnection).toHaveBeenCalled();
    });
  });

  describe('Usage Statistics', () => {
    it('should get usage statistics', async () => {
      const stats = await service.getUsageStats();

      expect(stats).toEqual({
        ttsRequests: 100,
        sttRequests: 50,
        totalDuration: 10000,
        lastResetDate: '2025-01-01',
      });
    });
  });
});
