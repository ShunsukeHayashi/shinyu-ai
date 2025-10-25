// Whisper API統合 - 音声認識

use anyhow::{Context, Result};
use async_trait::async_trait;
use reqwest::multipart;
use serde::{Deserialize, Serialize};
use std::env;
use std::path::Path;

/// 音声認識プロバイダートレイト
#[async_trait]
pub trait SpeechToTextProvider: Send + Sync {
    async fn transcribe(&self, audio_file: &Path) -> Result<TranscriptionResult>;
}

/// 音声認識結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    /// 認識されたテキスト
    pub text: String,
    /// 言語コード（例: "ja", "en"）
    pub language: Option<String>,
    /// 信頼度スコア (0.0-1.0)
    pub confidence: Option<f32>,
}

/// Whisper APIクライアント
pub struct WhisperClient {
    api_key: String,
    http_client: reqwest::Client,
    base_url: String,
    model: String,
}

impl WhisperClient {
    /// 新しいWhisperクライアントを作成
    pub fn new() -> Result<Self> {
        let api_key =
            env::var("OPENAI_API_KEY").context("OPENAI_API_KEY environment variable not set")?;

        Ok(Self {
            api_key,
            http_client: reqwest::Client::new(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "whisper-1".to_string(),
        })
    }

    /// APIキーを指定してクライアントを作成
    pub fn with_api_key(api_key: String) -> Self {
        Self {
            api_key,
            http_client: reqwest::Client::new(),
            base_url: "https://api.openai.com/v1".to_string(),
            model: "whisper-1".to_string(),
        }
    }

    /// モデルを指定
    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = model.into();
        self
    }
}

#[async_trait]
impl SpeechToTextProvider for WhisperClient {
    async fn transcribe(&self, audio_file: &Path) -> Result<TranscriptionResult> {
        // ファイルの存在確認
        if !audio_file.exists() {
            anyhow::bail!("Audio file not found: {}", audio_file.display());
        }

        // ファイル読み込み
        let file_bytes = tokio::fs::read(audio_file)
            .await
            .context("Failed to read audio file")?;

        let file_name = audio_file
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("audio.wav")
            .to_string();

        // マルチパートフォーム構築
        let file_part = multipart::Part::bytes(file_bytes)
            .file_name(file_name)
            .mime_str("audio/wav")?;

        let form = multipart::Form::new()
            .part("file", file_part)
            .text("model", self.model.clone())
            .text("language", "ja"); // 日本語優先

        // API呼び出し
        let response = self
            .http_client
            .post(format!("{}/audio/transcriptions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .multipart(form)
            .send()
            .await
            .context("Failed to send request to Whisper API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Whisper API error ({}): {}", status, error_text);
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse Whisper API response")?;

        let text = response_json["text"]
            .as_str()
            .context("Missing text in response")?
            .to_string();

        let language = response_json["language"].as_str().map(|s| s.to_string());

        Ok(TranscriptionResult {
            text,
            language,
            confidence: None, // Whisper APIは信頼度スコアを返さない
        })
    }
}

/// モック音声認識プロバイダー（テスト用）
pub struct MockSpeechToTextProvider {
    pub canned_response: String,
}

impl MockSpeechToTextProvider {
    pub fn new(response: impl Into<String>) -> Self {
        Self {
            canned_response: response.into(),
        }
    }
}

#[async_trait]
impl SpeechToTextProvider for MockSpeechToTextProvider {
    async fn transcribe(&self, _audio_file: &Path) -> Result<TranscriptionResult> {
        Ok(TranscriptionResult {
            text: self.canned_response.clone(),
            language: Some("ja".to_string()),
            confidence: Some(0.95),
        })
    }
}

/// 音声録音ヘルパー（将来の拡張用）
pub struct AudioRecorder {
    sample_rate: u32,
    channels: u16,
}

impl AudioRecorder {
    pub fn new() -> Self {
        Self {
            sample_rate: 16000, // Whisperの推奨サンプルレート
            channels: 1,        // モノラル
        }
    }

    /// サンプルレートを設定
    pub fn with_sample_rate(mut self, rate: u32) -> Self {
        self.sample_rate = rate;
        self
    }

    /// チャンネル数を設定
    pub fn with_channels(mut self, channels: u16) -> Self {
        self.channels = channels;
        self
    }

    // TODO: 実際の録音機能は別途実装
    // pub async fn record_to_file(&self, duration_secs: u32, output_path: &Path) -> Result<()>
}

impl Default for AudioRecorder {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[tokio::test]
    async fn test_mock_provider() {
        let provider = MockSpeechToTextProvider::new("こんにちは、テストです。");

        let result = provider
            .transcribe(&PathBuf::from("/tmp/test.wav"))
            .await
            .unwrap();

        assert_eq!(result.text, "こんにちは、テストです。");
        assert_eq!(result.language, Some("ja".to_string()));
        assert!(result.confidence.is_some());
    }

    #[test]
    fn test_audio_recorder_builder() {
        let recorder = AudioRecorder::new()
            .with_sample_rate(48000)
            .with_channels(2);

        assert_eq!(recorder.sample_rate, 48000);
        assert_eq!(recorder.channels, 2);
    }

    #[test]
    fn test_transcription_result() {
        let result = TranscriptionResult {
            text: "テスト".to_string(),
            language: Some("ja".to_string()),
            confidence: Some(0.95),
        };

        assert_eq!(result.text, "テスト");
        assert!(result.confidence.unwrap() > 0.9);
    }
}
