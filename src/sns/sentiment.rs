// 感情分析システム

use anyhow::Result;
use serde::{Deserialize, Serialize};

/// 感情タイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Sentiment {
    /// 非常にポジティブ
    VeryPositive,
    /// ポジティブ
    Positive,
    /// 中立
    Neutral,
    /// ネガティブ
    Negative,
    /// 非常にネガティブ
    VeryNegative,
}

impl Sentiment {
    /// スコアから感情を判定
    pub fn from_score(score: f32) -> Self {
        match score {
            s if s >= 0.6 => Self::VeryPositive,
            s if s >= 0.2 => Self::Positive,
            s if s >= -0.2 => Self::Neutral,
            s if s >= -0.6 => Self::Negative,
            _ => Self::VeryNegative,
        }
    }

    /// サポートが必要かどうか
    pub fn needs_support(&self) -> bool {
        matches!(self, Self::Negative | Self::VeryNegative)
    }

    /// 緊急度（0.0-1.0）
    pub fn urgency(&self) -> f32 {
        match self {
            Self::VeryNegative => 1.0,
            Self::Negative => 0.7,
            Self::Neutral => 0.3,
            Self::Positive => 0.1,
            Self::VeryPositive => 0.0,
        }
    }
}

/// 感情分析結果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentAnalysis {
    /// 感情タイプ
    pub sentiment: Sentiment,
    /// スコア (-1.0 ~ 1.0)
    pub score: f32,
    /// 信頼度 (0.0 ~ 1.0)
    pub confidence: f32,
    /// 検出されたキーワード
    pub keywords: Vec<String>,
}

/// 感情分析エンジン
pub struct SentimentAnalyzer {
    negative_keywords: Vec<String>,
    positive_keywords: Vec<String>,
}

impl SentimentAnalyzer {
    /// 新しい感情分析エンジンを作成
    pub fn new() -> Self {
        Self {
            negative_keywords: vec![
                "疲れ".to_string(),
                "辛い".to_string(),
                "悲しい".to_string(),
                "寂しい".to_string(),
                "不安".to_string(),
                "心配".to_string(),
                "ストレス".to_string(),
                "落ち込".to_string(),
                "鬱".to_string(),
                "泣き".to_string(),
                "絶望".to_string(),
                "最悪".to_string(),
                "死に".to_string(),
                "諦め".to_string(),
                "無理".to_string(),
            ],
            positive_keywords: vec![
                "嬉しい".to_string(),
                "楽しい".to_string(),
                "幸せ".to_string(),
                "最高".to_string(),
                "素晴らしい".to_string(),
                "良かった".to_string(),
                "ありがとう".to_string(),
                "感謝".to_string(),
                "素敵".to_string(),
                "頑張".to_string(),
                "成功".to_string(),
                "達成".to_string(),
                "笑".to_string(),
                "楽観".to_string(),
                "希望".to_string(),
            ],
        }
    }

    /// テキストを分析
    pub fn analyze(&self, text: &str) -> Result<SentimentAnalysis> {
        let mut score = 0.0;
        let mut keywords = Vec::new();
        let mut total_matches = 0;

        // ネガティブキーワードチェック
        for keyword in &self.negative_keywords {
            if text.contains(keyword) {
                score -= 1.0;
                keywords.push(keyword.clone());
                total_matches += 1;
            }
        }

        // ポジティブキーワードチェック
        for keyword in &self.positive_keywords {
            if text.contains(keyword) {
                score += 1.0;
                keywords.push(keyword.clone());
                total_matches += 1;
            }
        }

        // スコアを正規化 (-1.0 ~ 1.0)
        let normalized_score = if total_matches > 0 {
            score / total_matches as f32
        } else {
            0.0 // 中立
        };

        // 信頼度を計算
        let confidence = (total_matches as f32 / 5.0).min(1.0);

        let sentiment = Sentiment::from_score(normalized_score);

        Ok(SentimentAnalysis {
            sentiment,
            score: normalized_score,
            confidence,
            keywords,
        })
    }

    /// カスタムキーワードを追加
    pub fn add_negative_keyword(&mut self, keyword: String) {
        self.negative_keywords.push(keyword);
    }

    pub fn add_positive_keyword(&mut self, keyword: String) {
        self.positive_keywords.push(keyword);
    }
}

impl Default for SentimentAnalyzer {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_sentiment_from_score() {
        assert_eq!(Sentiment::from_score(0.8), Sentiment::VeryPositive);
        assert_eq!(Sentiment::from_score(0.3), Sentiment::Positive);
        assert_eq!(Sentiment::from_score(0.0), Sentiment::Neutral);
        assert_eq!(Sentiment::from_score(-0.3), Sentiment::Negative);
        assert_eq!(Sentiment::from_score(-0.8), Sentiment::VeryNegative);
    }

    #[test]
    fn test_sentiment_needs_support() {
        assert!(Sentiment::VeryNegative.needs_support());
        assert!(Sentiment::Negative.needs_support());
        assert!(!Sentiment::Neutral.needs_support());
        assert!(!Sentiment::Positive.needs_support());
    }

    #[test]
    fn test_sentiment_urgency() {
        assert_eq!(Sentiment::VeryNegative.urgency(), 1.0);
        assert_eq!(Sentiment::Negative.urgency(), 0.7);
        assert_eq!(Sentiment::VeryPositive.urgency(), 0.0);
    }

    #[test]
    fn test_analyze_negative_text() {
        let analyzer = SentimentAnalyzer::new();
        let result = analyzer.analyze("今日は疲れた。辛い一日だった。").unwrap();

        assert_eq!(result.sentiment, Sentiment::VeryNegative);
        assert!(result.score < 0.0);
        assert!(result.keywords.contains(&"疲れ".to_string()));
        assert!(result.keywords.contains(&"辛い".to_string()));
    }

    #[test]
    fn test_analyze_positive_text() {
        let analyzer = SentimentAnalyzer::new();
        let result = analyzer.analyze("今日は嬉しいことがあった！楽しい一日だった！").unwrap();

        assert_eq!(result.sentiment, Sentiment::VeryPositive);
        assert!(result.score > 0.0);
        assert!(result.keywords.contains(&"嬉しい".to_string()));
        assert!(result.keywords.contains(&"楽しい".to_string()));
    }

    #[test]
    fn test_analyze_neutral_text() {
        let analyzer = SentimentAnalyzer::new();
        let result = analyzer
            .analyze("今日は普通の一日でした。")
            .unwrap();

        assert_eq!(result.sentiment, Sentiment::Neutral);
        assert_eq!(result.score, 0.0);
        assert_eq!(result.keywords.len(), 0);
    }

    #[test]
    fn test_analyze_mixed_text() {
        let analyzer = SentimentAnalyzer::new();
        let result = analyzer
            .analyze("疲れたけど、楽しかった！")
            .unwrap();

        // ネガティブとポジティブが混在（少なくとも1つのキーワード）
        assert!(result.keywords.len() >= 1);
        assert!(result.keywords.contains(&"疲れ".to_string()) || result.keywords.contains(&"楽しい".to_string()));
    }

    #[test]
    fn test_custom_keywords() {
        let mut analyzer = SentimentAnalyzer::new();
        analyzer.add_negative_keyword("むり".to_string());

        let result = analyzer.analyze("もうむりです").unwrap();
        assert!(result.score < 0.0);
        assert!(result.keywords.contains(&"むり".to_string()));
    }
}
