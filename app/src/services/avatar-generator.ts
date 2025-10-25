/**
 * Avatar Generator Service
 *
 * High-level service for managing avatar generation.
 * Provides companion-aware avatar generation with emotion support.
 *
 * @module avatar-generator
 */

import {
  AvatarGenerationRequest,
  AvatarGenerationResponse,
  AvatarJobMetadata,
  EmotionalState,
  AvatarOutputFormat,
  CompanionAvatarConfig,
  AvatarGenerationError,
  AvatarErrorCode,
} from '../types/avatar';
import { BytePlusVideoClient, createBytePlusVideoClient } from './byteplus-video-client';

/**
 * Default companion configurations
 * In a production environment, these would be loaded from a database
 */
const DEFAULT_COMPANIONS: Record<string, CompanionAvatarConfig> = {
  'companion-001': {
    id: 'companion-001',
    name: 'Aiko',
    avatarModelId: 'aiko-model-v1',
    defaultVoice: {
      voiceId: 'voice-female-jp-001',
      speed: 1.0,
      pitch: 0,
      volume: 1.0,
    },
    emotionMapping: {
      happiness: { intensity: 0.8, params: { smile: 0.9, eyeBrightness: 1.0 } },
      excitement: { intensity: 0.9, params: { smile: 1.0, eyeBrightness: 1.0, energy: 0.9 } },
      affection: { intensity: 0.7, params: { smile: 0.7, eyeSoftness: 0.8 } },
      curiosity: { intensity: 0.6, params: { eyeBrightness: 0.8, headTilt: 0.3 } },
    },
  },
  'companion-002': {
    id: 'companion-002',
    name: 'Yuki',
    avatarModelId: 'yuki-model-v1',
    defaultVoice: {
      voiceId: 'voice-female-jp-002',
      speed: 0.95,
      pitch: 2,
      volume: 0.95,
    },
    emotionMapping: {
      happiness: { intensity: 0.9, params: { smile: 1.0, eyeBrightness: 1.0 } },
      excitement: { intensity: 1.0, params: { smile: 1.0, eyeBrightness: 1.0, energy: 1.0 } },
      affection: { intensity: 0.8, params: { smile: 0.8, eyeSoftness: 0.9, blush: 0.5 } },
      curiosity: { intensity: 0.7, params: { eyeBrightness: 0.9, headTilt: 0.4 } },
    },
  },
};

/**
 * Avatar generation statistics
 */
export interface AvatarGenerationStats {
  /** Total number of avatars generated */
  totalGenerated: number;

  /** Average generation time in milliseconds */
  averageGenerationTime: number;

  /** Average lip-sync quality score */
  averageLipSyncQuality: number;

  /** Success rate percentage */
  successRate: number;

  /** Total errors encountered */
  totalErrors: number;
}

/**
 * Avatar Generator Service
 *
 * Main service for avatar generation operations.
 * Handles companion configuration, emotion mapping, and generation tracking.
 */
export class AvatarGenerator {
  private client: BytePlusVideoClient;
  private companions: Map<string, CompanionAvatarConfig>;
  private stats: AvatarGenerationStats;
  private activeJobs: Map<string, AvatarJobMetadata>;

  /**
   * Create a new Avatar Generator
   *
   * @param apiKey - BytePlus Video API key (optional)
   */
  constructor(apiKey?: string) {
    this.client = createBytePlusVideoClient(apiKey);
    this.companions = new Map(Object.entries(DEFAULT_COMPANIONS));
    this.stats = {
      totalGenerated: 0,
      averageGenerationTime: 0,
      averageLipSyncQuality: 0,
      successRate: 100,
      totalErrors: 0,
    };
    this.activeJobs = new Map();
  }

  /**
   * Generate avatar video
   *
   * Creates an avatar video with the specified parameters.
   * Automatically applies companion-specific voice and emotion settings.
   *
   * @param params - Generation parameters
   * @returns Generation response with job ID
   *
   * @example
   * ```typescript
   * const generator = new AvatarGenerator();
   * const response = await generator.generate({
   *   companionId: 'companion-001',
   *   text: 'Hello! How are you today?',
   *   emotion: 'happiness',
   *   duration: 10,
   *   format: 'both'
   * });
   * console.log(`Job created: ${response.jobId}`);
   * ```
   */
  async generate(params: {
    companionId: string;
    text: string;
    emotion: EmotionalState;
    duration?: number;
    format?: AvatarOutputFormat;
    customVoiceParams?: AvatarGenerationRequest['voiceParams'];
  }): Promise<AvatarGenerationResponse> {
    const companion = this.getCompanion(params.companionId);

    // Prepare request with companion-specific settings
    const request: AvatarGenerationRequest = {
      companionId: params.companionId,
      text: params.text,
      emotion: params.emotion,
      duration: params.duration || 10, // Default 10 seconds
      format: params.format || 'both',
      voiceParams: params.customVoiceParams || {
        speed: companion.defaultVoice.speed,
        pitch: companion.defaultVoice.pitch,
        volume: companion.defaultVoice.volume,
      },
    };

    try {
      const response = await this.client.generateAvatar(request);

      // Track active job
      const metadata: AvatarJobMetadata = {
        jobId: response.jobId,
        companionId: params.companionId,
        request,
        status: response.status,
        progress: 0,
        createdAt: response.createdAt,
        updatedAt: new Date(),
      };
      this.activeJobs.set(response.jobId, metadata);

      return response;
    } catch (error) {
      this.updateErrorStats();
      throw error;
    }
  }

  /**
   * Generate and wait for completion
   *
   * Convenience method that generates an avatar and waits for it to complete.
   * Polls the API until the generation is finished.
   *
   * @param params - Generation parameters (same as generate())
   * @param maxWaitTime - Maximum wait time in milliseconds (default: 60000)
   * @returns Completed generation response with URLs
   *
   * @example
   * ```typescript
   * const generator = new AvatarGenerator();
   * const result = await generator.generateAndWait({
   *   companionId: 'companion-001',
   *   text: 'I love spending time with you!',
   *   emotion: 'affection',
   * });
   * console.log(`Video URL: ${result.videoUrl}`);
   * console.log(`Lip-sync quality: ${result.lipSyncQuality}%`);
   * ```
   */
  async generateAndWait(
    params: Parameters<typeof this.generate>[0],
    maxWaitTime: number = 60000
  ): Promise<AvatarGenerationResponse> {
    const initialResponse = await this.generate(params);

    try {
      const finalResponse = await this.client.waitForCompletion(
        initialResponse.jobId,
        maxWaitTime
      );

      this.updateSuccessStats(finalResponse);
      this.activeJobs.delete(initialResponse.jobId);

      return finalResponse;
    } catch (error) {
      this.updateErrorStats();
      this.activeJobs.delete(initialResponse.jobId);
      throw error;
    }
  }

  /**
   * Get job status
   *
   * Retrieves the current status of an avatar generation job.
   *
   * @param jobId - Job identifier
   * @returns Job metadata
   */
  async getJobStatus(jobId: string): Promise<AvatarJobMetadata> {
    const metadata = await this.client.getJobStatus(jobId);
    this.activeJobs.set(jobId, metadata);
    return metadata;
  }

  /**
   * Get active jobs
   *
   * Returns all currently active generation jobs.
   *
   * @returns Array of active job metadata
   */
  getActiveJobs(): AvatarJobMetadata[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Add companion configuration
   *
   * Registers a new companion for avatar generation.
   *
   * @param config - Companion configuration
   */
  addCompanion(config: CompanionAvatarConfig): void {
    this.companions.set(config.id, config);
  }

  /**
   * Get companion configuration
   *
   * Retrieves the configuration for a specific companion.
   *
   * @param companionId - Companion identifier
   * @returns Companion configuration
   * @throws AvatarGenerationError if companion not found
   */
  getCompanion(companionId: string): CompanionAvatarConfig {
    const companion = this.companions.get(companionId);

    if (!companion) {
      throw new AvatarGenerationError(
        `Companion not found: ${companionId}`,
        AvatarErrorCode.INVALID_COMPANION,
        { companionId, availableCompanions: Array.from(this.companions.keys()) }
      );
    }

    return companion;
  }

  /**
   * List available companions
   *
   * Returns all registered companion configurations.
   *
   * @returns Array of companion configurations
   */
  listCompanions(): CompanionAvatarConfig[] {
    return Array.from(this.companions.values());
  }

  /**
   * Get generation statistics
   *
   * Returns cumulative statistics about avatar generation performance.
   *
   * @returns Statistics object
   */
  getStats(): AvatarGenerationStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   *
   * Clears all accumulated statistics.
   */
  resetStats(): void {
    this.stats = {
      totalGenerated: 0,
      averageGenerationTime: 0,
      averageLipSyncQuality: 0,
      successRate: 100,
      totalErrors: 0,
    };
  }

  /**
   * Generate batch avatars
   *
   * Generates multiple avatars in parallel for efficiency.
   *
   * @param requests - Array of generation parameters
   * @param concurrency - Maximum concurrent generations (default: 3)
   * @returns Array of generation responses
   *
   * @example
   * ```typescript
   * const generator = new AvatarGenerator();
   * const responses = await generator.generateBatch([
   *   { companionId: 'companion-001', text: 'Hello!', emotion: 'happiness' },
   *   { companionId: 'companion-001', text: 'Goodbye!', emotion: 'affection' },
   *   { companionId: 'companion-002', text: 'Wow!', emotion: 'excitement' },
   * ], 2);
   * console.log(`Generated ${responses.length} avatars`);
   * ```
   */
  async generateBatch(
    requests: Parameters<typeof this.generate>[0][],
    concurrency: number = 3
  ): Promise<AvatarGenerationResponse[]> {
    const results: AvatarGenerationResponse[] = [];
    const queue = [...requests];

    // Process in batches
    while (queue.length > 0) {
      const batch = queue.splice(0, concurrency);
      const batchResults = await Promise.all(
        batch.map(params => this.generate(params).catch(error => {
          console.error(`Batch generation error for ${params.companionId}:`, error);
          return null;
        }))
      );

      results.push(...batchResults.filter((r): r is AvatarGenerationResponse => r !== null));
    }

    return results;
  }

  /**
   * Update statistics after successful generation
   *
   * @param response - Completed generation response
   */
  private updateSuccessStats(response: AvatarGenerationResponse): void {
    const total = this.stats.totalGenerated;

    this.stats.totalGenerated += 1;
    this.stats.averageGenerationTime =
      (this.stats.averageGenerationTime * total + response.generationTime) /
      (total + 1);
    this.stats.averageLipSyncQuality =
      (this.stats.averageLipSyncQuality * total + response.lipSyncQuality) /
      (total + 1);
    this.stats.successRate =
      (this.stats.totalGenerated / (this.stats.totalGenerated + this.stats.totalErrors)) * 100;
  }

  /**
   * Update statistics after generation error
   */
  private updateErrorStats(): void {
    this.stats.totalErrors += 1;
    this.stats.successRate =
      (this.stats.totalGenerated / (this.stats.totalGenerated + this.stats.totalErrors)) * 100;
  }
}

/**
 * Singleton instance for global use
 */
let globalGenerator: AvatarGenerator | null = null;

/**
 * Get or create global avatar generator instance
 *
 * @param apiKey - BytePlus Video API key (optional)
 * @returns Global generator instance
 */
export function getAvatarGenerator(apiKey?: string): AvatarGenerator {
  if (!globalGenerator) {
    globalGenerator = new AvatarGenerator(apiKey);
  }
  return globalGenerator;
}

/**
 * Reset global avatar generator instance
 */
export function resetAvatarGenerator(): void {
  globalGenerator = null;
}
