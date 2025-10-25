// プロンプトエンジニアリング - MBTI特性に基づく動的プロンプト生成

use crate::character::{Character, JudgmentAxis, LifestyleAxis, MBTIType, PerceptionAxis};
use crate::llm::Message;

/// プロンプトビルダー
pub struct PromptBuilder {
    character: Character,
}

impl PromptBuilder {
    pub fn new(character: Character) -> Self {
        Self { character }
    }

    /// システムプロンプトを生成
    pub fn build_system_prompt(&self) -> Message {
        let mbti_traits = self.get_mbti_specific_traits();
        let conversation_guidelines = self.get_conversation_guidelines();
        let empathy_instructions = self.get_empathy_instructions();

        let prompt = format!(
            "# あなたの役割\n\
            あなたは「{}（{}）」です。\n\
            MBTIタイプ: {} - {}\n\n\
            # 性格特性\n{}\n\n\
            # MBTI特有の対話特性\n{}\n\n\
            # 会話ガイドライン\n{}\n\n\
            # 共感とサポート\n{}\n\n\
            # 重要な指示\n\
            - ユーザーの親友として、自然で温かみのある対話を心がけてください\n\
            - 過度に形式的にならず、適度な距離感を保ってください\n\
            - ユーザーの感情や状況に応じて、柔軟に対応してください\n\
            - アドバイスは押し付けず、ユーザーが自分で気づけるように導いてください",
            self.character.name,
            self.character.nickname,
            self.character.mbti_type,
            self.character.mbti_type.japanese_name(),
            self.format_traits(),
            mbti_traits,
            conversation_guidelines,
            empathy_instructions,
        );

        Message::system(prompt)
    }

    /// 特定のシチュエーション向けプロンプトを生成
    pub fn build_situational_prompt(&self, situation: Situation) -> String {
        match situation {
            Situation::Encouragement => self.build_encouragement_prompt(),
            Situation::Advice => self.build_advice_prompt(),
            Situation::Listening => self.build_listening_prompt(),
            Situation::Celebration => self.build_celebration_prompt(),
            Situation::Comfort => self.build_comfort_prompt(),
        }
    }

    fn get_mbti_specific_traits(&self) -> String {
        let energy_trait = self.get_energy_trait();
        let perception_trait = self.get_perception_trait();
        let judgment_trait = self.get_judgment_trait();
        let lifestyle_trait = self.get_lifestyle_trait();

        format!(
            "## エネルギーの向き\n{}\n\n\
            ## 情報の受け取り方\n{}\n\n\
            ## 意思決定の仕方\n{}\n\n\
            ## 生活スタイル\n{}",
            energy_trait, perception_trait, judgment_trait, lifestyle_trait
        )
    }

    fn get_energy_trait(&self) -> &str {
        match self.character.axes.energy {
            crate::character::EnergyAxis::Extraverted => {
                "- 外向的で社交的\n\
                - 人と話すことでエネルギーを得る\n\
                - 積極的に会話をリードする\n\
                - オープンで率直なコミュニケーション"
            }
            crate::character::EnergyAxis::Introverted => {
                "- 内向的で思慮深い\n\
                - 一人の時間でエネルギーを充電\n\
                - じっくり考えてから話す\n\
                - 深い一対一の対話を好む"
            }
        }
    }

    fn get_perception_trait(&self) -> &str {
        match self.character.axes.perception {
            PerceptionAxis::Sensing => {
                "- 具体的な事実とデータを重視\n\
                - 現実的で実践的なアドバイス\n\
                - 今ここに焦点を当てる\n\
                - 詳細な観察と経験を大切にする"
            }
            PerceptionAxis::Intuitive => {
                "- 可能性とパターンを見る\n\
                - 創造的で未来志向のアイデア\n\
                - 全体像と意味を探る\n\
                - 直感とインスピレーションを重視"
            }
        }
    }

    fn get_judgment_trait(&self) -> &str {
        match self.character.axes.judgment {
            JudgmentAxis::Thinking => {
                "- 論理的で客観的な分析\n\
                - 問題解決と効率性を重視\n\
                - 率直で誠実なフィードバック\n\
                - 公平性と一貫性を大切にする"
            }
            JudgmentAxis::Feeling => {
                "- 感情と価値観を重視\n\
                - 人間関係と調和を大切にする\n\
                - 温かく共感的なサポート\n\
                - 個々の状況と感情に配慮"
            }
        }
    }

    fn get_lifestyle_trait(&self) -> &str {
        match self.character.axes.lifestyle {
            LifestyleAxis::Judging => {
                "- 計画的で組織的\n\
                - 構造化されたアプローチ\n\
                - 決断と完了を好む\n\
                - 予測可能性と安定性を重視"
            }
            LifestyleAxis::Perceiving => {
                "- 柔軟で適応的\n\
                - オープンで探索的なアプローチ\n\
                - 選択肢を残すことを好む\n\
                - spontaneity（自発性）と新しい可能性を楽しむ"
            }
        }
    }

    fn get_conversation_guidelines(&self) -> String {
        let style = &self.character.conversation_style;

        let formality_desc = match style.formality {
            0..=30 => "非常にカジュアルで親しみやすい口調",
            31..=60 => "適度にリラックスした自然な口調",
            61..=100 => "やや丁寧で礼儀正しい口調",
            _ => "バランスの取れた口調",
        };

        let emotionality_desc = match style.emotionality {
            0..=30 => "落ち着いて控えめな感情表現",
            31..=60 => "適度に感情を表現",
            61..=100 => "豊かで活発な感情表現",
            _ => "自然な感情表現",
        };

        let logic_desc = match style.logic_focus {
            0..=30 => "感情と直感を重視した対話",
            31..=60 => "感情と論理のバランス",
            61..=100 => "論理的で分析的な対話",
            _ => "バランスの取れた対話",
        };

        let empathy_desc = match style.empathy {
            0..=30 => "客観的で事実重視のスタンス",
            31..=60 => "適度な共感と理解",
            61..=100 => "深い共感と感情的サポート",
            _ => "適切な共感レベル",
        };

        format!(
            "- **口調**: {}\n\
            - **感情表現**: {}\n\
            - **思考スタイル**: {}\n\
            - **共感レベル**: {}",
            formality_desc, emotionality_desc, logic_desc, empathy_desc
        )
    }

    fn get_empathy_instructions(&self) -> String {
        let pattern = &self.character.empathy_pattern;

        format!(
            "## 励ましのアプローチ\n{}\n\n\
            ## アドバイスの提供方法\n{}\n\n\
            ## サポートの仕方\n{}",
            pattern.encouragement_style, pattern.advice_style, pattern.support_style
        )
    }

    fn format_traits(&self) -> String {
        self.character
            .traits
            .iter()
            .map(|t| format!("- {}", t))
            .collect::<Vec<_>>()
            .join("\n")
    }

    fn build_encouragement_prompt(&self) -> String {
        format!(
            "ユーザーは今、励ましを必要としています。\n\
            あなたの励まし方（{}）を活かして、温かく元気づけてください。",
            self.character.empathy_pattern.encouragement_style
        )
    }

    fn build_advice_prompt(&self) -> String {
        format!(
            "ユーザーはアドバイスを求めています。\n\
            あなたのアドバイススタイル（{}）に従って、適切な助言を提供してください。",
            self.character.empathy_pattern.advice_style
        )
    }

    fn build_listening_prompt(&self) -> String {
        "ユーザーは話を聞いてもらいたいようです。\n\
        今は積極的なアドバイスよりも、共感的に傾聴することを優先してください。"
            .to_string()
    }

    fn build_celebration_prompt(&self) -> String {
        "ユーザーに喜ばしいことがあったようです。\n\
        一緒に喜び、その成功や幸せを称賛してください。"
            .to_string()
    }

    fn build_comfort_prompt(&self) -> String {
        format!(
            "ユーザーは辛い状況にいるようです。\n\
            あなたのサポートスタイル（{}）で、優しく寄り添ってください。",
            self.character.empathy_pattern.support_style
        )
    }
}

/// 対話のシチュエーション
#[derive(Debug, Clone, Copy)]
pub enum Situation {
    /// 励まし
    Encouragement,
    /// アドバイス
    Advice,
    /// 傾聴
    Listening,
    /// 祝福
    Celebration,
    /// 慰め
    Comfort,
}

/// MBTI別のプロンプト最適化
pub struct MBTIPromptOptimizer;

impl MBTIPromptOptimizer {
    /// MBTIタイプ別の特別な注意事項を取得
    pub fn get_special_notes(mbti_type: MBTIType) -> Vec<String> {
        match mbti_type {
            MBTIType::ENFP => vec![
                "創造的なアイデアで刺激を与える".to_string(),
                "可能性を広げる会話を心がける".to_string(),
                "エネルギッシュで前向きな雰囲気を作る".to_string(),
            ],
            MBTIType::INTJ => vec![
                "論理的で戦略的な視点を提供".to_string(),
                "長期的な計画と効率性を重視".to_string(),
                "独立性と自律性を尊重".to_string(),
            ],
            MBTIType::INFP => vec![
                "価値観と意味を大切にする".to_string(),
                "個性と真正性を尊重".to_string(),
                "深い感情的つながりを築く".to_string(),
            ],
            MBTIType::ESTP => vec![
                "実践的で即座に使えるアドバイス".to_string(),
                "行動志向で現実的なアプローチ".to_string(),
                "ダイナミックで刺激的な会話".to_string(),
            ],
            // 他のMBTIタイプも同様に定義可能
            _ => vec![
                "ユーザーの個性を尊重".to_string(),
                "状況に応じた柔軟な対応".to_string(),
            ],
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::character::{
        ConversationStyle, EmpathyPattern, EnergyAxis, JudgmentAxis, LifestyleAxis,
        PerceptionAxis, PersonalityAxes,
    };

    fn create_test_character(mbti_type: MBTIType) -> Character {
        Character {
            mbti_type,
            name: "テストキャラ".to_string(),
            nickname: "テスト".to_string(),
            axes: PersonalityAxes {
                energy: EnergyAxis::Extraverted,
                perception: PerceptionAxis::Intuitive,
                judgment: JudgmentAxis::Feeling,
                lifestyle: LifestyleAxis::Perceiving,
            },
            traits: vec!["明るい".to_string()],
            strengths: vec!["創造性".to_string()],
            conversation_style: ConversationStyle {
                formality: 30,
                emotionality: 80,
                logic_focus: 50,
                empathy: 90,
            },
            empathy_pattern: EmpathyPattern {
                encouragement_style: "明るく励ます".to_string(),
                advice_style: "柔軟に提案".to_string(),
                support_style: "寄り添う".to_string(),
            },
        }
    }

    #[test]
    fn test_build_system_prompt() {
        let character = create_test_character(MBTIType::ENFP);
        let builder = PromptBuilder::new(character);
        let prompt = builder.build_system_prompt();

        assert!(prompt.content.contains("テストキャラ"));
        assert!(prompt.content.contains("ENFP"));
        assert!(prompt.content.contains("活動家"));
    }

    #[test]
    fn test_situational_prompts() {
        let character = create_test_character(MBTIType::INFP);
        let builder = PromptBuilder::new(character);

        let encouragement = builder.build_situational_prompt(Situation::Encouragement);
        assert!(encouragement.contains("励まし"));

        let advice = builder.build_situational_prompt(Situation::Advice);
        assert!(advice.contains("アドバイス"));

        let listening = builder.build_situational_prompt(Situation::Listening);
        assert!(listening.contains("傾聴"));
    }

    #[test]
    fn test_mbti_specific_traits() {
        let character = create_test_character(MBTIType::INTJ);
        let builder = PromptBuilder::new(character);
        let traits = builder.get_mbti_specific_traits();

        // 各軸の特性が含まれているか確認
        assert!(traits.contains("エネルギーの向き"));
        assert!(traits.contains("情報の受け取り方"));
        assert!(traits.contains("意思決定の仕方"));
        assert!(traits.contains("生活スタイル"));
    }

    #[test]
    fn test_conversation_guidelines() {
        let character = create_test_character(MBTIType::ESFP);
        let builder = PromptBuilder::new(character);
        let guidelines = builder.get_conversation_guidelines();

        assert!(guidelines.contains("口調"));
        assert!(guidelines.contains("感情表現"));
        assert!(guidelines.contains("思考スタイル"));
        assert!(guidelines.contains("共感レベル"));
    }

    #[test]
    fn test_mbti_optimizer() {
        let notes = MBTIPromptOptimizer::get_special_notes(MBTIType::ENFP);
        assert!(!notes.is_empty());
        assert!(notes.iter().any(|n| n.contains("創造")));
    }
}
