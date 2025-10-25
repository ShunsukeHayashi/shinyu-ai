# Shinyu AI - 開発者ガイド

**バージョン**: 0.1.0
**最終更新**: 2025-10-25

---

## 目次

1. [開発環境セットアップ](#開発環境セットアップ)
2. [プロジェクト構成](#プロジェクト構成)
3. [ビルド方法](#ビルド方法)
4. [テスト実行方法](#テスト実行方法)
5. [新機能追加ガイド](#新機能追加ガイド)
6. [コーディング規約](#コーディング規約)
7. [Git ワークフロー](#gitワークフロー)
8. [CI/CD](#cicd)
9. [リリース手順](#リリース手順)

---

## 開発環境セットアップ

### 必須ツール

以下のツールをインストールしてください：

#### 1. Rust（1.75.0以上）

```bash
# Rustup経由でインストール
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# インストール確認
rustc --version  # rustc 1.75.0 以上
cargo --version  # cargo 1.75.0 以上

# stable toolchain使用
rustup default stable
```

#### 2. Git

```bash
# インストール確認
git --version

# macOS
brew install git

# Ubuntu/Debian
sudo apt install git
```

#### 3. 推奨ツール

```bash
# cargo-watch（ファイル監視＆自動再ビルド）
cargo install cargo-watch

# cargo-edit（Cargo.toml編集ヘルパー）
cargo install cargo-edit

# cargo-tarpaulin（コードカバレッジ）
cargo install cargo-tarpaulin

# Just（タスクランナー）
cargo install just
```

---

### エディタ設定

#### Visual Studio Code

**推奨拡張機能**:

```json
{
  "recommendations": [
    "rust-lang.rust-analyzer",      // Rust言語サーバー
    "vadimcn.vscode-lldb",          // デバッガ
    "tamasfe.even-better-toml",     // TOMLサポート
    "serayuzgur.crates",            // Cargo.toml依存管理
    "usernamehw.errorlens"          // エラー表示強化
  ]
}
```

**settings.json**:

```json
{
  "rust-analyzer.checkOnSave.command": "clippy",
  "rust-analyzer.cargo.features": "all",
  "editor.formatOnSave": true,
  "[rust]": {
    "editor.defaultFormatter": "rust-lang.rust-analyzer"
  }
}
```

#### Neovim/Vim

```lua
-- rust-tools.nvim推奨
require('rust-tools').setup({})
```

---

### 初回セットアップ

```bash
# 1. リポジトリクローン
git clone https://github.com/ShunsukeHayashi/shinyu-ai.git
cd shinyu-ai

# 2. 依存関係インストール
cargo build

# 3. テスト実行
cargo test

# 4. 動作確認
cargo run -- diagnose
```

---

## プロジェクト構成

### ディレクトリツリー

```
shinyu-ai/
├── Cargo.toml              # プロジェクト設定
├── Cargo.lock              # 依存バージョンロック
├── README.md               # プロジェクト概要
├── ARCHITECTURE.md         # アーキテクチャ設計書
├── USER_GUIDE.md           # ユーザーガイド
├── DEVELOPMENT.md          # このファイル
│
├── src/
│   ├── main.rs             # CLIエントリーポイント
│   ├── lib.rs              # ライブラリルート
│   ├── character.rs        # キャラクター定義
│   └── diagnosis.rs        # 診断ロジック
│
├── data/
│   └── characters.json     # 16キャラクター定義
│
├── tests/
│   ├── diagnosis_tests.rs  # 診断ロジックテスト
│   └── character_tests.rs  # キャラクターテスト（予定）
│
├── tools/
│   ├── voice_input.py      # 音声入力（Phase 3）
│   └── setup_voice.sh      # 音声セットアップ
│
└── target/                 # ビルド成果物（Git無視）
    ├── debug/
    └── release/
```

---

### 主要ファイル解説

#### `Cargo.toml`

```toml
[package]
name = "shinyu-ai"
version = "0.1.0"
edition = "2021"

[dependencies]
tokio = { version = "1.40", features = ["rt-multi-thread", "macros"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
clap = { version = "4.5", features = ["derive"] }
anyhow = "1.0"
colored = "3.0"

[dev-dependencies]
insta = "1.40"         # スナップショットテスト
serial_test = "3.2"    # 並列テスト制御
```

#### `src/lib.rs`

```rust
//! ライブラリのパブリックAPI定義

pub mod character;
pub mod diagnosis;

pub use character::*;
pub use diagnosis::*;
```

---

## ビルド方法

### 開発ビルド

```bash
# 通常ビルド
cargo build

# 実行
./target/debug/shinyu-ai diagnose

# ビルド＋実行（一発）
cargo run -- diagnose
```

**特徴**:
- デバッグシンボル付き
- 最適化なし
- ビルド高速
- バイナリサイズ大

---

### リリースビルド

```bash
# 最適化ビルド
cargo build --release

# 実行
./target/release/shinyu-ai diagnose
```

**特徴**:
- 最適化レベル3
- デバッグシンボルなし
- ビルド低速
- バイナリサイズ小
- 実行速度最速

---

### ファイル監視＆自動再ビルド

```bash
# cargo-watch使用
cargo watch -x run

# テスト監視
cargo watch -x test

# クリア＋テスト
cargo watch -c -x test
```

---

### プロファイル設定

**Cargo.toml追加**:

```toml
[profile.dev]
opt-level = 0       # 最適化なし
debug = true        # デバッグシンボル

[profile.release]
opt-level = 3       # 最大最適化
lto = "fat"         # Link-Time Optimization
codegen-units = 1   # 並列コード生成無効（最適化優先）
strip = true        # シンボル削除

[profile.bench]
inherits = "release"
```

---

## テスト実行方法

### 全テスト実行

```bash
# 全テスト
cargo test

# 詳細出力
cargo test -- --nocapture

# 並列数指定
cargo test -- --test-threads=1
```

---

### 特定テスト実行

```bash
# モジュール指定
cargo test diagnosis

# 関数指定
cargo test test_answer_from_u8

# パターンマッチ
cargo test answer_
```

---

### テストカバレッジ

```bash
# cargo-tarpaulin使用
cargo tarpaulin --out Html

# カバレッジレポート生成
open tarpaulin-report.html
```

**目標カバレッジ**: 80%以上

---

### スナップショットテスト

```bash
# insta使用
cargo test

# スナップショット更新
cargo insta review
```

**例**:

```rust
use insta::assert_json_snapshot;

#[test]
fn test_character_serialization() {
    let character = Character::new(/* ... */);
    assert_json_snapshot!(character);
}
```

---

### ベンチマーク

```bash
# criterion使用（将来実装）
cargo bench
```

---

## 新機能追加ガイド

### 1. 新しいキャラクターを追加

#### Step 1: `data/characters.json`編集

```json
{
  "mbti_type": "XXXX",
  "name": "新キャラ",
  "nickname": "XXX",
  "axes": {
    "energy": "Extraverted",
    "perception": "Sensing",
    "judgment": "Thinking",
    "lifestyle": "Judging"
  },
  "conversation_style": {
    "formality": 50,
    "emotionality": 50,
    "logic_focus": 50,
    "empathy": 50
  },
  "empathy_pattern": {
    "encouragement_style": "...",
    "advice_style": "...",
    "support_style": "..."
  },
  "traits": ["...", "..."],
  "strengths": ["...", "..."]
}
```

#### Step 2: テスト追加

```rust
#[test]
fn test_load_new_character() {
    let character = CharacterLoader::find_by_mbti(MBTIType::XXXX)
        .expect("Character should exist");
    assert_eq!(character.name, "新キャラ");
}
```

---

### 2. 新しい診断質問を追加

#### Step 1: `src/diagnosis.rs`編集

```rust
impl QuestionSet {
    pub fn default_set() -> Self {
        Self {
            questions: vec![
                // 既存質問...

                // 新質問追加
                Question {
                    id: 17,
                    text: "新しい質問文".to_string(),
                    axis: AxisType::EnergyAxis,
                    reverse_score: false,
                },
            ],
        }
    }
}
```

#### Step 2: テスト追加

```rust
#[test]
fn test_new_question() {
    let question_set = QuestionSet::default_set();
    assert_eq!(question_set.len(), 17);  // 16 → 17
}
```

---

### 3. 新しいモジュールを追加（Phase 2以降）

#### Step 1: モジュールファイル作成

```bash
# src/conversation.rs 作成
touch src/conversation.rs
```

**src/conversation.rs**:

```rust
//! AI対話モジュール

use anyhow::Result;
use async_trait::async_trait;

#[async_trait]
pub trait LLMProvider {
    async fn complete(&self, prompt: &str) -> Result<String>;
}

pub struct ClaudeProvider {
    api_key: String,
}

impl ClaudeProvider {
    pub fn new(api_key: String) -> Self {
        Self { api_key }
    }
}

#[async_trait]
impl LLMProvider for ClaudeProvider {
    async fn complete(&self, prompt: &str) -> Result<String> {
        // 実装...
        Ok("response".to_string())
    }
}
```

#### Step 2: `lib.rs`に追加

```rust
pub mod character;
pub mod diagnosis;
pub mod conversation;  // 追加

pub use conversation::*;
```

#### Step 3: テスト追加

**tests/conversation_tests.rs**:

```rust
use shinyu_ai::*;

#[tokio::test]
async fn test_claude_provider() {
    let provider = ClaudeProvider::new("test-key".to_string());
    let result = provider.complete("Hello").await;
    assert!(result.is_ok());
}
```

---

## コーディング規約

### Rust標準に準拠

```bash
# フォーマット
cargo fmt

# Lint
cargo clippy -- -D warnings

# 全チェック
cargo fmt && cargo clippy -- -D warnings && cargo test
```

---

### 命名規則

```rust
// 型名: PascalCase
struct DiagnosisSession { }
enum MBTIType { }

// 関数名: snake_case
fn calculate_result() { }

// 定数: SCREAMING_SNAKE_CASE
const MAX_QUESTIONS: usize = 16;

// モジュール名: snake_case
mod diagnosis;
```

---

### ドキュメントコメント

```rust
/// MBTIタイプを判定する
///
/// # Examples
///
/// ```
/// use shinyu_ai::*;
///
/// let scores = AxisScores {
///     energy: 5,
///     perception: -3,
///     judgment: 2,
///     lifestyle: 4,
/// };
///
/// assert_eq!(scores.determine_mbti_type(), MBTIType::ENTJ);
/// ```
pub fn determine_mbti_type(&self) -> MBTIType {
    // ...
}
```

---

### エラーハンドリング

```rust
// anyhow::Result使用
pub fn load_all() -> anyhow::Result<Vec<Character>> {
    let contents = std::fs::read_to_string("data/characters.json")?;
    let characters: Vec<Character> = serde_json::from_str(&contents)?;
    Ok(characters)
}

// カスタムエラー（Phase 2以降）
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ShinyuError {
    #[error("Character not found: {mbti_type}")]
    CharacterNotFound { mbti_type: MBTIType },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
}
```

---

### 非同期処理（Phase 2以降）

```rust
use tokio;

#[tokio::main]
async fn main() {
    let result = async_function().await;
}

#[tokio::test]
async fn test_async() {
    let result = async_function().await;
    assert!(result.is_ok());
}
```

---

### パニック回避

```rust
// ❌ Bad
let character = characters[0];  // パニックの可能性

// ✅ Good
let character = characters.get(0).expect("At least one character");
```

---

## Gitワークフロー

### ブランチ戦略

```
main          ← 本番環境
  ├─ develop  ← 開発環境
      ├─ feature/add-voice-support
      ├─ feature/sns-integration
      └─ fix/diagnosis-bug
```

**ブランチ命名**:
- `feature/*`: 新機能
- `fix/*`: バグ修正
- `docs/*`: ドキュメント
- `refactor/*`: リファクタリング
- `test/*`: テスト追加

---

### コミットメッセージ

**Conventional Commits準拠**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**例**:

```
feat(diagnosis): add new MBTI question for J/P axis

Add question #17 to better distinguish between Judging and
Perceiving types. This improves accuracy by 5%.

Closes #42
```

**タイプ**:
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント
- `style`: フォーマット
- `refactor`: リファクタリング
- `test`: テスト
- `chore`: その他

---

### Pull Request

```bash
# 1. 機能ブランチ作成
git checkout -b feature/add-voice-support

# 2. 開発＋コミット
git add .
git commit -m "feat(voice): add Whisper API integration"

# 3. プッシュ
git push origin feature/add-voice-support

# 4. GitHubでPR作成
```

**PRテンプレート**:

```markdown
## 概要
音声入力機能を追加しました。

## 変更内容
- Whisper API統合
- 音声→テキスト変換
- 録音機能

## テスト
- [ ] ユニットテスト追加
- [ ] 手動テスト完了
- [ ] ドキュメント更新

## 関連Issue
Closes #123
```

---

## CI/CD

### GitHub Actions（予定）

**.github/workflows/ci.yml**:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable

      - name: Build
        run: cargo build --verbose

      - name: Test
        run: cargo test --verbose

      - name: Clippy
        run: cargo clippy -- -D warnings

      - name: Format
        run: cargo fmt -- --check
```

---

### リリースワークフロー

**.github/workflows/release.yml**:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable

      - name: Build Release
        run: cargo build --release

      - name: Upload Artifact
        uses: actions/upload-artifact@v4
        with:
          name: shinyu-ai-${{ matrix.os }}
          path: target/release/shinyu-ai
```

---

## リリース手順

### バージョニング

**Semantic Versioning**:
- `MAJOR.MINOR.PATCH`
- 例: `0.1.0`, `1.0.0`, `1.2.3`

**バージョンアップ基準**:
- `MAJOR`: 破壊的変更
- `MINOR`: 後方互換性のある機能追加
- `PATCH`: バグ修正

---

### リリースプロセス

```bash
# 1. バージョン更新
vim Cargo.toml  # version = "0.2.0"

# 2. CHANGELOG更新
vim CHANGELOG.md

# 3. コミット
git add Cargo.toml CHANGELOG.md
git commit -m "chore: bump version to 0.2.0"

# 4. タグ作成
git tag -a v0.2.0 -m "Release v0.2.0"

# 5. プッシュ
git push origin main --tags

# 6. GitHub Release作成
gh release create v0.2.0 \
  --title "v0.2.0" \
  --notes "Release notes..." \
  target/release/shinyu-ai
```

---

## デバッグ手法

### ログ出力

```rust
use tracing::{info, warn, error, debug};

fn main() {
    tracing_subscriber::fmt::init();

    info!("Starting diagnosis");
    debug!("Current question: {}", question.id);
    warn!("Unexpected answer: {}", answer);
    error!("Failed to load characters: {}", e);
}
```

**実行**:

```bash
# ログレベル指定
RUST_LOG=debug cargo run -- diagnose
RUST_LOG=info cargo run -- diagnose
```

---

### GDBデバッグ

```bash
# デバッグビルド
cargo build

# GDB起動
rust-gdb target/debug/shinyu-ai

# ブレークポイント設定
(gdb) break main
(gdb) run diagnose
(gdb) next
(gdb) print question
```

---

### VSCodeデバッグ

**.vscode/launch.json**:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "lldb",
      "request": "launch",
      "name": "Debug shinyu-ai",
      "cargo": {
        "args": ["build", "--bin=shinyu-ai"]
      },
      "args": ["diagnose"],
      "cwd": "${workspaceFolder}"
    }
  ]
}
```

---

## パフォーマンス最適化

### プロファイリング

```bash
# Flamegraph生成
cargo install flamegraph
sudo cargo flamegraph --bin shinyu-ai -- diagnose

# 結果確認
open flamegraph.svg
```

---

### ベンチマーク

**benches/diagnosis_bench.rs**:

```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};
use shinyu_ai::*;

fn benchmark_diagnosis(c: &mut Criterion) {
    c.bench_function("calculate_result", |b| {
        b.iter(|| {
            let mut session = DiagnosisSession::new();
            for _ in 0..16 {
                session.record_answer(Answer::Neutral);
            }
            black_box(session.calculate_result());
        });
    });
}

criterion_group!(benches, benchmark_diagnosis);
criterion_main!(benches);
```

**実行**:

```bash
cargo bench
```

---

## トラブルシューティング

### コンパイルエラー

```bash
# キャッシュクリア
cargo clean

# 依存関係再取得
rm Cargo.lock
cargo build
```

---

### テスト失敗

```bash
# 詳細ログ
RUST_BACKTRACE=1 cargo test

# スレッド1つで実行
cargo test -- --test-threads=1
```

---

## 参考リソース

### 公式ドキュメント

- [The Rust Book](https://doc.rust-lang.org/book/)
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/)
- [Tokio Tutorial](https://tokio.rs/tokio/tutorial)

### ツールドキュメント

- [Clap](https://docs.rs/clap/)
- [Serde](https://serde.rs/)
- [Anyhow](https://docs.rs/anyhow/)

---

## 次のステップ

### Phase 2: AI対話システム

- [ ] Claude API統合
- [ ] 会話履歴管理
- [ ] キャラクター別プロンプト

### Phase 3: 音声対話

- [ ] Whisper API統合
- [ ] VOICEVOX統合
- [ ] リアルタイム処理

### Phase 4: SNS連携

- [ ] Twitter API統合
- [ ] Instagram API統合
- [ ] 感情分析

---

## コントリビューション

プルリクエスト歓迎します！

**手順**:
1. フォーク
2. 機能ブランチ作成
3. コミット
4. プッシュ
5. PR作成

---

## ライセンス

Apache-2.0

---

**作成日**: 2025-10-25
**著者**: Shunsuke Hayashi
**バージョン**: 0.1.0
