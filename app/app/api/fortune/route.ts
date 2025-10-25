import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// TypeScript版の計算関数
function calculateSunSign(birthDate: string): string {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) { return '牡羊座'; }
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) { return '牡牛座'; }
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) { return '双子座'; }
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) { return '蟹座'; }
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) { return '獅子座'; }
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) { return '乙女座'; }
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) { return '天秤座'; }
  if ((month === 10 && day >= 24) || (month === 11 && day <= 21)) { return '蠍座'; }
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) { return '射手座'; }
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) { return '山羊座'; }
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) { return '水瓶座'; }
  return '魚座';
}

function calculateLifePath(birthDate: string): number {
  const date = new Date(birthDate);
  let sum = date.getFullYear() + (date.getMonth() + 1) + date.getDate();

  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = sum.toString().split('').reduce((acc, digit) => acc + parseInt(digit), 0);
  }

  return sum;
}

function calculateAnimal(birthDate: string): string {
  const animals = ['狼', '猿', '虎', '子守熊', '黒豹', 'ライオン', 'チータ', 'ペガサス', '象', 'たぬき', 'こじか', 'ひつじ'];
  const date = new Date(birthDate);
  const index = (date.getFullYear() + date.getMonth() + date.getDate()) % 12;
  return animals[index];
}

function calculateMayanKin(birthDate: string) {
  const date = new Date(birthDate);
  const baseDate = new Date(2024, 0, 1);
  const baseKin = 129;
  const deltaDs = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

  // 負の値も正しく処理
  let kin = ((baseKin + deltaDs - 1) % 260) + 1;
  if (kin <= 0) { kin += 260; }

  const seals = ['赤い竜', '白い風', '青い夜', '黄色い種', '赤い蛇', '白い世界の橋渡し', '青い手', '黄色い星',
    '赤い月', '白い犬', '青い猿', '黄色い人', '赤い空歩く人', '白い魔法使い', '青い鷲', '黄色い戦士',
    '赤い地球', '白い鏡', '青い嵐', '黄色い太陽'];

  let sealIndex = (kin - 1) % 20;
  if (sealIndex < 0) { sealIndex += 20; }
  const seal = seals[sealIndex];

  let tone = ((kin - 1) % 13) + 1;
  if (tone <= 0) { tone += 13; }

  return { kin, seal, tone };
}

function calculateHoroscope(birthDate: string) {
  const date = new Date(birthDate);
  const zodiacSigns = ['牡羊座', '牡牛座', '双子座', '蟹座', '獅子座', '乙女座', '天秤座', '蠍座', '射手座', '山羊座', '水瓶座', '魚座'];

  return {
    '太陽': calculateSunSign(birthDate),
    '月': zodiacSigns[date.getDate() % 12],
    '水星': zodiacSigns[(date.getMonth() + 1) % 12],
    '金星': zodiacSigns[(date.getMonth() + 2) % 12],
    '火星': zodiacSigns[(date.getMonth() + 3) % 12],
    '木星': zodiacSigns[date.getFullYear() % 12],
    '土星': zodiacSigns[(date.getFullYear() - 1) % 12],
    '天王星': zodiacSigns[(date.getFullYear() - 2) % 12],
    '海王星': zodiacSigns[(date.getFullYear() - 3) % 12],
    '冥王星': zodiacSigns[(date.getFullYear() - 4) % 12],
  };
}

function calculateTimeline(birthDate: string, currentYear = 2025) {
  const date = new Date(birthDate);
  const birthYear = date.getFullYear();

  const themes: { [key: number]: string } = {
    1: '新しい始まり・独立の年',
    2: '協力関係・パートナーシップの年',
    3: '創造性・表現の年',
    4: '基盤構築・安定の年',
    5: '変化・自由の年',
    6: '責任・愛情の年',
    7: '内省・精神性の年',
    8: '達成・成功の年',
    9: '完成・手放しの年',
  };

  const past = [];
  for (let i = 10; i > 0; i--) {
    const year = currentYear - i;
    const age = year - birthYear;
    const lifePathYear = (year % 9) || 9;
    past.push({
      year,
      age,
      theme: themes[lifePathYear],
      description: `${age}歳の時、${themes[lifePathYear]}を経験しました。`,
    });
  }

  const age = currentYear - birthYear;
  const lifePathYear = (currentYear % 9) || 9;
  const present = {
    year: currentYear,
    age,
    theme: themes[lifePathYear],
    description: `現在${age}歳。${themes[lifePathYear]}の時期です。`,
  };

  const future = [];
  for (let i = 1; i <= 10; i++) {
    const year = currentYear + i;
    const age = year - birthYear;
    const lifePathYear = (year % 9) || 9;
    future.push({
      year,
      age,
      theme: themes[lifePathYear],
      description: `${age}歳では${themes[lifePathYear]}が訪れます。`,
    });
  }

  return { past, present, future };
}

// Animal to artistic image prompt mapping
function getAnimalImagePrompt(animal: string, sunSign: string): string {
  const animalPrompts: { [key: string]: string } = {
    '狼': 'A mystical silver wolf standing on a cosmic cliff under starlight, ethereal aurora, spiritual aura, majestic pose, cinematic lighting, deep blue and purple tones, fantasy art style, 4K quality, magical atmosphere',
    '猿': 'A wise golden monkey meditating in a celestial temple, ancient wisdom, glowing runes, mystical energy, warm amber lighting, fantasy landscape, high detail, spiritual essence, divine presence',
    '虎': 'A powerful cosmic tiger with glowing stripes, nebula patterns, star-filled eyes, majestic stance, dynamic pose, celestial background, vibrant orange and deep blue, mythical creature, epic composition',
    '子守熊': 'A gentle cosmic koala surrounded by floating cherry blossoms, soft pastel colors, dreamy atmosphere, magical forest, healing energy, serene expression, whimsical art style, tender mood',
    '黒豹': 'An elegant black panther with galaxy fur patterns, mysterious aura, moonlight illumination, sleek silhouette, mystical night sky, deep purples and blacks, powerful presence, high contrast lighting',
    'ライオン': 'A regal cosmic lion with a mane of golden light, royal crown, celestial throne, radiating power, warm golden tones, majestic composition, divine authority, epic fantasy art',
    'チータ': 'A swift cosmic cheetah racing through stardust trails, motion blur, dynamic energy, speed lines, vibrant yellows and blues, athletic grace, futuristic atmosphere, high-speed action',
    'ペガサス': 'A magnificent Pegasus with wings of pure light, soaring through cosmic clouds, ethereal beauty, pearl white and gold, divine radiance, mythological grandeur, heavenly atmosphere, breathtaking composition',
    '象': 'A wise cosmic elephant with intricate mandala patterns, ancient knowledge, glowing tusks, spiritual symbols, earth tones with cosmic accents, grounded yet mystical, powerful and gentle presence',
    'たぬき': 'A playful cosmic tanuki with a mischievous smile, magical leaf transformation, whimsical energy, warm browns and golds, enchanted forest, cute yet mysterious, folklore charm, joyful atmosphere',
    'こじか': 'A delicate cosmic deer fawn with glowing antlers, innocent eyes, soft pink and white tones, magical meadow, gentle lighting, pure and tender energy, fairy tale atmosphere, heartwarming presence',
    'ひつじ': 'A fluffy cosmic sheep with cloud-like wool, dreamy pastel colors, floating in soft sky, peaceful aura, gentle expression, cotton candy atmosphere, comforting presence, serene and calm mood',
  };

  const basePrompt = animalPrompts[animal] || `A mystical ${animal} in a cosmic setting, ethereal atmosphere, magical aura, high quality, 4K`;

  return `${basePrompt}, ${sunSign} constellation in background, astrological symbols, destiny theme, spiritual artwork`;
}

// BytePlus SeeDream image generation
async function generateAnimalImage(animal: string, sunSign: string): Promise<string | null> {
  try {
    const apiKey = process.env.ARK_API_KEY;
    if (!apiKey || apiKey === 'your_ark_api_key_here') {
      console.warn('ARK_API_KEY not configured, skipping image generation');
      return null;
    }

    const prompt = getAnimalImagePrompt(animal, sunSign);

    const response = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'seedream-4-0-250828',
        prompt,
        sequential_image_generation: 'disabled',
        response_format: 'url',
        size: '2K',
        stream: false,
        watermark: true,
      }),
    });

    if (!response.ok) {
      console.error('Image generation failed:', response.statusText);
      return null;
    }

    const data = await response.json();
    return data.data?.[0]?.url || null;
  } catch (error) {
    console.error('Image generation error:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, birthDate, birthTime, birthPlace, siblingPosition } = await request.json();

    // 基本データ計算
    const sunSign = calculateSunSign(birthDate);
    const lifePathNumber = calculateLifePath(birthDate);
    const animal = calculateAnimal(birthDate);
    const mayan = calculateMayanKin(birthDate);
    const horoscope = calculateHoroscope(birthDate);
    const timeline = calculateTimeline(birthDate);

    // 並列実行: OpenAI洞察生成 + BytePlus画像生成
    const [insightResult, imageUrl] = await Promise.all([
      openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `あなたは熟練の占い師です。西洋占星術、マヤ暦、数秘術、動物占い、兄弟順位心理学を統合した深い洞察を提供します。
個人の名前、生年月日、出生時刻、出生地、兄弟構成から、その人の本質、才能、人生の目的、課題を読み解きます。
洞察は具体的で、温かく、希望に満ちたものにしてください。`,
          },
          {
            role: 'user',
            content: `以下のデータから、深い洞察を生成してください：

【基本情報】
- 名前: ${name}
- 生年月日: ${birthDate}
- 出生時刻: ${birthTime || '不明'}
- 出生地: ${birthPlace}
- 兄弟構成: ${siblingPosition}

【占術結果】
- 太陽星座: ${sunSign}
- 運命数: ${lifePathNumber}
- 動物占い: ${animal}
- マヤ暦 Kin番号: ${mayan.kin}
- 太陽の紋章: ${mayan.seal}
- 銀河の音: ${mayan.tone}

【ホロスコープ】
${Object.entries(horoscope).map(([planet, sign]) => `- ${planet}: ${sign}`).join('\n')}

【現在の状況】
- 年齢: ${timeline.present.age}歳
- テーマ: ${timeline.present.theme}

上記全ての要素を統合し、${name}さんの本質、才能、人生の使命、今後の展望について、
800-1200文字程度で深く温かい洞察を書いてください。`,
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
      generateAnimalImage(animal, sunSign),
    ]);

    const insight = insightResult.choices[0]?.message?.content || '洞察の生成に失敗しました。';

    // 結果を返す
    return NextResponse.json({
      name,
      sunSign,
      lifePathNumber,
      animal,
      siblingPosition,
      mayan,
      horoscope,
      timeline,
      insight,
      imageUrl: imageUrl || undefined, // 画像URL（生成失敗時はundefined）
      imagePrompt: getAnimalImagePrompt(animal, sunSign), // デバッグ用にプロンプトも返す
    });
  } catch (error: any) {
    console.error('Fortune calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate fortune', details: error.message },
      { status: 500 }
    );
  }
}
