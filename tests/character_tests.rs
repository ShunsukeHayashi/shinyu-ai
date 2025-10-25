use shinyu_ai::*;

#[test]
fn test_mbti_all_types() {
    // 全16タイプが取得できることを確認
    let all_types = MBTIType::all();
    assert_eq!(all_types.len(), 16);
}

#[test]
fn test_mbti_japanese_name() {
    // 各タイプの日本語名が正しいことを確認
    assert_eq!(MBTIType::ENFP.japanese_name(), "活動家");
    assert_eq!(MBTIType::INTJ.japanese_name(), "建築家");
    assert_eq!(MBTIType::ISFJ.japanese_name(), "擁護者");
    assert_eq!(MBTIType::ESTP.japanese_name(), "起業家");
}

#[test]
fn test_load_all_characters() {
    // 全16キャラクターが読み込めることを確認
    let characters = CharacterLoader::load_all().expect("Failed to load characters");
    assert_eq!(characters.len(), 16);
}

#[test]
fn test_find_by_mbti() {
    // MBTIタイプからキャラクターを検索
    let character = CharacterLoader::find_by_mbti(MBTIType::ENFP)
        .expect("Failed to find ENFP character");

    assert_eq!(character.mbti_type, MBTIType::ENFP);
    assert_eq!(character.name, "エネ");
    assert_eq!(character.nickname, "ENE");
}

#[test]
fn test_character_description() {
    // キャラクターの説明生成
    let character = CharacterLoader::find_by_mbti(MBTIType::ENFP)
        .expect("Failed to find ENFP character");

    let description = character.description();
    assert!(description.contains("エネ"));
    assert!(description.contains("ENFP"));
    assert!(description.contains("活動家"));
}

#[test]
fn test_all_mbti_types_have_characters() {
    // 全MBTIタイプに対応するキャラクターが存在することを確認
    let characters = CharacterLoader::load_all().expect("Failed to load characters");

    for mbti_type in MBTIType::all() {
        let found = characters.iter().any(|c| c.mbti_type == mbti_type);
        assert!(found, "No character found for MBTI type: {:?}", mbti_type);
    }
}

#[test]
fn test_conversation_style_ranges() {
    // 会話スタイルの各パラメータが0-100の範囲内であることを確認
    let characters = CharacterLoader::load_all().expect("Failed to load characters");

    for character in characters {
        assert!(character.conversation_style.formality <= 100);
        assert!(character.conversation_style.emotionality <= 100);
        assert!(character.conversation_style.logic_focus <= 100);
        assert!(character.conversation_style.empathy <= 100);
    }
}

#[test]
fn test_json_serialization() {
    // キャラクターのJSON シリアライズ/デシリアライズ
    let character = CharacterLoader::find_by_mbti(MBTIType::ENFP)
        .expect("Failed to find ENFP character");

    let json = serde_json::to_string(&character).expect("Failed to serialize");
    let deserialized: Character = serde_json::from_str(&json).expect("Failed to deserialize");

    assert_eq!(character, deserialized);
}
