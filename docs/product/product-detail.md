# サービス詳細設計書（6ヶ月ロードマップ）

**プロジェクト**: 統合占いアプリ（新湯 AI）
**作成日**: 2025-10-25
**バージョン**: 1.0.0

---

## プロダクトビジョン

**"誕生日・名前・兄弟構成から、あなたの全てを統合的に理解する占いプラットフォーム"**

### コアバリュー

1. **統合性**: 複数の占術を組み合わせた包括的な分析
2. **科学性**: 天文計算・統計学に基づく信頼性
3. **ビジュアル性**: AI生成画像で直感的に理解
4. **時系列性**: 過去・現在・未来の一貫したストーリー

---

## 6ヶ月開発ロードマップ

### 全体スケジュール

```
Month 1 (Week 1-4):   MVP開発（基本4占い）
Month 2 (Week 5-8):   機能拡張（AI画像、ユーモア占い）
Month 3 (Week 9-12):  時系列分析、詳細プロファイル
Month 4 (Week 13-16): 有料化、コミュニティ機能
Month 5 (Week 17-20): AI高度化、パーソナライズ
Month 6 (Week 21-24): スケール対応、国際化
```

---

## Month 1: MVP開発（Week 1-4）

### テーマ: **"最小機能での価値検証"**

### 目標
- 基本占い機能（西洋占星術、動物占い、数秘術、兄弟構成診断）の実装
- 初期ユーザー50人獲得
- フィードバック収集基盤構築

---

### Week 1: 環境構築 + 基盤実装

#### Day 1-2: プロジェクト初期化

**タスク**:
- Next.js 14プロジェクト作成
- Supabase プロジェクト作成
- GitHub リポジトリ初期化
- Vercel連携設定

**成果物**:
```bash
shinyu-ai/
├── src/
│   ├── app/          # Next.js App Router
│   ├── components/   # Reactコンポーネント
│   ├── lib/          # ユーティリティ
│   └── types/        # TypeScript型定義
├── supabase/
│   ├── migrations/   # DBマイグレーション
│   └── functions/    # Edge Functions
├── public/           # 静的ファイル
└── package.json
```

**時間**: 8時間

---

#### Day 3-4: データベース設計 + 認証

**タスク**:
- PostgreSQLスキーマ設計（前述の技術スタック書参照）
- マイグレーション実行
- セッション管理実装（LocalStorage + UUID）

**SQL実行**:
```sql
-- 前述のスキーマをマイグレーション
-- users, user_profiles, fortune_results, timeline_analysis, access_logs
```

**時間**: 8時間

---

#### Day 5-7: ランディングページ + 入力フォーム

**タスク**:
- LP Hero Section実装
- Features Section実装
- FAQ実装
- 入力フォームUI実装（DatePicker、TimePicker、Autocomplete）
- React Hook Form + Zodバリデーション

**コンポーネント**:
```tsx
// components/InputForm.tsx
- BirthDatePicker
- BirthTimePicker (optional)
- BirthPlaceAutocomplete (optional)
- FullNameInput
- SiblingPositionRadio
- SubmitButton
```

**時間**: 12時間

---

### Week 2: 占いロジック実装（1/2）

#### Day 8-9: 西洋占星術統合

**タスク**:
- AstrologyAPI統合（テスト環境）
- Edge Function実装: `/api/calculate-astrology`
- 太陽・月・上昇星座の算出
- 結果パーサー実装

**実装例**:
```typescript
// supabase/functions/calculate-astrology/index.ts
export async function calculateAstrology(
  birthDate: Date,
  birthTime: string,
  birthPlace: { lat: number; lng: number }
): Promise<AstrologyResult> {
  const response = await fetch('https://api.astrologyapi.com/v1/western_horoscope', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('ASTROLOGY_API_KEY')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      day: birthDate.getDate(),
      month: birthDate.getMonth() + 1,
      year: birthDate.getFullYear(),
      hour: parseInt(birthTime.split(':')[0]),
      min: parseInt(birthTime.split(':')[1]),
      lat: birthPlace.lat,
      lon: birthPlace.lng,
      tzone: 9.0
    })
  });

  const data = await response.json();
  return {
    sunSign: data.sun_sign,
    moonSign: data.moon_sign,
    ascendant: data.ascendant
  };
}
```

**時間**: 10時間

---

#### Day 10-11: 動物占い実装

**タスク**:
- 動物占い計算ロジック実装（独自アルゴリズム）
- 性格特性データベース構築（JSON）
- Edge Function実装: `/api/calculate-animal`

**データ例**:
```json
// lib/data/animalProfiles.json
{
  "ゴールドの狼": {
    "animal": "狼",
    "color": "ゴールド",
    "traits": [
      "リーダーシップが強い",
      "独立心が旺盛",
      "鋭い洞察力",
      "慎重で計画的"
    ],
    "strengths": ["統率力", "決断力", "忠誠心"],
    "weaknesses": ["頑固", "孤独を感じやすい"]
  }
}
```

**時間**: 8時間

---

#### Day 12-14: 数秘術 + 兄弟構成診断

**タスク**:
- 数秘術計算ロジック実装
- 兄弟構成診断ロジック実装
- 各数字・タイプの説明文データベース構築

**実装例**:
```typescript
// lib/numerology.ts
export function calculateNumerology(fullName: string, birthDate: Date) {
  const lifePathNumber = reduceToSingleDigit(
    birthDate.getFullYear() +
    (birthDate.getMonth() + 1) +
    birthDate.getDate()
  );

  const destinyNumber = calculateNameNumber(fullName);
  const soulUrgeNumber = calculateVowelNumber(fullName);

  return { lifePathNumber, destinyNumber, soulUrgeNumber };
}
```

**時間**: 10時間

---

### Week 3: UI統合 + 結果表示

#### Day 15-17: 結果表示UI実装

**タスク**:
- 西洋占星術結果カード
- 動物占い結果カード
- 数秘術結果カード
- 兄弟構成診断結果カード
- Accordion実装（shadcn/ui）

**コンポーネント**:
```tsx
// components/ResultDisplay.tsx
- AstrologyCard
- AnimalFortuneCard
- NumerologyCard
- SiblingAnalysisCard
- IntegratedProfileCard
```

**時間**: 12時間

---

#### Day 18-19: 統合API + ローディング

**タスク**:
- 統合計算API実装: `/api/calculate-fortune`（全占いを1回で実行）
- ローディング画面実装（プログレスバー + アニメーション）
- エラーハンドリング

**時間**: 8時間

---

#### Day 20-21: レスポンシブ対応 + バグ修正

**タスク**:
- モバイル表示最適化
- タブレット表示最適化
- E2Eテスト（手動）
- バグ修正

**時間**: 10時間

---

### Week 4: 仕上げ + リリース

#### Day 22-23: データ保存 + シェア機能

**タスク**:
- 占い結果のSupabase保存
- セッションID管理
- Twitterシェア機能
- LINEシェア機能

**時間**: 8時間

---

#### Day 24-25: 最終調整 + テスト

**タスク**:
- SEO最適化（meta tags、OGP）
- パフォーマンス最適化（画像圧縮、コード分割）
- アクセシビリティチェック
- セキュリティチェック

**時間**: 8時間

---

#### Day 26-28: デプロイ + ソフトローンチ

**タスク**:
- 本番環境デプロイ（Vercel）
- ドメイン設定（shinyu-ai.com 想定）
- Google Analytics 4設定
- Sentry設定
- 初期ユーザー招待（Twitter、友人）

**時間**: 6時間

---

### Month 1成果物

✅ **機能**:
- 西洋占星術（太陽・月・上昇星座）
- 動物占い（12種類×6色）
- 数秘術（運命数、宿命数、ソウル数）
- 兄弟構成診断（4タイプ）
- 統合プロファイル表示
- 結果保存（7日間）
- SNSシェア（Twitter、LINE）

✅ **KPI**:
- 初期ユーザー: 50人
- 占い完了率: 80%以上
- システム稼働率: 99%以上

---

## Month 2: 機能拡張（Week 5-8）

### テーマ: **"ビジュアル体験の強化"**

### 目標
- AI画像生成実装
- ユーザー登録・ログイン機能
- ユーモア占い追加
- ユーザー100人突破

---

### Week 5: AI画像生成

#### Day 29-31: DALL-E 3統合

**タスク**:
- OpenAI API統合
- 画像生成Edge Function実装
- プロンプトエンジニアリング（動物、野菜、椎茸）
- Supabase Storageへの保存

**実装例**:
```typescript
// supabase/functions/generate-image/index.ts
import OpenAI from 'openai';

export async function generateAnimalImage(animal: string, color: string) {
  const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

  const prompt = `A cute ${color} ${animal} character in Japanese anime style,
    with mystical fortune-telling elements like stars and moons in the background.
    The character should look friendly and magical.`;

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    quality: 'standard'
  });

  const imageUrl = response.data[0].url;

  // Supabase Storageに保存
  const { data, error } = await supabaseClient.storage
    .from('fortune-images')
    .upload(`animals/${animal}-${color}.png`, await fetch(imageUrl).then(r => r.blob()));

  return data.publicUrl;
}
```

**時間**: 12時間

---

#### Day 32-35: 画像表示UI + キャッシュ

**タスク**:
- 画像表示カードUI実装
- ローディング最適化（画像生成は非同期）
- キャッシュ戦略実装（同一動物+色は再利用）

**時間**: 12時間

---

### Week 6: ユーザー登録・ログイン

#### Day 36-38: Supabase Auth実装

**タスク**:
- Email/Password認証実装
- ログイン・サインアップUI
- セッション管理（JWT）
- 過去の占い履歴表示

**コンポーネント**:
```tsx
// components/Auth/LoginForm.tsx
// components/Auth/SignupForm.tsx
// components/Dashboard/FortuneHistory.tsx
```

**時間**: 12時間

---

#### Day 39-42: プロフィール管理

**タスク**:
- ユーザープロフィールページ
- 占い結果の保存・削除機能
- お気に入り機能

**時間**: 12時間

---

### Week 7: ユーモア占い

#### Day 43-45: GPT-4o-mini統合

**タスク**:
- 野菜占い生成（OpenAI API）
- 椎茸占い生成
- 妖怪占い生成
- プロンプト最適化

**プロンプト例**:
```
あなたは占い師です。以下のプロフィールから、野菜占いを生成してください。

プロフィール:
- 誕生日: 1990年3月15日
- 名前: 山田太郎
- 星座: うお座
- 動物占い: ゴールドの狼

ユーモアを交えた野菜占いを200文字以内で生成してください。
「あなたは〇〇な△△（野菜名）」という形式で。
```

**時間**: 12時間

---

#### Day 46-49: ユーモア占い表示UI

**タスク**:
- ユーモア占いカードUI
- 画像生成（野菜、椎茸のイラスト）
- レイアウト調整

**時間**: 12時間

---

### Week 8: テスト + 改善

#### Day 50-53: ユーザーフィードバック収集

**タスク**:
- フィードバックフォーム実装
- Google Form連携
- ユーザーインタビュー（10人）

**時間**: 8時間

---

#### Day 54-56: 改善実装

**タスク**:
- フィードバックに基づく改善
- パフォーマンス最適化
- バグ修正

**時間**: 12時間

---

### Month 2成果物

✅ **新機能**:
- AI画像生成（動物、野菜、椎茸）
- ユーザー登録・ログイン
- 占い履歴表示
- ユーモア占い（3種類）

✅ **KPI**:
- ユーザー数: 100人
- 有料転換意向: 20%以上（アンケート）
- 画像生成成功率: 95%以上

---

## Month 3: 時系列分析（Week 9-12）

### テーマ: **"過去・現在・未来の統合ストーリー"**

### 目標
- 時系列分析機能実装
- 詳細プロファイル生成
- ユーザー300人突破

---

### Week 9: トランジット計算

#### Day 57-60: 過去10年分析

**タスク**:
- トランジット計算ロジック実装（AstrologyAPI）
- 過去の主要イベント推定
- 時系列グラフ表示（Recharts）

**実装例**:
```typescript
// lib/transitAnalysis.ts
export async function analyzePastTransits(birthDate: Date, currentDate: Date) {
  const years = [];
  for (let i = 10; i >= 0; i--) {
    const targetDate = new Date(currentDate);
    targetDate.setFullYear(currentDate.getFullYear() - i);

    const transitData = await fetchTransitData(birthDate, targetDate);
    years.push({
      year: targetDate.getFullYear(),
      period: 'past',
      transitData,
      predictions: generatePastAnalysis(transitData)
    });
  }
  return years;
}
```

**時間**: 16時間

---

#### Day 61-63: 未来10年予測

**タスク**:
- 未来のトランジット計算
- 予測文生成（GPT-4o-mini）
- 時系列グラフ表示

**時間**: 12時間

---

### Week 10: 詳細プロファイル

#### Day 64-67: 惑星配置詳細

**タスク**:
- 10惑星の配置計算
- ハウス分析（AstrologyAPI）
- 詳細説明文生成

**時間**: 16時間

---

#### Day 68-70: アスペクト分析

**タスク**:
- 主要アスペクト計算（合、衝、三分、四分）
- アスペクト図の描画（SVG）
- 解釈文生成

**時間**: 12時間

---

### Week 11-12: UI実装 + テスト

#### Day 71-77: 時系列UI実装

**タスク**:
- タイムライン表示UI
- グラフ表示（Recharts）
- インタラクティブ機能（年クリックで詳細表示）

**時間**: 28時間

---

#### Day 78-84: テスト + リリース

**タスク**:
- E2Eテスト
- パフォーマンス最適化
- リリース

**時間**: 28時間

---

### Month 3成果物

✅ **新機能**:
- 時系列分析（過去10年・未来10年）
- 惑星配置詳細
- アスペクト分析
- インタラクティブグラフ

✅ **KPI**:
- ユーザー数: 300人
- プレミアム機能への関心: 30%以上

---

## Month 4: 有料化（Week 13-16）

### テーマ: **"収益化とコミュニティ構築"**

### 目標
- 有料プラン実装
- 決済機能統合
- コミュニティ機能追加
- 初期収益¥50,000/月達成

---

### Week 13: Stripe統合

#### Day 85-88: 決済基盤構築

**タスク**:
- Stripeアカウント作成
- サブスクリプション設定
- Checkout Session実装

**プラン設計**:
| プラン | 月額 | 機能 |
|--------|------|------|
| Free | ¥0 | 基本占い、月1回まで |
| Premium | ¥980 | AI画像生成、時系列分析、無制限 |

**時間**: 16時間

---

#### Day 89-91: 有料機能制限

**タスク**:
- 機能制限ロジック実装
- プランアップグレードUI
- サブスクリプション管理画面

**時間**: 12時間

---

### Week 14-15: コミュニティ機能

#### Day 92-98: 掲示板実装

**タスク**:
- コメント機能（占い結果へのコメント）
- いいね機能
- 通報機能

**時間**: 28時間

---

#### Day 99-105: ソーシャル機能

**タスク**:
- フォロー機能
- タイムライン表示
- 通知機能

**時間**: 28時間

---

### Week 16: テスト + マーケティング

#### Day 106-112: リリース準備

**タスク**:
- E2Eテスト
- セキュリティ監査
- マーケティング施策（Twitter広告、Product Hunt）

**時間**: 28時間

---

### Month 4成果物

✅ **新機能**:
- 有料プラン（¥980/月）
- Stripe決済
- コミュニティ機能（コメント、いいね、フォロー）

✅ **KPI**:
- 有料ユーザー: 50人
- 月間収益: ¥49,000

---

## Month 5: AI高度化（Week 17-20）

### テーマ: **"パーソナライズとAI強化"**

### 目標
- AIアドバイザー実装
- パーソナライズ推奨
- ユーザー1,000人突破

---

### Week 17-18: AIアドバイザー

#### Day 113-126: GPT-4統合チャットボット

**タスク**:
- OpenAI Assistants API統合
- 占い結果に基づくアドバイス生成
- チャットUI実装

**機能例**:
- 「今週の運勢を教えて」→ AIが過去の占い結果から分析
- 「恋愛運を上げるには？」→ パーソナライズアドバイス

**時間**: 56時間

---

### Week 19-20: パーソナライズ推奨

#### Day 127-140: レコメンデーション実装

**タスク**:
- ユーザー行動ログ分析
- 類似ユーザー検出
- おすすめ占い種類の提案

**時間**: 56時間

---

### Month 5成果物

✅ **新機能**:
- AIアドバイザーチャットボット
- パーソナライズ推奨

✅ **KPI**:
- ユーザー数: 1,000人
- 有料ユーザー: 100人
- 月間収益: ¥98,000

---

## Month 6: スケール対応（Week 21-24）

### テーマ: **"グローバル展開とパフォーマンス"**

### 目標
- 英語版リリース
- パフォーマンス最適化
- ユーザー3,000人突破

---

### Week 21-22: 国際化（i18n）

#### Day 141-154: 多言語対応

**タスク**:
- next-i18next導入
- 英語翻訳（機械翻訳 + ネイティブチェック）
- 西洋占星術の英語表記対応

**時間**: 56時間

---

### Week 23-24: パフォーマンス最適化

#### Day 155-168: スケーリング

**タスク**:
- CDN最適化
- Database query最適化
- Redis導入（キャッシュ）
- Kubernetes検討

**時間**: 56時間

---

### Month 6成果物

✅ **新機能**:
- 英語版
- Redis キャッシュ

✅ **KPI**:
- ユーザー数: 3,000人
- 有料ユーザー: 150人
- 月間収益: ¥147,000

---

## 6ヶ月後の目標達成状況

### ユーザー数
- **目標**: 3,000人
- **内訳**: 日本2,500人、海外500人

### 収益
- **目標**: ¥147,000/月（有料ユーザー150人×¥980）
- **年間換算**: ¥1,764,000

### 機能完成度
- 基本占い: 100%
- AI機能: 80%
- コミュニティ: 60%
- 国際化: 50%

---

## リスク管理マトリクス

| リスク | 発生確率 | 影響度 | 対策 |
|--------|---------|--------|------|
| API障害（AstrologyAPI） | 中 | 高 | フォールバック実装 |
| AI画像生成コスト超過 | 高 | 中 | キャッシュ戦略強化 |
| ユーザー獲得不足 | 中 | 高 | マーケティング強化 |
| 決済トラブル | 低 | 高 | Stripeサポート活用 |
| サーバーダウン | 低 | 高 | Supabase Pro移行 |

---

## 次のアクション

### Phase 1完了後（1ヶ月後）
- **Go/No-Go判断**: KPI達成度を評価
- **ピボット検討**: 失敗時の代替案実行

### Phase 2完了後（2ヶ月後）
- **有料化準備**: Stripe本番環境移行

### Phase 3完了後（3ヶ月後）
- **投資判断**: 外部資金調達検討（¥5,000,000目標）

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-10-25 | 初版作成 |

---

**関連ドキュメント**:
- [技術スタック完全仕様書](./tech-stack.md)
- [MVP定義書](./mvp-definition.md)
- [プロトタイプ設計書](./prototype-design.md)
