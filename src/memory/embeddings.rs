/// Embeddings Generation Service
///
/// This module provides text-to-vector embedding generation using OpenAI's API.
/// Uses the text-embedding-ada-002 model for 1536-dimensional embeddings.

use anyhow::{Context, Result};
use async_openai::{
    config::OpenAIConfig,
    types::{CreateEmbeddingRequest, EmbeddingInput},
    Client,
};
use tracing::{debug, info};

/// Embedding dimension size (ada-002 model)
const EMBEDDING_DIM: usize = 1536;

/// Embeddings service for converting text to vectors
pub struct EmbeddingsService {
    client: Client<OpenAIConfig>,
    model: String,
}

impl EmbeddingsService {
    /// Create a new embeddings service
    ///
    /// # Arguments
    /// * `api_key` - OpenAI API key
    pub fn new(api_key: String) -> Self {
        let config = OpenAIConfig::new().with_api_key(api_key);
        let client = Client::with_config(config);

        Self {
            client,
            model: "text-embedding-ada-002".to_string(),
        }
    }

    /// Create from environment variable
    pub fn from_env() -> Result<Self> {
        let api_key = std::env::var("OPENAI_API_KEY")
            .context("OPENAI_API_KEY environment variable not set")?;
        Ok(Self::new(api_key))
    }

    /// Generate embedding for a single text
    ///
    /// # Arguments
    /// * `text` - Input text to embed
    ///
    /// # Returns
    /// A 1536-dimensional vector
    pub async fn generate(&self, text: &str) -> Result<Vec<f32>> {
        debug!("Generating embedding for text: {}", text);

        let request = CreateEmbeddingRequest {
            model: self.model.clone(),
            input: EmbeddingInput::String(text.to_string()),
            encoding_format: None,
            user: None,
            dimensions: None,
        };

        let response = self
            .client
            .embeddings()
            .create(request)
            .await
            .context("Failed to generate embedding")?;

        let embedding = response
            .data
            .first()
            .context("No embedding returned")?
            .embedding
            .clone();

        if embedding.len() != EMBEDDING_DIM {
            anyhow::bail!(
                "Unexpected embedding dimension: expected {}, got {}",
                EMBEDDING_DIM,
                embedding.len()
            );
        }

        debug!("Generated {}-dimensional embedding", embedding.len());
        Ok(embedding)
    }

    /// Generate embeddings for multiple texts in batch
    ///
    /// # Arguments
    /// * `texts` - Input texts to embed
    ///
    /// # Returns
    /// Vector of embeddings (1536 dimensions each)
    pub async fn generate_batch(&self, texts: Vec<String>) -> Result<Vec<Vec<f32>>> {
        info!("Generating {} embeddings in batch", texts.len());

        let request = CreateEmbeddingRequest {
            model: self.model.clone(),
            input: EmbeddingInput::StringArray(texts),
            encoding_format: None,
            user: None,
            dimensions: None,
        };

        let response = self
            .client
            .embeddings()
            .create(request)
            .await
            .context("Failed to generate embeddings")?;

        let embeddings: Vec<Vec<f32>> = response
            .data
            .into_iter()
            .map(|item| item.embedding)
            .collect();

        debug!("Generated {} embeddings", embeddings.len());
        Ok(embeddings)
    }

    /// Calculate cosine similarity between two embeddings
    ///
    /// # Arguments
    /// * `a` - First embedding vector
    /// * `b` - Second embedding vector
    ///
    /// # Returns
    /// Cosine similarity score (0.0 to 1.0)
    pub fn cosine_similarity(a: &[f32], b: &[f32]) -> Result<f32> {
        if a.len() != b.len() {
            anyhow::bail!(
                "Embedding dimension mismatch: {} vs {}",
                a.len(),
                b.len()
            );
        }

        let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();

        let magnitude_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
        let magnitude_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

        if magnitude_a == 0.0 || magnitude_b == 0.0 {
            return Ok(0.0);
        }

        let similarity = dot_product / (magnitude_a * magnitude_b);

        // Clamp to [0, 1] range (cosine similarity is in [-1, 1], but we normalize to [0, 1])
        let normalized = ((similarity + 1.0) / 2.0).clamp(0.0_f32, 1.0_f32);
        Ok(normalized)
    }
}

impl Default for EmbeddingsService {
    fn default() -> Self {
        Self::from_env().expect("Failed to initialize EmbeddingsService from environment")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cosine_similarity() {
        let a = vec![1.0, 0.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let similarity = EmbeddingsService::cosine_similarity(&a, &b).unwrap();
        assert!((similarity - 1.0).abs() < 0.001);

        let c = vec![1.0, 0.0, 0.0];
        let d = vec![-1.0, 0.0, 0.0];
        let similarity2 = EmbeddingsService::cosine_similarity(&c, &d).unwrap();
        assert!((similarity2 - 0.0).abs() < 0.001);

        let e = vec![1.0, 0.0];
        let f = vec![0.0, 1.0];
        let similarity3 = EmbeddingsService::cosine_similarity(&e, &f).unwrap();
        assert!((similarity3 - 0.5).abs() < 0.001);
    }

    #[test]
    fn test_dimension_mismatch() {
        let a = vec![1.0, 0.0];
        let b = vec![1.0, 0.0, 0.0];
        let result = EmbeddingsService::cosine_similarity(&a, &b);
        assert!(result.is_err());
    }

    #[tokio::test]
    #[ignore] // Requires OPENAI_API_KEY
    async fn test_generate_embedding() {
        let service = EmbeddingsService::from_env().unwrap();
        let text = "Hello, world!";
        let embedding = service.generate(text).await.unwrap();

        assert_eq!(embedding.len(), EMBEDDING_DIM);
    }

    #[tokio::test]
    #[ignore] // Requires OPENAI_API_KEY
    async fn test_generate_batch_embeddings() {
        let service = EmbeddingsService::from_env().unwrap();
        let texts = vec![
            "First sentence".to_string(),
            "Second sentence".to_string(),
            "Third sentence".to_string(),
        ];

        let embeddings = service.generate_batch(texts).await.unwrap();

        assert_eq!(embeddings.len(), 3);
        for embedding in embeddings {
            assert_eq!(embedding.len(), EMBEDDING_DIM);
        }
    }

    #[tokio::test]
    #[ignore] // Requires OPENAI_API_KEY
    async fn test_semantic_similarity() {
        let service = EmbeddingsService::from_env().unwrap();

        let text1 = "I love coffee";
        let text2 = "I enjoy drinking coffee";
        let text3 = "The weather is nice today";

        let emb1 = service.generate(text1).await.unwrap();
        let emb2 = service.generate(text2).await.unwrap();
        let emb3 = service.generate(text3).await.unwrap();

        let sim_12 = EmbeddingsService::cosine_similarity(&emb1, &emb2).unwrap();
        let sim_13 = EmbeddingsService::cosine_similarity(&emb1, &emb3).unwrap();

        // Similar sentences should have higher similarity
        assert!(sim_12 > sim_13);
    }
}
