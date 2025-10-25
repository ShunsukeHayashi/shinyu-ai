/// Memory System Types
///
/// This module defines the core data structures for the vector database memory system.
/// Memories are stored with 1536-dimensional embeddings for semantic search.

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Memory category classifications
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum MemoryCategory {
    /// Conversation history and dialogue context
    Conversation,
    /// User preferences and settings
    Preference,
    /// Important events and milestones
    Event,
    /// Emotional states and reactions
    Emotion,
    /// Factual information about the user
    Fact,
    /// Relationship dynamics and connections
    Relationship,
    /// External references and sources
    Reference,
}

impl MemoryCategory {
    /// Get all available categories
    pub fn all() -> Vec<Self> {
        vec![
            Self::Conversation,
            Self::Preference,
            Self::Event,
            Self::Emotion,
            Self::Fact,
            Self::Relationship,
            Self::Reference,
        ]
    }

    /// Get category as string
    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Conversation => "conversation",
            Self::Preference => "preference",
            Self::Event => "event",
            Self::Emotion => "emotion",
            Self::Fact => "fact",
            Self::Relationship => "relationship",
            Self::Reference => "reference",
        }
    }
}

/// Core memory structure stored in vector database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Memory {
    /// Unique memory identifier
    pub id: Uuid,

    /// User who owns this memory
    pub user_id: Uuid,

    /// AI companion/character identifier
    pub companion_id: String,

    /// When this memory was created
    pub timestamp: DateTime<Utc>,

    /// Memory content (text)
    pub content: String,

    /// 1536-dimensional embedding vector (OpenAI ada-002 compatible)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub embedding: Option<Vec<f32>>,

    /// Importance score (0.0 = trivial, 1.0 = critical)
    pub importance: f32,

    /// Memory category
    pub category: MemoryCategory,

    /// Number of times this memory has been accessed
    pub access_count: u32,

    /// Last time this memory was accessed
    pub last_accessed_at: DateTime<Utc>,

    /// Optional metadata (JSON object)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<serde_json::Value>,
}

impl Memory {
    /// Create a new memory instance
    pub fn new(
        user_id: Uuid,
        companion_id: String,
        content: String,
        category: MemoryCategory,
        importance: f32,
    ) -> Self {
        let now = Utc::now();
        Self {
            id: Uuid::new_v4(),
            user_id,
            companion_id,
            timestamp: now,
            content,
            embedding: None,
            importance: importance.clamp(0.0, 1.0),
            category,
            access_count: 0,
            last_accessed_at: now,
            metadata: None,
        }
    }

    /// Update access statistics
    pub fn mark_accessed(&mut self) {
        self.access_count += 1;
        self.last_accessed_at = Utc::now();
    }

    /// Set embedding vector
    pub fn with_embedding(mut self, embedding: Vec<f32>) -> Self {
        self.embedding = Some(embedding);
        self
    }

    /// Set metadata
    pub fn with_metadata(mut self, metadata: serde_json::Value) -> Self {
        self.metadata = Some(metadata);
        self
    }
}

/// Query parameters for memory search
#[derive(Debug, Clone, Default)]
pub struct MemoryQuery {
    /// User ID filter
    pub user_id: Option<Uuid>,

    /// Companion ID filter
    pub companion_id: Option<String>,

    /// Category filter
    pub category: Option<MemoryCategory>,

    /// Minimum importance threshold
    pub min_importance: Option<f32>,

    /// Maximum number of results
    pub limit: usize,

    /// Time range filter (start)
    pub start_time: Option<DateTime<Utc>>,

    /// Time range filter (end)
    pub end_time: Option<DateTime<Utc>>,
}

impl MemoryQuery {
    /// Create a new query with default limit
    pub fn new() -> Self {
        Self {
            limit: 10,
            ..Default::default()
        }
    }

    /// Set user ID filter
    pub fn user_id(mut self, user_id: Uuid) -> Self {
        self.user_id = Some(user_id);
        self
    }

    /// Set companion ID filter
    pub fn companion_id(mut self, companion_id: String) -> Self {
        self.companion_id = Some(companion_id);
        self
    }

    /// Set category filter
    pub fn category(mut self, category: MemoryCategory) -> Self {
        self.category = Some(category);
        self
    }

    /// Set importance threshold
    pub fn min_importance(mut self, importance: f32) -> Self {
        self.min_importance = Some(importance);
        self
    }

    /// Set result limit
    pub fn limit(mut self, limit: usize) -> Self {
        self.limit = limit;
        self
    }

    /// Set time range
    pub fn time_range(mut self, start: DateTime<Utc>, end: DateTime<Utc>) -> Self {
        self.start_time = Some(start);
        self.end_time = Some(end);
        self
    }

    /// Set end time
    pub fn end_time(mut self, end: DateTime<Utc>) -> Self {
        self.end_time = Some(end);
        self
    }
}

/// Semantic search result with similarity score
#[derive(Debug, Clone)]
pub struct MemorySearchResult {
    /// Retrieved memory
    pub memory: Memory,

    /// Cosine similarity score (0.0 - 1.0)
    pub similarity: f32,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_memory_creation() {
        let user_id = Uuid::new_v4();
        let memory = Memory::new(
            user_id,
            "companion_001".to_string(),
            "User loves coffee in the morning".to_string(),
            MemoryCategory::Preference,
            0.8,
        );

        assert_eq!(memory.user_id, user_id);
        assert_eq!(memory.companion_id, "companion_001");
        assert_eq!(memory.category, MemoryCategory::Preference);
        assert_eq!(memory.importance, 0.8);
        assert_eq!(memory.access_count, 0);
    }

    #[test]
    fn test_importance_clamping() {
        let memory = Memory::new(
            Uuid::new_v4(),
            "companion_001".to_string(),
            "Test content".to_string(),
            MemoryCategory::Fact,
            1.5, // Over 1.0
        );
        assert_eq!(memory.importance, 1.0);

        let memory2 = Memory::new(
            Uuid::new_v4(),
            "companion_001".to_string(),
            "Test content".to_string(),
            MemoryCategory::Fact,
            -0.5, // Below 0.0
        );
        assert_eq!(memory2.importance, 0.0);
    }

    #[test]
    fn test_memory_access_tracking() {
        let mut memory = Memory::new(
            Uuid::new_v4(),
            "companion_001".to_string(),
            "Test content".to_string(),
            MemoryCategory::Conversation,
            0.5,
        );

        let initial_time = memory.last_accessed_at;
        std::thread::sleep(std::time::Duration::from_millis(10));

        memory.mark_accessed();
        assert_eq!(memory.access_count, 1);
        assert!(memory.last_accessed_at > initial_time);
    }

    #[test]
    fn test_memory_query_builder() {
        let user_id = Uuid::new_v4();
        let query = MemoryQuery::new()
            .user_id(user_id)
            .companion_id("companion_001".to_string())
            .category(MemoryCategory::Event)
            .min_importance(0.7)
            .limit(20);

        assert_eq!(query.user_id, Some(user_id));
        assert_eq!(query.companion_id, Some("companion_001".to_string()));
        assert_eq!(query.category, Some(MemoryCategory::Event));
        assert_eq!(query.min_importance, Some(0.7));
        assert_eq!(query.limit, 20);
    }

    #[test]
    fn test_all_categories() {
        let categories = MemoryCategory::all();
        assert_eq!(categories.len(), 7);
        assert!(categories.contains(&MemoryCategory::Conversation));
        assert!(categories.contains(&MemoryCategory::Preference));
        assert!(categories.contains(&MemoryCategory::Event));
    }
}
