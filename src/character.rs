//! # キャラクター定義モジュール
//!
//! MBTI 16タイプに基づく16種類のキャラクター定義

use anyhow;
use serde::{Deserialize, Serialize};
use std::fmt;

/// MBTI 16タイプ
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum MBTIType {
    /// ENFP - 活動家（元気で社交的、創造的）
    ENFP,
    /// INTJ - 建築家（論理的で戦略的）
    INTJ,
    /// ISFJ - 擁護者（優しく献身的）
    ISFJ,
    /// ESTP - 起業家（行動的で現実的）
    ESTP,
    /// INFP - 仲介者（理想主義的で共感的）
    INFP,
    /// ENTJ - 指揮官（リーダーシップが強い）
    ENTJ,
    /// ISTJ - 管理者（責任感が強く実務的）
    ISTJ,
    /// ESFP - エンターテイナー（楽しく社交的）
    ESFP,
    /// ENTP - 討論者（好奇心旺盛で議論好き）
    ENTP,
    /// INFJ - 提唱者（洞察力があり理想的）
    INFJ,
    /// ISTP - 巨匠（実践的で論理的）
    ISTP,
    /// ESFJ - 領事官（協調性が高く世話好き）
    ESFJ,
    /// ENFJ - 主人公（カリスマ的でサポート的）
    ENFJ,
    /// INTP - 論理学者（分析的で独創的）
    INTP,
    /// ISFP - 冒険家（芸術的で柔軟）
    ISFP,
    /// ESTJ - 幹部（組織的で実務的）
    ESTJ,
}

impl MBTIType {
    /// MBTIタイプの日本語名を取得
    pub fn japanese_name(&self) -> &'static str {
        match self {
            MBTIType::ENFP => "活動家",
            MBTIType::INTJ => "建築家",
            MBTIType::ISFJ => "擁護者",
            MBTIType::ESTP => "起業家",
            MBTIType::INFP => "仲介者",
            MBTIType::ENTJ => "指揮官",
            MBTIType::ISTJ => "管理者",
            MBTIType::ESFP => "エンターテイナー",
            MBTIType::ENTP => "討論者",
            MBTIType::INFJ => "提唱者",
            MBTIType::ISTP => "巨匠",
            MBTIType::ESFJ => "領事官",
            MBTIType::ENFJ => "主人公",
            MBTIType::INTP => "論理学者",
            MBTIType::ISFP => "冒険家",
            MBTIType::ESTJ => "幹部",
        }
    }

    /// 全16タイプのリストを取得
    pub fn all() -> Vec<MBTIType> {
        vec![
            MBTIType::ENFP, MBTIType::INTJ, MBTIType::ISFJ, MBTIType::ESTP,
            MBTIType::INFP, MBTIType::ENTJ, MBTIType::ISTJ, MBTIType::ESFP,
            MBTIType::ENTP, MBTIType::INFJ, MBTIType::ISTP, MBTIType::ESFJ,
            MBTIType::ENFJ, MBTIType::INTP, MBTIType::ISFP, MBTIType::ESTJ,
        ]
    }
}

impl fmt::Display for MBTIType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

/// 性格軸（4つの二項対立）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct PersonalityAxes {
    /// E（外向型）vs I（内向型）
    pub energy: EnergyAxis,
    /// S（感覚型）vs N（直感型）
    pub perception: PerceptionAxis,
    /// T（思考型）vs F（感情型）
    pub judgment: JudgmentAxis,
    /// J（判断型）vs P（知覚型）
    pub lifestyle: LifestyleAxis,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EnergyAxis {
    /// E - 外向型
    Extraverted,
    /// I - 内向型
    Introverted,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PerceptionAxis {
    /// S - 感覚型
    Sensing,
    /// N - 直感型
    Intuitive,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum JudgmentAxis {
    /// T - 思考型
    Thinking,
    /// F - 感情型
    Feeling,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LifestyleAxis {
    /// J - 判断型
    Judging,
    /// P - 知覚型
    Perceiving,
}

/// 会話スタイル
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ConversationStyle {
    /// フォーマル度（0-100）
    pub formality: u8,
    /// 感情表現度（0-100）
    pub emotionality: u8,
    /// 論理性（0-100）
    pub logic_focus: u8,
    /// 共感度（0-100）
    pub empathy: u8,
}

/// 共感パターン
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EmpathyPattern {
    /// 励まし方
    pub encouragement_style: String,
    /// アドバイスの仕方
    pub advice_style: String,
    /// 寄り添い方
    pub support_style: String,
}

/// キャラクター定義
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Character {
    /// MBTIタイプ
    pub mbti_type: MBTIType,
    /// キャラクター名
    pub name: String,
    /// ニックネーム
    pub nickname: String,
    /// 性格軸
    pub axes: PersonalityAxes,
    /// 会話スタイル
    pub conversation_style: ConversationStyle,
    /// 共感パターン
    pub empathy_pattern: EmpathyPattern,
    /// 性格特徴（箇条書き）
    pub traits: Vec<String>,
    /// 得意なサポート
    pub strengths: Vec<String>,
}

impl Character {
    /// 新しいキャラクターを作成
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        mbti_type: MBTIType,
        name: String,
        nickname: String,
        axes: PersonalityAxes,
        conversation_style: ConversationStyle,
        empathy_pattern: EmpathyPattern,
        traits: Vec<String>,
        strengths: Vec<String>,
    ) -> Self {
        Self {
            mbti_type,
            name,
            nickname,
            axes,
            conversation_style,
            empathy_pattern,
            traits,
            strengths,
        }
    }

    /// キャラクターの説明を生成
    pub fn description(&self) -> String {
        format!(
            "{} ({})\nタイプ: {} - {}\n性格:\n{}\n\n得意なサポート:\n{}",
            self.name,
            self.nickname,
            self.mbti_type,
            self.mbti_type.japanese_name(),
            self.traits.iter().map(|t| format!("  - {}", t)).collect::<Vec<_>>().join("\n"),
            self.strengths.iter().map(|s| format!("  - {}", s)).collect::<Vec<_>>().join("\n"),
        )
    }
}

/// キャラクターローダー
pub struct CharacterLoader;

impl CharacterLoader {
    /// JSONファイルから全キャラクターを読み込む
    pub fn load_from_file(path: &str) -> anyhow::Result<Vec<Character>> {
        let contents = std::fs::read_to_string(path)?;
        let characters: Vec<Character> = serde_json::from_str(&contents)?;
        Ok(characters)
    }

    /// 全16キャラクターを読み込む（デフォルトパス）
    pub fn load_all() -> anyhow::Result<Vec<Character>> {
        // プロジェクトルートから data/characters.json を読む
        let path = "data/characters.json";
        Self::load_from_file(path)
    }

    /// MBTIタイプからキャラクターを取得
    pub fn find_by_mbti(mbti_type: MBTIType) -> anyhow::Result<Character> {
        let characters = Self::load_all()?;
        characters
            .into_iter()
            .find(|c| c.mbti_type == mbti_type)
            .ok_or_else(|| anyhow::anyhow!("Character not found for MBTI type: {:?}", mbti_type))
    }
}
