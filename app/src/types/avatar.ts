/**
 * Avatar System Type Definitions
 *
 * Type definitions for BytePlus Video AI Avatar Generation system.
 * Used for photo-realistic avatar synthesis with emotion-driven facial expressions.
 */

/**
 * Emotional states supported by the avatar system
 */
export type EmotionalState = 'happiness' | 'excitement' | 'affection' | 'curiosity';

/**
 * Output format for avatar generation
 */
export type AvatarOutputFormat = 'video' | 'audio' | 'both';

/**
 * Status of avatar generation job
 */
export type AvatarJobStatus = 'processing' | 'completed' | 'failed';

/**
 * Request payload for avatar generation
 */
export interface AvatarGenerationRequest {
  /** Companion/Character ID for consistent avatar identity */
  companionId: string;

  /** Text content to be spoken by the avatar */
  text: string;

  /** Emotional state for facial expression generation */
  emotion: EmotionalState;

  /** Duration in seconds (recommended: 10 seconds) */
  duration: number;

  /** Output format: video, audio, or both */
  format: AvatarOutputFormat;

  /** Optional: Custom voice parameters */
  voiceParams?: {
    /** Voice speed (0.5 - 2.0) */
    speed?: number;
    /** Voice pitch (-12 to +12 semitones) */
    pitch?: number;
    /** Voice volume (0.0 - 1.0) */
    volume?: number;
  };
}

/**
 * Response from avatar generation API
 */
export interface AvatarGenerationResponse {
  /** Unique job identifier for tracking generation status */
  jobId: string;

  /** Current status of the generation job */
  status: AvatarJobStatus;

  /** URL to generated video (available when status is 'completed' and format includes 'video') */
  videoUrl?: string;

  /** URL to generated audio (available when status is 'completed' and format includes 'audio') */
  audioUrl?: string;

  /** Lip-sync quality score (0-100) */
  lipSyncQuality: number;

  /** Time taken for generation in milliseconds */
  generationTime: number;

  /** Error message if status is 'failed' */
  error?: string;

  /** Timestamp when generation was requested */
  createdAt: Date;

  /** Timestamp when generation completed */
  completedAt?: Date;
}

/**
 * BytePlus Video AI API configuration
 */
export interface BytePlusVideoConfig {
  /** API endpoint URL */
  apiUrl: string;

  /** API key for authentication */
  apiKey: string;

  /** Model version (default: 'avatar-v1') */
  modelVersion?: string;

  /** Timeout for API requests in milliseconds */
  timeout?: number;

  /** Maximum retries for failed requests */
  maxRetries?: number;
}

/**
 * Avatar generation job metadata
 */
export interface AvatarJobMetadata {
  /** Job ID */
  jobId: string;

  /** Companion ID */
  companionId: string;

  /** Request parameters */
  request: AvatarGenerationRequest;

  /** Current status */
  status: AvatarJobStatus;

  /** Progress percentage (0-100) */
  progress: number;

  /** Estimated time remaining in seconds */
  estimatedTimeRemaining?: number;

  /** Created timestamp */
  createdAt: Date;

  /** Updated timestamp */
  updatedAt: Date;
}

/**
 * Companion character configuration for avatar generation
 */
export interface CompanionAvatarConfig {
  /** Companion ID */
  id: string;

  /** Display name */
  name: string;

  /** Avatar model ID in BytePlus system */
  avatarModelId: string;

  /** Default voice settings */
  defaultVoice: {
    /** Voice ID */
    voiceId: string;
    /** Default speed */
    speed: number;
    /** Default pitch */
    pitch: number;
    /** Default volume */
    volume: number;
  };

  /** Emotion mapping to facial expression parameters */
  emotionMapping: Record<EmotionalState, {
    /** Expression intensity (0.0 - 1.0) */
    intensity: number;
    /** Additional expression parameters */
    params?: Record<string, any>;
  }>;
}

/**
 * Error types for avatar generation
 */
export class AvatarGenerationError extends Error {
  constructor(
    message: string,
    public code: AvatarErrorCode,
    public details?: any
  ) {
    super(message);
    this.name = 'AvatarGenerationError';
  }
}

/**
 * Error codes for avatar generation
 */
export enum AvatarErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  API_ERROR = 'API_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  GENERATION_FAILED = 'GENERATION_FAILED',
  INVALID_COMPANION = 'INVALID_COMPANION',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
}
