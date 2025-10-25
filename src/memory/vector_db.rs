/// Qdrant Vector Database Client
///
/// This module provides a wrapper around the Qdrant client for vector similarity search.
/// Qdrant is a Rust-native vector database optimized for high-performance similarity search.

use crate::memory::types::{Memory, MemoryQuery, MemorySearchResult};
use anyhow::{Context, Result};
use qdrant_client::{
    qdrant::{
        vectors_config::Config, CreateCollectionBuilder, Distance, Filter, PointStruct, SearchPoints,
        VectorParams, VectorsConfig,
    },
    Qdrant,
};
use std::collections::HashMap;
use tracing::{debug, info, warn};
use uuid::Uuid;

/// Qdrant collection name for memories
const COLLECTION_NAME: &str = "memories";

/// Embedding dimension size (OpenAI ada-002 compatible)
const EMBEDDING_DIM: u64 = 1536;

/// Vector database client for memory storage and retrieval
pub struct VectorDbClient {
    client: Qdrant,
    collection_name: String,
}

impl VectorDbClient {
    /// Create a new vector database client
    ///
    /// # Arguments
    /// * `url` - Qdrant server URL (e.g., "http://localhost:6334")
    pub async fn new(url: &str) -> Result<Self> {
        info!("Connecting to Qdrant at {}", url);
        let client = Qdrant::from_url(url).build()?;

        let db = Self {
            client,
            collection_name: COLLECTION_NAME.to_string(),
        };

        // Ensure collection exists
        db.ensure_collection().await?;

        Ok(db)
    }

    /// Ensure the collection exists, create if not
    async fn ensure_collection(&self) -> Result<()> {
        let collections = self.client.list_collections().await?;

        let collection_exists = collections
            .collections
            .iter()
            .any(|c| c.name == self.collection_name);

        if collection_exists {
            debug!("Collection '{}' already exists", self.collection_name);
            return Ok(());
        }

        info!("Creating collection '{}'", self.collection_name);

        self.client
            .create_collection(
                CreateCollectionBuilder::new(self.collection_name.clone())
                    .vectors_config(VectorsConfig {
                        config: Some(Config::Params(VectorParams {
                            size: EMBEDDING_DIM,
                            distance: Distance::Cosine.into(),
                            ..Default::default()
                        })),
                    }),
            )
            .await
            .context("Failed to create collection")?;

        info!("Collection '{}' created successfully", self.collection_name);
        Ok(())
    }

    /// Store a memory in the vector database
    ///
    /// # Arguments
    /// * `memory` - Memory to store (must have embedding)
    pub async fn store(&self, memory: &Memory) -> Result<()> {
        let embedding = memory
            .embedding
            .as_ref()
            .context("Memory must have embedding before storage")?;

        if embedding.len() != EMBEDDING_DIM as usize {
            anyhow::bail!(
                "Invalid embedding dimension: expected {}, got {}",
                EMBEDDING_DIM,
                embedding.len()
            );
        }

        let mut payload = HashMap::new();
        payload.insert("user_id", serde_json::to_value(&memory.user_id)?);
        payload.insert("companion_id", serde_json::to_value(&memory.companion_id)?);
        payload.insert("timestamp", serde_json::to_value(&memory.timestamp)?);
        payload.insert("content", serde_json::to_value(&memory.content)?);
        payload.insert("importance", serde_json::to_value(&memory.importance)?);
        payload.insert("category", serde_json::to_value(&memory.category)?);
        payload.insert("access_count", serde_json::to_value(&memory.access_count)?);
        payload.insert("last_accessed_at", serde_json::to_value(&memory.last_accessed_at)?);

        if let Some(metadata) = &memory.metadata {
            payload.insert("metadata", metadata.clone());
        }

        let mut payload_map = std::collections::HashMap::new();
        for (key, value) in payload {
            payload_map.insert(key, qdrant_client::qdrant::Value::from(value));
        }

        let point = PointStruct::new(
            memory.id.to_string(),
            embedding.clone(),
            payload_map,
        );

        use qdrant_client::qdrant::UpsertPointsBuilder;

        self.client
            .upsert_points(
                UpsertPointsBuilder::new(self.collection_name.clone(), vec![point])
            )
            .await
            .context("Failed to store memory")?;

        debug!("Stored memory {} in vector database", memory.id);
        Ok(())
    }

    /// Search for similar memories using semantic search
    ///
    /// # Arguments
    /// * `query_embedding` - Query vector (1536 dimensions)
    /// * `query` - Additional filters and parameters
    pub async fn search(
        &self,
        query_embedding: &[f32],
        query: &MemoryQuery,
    ) -> Result<Vec<MemorySearchResult>> {
        if query_embedding.len() != EMBEDDING_DIM as usize {
            anyhow::bail!(
                "Invalid query embedding dimension: expected {}, got {}",
                EMBEDDING_DIM,
                query_embedding.len()
            );
        }

        // Build filter
        let mut filter_conditions = vec![];

        if let Some(user_id) = query.user_id {
            filter_conditions.push(format!("user_id = '{}'", user_id));
        }

        if let Some(ref companion_id) = query.companion_id {
            filter_conditions.push(format!("companion_id = '{}'", companion_id));
        }

        if let Some(category) = query.category {
            filter_conditions.push(format!("category = '{}'", category.as_str()));
        }

        if let Some(min_importance) = query.min_importance {
            filter_conditions.push(format!("importance >= {}", min_importance));
        }

        let filter = if !filter_conditions.is_empty() {
            Some(Filter::default()) // TODO: Implement proper filter construction
        } else {
            None
        };

        let search_result = self
            .client
            .search_points(SearchPoints {
                collection_name: self.collection_name.clone(),
                vector: query_embedding.to_vec(),
                limit: query.limit as u64,
                with_payload: Some(true.into()),
                filter,
                ..Default::default()
            })
            .await
            .context("Failed to search memories")?;

        let mut results = Vec::new();

        for scored_point in search_result.result {
            let payload = scored_point.payload;

            // Extract point ID as string
            let point_id = match scored_point.id {
                Some(id) => format!("{:?}", id), // Convert PointId to debug string and parse
                None => continue,
            };

            // Parse UUID from point ID string
            let uuid_str = point_id
                .trim_start_matches("Uuid(\"")
                .trim_end_matches("\")")
                .trim_matches('"');

            let memory_id = Uuid::parse_str(uuid_str)
                .with_context(|| format!("Failed to parse UUID from: {}", uuid_str))?;

            // Convert Qdrant Value to serde_json::Value
            let convert_value = |v: &qdrant_client::qdrant::Value| -> serde_json::Value {
                serde_json::to_value(v).unwrap_or(serde_json::Value::Null)
            };

            // Deserialize memory from payload
            let memory = Memory {
                id: memory_id,
                user_id: serde_json::from_value(
                    convert_value(payload.get("user_id").context("Missing user_id")?),
                )?,
                companion_id: serde_json::from_value(
                    convert_value(payload.get("companion_id").context("Missing companion_id")?),
                )?,
                timestamp: serde_json::from_value(
                    convert_value(payload.get("timestamp").context("Missing timestamp")?),
                )?,
                content: serde_json::from_value(
                    convert_value(payload.get("content").context("Missing content")?),
                )?,
                embedding: None, // Don't return embeddings in search results
                importance: serde_json::from_value(
                    convert_value(payload.get("importance").context("Missing importance")?),
                )?,
                category: serde_json::from_value(
                    convert_value(payload.get("category").context("Missing category")?),
                )?,
                access_count: serde_json::from_value(
                    convert_value(payload.get("access_count").context("Missing access_count")?),
                )?,
                last_accessed_at: serde_json::from_value(
                    convert_value(
                        payload
                            .get("last_accessed_at")
                            .context("Missing last_accessed_at")?,
                    ),
                )?,
                metadata: payload.get("metadata").map(convert_value),
            };

            results.push(MemorySearchResult {
                memory,
                similarity: scored_point.score,
            });
        }

        debug!("Found {} similar memories", results.len());
        Ok(results)
    }

    /// Delete a memory by ID
    pub async fn delete(&self, memory_id: Uuid) -> Result<()> {
        use qdrant_client::qdrant::{DeletePointsBuilder, PointsIdsList};

        let points_list = PointsIdsList {
            ids: vec![memory_id.to_string().into()],
        };

        self.client
            .delete_points(
                DeletePointsBuilder::new(self.collection_name.clone()).points(points_list)
            )
            .await
            .context("Failed to delete memory")?;

        debug!("Deleted memory {}", memory_id);
        Ok(())
    }

    /// Delete all memories for a user
    pub async fn delete_user_memories(&self, user_id: Uuid) -> Result<()> {
        // TODO: Implement batch deletion with filter
        warn!("Batch deletion not yet implemented for user {}", user_id);
        Ok(())
    }

    /// Get collection statistics
    pub async fn get_stats(&self) -> Result<CollectionStats> {
        let info = self
            .client
            .collection_info(self.collection_name.clone())
            .await?;

        Ok(CollectionStats {
            total_memories: info.result.and_then(|r| r.points_count),
            collection_name: self.collection_name.clone(),
        })
    }
}

/// Collection statistics
#[derive(Debug, Clone)]
pub struct CollectionStats {
    pub total_memories: Option<u64>,
    pub collection_name: String,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::memory::types::MemoryCategory;

    #[tokio::test]
    #[ignore] // Requires running Qdrant instance
    async fn test_vector_db_connection() {
        let result = VectorDbClient::new("http://localhost:6334").await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    #[ignore] // Requires running Qdrant instance
    async fn test_store_and_search() {
        let client = VectorDbClient::new("http://localhost:6334")
            .await
            .expect("Failed to connect");

        // Create test memory with embedding
        let mut memory = Memory::new(
            Uuid::new_v4(),
            "companion_001".to_string(),
            "User loves coffee in the morning".to_string(),
            MemoryCategory::Preference,
            0.8,
        );

        // Generate dummy embedding (1536 dimensions)
        let embedding: Vec<f32> = (0..1536).map(|i| (i as f32) / 1536.0).collect();
        memory = memory.with_embedding(embedding.clone());

        // Store memory
        client.store(&memory).await.expect("Failed to store memory");

        // Search with same embedding
        let query = MemoryQuery::new().limit(5);
        let results = client
            .search(&embedding, &query)
            .await
            .expect("Failed to search");

        assert!(!results.is_empty());
        assert_eq!(results[0].memory.id, memory.id);
    }
}
