// リアルタイム音声対話システム

use crate::character::Character;
use crate::dialogue::{DialogueManager, DialogueSession};
use crate::speech::{SpeechToTextProvider, TextToSpeechProvider, VoicevoxSpeaker};
use anyhow::{Context, Result};
use std::path::{Path, PathBuf};
use std::sync::Arc;

/// リアルタイム音声対話セッション
pub struct VoiceDialogueSession {
    /// 対話セッション
    pub dialogue_session: DialogueSession,
    /// 対話マネージャー
    dialogue_manager: Arc<DialogueManager>,
    /// 音声認識プロバイダー
    stt_provider: Arc<dyn SpeechToTextProvider>,
    /// 音声合成プロバイダー
    tts_provider: Arc<dyn TextToSpeechProvider>,
    /// VOICEVOXスピーカーID
    speaker_id: u32,
    /// 音声出力ディレクトリ
    output_dir: PathBuf,
}

impl VoiceDialogueSession {
    /// 新しい音声対話セッションを作成
    pub fn new(
        character: Character,
        dialogue_manager: Arc<DialogueManager>,
        stt_provider: Arc<dyn SpeechToTextProvider>,
        tts_provider: Arc<dyn TextToSpeechProvider>,
    ) -> Self {
        Self {
            dialogue_session: DialogueSession::new(character),
            dialogue_manager,
            stt_provider,
            tts_provider,
            speaker_id: VoicevoxSpeaker::ZundamonNormal.id(), // デフォルト
            output_dir: PathBuf::from("./audio_output"),
        }
    }

    /// スピーカーIDを設定
    pub fn with_speaker(mut self, speaker: VoicevoxSpeaker) -> Self {
        self.speaker_id = speaker.id();
        self
    }

    /// 出力ディレクトリを設定
    pub fn with_output_dir(mut self, dir: impl Into<PathBuf>) -> Self {
        self.output_dir = dir.into();
        self
    }

    /// 音声ファイルから対話を実行
    pub async fn process_audio_file(&mut self, audio_file: &Path) -> Result<AudioDialogueResult> {
        // 1. 音声認識（音声→テキスト）
        let transcription = self
            .stt_provider
            .transcribe(audio_file)
            .await
            .context("Failed to transcribe audio")?;

        let user_text = transcription.text.clone();

        // 2. LLM対話（テキスト→テキスト）
        let assistant_text = self
            .dialogue_manager
            .chat(&mut self.dialogue_session, user_text.clone())
            .await
            .context("Failed to get LLM response")?;

        // 3. 音声合成（テキスト→音声）
        let audio_output_path = self.generate_output_path();
        self.ensure_output_dir_exists().await?;

        self.tts_provider
            .save_to_file(&assistant_text, self.speaker_id, &audio_output_path)
            .await
            .context("Failed to synthesize speech")?;

        Ok(AudioDialogueResult {
            user_text,
            assistant_text,
            audio_output_path,
            transcription_language: transcription.language,
        })
    }

    /// テキストから音声応答を生成
    pub async fn process_text(&mut self, user_text: String) -> Result<AudioDialogueResult> {
        // 1. LLM対話（テキスト→テキスト）
        let assistant_text = self
            .dialogue_manager
            .chat(&mut self.dialogue_session, user_text.clone())
            .await
            .context("Failed to get LLM response")?;

        // 2. 音声合成（テキスト→音声）
        let audio_output_path = self.generate_output_path();
        self.ensure_output_dir_exists().await?;

        self.tts_provider
            .save_to_file(&assistant_text, self.speaker_id, &audio_output_path)
            .await
            .context("Failed to synthesize speech")?;

        Ok(AudioDialogueResult {
            user_text,
            assistant_text,
            audio_output_path,
            transcription_language: None,
        })
    }

    /// 出力ファイルパスを生成
    fn generate_output_path(&self) -> PathBuf {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S");
        let message_count = self.dialogue_session.messages.len();
        self.output_dir
            .join(format!("response_{}_{}.wav", timestamp, message_count))
    }

    /// 出力ディレクトリが存在することを確認
    async fn ensure_output_dir_exists(&self) -> Result<()> {
        if !self.output_dir.exists() {
            tokio::fs::create_dir_all(&self.output_dir)
                .await
                .context("Failed to create output directory")?;
        }
        Ok(())
    }

    /// セッションをクリア
    pub fn clear_session(&mut self) {
        self.dialogue_session.clear_history();
    }
}

/// 音声対話結果
#[derive(Debug, Clone)]
pub struct AudioDialogueResult {
    /// ユーザーのテキスト
    pub user_text: String,
    /// アシスタントのテキスト
    pub assistant_text: String,
    /// 生成された音声ファイルのパス
    pub audio_output_path: PathBuf,
    /// 認識された言語（音声入力の場合のみ）
    pub transcription_language: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::character::{
        ConversationStyle, EmpathyPattern, EnergyAxis, JudgmentAxis, LifestyleAxis, MBTIType,
        PerceptionAxis, PersonalityAxes,
    };
    use crate::llm::MockLLMProvider;
    use crate::speech::{MockSpeechToTextProvider, MockTextToSpeechProvider};

    fn create_test_character() -> Character {
        Character {
            mbti_type: MBTIType::ENFP,
            name: "エネ".to_string(),
            nickname: "エネちゃん".to_string(),
            axes: PersonalityAxes {
                energy: EnergyAxis::Extraverted,
                perception: PerceptionAxis::Intuitive,
                judgment: JudgmentAxis::Feeling,
                lifestyle: LifestyleAxis::Perceiving,
            },
            traits: vec!["明るい".to_string()],
            strengths: vec!["創造性".to_string()],
            conversation_style: ConversationStyle {
                formality: 20,
                emotionality: 90,
                logic_focus: 50,
                empathy: 90,
            },
            empathy_pattern: EmpathyPattern {
                encouragement_style: "明るく励ます".to_string(),
                advice_style: "柔軟に提案".to_string(),
                support_style: "寄り添う".to_string(),
            },
        }
    }

    #[tokio::test]
    async fn test_voice_dialogue_session_creation() {
        let character = create_test_character();
        let llm_provider = Arc::new(MockLLMProvider::new("元気だよ！"));
        let dialogue_manager = Arc::new(DialogueManager::new(llm_provider));
        let stt_provider: Arc<dyn SpeechToTextProvider> =
            Arc::new(MockSpeechToTextProvider::new("元気？"));
        let tts_provider: Arc<dyn TextToSpeechProvider> = Arc::new(MockTextToSpeechProvider);

        let session = VoiceDialogueSession::new(
            character,
            dialogue_manager,
            stt_provider,
            tts_provider,
        );

        assert_eq!(session.speaker_id, VoicevoxSpeaker::ZundamonNormal.id());
    }

    #[tokio::test]
    async fn test_process_text() {
        let character = create_test_character();
        let llm_provider = Arc::new(MockLLMProvider::new("こんにちは！元気だよ！"));
        let dialogue_manager = Arc::new(DialogueManager::new(llm_provider));
        let stt_provider: Arc<dyn SpeechToTextProvider> =
            Arc::new(MockSpeechToTextProvider::new(""));
        let tts_provider: Arc<dyn TextToSpeechProvider> = Arc::new(MockTextToSpeechProvider);

        let mut session = VoiceDialogueSession::new(
            character,
            dialogue_manager,
            stt_provider,
            tts_provider,
        )
        .with_output_dir("/tmp/test_voice_output");

        let result = session.process_text("元気？".to_string()).await.unwrap();

        assert_eq!(result.user_text, "元気？");
        assert_eq!(result.assistant_text, "こんにちは！元気だよ！");
        assert!(result.audio_output_path.exists());
        assert!(result.transcription_language.is_none());

        // Cleanup
        let _ = tokio::fs::remove_dir_all("/tmp/test_voice_output").await;
    }

    #[tokio::test]
    async fn test_process_audio_file() {
        let character = create_test_character();
        let llm_provider = Arc::new(MockLLMProvider::new("元気だよ！"));
        let dialogue_manager = Arc::new(DialogueManager::new(llm_provider));
        let stt_provider: Arc<dyn SpeechToTextProvider> =
            Arc::new(MockSpeechToTextProvider::new("元気？"));
        let tts_provider: Arc<dyn TextToSpeechProvider> = Arc::new(MockTextToSpeechProvider);

        let mut session = VoiceDialogueSession::new(
            character,
            dialogue_manager,
            stt_provider,
            tts_provider,
        )
        .with_output_dir("/tmp/test_voice_output2");

        // ダミー音声ファイル作成
        let input_audio = PathBuf::from("/tmp/test_input.wav");
        tokio::fs::write(&input_audio, b"dummy audio").await.unwrap();

        let result = session.process_audio_file(&input_audio).await.unwrap();

        assert_eq!(result.user_text, "元気？");
        assert_eq!(result.assistant_text, "元気だよ！");
        assert!(result.audio_output_path.exists());
        assert_eq!(result.transcription_language, Some("ja".to_string()));

        // Cleanup
        let _ = tokio::fs::remove_file(&input_audio).await;
        let _ = tokio::fs::remove_dir_all("/tmp/test_voice_output2").await;
    }

    #[tokio::test]
    async fn test_speaker_configuration() {
        let character = create_test_character();
        let llm_provider = Arc::new(MockLLMProvider::new("テスト"));
        let dialogue_manager = Arc::new(DialogueManager::new(llm_provider));
        let stt_provider: Arc<dyn SpeechToTextProvider> =
            Arc::new(MockSpeechToTextProvider::new(""));
        let tts_provider: Arc<dyn TextToSpeechProvider> = Arc::new(MockTextToSpeechProvider);

        let session = VoiceDialogueSession::new(
            character,
            dialogue_manager,
            stt_provider,
            tts_provider,
        )
        .with_speaker(VoicevoxSpeaker::MetanNormal);

        assert_eq!(session.speaker_id, VoicevoxSpeaker::MetanNormal.id());
    }
}
