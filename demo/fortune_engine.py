#!/usr/bin/env python3
"""
統合占いエンジン - デモ実装
Shinyu (真由) Fortune Telling Engine

サンプルデータで占いシステムを実演します。
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Any
import math

class FortuneEngine:
    """統合占いエンジン"""

    def __init__(self):
        self.sample_user = {
            "name": "サンプル太郎",
            "birth_date": "1990-03-15",
            "birth_time": "14:30",
            "birth_place": "東京都渋谷区",
            "birth_lat": 35.6617,
            "birth_lon": 139.7040,
            "sibling_position": "長子"
        }

    def calculate_all(self, user_data: Dict = None) -> Dict[str, Any]:
        """全ての占い結果を計算"""
        if user_data is None:
            user_data = self.sample_user

        results = {
            "user": user_data,
            "western_astrology": self.calc_western_astrology(user_data),
            "animal_fortune": self.calc_animal_fortune(user_data),
            "numerology": self.calc_numerology(user_data),
            "sibling_analysis": self.calc_sibling_analysis(user_data),
            "humor_fortunes": self.calc_humor_fortunes(user_data),
            "timeline_analysis": self.calc_timeline_analysis(user_data),
            "integrated_profile": None  # 後で生成
        }

        # 統合プロファイル生成
        results["integrated_profile"] = self.generate_integrated_profile(results)

        return results

    def calc_western_astrology(self, user_data: Dict) -> Dict:
        """西洋占星術計算"""
        birth_date = datetime.strptime(user_data["birth_date"], "%Y-%m-%d")

        # 太陽星座（簡易計算）
        sun_sign = self._get_sun_sign(birth_date.month, birth_date.day)

        # 月星座（簡易計算 - 実際はSwiss Ephemeris使用）
        moon_sign = self._get_moon_sign_approx(birth_date)

        # アセンダント（上昇星座）- 簡易計算
        ascendant = self._get_ascendant_approx(user_data)

        return {
            "sun_sign": sun_sign,
            "moon_sign": moon_sign,
            "ascendant": ascendant,
            "personality": self._get_personality_from_astrology(sun_sign, moon_sign, ascendant)
        }

    def _get_sun_sign(self, month: int, day: int) -> str:
        """太陽星座計算"""
        zodiac_dates = [
            (1, 20, "水瓶座"), (2, 19, "魚座"), (3, 21, "牡羊座"),
            (4, 20, "牡牛座"), (5, 21, "双子座"), (6, 22, "蟹座"),
            (7, 23, "獅子座"), (8, 23, "乙女座"), (9, 23, "天秤座"),
            (10, 24, "蠍座"), (11, 22, "射手座"), (12, 22, "山羊座")
        ]

        for i, (m, d, sign) in enumerate(zodiac_dates):
            next_month = zodiac_dates[(i + 1) % 12][0]
            next_day = zodiac_dates[(i + 1) % 12][1]

            if (month == m and day >= d) or (month == next_month - 1 if next_month > m else month == 12):
                if month == m and day >= d:
                    return sign
                elif month == next_month - 1 and day < next_day:
                    return sign

        return "山羊座"  # デフォルト

    def _get_moon_sign_approx(self, birth_date: datetime) -> str:
        """月星座（簡易計算）"""
        # 実際はSwiss Ephemerisで正確に計算
        # ここでは簡易的に太陽星座から4つずらす
        signs = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座",
                "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"]
        sun_sign = self._get_sun_sign(birth_date.month, birth_date.day)
        sun_index = signs.index(sun_sign) if sun_sign in signs else 0
        moon_index = (sun_index + 4) % 12
        return signs[moon_index]

    def _get_ascendant_approx(self, user_data: Dict) -> str:
        """アセンダント（簡易計算）"""
        # 実際は緯度経度と時刻から正確に計算
        # ここでは簡易的に時刻ベースで推定
        birth_time = user_data.get("birth_time", "12:00")
        hour = int(birth_time.split(":")[0])

        signs = ["牡羊座", "牡牛座", "双子座", "蟹座", "獅子座", "乙女座",
                "天秤座", "蠍座", "射手座", "山羊座", "水瓶座", "魚座"]

        # 2時間ごとに星座が変わる近似
        asc_index = (hour // 2) % 12
        return signs[asc_index]

    def _get_personality_from_astrology(self, sun: str, moon: str, asc: str) -> str:
        """占星術から性格分析"""
        astrology_db = {
            "牡羊座": "情熱的、リーダーシップ、行動力",
            "牡牛座": "安定志向、現実的、忍耐強い",
            "双子座": "好奇心旺盛、コミュニケーション能力、柔軟",
            "蟹座": "感受性豊か、家族思い、保護的",
            "獅子座": "自信満々、創造的、寛大",
            "乙女座": "几帳面、分析的、実用的",
            "天秤座": "調和重視、社交的、美的センス",
            "蠍座": "情熱的、洞察力、神秘的",
            "射手座": "冒険心、楽観的、哲学的",
            "山羊座": "野心的、責任感、忍耐強い",
            "水瓶座": "独創的、人道的、自由",
            "魚座": "共感力、直感的、芸術的"
        }

        return f"""
太陽星座（{sun}）: {astrology_db.get(sun, '不明')}
月星座（{moon}）: {astrology_db.get(moon, '不明')}
アセンダント（{asc}）: {astrology_db.get(asc, '不明')}

あなたの本質は{sun}の{astrology_db.get(sun, '').split('、')[0]}であり、
内面では{moon}の{astrology_db.get(moon, '').split('、')[0]}な一面を持ちます。
周囲からは{asc}の{astrology_db.get(asc, '').split('、')[0]}として見られるでしょう。
"""

    def calc_animal_fortune(self, user_data: Dict) -> Dict:
        """動物占い計算"""
        birth_date = datetime.strptime(user_data["birth_date"], "%Y-%m-%d")

        # 簡易計算（実際は生年月日の複雑な計算）
        animal_index = (birth_date.year + birth_date.month + birth_date.day) % 12
        color_index = (birth_date.year + birth_date.month * 3 + birth_date.day * 7) % 5

        animals = ["狼", "猿", "虎", "子守熊", "黒豹", "ライオン",
                   "チータ", "ペガサス", "象", "たぬき", "こじか", "ひつじ"]
        colors = ["ゴールド", "シルバー", "ブラウン", "ブルー", "グリーン"]

        animal = animals[animal_index]
        color = colors[color_index]

        animal_personalities = {
            "狼": "一匹狼タイプ。独立心が強く、自分のペースを大切にします。",
            "猿": "明るく社交的。ユーモアがあり、人を楽しませる才能があります。",
            "虎": "リーダーシップがあり、正義感が強い。行動力抜群です。",
            "子守熊": "優しく穏やか。人の面倒を見るのが得意です。",
            "黒豹": "クールで神秘的。洞察力に優れています。",
            "ライオン": "堂々としていて自信家。カリスマ性があります。",
            "チータ": "スピード重視。フットワークが軽く、行動が早い。",
            "ペガサス": "自由奔放で創造的。型にはまらない生き方を好みます。",
            "象": "どっしりとした安定感。信頼できる存在です。",
            "たぬき": "愛嬌があり、人懐っこい。協調性が高いです。",
            "こじか": "繊細で優しい。芸術的センスがあります。",
            "ひつじ": "温和で協調的。周りに安心感を与えます。"
        }

        return {
            "animal": animal,
            "color": color,
            "full_type": f"{color}の{animal}",
            "personality": animal_personalities.get(animal, "謎の動物")
        }

    def calc_numerology(self, user_data: Dict) -> Dict:
        """数秘術計算"""
        birth_date = datetime.strptime(user_data["birth_date"], "%Y-%m-%d")

        # 運命数（Life Path Number）
        life_path = self._calc_life_path_number(birth_date)

        # 誕生日数
        birth_day_number = birth_date.day if birth_date.day <= 9 else self._reduce_to_single_digit(birth_date.day)

        numerology_meanings = {
            1: "リーダー、独立心、創造性",
            2: "協調性、感受性、バランス",
            3: "表現力、社交性、楽観性",
            4: "安定性、実用性、忍耐力",
            5: "自由、冒険心、変化",
            6: "責任感、愛情、調和",
            7: "知性、分析力、精神性",
            8: "野心、パワー、成功",
            9: "博愛、完成、理想主義",
            11: "直感、インスピレーション、啓発（マスターナンバー）",
            22: "実現力、大きなビジョン、実践（マスターナンバー）",
            33: "無条件の愛、教師、癒し（マスターナンバー）"
        }

        return {
            "life_path_number": life_path,
            "birth_day_number": birth_day_number,
            "meaning": numerology_meanings.get(life_path, "不明")
        }

    def _calc_life_path_number(self, birth_date: datetime) -> int:
        """運命数計算"""
        # 年月日を全て足して一桁になるまで還元
        total = birth_date.year + birth_date.month + birth_date.day

        while total > 9 and total not in [11, 22, 33]:
            total = self._reduce_to_single_digit(total)

        return total

    def _reduce_to_single_digit(self, num: int) -> int:
        """数字を一桁に還元"""
        while num > 9:
            num = sum(int(d) for d in str(num))
        return num

    def calc_sibling_analysis(self, user_data: Dict) -> Dict:
        """兄弟構成診断"""
        position = user_data.get("sibling_position", "一人っ子")

        sibling_db = {
            "長子": {
                "personality": "責任感が強く、リーダーシップを発揮します。完璧主義で、周りから頼られる存在です。",
                "strengths": "責任感、リーダーシップ、真面目、信頼される",
                "challenges": "完璧主義、プレッシャーに弱い、頑固",
                "work_style": "マネージャー、プロジェクトリーダー向き"
            },
            "中間子": {
                "personality": "協調性が高く、バランス感覚に優れています。交渉力があり、人間関係の調整が得意です。",
                "strengths": "協調性、柔軟性、交渉力、バランス感覚",
                "challenges": "自己主張が弱い、目立ちたがらない",
                "work_style": "チームプレーヤー、調整役向き"
            },
            "末っ子": {
                "personality": "自由奔放で創造的。人懐っこく、周りから可愛がられます。チャレンジ精神旺盛です。",
                "strengths": "社交性、創造性、チャレンジ精神、人懐っこい",
                "challenges": "甘え上手すぎる、責任感が薄い",
                "work_style": "クリエイティブ職、営業向き"
            },
            "一人っ子": {
                "personality": "独立心が強く、自己完結型。集中力があり、一人でも物事を成し遂げられます。",
                "strengths": "独立心、集中力、成熟度、自己管理能力",
                "challenges": "協調性に欠ける、わがまま",
                "work_style": "スペシャリスト、研究職向き"
            }
        }

        return sibling_db.get(position, sibling_db["一人っ子"])

    def calc_humor_fortunes(self, user_data: Dict) -> Dict:
        """ユーモア系占い"""
        birth_date = datetime.strptime(user_data["birth_date"], "%Y-%m-%d")

        # 野菜占い
        veggie_index = (birth_date.year * 3 + birth_date.month * 7 + birth_date.day * 11) % 12
        veggies = ["トマト", "キャベツ", "にんじん", "ブロッコリー", "なす", "ピーマン",
                   "かぼちゃ", "きゅうり", "だいこん", "ほうれん草", "たまねぎ", "じゃがいも"]

        veggie_personalities = {
            "トマト": "情熱的で真っ赤な心の持ち主。エネルギッシュ！",
            "キャベツ": "何層にも重なる深い内面。包容力があります。",
            "にんじん": "視野が広く、将来を見通す力があります。",
            "ブロッコリー": "細やかな気配りができる、繊細な性格。",
            "なす": "つやつやと輝く魅力。周りを惹きつけます。",
            "ピーマン": "苦味も甘味も兼ね備えた、多面的な性格。",
            "かぼちゃ": "ほっこり温かい、癒し系の存在。",
            "きゅうり": "クールでさっぱり。爽やかな印象。",
            "だいこん": "根が深く、芯が強い。辛味も魅力。",
            "ほうれん草": "栄養満点！周りに元気を与える存在。",
            "たまねぎ": "涙を誘うほど深い愛情の持ち主。",
            "じゃがいも": "どんな料理にも合う、万能タイプ。"
        }

        # キノコ占い
        mushroom_index = (birth_date.day * 13) % 6
        mushrooms = ["椎茸", "舞茸", "えのき", "しめじ", "エリンギ", "マツタケ"]

        mushroom_personalities = {
            "椎茸": "ザ・定番。安定感と信頼性があります。和洋中何でもこなせる器用さ。",
            "舞茸": "華やかで存在感抜群。一度食べたら忘れられない個性派。",
            "えのき": "細くてもしなやか。どんな環境でも適応できる柔軟性。",
            "しめじ": "「香り松茸、味しめじ」の通り、実力派。控えめだけど実は凄い。",
            "エリンギ": "コリコリとした独特の食感。他にはない個性の持ち主。",
            "マツタケ": "高級志向。プライドが高く、特別な存在でありたい。"
        }

        # 天気占い
        weather_index = (birth_date.month + birth_date.day) % 5
        weathers = ["晴れ", "曇り", "雨", "雪", "虹"]

        weather_personalities = {
            "晴れ": "明るくポジティブ。周りを照らす太陽のような存在。",
            "曇り": "少し憂鬱だけど、優しい光を放つ。繊細で思慮深い。",
            "雨": "潤いを与える、癒しの存在。感情豊かで共感力が高い。",
            "雪": "清らかで美しい。ただし、近づきがたいクールな一面も。",
            "虹": "希望の象徴。七色の才能を持つマルチな才能の持ち主。"
        }

        return {
            "vegetable": {
                "type": veggies[veggie_index],
                "personality": veggie_personalities[veggies[veggie_index]]
            },
            "mushroom": {
                "type": mushrooms[mushroom_index],
                "personality": mushroom_personalities[mushrooms[mushroom_index]]
            },
            "weather": {
                "type": weathers[weather_index],
                "personality": weather_personalities[weathers[weather_index]]
            }
        }

    def calc_timeline_analysis(self, user_data: Dict) -> Dict:
        """時系列分析（過去10年・現在・未来10年）"""
        birth_date = datetime.strptime(user_data["birth_date"], "%Y-%m-%d")
        current_year = datetime.now().year
        current_age = current_year - birth_date.year

        # 9年サイクル（数秘術ベース）
        current_year_cycle = (current_year - birth_date.year) % 9 + 1

        cycle_meanings = {
            1: "新しい始まり。種まきの年。新プロジェクト開始に最適。",
            2: "協力と調和の年。人間関係が重要に。",
            3: "創造性と表現の年。自己表現を楽しんで。",
            4: "安定と基盤作りの年。地道な努力が実る。",
            5: "変化と自由の年。冒険に出るチャンス。",
            6: "責任と愛の年。家族や身近な人との絆が深まる。",
            7: "内省と学びの年。スピリチュアルな成長の時。",
            8: "成功と達成の年。努力が形になる。",
            9: "完成と手放しの年。次のサイクルに向けた準備。"
        }

        # 過去10年の分析
        past_10_years = []
        for i in range(10, 0, -1):
            year = current_year - i
            cycle = ((year - birth_date.year) % 9) + 1
            past_10_years.append({
                "year": year,
                "age": current_age - i,
                "cycle": cycle,
                "theme": cycle_meanings[cycle]
            })

        # 未来10年の予測
        future_10_years = []
        for i in range(1, 11):
            year = current_year + i
            cycle = ((year - birth_date.year) % 9) + 1
            future_10_years.append({
                "year": year,
                "age": current_age + i,
                "cycle": cycle,
                "theme": cycle_meanings[cycle]
            })

        return {
            "current_year": current_year,
            "current_age": current_age,
            "current_cycle": current_year_cycle,
            "current_theme": cycle_meanings[current_year_cycle],
            "past_10_years": past_10_years,
            "future_10_years": future_10_years
        }

    def generate_integrated_profile(self, results: Dict) -> str:
        """統合プロファイル生成"""
        user = results["user"]
        astro = results["western_astrology"]
        animal = results["animal_fortune"]
        num = results["numerology"]
        sibling = results["sibling_analysis"]
        humor = results["humor_fortunes"]
        timeline = results["timeline_analysis"]

        profile = f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🔮 統合占いプロファイル - {user['name']} 様
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 基本情報
  誕生日: {user['birth_date']} {user.get('birth_time', '')}
  生まれた場所: {user['birth_place']}
  兄弟構成: {user['sibling_position']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌟 あなたの本質（統合診断）

あなたは【{astro['sun_sign']}】の本質を持ち、
【{animal['full_type']}】の特性を併せ持つ、
運命数【{num['life_path_number']}】の人生を歩む方です。

■ 性格の核心部分
{astro['personality']}

■ 動物占いから見たあなた
{animal['personality']}

■ 数秘術が示す人生のテーマ
運命数 {num['life_path_number']}: {num['meaning']}

■ 兄弟構成から見た育ちの影響
{sibling['personality']}

強み: {sibling['strengths']}
向いている仕事: {sibling['work_style']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 あなたを表すユニークな占い

🥕 野菜占い: あなたは【{humor['vegetable']['type']}】
   {humor['vegetable']['personality']}

🍄 キノコ占い: あなたは【{humor['mushroom']['type']}】
   {humor['mushroom']['personality']}

🌤️ 天気占い: あなたは【{humor['weather']['type']}】
   {humor['weather']['personality']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 時系列分析 - あなたの人生の流れ

■ 現在（{timeline['current_year']}年、{timeline['current_age']}歳）
  9年サイクル: 第{timeline['current_cycle']}年
  テーマ: {timeline['current_theme']}

■ 過去10年を振り返ると...

"""

        # 過去10年のハイライト
        significant_past = [y for y in timeline['past_10_years'] if y['cycle'] in [1, 5, 9]]
        for year_data in significant_past[:3]:
            profile += f"  {year_data['year']}年（{year_data['age']}歳）: {year_data['theme']}\n"

        profile += f"""
■ 未来10年の展望

"""

        # 未来10年のハイライト
        significant_future = [y for y in timeline['future_10_years'] if y['cycle'] in [1, 5, 9]]
        for year_data in significant_future[:3]:
            profile += f"  {year_data['year']}年（{year_data['age']}歳）: {year_data['theme']}\n"

        profile += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 総合アドバイス

あなたは生まれ持った【{astro['sun_sign']}】の情熱と、
育ちによって培われた【{user['sibling_position']}】の特性を
バランスよく持ち合わせています。

現在は9年サイクルの第{timeline['current_cycle']}年。
{timeline['current_theme']}

この時期を最大限に活かすために、
{astro['sun_sign']}の{astro['sun_sign']}らしさを発揮しつつ、
{animal['animal']}の{animal['personality'].split('。')[0]}を意識すると良いでしょう。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 あなたへのメッセージ

あなたは唯一無二の存在です。
西洋占星術、動物占い、数秘術、兄弟構成診断...
すべての占いが示すのは、あなたの多面的な魅力。

矛盾するように見える特性も、
それがあなたという人間の豊かさを物語っています。

【{humor['vegetable']['type']}】のように、
【{humor['mushroom']['type']}】のように、
そして【{humor['weather']['type']}】のように、
あなたらしく、自分の人生を楽しんでください！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Powered by Shinyu (真由) - 統合占いシステム
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

        return profile


def main():
    """メイン実行"""
    print("=" * 60)
    print("  🔮 Shinyu (真由) - 統合占いシステム デモ")
    print("=" * 60)
    print()

    engine = FortuneEngine()

    print("📝 サンプルユーザーデータ:")
    print(json.dumps(engine.sample_user, indent=2, ensure_ascii=False))
    print()
    print("⏳ 占い結果を計算中...")
    print()

    # 全ての占い結果を計算
    results = engine.calculate_all()

    # 統合プロファイルを表示
    print(results["integrated_profile"])

    # 詳細結果をJSONで保存
    output_file = "/Users/shunsuke/Dev/miyabi-private/shinyu-ai/demo/fortune_result.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        # integrated_profile以外をJSON出力（見やすさのため）
        json_results = {k: v for k, v in results.items() if k != "integrated_profile"}
        json.dump(json_results, f, indent=2, ensure_ascii=False)

    print(f"\n✅ 詳細結果を {output_file} に保存しました")
    print()
    print("=" * 60)
    print("  🎉 デモ実行完了！")
    print("=" * 60)


if __name__ == "__main__":
    main()
