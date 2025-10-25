# Shinyu AI（親友AI）

**心に寄り添う親友AI - あなただけの分身キャラクターとの対話システム**

## 📖 プロジェクト概要

### コンセプト
性格診断（MBTI等）に基づいて、あなたの分身となる16種類のキャラクターの中から最適なキャラクターを生成。
日常の悩み（恋愛、仕事、子育て等）を親友のように聞いてくれるAIコンパニオンシステム。

### 主な機能
1. **性格診断システム** - MBTI/独自診断による性格分析
2. **16種類のキャラクター** - 診断結果に基づくパーソナライズされた分身AI
3. **AI対話システム** - LLM（Claude/GPT）を使った自然な会話
4. **SNS連携** - Twitter/Instagram投稿の感情分析と自発的サポート
5. **音声対話** - Whisper API（音声入力）+ VOICEVOX（音声出力）
6. **コミュニティ機能**（将来）- ユーザー間マッチング

---

## 🏗️ プロジェクト構成

```
shinyu-ai/
├── src/
│   ├── main.rs           # メインエントリーポイント
│   ├── lib.rs            # ライブラリルート
│   ├── character.rs      # 16キャラクター定義
│   ├── diagnosis.rs      # 診断ロジック（MBTI等）
│   ├── conversation.rs   # AI対話システム
│   ├── sns.rs            # SNS連携（Twitter/Instagram）
│   └── voice.rs          # 音声入出力統合
├── tools/
│   ├── voice_input.py    # 音声入力（Whisper API）
│   └── setup_voice.sh    # 音声システムセットアップ
├── tests/                # テストコード
├── Cargo.toml            # プロジェクト設定
└── README.md             # このファイル
```

---

## 🎯 開発ロードマップ

### Phase 1: 診断システム（MVP） ✅ 進行中
- [x] プロジェクトセットアップ
- [ ] 16キャラクター定義
- [ ] MBTI診断ロジック実装
- [ ] 基本的なCLI実装
- [ ] テスト実装

### Phase 2: AI対話システム
- [ ] LLM統合（Claude API）
- [ ] キャラクター別会話スタイル
- [ ] 会話履歴管理
- [ ] 感情分析

### Phase 3: 音声対話
- [ ] Whisper API統合（音声→テキスト）
- [ ] VOICEVOX統合（テキスト→音声）
- [ ] リアルタイム音声対話

### Phase 4: SNS連携
- [ ] Twitter API統合
- [ ] Instagram API統合
- [ ] 投稿の感情分析
- [ ] 自動サポート機能

### Phase 5: コミュニティ機能
- [ ] ユーザー管理
- [ ] マッチング機能
- [ ] キャラクター間交流

---

## 🚀 クイックスタート

### 前提条件
- Rust 1.75.0以上
- Python 3.13以上
- ffmpeg（音声処理用）

### セットアップ

```bash
# 1. プロジェクトのビルド
cd shinyu-ai
cargo build

# 2. 音声入力システムのセットアップ
./tools/setup_voice.sh

# 3. 環境変数の設定
export OPENAI_API_KEY=your-openai-key      # Whisper API用
export ANTHROPIC_API_KEY=your-anthropic-key # Claude API用（将来）
```

### 実行方法

#### テキスト対話モード
```bash
cargo run
```

#### 音声対話モード
```bash
# 音声入力（別ターミナル）
python3 tools/voice_input.py

# メインアプリ
cargo run --features voice
```

---

## 🧪 テスト

```bash
# 全テスト実行
cargo test

# 特定のテスト
cargo test diagnosis
cargo test character
```

---

## 📊 16種類のキャラクター定義（予定）

### 4つの軸
1. **E（外向型） vs I（内向型）**
2. **S（感覚型） vs N（直感型）**
3. **T（思考型） vs F（感情型）**
4. **J（判断型） vs P（知覚型）**

### キャラクター例
- **ENFP（活動家）**: 元気で社交的、創造的なサポーター
- **INTJ（建築家）**: 論理的で戦略的、客観的アドバイザー
- **ISFJ（擁護者）**: 優しく献身的、共感的リスナー
- **ESTP（起業家）**: 行動的で現実的、実践的サポーター
- （その他12種類）

---

## 🛠️ 技術スタック

### バックエンド
- **言語**: Rust 2021 Edition
- **非同期ランタイム**: Tokio
- **CLI**: Clap
- **LLM**: Claude API（async-openai）

### 音声処理
- **音声認識**: OpenAI Whisper API
- **音声合成**: VOICEVOX Engine
- **録音**: PyAudio（Python）

### SNS連携（将来）
- **Twitter**: Twitter API v2
- **Instagram**: Instagram Graph API

---

## 📝 開発ガイド

### コーディング規約
- Rust 2021 Edition標準に準拠
- `cargo fmt`でフォーマット
- `cargo clippy`でLint

### ブランチ戦略
- `main`: 本番用
- `develop`: 開発用
- `feature/*`: 機能開発用

### コミットメッセージ
Conventional Commitsに準拠：
```
feat(diagnosis): add MBTI calculation logic
fix(character): correct personality mapping
docs(readme): update setup instructions
```

---

## 🔐 環境変数

```bash
# 必須
OPENAI_API_KEY=sk-xxx          # Whisper API用

# オプション（将来）
ANTHROPIC_API_KEY=sk-ant-xxx   # Claude API用
TWITTER_BEARER_TOKEN=xxx       # Twitter API用
INSTAGRAM_ACCESS_TOKEN=xxx     # Instagram API用
```

---

## 📄 ライセンス

Apache-2.0

---

## 🙏 謝辞

- **VOICEVOX**: 音声合成エンジン
- **OpenAI Whisper**: 音声認識API
- **Anthropic Claude**: LLM API

---

**作成日**: 2025-10-25
**バージョン**: 0.1.0
**ステータス**: 開発中（Phase 1）
