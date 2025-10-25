/// Memory Management Service
///
/// This module provides high-level memory management operations combining
/// vector database storage with embeddings generation.

use crate::memory::{
    embeddings::EmbeddingsService,
    types::{Memory, MemoryCategory, MemoryQuery, MemorySearchResult},
    vector_db::VectorDbClient,
};
use anyhow::{Context, Result};
use chrono::{Duration, Utc};
use tracing::{debug, info};
use uuid::Uuid;

/// Configuration for memory service
#[derive(Debug, Clone)]
pub struct MemoryServiceConfig {
    /// Qdrant server URL
    pub qdrant_url: String,

    /// OpenAI API key for embeddings
    pub openai_api_key: String,

    /// Default importance decay rate (per day)
    pub importance_decay_rate: f32,

    /// Memory retention period (in days)
    pub retention_days: i64,
}

impl Default for MemoryServiceConfig {
    fn default() -> Self {
        Self {
            qdrant_url: "http://localhost:6334".to_string(),
            openai_api_key: std::env::var("OPENAI_API_KEY").unwrap_or_default(),
            importance_decay_rate: 0.01, // 1% per day
            retention_days: 365,          // 1 year default
        }
    }
}

/// High-level memory management service
pub struct MemoryService {
    vector_db: VectorDbClient,
    embeddings: EmbeddingsService,
    config: MemoryServiceConfig,
}

impl MemoryService {
    /// Create a new memory service
    pub async fn new(config: MemoryServiceConfig) -> Result<Self> {
        info!("Initializing memory service");

        let vector_db = VectorDbClient::new(&config.qdrant_url)
            .await
            .context("Failed to connect to vector database")?;

        let embeddings = EmbeddingsService::new(config.openai_api_key.clone());

        Ok(Self {
            vector_db,
            embeddings,
            config,
        })
    }

    /// Create from environment variables
    pub async fn from_env() -> Result<Self> {
        let config = MemoryServiceConfig::default();
        Self::new(config).await
    }

    /// Store a new memory
    ///
    /// # Arguments
    /// * `user_id` - User who owns this memory
    /// * `companion_id` - AI companion identifier
    /// * `content` - Memory content (text)
    /// * `category` - Memory category
    /// * `importance` - Importance score (0.0 - 1.0)
    pub async fn create_memory(
        &self,
        user_id: Uuid,
        companion_id: String,
        content: String,
        category: MemoryCategory,
        importance: f32,
    ) -> Result<Memory> {
        info!(
            "Creating new memory for user {} (category: {:?})",
            user_id, category
        );

        // Generate embedding
        let embedding = self
            .embeddings
            .generate(&content)
            .await
            .context("Failed to generate embedding")?;

        // Create memory with embedding
        let memory = Memory::new(user_id, companion_id, content, category, importance)
            .with_embedding(embedding);

        // Store in vector database
        self.vector_db
            .store(&memory)
            .await
            .context("Failed to store memory")?;

        debug!("Memory {} created successfully", memory.id);
        Ok(memory)
    }

    /// Search for memories semantically
    ///
    /// # Arguments
    /// * `query_text` - Text to search for
    /// * `query` - Additional filters and parameters
    pub async fn search_memories(
        &self,
        query_text: &str,
        query: MemoryQuery,
    ) -> Result<Vec<MemorySearchResult>> {
        debug!("Searching memories for: {}", query_text);

        // Generate query embedding
        let query_embedding = self
            .embeddings
            .generate(query_text)
            .await
            .context("Failed to generate query embedding")?;

        // Search vector database
        let mut results = self
            .vector_db
            .search(&query_embedding, &query)
            .await
            .context("Failed to search memories")?;

        // Apply importance decay based on age
        self.apply_importance_decay(&mut results);

        // Sort by combined score (similarity * decayed_importance)
        results.sort_by(|a, b| {
            let score_a = a.similarity * a.memory.importance;
            let score_b = b.similarity * b.memory.importance;
            score_b.partial_cmp(&score_a).unwrap_or(std::cmp::Ordering::Equal)
        });

        info!("Found {} relevant memories", results.len());
        Ok(results)
    }

    /// Get memories by filter (without semantic search)
    pub async fn get_memories(&self, query: MemoryQuery) -> Result<Vec<Memory>> {
        // For non-semantic queries, use a dummy embedding
        let dummy_embedding = vec![0.0; 1536];

        let results = self
            .vector_db
            .search(&dummy_embedding, &query)
            .await
            .context("Failed to get memories")?;

        Ok(results.into_iter().map(|r| r.memory).collect())
    }

    /// Delete a memory by ID
    pub async fn delete_memory(&self, memory_id: Uuid) -> Result<()> {
        info!("Deleting memory {}", memory_id);
        self.vector_db
            .delete(memory_id)
            .await
            .context("Failed to delete memory")
    }

    /// Delete all memories for a user
    pub async fn delete_user_memories(&self, user_id: Uuid) -> Result<()> {
        info!("Deleting all memories for user {}", user_id);
        self.vector_db
            .delete_user_memories(user_id)
            .await
            .context("Failed to delete user memories")
    }

    /// Calculate importance score based on content
    ///
    /// This is a heuristic-based scoring system. In production, you might want
    /// to use an ML model for more accurate importance prediction.
    pub fn calculate_importance(content: &str, category: MemoryCategory) -> f32 {
        let mut score: f32 = 0.5; // Base score

        // Category-based adjustment
        score += match category {
            MemoryCategory::Event => 0.2,        // Events are generally important
            MemoryCategory::Preference => 0.15,  // Preferences are valuable
            MemoryCategory::Emotion => 0.1,      // Emotions provide context
            MemoryCategory::Relationship => 0.2, // Relationships are critical
            MemoryCategory::Fact => 0.1,
            MemoryCategory::Conversation => 0.0,
            MemoryCategory::Reference => 0.05,
        };

        // Content length adjustment (longer = potentially more important)
        let word_count = content.split_whitespace().count();
        if word_count > 50 {
            score += 0.1;
        } else if word_count < 10 {
            score -= 0.1;
        }

        // Keyword-based importance
        let important_keywords = [
            "love", "hate", "never", "always", "important", "critical", "remember",
            "birthday", "anniversary", "family", "death", "illness",
        ];

        let content_lower = content.to_lowercase();
        for keyword in important_keywords {
            if content_lower.contains(keyword) {
                score += 0.05;
            }
        }

        score.clamp(0.0, 1.0)
    }

    /// Apply importance decay based on memory age
    fn apply_importance_decay(&self, results: &mut [MemorySearchResult]) {
        let now = Utc::now();
        let decay_rate = self.config.importance_decay_rate;

        for result in results.iter_mut() {
            let age_days = (now - result.memory.timestamp).num_days();
            if age_days > 0 {
                let decay_factor = 1.0 - (decay_rate * age_days as f32);
                result.memory.importance =
                    (result.memory.importance * decay_factor.max(0.1)).clamp(0.0, 1.0);
            }
        }
    }

    /// Clean up old memories beyond retention period
    pub async fn cleanup_old_memories(&self) -> Result<usize> {
        info!("Cleaning up memories older than {} days", self.config.retention_days);

        let cutoff_date = Utc::now() - Duration::days(self.config.retention_days);

        let query = MemoryQuery::new()
            .end_time(cutoff_date)
            .limit(1000); // Process in batches

        let old_memories = self.get_memories(query).await?;
        let count = old_memories.len();

        for memory in old_memories {
            self.vector_db.delete(memory.id).await?;
        }

        info!("Cleaned up {} old memories", count);
        Ok(count)
    }

    /// Get service statistics
    pub async fn get_stats(&self) -> Result<MemoryStats> {
        let db_stats = self.vector_db.get_stats().await?;

        Ok(MemoryStats {
            total_memories: db_stats.total_memories.unwrap_or(0),
            retention_days: self.config.retention_days,
        })
    }
}

/// Memory service statistics
#[derive(Debug, Clone)]
pub struct MemoryStats {
    pub total_memories: u64,
    pub retention_days: i64,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_importance() {
        // Test category-based scoring
        let score1 = MemoryService::calculate_importance(
            "User's birthday is tomorrow",
            MemoryCategory::Event,
        );
        assert!(score1 >= 0.6 && score1 <= 0.75); // Event category (base 0.5 + event 0.2 - length adjustment = ~0.65)

        let score2 = MemoryService::calculate_importance(
            "Random conversation",
            MemoryCategory::Conversation,
        );
        assert!(score2 < 0.6); // Lower importance

        // Test keyword detection
        let score3 = MemoryService::calculate_importance(
            "I love this so much, it's very important to remember",
            MemoryCategory::Preference,
        );
        assert!(score3 >= 0.75); // Multiple important keywords (keywords give 0.05 each)
    }

    #[test]
    fn test_importance_clamping() {
        let score = MemoryService::calculate_importance(
            "test",
            MemoryCategory::Conversation,
        );
        assert!(score >= 0.0 && score <= 1.0);
    }

    #[tokio::test]
    #[ignore] // Requires Qdrant and OpenAI API
    async fn test_create_and_search_memory() {
        let config = MemoryServiceConfig::default();
        let service = MemoryService::new(config).await.unwrap();

        let user_id = Uuid::new_v4();
        let content = "User loves coffee in the morning";

        // Create memory
        let memory = service
            .create_memory(
                user_id,
                "companion_001".to_string(),
                content.to_string(),
                MemoryCategory::Preference,
                0.8,
            )
            .await
            .unwrap();

        assert_eq!(memory.content, content);

        // Search for similar content
        let query = MemoryQuery::new().user_id(user_id).limit(5);
        let results = service
            .search_memories("coffee preferences", query)
            .await
            .unwrap();

        assert!(!results.is_empty());
    }
}
