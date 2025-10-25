# Shinyu AI - アーキテクチャ設計書

**バージョン**: 0.1.0
**最終更新**: 2025-10-25
**ステータス**: Phase 1 (診断システムMVP)

---

## 目次

1. [システム概要](#システム概要)
2. [アーキテクチャ図](#アーキテクチャ図)
3. [モジュール構成](#モジュール構成)
4. [データフロー](#データフロー)
5. [主要な設計判断](#主要な設計判断)
6. [技術スタック](#技術スタック)
7. [セキュリティ設計](#セキュリティ設計)
8. [拡張性設計](#拡張性設計)

---

## システム概要

### コンセプト

Shinyu AI（親友AI）は、性格診断に基づいてユーザーに最適なAIコンパニオンを提供するシステムです。MBTI診断を用いて16種類のキャラクターから最適な「分身AI」を選択し、日常の悩み相談や対話を通じてユーザーに寄り添います。

### 主要機能（現在 + 予定）

#### Phase 1: 診断システム (MVP) ✅ 進行中
- MBTI診断（16質問、4軸評価）
- 16種類のキャラクター選択
- 診断結果の表示
- CLI インターフェース

#### Phase 2: AI対話システム（予定）
- LLM統合（Claude API）
- キャラクター別会話スタイル
- 会話履歴管理
- 感情分析

#### Phase 3: 音声対話（予定）
- Whisper API（音声→テキスト）
- VOICEVOX（テキスト→音声）
- リアルタイム音声対話

#### Phase 4: SNS連携（予定）
- Twitter/Instagram API統合
- 投稿の感情分析
- 自発的サポート機能

---

## アーキテクチャ図

### システム全体構成

```
┌──────────────────────────────────────────────────────────────┐
│                        Shinyu AI System                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              CLI Interface (main.rs)                 │    │
│  │  - diagnose: 診断開始                                 │    │
│  │  - show-result: 結果表示                             │    │
│  │  - list-characters: キャラクター一覧                  │    │
│  └──────────────┬──────────────────────────────────────┘    │
│                 │                                             │
│  ┌──────────────┴──────────────────────────────────────┐    │
│  │           Core Library (lib.rs)                      │    │
│  │                                                       │    │
│  │  ┌─────────────────┐  ┌──────────────────┐         │    │
│  │  │  diagnosis.rs   │  │  character.rs     │         │    │
│  │  │                 │  │                   │         │    │
│  │  │ - QuestionSet   │  │ - MBTIType (enum) │         │    │
│  │  │ - Question      │  │ - Character       │         │    │
│  │  │ - Answer        │  │ - Loader          │         │    │
│  │  │ - Session       │  │ - Axes            │         │    │
│  │  │ - AxisScores    │  │                   │         │    │
│  │  └─────────────────┘  └──────────────────┘         │    │
│  │                                                       │    │
│  └───────────────────────────────────────────────────────┘  │
│                                                                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                Data Layer                              │  │
│  │                                                         │  │
│  │  data/characters.json (16キャラクター定義)             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                                │
└──────────────────────────────────────────────────────────────┘

Future Integrations (Phase 2-4):
┌──────────────────────────────────────────────────────────────┐
│  External Services                                            │
│  - Claude API / OpenAI API (LLM)                             │
│  - Whisper API (音声認識)                                      │
│  - VOICEVOX Engine (音声合成)                                 │
│  - Twitter API v2 (SNS連携)                                   │
│  - Instagram Graph API (SNS連携)                              │
└──────────────────────────────────────────────────────────────┘
```

### モジュール依存関係図

```
main.rs
  │
  ├─→ lib.rs
  │     │
  │     ├─→ character.rs
  │     │     ├─→ MBTIType (enum)
  │     │     ├─→ PersonalityAxes
  │     │     ├─→ Character (struct)
  │     │     └─→ CharacterLoader
  │     │
  │     └─→ diagnosis.rs
  │           ├─→ Answer (enum)
  │           ├─→ AxisType (enum)
  │           ├─→ Question (struct)
  │           ├─→ QuestionSet (struct)
  │           ├─→ DiagnosisSession (struct)
  │           ├─→ AxisScores (struct)
  │           └─→ DiagnosisResult (struct)
  │
  └─→ data/characters.json (外部データ)
```

---

## モジュール構成

### 1. `main.rs` - CLIエントリーポイント

**責任範囲**:
- コマンドライン引数パース（clap）
- ユーザーインタラクション（標準入出力）
- 診断フローのオーケストレーション
- 結果の表示フォーマット

**主要コマンド**:
```rust
enum Commands {
    Diagnose,        // 性格診断を開始
    ShowResult,      // 診断結果を表示（将来実装）
    ListCharacters,  // 16種類のキャラクター一覧
}
```

**依存関係**:
- `clap`: CLI引数パース
- `colored`: ターミナル色付け
- `shinyu_ai::*`: ライブラリ機能

---

### 2. `lib.rs` - ライブラリルート

**責任範囲**:
- パブリックAPIの公開
- モジュールの統合

**公開モジュール**:
```rust
pub mod character;
pub mod diagnosis;
// 将来: pub mod conversation;
// 将来: pub mod sns;
```

---

### 3. `character.rs` - キャラクター定義モジュール

**責任範囲**:
- MBTI 16タイプの定義
- キャラクター属性の管理
- JSONデータの読み込み

**主要型**:

#### `MBTIType` (enum)
```rust
pub enum MBTIType {
    ENFP, INTJ, ISFJ, ESTP, INFP, ENTJ, ISTJ, ESFP,
    ENTP, INFJ, ISTP, ESFJ, ENFJ, INTP, ISFP, ESTJ,
}
```

16種類のMBTIパーソナリティタイプを表現します。

#### `PersonalityAxes` (struct)
```rust
pub struct PersonalityAxes {
    pub energy: EnergyAxis,        // E/I
    pub perception: PerceptionAxis, // S/N
    pub judgment: JudgmentAxis,     // T/F
    pub lifestyle: LifestyleAxis,   // J/P
}
```

#### `Character` (struct)
```rust
pub struct Character {
    pub mbti_type: MBTIType,
    pub name: String,
    pub nickname: String,
    pub axes: PersonalityAxes,
    pub conversation_style: ConversationStyle,
    pub empathy_pattern: EmpathyPattern,
    pub traits: Vec<String>,
    pub strengths: Vec<String>,
}
```

#### `CharacterLoader` (struct)
```rust
impl CharacterLoader {
    pub fn load_all() -> anyhow::Result<Vec<Character>>;
    pub fn find_by_mbti(mbti_type: MBTIType) -> anyhow::Result<Character>;
}
```

**データソース**: `data/characters.json`

---

### 4. `diagnosis.rs` - 診断ロジックモジュール

**責任範囲**:
- MBTI診断質問の定義
- 診断セッション管理
- スコアリングアルゴリズム

**主要型**:

#### `Answer` (enum)
```rust
pub enum Answer {
    StronglyDisagree = 1,
    Disagree = 2,
    Neutral = 3,
    Agree = 4,
    StronglyAgree = 5,
}
```

5段階リッカート尺度による回答。

#### `Question` (struct)
```rust
pub struct Question {
    pub id: usize,
    pub text: String,
    pub axis: AxisType,
    pub reverse_score: bool,
}
```

#### `QuestionSet` (struct)
```rust
impl QuestionSet {
    pub fn default_set() -> Self; // 16質問のデフォルトセット
}
```

**質問構成**:
- E/I軸: 4質問
- S/N軸: 4質問
- T/F軸: 4質問
- J/P軸: 4質問

#### `DiagnosisSession` (struct)
```rust
pub struct DiagnosisSession {
    pub question_set: QuestionSet,
    pub answers: Vec<Option<Answer>>,
    pub current_question: usize,
}

impl DiagnosisSession {
    pub fn new() -> Self;
    pub fn record_answer(&mut self, answer: Answer);
    pub fn is_complete(&self) -> bool;
    pub fn calculate_result(&self) -> Option<DiagnosisResult>;
}
```

#### `AxisScores` (struct)
```rust
pub struct AxisScores {
    pub energy: i32,      // 正: E, 負: I
    pub perception: i32,  // 正: S, 負: N
    pub judgment: i32,    // 正: T, 負: F
    pub lifestyle: i32,   // 正: J, 負: P
}

impl AxisScores {
    pub fn determine_mbti_type(&self) -> MBTIType;
}
```

---

## データフロー

### 診断フロー（Phase 1）

```
1. ユーザー起動
   $ cargo run -- diagnose
          ↓
2. DiagnosisSession::new()
   - QuestionSet::default_set() で16質問ロード
   - answers: Vec<None> (16個) 初期化
          ↓
3. 質問ループ (16回)
   ┌──────────────────────────┐
   │  current_question_text() │ → 質問表示
   │          ↓               │
   │  ユーザー入力 (1-5)       │
   │          ↓               │
   │  record_answer()         │ → 回答記録
   │          ↓               │
   │  current_question++      │
   └──────────────────────────┘
          ↓
4. is_complete() == true
          ↓
5. calculate_result()
   - 各軸のスコア計算
     * score = (answer - 3)
     * reverse_score の場合: score = -score
   - AxisScores::determine_mbti_type()
     * 各軸の正負でMBTIタイプ決定
          ↓
6. CharacterLoader::find_by_mbti()
   - data/characters.json から該当キャラクター取得
          ↓
7. 結果表示
   - MBTIタイプ
   - キャラクター名・ニックネーム
   - 性格特徴
   - 得意なサポート
```

### スコアリングアルゴリズム

```rust
// 各質問のスコア変換
let mut score = answer.to_score() - 3;  // 1-5 → -2~+2

// 反転スコア処理
if question.reverse_score {
    score = -score;
}

// 軸ごとに累積
match question.axis {
    AxisType::EnergyAxis => energy_score += score,
    AxisType::PerceptionAxis => perception_score += score,
    AxisType::JudgmentAxis => judgment_score += score,
    AxisType::LifestyleAxis => lifestyle_score += score,
}

// 最終判定
let e_or_i = if energy_score > 0 { 'E' } else { 'I' };
let s_or_n = if perception_score > 0 { 'S' } else { 'N' };
let t_or_f = if judgment_score > 0 { 'T' } else { 'F' };
let j_or_p = if lifestyle_score > 0 { 'J' } else { 'P' };

// MBTIType::ENFP など
```

---

## 主要な設計判断

### 1. Rust採用理由

**選択**: Rust 2021 Edition

**理由**:
- 型安全性（コンパイル時エラー検出）
- メモリ安全性（所有権システム）
- 高性能（ゼロコスト抽象化）
- エコシステム（Cargo、crates.io）
- 非同期サポート（Tokio）

**トレードオフ**:
- 学習曲線が急
- コンパイル時間が長い

---

### 2. JSONベースのキャラクターデータ

**選択**: `data/characters.json`

**理由**:
- 実装とデータの分離
- 非エンジニアでも編集可能
- バージョン管理が容易
- ホットリロード可能（将来）

**代替案**:
- Rustコード内にハードコード → 変更時に再コンパイル必要
- TOML/YAML → JSON以外の追加パース依存

---

### 3. CLIファーストアプローチ

**選択**: CLI（clap）

**理由**:
- MVP開発の高速化
- テスト・デバッグが容易
- CI/CD統合が簡単
- 将来的にGUI/Web追加可能

**Phase 2以降**:
- Web UI（Axum + Yew/Leptos）
- モバイルアプリ（Tauri）

---

### 4. MBTI診断アルゴリズム

**選択**: 単純な4軸スコアリング

**実装**:
```
各軸4質問 × 4軸 = 16質問
スコア範囲: 各軸 -8 ~ +8
判定: ゼロを境界に二分
```

**理由**:
- シンプルで実装が容易
- 計算コストが低い
- 結果の再現性が高い

**将来的改善案**:
- 重み付けスコアリング
- 閾値の動的調整
- 多次元クラスタリング

---

### 5. モジュール分割戦略

**選択**: 機能ベース分割

```
character.rs  → キャラクター関連
diagnosis.rs  → 診断ロジック関連
```

**理由**:
- 責任範囲が明確
- テストが書きやすい
- 並行開発が可能

**将来的な拡張**:
```
conversation.rs  → AI対話
sns.rs          → SNS連携
voice.rs        → 音声処理
storage.rs      → データ永続化
```

---

### 6. エラーハンドリング戦略

**選択**: `anyhow::Result` + カスタムエラー

**現在**:
```rust
pub fn load_all() -> anyhow::Result<Vec<Character>>
```

**理由**:
- MVP段階では柔軟性優先
- エラーチェーンが容易

**Phase 2以降**:
```rust
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ShinyuError {
    #[error("Character not found: {mbti_type}")]
    CharacterNotFound { mbti_type: MBTIType },

    #[error("Diagnosis incomplete")]
    DiagnosisIncomplete,

    #[error("API error: {0}")]
    ApiError(String),
}
```

---

## 技術スタック

### コア技術

| カテゴリ | 技術 | 用途 | バージョン |
|---------|------|------|-----------|
| **言語** | Rust | システム全体 | 2021 Edition |
| **非同期ランタイム** | Tokio | 非同期処理 | 1.40+ |
| **CLI** | Clap | コマンドライン | 4.5+ |
| **シリアライゼーション** | Serde | JSON処理 | 1.0+ |
| **エラーハンドリング** | anyhow | エラー管理 | 1.0+ |
| **カラー出力** | colored | ターミナル装飾 | 3.0+ |

### 将来的統合（Phase 2-4）

| カテゴリ | 技術 | 用途 | 備考 |
|---------|------|------|------|
| **LLM** | Anthropic Claude | AI対話 | async-openai crate |
| **音声認識** | OpenAI Whisper | 音声→テキスト | Whisper API |
| **音声合成** | VOICEVOX | テキスト→音声 | Local Engine |
| **SNS** | Twitter API v2 | ツイート分析 | reqwest |
| **SNS** | Instagram Graph API | 投稿分析 | reqwest |
| **Web UI** | Axum + Yew | Webフロントエンド | Phase 3 |

---

## セキュリティ設計

### Phase 1（現在）

**脅威モデル**:
- ローカル実行のみ
- 外部API通信なし
- ユーザーデータ保存なし

**対策**:
- 入力検証（1-5の範囲チェック）
- パニック防止（unwrap最小化）

### Phase 2以降

**追加脅威**:
- API キー漏洩
- 個人情報流出
- MITM攻撃

**対策**:
```rust
// 環境変数からAPIキー読み込み
let api_key = std::env::var("ANTHROPIC_API_KEY")?;

// HTTPSのみ
let client = reqwest::Client::builder()
    .https_only(true)
    .build()?;

// データ暗号化
use aes_gcm::{Aes256Gcm, Key, Nonce};
```

**データ保護**:
- ユーザー診断結果: ローカル暗号化
- 会話履歴: SQLite + SQLCipher
- APIキー: システムキーチェーン（macOS Keychain Access等）

---

## 拡張性設計

### 1. プラグイン型キャラクター

**現在**:
```
data/characters.json (16キャラクター固定)
```

**将来**:
```
data/
  ├── official/
  │   └── characters.json
  └── plugins/
      ├── anime_pack.json
      └── celebrity_pack.json
```

### 2. マルチLLMサポート

**Phase 2**:
```rust
pub trait LLMProvider {
    async fn complete(&self, prompt: &str) -> Result<String>;
}

pub struct ClaudeProvider { /* ... */ }
pub struct GPTProvider { /* ... */ }
pub struct LocalLLMProvider { /* ... */ }  // Ollama等
```

### 3. 多言語対応

**Phase 3**:
```rust
pub struct Character {
    pub name: HashMap<Locale, String>,  // en, ja, zh, etc
    pub traits: HashMap<Locale, Vec<String>>,
}
```

### 4. クラウド同期

**Phase 4**:
```rust
pub trait SyncProvider {
    async fn push(&self, data: UserData) -> Result<()>;
    async fn pull(&self) -> Result<UserData>;
}

pub struct FirebaseSync { /* ... */ }
pub struct AWSSync { /* ... */ }
```

---

## パフォーマンス設計

### 現在の性能

| 項目 | 測定値 | 目標 |
|------|--------|------|
| 起動時間 | ~50ms | < 100ms |
| 診断完了時間 | ~30秒 | ユーザー依存 |
| メモリ使用量 | ~5MB | < 50MB |
| バイナリサイズ | ~3MB | < 10MB |

### 最適化戦略

**Phase 2以降**:
```bash
# Release build with LTO
cargo build --release --config profile.release.lto=true

# バイナリ圧縮
strip target/release/shinyu-ai
upx --best --lzma target/release/shinyu-ai
```

---

## テスト戦略

### 現在のカバレッジ

```
tests/
├── diagnosis_tests.rs  # 診断ロジックテスト（12テスト）
└── character_tests.rs  # キャラクターテスト（予定）
```

**テストレベル**:
1. **ユニットテスト**: 各関数の単体テスト
2. **統合テスト**: モジュール間連携テスト
3. **E2Eテスト**: CLI全体フロー（将来）

**カバレッジ目標**: 80%以上

---

## デプロイメント

### 現在（Phase 1）

**ローカル実行**:
```bash
cargo build --release
./target/release/shinyu-ai diagnose
```

### Phase 2以降

**配布方法**:
1. **Homebrew** (macOS)
   ```bash
   brew tap shunsuke/shinyu-ai
   brew install shinyu-ai
   ```

2. **Cargo** (クロスプラットフォーム)
   ```bash
   cargo install shinyu-ai
   ```

3. **Docker**
   ```bash
   docker run -it shunsuke/shinyu-ai diagnose
   ```

---

## 関連ドキュメント

- [USER_GUIDE.md](USER_GUIDE.md) - ユーザーガイド
- [DEVELOPMENT.md](DEVELOPMENT.md) - 開発者ガイド
- [README.md](README.md) - プロジェクト概要

---

**作成日**: 2025-10-25
**著者**: Shunsuke Hayashi
**バージョン**: 0.1.0
