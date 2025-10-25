/**
 * Core Speech Service
 *
 * High-level service layer for TTS/STT operations with emotion control,
 * caching, rate limiting, and error handling.
 */

import {
  BytePlusSpeechClient,
  createBytePlusClientFromEnv,
} from './byteplus-speech-client';
import {
  TTSRequest,
  TTSResponse,
  STTRequest,
  STTResponse,
  VoiceLibraryResponse,
  EmotionType,
  VoiceConfig,
  VoiceMetadata,
} from '../types/speech';

/**
 * Cache entry for TTS responses
 */
interface CacheEntry {
  response: TTSResponse;
  timestamp: number;
}

/**
 * Speech Service configuration
 */
export interface SpeechServiceConfig {
  /** Enable response caching */
  enableCache?: boolean;

  /** Cache TTL in milliseconds (default: 1 hour) */
  cacheTTL?: number;

  /** Enable rate limiting */
  enableRateLimit?: boolean;

  /** Max requests per minute (default: 60) */
  maxRequestsPerMinute?: number;

  /** Default voice ID */
  defaultVoiceId?: string;

  /** Default emotion */
  defaultEmotion?: EmotionType;
}

/**
 * Core Speech Service
 */
export class SpeechService {
  private client: BytePlusSpeechClient;
  private config: Required<SpeechServiceConfig>;
  private cache: Map<string, CacheEntry>;
  private requestTimestamps: number[];
  private voiceCache: VoiceLibraryResponse | null;

  constructor(
    client?: BytePlusSpeechClient,
    config: SpeechServiceConfig = {}
  ) {
    this.client = client || createBytePlusClientFromEnv();
    this.config = {
      enableCache: config.enableCache ?? true,
      cacheTTL: config.cacheTTL ?? 3600000, // 1 hour
      enableRateLimit: config.enableRateLimit ?? true,
      maxRequestsPerMinute: config.maxRequestsPerMinute ?? 60,
      defaultVoiceId: config.defaultVoiceId ?? 'female-ja-soft-1',
      defaultEmotion: config.defaultEmotion ?? 'neutral',
    };

    this.cache = new Map();
    this.requestTimestamps = [];
    this.voiceCache = null;

    // Start cache cleanup interval
    if (this.config.enableCache) {
      this.startCacheCleanup();
    }
  }

  /**
   * Convert text to speech with emotion control
   *
   * @param text Text to convert
   * @param options Optional configuration
   * @returns Audio response
   */
  async textToSpeech(
    text: string,
    options: {
      voiceId?: string;
      emotion?: EmotionType;
      pitch?: number;
      speed?: number;
    } = {}
  ): Promise<TTSResponse> {
    // Check rate limit
    if (this.config.enableRateLimit) {
      await this.checkRateLimit();
    }

    // Build request
    const voiceConfig: VoiceConfig = {
      pitch: options.pitch ?? 0,
      speed: options.speed ?? 1.0,
      emotion: options.emotion ?? this.config.defaultEmotion,
    };

    const request: TTSRequest = {
      text,
      voiceId: options.voiceId ?? this.config.defaultVoiceId,
      voiceConfig,
    };

    // Check cache
    if (this.config.enableCache) {
      const cached = this.getFromCache(request);
      if (cached) {
        return cached;
      }
    }

    // Make API request
    const response = await this.client.textToSpeech(request);

    // Validate processing time (<200ms requirement)
    if (response.processingTime > 200) {
      console.warn(
        `TTS processing time (${response.processingTime}ms) exceeded target (<200ms)`
      );
    }

    // Cache response
    if (this.config.enableCache) {
      this.addToCache(request, response);
    }

    // Record request timestamp for rate limiting
    this.requestTimestamps.push(Date.now());

    return response;
  }

  /**
   * Convert speech to text with high accuracy
   *
   * @param audioData Audio data (Buffer or base64)
   * @param options Optional configuration
   * @returns Transcription response
   */
  async speechToText(
    audioData: Buffer | string,
    options: {
      language?: string;
      enableSpeakerDiarization?: boolean;
    } = {}
  ): Promise<STTResponse> {
    // Check rate limit
    if (this.config.enableRateLimit) {
      await this.checkRateLimit();
    }

    const request: STTRequest = {
      audioData,
      language: options.language,
      enableSpeakerDiarization: options.enableSpeakerDiarization,
    };

    const response = await this.client.speechToText(request);

    // Validate accuracy (98%+ for CJK requirement)
    if (response.language.match(/^(ja|zh|ko)/) && response.confidence < 0.98) {
      console.warn(
        `STT confidence (${response.confidence}) below target (0.98+) for CJK language`
      );
    }

    // Record request timestamp for rate limiting
    this.requestTimestamps.push(Date.now());

    return response;
  }

  /**
   * Get available voices with filtering
   *
   * @param filters Optional filters
   * @returns Filtered voice library
   */
  async getVoices(filters?: {
    locale?: string;
    gender?: 'male' | 'female' | 'neutral';
    emotion?: EmotionType;
  }): Promise<VoiceLibraryResponse> {
    // Check cache
    if (this.voiceCache && !filters?.locale) {
      return this.applyVoiceFilters(this.voiceCache, filters);
    }

    // Fetch from API
    const voices = await this.client.getVoices(filters?.locale);

    // Cache if no locale filter
    if (!filters?.locale) {
      this.voiceCache = voices;
    }

    return this.applyVoiceFilters(voices, filters);
  }

  /**
   * Apply filters to voice library
   */
  private applyVoiceFilters(
    library: VoiceLibraryResponse,
    filters?: {
      gender?: 'male' | 'female' | 'neutral';
      emotion?: EmotionType;
    }
  ): VoiceLibraryResponse {
    if (!filters) {
      return library;
    }

    let filtered = library.voices;

    if (filters.gender) {
      filtered = filtered.filter((v) => v.gender === filters.gender);
    }

    if (filters.emotion) {
      filtered = filtered.filter((v) =>
        v.supportedEmotions.includes(filters.emotion!)
      );
    }

    return {
      total: filtered.length,
      voices: filtered,
    };
  }

  /**
   * Get recommended voice based on emotion and context
   *
   * @param emotion Desired emotion
   * @param locale Language/locale
   * @returns Recommended voice metadata
   */
  async getRecommendedVoice(
    emotion: EmotionType,
    locale: string = 'ja-JP'
  ): Promise<VoiceMetadata | null> {
    const voices = await this.getVoices({ locale, emotion });

    if (voices.voices.length === 0) {
      return null;
    }

    // Prioritize adult female voices for AI girlfriend context
    const preferred = voices.voices.find(
      (v) => v.gender === 'female' && v.ageRange === 'adult'
    );

    return preferred || voices.voices[0];
  }

  /**
   * Create WebSocket URL for real-time streaming STT
   *
   * @param language Optional language code
   * @returns WebSocket URL
   */
  createStreamingSTTUrl(language?: string): string {
    return this.client.createStreamingSTTUrl(language);
  }

  /**
   * Test API connectivity
   *
   * @returns Connection status
   */
  async testConnection(): Promise<boolean> {
    return this.client.testConnection();
  }

  /**
   * Get API usage statistics
   */
  async getUsageStats() {
    return this.client.getUsageStats();
  }

  /**
   * Generate cache key for TTS request
   */
  private getCacheKey(request: TTSRequest): string {
    return `tts:${request.text}:${request.voiceId}:${request.voiceConfig.pitch}:${request.voiceConfig.speed}:${request.voiceConfig.emotion}`;
  }

  /**
   * Get cached TTS response
   */
  private getFromCache(request: TTSRequest): TTSResponse | null {
    const key = this.getCacheKey(request);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  /**
   * Add TTS response to cache
   */
  private addToCache(request: TTSRequest, response: TTSResponse): void {
    const key = this.getCacheKey(request);
    this.cache.set(key, {
      response,
      timestamp: Date.now(),
    });
  }

  /**
   * Start periodic cache cleanup
   */
  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const expiredKeys: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > this.config.cacheTTL) {
          expiredKeys.push(key);
        }
      }

      for (const key of expiredKeys) {
        this.cache.delete(key);
      }

      if (expiredKeys.length > 0) {
        console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(): Promise<void> {
    if (!this.config.enableRateLimit) {
      return;
    }

    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove timestamps older than 1 minute
    this.requestTimestamps = this.requestTimestamps.filter(
      (ts) => ts > oneMinuteAgo
    );

    // Check if limit exceeded
    if (this.requestTimestamps.length >= this.config.maxRequestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0];
      const waitTime = 60000 - (now - oldestTimestamp);

      if (waitTime > 0) {
        console.warn(
          `Rate limit reached. Waiting ${waitTime}ms before next request.`
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.voiceCache = null;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
  } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }
}

/**
 * Create speech service instance from environment variables
 */
export function createSpeechService(
  config?: SpeechServiceConfig
): SpeechService {
  return new SpeechService(undefined, config);
}
