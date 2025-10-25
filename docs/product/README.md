# 統合占いアプリ（新湯 AI）- サービス設計ドキュメント

**プロジェクト**: 統合占いアプリ
**作成日**: 2025-10-25
**ステータス**: Phase 1（MVP開発中）

---

## ドキュメント一覧

### 1. [技術スタック完全仕様書](./tech-stack.md)

**概要**: フロントエンド、バックエンド、インフラ、占いロジック実装方法の完全仕様

**内容**:
- フロントエンド: Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui
- バックエンド: Supabase（BaaS）+ Edge Functions
- 占いロジック: AstrologyAPI、独自実装（動物占い、数秘術、兄弟構成診断）
- AI画像生成: OpenAI DALL-E 3
- データベース: PostgreSQL（Supabase）
- ホスティング: Vercel
- コスト試算: 初期¥8,975/月、スケール時¥33,725/月

**対象読者**: 開発者、技術リード

---

### 2. [MVP定義書](./mvp-definition.md)

**概要**: 最小実行可能製品（MVP）の機能定義と4週間開発ロードマップ

**内容**:
- 必須機能: 西洋占星術、動物占い、数秘術、兄弟構成診断、統合プロファイル表示
- 除外機能: AI画像生成（Phase 2）、ユーモア占い（Phase 2）、時系列分析（Phase 3）
- 開発ロードマップ: Week 1-4の詳細タスク
- 成功指標: ユーザー50人、完了率80%、稼働率99%
- リスク管理: API障害、コスト超過、ユーザー獲得不足

**対象読者**: プロダクトマネージャー、開発者、ステークホルダー

---

### 3. [プロトタイプ設計書](./prototype-design.md)

**概要**: UI/UXデザイン、ワイヤーフレーム、ユーザーフロー

**内容**:
- デザインコンセプト: 神秘的でありながら親しみやすい
- カラーパレット: Deep Purple（#6B46C1）、ゴールド（#F59E0B）
- タイポグラフィ: Inter + Noto Sans JP
- ワイヤーフレーム: ランディングページ、入力フォーム、結果表示画面（5画面）
- ユーザーフロー: 新規ユーザーの初回体験（15ステップ）
- アクセシビリティ: WAI-ARIA、キーボードナビゲーション、カラーコントラスト
- パフォーマンス: Core Web Vitals目標値

**対象読者**: デザイナー、フロントエンド開発者

---

### 4. [サービス詳細設計書（6ヶ月ロードマップ）](./product-detail.md)

**概要**: 6ヶ月間の機能開発計画とマイルストーン

**内容**:
- Month 1（Week 1-4）: MVP開発（基本4占い）
- Month 2（Week 5-8）: 機能拡張（AI画像、ユーモア占い）
- Month 3（Week 9-12）: 時系列分析、詳細プロファイル
- Month 4（Week 13-16）: 有料化、コミュニティ機能
- Month 5（Week 17-20）: AI高度化、パーソナライズ
- Month 6（Week 21-24）: スケール対応、国際化
- 6ヶ月後目標: ユーザー3,000人、月間収益¥147,000

**対象読者**: プロダクトマネージャー、経営層、投資家

---

### 5. [API/サービス選定リスト](./api-service-selection.md)

**概要**: 使用する外部API・サービスの完全リスト（URL、価格、選定理由）

**内容**:

#### 占いAPI
- **西洋占星術**: AstrologyAPI（$39-$149/月）
- **動物占い**: 独自実装
- **数秘術**: 独自実装
- **兄弟構成診断**: 独自実装

#### AI API
- **画像生成**: OpenAI DALL-E 3（$0.04/枚）
- **テキスト生成**: OpenAI GPT-4o-mini（$0.15/1M入力トークン）

#### インフラ
- **バックエンド**: Supabase（Free → $25/月）
- **ホスティング**: Vercel（Free → $20/月）
- **決済**: Stripe（3.6%手数料）

#### 監視・分析
- **アクセス解析**: Google Analytics 4（無料）
- **エラー監視**: Sentry（無料）
- **パフォーマンス**: Vercel Analytics（無料）

**月額コスト総計**:
- MVP: $45（¥6,750）
- Phase 2: $110（¥16,500）
- Phase 3: $240（¥36,000）

**対象読者**: 開発者、財務担当、プロダクトマネージャー

---

## クイックスタート

### 開発環境構築

```bash
# リポジトリクローン
git clone https://github.com/your-org/shinyu-ai.git
cd shinyu-ai

# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env.local
# .env.localを編集（Supabase、OpenAI、AstrologyAPIのキー設定）

# 開発サーバー起動
pnpm dev

# ブラウザで http://localhost:3000 を開く
```

---

## プロジェクト構成

```
shinyu-ai/
├── docs/
│   └── product/
│       ├── README.md                      # このファイル
│       ├── tech-stack.md                  # 技術スタック完全仕様書
│       ├── mvp-definition.md              # MVP定義書
│       ├── prototype-design.md            # プロトタイプ設計書
│       ├── product-detail.md              # 6ヶ月ロードマップ
│       └── api-service-selection.md       # API/サービス選定リスト
├── src/
│   ├── app/                               # Next.js App Router
│   ├── components/                        # Reactコンポーネント
│   ├── lib/                               # ユーティリティ
│   └── types/                             # TypeScript型定義
├── supabase/
│   ├── migrations/                        # DBマイグレーション
│   └── functions/                         # Edge Functions
├── public/                                # 静的ファイル
└── package.json
```

---

## 開発フロー

### Week 1-4: MVP開発
1. 環境構築 + 基盤実装（Week 1）
2. 占いロジック実装（Week 2）
3. UI統合 + 結果表示（Week 3）
4. 仕上げ + リリース（Week 4）

### Week 5-8: 機能拡張
1. AI画像生成実装
2. ユーザー登録・ログイン
3. ユーモア占い追加

### Week 9-12: 時系列分析
1. 過去10年・未来10年の運勢計算
2. インタラクティブグラフ表示

---

## KPI目標

### Phase 1（Month 1）
- ユーザー数: **50人**
- 占い完了率: **80%以上**
- システム稼働率: **99%以上**

### Phase 2（Month 2-3）
- ユーザー数: **300人**
- 有料転換意向: **20%以上**（アンケート）

### Phase 3（Month 4-6）
- ユーザー数: **3,000人**
- 有料ユーザー: **150人**
- 月間収益: **¥147,000**

---

## リスク管理

| リスク | 対策 |
|--------|------|
| API障害（AstrologyAPI） | フォールバック実装（簡易星座計算） |
| AI画像生成コスト超過 | キャッシュ戦略強化（再利用率70%目標） |
| ユーザー獲得不足 | Twitter広告、Product Hunt投稿 |
| 決済トラブル | Stripeサポート活用、テスト環境で事前検証 |

---

## 次のアクション

### 今すぐ開始できるタスク

1. **開発環境構築**（30分）
   - Node.js 20.x インストール
   - pnpm インストール
   - プロジェクト初期化

2. **Supabaseプロジェクト作成**（15分）
   - https://supabase.com/ でアカウント作成
   - 新規プロジェクト作成
   - API Key取得

3. **AstrologyAPIアカウント作成**（10分）
   - https://www.astrologyapi.com/ でアカウント作成
   - Basicプラン申込（$39/月）
   - API Key取得

4. **OpenAI APIアカウント作成**（10分）
   - https://platform.openai.com/ でアカウント作成
   - クレジットカード登録
   - API Key取得

---

## 連絡先

**プロジェクトリード**: [あなたの名前]
**メール**: your-email@example.com
**GitHub**: https://github.com/your-org/shinyu-ai
**Twitter**: @shinyu_ai

---

## ライセンス

MIT License（予定）

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-10-25 | 初版作成（全5ドキュメント完成） |

---

**全てのドキュメントを読み終えたら、[開発環境構築ガイド](../setup/SETUP.md)（作成予定）に進んでください。**
