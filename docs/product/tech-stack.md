# 技術スタック完全仕様書

**プロジェクト**: 統合占いアプリ（新湯 AI）
**作成日**: 2025-10-25
**バージョン**: 1.0.0

---

## 技術スタック選定方針

**コンセプト**: 占いロジックの複雑性、AI画像生成、リアルタイム計算を支える高速・拡張可能なアーキテクチャ

**優先順位**:
1. **開発速度**: MVP 1ヶ月で完成させる
2. **低コスト**: 初期は月額¥10,000以下に抑える
3. **スケーラビリティ**: ユーザー1,000人まで対応可能
4. **保守性**: TypeScript統一でメンテナンス容易

---

## 1. フロントエンド

### 1.1 フレームワーク

**選定**: **Next.js 14.2（App Router）+ TypeScript**

**バージョン**: 14.2.x（2025年10月時点最新）

**選定理由**:
- **App Router**: Server ComponentsでSEO最適化（ランディングページ重要）
- **TypeScript**: 占い計算ロジックの型安全性確保
- **Vercel最適化**: 無料デプロイ、Edge Functions活用
- **学習コスト**: 低（公式ドキュメント充実）
- **コミュニティ**: 活発（GitHub 120k+ stars）

**代替案との比較**:
| 項目 | Next.js | Vite + React | Nuxt.js |
|------|---------|-------------|---------|
| SSR/SSG | ◎ | △ | ◎ |
| デプロイ簡易度 | ◎（Vercel） | ○（Netlify） | ○（Nuxt Cloud） |
| TypeScript統合 | ◎ | ○ | ○ |
| 学習コスト | 低 | 中 | 中 |
| **総合評価** | **採用** | 不採用 | 不採用 |

### 1.2 UIライブラリ

**選定**: **Tailwind CSS 3.4 + shadcn/ui**

**選定理由**:
- **Tailwind CSS**: ユーティリティファーストで高速開発
- **shadcn/ui**: コピペ可能なコンポーネント（占い結果カード、入力フォーム等）
- **カスタマイズ性**: 占いテーマ（星座、動物等）に合わせた配色容易
- **バンドルサイズ**: PurgeCSS適用で最小化

**追加ライブラリ**:
- **Framer Motion 11**: アニメーション（占い結果表示時のエフェクト）
- **Recharts**: グラフ表示（時系列分析、運勢推移）
- **React Hook Form**: フォームバリデーション（誕生日入力等）

### 1.3 状態管理

**選定**: **Zustand 4.5**

**選定理由**:
- **軽量**: Redux比で80%小さい（~1KB）
- **シンプル**: 占いデータ（入力値、結果）の管理に最適
- **TypeScript親和性**: 型推論が強力

**状態設計**:
```typescript
// stores/fortuneStore.ts
interface FortuneState {
  // ユーザー入力
  birthDate: Date | null;
  birthTime: string | null;
  birthPlace: { lat: number; lng: number; name: string } | null;
  fullName: string | null;
  siblingPosition: 'eldest' | 'middle' | 'youngest' | 'only' | null;

  // 計算結果
  astrology: AstrologyResult | null;
  numerology: NumerologyResult | null;
  animalFortune: AnimalFortuneResult | null;
  siblingAnalysis: SiblingAnalysisResult | null;
  humorFortunes: HumorFortuneResult[] | null;

  // UI状態
  isCalculating: boolean;
  currentStep: 'input' | 'calculating' | 'result';

  // アクション
  setUserInput: (data: Partial<UserInput>) => void;
  calculateFortune: () => Promise<void>;
  reset: () => void;
}
```

---

## 2. バックエンド

### 2.1 アーキテクチャ選定

**選定**: **Supabase（BaaS）+ Edge Functions**

**選定理由**:
- **開発速度**: 認証・DB・ストレージが統合（1週間でMVP完成）
- **低コスト**: Free tier（50,000 MAU、500MB DB、1GB storage）
- **PostgreSQL**: リレーショナルDB（占い結果の複雑なクエリに対応）
- **Row Level Security**: ユーザーデータの自動保護
- **TypeScript統合**: フルスタックTypeScript実現

**代替案との比較**:
| 項目 | Supabase | Firebase | 独自API（NestJS） |
|------|----------|----------|-------------------|
| 開発速度 | ◎ | ◎ | △（2-3ヶ月） |
| コスト（MVP） | ◎（無料） | ◎（無料） | △（¥20,000/月） |
| SQL対応 | ◎（PostgreSQL） | △（NoSQL） | ◎（任意） |
| TypeScript | ◎ | ○ | ◎ |
| **総合評価** | **採用** | 不採用 | 不採用（Phase 2検討） |

### 2.2 Edge Functions（サーバーレス関数）

**用途**:
1. **占い計算エンドポイント**
   - `/api/calculate-astrology`: 西洋占星術計算
   - `/api/calculate-numerology`: 数秘術計算
   - `/api/calculate-animal`: 動物占い判定
   - `/api/calculate-sibling`: 兄弟構成分析
   - `/api/calculate-humor`: ユーモア占い生成

2. **AI画像生成エンドポイント**
   - `/api/generate-image`: OpenAI DALL-E 3呼び出し

3. **外部API統合**
   - `/api/astro-api-proxy`: AstrologyAPI呼び出し

**実装言語**: **TypeScript（Deno Runtime）**

---

## 3. データベース

### 3.1 スキーマ設計

**RDBMS**: **Supabase PostgreSQL**

**主要テーブル**:

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- ユーザー入力データ
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  birth_date DATE NOT NULL,
  birth_time TIME,
  birth_lat DECIMAL(9, 6),
  birth_lng DECIMAL(9, 6),
  birth_place_name TEXT,
  full_name TEXT NOT NULL,
  sibling_position TEXT CHECK (sibling_position IN ('eldest', 'middle', 'youngest', 'only')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 占い結果キャッシュ
CREATE TABLE fortune_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,

  -- 西洋占星術
  sun_sign TEXT,
  moon_sign TEXT,
  rising_sign TEXT,
  planet_positions JSONB,

  -- 数秘術
  life_path_number INTEGER,
  destiny_number INTEGER,
  soul_urge_number INTEGER,

  -- 動物占い
  animal_type TEXT,
  animal_color TEXT,

  -- 兄弟構成
  sibling_archetype TEXT,
  sibling_traits JSONB,

  -- ユーモア占い
  humor_fortunes JSONB,

  -- 統合プロファイル
  integrated_profile TEXT,

  -- AI画像URL
  animal_image_url TEXT,
  vegetable_image_url TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 時系列分析データ
CREATE TABLE timeline_analysis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  period TEXT CHECK (period IN ('past', 'present', 'future')),
  transit_data JSONB,
  predictions TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- アクセスログ（分析用）
CREATE TABLE access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 インデックス設計

```sql
-- 検索性能最適化
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_fortune_results_profile_id ON fortune_results(profile_id);
CREATE INDEX idx_timeline_analysis_profile_id ON timeline_analysis(profile_id);
CREATE INDEX idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);
```

### 3.3 キャッシュ戦略

**選定**: **Supabase内蔵キャッシュ + CDN（Vercel Edge Cache）**

**キャッシュ対象**:
1. 占い結果（同一入力の再計算防止）: 7日間
2. AI生成画像（S3 URL）: 永続
3. 静的コンテンツ（ランディングページ）: 1日間

---

## 4. 占いロジック実装

### 4.1 西洋占星術

**選定**: **AstrologyAPI（外部API）**

**サービス**: [AstrologyAPI](https://www.astrologyapi.com/)

**選定理由**:
- **正確性**: Swiss Ephemeris使用（天文計算の業界標準）
- **機能**: 出生図、トランジット、プログレス対応
- **価格**: $39/月（1,000リクエスト）、$79/月（5,000リクエスト）
- **API品質**: RESTful、JSON形式、レスポンス速度<500ms

**エンドポイント例**:
```bash
POST https://api.astrologyapi.com/v1/western_horoscope
{
  "day": 15,
  "month": 3,
  "year": 1990,
  "hour": 14,
  "min": 30,
  "lat": 35.6762,
  "lon": 139.6503,
  "tzone": 9.0
}
```

**レスポンス例**:
```json
{
  "sun_sign": "Pisces",
  "moon_sign": "Cancer",
  "ascendant": "Gemini",
  "planets": [
    { "name": "Sun", "sign": "Pisces", "degree": 24.5 },
    { "name": "Moon", "sign": "Cancer", "degree": 12.3 }
  ]
}
```

**代替案**: **独自実装（swiss-ephemeris NPMパッケージ）**
- メリット: API費用不要
- デメリット: 実装複雑、保守コスト高
- **判断**: Phase 2で検討（MVP期間はAPI優先）

### 4.2 動物占い

**選定**: **独自実装（ルールベース）**

**理由**: アルゴリズムが単純（生年月日からの計算式）

**実装方法**:
```typescript
// lib/animalFortune.ts
export function calculateAnimalFortune(birthDate: Date): {
  animal: string;
  color: string;
  traits: string[];
} {
  const year = birthDate.getFullYear();
  const animals = ['猿', '狼', '虎', 'たぬき', 'コアラ', '黒ひょう', 'ライオン', 'チーター', 'ゾウ', 'ひつじ', 'ペガサス', 'こじか'];
  const colors = ['ゴールド', 'シルバー', 'レッド', 'グリーン', 'ブルー', 'パープル'];

  // 動物の算出（簡略化、実際はより複雑な計算）
  const animalIndex = (year + birthDate.getMonth() + birthDate.getDate()) % 12;
  const colorIndex = (year + birthDate.getMonth() * 3) % 6;

  return {
    animal: animals[animalIndex],
    color: colors[colorIndex],
    traits: getAnimalTraits(animals[animalIndex])
  };
}
```

**データソース**: [動物占い公式サイト](https://www.doubutsu-uranai.com/)のロジックを参考に独自実装

### 4.3 数秘術

**選定**: **独自実装（数秘術計算ライブラリ）**

**NPMパッケージ**: `numerology-calculator` (またはスクラッチ実装)

**実装例**:
```typescript
// lib/numerology.ts
export function calculateNumerology(fullName: string, birthDate: Date): {
  lifePathNumber: number;
  destinyNumber: number;
  soulUrgeNumber: number;
} {
  // 運命数（Life Path Number）
  const lifePathNumber = reduceToSingleDigit(
    birthDate.getFullYear() +
    (birthDate.getMonth() + 1) +
    birthDate.getDate()
  );

  // 宿命数（Destiny Number）
  const destinyNumber = calculateNameNumber(fullName);

  // ソウル数（Soul Urge Number）
  const soulUrgeNumber = calculateVowelNumber(fullName);

  return { lifePathNumber, destinyNumber, soulUrgeNumber };
}

function reduceToSingleDigit(num: number): number {
  while (num > 9 && num !== 11 && num !== 22 && num !== 33) {
    num = num.toString().split('').reduce((a, b) => a + parseInt(b), 0);
  }
  return num;
}
```

### 4.4 兄弟構成診断

**選定**: **独自実装（心理学研究ベース）**

**理論**: アドラー心理学の「出生順位理論」

**実装**:
```typescript
// lib/siblingAnalysis.ts
const siblingProfiles = {
  eldest: {
    archetype: 'リーダー型',
    traits: ['責任感が強い', '完璧主義', '面倒見が良い', '保守的'],
    strengths: ['統率力', '計画性', '信頼性'],
    weaknesses: ['頑固', 'プレッシャーに弱い']
  },
  middle: {
    archetype: '調停者型',
    traits: ['協調性が高い', '柔軟', '社交的', 'バランス感覚'],
    strengths: ['交渉力', '適応力', '共感力'],
    weaknesses: ['目立ちたがらない', '自己主張が弱い']
  },
  youngest: {
    archetype: '革新者型',
    traits: ['自由奔放', '創造的', '甘え上手', '挑戦的'],
    strengths: ['発想力', '人懐っこさ', '楽観性'],
    weaknesses: ['責任感が薄い', '飽きっぽい']
  },
  only: {
    archetype: '独立型',
    traits: ['独立心が強い', '自己完結', '集中力が高い', '大人びている'],
    strengths: ['自律性', '専門性', '決断力'],
    weaknesses: ['協調性不足', '孤独に弱い']
  }
};

export function analyzeSiblingPosition(position: SiblingPosition) {
  return siblingProfiles[position];
}
```

### 4.5 ユーモア占い

**選定**: **OpenAI GPT-4o-mini（AI生成）**

**占い種類**:
- 野菜占い: 「あなたは〇〇な野菜」
- 椎茸占い: 「あなたは〇〇な椎茸」
- 妖怪占い: 「あなたは〇〇な妖怪」

**実装**:
```typescript
// lib/humorFortune.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateHumorFortune(
  type: 'vegetable' | 'mushroom' | 'yokai',
  profile: UserProfile
): Promise<string> {
  const prompt = `
あなたは占い師です。以下のプロフィールから、${type}占いを生成してください。

プロフィール:
- 誕生日: ${profile.birthDate}
- 名前: ${profile.fullName}
- 星座: ${profile.sunSign}
- 動物占い: ${profile.animalType}

ユーモアを交えた${type}占いを200文字以内で生成してください。
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 300
  });

  return response.choices[0].message.content;
}
```

---

## 5. AI画像生成

### 5.1 画像生成サービス

**選定**: **OpenAI DALL-E 3**

**選定理由**:
- **品質**: 高精細（1024x1024、1024x1792、1792x1024）
- **価格**: $0.040/枚（標準）、$0.080/枚（HD）
- **速度**: 10-20秒/枚
- **API統合**: 簡単（OpenAI SDK）

**代替案**:
| サービス | 価格 | 品質 | 速度 | 判定 |
|---------|------|------|------|------|
| DALL-E 3 | $0.04/枚 | ◎ | ○ | **採用** |
| Stable Diffusion | 無料（自前） | ○ | △（GPU必要） | 不採用 |
| Midjourney | $10/月 | ◎ | ○ | 不採用（API未提供） |

### 5.2 画像生成戦略

**生成タイミング**: 占い結果表示時にリアルタイム生成

**プロンプト例**:
```typescript
// lib/imageGeneration.ts
export async function generateAnimalImage(
  animal: string,
  color: string
): Promise<string> {
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

  return response.data[0].url;
}
```

**キャッシュ戦略**:
1. 生成したURLをSupabase Storageに保存
2. 同一動物+色の組み合わせは再利用（コスト削減）

---

## 6. インフラ・ホスティング

### 6.1 フロントエンド

**選定**: **Vercel（Hobby Plan）**

**選定理由**:
- **無料**: 100GB bandwidth/月（MVP十分）
- **CDN**: 世界中にエッジノード（日本含む）
- **Next.js最適化**: ゼロコンフィグデプロイ
- **カスタムドメイン**: 無料SSL証明書

**代替案**: Netlify（同等だがNext.js最適化がVercel優位）

### 6.2 バックエンド

**選定**: **Supabase（Free Plan）**

**リソース**:
- **データベース**: 500MB（MVP期間は十分）
- **ストレージ**: 1GB（画像キャッシュ用）
- **Edge Functions**: 500,000リクエスト/月
- **帯域幅**: 5GB/月

**スケールプラン**:
- **Pro Plan**（$25/月）: ユーザー100人超えたら移行
  - 8GB DB、100GB storage、2M Edge Functions

### 6.3 画像ストレージ

**選定**: **Supabase Storage**

**理由**:
- **統合性**: 同一プラットフォーム（管理容易）
- **CDN**: 自動配信
- **価格**: Free tier含む

**代替案**: AWS S3（スケール時に検討）

---

## 7. 認証・決済

### 7.1 認証

**選定**: **Supabase Auth**

**対応プロバイダー**:
- Email/Password
- Google OAuth（将来）
- Twitter OAuth（将来）

**セキュリティ**:
- Row Level Security（RLS）有効化
- JWT認証
- セッション管理自動

### 7.2 決済（将来実装）

**選定**: **Stripe（Phase 2）**

**理由**:
- 日本円対応
- 手数料3.6%（業界標準）
- サブスクリプション対応

**プラン案**:
- 無料プラン: 基本占い機能のみ
- プレミアム（¥980/月）: AI画像生成、詳細分析、時系列予測

---

## 8. CI/CD

### 8.1 バージョン管理

**選定**: **GitHub**

**ブランチ戦略**: GitHub Flow（シンプル）
- `main`: 本番環境（Vercel自動デプロイ）
- `feature/*`: 機能開発

### 8.2 自動デプロイ

**フロントエンド**: **Vercel GitHub連携**
- `main`ブランチpush時に自動デプロイ
- プレビューURL自動生成

**バックエンド**: **Supabase GitHub連携**
- Edge Functionsの自動デプロイ

### 8.3 テスト

**フロントエンド**:
- **単体テスト**: Vitest
- **E2Eテスト**: Playwright（Phase 2）

**バックエンド**:
- **API テスト**: Postman / Bruno

---

## 9. 監視・分析

### 9.1 分析ツール

**選定**: **Google Analytics 4（無料）**

**トラッキング対象**:
- ページビュー
- 占い計算実行数
- 完了率（入力→結果表示）
- 離脱ポイント

### 9.2 エラー監視

**選定**: **Sentry（Free tier）**

**対象**:
- フロントエンドエラー
- Edge Functionsエラー
- 占い計算失敗ログ

**アラート**: Slackに通知（重大エラー時）

### 9.3 パフォーマンス監視

**選定**: **Vercel Analytics（無料）**

**メトリクス**:
- Core Web Vitals（LCP、FID、CLS）
- サーバーレスポンス時間

---

## 10. コスト試算

### 10.1 初期コスト（MVP期間: 1ヶ月）

| 項目 | サービス | 月額コスト |
|------|---------|-----------|
| ホスティング | Vercel Hobby | ¥0 |
| バックエンド | Supabase Free | ¥0 |
| 占星術API | AstrologyAPI | $39（¥5,850） |
| 画像生成 | DALL-E 3 | $20（¥3,000、500枚想定） |
| ドメイン | お名前.com | ¥1,500/年（月割¥125） |
| **合計** | - | **¥8,975/月** |

### 10.2 スケール時コスト（ユーザー1,000人想定）

| 項目 | サービス | 月額コスト |
|------|---------|-----------|
| ホスティング | Vercel Pro | $20（¥3,000） |
| バックエンド | Supabase Pro | $25（¥3,750） |
| 占星術API | AstrologyAPI | $79（¥11,850） |
| 画像生成 | DALL-E 3 | $100（¥15,000、2,500枚） |
| ドメイン | お名前.com | ¥125 |
| 分析 | Google Analytics | ¥0 |
| エラー監視 | Sentry Free | ¥0 |
| **合計** | - | **¥33,725/月** |

### 10.3 収益化想定

**プレミアムプラン**: ¥980/月

**目標**:
- 無料ユーザー: 1,000人
- プレミアム転換率: 5%（50人）
- **月間収益**: ¥49,000
- **利益**: ¥49,000 - ¥33,725 = **¥15,275/月**

---

## 11. 技術スタック全体図

```
┌─────────────────────────────────────────────────────────┐
│                       ユーザー                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          フロントエンド（Vercel）                         │
│  Next.js 14 + TypeScript + Tailwind CSS + shadcn/ui    │
│  Zustand（状態管理）                                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│          バックエンド（Supabase）                         │
│  Edge Functions（Deno + TypeScript）                    │
│    ├─ /api/calculate-astrology                         │
│    ├─ /api/calculate-numerology                        │
│    ├─ /api/calculate-animal                            │
│    ├─ /api/calculate-sibling                           │
│    ├─ /api/generate-image                              │
│    └─ /api/astro-api-proxy                             │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬────────────┐
        │            │            │            │
        ▼            ▼            ▼            ▼
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│ Database │  │ Storage  │  │ Auth     │  │ 外部API   │
│PostgreSQL│  │ S3互換   │  │ JWT      │  │AstrologyAPI│
│（500MB） │  │ (1GB)    │  │          │  │DALL-E 3   │
└──────────┘  └──────────┘  └──────────┘  └──────────┘

                     │
                     ▼
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│   監視       │         │   分析       │
│ Sentry       │         │ GA4          │
│ Vercel Logs  │         │ Vercel Analytics│
└──────────────┘         └──────────────┘
```

---

## 12. セキュリティ対策

### 12.1 データ保護

**実装**:
- Row Level Security（RLS）: ユーザーは自分のデータのみアクセス可
- HTTPS強制: Vercel自動対応
- API Key暗号化: 環境変数管理

### 12.2 レート制限

**Edge Functions**:
- 同一IPから1分間に10リクエストまで
- Supabase標準機能で実装

### 12.3 入力バリデーション

**フロントエンド**:
- React Hook Form + Zod（型安全バリデーション）

**バックエンド**:
- SQL Injection対策: Supabase自動エスケープ

---

## 13. 開発環境

### 13.1 必要ツール

**必須**:
- Node.js 20.x（LTS）
- pnpm 9.x（パッケージマネージャー）
- Visual Studio Code
- Git

**推奨VSCode拡張機能**:
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Supabase

### 13.2 環境変数

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ASTROLOGY_API_KEY=your-astrology-api-key
OPENAI_API_KEY=your-openai-api-key

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 14. パッケージ依存関係

### 14.1 フロントエンド

```json
{
  "dependencies": {
    "next": "14.2.15",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "typescript": "5.6.3",
    "@supabase/supabase-js": "2.45.4",
    "zustand": "4.5.5",
    "react-hook-form": "7.53.0",
    "zod": "3.23.8",
    "framer-motion": "11.11.1",
    "recharts": "2.13.0",
    "date-fns": "4.1.0",
    "tailwindcss": "3.4.14",
    "class-variance-authority": "0.7.0",
    "clsx": "2.1.1",
    "tailwind-merge": "2.5.3"
  },
  "devDependencies": {
    "@types/node": "22.7.5",
    "@types/react": "18.3.11",
    "eslint": "9.12.0",
    "prettier": "3.3.3",
    "vitest": "2.1.2"
  }
}
```

### 14.2 バックエンド（Edge Functions）

```json
{
  "dependencies": {
    "openai": "4.67.3",
    "date-fns": "4.1.0"
  }
}
```

---

## 15. スケーラビリティ計画

### 15.1 Phase 1（MVP: 0-100ユーザー）

**現在の技術スタック**: 変更なし（Supabase Free + Vercel Hobby）

### 15.2 Phase 2（成長期: 100-1,000ユーザー）

**変更点**:
- Supabase Pro（$25/月）に移行
- Vercel Pro（$20/月）に移行
- Redis導入（Upstash: $10/月）: 占い結果キャッシュ

### 15.3 Phase 3（スケール期: 1,000-10,000ユーザー）

**変更点**:
- Database分離: Supabase → AWS RDS（PostgreSQL）
- 独自API実装（NestJS）: Edge Functionsから移行
- Kubernetes検討（コスト次第）

---

## 付録A: API仕様例

### A.1 占い計算API

**エンドポイント**: `POST /api/calculate-fortune`

**リクエスト**:
```json
{
  "birthDate": "1990-03-15T14:30:00Z",
  "birthPlace": {
    "lat": 35.6762,
    "lng": 139.6503,
    "name": "東京都"
  },
  "fullName": "山田太郎",
  "siblingPosition": "eldest"
}
```

**レスポンス**:
```json
{
  "astrology": {
    "sunSign": "Pisces",
    "moonSign": "Cancer",
    "ascendant": "Gemini"
  },
  "numerology": {
    "lifePathNumber": 7,
    "destinyNumber": 3
  },
  "animalFortune": {
    "animal": "狼",
    "color": "ゴールド"
  },
  "siblingAnalysis": {
    "archetype": "リーダー型"
  },
  "humorFortunes": [
    { "type": "vegetable", "result": "あなたはトマトのような人" }
  ],
  "images": {
    "animal": "https://storage.supabase.co/..."
  }
}
```

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2025-10-25 | 初版作成 |

---

**次のドキュメント**: [MVP定義書](./mvp-definition.md)
