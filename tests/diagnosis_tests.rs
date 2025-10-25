use shinyu_ai::*;

#[test]
fn test_answer_from_u8() {
    assert_eq!(Answer::from_u8(1), Some(Answer::StronglyDisagree));
    assert_eq!(Answer::from_u8(3), Some(Answer::Neutral));
    assert_eq!(Answer::from_u8(5), Some(Answer::StronglyAgree));
    assert_eq!(Answer::from_u8(6), None);
}

#[test]
fn test_answer_to_score() {
    assert_eq!(Answer::StronglyDisagree.to_score(), 1);
    assert_eq!(Answer::Neutral.to_score(), 3);
    assert_eq!(Answer::StronglyAgree.to_score(), 5);
}

#[test]
fn test_question_set_default() {
    let question_set = QuestionSet::default_set();
    assert_eq!(question_set.len(), 16);
    assert!(!question_set.is_empty());
}

#[test]
fn test_diagnosis_session_new() {
    let session = DiagnosisSession::new();
    assert_eq!(session.current_question, 0);
    assert_eq!(session.answers.len(), 16);
    assert!(!session.is_complete());
}

#[test]
fn test_diagnosis_session_record_answer() {
    let mut session = DiagnosisSession::new();

    session.record_answer(Answer::Agree);
    assert_eq!(session.current_question, 1);
    assert_eq!(session.answers[0], Some(Answer::Agree));
}

#[test]
fn test_diagnosis_session_complete() {
    let mut session = DiagnosisSession::new();

    // 全質問に回答
    for _ in 0..16 {
        session.record_answer(Answer::Neutral);
    }

    assert!(session.is_complete());
}

#[test]
fn test_calculate_result_enfp() {
    let mut session = DiagnosisSession::new();

    // ENFP になるように回答
    // E軸: 外向的な回答
    session.record_answer(Answer::StronglyAgree);  // Q1
    session.record_answer(Answer::StronglyAgree);  // Q2
    session.record_answer(Answer::StronglyDisagree); // Q3 (反転)
    session.record_answer(Answer::StronglyAgree);  // Q4

    // N軸: 直感的な回答
    session.record_answer(Answer::StronglyDisagree); // Q5 (S)
    session.record_answer(Answer::StronglyAgree);  // Q6 (N, 反転)
    session.record_answer(Answer::StronglyDisagree); // Q7 (S)
    session.record_answer(Answer::StronglyAgree);  // Q8 (N, 反転)

    // F軸: 感情的な回答
    session.record_answer(Answer::StronglyDisagree); // Q9 (T)
    session.record_answer(Answer::StronglyAgree);  // Q10 (F, 反転)
    session.record_answer(Answer::StronglyDisagree); // Q11 (T)
    session.record_answer(Answer::StronglyAgree);  // Q12 (F, 反転)

    // P軸: 柔軟な回答
    session.record_answer(Answer::StronglyDisagree); // Q13 (J)
    session.record_answer(Answer::StronglyAgree);  // Q14 (P, 反転)
    session.record_answer(Answer::StronglyDisagree); // Q15 (J)
    session.record_answer(Answer::StronglyAgree);  // Q16 (P, 反転)

    let result = session.calculate_result().expect("Should return result");
    assert_eq!(result.mbti_type, MBTIType::ENFP);
}

#[test]
fn test_calculate_result_intj() {
    let mut session = DiagnosisSession::new();

    // INTJ になるように回答
    // I軸: 内向的な回答
    session.record_answer(Answer::StronglyDisagree);  // Q1
    session.record_answer(Answer::StronglyDisagree);  // Q2
    session.record_answer(Answer::StronglyAgree);   // Q3 (反転)
    session.record_answer(Answer::StronglyDisagree);  // Q4

    // N軸: 直感的な回答
    session.record_answer(Answer::StronglyDisagree); // Q5 (S)
    session.record_answer(Answer::StronglyAgree);  // Q6 (N, 反転)
    session.record_answer(Answer::StronglyDisagree); // Q7 (S)
    session.record_answer(Answer::StronglyAgree);  // Q8 (N, 反転)

    // T軸: 論理的な回答
    session.record_answer(Answer::StronglyAgree);  // Q9 (T)
    session.record_answer(Answer::StronglyDisagree); // Q10 (F, 反転)
    session.record_answer(Answer::StronglyAgree);  // Q11 (T)
    session.record_answer(Answer::StronglyDisagree); // Q12 (F, 反転)

    // J軸: 計画的な回答
    session.record_answer(Answer::StronglyAgree);  // Q13 (J)
    session.record_answer(Answer::StronglyDisagree); // Q14 (P, 反転)
    session.record_answer(Answer::StronglyAgree);  // Q15 (J)
    session.record_answer(Answer::StronglyDisagree); // Q16 (P, 反転)

    let result = session.calculate_result().expect("Should return result");
    assert_eq!(result.mbti_type, MBTIType::INTJ);
}

#[test]
fn test_incomplete_session() {
    let mut session = DiagnosisSession::new();

    // 半分だけ回答
    for _ in 0..8 {
        session.record_answer(Answer::Neutral);
    }

    // 未完了なのでNoneを返す
    assert!(session.calculate_result().is_none());
}

#[test]
fn test_axis_scores_determine_mbti() {
    let scores = AxisScores {
        energy: 5,      // E
        perception: -3, // N
        judgment: 2,    // T
        lifestyle: 4,   // J
    };

    assert_eq!(scores.determine_mbti_type(), MBTIType::ENTJ);
}
