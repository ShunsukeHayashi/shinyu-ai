# 統合占いアプリ - 実装ガイド
# Integrated Fortune-Telling App - Implementation Guide

**Version**: 1.0.0
**Last Updated**: 2025-10-25
**Author**: Claude Code (Sonnet 4.5)

---

## 目次

1. [システムアーキテクチャ](#システムアーキテクチャ)
2. [技術スタック](#技術スタック)
3. [実装ステップ](#実装ステップ)
4. [サンプルコード](#サンプルコード)
5. [API統合](#api統合)
6. [データベース設計](#データベース設計)
7. [テスト戦略](#テスト戦略)
8. [デプロイ](#デプロイ)

---

## システムアーキテクチャ

### 全体構成

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Input Form  │  │  Profile    │  │  Timeline   │    │
│  │  Component  │  │  Display    │  │  Viz        │    │
│  └─────────────┘  └─────────────┘  └─────────────┘    │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API / GraphQL
┌──────────────────────▼──────────────────────────────────┐
│              Backend API (FastAPI / Rust)                │
│  ┌────────────────────────────────────────────────────┐ │
│  │            Calculation Engine                      │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐          │ │
│  │  │Astrology │ │ Animal   │ │Numerology│          │ │
│  │  │ Engine   │ │ Fortune  │ │ Engine   │          │ │
│  │  └──────────┘ └──────────┘ └──────────┘          │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │      Integration & Profile Generation              │ │
│  │  - Trait Extraction                                │ │
│  │  - Contradiction Resolution                        │ │
│  │  - LLM-based Narrative Generation                  │ │
│  └────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
┌───────▼───────┐ ┌───▼────┐ ┌──────▼──────┐
│  PostgreSQL   │ │ Redis  │ │  External   │
│  (User Data)  │ │(Cache) │ │   APIs      │
└───────────────┘ └────────┘ │ - OpenAI    │
                              │ - DALL-E    │
                              │ - Swiss Eph │
                              └─────────────┘
```

---

## 技術スタック

### フロントエンド

| 技術 | 用途 | 理由 |
|------|------|------|
| **Next.js 14** | フレームワーク | SSR, App Router, 最新機能 |
| **TypeScript** | 型安全性 | バグ削減、開発効率向上 |
| **Tailwind CSS** | スタイリング | 高速開発、レスポンシブ対応 |
| **Framer Motion** | アニメーション | スムーズなUX |
| **D3.js** | データ可視化 | ホロスコープ、タイムライン |
| **Recharts** | チャート | 簡単なグラフ描画 |

### バックエンド

#### Option A: Python (推奨 - 占星術ライブラリが豊富)

| 技術 | 用途 |
|------|------|
| **FastAPI** | Web Framework |
| **pyswisseph** | 占星術計算 |
| **Pydantic** | データバリデーション |
| **SQLAlchemy** | ORM |
| **Celery** | 非同期タスク処理 |
| **Redis** | キャッシュ & メッセージブローカー |

#### Option B: Rust (高パフォーマンス)

| 技術 | 用途 |
|------|------|
| **Actix-web** | Web Framework |
| **swisseph-rs** | 占星術計算 (Swiss Ephemeris bindings) |
| **Diesel** | ORM |
| **Tokio** | 非同期ランタイム |
| **Serde** | シリアライゼーション |

### データベース

| 技術 | 用途 |
|------|------|
| **PostgreSQL** | メインデータベース |
| **Redis** | キャッシュ、セッション管理 |

### AI & 外部サービス

| サービス | 用途 | コスト |
|----------|------|--------|
| **OpenAI GPT-4** | プロファイル文章生成 | $0.03/1K入力, $0.06/1K出力 |
| **DALL-E 3** | AI画像生成 | $0.04-0.12/画像 |
| **Swiss Ephemeris** | 天体暦 | CHF 750（初回商用ライセンス） |

---

## 実装ステップ

### Phase 1: 基本機能実装（4-6週間）

#### Week 1-2: プロジェクトセットアップ & データ準備

- [ ] Next.js + FastAPI プロジェクト初期化
- [ ] PostgreSQL, Redis セットアップ
- [ ] `fortune-database.yaml` を PostgreSQL にインポート
- [ ] Swiss Ephemeris インストール & テスト

#### Week 3-4: コア計算エンジン実装

- [ ] 西洋占星術エンジン（pyswisseph使用）
  - 出生図計算
  - ハウス計算（Placidus）
  - アスペクト検出
- [ ] 動物占いエンジン
  - シリアル値計算
  - 60分類マッピング
- [ ] 数秘術エンジン
  - 運命数計算
  - マスターナンバー検出
- [ ] 兄弟構成分析エンジン
  - ルールベースシステム

#### Week 5-6: 統合プロファイル生成

- [ ] 共通特性抽出アルゴリズム
- [ ] 矛盾調整ロジック
- [ ] OpenAI GPT-4統合
- [ ] プロファイル文章生成

### Phase 2: フロントエンド & UX（3-4週間）

#### Week 7-8: UI コンポーネント

- [ ] 入力フォーム（生年月日、出生時刻、出生地、名前、兄弟構成）
- [ ] プロファイル表示画面
- [ ] タイムライン可視化（過去10年・現在・未来10年）

#### Week 9-10: データ可視化

- [ ] ホロスコープチャート（D3.js）
- [ ] 惑星配置図
- [ ] 数秘術図形
- [ ] 動物キャラクター表示

### Phase 3: AI画像生成 & 最適化（2-3週間）

#### Week 11-12: AI画像統合

- [ ] DALL-E 3統合
- [ ] 画像生成プロンプト実装
- [ ] 画像キャッシュシステム

#### Week 13: 最適化

- [ ] パフォーマンス最適化
- [ ] キャッシュ戦略実装
- [ ] エラーハンドリング強化

### Phase 4: テスト & デプロイ（2週間）

#### Week 14: テスト

- [ ] ユニットテスト（計算エンジン）
- [ ] 統合テスト（API）
- [ ] E2Eテスト（フロントエンド）

#### Week 15: デプロイ

- [ ] 本番環境構築（Vercel + Railway/Fly.io）
- [ ] CI/CD パイプライン
- [ ] モニタリング & ロギング

---

## サンプルコード

### 1. 西洋占星術エンジン（Python + pyswisseph）

```python
import swisseph as swe
from datetime import datetime
from typing import Dict, List, Tuple

class AstrologyEngine:
    def __init__(self):
        # Swiss Ephemeris データパス設定
        swe.set_ephe_path('/path/to/ephe')

    def calculate_birth_chart(
        self,
        birth_date: datetime,
        birth_time: str,  # "HH:MM"
        latitude: float,
        longitude: float
    ) -> Dict:
        """
        出生図を計算

        Returns:
            {
                'sun': {'sign': 'Cancer', 'degree': 20.5, 'house': 4},
                'moon': {...},
                'planets': [...],
                'houses': [...],
                'aspects': [...]
            }
        """
        # 日時をユリウス日に変換
        year = birth_date.year
        month = birth_date.month
        day = birth_date.day
        hour, minute = map(int, birth_time.split(':'))
        time_decimal = hour + minute / 60.0

        jd = swe.julday(year, month, day, time_decimal)

        # 惑星位置計算
        planets = {}
        planet_ids = {
            'sun': swe.SUN,
            'moon': swe.MOON,
            'mercury': swe.MERCURY,
            'venus': swe.VENUS,
            'mars': swe.MARS,
            'jupiter': swe.JUPITER,
            'saturn': swe.SATURN,
            'uranus': swe.URANUS,
            'neptune': swe.NEPTUNE,
            'pluto': swe.PLUTO
        }

        for name, planet_id in planet_ids.items():
            position, ret = swe.calc_ut(jd, planet_id)
            longitude_deg = position[0]

            planets[name] = {
                'longitude': longitude_deg,
                'sign': self._get_zodiac_sign(longitude_deg),
                'degree': longitude_deg % 30,
                'retrograde': ret < 0
            }

        # ハウス計算（Placidus）
        houses, ascmc = swe.houses(jd, latitude, longitude, b'P')  # 'P' = Placidus

        house_data = []
        for i, cusp in enumerate(houses, start=1):
            house_data.append({
                'house': i,
                'cusp': cusp,
                'sign': self._get_zodiac_sign(cusp)
            })

        # ASC, MC
        asc = ascmc[0]
        mc = ascmc[1]

        # 各惑星がどのハウスにあるか
        for name, planet in planets.items():
            planet['house'] = self._get_house_position(
                planet['longitude'], houses
            )

        # アスペクト計算
        aspects = self._calculate_aspects(planets)

        return {
            'planets': planets,
            'houses': house_data,
            'asc': asc,
            'mc': mc,
            'aspects': aspects
        }

    def _get_zodiac_sign(self, longitude: float) -> str:
        """経度から星座を取得"""
        signs = [
            'Aries', 'Taurus', 'Gemini', 'Cancer',
            'Leo', 'Virgo', 'Libra', 'Scorpio',
            'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
        ]
        index = int(longitude / 30)
        return signs[index]

    def _get_house_position(
        self, longitude: float, house_cusps: List[float]
    ) -> int:
        """惑星がどのハウスにあるか判定"""
        for i in range(12):
            next_i = (i + 1) % 12
            if house_cusps[i] <= longitude < house_cusps[next_i]:
                return i + 1
        return 12

    def _calculate_aspects(self, planets: Dict) -> List[Dict]:
        """アスペクトを計算"""
        aspects = []
        aspect_definitions = [
            {'name': 'Conjunction', 'angle': 0, 'orb': 8},
            {'name': 'Sextile', 'angle': 60, 'orb': 6},
            {'name': 'Square', 'angle': 90, 'orb': 8},
            {'name': 'Trine', 'angle': 120, 'orb': 8},
            {'name': 'Opposition', 'angle': 180, 'orb': 8}
        ]

        planet_names = list(planets.keys())
        for i, p1 in enumerate(planet_names):
            for p2 in planet_names[i+1:]:
                angle = abs(
                    planets[p1]['longitude'] - planets[p2]['longitude']
                )
                if angle > 180:
                    angle = 360 - angle

                for aspect_def in aspect_definitions:
                    diff = abs(angle - aspect_def['angle'])
                    if diff <= aspect_def['orb']:
                        aspects.append({
                            'planet1': p1,
                            'planet2': p2,
                            'aspect': aspect_def['name'],
                            'angle': angle,
                            'orb': diff
                        })

        return aspects

# 使用例
engine = AstrologyEngine()
chart = engine.calculate_birth_chart(
    birth_date=datetime(1990, 7, 12),
    birth_time="14:30",
    latitude=35.6895,  # 東京
    longitude=139.6917
)

print(f"Sun in {chart['planets']['sun']['sign']} at House {chart['planets']['sun']['house']}")
```

### 2. 動物占いエンジン（Python）

```python
from datetime import datetime

class AnimalFortuneEngine:
    def __init__(self):
        # 60分類データ（fortune-database.yamlから取得）
        self.animal_data = self._load_animal_data()

    def calculate_animal_character(self, birth_date: datetime) -> Dict:
        """
        生年月日から60分類の動物キャラクターを算出

        Algorithm: ((serial_value + 8) % 60) + 1
        """
        # Excelシリアル値に変換（1900-01-01を1とする）
        base_date = datetime(1900, 1, 1)
        delta = birth_date - base_date
        serial_value = delta.days + 2  # Excelの仕様に合わせる

        # 60分類番号を計算
        character_number = ((serial_value + 8) % 60) + 1

        # キャラクターデータを取得
        character = self.animal_data[character_number]

        return {
            'character_number': character_number,
            'animal': character['animal'],
            'color': character['color'],
            'personality': character['personality'],
            'traits': character['traits'],
            'love_style': character['love_style'],
            'work_style': character['work_style']
        }

    def _load_animal_data(self) -> Dict:
        """
        60分類データベースを読み込み
        実際はPostgreSQLまたはYAMLから読み込む
        """
        # 簡略版（実際は全60種を定義）
        return {
            1: {
                'animal': '狼',
                'color': 'ブルー',
                'personality': '冷静で分析的な一匹狼',
                'traits': ['独立心', '直感力', '集中力'],
                'love_style': 'じっくり時間をかけて信頼関係を築く',
                'work_style': '個人プレーが得意、マイペースな環境で力を発揮'
            },
            # ... 2-60の定義
        }

# 使用例
engine = AnimalFortuneEngine()
result = engine.calculate_animal_character(datetime(1990, 7, 12))
print(f"あなたは {result['color']} の {result['animal']} です")
```

### 3. 数秘術エンジン（Python）

```python
class NumerologyEngine:
    def calculate_life_path_number(self, birth_date: datetime) -> Dict:
        """運命数（Life Path Number）を計算"""
        date_str = birth_date.strftime('%Y%m%d')
        digits = [int(d) for d in date_str]
        total = sum(digits)

        # マスターナンバーチェック
        if total in [11, 22, 33, 44]:
            return self._get_number_meaning(total)

        # 1桁になるまで足す
        while total > 9:
            total = sum(int(d) for d in str(total))

        return self._get_number_meaning(total)

    def calculate_expression_number(self, full_name: str) -> Dict:
        """表現数を名前から計算"""
        # A=1, B=2, ... Z=26
        letter_values = {chr(i): i - 64 for i in range(65, 91)}

        total = sum(
            letter_values.get(char.upper(), 0)
            for char in full_name if char.isalpha()
        )

        # マスターナンバーチェック
        if total in [11, 22, 33]:
            return self._get_number_meaning(total)

        while total > 9:
            total = sum(int(d) for d in str(total))

        return self._get_number_meaning(total)

    def _get_number_meaning(self, number: int) -> Dict:
        """数字の意味を取得（fortune-database.yamlから）"""
        meanings = {
            1: {
                'number': 1,
                'meaning': 'リーダー・パイオニア',
                'personality': '独立心が強く、リーダーシップがある',
                'strengths': ['独立心', 'リーダーシップ', '創造性'],
                'life_purpose': '自分の道を切り開き、他者を導く'
            },
            # ... 2-9, 11, 22, 33の定義
        }
        return meanings.get(number, {})

# 使用例
engine = NumerologyEngine()
life_path = engine.calculate_life_path_number(datetime(1990, 7, 12))
print(f"運命数: {life_path['number']} - {life_path['meaning']}")

expression = engine.calculate_expression_number("Taro Yamada")
print(f"表現数: {expression['number']}")
```

### 4. 統合プロファイル生成（Python + OpenAI）

```python
import openai
from typing import Dict, List

class IntegratedProfileGenerator:
    def __init__(self, openai_api_key: str):
        openai.api_key = openai_api_key

    def generate_profile(
        self,
        astrology_result: Dict,
        animal_result: Dict,
        numerology_result: Dict,
        sibling_result: Dict
    ) -> str:
        """
        複数の占い結果を統合してプロファイルを生成
        """
        # 共通特性を抽出
        common_traits = self._extract_common_traits([
            astrology_result.get('traits', []),
            animal_result.get('traits', []),
            numerology_result.get('strengths', []),
            sibling_result.get('strengths', [])
        ])

        # OpenAI GPT-4でプロファイル文章生成
        prompt = self._build_prompt(
            astrology_result,
            animal_result,
            numerology_result,
            sibling_result,
            common_traits
        )

        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {
                    "role": "system",
                    "content": "あなたは優秀な占い師です。複数の占い結果を統合して、一貫性のある温かいプロファイルを生成してください。"
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=2000
        )

        profile_text = response.choices[0].message.content

        return profile_text

    def _extract_common_traits(
        self, trait_lists: List[List[str]]
    ) -> List[str]:
        """共通特性を抽出"""
        from collections import Counter

        all_traits = [trait for traits in trait_lists for trait in traits]
        trait_counts = Counter(all_traits)

        # 2つ以上の占いで出現した特性を抽出
        common = [
            trait for trait, count in trait_counts.items() if count >= 2
        ]

        return common

    def _build_prompt(
        self,
        astrology: Dict,
        animal: Dict,
        numerology: Dict,
        sibling: Dict,
        common_traits: List[str]
    ) -> str:
        """GPT-4用のプロンプトを構築"""
        prompt = f"""
以下の占い結果から、統合プロファイルを生成してください。

【西洋占星術】
- 太陽星座: {astrology['sun']['sign']}
- 月星座: {astrology['moon']['sign']}
- アセンダント: {astrology.get('asc_sign', 'N/A')}
- 主要な特性: {', '.join(astrology.get('traits', []))}

【動物占い】
- 動物: {animal['animal']} ({animal['color']})
- 性格: {animal['personality']}
- 恋愛傾向: {animal['love_style']}

【数秘術】
- 運命数: {numerology['life_path']['number']} - {numerology['life_path']['meaning']}
- 人生の目的: {numerology['life_path']['life_purpose']}

【兄弟構成】
- 出生順位: {sibling['birth_order']}
- 性格特性: {sibling['personality']}

【共通特性】
{', '.join(common_traits)}

以下の構成で2000-2500文字のプロファイルを生成してください：

1. イントロダクション（150-200文字）
2. 基本性格（400-500文字）
3. 強みと才能（200-300文字）
4. 課題と成長の方向性（200-300文字、ポジティブに）
5. 恋愛傾向（200-300文字）
6. 仕事適性（200-300文字）
7. まとめと励まし（150-200文字）

矛盾する点があれば、「状況によって使い分ける多面性」として肯定的に統合してください。
温かく励ます口調で、読者が前向きになれる内容にしてください。
"""
        return prompt

# 使用例
generator = IntegratedProfileGenerator(openai_api_key="sk-...")
profile = generator.generate_profile(
    astrology_result=chart,
    animal_result=animal,
    numerology_result=numerology,
    sibling_result=sibling
)

print(profile)
```

### 5. FastAPI エンドポイント

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

app = FastAPI(title="Fortune-Telling API")

class UserInput(BaseModel):
    birth_date: str  # "YYYY-MM-DD"
    birth_time: Optional[str] = None  # "HH:MM"
    birth_place: Optional[dict] = None  # {"lat": 35.6895, "lon": 139.6917}
    full_name: str
    sibling_order: str  # "first_born", "middle_child", "youngest", "only_child"
    sibling_count: int
    gender: str  # "male", "female", "other"

@app.post("/api/profile/generate")
async def generate_profile(user_input: UserInput):
    """統合プロファイルを生成"""
    try:
        # 各占いエンジンで計算
        birth_datetime = datetime.fromisoformat(user_input.birth_date)

        # 西洋占星術
        if user_input.birth_time and user_input.birth_place:
            astrology_engine = AstrologyEngine()
            astrology_result = astrology_engine.calculate_birth_chart(
                birth_date=birth_datetime,
                birth_time=user_input.birth_time,
                latitude=user_input.birth_place['lat'],
                longitude=user_input.birth_place['lon']
            )
        else:
            astrology_result = None

        # 動物占い
        animal_engine = AnimalFortuneEngine()
        animal_result = animal_engine.calculate_animal_character(birth_datetime)

        # 数秘術
        numerology_engine = NumerologyEngine()
        numerology_result = {
            'life_path': numerology_engine.calculate_life_path_number(birth_datetime),
            'expression': numerology_engine.calculate_expression_number(user_input.full_name)
        }

        # 兄弟構成
        sibling_engine = SiblingPsychologyEngine()
        sibling_result = sibling_engine.analyze(
            user_input.sibling_order,
            user_input.sibling_count,
            user_input.gender
        )

        # 統合プロファイル生成
        profile_generator = IntegratedProfileGenerator(openai_api_key="sk-...")
        profile_text = profile_generator.generate_profile(
            astrology_result,
            animal_result,
            numerology_result,
            sibling_result
        )

        # レスポンス
        return {
            "profile": profile_text,
            "details": {
                "astrology": astrology_result,
                "animal": animal_result,
                "numerology": numerology_result,
                "sibling": sibling_result
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

---

## API統合

### 1. Swiss Ephemeris セットアップ

**Python (pyswisseph)**

```bash
pip install pyswisseph
```

**データファイルのダウンロード**

```bash
# Swiss Ephemeris データファイル
wget https://www.astro.com/ftp/swisseph/ephe/seas_18.se1
# 必要な期間のファイルをダウンロード
```

**商用ライセンス取得**

商用利用の場合は Astrodienst からライセンスを購入：
- https://www.astro.com/swisseph/swephprice_e.htm
- CHF 750（初回）

### 2. OpenAI GPT-4 統合

```python
import openai

openai.api_key = "sk-your-api-key"

response = openai.ChatCompletion.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "あなたは占い師です"},
        {"role": "user", "content": prompt}
    ],
    temperature=0.7,
    max_tokens=2000
)

profile_text = response.choices[0].message.content
```

**コスト管理**

```python
# トークン数計算
import tiktoken

encoding = tiktoken.encoding_for_model("gpt-4")
tokens = encoding.encode(prompt)
num_tokens = len(tokens)

# コスト見積もり
input_cost = num_tokens * 0.03 / 1000
output_cost = 2000 * 0.06 / 1000  # max_tokens
total_cost = input_cost + output_cost

print(f"推定コスト: ${total_cost:.4f}")
```

### 3. DALL-E 3 画像生成

```python
response = openai.Image.create(
    model="dall-e-3",
    prompt="A cheerful red tomato character with expressive eyes, digital art",
    size="1024x1024",
    quality="standard",
    n=1
)

image_url = response.data[0].url
# URLから画像をダウンロードして保存
```

---

## データベース設計

### PostgreSQL スキーマ

```sql
-- ユーザーテーブル
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザー入力データ
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    birth_time TIME,
    birth_latitude DECIMAL(9, 6),
    birth_longitude DECIMAL(9, 6),
    birth_place_name VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    sibling_order VARCHAR(50) NOT NULL,
    sibling_count INTEGER NOT NULL,
    gender VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 計算結果キャッシュ
CREATE TABLE calculation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    result_type VARCHAR(50) NOT NULL, -- 'astrology', 'animal', 'numerology', 'sibling'
    result_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 統合プロファイル
CREATE TABLE integrated_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    profile_text TEXT NOT NULL,
    common_traits JSONB,
    visual_elements JSONB, -- 画像URL等
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI生成画像キャッシュ
CREATE TABLE generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_hash VARCHAR(64) UNIQUE NOT NULL, -- promptのSHA256
    image_url TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- インデックス
CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX idx_calculation_results_profile_id ON calculation_results(profile_id);
CREATE INDEX idx_integrated_profiles_profile_id ON integrated_profiles(profile_id);
CREATE INDEX idx_generated_images_prompt_hash ON generated_images(prompt_hash);
```

---

## テスト戦略

### 1. ユニットテスト（pytest）

```python
# tests/test_astrology_engine.py
import pytest
from datetime import datetime
from engines.astrology import AstrologyEngine

def test_zodiac_sign_calculation():
    engine = AstrologyEngine()

    # 蟹座（6/22 - 7/22）のテスト
    chart = engine.calculate_birth_chart(
        birth_date=datetime(1990, 7, 12),
        birth_time="14:30",
        latitude=35.6895,
        longitude=139.6917
    )

    assert chart['planets']['sun']['sign'] == 'Cancer'

def test_aspect_detection():
    engine = AstrologyEngine()
    # ... アスペクト検出のテスト
```

### 2. 統合テスト

```python
# tests/test_api.py
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_generate_profile():
    response = client.post("/api/profile/generate", json={
        "birth_date": "1990-07-12",
        "birth_time": "14:30",
        "birth_place": {"lat": 35.6895, "lon": 139.6917},
        "full_name": "Taro Yamada",
        "sibling_order": "first_born",
        "sibling_count": 2,
        "gender": "male"
    })

    assert response.status_code == 200
    data = response.json()
    assert "profile" in data
    assert len(data["profile"]) > 1000  # プロファイルは1000文字以上
```

---

## デプロイ

### 推奨構成

```
Frontend: Vercel (Next.js)
Backend: Railway.app or Fly.io (FastAPI)
Database: Railway PostgreSQL or Supabase
Cache: Upstash Redis
CDN: Cloudflare (画像配信)
```

### Docker構成

**docker-compose.yml**

```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/fortune_db
      - REDIS_URL=redis://redis:6379
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - db
      - redis

  db:
    image: postgres:15
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
      - POSTGRES_DB=fortune_db
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 環境変数

```bash
# .env
DATABASE_URL=postgresql://user:pass@localhost:5432/fortune_db
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=sk-...
SWISS_EPHEMERIS_PATH=/path/to/ephe
DALL_E_API_KEY=sk-...
```

---

## まとめ

この実装ガイドに従えば、以下が実現できます：

1. **正確な占い計算**: Swiss Ephemerisによる高精度ホロスコープ
2. **包括的な分析**: 西洋占星術・動物占い・数秘術・兄弟構成の統合
3. **自然な文章生成**: GPT-4による一貫性のあるプロファイル
4. **魅力的なビジュアル**: AI画像生成による視覚的要素
5. **スケーラブルなアーキテクチャ**: キャッシュ戦略と非同期処理

**次のステップ**: `fortune-database.yaml`の全データをPostgreSQLに投入し、段階的に各エンジンを実装していきましょう。

