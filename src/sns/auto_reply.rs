// 自動応答システム

use crate::character::Character;
use crate::dialogue::DialogueManager;
use crate::sns::{Sentiment, SentimentAnalysis, SentimentAnalyzer, Tweet, TwitterProvider};
use anyhow::Result;
use std::sync::Arc;

/// 自動応答設定
#[derive(Debug, Clone)]
pub struct AutoReplyConfig {
    /// 応答を送信する最小緊急度 (0.0-1.0)
    pub min_urgency: f32,
    /// 応答間隔（秒）
    pub reply_interval_seconds: u64,
    /// 最大応答数/時間
    pub max_replies_per_hour: u32,
    /// スパム防止: 同じユーザーへの連続応答制限
    pub max_consecutive_replies_per_user: u32,
}

impl Default for AutoReplyConfig {
    fn default() -> Self {
        Self {
            min_urgency: 0.7,                   // ネガティブ以上で応答
            reply_interval_seconds: 300,        // 5分間隔
            max_replies_per_hour: 10,           // 1時間に最大10件
            max_consecutive_replies_per_user: 2, // 同じユーザーに最大2回まで
        }
    }
}

/// 応答履歴
#[derive(Debug, Clone)]
pub struct ReplyHistory {
    pub tweet_id: String,
    pub user_id: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// 自動応答マネージャー
pub struct AutoReplyManager {
    character: Character,
    #[allow(dead_code)] // 将来的にLLM統合で使用
    dialogue_manager: Arc<DialogueManager>,
    sentiment_analyzer: SentimentAnalyzer,
    twitter_provider: Arc<dyn TwitterProvider>,
    config: AutoReplyConfig,
    reply_history: Vec<ReplyHistory>,
}

impl AutoReplyManager {
    /// 新しい自動応答マネージャーを作成
    pub fn new(
        character: Character,
        dialogue_manager: Arc<DialogueManager>,
        twitter_provider: Arc<dyn TwitterProvider>,
    ) -> Self {
        Self {
            character,
            dialogue_manager,
            sentiment_analyzer: SentimentAnalyzer::new(),
            twitter_provider,
            config: AutoReplyConfig::default(),
            reply_history: Vec::new(),
        }
    }

    /// 設定をカスタマイズ
    pub fn with_config(mut self, config: AutoReplyConfig) -> Self {
        self.config = config;
        self
    }

    /// ツイートを分析して応答が必要か判定
    pub fn should_reply(&self, analysis: &SentimentAnalysis) -> bool {
        analysis.sentiment.urgency() >= self.config.min_urgency
    }

    /// 応答履歴をチェック（レート制限）
    pub fn check_rate_limit(&self) -> bool {
        let now = chrono::Utc::now();
        let one_hour_ago = now - chrono::Duration::hours(1);

        let recent_replies = self
            .reply_history
            .iter()
            .filter(|h| h.timestamp > one_hour_ago)
            .count();

        recent_replies < self.config.max_replies_per_hour as usize
    }

    /// 同じユーザーへの連続応答をチェック
    pub fn check_user_limit(&self, user_id: &str) -> bool {
        let consecutive_count = self
            .reply_history
            .iter()
            .rev()
            .take_while(|h| h.user_id == user_id)
            .count();

        consecutive_count < self.config.max_consecutive_replies_per_user as usize
    }

    /// ツイートを分析
    pub fn analyze_tweet(&self, tweet: &Tweet) -> Result<SentimentAnalysis> {
        self.sentiment_analyzer.analyze(&tweet.text)
    }

    /// 応答メッセージを生成
    pub async fn generate_reply(
        &self,
        _tweet: &Tweet,
        analysis: &SentimentAnalysis,
    ) -> Result<String> {
        // 感情に応じたコンテキストを構築
        let _context = match analysis.sentiment {
            Sentiment::VeryNegative => {
                "ユーザーは非常に辛い状況にいるようです。温かく寄り添ってください。"
            }
            Sentiment::Negative => "ユーザーは落ち込んでいるようです。優しく励ましてください。",
            Sentiment::Neutral => "ユーザーの投稿に共感を示してください。",
            Sentiment::Positive => "ユーザーの喜びを一緒に祝福してください。",
            Sentiment::VeryPositive => "ユーザーの素晴らしい気分を一緒に楽しんでください。",
        };

        // 将来的にLLMで応答生成する際に使用
        // let prompt = format!(
        //     "{}\n\nツイート内容: 「{}」\n\n短く（140文字以内）、{}のスタイルで応答してください。",
        //     context,
        //     tweet.text,
        //     self.character.name
        // );

        // 現在はモックとして固定応答
        let reply = match analysis.sentiment {
            Sentiment::VeryNegative | Sentiment::Negative => {
                format!("{}、大丈夫？辛いときは無理しないでね。いつでも話聞くよ！", self.character.nickname)
            }
            Sentiment::Neutral => {
                format!("{}だね！一緒に頑張ろう！", self.character.nickname)
            }
            Sentiment::Positive | Sentiment::VeryPositive => {
                "やったね！一緒に喜んでるよ！".to_string()
            }
        };

        Ok(reply)
    }

    /// 自動応答を実行
    pub async fn auto_reply(&mut self, tweet: &Tweet) -> Result<Option<Tweet>> {
        // 1. 感情分析
        let analysis = self.analyze_tweet(tweet)?;

        // 2. 応答が必要かチェック
        if !self.should_reply(&analysis) {
            return Ok(None);
        }

        // 3. レート制限チェック
        if !self.check_rate_limit() {
            return Ok(None);
        }

        // 4. ユーザー制限チェック
        if !self.check_user_limit(&tweet.author_id) {
            return Ok(None);
        }

        // 5. 応答メッセージ生成
        let reply_text = self.generate_reply(tweet, &analysis).await?;

        // 6. Twitter APIで応答送信
        let reply_tweet = self
            .twitter_provider
            .reply_to_tweet(&tweet.id, &reply_text)
            .await?;

        // 7. 履歴に記録
        self.reply_history.push(ReplyHistory {
            tweet_id: reply_tweet.id.clone(),
            user_id: tweet.author_id.clone(),
            timestamp: chrono::Utc::now(),
        });

        Ok(Some(reply_tweet))
    }

    /// タイムラインを監視して自動応答
    pub async fn monitor_and_reply(&mut self, user_id: &str, max_results: u32) -> Result<Vec<Tweet>> {
        let tweets = self
            .twitter_provider
            .get_user_timeline(user_id, max_results)
            .await?;

        let mut replies = Vec::new();

        for tweet in tweets {
            if let Ok(Some(reply)) = self.auto_reply(&tweet).await {
                replies.push(reply);
            }
        }

        Ok(replies)
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
    use crate::sns::MockTwitterProvider;

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
    async fn test_auto_reply_manager_creation() {
        let character = create_test_character();
        let mock_llm = Arc::new(MockLLMProvider::new("元気だよ！"));
        let dialogue_mgr = Arc::new(DialogueManager::new(mock_llm));
        let twitter: Arc<dyn TwitterProvider> = Arc::new(MockTwitterProvider::new());

        let manager = AutoReplyManager::new(character, dialogue_mgr, twitter);
        assert_eq!(manager.config.min_urgency, 0.7);
    }

    #[tokio::test]
    async fn test_should_reply() {
        let character = create_test_character();
        let mock_llm = Arc::new(MockLLMProvider::new("元気だよ！"));
        let dialogue_mgr = Arc::new(DialogueManager::new(mock_llm));
        let twitter: Arc<dyn TwitterProvider> = Arc::new(MockTwitterProvider::new());

        let manager = AutoReplyManager::new(character, dialogue_mgr, twitter);

        let negative_analysis = SentimentAnalysis {
            sentiment: Sentiment::Negative,
            score: -0.5,
            confidence: 0.8,
            keywords: vec!["疲れ".to_string()],
        };

        assert!(manager.should_reply(&negative_analysis));

        let positive_analysis = SentimentAnalysis {
            sentiment: Sentiment::Positive,
            score: 0.5,
            confidence: 0.8,
            keywords: vec!["嬉しい".to_string()],
        };

        assert!(!manager.should_reply(&positive_analysis));
    }

    #[tokio::test]
    async fn test_generate_reply() {
        let character = create_test_character();
        let mock_llm = Arc::new(MockLLMProvider::new("元気だよ！"));
        let dialogue_mgr = Arc::new(DialogueManager::new(mock_llm));
        let twitter: Arc<dyn TwitterProvider> = Arc::new(MockTwitterProvider::new());

        let manager = AutoReplyManager::new(character, dialogue_mgr, twitter);

        let tweet = Tweet {
            id: "1".to_string(),
            text: "今日は疲れた...".to_string(),
            author_id: "user123".to_string(),
            created_at: None,
            lang: Some("ja".to_string()),
        };

        let analysis = manager.analyze_tweet(&tweet).unwrap();
        let reply = manager.generate_reply(&tweet, &analysis).await.unwrap();

        assert!(reply.contains("エネちゃん"));
        assert!(reply.len() <= 140);
    }

    #[tokio::test]
    async fn test_rate_limit() {
        let character = create_test_character();
        let mock_llm = Arc::new(MockLLMProvider::new("元気だよ！"));
        let dialogue_mgr = Arc::new(DialogueManager::new(mock_llm));
        let twitter: Arc<dyn TwitterProvider> = Arc::new(MockTwitterProvider::new());

        let manager = AutoReplyManager::new(character, dialogue_mgr, twitter);

        assert!(manager.check_rate_limit());
    }
}
