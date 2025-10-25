// Twitter API v2統合

use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::env;

/// ツイート
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Tweet {
    pub id: String,
    pub text: String,
    pub author_id: String,
    pub created_at: Option<String>,
    pub lang: Option<String>,
}

/// ユーザー情報
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TwitterUser {
    pub id: String,
    pub username: String,
    pub name: String,
}

/// Twitter APIプロバイダートレイト
#[async_trait]
pub trait TwitterProvider: Send + Sync {
    /// ユーザーのタイムラインを取得
    async fn get_user_timeline(&self, user_id: &str, max_results: u32) -> Result<Vec<Tweet>>;

    /// ツイートを投稿
    async fn post_tweet(&self, text: &str) -> Result<Tweet>;

    /// リプライを送信
    async fn reply_to_tweet(&self, tweet_id: &str, text: &str) -> Result<Tweet>;

    /// メンションを取得
    async fn get_mentions(&self, user_id: &str, max_results: u32) -> Result<Vec<Tweet>>;
}

/// Twitter API v2 クライアント
pub struct TwitterClient {
    bearer_token: String,
    http_client: reqwest::Client,
    base_url: String,
}

impl TwitterClient {
    /// 新しいTwitterクライアントを作成
    pub fn new() -> Result<Self> {
        let bearer_token = env::var("TWITTER_BEARER_TOKEN")
            .context("TWITTER_BEARER_TOKEN environment variable not set")?;

        Ok(Self {
            bearer_token,
            http_client: reqwest::Client::new(),
            base_url: "https://api.twitter.com/2".to_string(),
        })
    }

    /// Bearer Tokenを指定してクライアントを作成
    pub fn with_bearer_token(bearer_token: String) -> Self {
        Self {
            bearer_token,
            http_client: reqwest::Client::new(),
            base_url: "https://api.twitter.com/2".to_string(),
        }
    }
}

#[async_trait]
impl TwitterProvider for TwitterClient {
    async fn get_user_timeline(&self, user_id: &str, max_results: u32) -> Result<Vec<Tweet>> {
        let url = format!("{}/users/{}/tweets", self.base_url, user_id);

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.bearer_token)
            .query(&[
                ("max_results", max_results.to_string()),
                ("tweet.fields", "created_at,lang".to_string()),
            ])
            .send()
            .await
            .context("Failed to get user timeline")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Twitter API error ({}): {}", status, error_text);
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse Twitter API response")?;

        let tweets: Vec<Tweet> = response_json["data"]
            .as_array()
            .context("No tweets in response")?
            .iter()
            .filter_map(|t| serde_json::from_value(t.clone()).ok())
            .collect();

        Ok(tweets)
    }

    async fn post_tweet(&self, text: &str) -> Result<Tweet> {
        let url = format!("{}/tweets", self.base_url);

        let body = serde_json::json!({
            "text": text
        });

        let response = self
            .http_client
            .post(&url)
            .bearer_auth(&self.bearer_token)
            .json(&body)
            .send()
            .await
            .context("Failed to post tweet")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Twitter API error ({}): {}", status, error_text);
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse Twitter API response")?;

        let tweet: Tweet = serde_json::from_value(response_json["data"].clone())
            .context("Failed to parse tweet")?;

        Ok(tweet)
    }

    async fn reply_to_tweet(&self, tweet_id: &str, text: &str) -> Result<Tweet> {
        let url = format!("{}/tweets", self.base_url);

        let body = serde_json::json!({
            "text": text,
            "reply": {
                "in_reply_to_tweet_id": tweet_id
            }
        });

        let response = self
            .http_client
            .post(&url)
            .bearer_auth(&self.bearer_token)
            .json(&body)
            .send()
            .await
            .context("Failed to reply to tweet")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Twitter API error ({}): {}", status, error_text);
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse Twitter API response")?;

        let tweet: Tweet = serde_json::from_value(response_json["data"].clone())
            .context("Failed to parse tweet")?;

        Ok(tweet)
    }

    async fn get_mentions(&self, user_id: &str, max_results: u32) -> Result<Vec<Tweet>> {
        let url = format!("{}/users/{}/mentions", self.base_url, user_id);

        let response = self
            .http_client
            .get(&url)
            .bearer_auth(&self.bearer_token)
            .query(&[
                ("max_results", max_results.to_string()),
                ("tweet.fields", "created_at,lang".to_string()),
            ])
            .send()
            .await
            .context("Failed to get mentions")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Twitter API error ({}): {}", status, error_text);
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse Twitter API response")?;

        let tweets: Vec<Tweet> = response_json["data"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .filter_map(|t| serde_json::from_value(t.clone()).ok())
            .collect();

        Ok(tweets)
    }
}

/// モックTwitterプロバイダー（テスト用）
pub struct MockTwitterProvider {
    pub mock_tweets: Vec<Tweet>,
}

impl MockTwitterProvider {
    pub fn new() -> Self {
        Self {
            mock_tweets: vec![
                Tweet {
                    id: "1".to_string(),
                    text: "今日はちょっと疲れた...".to_string(),
                    author_id: "user123".to_string(),
                    created_at: Some("2025-10-25T12:00:00Z".to_string()),
                    lang: Some("ja".to_string()),
                },
                Tweet {
                    id: "2".to_string(),
                    text: "素晴らしい一日だった！".to_string(),
                    author_id: "user123".to_string(),
                    created_at: Some("2025-10-25T13:00:00Z".to_string()),
                    lang: Some("ja".to_string()),
                },
            ],
        }
    }
}

impl Default for MockTwitterProvider {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl TwitterProvider for MockTwitterProvider {
    async fn get_user_timeline(&self, _user_id: &str, max_results: u32) -> Result<Vec<Tweet>> {
        Ok(self
            .mock_tweets
            .iter()
            .take(max_results as usize)
            .cloned()
            .collect())
    }

    async fn post_tweet(&self, text: &str) -> Result<Tweet> {
        Ok(Tweet {
            id: "mock_tweet_id".to_string(),
            text: text.to_string(),
            author_id: "bot_user".to_string(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            lang: Some("ja".to_string()),
        })
    }

    async fn reply_to_tweet(&self, tweet_id: &str, text: &str) -> Result<Tweet> {
        Ok(Tweet {
            id: format!("reply_to_{}", tweet_id),
            text: text.to_string(),
            author_id: "bot_user".to_string(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            lang: Some("ja".to_string()),
        })
    }

    async fn get_mentions(&self, _user_id: &str, _max_results: u32) -> Result<Vec<Tweet>> {
        Ok(vec![Tweet {
            id: "mention_1".to_string(),
            text: "@bot_user 元気？".to_string(),
            author_id: "user456".to_string(),
            created_at: Some(chrono::Utc::now().to_rfc3339()),
            lang: Some("ja".to_string()),
        }])
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_get_timeline() {
        let provider = MockTwitterProvider::new();
        let tweets = provider.get_user_timeline("user123", 10).await.unwrap();

        assert_eq!(tweets.len(), 2);
        assert_eq!(tweets[0].text, "今日はちょっと疲れた...");
    }

    #[tokio::test]
    async fn test_mock_post_tweet() {
        let provider = MockTwitterProvider::new();
        let tweet = provider.post_tweet("テストツイート").await.unwrap();

        assert_eq!(tweet.text, "テストツイート");
        assert_eq!(tweet.author_id, "bot_user");
    }

    #[tokio::test]
    async fn test_mock_reply() {
        let provider = MockTwitterProvider::new();
        let tweet = provider
            .reply_to_tweet("123", "返信テスト")
            .await
            .unwrap();

        assert_eq!(tweet.text, "返信テスト");
        assert!(tweet.id.starts_with("reply_to_"));
    }

    #[tokio::test]
    async fn test_mock_get_mentions() {
        let provider = MockTwitterProvider::new();
        let mentions = provider.get_mentions("bot_user", 10).await.unwrap();

        assert_eq!(mentions.len(), 1);
        assert!(mentions[0].text.contains("@bot_user"));
    }
}
