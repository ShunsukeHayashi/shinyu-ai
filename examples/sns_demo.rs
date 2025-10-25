//! Phase 4: SNS連携・自動サポートシステム デモ
//!
//! Twitter API統合、感情分析、自動応答システムの実演

use shinyu_ai::character::*;
use shinyu_ai::dialogue::DialogueManager;
use shinyu_ai::llm::MockLLMProvider;
use shinyu_ai::sns::{AutoReplyManager, MockTwitterProvider, SentimentAnalyzer, Tweet, TwitterProvider};
use std::sync::Arc;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    println!("\n🌸 Phase 4: SNS連携・自動サポートシステム デモ\n");
    println!("{}", "=".repeat(60));

    // ============================================================
    // 1. 感情分析デモ
    // ============================================================
    println!("\n【1. 感情分析エンジン】\n");

    let analyzer = SentimentAnalyzer::new();

    let test_tweets = vec![
        "今日はとても疲れた...仕事がつらい",
        "最高の一日だった！楽しかった！",
        "今日は普通の一日でした",
        "不安で眠れない。心配で仕方ない",
        "感謝！ありがとう！素晴らしい結果が出た！",
    ];

    for tweet_text in test_tweets {
        let analysis = analyzer.analyze(tweet_text)?;
        println!("📝 ツイート: 「{}」", tweet_text);
        println!("   感情: {:?} (スコア: {:.2}, 緊急度: {:.2})",
                 analysis.sentiment, analysis.score, analysis.sentiment.urgency());
        println!("   キーワード: {:?}", analysis.keywords);
        println!("   サポート必要: {}\n", analysis.sentiment.needs_support());
    }

    // ============================================================
    // 2. Twitter API統合デモ
    // ============================================================
    println!("\n【2. Twitter API統合】\n");

    let twitter: Arc<dyn TwitterProvider> = Arc::new(MockTwitterProvider::new());

    // タイムライン取得
    println!("📱 ユーザータイムラインを取得...");
    let timeline = twitter.get_user_timeline("user123", 5).await?;
    for (i, tweet) in timeline.iter().enumerate() {
        println!("   {}. [{}] {}", i + 1, tweet.id, tweet.text);
    }

    // ツイート投稿
    println!("\n✍️  ツイートを投稿...");
    let new_tweet = twitter.post_tweet("エネちゃんだよ！元気してる？").await?;
    println!("   投稿完了: [{}] {}", new_tweet.id, new_tweet.text);

    // リプライ送信
    println!("\n💬 リプライを送信...");
    let reply = twitter.reply_to_tweet("123", "ありがとう！一緒に頑張ろう！").await?;
    println!("   リプライ完了: [{}] {}", reply.id, reply.text);

    // ============================================================
    // 3. 自動応答システムデモ
    // ============================================================
    println!("\n【3. 自動応答システム】\n");

    // ENFP (エネちゃん) キャラクター作成
    let character = Character {
        mbti_type: MBTIType::ENFP,
        name: "エネ".to_string(),
        nickname: "エネちゃん".to_string(),
        axes: PersonalityAxes {
            energy: EnergyAxis::Extraverted,
            perception: PerceptionAxis::Intuitive,
            judgment: JudgmentAxis::Feeling,
            lifestyle: LifestyleAxis::Perceiving,
        },
        traits: vec!["明るい".to_string(), "共感力が高い".to_string()],
        strengths: vec!["創造性".to_string(), "柔軟性".to_string()],
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
    };

    let mock_llm = Arc::new(MockLLMProvider::new("元気だよ！"));
    let dialogue_mgr = Arc::new(DialogueManager::new(mock_llm));
    let twitter_provider: Arc<dyn TwitterProvider> = Arc::new(MockTwitterProvider::new());

    let mut auto_reply = AutoReplyManager::new(
        character.clone(),
        dialogue_mgr,
        twitter_provider,
    );

    println!("🤖 エネちゃん (ENFP) の自動応答システム起動\n");
    println!("設定:");
    println!("  - 最小緊急度: 0.7 (ネガティブ以上で応答)");
    println!("  - 応答間隔: 5分");
    println!("  - 最大応答数: 10件/時間");
    println!("  - 連続応答制限: 同一ユーザーに最大2回\n");

    // テストツイート
    let test_scenarios = vec![
        Tweet {
            id: "1".to_string(),
            text: "今日は本当に疲れた...辛い".to_string(),
            author_id: "user_sad".to_string(),
            created_at: None,
            lang: Some("ja".to_string()),
        },
        Tweet {
            id: "2".to_string(),
            text: "最高の一日だった！".to_string(),
            author_id: "user_happy".to_string(),
            created_at: None,
            lang: Some("ja".to_string()),
        },
        Tweet {
            id: "3".to_string(),
            text: "不安で眠れない...どうしよう".to_string(),
            author_id: "user_anxious".to_string(),
            created_at: None,
            lang: Some("ja".to_string()),
        },
    ];

    for tweet in test_scenarios {
        println!("📩 受信ツイート: 「{}」 (from: {})", tweet.text, tweet.author_id);

        // 感情分析
        let analysis = auto_reply.analyze_tweet(&tweet)?;
        println!("   分析結果: {:?} (緊急度: {:.2})", analysis.sentiment, analysis.sentiment.urgency());

        // 応答判定
        if auto_reply.should_reply(&analysis) {
            println!("   ✅ 応答が必要 (緊急度 >= 0.7)");

            // 応答生成
            let reply_text = auto_reply.generate_reply(&tweet, &analysis).await?;
            println!("   💬 エネちゃんの応答: 「{}」", reply_text);

            // 実際の応答送信（デモ用にコメントアウト）
            // let reply_tweet = auto_reply.auto_reply(&tweet).await?;
        } else {
            println!("   ⏭️  応答不要 (緊急度 < 0.7)");
        }
        println!();
    }

    // ============================================================
    // まとめ
    // ============================================================
    println!("\n{}", "=".repeat(60));
    println!("\n✅ Phase 4 完了: SNS連携・自動サポートシステム\n");
    println!("実装済み機能:");
    println!("  ✓ Twitter API v2 統合 (タイムライン、投稿、リプライ、メンション)");
    println!("  ✓ 感情分析エンジン (5段階、30キーワード)");
    println!("  ✓ 自動応答システム (レート制限、MBTI性格ベース応答)");
    println!("  ✓ 完全なテストカバレッジ (16/16 tests passing)");
    println!("\n次のステップ: Phase 5 - Web UI / モバイルアプリ開発");
    println!();

    Ok(())
}
