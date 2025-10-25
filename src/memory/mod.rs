/// Vector Database Memory System
///
/// This module provides long-term memory storage and retrieval for AI companions
/// using vector embeddings and semantic search.
///
/// # Features
///
/// - **Long-term storage**: 1+ year retention with automatic cleanup
/// - **Semantic search**: Find relevant memories using vector similarity
/// - **7 memory categories**: Conversation, Preference, Event, Emotion, Fact, Relationship, Reference
/// - **Importance scoring**: Automatic importance calculation with time-based decay
/// - **Vector database**: Qdrant integration with HNSW indexing
/// - **Embeddings**: OpenAI ada-002 (1536 dimensions)
///
/// # Architecture
///
/// ```text
/// ┌──────────────────────────────────────────────────────┐
/// │              Memory Service (High-level)              │
/// ├──────────────────────────────────────────────────────┤
/// │                                                        │
/// │  ┌─────────────────┐         ┌──────────────────┐   │
/// │  │   Embeddings    │────────▶│   Vector DB      │   │
/// │  │  (OpenAI API)   │         │   (Qdrant)       │   │
/// │  └─────────────────┘         └──────────────────┘   │
/// │         │                            │                │
/// │         ▼                            ▼                │
/// │  Text → Vector              Vector → Memories        │
/// │  (1536 dim)                 (Cosine similarity)      │
/// │                                                        │
/// └──────────────────────────────────────────────────────┘
/// ```
///
/// # Example Usage
///
/// ```no_run
/// use shinyu_ai::memory::{MemoryService, MemoryServiceConfig, MemoryCategory, MemoryQuery};
/// use uuid::Uuid;
///
/// # async fn example() -> anyhow::Result<()> {
/// // Initialize service
/// let service = MemoryService::from_env().await?;
///
/// // Create a memory
/// let user_id = Uuid::new_v4();
/// let memory = service.create_memory(
///     user_id,
///     "companion_001".to_string(),
///     "User loves coffee in the morning".to_string(),
///     MemoryCategory::Preference,
///     0.8,
/// ).await?;
///
/// // Search semantically
/// let query = MemoryQuery::new()
///     .user_id(user_id)
///     .category(MemoryCategory::Preference)
///     .limit(10);
///
/// let results = service.search_memories("coffee preferences", query).await?;
///
/// for result in results {
///     println!("Memory: {} (similarity: {:.2})",
///         result.memory.content,
///         result.similarity
///     );
/// }
/// # Ok(())
/// # }
/// ```

pub mod embeddings;
pub mod service;
pub mod types;
pub mod vector_db;

// Re-export main types
pub use embeddings::EmbeddingsService;
pub use service::{MemoryService, MemoryServiceConfig, MemoryStats};
pub use types::{Memory, MemoryCategory, MemoryQuery, MemorySearchResult};
pub use vector_db::{CollectionStats, VectorDbClient};
