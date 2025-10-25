/**
 * BytePlus TTS/STT Voice Integration Type Definitions
 *
 * This module defines TypeScript types for the BytePlus Speech API integration,
 * supporting Text-to-Speech (TTS) and Speech-to-Text (STT) functionality.
 */

/**
 * Emotion types supported by BytePlus TTS
 */
export type EmotionType = 'happy' | 'soft' | 'energetic' | 'neutral';

/**
 * Voice configuration for TTS requests
 */
export interface VoiceConfig {
  /** Pitch adjustment: -1.0 (lower) to 1.0 (higher) */
  pitch: number;

  /** Speech speed: 0.5 (slower) to 2.0 (faster) */
  speed: number;

  /** Emotion style for the voice */
  emotion: EmotionType;
}

/**
 * Text-to-Speech request payload
 */
export interface TTSRequest {
  /** Text to convert to speech */
  text: string;

  /** Voice ID from BytePlus voice library (50+ voices available) */
  voiceId: string;

  /** Voice configuration options */
  voiceConfig: VoiceConfig;
}

/**
 * Text-to-Speech response
 */
export interface TTSResponse {
  /** Base64-encoded audio data */
  audioData: string;

  /** Audio format (e.g., 'mp3', 'wav') */
  format: string;

  /** Duration in milliseconds */
  duration: number;

  /** Processing time in milliseconds (should be <200ms) */
  processingTime: number;

  /** Voice ID used */
  voiceId: string;
}

/**
 * Speech-to-Text request payload
 */
export interface STTRequest {
  /** Audio data as Buffer or base64 string */
  audioData: Buffer | string;

  /** Language code (e.g., 'ja-JP', 'en-US', 'zh-CN') */
  language?: string;

  /** Enable speaker diarization (identifying different speakers) */
  enableSpeakerDiarization?: boolean;
}

/**
 * Speaker segment for diarization
 */
export interface SpeakerSegment {
  /** Speaker identifier (e.g., 'SPEAKER_1', 'SPEAKER_2') */
  speaker: string;

  /** Start time in seconds */
  startTime: number;

  /** End time in seconds */
  endTime: number;

  /** Transcribed text for this segment */
  text: string;

  /** Confidence score (0.0 to 1.0) */
  confidence: number;
}

/**
 * Speech-to-Text response
 */
export interface STTResponse {
  /** Transcribed text */
  text: string;

  /** Detected language code */
  language: string;

  /** Overall confidence score (0.0 to 1.0, should be 0.98+ for CJK) */
  confidence: number;

  /** Processing time in milliseconds */
  processingTime: number;

  /** Speaker segments (if diarization is enabled) */
  speakers?: SpeakerSegment[];
}

/**
 * Voice metadata from voice library
 */
export interface VoiceMetadata {
  /** Unique voice identifier */
  id: string;

  /** Display name of the voice */
  name: string;

  /** Gender of the voice */
  gender: 'male' | 'female' | 'neutral';

  /** Language/locale code */
  locale: string;

  /** Age category */
  ageRange: 'child' | 'teen' | 'adult' | 'senior';

  /** Supported emotions for this voice */
  supportedEmotions: EmotionType[];

  /** Voice description */
  description: string;

  /** Sample audio URL */
  sampleUrl?: string;
}

/**
 * Voice library response
 */
export interface VoiceLibraryResponse {
  /** Total number of voices available */
  total: number;

  /** List of voice metadata */
  voices: VoiceMetadata[];
}

/**
 * Real-time STT streaming message
 */
export interface STTStreamMessage {
  /** Message type */
  type: 'partial' | 'final' | 'error' | 'connected' | 'closed';

  /** Transcribed text (for partial/final types) */
  text?: string;

  /** Confidence score (for partial/final types) */
  confidence?: number;

  /** Error message (for error type) */
  error?: string;

  /** Timestamp of the message */
  timestamp: number;
}

/**
 * BytePlus API error response
 */
export interface BytePlusError {
  /** Error code */
  code: string;

  /** Error message */
  message: string;

  /** Additional error details */
  details?: Record<string, unknown>;

  /** Request ID for debugging */
  requestId: string;
}

/**
 * BytePlus API configuration
 */
export interface BytePlusConfig {
  /** API access key */
  accessKey: string;

  /** API secret key */
  secretKey: string;

  /** API endpoint URL */
  endpoint: string;

  /** API region (e.g., 'us-east-1', 'ap-southeast-1') */
  region: string;

  /** Request timeout in milliseconds */
  timeout?: number;
}

/**
 * Audio format options
 */
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac';

/**
 * Audio encoding options
 */
export interface AudioEncoding {
  /** Audio format */
  format: AudioFormat;

  /** Sample rate in Hz (e.g., 16000, 24000, 48000) */
  sampleRate: number;

  /** Bit rate in kbps (e.g., 128, 192, 256) */
  bitRate?: number;
}

/**
 * TTS advanced options
 */
export interface TTSOptions extends TTSRequest {
  /** Audio encoding settings */
  encoding?: AudioEncoding;

  /** Enable streaming response */
  streaming?: boolean;

  /** Enable prosody control (SSML) */
  enableProsody?: boolean;

  /** Custom SSML tags */
  ssml?: string;
}

/**
 * STT advanced options
 */
export interface STTOptions extends STTRequest {
  /** Enable punctuation */
  enablePunctuation?: boolean;

  /** Enable profanity filtering */
  enableProfanityFilter?: boolean;

  /** Custom vocabulary/phrases for better recognition */
  customVocabulary?: string[];

  /** Model type (e.g., 'general', 'phone_call', 'video') */
  modelType?: string;
}
