# Shinyu (真由) - 統合占いアプリ UI/UX

## 🚀 クイックスタート

```bash
# 依存関係インストール
pnpm install

# 開発サーバー起動
pnpm dev
```

ブラウザで http://localhost:3000 を開く

---

## 📱 実装済み機能

### ✅ Phase 1: ランディングページ
- 美しいグラデーション背景（Deep Purple → Mystic Blue）
- 8種類の占いカード表示
- Framer Motionによるスムーズなアニメーション
- レスポンシブデザイン（モバイル対応）

### ✅ Phase 2: 入力フォーム
- 5つの入力フィールド
  - 名前（ニックネーム可）
  - 誕生日（date picker）
  - 誕生時刻（time picker、任意）
  - 生まれた場所（テキスト入力）
  - 兄弟構成（セレクトボックス）
- バリデーション機能
- Glassmorphismデザイン

### ✅ Phase 3: ローディング画面
- 回転アニメーション（3秒間）
- 進捗表示（4段階）
  - ホロスコープ計算
  - 動物占い分析
  - 数秘術計算
  - 統合プロファイル生成
- 順次表示アニメーション

### ✅ Phase 4: 結果表示ページ
- カード形式のレイアウト
- 4つのセクション
  - あなたの本質（太陽星座、動物、運命数、野菜）
  - ユニークな占い（キノコ、天気）
  - 総合分析（性格）
  - アクションボタン（シェア、再占い）

---

## 🎨 デザインシステム

### カラーパレット

#### Mystic Purple（メインカラー）
```
mystic-50:  #F5F3FF (最も明るい)
mystic-100: #EDE9FE
mystic-200: #DDD6FE
mystic-300: #C4B5FD
mystic-400: #A78BFA
mystic-500: #8B5CF6 (基準色)
mystic-600: #7C3AED
mystic-700: #6D28D9
mystic-800: #5B21B6
mystic-900: #4C1D95
mystic-950: #2E1065 (最も暗い)
```

#### Gold（アクセントカラー）
```
gold-50:  #FFFBEB
gold-100: #FEF3C7
gold-200: #FDE68A
gold-300: #FCD34D
gold-400: #FBBF24
gold-500: #F59E0B (基準色)
gold-600: #D97706
gold-700: #B45309
gold-800: #92400E
gold-900: #78350F
```

### タイポグラフィ

- **フォントファミリー**: Inter, Noto Sans JP, sans-serif
- **見出し1**: text-6xl md:text-8xl (60px → 96px)
- **見出し2**: text-3xl md:text-5xl (30px → 48px)
- **見出し3**: text-2xl (24px)
- **本文**: text-lg (18px)
- **小文字**: text-sm (14px)

### アニメーション

#### フェードイン
```css
@keyframes fadeIn {
  0% { opacity: 0 }
  100% { opacity: 1 }
}
```

#### スライドアップ
```css
@keyframes slideUp {
  0% { transform: translateY(20px); opacity: 0 }
  100% { transform: translateY(0); opacity: 1 }
}
```

#### 回転（ローディング）
```css
animation: rotate 3s linear infinite;
```

---

## 📐 レイアウト構造

### ランディングページ
```
├── ヘッダー（Shinyu ロゴ + サブタイトル）
├── 占いカードグリッド（2列 x 4行 → モバイルは2列 x 4行）
├── CTAボタン（「占いを始める」）
└── フッター（所要時間・無料表記）
```

### 入力フォーム
```
├── タイトル
├── フォーム
│   ├── 名前入力
│   ├── 誕生日入力
│   ├── 誕生時刻入力（任意）
│   ├── 生まれた場所入力
│   └── 兄弟構成選択
├── 送信ボタン
└── 戻るボタン
```

### 結果表示ページ
```
├── ヘッダー（ユーザー名 + サブタイトル）
├── 基本情報カード（2x2グリッド）
├── ユニークな占いカード
├── 総合分析カード
└── アクションボタン（シェア・再占い）
```

---

## 🔧 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|-----------|
| フレームワーク | Next.js | 14.2.0 |
| 言語 | TypeScript | 5.3.0 |
| スタイリング | Tailwind CSS | 3.4.0 |
| アニメーション | Framer Motion | 11.0.0 |
| 状態管理 | Zustand | 4.5.0 |
| パッケージ管理 | pnpm | 最新 |

---

## 📦 ファイル構成

```
app/
├── app/
│   ├── layout.tsx          # ルートレイアウト（メタデータ）
│   ├── page.tsx            # メインページ（全画面統合）
│   └── globals.css         # グローバルスタイル
├── tailwind.config.ts      # Tailwind設定
├── tsconfig.json           # TypeScript設定
├── next.config.mjs         # Next.js設定
├── postcss.config.mjs      # PostCSS設定
├── .eslintrc.json          # ESLint設定
├── package.json            # 依存関係
└── README.md               # このファイル
```

---

## 🎯 今後の実装予定

### Phase 5: API統合
- [ ] 占いエンジンAPI接続（Python → Next.js）
- [ ] Supabase認証（ユーザー登録・ログイン）
- [ ] データベース統合（結果保存）

### Phase 6: AI画像生成
- [ ] OpenAI DALL-E 3統合
- [ ] 動物・野菜・キノコ・天気の画像生成
- [ ] 画像キャッシュシステム

### Phase 7: SNSシェア
- [ ] Instagram / X / LINE シェア機能
- [ ] OGP画像生成（結果カード画像化）

### Phase 8: 有料化
- [ ] Stripe決済統合
- [ ] Free / Student / Basic / Pro プラン実装

---

## 🚨 注意事項

### 開発時のポート競合
```bash
# ポート3000が使用中の場合
PORT=3001 pnpm dev
```

### ビルドエラー対応
```bash
# キャッシュクリア
rm -rf .next
pnpm dev
```

### TypeScriptエラー無視（一時的）
```bash
# ビルド時に型エラーを無視（本番では非推奨）
pnpm build --no-check
```

---

## 📊 パフォーマンス

### Core Web Vitals目標値

| 指標 | 目標値 | 現在値 |
|------|--------|--------|
| LCP | < 2.5s | 測定中 |
| FID | < 100ms | 測定中 |
| CLS | < 0.1 | 測定中 |

### 最適化施策

- ✅ 画像最適化（Next.js Image）
- ✅ フォント最適化（next/font）
- ✅ コード分割（Dynamic Import）
- ⏳ CSS最適化（PurgeCSS）
- ⏳ Service Worker（PWA化）

---

## 🎨 デザイン参考

- **Dribbble**: Fortune telling app designs
- **Behance**: Mystical UI designs
- **Awwwards**: Award-winning gradients

---

## 📞 サポート

**プロジェクトオーナー**: Claude Code + Miyabi Agent System
**Issue**: https://github.com/customer-cloud/miyabi-private/issues/531

---

**Powered by Shinyu (真由) - 1つの入力で、世界中の占いがあなたを読み解く** 🔮✨
