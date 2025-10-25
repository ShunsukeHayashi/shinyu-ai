/**
 * BytePlus Video AI API Client
 *
 * Client for interacting with BytePlus Video AI Avatar Generation API.
 * Provides methods for creating and managing avatar generation jobs.
 *
 * @module byteplus-video-client
 */

import {
  AvatarGenerationRequest,
  AvatarGenerationResponse,
  AvatarJobStatus,
  AvatarJobMetadata,
  AvatarGenerationError,
  AvatarErrorCode,
  BytePlusVideoConfig,
} from '../types/avatar';

/**
 * Default configuration for BytePlus Video API
 */
const DEFAULT_CONFIG: Partial<BytePlusVideoConfig> = {
  apiUrl: 'https://avatar.bytepluses.com/api/v1',
  modelVersion: 'avatar-v1',
  timeout: 30000, // 30 seconds
  maxRetries: 3,
};

/**
 * BytePlus Video AI Client
 *
 * Handles all communication with BytePlus Video AI Avatar Generation API.
 * Supports video generation, job polling, and error handling.
 */
export class BytePlusVideoClient {
  private config: BytePlusVideoConfig;
  private headers: HeadersInit;

  /**
   * Create a new BytePlus Video Client
   *
   * @param config - Client configuration
   */
  constructor(config: Partial<BytePlusVideoConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    } as BytePlusVideoConfig;

    if (!this.config.apiKey) {
      throw new AvatarGenerationError(
        'BytePlus API key is required',
        AvatarErrorCode.INVALID_REQUEST
      );
    }

    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-API-Version': this.config.modelVersion || 'avatar-v1',
    };
  }

  /**
   * Generate avatar video
   *
   * Initiates an avatar generation job with the specified parameters.
   *
   * @param request - Avatar generation request
   * @returns Initial response with job ID
   */
  async generateAvatar(
    request: AvatarGenerationRequest
  ): Promise<AvatarGenerationResponse> {
    this.validateRequest(request);

    const startTime = Date.now();

    try {
      const response = await this.fetchWithRetry(
        `${this.config.apiUrl}/avatars/generate`,
        {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            companion_id: request.companionId,
            text: request.text,
            emotion: request.emotion,
            duration: request.duration,
            format: request.format,
            voice_params: request.voiceParams ? {
              speed: request.voiceParams.speed || 1.0,
              pitch: request.voiceParams.pitch || 0,
              volume: request.voiceParams.volume || 1.0,
            } : undefined,
            model_version: this.config.modelVersion,
          }),
        }
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();

      return {
        jobId: data.job_id,
        status: this.mapStatus(data.status),
        videoUrl: data.video_url,
        audioUrl: data.audio_url,
        lipSyncQuality: data.lip_sync_quality || 0,
        generationTime: Date.now() - startTime,
        createdAt: new Date(data.created_at || Date.now()),
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      };
    } catch (error) {
      if (error instanceof AvatarGenerationError) {
        throw error;
      }

      throw new AvatarGenerationError(
        `Failed to generate avatar: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AvatarErrorCode.API_ERROR,
        { originalError: error }
      );
    }
  }

  /**
   * Get job status
   *
   * Polls the API to get the current status of an avatar generation job.
   *
   * @param jobId - Job identifier
   * @returns Current job metadata
   */
  async getJobStatus(jobId: string): Promise<AvatarJobMetadata> {
    try {
      const response = await this.fetchWithRetry(
        `${this.config.apiUrl}/avatars/jobs/${jobId}`,
        {
          method: 'GET',
          headers: this.headers,
        }
      );

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      const data = await response.json();

      return {
        jobId: data.job_id,
        companionId: data.companion_id,
        request: {
          companionId: data.companion_id,
          text: data.text,
          emotion: data.emotion,
          duration: data.duration,
          format: data.format,
          voiceParams: data.voice_params,
        },
        status: this.mapStatus(data.status),
        progress: data.progress || 0,
        estimatedTimeRemaining: data.estimated_time_remaining,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      if (error instanceof AvatarGenerationError) {
        throw error;
      }

      throw new AvatarGenerationError(
        `Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        AvatarErrorCode.API_ERROR,
        { jobId, originalError: error }
      );
    }
  }

  /**
   * Wait for job completion
   *
   * Polls the job status until it's completed or failed.
   * Uses exponential backoff for polling intervals.
   *
   * @param jobId - Job identifier
   * @param maxWaitTime - Maximum wait time in milliseconds (default: 60000)
   * @param pollInterval - Initial poll interval in milliseconds (default: 2000)
   * @returns Final generation response
   */
  async waitForCompletion(
    jobId: string,
    maxWaitTime: number = 60000,
    pollInterval: number = 2000
  ): Promise<AvatarGenerationResponse> {
    const startTime = Date.now();
    let currentInterval = pollInterval;

    while (Date.now() - startTime < maxWaitTime) {
      const metadata = await this.getJobStatus(jobId);

      if (metadata.status === 'completed') {
        // Fetch final result
        const response = await this.fetchWithRetry(
          `${this.config.apiUrl}/avatars/jobs/${jobId}/result`,
          {
            method: 'GET',
            headers: this.headers,
          }
        );

        const data = await response.json();

        return {
          jobId: metadata.jobId,
          status: 'completed',
          videoUrl: data.video_url,
          audioUrl: data.audio_url,
          lipSyncQuality: data.lip_sync_quality || 0,
          generationTime: Date.now() - startTime,
          createdAt: metadata.createdAt,
          completedAt: new Date(),
        };
      }

      if (metadata.status === 'failed') {
        throw new AvatarGenerationError(
          'Avatar generation failed',
          AvatarErrorCode.GENERATION_FAILED,
          { jobId, metadata }
        );
      }

      // Wait before next poll (exponential backoff)
      await this.sleep(currentInterval);
      currentInterval = Math.min(currentInterval * 1.5, 10000); // Max 10 seconds
    }

    throw new AvatarGenerationError(
      'Avatar generation timeout',
      AvatarErrorCode.TIMEOUT,
      { jobId, maxWaitTime }
    );
  }

  /**
   * Validate generation request
   *
   * @param request - Request to validate
   * @throws AvatarGenerationError if request is invalid
   */
  private validateRequest(request: AvatarGenerationRequest): void {
    if (!request.companionId) {
      throw new AvatarGenerationError(
        'companionId is required',
        AvatarErrorCode.INVALID_REQUEST
      );
    }

    if (!request.text || request.text.length === 0) {
      throw new AvatarGenerationError(
        'text is required',
        AvatarErrorCode.INVALID_REQUEST
      );
    }

    if (request.duration <= 0 || request.duration > 60) {
      throw new AvatarGenerationError(
        'duration must be between 1 and 60 seconds',
        AvatarErrorCode.INVALID_REQUEST
      );
    }

    const validEmotions = ['happiness', 'excitement', 'affection', 'curiosity'];
    if (!validEmotions.includes(request.emotion)) {
      throw new AvatarGenerationError(
        `emotion must be one of: ${validEmotions.join(', ')}`,
        AvatarErrorCode.INVALID_REQUEST
      );
    }

    if (request.voiceParams) {
      if (request.voiceParams.speed && (request.voiceParams.speed < 0.5 || request.voiceParams.speed > 2.0)) {
        throw new AvatarGenerationError(
          'voice speed must be between 0.5 and 2.0',
          AvatarErrorCode.INVALID_REQUEST
        );
      }

      if (request.voiceParams.pitch && (request.voiceParams.pitch < -12 || request.voiceParams.pitch > 12)) {
        throw new AvatarGenerationError(
          'voice pitch must be between -12 and 12 semitones',
          AvatarErrorCode.INVALID_REQUEST
        );
      }

      if (request.voiceParams.volume && (request.voiceParams.volume < 0 || request.voiceParams.volume > 1)) {
        throw new AvatarGenerationError(
          'voice volume must be between 0.0 and 1.0',
          AvatarErrorCode.INVALID_REQUEST
        );
      }
    }
  }

  /**
   * Fetch with retry logic
   *
   * @param url - Request URL
   * @param options - Fetch options
   * @param retries - Number of retries remaining
   * @returns Fetch response
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries: number = this.config.maxRetries || 3
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.timeout || 30000
      );

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on 5xx errors or rate limit
      if (response.status >= 500 || response.status === 429) {
        if (retries > 0) {
          await this.sleep(1000 * (4 - retries)); // Exponential backoff
          return this.fetchWithRetry(url, options, retries - 1);
        }
      }

      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AvatarGenerationError(
          'Request timeout',
          AvatarErrorCode.TIMEOUT
        );
      }

      if (retries > 0) {
        await this.sleep(1000 * (4 - retries));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  /**
   * Handle error response from API
   *
   * @param response - Error response
   */
  private async handleErrorResponse(response: Response): Promise<never> {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { message: response.statusText };
    }

    const errorCode = this.mapErrorCode(response.status, errorData.code);
    const errorMessage = errorData.message || `API error: ${response.status}`;

    throw new AvatarGenerationError(errorMessage, errorCode, {
      status: response.status,
      data: errorData,
    });
  }

  /**
   * Map HTTP status to error code
   *
   * @param status - HTTP status code
   * @param apiCode - API-specific error code
   * @returns Mapped error code
   */
  private mapErrorCode(status: number, apiCode?: string): AvatarErrorCode {
    if (status === 429) return AvatarErrorCode.RATE_LIMIT;
    if (status === 400) return AvatarErrorCode.INVALID_REQUEST;
    if (status === 402) return AvatarErrorCode.QUOTA_EXCEEDED;
    if (apiCode === 'INVALID_COMPANION') return AvatarErrorCode.INVALID_COMPANION;

    return AvatarErrorCode.API_ERROR;
  }

  /**
   * Map API status to internal status
   *
   * @param apiStatus - API status string
   * @returns Mapped job status
   */
  private mapStatus(apiStatus: string): AvatarJobStatus {
    const statusMap: Record<string, AvatarJobStatus> = {
      'pending': 'processing',
      'processing': 'processing',
      'generating': 'processing',
      'completed': 'completed',
      'success': 'completed',
      'failed': 'failed',
      'error': 'failed',
    };

    return statusMap[apiStatus.toLowerCase()] || 'processing';
  }

  /**
   * Sleep utility
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create a BytePlus Video Client instance
 *
 * Factory function for creating a configured client instance.
 *
 * @param apiKey - BytePlus API key (optional, reads from env if not provided)
 * @returns Configured client instance
 */
export function createBytePlusVideoClient(apiKey?: string): BytePlusVideoClient {
  const key = apiKey || process.env.BYTEPLUS_VIDEO_API_KEY;

  if (!key) {
    throw new AvatarGenerationError(
      'BytePlus Video API key is required. Set BYTEPLUS_VIDEO_API_KEY environment variable.',
      AvatarErrorCode.INVALID_REQUEST
    );
  }

  return new BytePlusVideoClient({ apiKey: key });
}
