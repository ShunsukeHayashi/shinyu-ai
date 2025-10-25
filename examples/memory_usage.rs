/// Memory System Usage Example
///
/// This example demonstrates the complete memory system workflow:
/// 1. Initialize memory service
/// 2. Create memories with different categories
/// 3. Search for memories semantically
/// 4. Update and delete memories
/// 5. View statistics

use anyhow::Result;
use shinyu_ai::memory::{MemoryCategory, MemoryQuery, MemoryService, MemoryServiceConfig};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize tracing for logs
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    println!("🧠 Vector Database Memory System - Example");
    println!("==========================================\n");

    // Step 1: Initialize memory service
    println!("📡 Initializing memory service...");
    let config = MemoryServiceConfig::default();
    let service = MemoryService::new(config).await?;
    println!("✅ Service initialized\n");

    // Step 2: Create sample user and companion
    let user_id = Uuid::new_v4();
    let companion_id = "companion_shinyu_001";

    println!("👤 User ID: {}", user_id);
    println!("🤖 Companion ID: {}\n", companion_id);

    // Step 3: Create memories with different categories
    println!("💾 Creating sample memories...\n");

    let memories = vec![
        (
            "User loves drinking coffee every morning at 7am",
            MemoryCategory::Preference,
            0.8,
        ),
        (
            "User's birthday is on June 15th",
            MemoryCategory::Event,
            0.9,
        ),
        (
            "User works as a software engineer at Tech Corp",
            MemoryCategory::Fact,
            0.7,
        ),
        (
            "User felt anxious about the upcoming presentation",
            MemoryCategory::Emotion,
            0.6,
        ),
        (
            "User's sister lives in Tokyo and visits every summer",
            MemoryCategory::Relationship,
            0.75,
        ),
        (
            "Had a conversation about AI ethics and privacy",
            MemoryCategory::Conversation,
            0.5,
        ),
        (
            "User mentioned reading 'Thinking, Fast and Slow'",
            MemoryCategory::Reference,
            0.55,
        ),
    ];

    for (content, category, importance) in memories {
        let memory = service
            .create_memory(
                user_id,
                companion_id.to_string(),
                content.to_string(),
                category,
                importance,
            )
            .await?;

        println!("✅ Created [{:?}] {}", category, content);
        println!("   ID: {}", memory.id);
        println!("   Importance: {:.2}\n", memory.importance);
    }

    // Step 4: Search for memories semantically
    println!("🔍 Searching for memories...\n");

    let search_queries = vec![
        ("coffee preferences", MemoryCategory::Preference),
        ("important events", MemoryCategory::Event),
        ("work information", MemoryCategory::Fact),
        ("family relationships", MemoryCategory::Relationship),
    ];

    for (query_text, category_filter) in search_queries {
        println!("Query: \"{}\" [Category: {:?}]", query_text, category_filter);

        let query = MemoryQuery::new()
            .user_id(user_id)
            .category(category_filter)
            .limit(3);

        let results = service.search_memories(query_text, query).await?;

        if results.is_empty() {
            println!("   No results found\n");
        } else {
            for (i, result) in results.iter().enumerate() {
                println!(
                    "   {}. {} (similarity: {:.1}%)",
                    i + 1,
                    result.memory.content,
                    result.similarity * 100.0
                );
            }
            println!();
        }
    }

    // Step 5: Advanced search with filters
    println!("🎯 Advanced search with importance filter...\n");

    let query = MemoryQuery::new()
        .user_id(user_id)
        .min_importance(0.7)
        .limit(5);

    let important_memories = service
        .search_memories("important information", query)
        .await?;

    println!("High-importance memories (>0.7):");
    for (i, result) in important_memories.iter().enumerate() {
        println!(
            "   {}. [Importance: {:.2}] {}",
            i + 1,
            result.memory.importance,
            result.memory.content
        );
    }
    println!();

    // Step 6: View statistics
    println!("📊 Memory Statistics\n");

    let stats = service.get_stats().await?;
    println!("Total memories: {}", stats.total_memories);
    println!("Retention period: {} days\n", stats.retention_days);

    // Step 7: Demonstrate importance scoring
    println!("🎲 Automatic importance scoring examples...\n");

    let test_contents = vec![
        ("User's mother passed away last year", MemoryCategory::Event),
        ("User prefers tea over coffee", MemoryCategory::Preference),
        ("Just chatted about the weather", MemoryCategory::Conversation),
        (
            "User always remembers to call family on weekends",
            MemoryCategory::Relationship,
        ),
    ];

    for (content, category) in test_contents {
        let score = MemoryService::calculate_importance(content, category);
        println!("Content: \"{}\"", content);
        println!("Category: {:?}", category);
        println!("Auto-calculated importance: {:.2}\n", score);
    }

    // Step 8: Cleanup demonstration (commented out to preserve data)
    /*
    println!("🧹 Cleanup old memories...");
    let deleted_count = service.cleanup_old_memories().await?;
    println!("✅ Deleted {} old memories\n", deleted_count);
    */

    println!("✨ Example completed successfully!");

    Ok(())
}
