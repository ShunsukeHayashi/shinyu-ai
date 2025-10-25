/**
 * BytePlus Speech API Client
 *
 * Low-level client for interacting with BytePlus TTS/STT APIs.
 * Handles authentication, request signing, and API communication.
 */

import crypto from 'crypto';
import {
  BytePlusConfig,
  TTSRequest,
  TTSResponse,
  STTRequest,
  STTResponse,
  VoiceLibraryResponse,
  BytePlusError,
  AudioEncoding,
} from '../types/speech';

/**
 * BytePlus Speech API Client
 */
export class BytePlusSpeechClient {
  private config: BytePlusConfig;
  private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

  constructor(config: BytePlusConfig) {
    this.config = {
      ...config,
      timeout: config.timeout || this.DEFAULT_TIMEOUT,
    };

    this.validateConfig();
  }

  /**
   * Validate client configuration
   */
  private validateConfig(): void {
    if (!this.config.accessKey) {
      throw new Error('BytePlus access key is required');
    }
    if (!this.config.secretKey) {
      throw new Error('BytePlus secret key is required');
    }
    if (!this.config.endpoint) {
      throw new Error('BytePlus endpoint is required');
    }
    if (!this.config.region) {
      throw new Error('BytePlus region is required');
    }
  }

  /**
   * Generate request signature for API authentication
   */
  private generateSignature(
    method: string,
    path: string,
    timestamp: number,
    body: string
  ): string {
    const stringToSign = `${method}\n${path}\n${timestamp}\n${body}`;
    const hmac = crypto.createHmac('sha256', this.config.secretKey);
    hmac.update(stringToSign);
    return hmac.digest('hex');
  }

  /**
   * Make authenticated API request
   */
  private async makeRequest<T>(
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.config.endpoint}${path}`;
    const timestamp = Date.now();
    const bodyString = body ? JSON.stringify(body) : '';
    const signature = this.generateSignature(method, path, timestamp, bodyString);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-BytePlus-Access-Key': this.config.accessKey,
      'X-BytePlus-Timestamp': timestamp.toString(),
      'X-BytePlus-Signature': signature,
      'X-BytePlus-Region': this.config.region,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(url, {
        method,
        headers,
        body: bodyString || undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error: BytePlusError = await response.json();
        throw new Error(`BytePlus API Error: ${error.message} (Code: ${error.code})`);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.config.timeout}ms`);
        }
        throw error;
      }
      throw new Error('Unknown error occurred during API request');
    }
  }

  /**
   * Convert text to speech (TTS)
   *
   * @param request TTS request parameters
   * @returns TTS response with audio data
   */
  async textToSpeech(request: TTSRequest): Promise<TTSResponse> {
    const startTime = Date.now();

    // Validate request
    this.validateTTSRequest(request);

    const response = await this.makeRequest<{
      audio_data: string;
      format: string;
      duration: number;
      voice_id: string;
    }>('POST', '/v1/tts/synthesize', {
      text: request.text,
      voice_id: request.voiceId,
      pitch: request.voiceConfig.pitch,
      speed: request.voiceConfig.speed,
      emotion: request.voiceConfig.emotion,
    });

    const processingTime = Date.now() - startTime;

    return {
      audioData: response.audio_data,
      format: response.format,
      duration: response.duration,
      processingTime,
      voiceId: response.voice_id,
    };
  }

  /**
   * Validate TTS request parameters
   */
  private validateTTSRequest(request: TTSRequest): void {
    if (!request.text || request.text.trim().length === 0) {
      throw new Error('Text is required for TTS');
    }
    if (!request.voiceId) {
      throw new Error('Voice ID is required for TTS');
    }
    if (request.voiceConfig.pitch < -1.0 || request.voiceConfig.pitch > 1.0) {
      throw new Error('Pitch must be between -1.0 and 1.0');
    }
    if (request.voiceConfig.speed < 0.5 || request.voiceConfig.speed > 2.0) {
      throw new Error('Speed must be between 0.5 and 2.0');
    }
  }

  /**
   * Convert speech to text (STT)
   *
   * @param request STT request parameters
   * @returns STT response with transcribed text
   */
  async speechToText(request: STTRequest): Promise<STTResponse> {
    const startTime = Date.now();

    // Validate request
    this.validateSTTRequest(request);

    // Convert audio data to base64 if it's a Buffer
    const audioData =
      request.audioData instanceof Buffer
        ? request.audioData.toString('base64')
        : request.audioData;

    const response = await this.makeRequest<{
      text: string;
      language: string;
      confidence: number;
      speakers?: Array<{
        speaker: string;
        start_time: number;
        end_time: number;
        text: string;
        confidence: number;
      }>;
    }>('POST', '/v1/stt/recognize', {
      audio_data: audioData,
      language: request.language || 'auto',
      enable_speaker_diarization: request.enableSpeakerDiarization || false,
    });

    const processingTime = Date.now() - startTime;

    return {
      text: response.text,
      language: response.language,
      confidence: response.confidence,
      processingTime,
      speakers: response.speakers?.map((s) => ({
        speaker: s.speaker,
        startTime: s.start_time,
        endTime: s.end_time,
        text: s.text,
        confidence: s.confidence,
      })),
    };
  }

  /**
   * Validate STT request parameters
   */
  private validateSTTRequest(request: STTRequest): void {
    if (!request.audioData) {
      throw new Error('Audio data is required for STT');
    }

    // Check if audio data is valid base64 (if string)
    if (typeof request.audioData === 'string') {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(request.audioData)) {
        throw new Error('Invalid base64 audio data');
      }
    }
  }

  /**
   * Get available voices from voice library
   *
   * @param locale Optional locale filter (e.g., 'ja-JP', 'en-US')
   * @returns List of available voices
   */
  async getVoices(locale?: string): Promise<VoiceLibraryResponse> {
    const path = locale ? `/v1/voices?locale=${locale}` : '/v1/voices';

    const response = await this.makeRequest<{
      total: number;
      voices: Array<{
        id: string;
        name: string;
        gender: 'male' | 'female' | 'neutral';
        locale: string;
        age_range: 'child' | 'teen' | 'adult' | 'senior';
        supported_emotions: Array<'happy' | 'soft' | 'energetic' | 'neutral'>;
        description: string;
        sample_url?: string;
      }>;
    }>('GET', path);

    return {
      total: response.total,
      voices: response.voices.map((v) => ({
        id: v.id,
        name: v.name,
        gender: v.gender,
        locale: v.locale,
        ageRange: v.age_range,
        supportedEmotions: v.supported_emotions,
        description: v.description,
        sampleUrl: v.sample_url,
      })),
    };
  }

  /**
   * Create WebSocket connection for real-time STT streaming
   *
   * @param language Optional language code
   * @returns WebSocket URL with authentication parameters
   */
  createStreamingSTTUrl(language?: string): string {
    const timestamp = Date.now();
    const path = '/v1/stt/stream';
    const signature = this.generateSignature('GET', path, timestamp, '');

    const wsProtocol = this.config.endpoint.startsWith('https') ? 'wss' : 'ws';
    const wsEndpoint = this.config.endpoint.replace(/^https?/, wsProtocol);

    const params = new URLSearchParams({
      access_key: this.config.accessKey,
      timestamp: timestamp.toString(),
      signature,
      region: this.config.region,
      ...(language && { language }),
    });

    return `${wsEndpoint}${path}?${params.toString()}`;
  }

  /**
   * Test API connectivity and authentication
   *
   * @returns True if connection successful
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getVoices();
      return true;
    } catch (error) {
      console.error('BytePlus API connection test failed:', error);
      return false;
    }
  }

  /**
   * Get API usage statistics (if supported by BytePlus API)
   *
   * @returns Usage statistics
   */
  async getUsageStats(): Promise<{
    ttsRequests: number;
    sttRequests: number;
    totalDuration: number;
    lastResetDate: string;
  }> {
    const response = await this.makeRequest<{
      tts_requests: number;
      stt_requests: number;
      total_duration: number;
      last_reset_date: string;
    }>('GET', '/v1/usage');

    return {
      ttsRequests: response.tts_requests,
      sttRequests: response.stt_requests,
      totalDuration: response.total_duration,
      lastResetDate: response.last_reset_date,
    };
  }
}

/**
 * Create BytePlus Speech client from environment variables
 */
export function createBytePlusClientFromEnv(): BytePlusSpeechClient {
  const config: BytePlusConfig = {
    accessKey: process.env.BYTEPLUS_ACCESS_KEY || '',
    secretKey: process.env.BYTEPLUS_SECRET_KEY || '',
    endpoint: process.env.BYTEPLUS_ENDPOINT || 'https://api.byteplus.com',
    region: process.env.BYTEPLUS_REGION || 'us-east-1',
    timeout: process.env.BYTEPLUS_TIMEOUT
      ? parseInt(process.env.BYTEPLUS_TIMEOUT, 10)
      : undefined,
  };

  return new BytePlusSpeechClient(config);
}
