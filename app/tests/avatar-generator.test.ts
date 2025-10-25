/**
 * Avatar Generator Service Tests
 *
 * Comprehensive test suite for avatar generation functionality.
 * Includes unit tests for services, API client, and error handling.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AvatarGenerator, getAvatarGenerator, resetAvatarGenerator } from '../src/services/avatar-generator';
import { BytePlusVideoClient } from '../src/services/byteplus-video-client';
import {
  AvatarGenerationError,
  AvatarErrorCode,
  AvatarJobStatus,
  EmotionalState,
} from '../src/types/avatar';

// Mock fetch globally
global.fetch = vi.fn();

describe('AvatarGenerator', () => {
  let generator: AvatarGenerator;

  beforeEach(() => {
    vi.clearAllMocks();
    resetAvatarGenerator();
    // Set API key for tests
    process.env.BYTEPLUS_VIDEO_API_KEY = 'test-api-key';
    generator = new AvatarGenerator('test-api-key');
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.BYTEPLUS_VIDEO_API_KEY;
  });

  describe('Constructor', () => {
    it('should create instance with API key', () => {
      expect(generator).toBeInstanceOf(AvatarGenerator);
      expect(generator.getStats()).toBeDefined();
    });

    it('should throw error without API key', () => {
      delete process.env.BYTEPLUS_VIDEO_API_KEY;
      expect(() => new AvatarGenerator()).toThrow(AvatarGenerationError);
    });
  });

  describe('Companion Management', () => {
    it('should list default companions', () => {
      const companions = generator.listCompanions();
      expect(companions.length).toBeGreaterThan(0);
      expect(companions[0]).toHaveProperty('id');
      expect(companions[0]).toHaveProperty('name');
      expect(companions[0]).toHaveProperty('avatarModelId');
    });

    it('should get companion by ID', () => {
      const companion = generator.getCompanion('companion-001');
      expect(companion.id).toBe('companion-001');
      expect(companion.name).toBe('Aiko');
    });

    it('should throw error for invalid companion', () => {
      expect(() => generator.getCompanion('invalid-id')).toThrow(AvatarGenerationError);
      expect(() => generator.getCompanion('invalid-id')).toThrow(/not found/);
    });

    it('should add new companion', () => {
      const newCompanion = {
        id: 'companion-test',
        name: 'Test',
        avatarModelId: 'test-model',
        defaultVoice: {
          voiceId: 'voice-test',
          speed: 1.0,
          pitch: 0,
          volume: 1.0,
        },
        emotionMapping: {
          happiness: { intensity: 0.8 },
          excitement: { intensity: 0.9 },
          affection: { intensity: 0.7 },
          curiosity: { intensity: 0.6 },
        },
      };

      generator.addCompanion(newCompanion);
      const retrieved = generator.getCompanion('companion-test');
      expect(retrieved.id).toBe('companion-test');
      expect(retrieved.name).toBe('Test');
    });
  });

  describe('Avatar Generation', () => {
    beforeEach(() => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          job_id: 'job-123',
          status: 'processing',
          created_at: new Date().toISOString(),
          lip_sync_quality: 0,
        }),
      });
    });

    it('should generate avatar with valid params', async () => {
      const response = await generator.generate({
        companionId: 'companion-001',
        text: 'Hello world!',
        emotion: 'happiness',
        duration: 10,
        format: 'both',
      });

      expect(response.jobId).toBe('job-123');
      expect(response.status).toBe('processing');
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should apply companion default voice settings', async () => {
      await generator.generate({
        companionId: 'companion-001',
        text: 'Hello world!',
        emotion: 'happiness',
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.voice_params).toBeDefined();
      expect(requestBody.voice_params.speed).toBe(1.0);
      expect(requestBody.companion_id).toBe('companion-001');
    });

    it('should override voice params when provided', async () => {
      await generator.generate({
        companionId: 'companion-001',
        text: 'Hello world!',
        emotion: 'happiness',
        customVoiceParams: {
          speed: 1.5,
          pitch: 5,
          volume: 0.8,
        },
      });

      const fetchCall = (global.fetch as any).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.voice_params.speed).toBe(1.5);
      expect(requestBody.voice_params.pitch).toBe(5);
      expect(requestBody.voice_params.volume).toBe(0.8);
    });

    it('should track active jobs', async () => {
      await generator.generate({
        companionId: 'companion-001',
        text: 'Hello world!',
        emotion: 'happiness',
      });

      const activeJobs = generator.getActiveJobs();
      expect(activeJobs.length).toBe(1);
      expect(activeJobs[0].jobId).toBe('job-123');
      expect(activeJobs[0].companionId).toBe('companion-001');
    });

    it('should handle all emotion types', async () => {
      const emotions: EmotionalState[] = ['happiness', 'excitement', 'affection', 'curiosity'];

      for (const emotion of emotions) {
        await generator.generate({
          companionId: 'companion-001',
          text: `Testing ${emotion}`,
          emotion,
        });
      }

      expect(fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Batch Generation', () => {
    beforeEach(() => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          job_id: `job-${Math.random()}`,
          status: 'processing',
          created_at: new Date().toISOString(),
          lip_sync_quality: 0,
        }),
      });
    });

    it('should generate batch avatars', async () => {
      const requests = [
        { companionId: 'companion-001', text: 'Hello!', emotion: 'happiness' as EmotionalState },
        { companionId: 'companion-001', text: 'Goodbye!', emotion: 'affection' as EmotionalState },
        { companionId: 'companion-002', text: 'Wow!', emotion: 'excitement' as EmotionalState },
      ];

      const responses = await generator.generateBatch(requests, 2);

      expect(responses.length).toBe(3);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should respect concurrency limit', async () => {
      const requests = Array(5).fill(null).map((_, i) => ({
        companionId: 'companion-001',
        text: `Message ${i}`,
        emotion: 'happiness' as EmotionalState,
      }));

      await generator.generateBatch(requests, 2);

      // With concurrency 2, should process in 3 batches (2+2+1)
      expect(fetch).toHaveBeenCalledTimes(5);
    });

    it('should handle partial failures in batch', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job_id: `job-${callCount}`,
            status: 'processing',
            created_at: new Date().toISOString(),
            lip_sync_quality: 0,
          }),
        });
      });

      const requests = [
        { companionId: 'companion-001', text: 'Hello!', emotion: 'happiness' as EmotionalState },
        { companionId: 'companion-001', text: 'Goodbye!', emotion: 'affection' as EmotionalState },
        { companionId: 'companion-002', text: 'Wow!', emotion: 'excitement' as EmotionalState },
      ];

      const responses = await generator.generateBatch(requests);

      // Should return 2 successful responses (skipping the failed one)
      expect(responses.length).toBe(2);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            job_id: 'job-1',
            status: 'processing',
            created_at: new Date().toISOString(),
            lip_sync_quality: 0,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            job_id: 'job-1',
            status: 'completed',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            video_url: 'https://example.com/video.mp4',
            audio_url: 'https://example.com/audio.mp3',
            lip_sync_quality: 95,
          }),
        });
    });

    it('should track generation statistics', async () => {
      const initialStats = generator.getStats();
      expect(initialStats.totalGenerated).toBe(0);
      expect(initialStats.successRate).toBe(100);

      await generator.generateAndWait({
        companionId: 'companion-001',
        text: 'Hello!',
        emotion: 'happiness',
      });

      const updatedStats = generator.getStats();
      expect(updatedStats.totalGenerated).toBe(1);
      expect(updatedStats.averageLipSyncQuality).toBe(95);
      expect(updatedStats.successRate).toBe(100);
    });

    it('should reset statistics', () => {
      generator.resetStats();
      const stats = generator.getStats();

      expect(stats.totalGenerated).toBe(0);
      expect(stats.averageGenerationTime).toBe(0);
      expect(stats.averageLipSyncQuality).toBe(0);
      expect(stats.successRate).toBe(100);
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ message: 'Server error' }),
      });

      await expect(
        generator.generate({
          companionId: 'companion-001',
          text: 'Hello!',
          emotion: 'happiness',
        })
      ).rejects.toThrow(AvatarGenerationError);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(
        generator.generate({
          companionId: 'companion-001',
          text: 'Hello!',
          emotion: 'happiness',
        })
      ).rejects.toThrow();
    });

    it('should handle rate limit errors', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ message: 'Rate limit exceeded' }),
      });

      await expect(
        generator.generate({
          companionId: 'companion-001',
          text: 'Hello!',
          emotion: 'happiness',
        })
      ).rejects.toThrow(AvatarGenerationError);
    });

    it('should update error statistics', async () => {
      (global.fetch as any).mockRejectedValue(new Error('API Error'));

      const initialStats = generator.getStats();
      expect(initialStats.totalErrors).toBe(0);

      try {
        await generator.generate({
          companionId: 'companion-001',
          text: 'Hello!',
          emotion: 'happiness',
        });
      } catch {
        // Expected error
      }

      const updatedStats = generator.getStats();
      expect(updatedStats.totalErrors).toBe(1);
      expect(updatedStats.successRate).toBeLessThan(100);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance from getAvatarGenerator', () => {
      const instance1 = getAvatarGenerator('test-key-1');
      const instance2 = getAvatarGenerator('test-key-2');

      expect(instance1).toBe(instance2);
    });

    it('should reset singleton instance', () => {
      const instance1 = getAvatarGenerator('test-key-1');
      resetAvatarGenerator();
      const instance2 = getAvatarGenerator('test-key-2');

      expect(instance1).not.toBe(instance2);
    });
  });
});

describe('BytePlusVideoClient', () => {
  let client: BytePlusVideoClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new BytePlusVideoClient({ apiKey: 'test-api-key' });
  });

  describe('Request Validation', () => {
    it('should validate companionId', async () => {
      (global.fetch as any).mockResolvedValue({ ok: true, json: async () => ({}) });

      await expect(
        client.generateAvatar({
          companionId: '',
          text: 'Hello',
          emotion: 'happiness',
          duration: 10,
          format: 'video',
        })
      ).rejects.toThrow(/companionId is required/);
    });

    it('should validate text', async () => {
      await expect(
        client.generateAvatar({
          companionId: 'companion-001',
          text: '',
          emotion: 'happiness',
          duration: 10,
          format: 'video',
        })
      ).rejects.toThrow(/text is required/);
    });

    it('should validate duration range', async () => {
      await expect(
        client.generateAvatar({
          companionId: 'companion-001',
          text: 'Hello',
          emotion: 'happiness',
          duration: 0,
          format: 'video',
        })
      ).rejects.toThrow(/duration must be between/);

      await expect(
        client.generateAvatar({
          companionId: 'companion-001',
          text: 'Hello',
          emotion: 'happiness',
          duration: 100,
          format: 'video',
        })
      ).rejects.toThrow(/duration must be between/);
    });

    it('should validate emotion', async () => {
      await expect(
        client.generateAvatar({
          companionId: 'companion-001',
          text: 'Hello',
          emotion: 'invalid' as any,
          duration: 10,
          format: 'video',
        })
      ).rejects.toThrow(/emotion must be one of/);
    });

    it('should validate voice parameters', async () => {
      await expect(
        client.generateAvatar({
          companionId: 'companion-001',
          text: 'Hello',
          emotion: 'happiness',
          duration: 10,
          format: 'video',
          voiceParams: { speed: 3.0 },
        })
      ).rejects.toThrow(/voice speed/);

      await expect(
        client.generateAvatar({
          companionId: 'companion-001',
          text: 'Hello',
          emotion: 'happiness',
          duration: 10,
          format: 'video',
          voiceParams: { pitch: 20 },
        })
      ).rejects.toThrow(/voice pitch/);

      await expect(
        client.generateAvatar({
          companionId: 'companion-001',
          text: 'Hello',
          emotion: 'happiness',
          duration: 10,
          format: 'video',
          voiceParams: { volume: 2.0 },
        })
      ).rejects.toThrow(/voice volume/);
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 5xx errors', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: async () => ({ message: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job_id: 'job-123',
            status: 'processing',
            created_at: new Date().toISOString(),
          }),
        });
      });

      const response = await client.generateAvatar({
        companionId: 'companion-001',
        text: 'Hello',
        emotion: 'happiness',
        duration: 10,
        format: 'video',
      });

      expect(response.jobId).toBe('job-123');
      expect(callCount).toBe(3);
    });

    it('should retry on rate limit (429)', async () => {
      let callCount = 0;
      (global.fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: async () => ({ message: 'Rate limit' }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({
            job_id: 'job-123',
            status: 'processing',
            created_at: new Date().toISOString(),
          }),
        });
      });

      const response = await client.generateAvatar({
        companionId: 'companion-001',
        text: 'Hello',
        emotion: 'happiness',
        duration: 10,
        format: 'video',
      });

      expect(response.jobId).toBe('job-123');
      expect(callCount).toBe(2);
    });
  });
});
