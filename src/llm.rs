// LLM抽象化層 - Anthropic Claude API統合

use anyhow::{Context, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::env;

/// LLMメッセージの役割
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Role {
    System,
    User,
    Assistant,
}

/// LLMメッセージ
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: Role,
    pub content: String,
}

impl Message {
    pub fn system(content: impl Into<String>) -> Self {
        Self {
            role: Role::System,
            content: content.into(),
        }
    }

    pub fn user(content: impl Into<String>) -> Self {
        Self {
            role: Role::User,
            content: content.into(),
        }
    }

    pub fn assistant(content: impl Into<String>) -> Self {
        Self {
            role: Role::Assistant,
            content: content.into(),
        }
    }
}

/// LLMリクエストパラメータ
#[derive(Debug, Clone)]
pub struct LLMRequest {
    pub messages: Vec<Message>,
    pub max_tokens: u32,
    pub temperature: f32,
    pub model: String,
}

impl Default for LLMRequest {
    fn default() -> Self {
        Self {
            messages: Vec::new(),
            max_tokens: 4096,
            temperature: 0.7,
            model: "claude-3-5-sonnet-20241022".to_string(),
        }
    }
}

impl LLMRequest {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn with_messages(mut self, messages: Vec<Message>) -> Self {
        self.messages = messages;
        self
    }

    pub fn add_message(mut self, message: Message) -> Self {
        self.messages.push(message);
        self
    }

    pub fn with_max_tokens(mut self, max_tokens: u32) -> Self {
        self.max_tokens = max_tokens;
        self
    }

    pub fn with_temperature(mut self, temperature: f32) -> Self {
        self.temperature = temperature;
        self
    }

    pub fn with_model(mut self, model: impl Into<String>) -> Self {
        self.model = model.into();
        self
    }
}

/// LLMレスポンス
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMResponse {
    pub content: String,
    pub model: String,
    pub usage: Usage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Usage {
    pub input_tokens: u32,
    pub output_tokens: u32,
}

/// LLMプロバイダートレイト
#[async_trait]
pub trait LLMProvider: Send + Sync {
    async fn chat(&self, request: LLMRequest) -> Result<LLMResponse>;
}

/// Anthropic Claude APIクライアント
pub struct AnthropicClient {
    api_key: String,
    http_client: reqwest::Client,
    base_url: String,
}

impl AnthropicClient {
    pub fn new() -> Result<Self> {
        let api_key = env::var("ANTHROPIC_API_KEY")
            .context("ANTHROPIC_API_KEY environment variable not set")?;

        Ok(Self {
            api_key,
            http_client: reqwest::Client::new(),
            base_url: "https://api.anthropic.com/v1".to_string(),
        })
    }

    pub fn with_api_key(api_key: String) -> Self {
        Self {
            api_key,
            http_client: reqwest::Client::new(),
            base_url: "https://api.anthropic.com/v1".to_string(),
        }
    }
}

#[async_trait]
impl LLMProvider for AnthropicClient {
    async fn chat(&self, request: LLMRequest) -> Result<LLMResponse> {
        // Anthropic APIはsystemメッセージを分離する
        let system_message = request
            .messages
            .iter()
            .find(|m| m.role == Role::System)
            .map(|m| m.content.clone());

        let messages: Vec<_> = request
            .messages
            .iter()
            .filter(|m| m.role != Role::System)
            .map(|m| {
                serde_json::json!({
                    "role": match m.role {
                        Role::User => "user",
                        Role::Assistant => "assistant",
                        Role::System => "user", // fallback
                    },
                    "content": m.content,
                })
            })
            .collect();

        let mut body = serde_json::json!({
            "model": request.model,
            "messages": messages,
            "max_tokens": request.max_tokens,
            "temperature": request.temperature,
        });

        if let Some(system) = system_message {
            body["system"] = serde_json::json!(system);
        }

        let response = self
            .http_client
            .post(format!("{}/messages", self.base_url))
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .context("Failed to send request to Anthropic API")?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Anthropic API error ({}): {}", status, error_text);
        }

        let response_json: serde_json::Value = response
            .json()
            .await
            .context("Failed to parse Anthropic API response")?;

        let content = response_json["content"][0]["text"]
            .as_str()
            .context("Missing content in response")?
            .to_string();

        let usage = Usage {
            input_tokens: response_json["usage"]["input_tokens"]
                .as_u64()
                .unwrap_or(0) as u32,
            output_tokens: response_json["usage"]["output_tokens"]
                .as_u64()
                .unwrap_or(0) as u32,
        };

        Ok(LLMResponse {
            content,
            model: response_json["model"]
                .as_str()
                .unwrap_or(&request.model)
                .to_string(),
            usage,
        })
    }
}

/// モックLLMプロバイダー (テスト用)
pub struct MockLLMProvider {
    pub canned_response: String,
}

impl MockLLMProvider {
    pub fn new(response: impl Into<String>) -> Self {
        Self {
            canned_response: response.into(),
        }
    }
}

#[async_trait]
impl LLMProvider for MockLLMProvider {
    async fn chat(&self, _request: LLMRequest) -> Result<LLMResponse> {
        Ok(LLMResponse {
            content: self.canned_response.clone(),
            model: "mock-model".to_string(),
            usage: Usage {
                input_tokens: 100,
                output_tokens: 50,
            },
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_mock_provider() {
        let provider = MockLLMProvider::new("Hello, test!");

        let request = LLMRequest::new()
            .add_message(Message::user("Hi"));

        let response = provider.chat(request).await.unwrap();
        assert_eq!(response.content, "Hello, test!");
        assert_eq!(response.model, "mock-model");
    }

    #[test]
    fn test_message_builders() {
        let system_msg = Message::system("You are a helpful assistant");
        assert_eq!(system_msg.role, Role::System);
        assert_eq!(system_msg.content, "You are a helpful assistant");

        let user_msg = Message::user("Hello");
        assert_eq!(user_msg.role, Role::User);

        let assistant_msg = Message::assistant("Hi there");
        assert_eq!(assistant_msg.role, Role::Assistant);
    }

    #[test]
    fn test_llm_request_builder() {
        let request = LLMRequest::new()
            .with_model("claude-3-5-sonnet-20241022")
            .with_max_tokens(2000)
            .with_temperature(0.5)
            .add_message(Message::user("Test"));

        assert_eq!(request.messages.len(), 1);
        assert_eq!(request.max_tokens, 2000);
        assert_eq!(request.temperature, 0.5);
        assert_eq!(request.model, "claude-3-5-sonnet-20241022");
    }
}
