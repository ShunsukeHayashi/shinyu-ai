//! # 診断ロジックモジュール
//!
//! MBTI診断の質問セットとスコアリングアルゴリズム

use crate::character::MBTIType;
use serde::{Deserialize, Serialize};

/// 診断の回答（1-5スケール）
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Answer {
    /// 1 - 全くそう思わない
    StronglyDisagree = 1,
    /// 2 - そう思わない
    Disagree = 2,
    /// 3 - どちらでもない
    Neutral = 3,
    /// 4 - そう思う
    Agree = 4,
    /// 5 - 強くそう思う
    StronglyAgree = 5,
}

impl Answer {
    /// 数値からAnswerを生成
    pub fn from_u8(value: u8) -> Option<Self> {
        match value {
            1 => Some(Answer::StronglyDisagree),
            2 => Some(Answer::Disagree),
            3 => Some(Answer::Neutral),
            4 => Some(Answer::Agree),
            5 => Some(Answer::StronglyAgree),
            _ => None,
        }
    }

    /// Answerを数値に変換
    pub fn to_score(self) -> i32 {
        self as i32
    }
}

/// 性格軸の種類
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AxisType {
    /// E（外向型）vs I（内向型）
    EnergyAxis,
    /// S（感覚型）vs N（直感型）
    PerceptionAxis,
    /// T（思考型）vs F（感情型）
    JudgmentAxis,
    /// J（判断型）vs P（知覚型）
    LifestyleAxis,
}

/// 診断質問
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Question {
    /// 質問ID
    pub id: usize,
    /// 質問文
    pub text: String,
    /// 対象となる性格軸
    pub axis: AxisType,
    /// 反転スコア（true = スコアを反転）
    pub reverse_score: bool,
}

/// 診断質問セット
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct QuestionSet {
    /// 全質問
    pub questions: Vec<Question>,
}

impl QuestionSet {
    /// デフォルトの質問セットを作成
    pub fn default_set() -> Self {
        Self {
            questions: vec![
                // E/I軸（エネルギーの方向）
                Question {
                    id: 1,
                    text: "大人数のパーティーや集まりが好きだ".to_string(),
                    axis: AxisType::EnergyAxis,
                    reverse_score: false,
                },
                Question {
                    id: 2,
                    text: "初対面の人と話すのが得意だ".to_string(),
                    axis: AxisType::EnergyAxis,
                    reverse_score: false,
                },
                Question {
                    id: 3,
                    text: "一人で過ごす時間が必要だ".to_string(),
                    axis: AxisType::EnergyAxis,
                    reverse_score: true,
                },
                Question {
                    id: 4,
                    text: "人と一緒にいるとエネルギーが湧いてくる".to_string(),
                    axis: AxisType::EnergyAxis,
                    reverse_score: false,
                },

                // S/N軸（情報の受け取り方）
                Question {
                    id: 5,
                    text: "細かいディテールに注目することが多い".to_string(),
                    axis: AxisType::PerceptionAxis,
                    reverse_score: false,
                },
                Question {
                    id: 6,
                    text: "抽象的なアイデアや理論を考えるのが好きだ".to_string(),
                    axis: AxisType::PerceptionAxis,
                    reverse_score: true,
                },
                Question {
                    id: 7,
                    text: "実践的で具体的な情報を重視する".to_string(),
                    axis: AxisType::PerceptionAxis,
                    reverse_score: false,
                },
                Question {
                    id: 8,
                    text: "未来の可能性や全体像を考えることが多い".to_string(),
                    axis: AxisType::PerceptionAxis,
                    reverse_score: true,
                },

                // T/F軸（判断の基準）
                Question {
                    id: 9,
                    text: "決断する時は論理的な分析を重視する".to_string(),
                    axis: AxisType::JudgmentAxis,
                    reverse_score: false,
                },
                Question {
                    id: 10,
                    text: "人の感情や価値観を大切にする".to_string(),
                    axis: AxisType::JudgmentAxis,
                    reverse_score: true,
                },
                Question {
                    id: 11,
                    text: "客観的な事実を基に判断することが多い".to_string(),
                    axis: AxisType::JudgmentAxis,
                    reverse_score: false,
                },
                Question {
                    id: 12,
                    text: "他人の気持ちに共感しやすい".to_string(),
                    axis: AxisType::JudgmentAxis,
                    reverse_score: true,
                },

                // J/P軸（ライフスタイル）
                Question {
                    id: 13,
                    text: "計画を立ててから行動することが多い".to_string(),
                    axis: AxisType::LifestyleAxis,
                    reverse_score: false,
                },
                Question {
                    id: 14,
                    text: "柔軟に対応し、即興で行動するのが好きだ".to_string(),
                    axis: AxisType::LifestyleAxis,
                    reverse_score: true,
                },
                Question {
                    id: 15,
                    text: "物事を整理整頓するのが好きだ".to_string(),
                    axis: AxisType::LifestyleAxis,
                    reverse_score: false,
                },
                Question {
                    id: 16,
                    text: "締め切りギリギリまで柔軟に選択肢を残したい".to_string(),
                    axis: AxisType::LifestyleAxis,
                    reverse_score: true,
                },
            ],
        }
    }

    /// 質問数を取得
    pub fn len(&self) -> usize {
        self.questions.len()
    }

    /// 質問セットが空かどうか
    pub fn is_empty(&self) -> bool {
        self.questions.is_empty()
    }
}

/// 診断結果
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiagnosisResult {
    /// 判定されたMBTIタイプ
    pub mbti_type: MBTIType,
    /// 各軸のスコア
    pub axis_scores: AxisScores,
}

/// 各軸のスコア
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AxisScores {
    /// E/I軸のスコア（正: E, 負: I）
    pub energy: i32,
    /// S/N軸のスコア（正: S, 負: N）
    pub perception: i32,
    /// T/F軸のスコア（正: T, 負: F）
    pub judgment: i32,
    /// J/P軸のスコア（正: J, 負: P）
    pub lifestyle: i32,
}

impl AxisScores {
    /// MBTIタイプを判定
    pub fn determine_mbti_type(&self) -> MBTIType {
        let e_or_i = if self.energy > 0 { 'E' } else { 'I' };
        let s_or_n = if self.perception > 0 { 'S' } else { 'N' };
        let t_or_f = if self.judgment > 0 { 'T' } else { 'F' };
        let j_or_p = if self.lifestyle > 0 { 'J' } else { 'P' };

        match format!("{}{}{}{}", e_or_i, s_or_n, t_or_f, j_or_p).as_str() {
            "ENFP" => MBTIType::ENFP,
            "INTJ" => MBTIType::INTJ,
            "ISFJ" => MBTIType::ISFJ,
            "ESTP" => MBTIType::ESTP,
            "INFP" => MBTIType::INFP,
            "ENTJ" => MBTIType::ENTJ,
            "ISTJ" => MBTIType::ISTJ,
            "ESFP" => MBTIType::ESFP,
            "ENTP" => MBTIType::ENTP,
            "INFJ" => MBTIType::INFJ,
            "ISTP" => MBTIType::ISTP,
            "ESFJ" => MBTIType::ESFJ,
            "ENFJ" => MBTIType::ENFJ,
            "INTP" => MBTIType::INTP,
            "ISFP" => MBTIType::ISFP,
            "ESTJ" => MBTIType::ESTJ,
            _ => MBTIType::ENFP, // デフォルト
        }
    }
}

/// 診断セッション
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DiagnosisSession {
    /// 質問セット
    pub question_set: QuestionSet,
    /// 回答リスト
    pub answers: Vec<Option<Answer>>,
    /// 現在の質問番号
    pub current_question: usize,
}

impl DiagnosisSession {
    /// 新しい診断セッションを作成
    pub fn new() -> Self {
        let question_set = QuestionSet::default_set();
        let answer_count = question_set.len();

        Self {
            question_set,
            answers: vec![None; answer_count],
            current_question: 0,
        }
    }

    /// 現在の質問を取得
    pub fn current_question_text(&self) -> Option<&Question> {
        self.question_set.questions.get(self.current_question)
    }

    /// 回答を記録
    pub fn record_answer(&mut self, answer: Answer) {
        if self.current_question < self.answers.len() {
            self.answers[self.current_question] = Some(answer);
            self.current_question += 1;
        }
    }

    /// 診断が完了しているか
    pub fn is_complete(&self) -> bool {
        self.current_question >= self.answers.len()
    }

    /// 診断結果を計算
    pub fn calculate_result(&self) -> Option<DiagnosisResult> {
        if !self.is_complete() {
            return None;
        }

        let mut energy_score = 0;
        let mut perception_score = 0;
        let mut judgment_score = 0;
        let mut lifestyle_score = 0;

        for (question, answer) in self.question_set.questions.iter().zip(self.answers.iter()) {
            if let Some(ans) = answer {
                let mut score = ans.to_score() - 3; // 中央値を0に調整（3がニュートラル）

                // 反転スコア処理
                if question.reverse_score {
                    score = -score;
                }

                match question.axis {
                    AxisType::EnergyAxis => energy_score += score,
                    AxisType::PerceptionAxis => perception_score += score,
                    AxisType::JudgmentAxis => judgment_score += score,
                    AxisType::LifestyleAxis => lifestyle_score += score,
                }
            }
        }

        let axis_scores = AxisScores {
            energy: energy_score,
            perception: perception_score,
            judgment: judgment_score,
            lifestyle: lifestyle_score,
        };

        let mbti_type = axis_scores.determine_mbti_type();

        Some(DiagnosisResult {
            mbti_type,
            axis_scores,
        })
    }
}

impl Default for DiagnosisSession {
    fn default() -> Self {
        Self::new()
    }
}
