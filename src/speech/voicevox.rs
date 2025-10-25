// VOICEVOX Engine統合 - 音声合成

use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// 音声合成プロバイダートレイト
#[async_trait]
pub trait TextToSpeechProvider: Send + Sync {
    async fn synthesize(&self, text: &str, speaker_id: u32) -> Result<Vec<u8>>;
    async fn save_to_file(&self, text: &str, speaker_id: u32, output_path: &Path) -> Result<()>;
}

/// VOICEVOXスピーカーID
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VoicevoxSpeaker {
    /// ずんだもん（ノーマル）
    ZundamonNormal = 3,
    /// ずんだもん（あまあま）
    ZundamonSweet = 1,
    /// ずんだもん（ツンツン）
    ZundamonTsundere = 7,
    /// 四国めたん（ノーマル）
    MetanNormal = 2,
    /// 春日部つむぎ（ノーマル）
    TsumugiNormal = 8,
}

impl VoicevoxSpeaker {
    /// スピーカー名を取得
    pub fn name(&self) -> &'static str {
        match self {
            Self::ZundamonNormal => "ずんだもん（ノーマル）",
            Self::ZundamonSweet => "ずんだもん（あまあま）",
            Self::ZundamonTsundere => "ずんだもん（ツンツン）",
            Self::MetanNormal => "四国めたん",
            Self::TsumugiNormal => "春日部つむぎ",
        }
    }

    /// スピーカーIDを取得
    pub fn id(&self) -> u32 {
        *self as u32
    }
}

/// VOICEVOXクライアント
pub struct VoicevoxClient {
    http_client: reqwest::Client,
    base_url: String,
}

impl VoicevoxClient {
    /// 新しいVOICEVOXクライアントを作成（デフォルト: localhost:50021）
    pub fn new() -> Self {
        Self {
            http_client: reqwest::Client::new(),
            base_url: "http://localhost:50021".to_string(),
        }
    }

    /// カスタムURLでクライアントを作成
    pub fn with_url(url: impl Into<String>) -> Self {
        Self {
            http_client: reqwest::Client::new(),
            base_url: url.into(),
        }
    }

    /// VOICEVOX Engineが起動しているか確認
    pub async fn is_available(&self) -> bool {
        self.http_client
            .get(format!("{}/version", self.base_url))
            .send()
            .await
            .is_ok()
    }

    /// 利用可能なスピーカー一覧を取得
    pub async fn get_speakers(&self) -> Result<Vec<Speaker>> {
        let response = self
            .http_client
            .get(format!("{}/speakers", self.base_url))
            .send()
            .await
            .context("Failed to get speakers from VOICEVOX")?;

        let speakers: Vec<Speaker> = response
            .json()
            .await
            .context("Failed to parse speakers response")?;

        Ok(speakers)
    }

    /// 音声クエリを生成
    async fn create_audio_query(&self, text: &str, speaker_id: u32) -> Result<AudioQuery> {
        let response = self
            .http_client
            .post(format!("{}/audio_query", self.base_url))
            .query(&[("text", text), ("speaker", &speaker_id.to_string())])
            .send()
            .await
            .context("Failed to create audio query")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("VOICEVOX audio_query error ({}): {}", status, error_text);
        }

        let query: AudioQuery = response
            .json()
            .await
            .context("Failed to parse audio query response")?;

        Ok(query)
    }

    /// 音声を合成
    async fn synthesize_with_query(&self, query: &AudioQuery, speaker_id: u32) -> Result<Vec<u8>> {
        let response = self
            .http_client
            .post(format!("{}/synthesis", self.base_url))
            .query(&[("speaker", speaker_id.to_string())])
            .json(query)
            .send()
            .await
            .context("Failed to synthesize audio")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("VOICEVOX synthesis error ({}): {}", status, error_text);
        }

        let audio_bytes = response
            .bytes()
            .await
            .context("Failed to get audio bytes")?
            .to_vec();

        Ok(audio_bytes)
    }
}

impl Default for VoicevoxClient {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl TextToSpeechProvider for VoicevoxClient {
    async fn synthesize(&self, text: &str, speaker_id: u32) -> Result<Vec<u8>> {
        // 1. 音声クエリ生成
        let query = self.create_audio_query(text, speaker_id).await?;

        // 2. 音声合成
        let audio = self.synthesize_with_query(&query, speaker_id).await?;

        Ok(audio)
    }

    async fn save_to_file(&self, text: &str, speaker_id: u32, output_path: &Path) -> Result<()> {
        let audio = self.synthesize(text, speaker_id).await?;

        tokio::fs::write(output_path, audio)
            .await
            .context("Failed to write audio file")?;

        Ok(())
    }
}

/// スピーカー情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Speaker {
    pub name: String,
    pub speaker_uuid: String,
    pub styles: Vec<SpeakerStyle>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpeakerStyle {
    pub id: u32,
    pub name: String,
}

/// 音声クエリ（VOICEVOX API仕様）
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioQuery {
    pub accent_phrases: Vec<AccentPhrase>,
    pub speed_scale: f32,
    pub pitch_scale: f32,
    pub intonation_scale: f32,
    pub volume_scale: f32,
    pub pre_phoneme_length: f32,
    pub post_phoneme_length: f32,
    pub output_sampling_rate: u32,
    pub output_stereo: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccentPhrase {
    pub moras: Vec<Mora>,
    pub accent: u32,
    pub pause_mora: Option<Mora>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Mora {
    pub text: String,
    pub consonant: Option<String>,
    pub consonant_length: Option<f32>,
    pub vowel: String,
    pub vowel_length: f32,
    pub pitch: f32,
}

/// モック音声合成プロバイダー（テスト用）
pub struct MockTextToSpeechProvider;

#[async_trait]
impl TextToSpeechProvider for MockTextToSpeechProvider {
    async fn synthesize(&self, _text: &str, _speaker_id: u32) -> Result<Vec<u8>> {
        // モック音声データ（空のWAVヘッダー）
        Ok(vec![
            0x52, 0x49, 0x46, 0x46, // "RIFF"
            0x00, 0x00, 0x00, 0x00, // chunk size
            0x57, 0x41, 0x56, 0x45, // "WAVE"
        ])
    }

    async fn save_to_file(&self, text: &str, speaker_id: u32, output_path: &Path) -> Result<()> {
        let audio = self.synthesize(text, speaker_id).await?;
        tokio::fs::write(output_path, audio).await?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn test_voicevox_speaker_enum() {
        assert_eq!(VoicevoxSpeaker::ZundamonNormal.id(), 3);
        assert_eq!(VoicevoxSpeaker::ZundamonNormal.name(), "ずんだもん（ノーマル）");

        assert_eq!(VoicevoxSpeaker::MetanNormal.id(), 2);
        assert_eq!(VoicevoxSpeaker::TsumugiNormal.id(), 8);
    }

    #[tokio::test]
    async fn test_mock_provider() {
        let provider = MockTextToSpeechProvider;

        let audio = provider
            .synthesize("テスト", VoicevoxSpeaker::ZundamonNormal.id())
            .await
            .unwrap();

        assert!(!audio.is_empty());
        // WAVヘッダーの確認
        assert_eq!(&audio[0..4], b"RIFF");
        assert_eq!(&audio[8..12], b"WAVE");
    }

    #[tokio::test]
    async fn test_mock_save_to_file() {
        let provider = MockTextToSpeechProvider;
        let output_path = PathBuf::from("/tmp/test_voicevox.wav");

        provider
            .save_to_file(
                "テスト",
                VoicevoxSpeaker::ZundamonNormal.id(),
                &output_path,
            )
            .await
            .unwrap();

        // ファイルが作成されているか確認
        assert!(output_path.exists());

        // Cleanup
        let _ = std::fs::remove_file(&output_path);
    }

    #[test]
    fn test_voicevox_client_creation() {
        let client = VoicevoxClient::new();
        assert_eq!(client.base_url, "http://localhost:50021");

        let custom_client = VoicevoxClient::with_url("http://localhost:50022");
        assert_eq!(custom_client.base_url, "http://localhost:50022");
    }
}
