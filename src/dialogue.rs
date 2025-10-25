// 対話セッション管理

use crate::character::Character;
use crate::llm::{LLMProvider, LLMRequest, LLMResponse, Message, Role};
use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::sync::Arc;
use uuid::Uuid;

/// 対話セッション
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogueSession {
    /// セッションID
    pub id: Uuid,
    /// キャラクター
    pub character: Character,
    /// メッセージ履歴
    pub messages: Vec<DialogueMessage>,
    /// セッション作成日時
    pub created_at: DateTime<Utc>,
    /// 最終更新日時
    pub updated_at: DateTime<Utc>,
    /// メタデータ
    pub metadata: SessionMetadata,
}

/// 対話メッセージ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogueMessage {
    pub role: Role,
    pub content: String,
    pub timestamp: DateTime<Utc>,
    pub tokens: Option<u32>,
}

/// セッションメタデータ
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SessionMetadata {
    /// 総トークン数
    pub total_tokens: u32,
    /// メッセージ数
    pub message_count: u32,
    /// 平均トークン数/メッセージ
    pub avg_tokens_per_message: f32,
}

impl DialogueSession {
    /// 新しいセッションを作成
    pub fn new(character: Character) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            character,
            messages: Vec::new(),
            created_at: now,
            updated_at: now,
            metadata: SessionMetadata::default(),
        }
    }

    /// システムプロンプトを取得
    pub fn system_prompt(&self) -> String {
        format!(
            "あなたは{}です。ニックネームは「{}」です。\n\
            あなたの性格タイプはMBTI {}（{}）です。\n\n\
            性格特性:\n{}\n\n\
            会話スタイル:\n\
            - フォーマル度: {}/100\n\
            - 感情表現度: {}/100\n\
            - 論理性: {}/100\n\
            - 共感度: {}/100\n\n\
            共感パターン:\n\
            - 励まし方: {}\n\
            - アドバイスの仕方: {}\n\
            - 寄り添い方: {}\n\n\
            上記の性格特性と会話スタイルに従って、ユーザーの親友として対話してください。\n\
            ユーザーの感情に寄り添い、適切なタイミングでアドバイスを提供してください。",
            self.character.name,
            self.character.nickname,
            self.character.mbti_type,
            self.character.mbti_type.japanese_name(),
            self.character
                .traits
                .iter()
                .map(|t| format!("- {}", t))
                .collect::<Vec<_>>()
                .join("\n"),
            self.character.conversation_style.formality,
            self.character.conversation_style.emotionality,
            self.character.conversation_style.logic_focus,
            self.character.conversation_style.empathy,
            self.character.empathy_pattern.encouragement_style,
            self.character.empathy_pattern.advice_style,
            self.character.empathy_pattern.support_style,
        )
    }

    /// ユーザーメッセージを追加
    pub fn add_user_message(&mut self, content: String) {
        let message = DialogueMessage {
            role: Role::User,
            content,
            timestamp: Utc::now(),
            tokens: None,
        };
        self.messages.push(message);
        self.updated_at = Utc::now();
        self.metadata.message_count += 1;
    }

    /// アシスタントメッセージを追加
    pub fn add_assistant_message(&mut self, content: String, tokens: Option<u32>) {
        let message = DialogueMessage {
            role: Role::Assistant,
            content,
            timestamp: Utc::now(),
            tokens,
        };
        self.messages.push(message);
        self.updated_at = Utc::now();
        self.metadata.message_count += 1;

        if let Some(t) = tokens {
            self.metadata.total_tokens += t;
            self.metadata.avg_tokens_per_message =
                self.metadata.total_tokens as f32 / self.metadata.message_count as f32;
        }
    }

    /// LLMリクエストを構築（最大コンテキスト長を考慮）
    pub fn build_llm_request(&self, max_context_messages: usize) -> LLMRequest {
        let system_msg = Message::system(self.system_prompt());

        // 最新のN件のメッセージのみ使用
        let recent_messages: Vec<Message> = self
            .messages
            .iter()
            .rev()
            .take(max_context_messages)
            .rev()
            .map(|m| Message {
                role: m.role.clone(),
                content: m.content.clone(),
            })
            .collect();

        let mut messages = vec![system_msg];
        messages.extend(recent_messages);

        LLMRequest::new().with_messages(messages)
    }

    /// 会話履歴をクリア
    pub fn clear_history(&mut self) {
        self.messages.clear();
        self.metadata = SessionMetadata::default();
        self.updated_at = Utc::now();
    }

    /// セッションをJSONファイルに保存
    pub fn save(&self, path: impl AsRef<Path>) -> Result<()> {
        let json = serde_json::to_string_pretty(self)
            .context("Failed to serialize session to JSON")?;
        std::fs::write(path, json).context("Failed to write session to file")?;
        Ok(())
    }

    /// セッションをJSONファイルから読み込み
    pub fn load(path: impl AsRef<Path>) -> Result<Self> {
        let json = std::fs::read_to_string(path).context("Failed to read session file")?;
        let session = serde_json::from_str(&json)
            .context("Failed to deserialize session from JSON")?;
        Ok(session)
    }
}

/// 対話マネージャー
pub struct DialogueManager {
    llm_provider: Arc<dyn LLMProvider>,
    max_context_messages: usize,
}

impl DialogueManager {
    /// 新しい対話マネージャーを作成
    pub fn new(llm_provider: Arc<dyn LLMProvider>) -> Self {
        Self {
            llm_provider,
            max_context_messages: 20, // デフォルトで最新20メッセージ
        }
    }

    /// コンテキストメッセージ数を設定
    pub fn with_max_context_messages(mut self, max: usize) -> Self {
        self.max_context_messages = max;
        self
    }

    /// 対話を実行
    pub async fn chat(
        &self,
        session: &mut DialogueSession,
        user_input: String,
    ) -> Result<String> {
        // ユーザーメッセージを追加
        session.add_user_message(user_input);

        // LLMリクエストを構築
        let request = session.build_llm_request(self.max_context_messages);

        // LLMを呼び出し
        let response: LLMResponse = self
            .llm_provider
            .chat(request)
            .await
            .context("Failed to get LLM response")?;

        // アシスタントメッセージを追加
        session.add_assistant_message(response.content.clone(), Some(response.usage.output_tokens));

        Ok(response.content)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::character::{
        ConversationStyle, EmpathyPattern, EnergyAxis, JudgmentAxis, LifestyleAxis, MBTIType,
        PerceptionAxis, PersonalityAxes,
    };
    use crate::llm::MockLLMProvider;

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
            traits: vec!["明るい".to_string(), "社交的".to_string()],
            strengths: vec!["創造性".to_string()],
            conversation_style: ConversationStyle {
                formality: 20,
                emotionality: 90,
                logic_focus: 50,
                empathy: 90,
            },
            empathy_pattern: EmpathyPattern {
                encouragement_style: "元気づける".to_string(),
                advice_style: "楽観的に提案".to_string(),
                support_style: "一緒に考える".to_string(),
            },
        }
    }

    #[test]
    fn test_new_session() {
        let character = create_test_character();
        let session = DialogueSession::new(character);

        assert_eq!(session.messages.len(), 0);
        assert_eq!(session.metadata.message_count, 0);
        assert_eq!(session.metadata.total_tokens, 0);
    }

    #[test]
    fn test_add_messages() {
        let character = create_test_character();
        let mut session = DialogueSession::new(character);

        session.add_user_message("こんにちは".to_string());
        assert_eq!(session.messages.len(), 1);
        assert_eq!(session.metadata.message_count, 1);

        session.add_assistant_message("やっほー！".to_string(), Some(10));
        assert_eq!(session.messages.len(), 2);
        assert_eq!(session.metadata.message_count, 2);
        assert_eq!(session.metadata.total_tokens, 10);
    }

    #[test]
    fn test_system_prompt() {
        let character = create_test_character();
        let session = DialogueSession::new(character);

        let prompt = session.system_prompt();
        assert!(prompt.contains("エネ"));
        assert!(prompt.contains("ENFP"));
        assert!(prompt.contains("明るい"));
    }

    #[test]
    fn test_build_llm_request() {
        let character = create_test_character();
        let mut session = DialogueSession::new(character);

        session.add_user_message("テスト".to_string());
        session.add_assistant_message("了解".to_string(), Some(5));

        let request = session.build_llm_request(10);
        // system + user + assistant
        assert_eq!(request.messages.len(), 3);
    }

    #[test]
    fn test_clear_history() {
        let character = create_test_character();
        let mut session = DialogueSession::new(character);

        session.add_user_message("テスト".to_string());
        session.add_assistant_message("了解".to_string(), Some(5));

        session.clear_history();
        assert_eq!(session.messages.len(), 0);
        assert_eq!(session.metadata.message_count, 0);
    }

    #[tokio::test]
    async fn test_dialogue_manager() {
        let character = create_test_character();
        let mut session = DialogueSession::new(character);

        let mock_provider = Arc::new(MockLLMProvider::new("こんにちは！元気だよ！"));
        let manager = DialogueManager::new(mock_provider);

        let response = manager
            .chat(&mut session, "元気？".to_string())
            .await
            .unwrap();

        assert_eq!(response, "こんにちは！元気だよ！");
        assert_eq!(session.messages.len(), 2); // user + assistant
    }

    #[test]
    fn test_save_and_load() {
        let character = create_test_character();
        let mut session = DialogueSession::new(character);
        session.add_user_message("テスト".to_string());

        let temp_path = "/tmp/test_session.json";
        session.save(temp_path).unwrap();

        let loaded_session = DialogueSession::load(temp_path).unwrap();
        assert_eq!(loaded_session.messages.len(), 1);
        assert_eq!(loaded_session.messages[0].content, "テスト");

        // Cleanup
        let _ = std::fs::remove_file(temp_path);
    }
}
