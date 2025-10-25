'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

// Apple-style easing
const easeOut = [0.16, 1, 0.3, 1];

// Real calculation functions
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

function calculateLifePathNumber(birthDate: string): number {
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

export default function Home() {
  const [step, setStep] = useState<'landing' | 'form' | 'loading' | 'result'>('landing');
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    siblingPosition: '長子',
  });
  const [fortuneResult, setFortuneResult] = useState<any>(null);
  const [loadingPhase, setLoadingPhase] = useState<'calculating' | 'generating-insight' | 'creating-image' | 'finalizing'>('calculating');
  const [loadingProgress, setLoadingProgress] = useState(0);

  const handleStartFortune = () => {
    setStep('form');
  };

  const handleShare = async () => {
    if (!fortuneResult) { return; }

    const shareText = `私の霊獣は${fortuneResult.animal}でした！\n${fortuneResult.sunSign} · 運命数${fortuneResult.lifePathNumber}\n\n#なおちゃん #AI占い`;
    const shareUrl = window.location.href;

    // Native Web Share API (モバイル対応)
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'なおちゃん - AI占い結果',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Fallback: Twitter share
      const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
      window.open(twitterUrl, '_blank', 'width=550,height=420');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('loading');
    setLoadingProgress(0);
    setLoadingPhase('calculating');

    try {
      // Phase 1: Calculating basic data (0-25%)
      setLoadingProgress(10);
      await new Promise(resolve => setTimeout(resolve, 500));
      setLoadingProgress(25);

      // Phase 2: Generating AI insight (25-60%)
      setLoadingPhase('generating-insight');
      setLoadingProgress(30);

      const response = await fetch('/api/fortune', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setLoadingProgress(60);

      // Phase 3: Creating image (60-90%)
      setLoadingPhase('creating-image');
      const result = await response.json();
      setLoadingProgress(90);

      // Phase 4: Finalizing (90-100%)
      setLoadingPhase('finalizing');
      await new Promise(resolve => setTimeout(resolve, 300));
      setLoadingProgress(100);

      setFortuneResult(result);
      setStep('result');
    } catch (error) {
      console.error('Fortune calculation failed:', error);

      // Graceful fallback
      setLoadingPhase('finalizing');
      setLoadingProgress(100);

      const sunSign = calculateSunSign(formData.birthDate);
      const lifePathNumber = calculateLifePathNumber(formData.birthDate);
      const animal = calculateAnimal(formData.birthDate);

      setFortuneResult({
        name: formData.name,
        sunSign,
        animal,
        lifePathNumber,
        siblingPosition: formData.siblingPosition,
        insight: `あなたは${sunSign}の本質を持ち、${animal}の特性を併せ持つ、運命数${lifePathNumber}の人生を歩む方です。`,
      });
      setStep('result');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Landing Page */}
      {step === 'landing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="flex flex-col items-center justify-center min-h-screen px-6 py-24"
        >
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4, ease: easeOut }}
            className="font-display text-display text-white mb-4"
          >
            なおちゃん
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4, ease: easeOut }}
            className="text-body text-white/60 mb-2"
          >
            Nao-chan
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4, ease: easeOut }}
            className="text-title-2 text-white/80 mb-24 text-center max-w-md"
          >
            The only fortune you&apos;ll ever need.
          </motion.p>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4, ease: easeOut }}
            whileHover={{ scale: 1.01, opacity: 0.9 }}
            whileTap={{ scale: 0.99 }}
            onClick={handleStartFortune}
            className="bg-accent text-black font-semibold text-body px-8 py-3 rounded-xl transition-all duration-200"
          >
            占いを始める
          </motion.button>
        </motion.div>
      )}

      {/* Form Page */}
      {step === 'form' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="flex flex-col items-center justify-center min-h-screen px-6 py-24"
        >
          <div className="w-full max-w-md bg-surface border border-white/5 rounded-2xl p-12">
            <h2 className="text-title-1 text-white mb-8">
              あなたについて教えてください
            </h2>

            <form onSubmit={handleSubmit} className="space-y-md" aria-label="占い情報入力フォーム">
              <div>
                <label htmlFor="name-input" className="block text-caption text-white/60 mb-2">
                  お名前
                </label>
                <input
                  id="name-input"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                  placeholder="太郎"
                  aria-required="true"
                  aria-describedby="name-help"
                />
                <span id="name-help" className="sr-only">お名前を入力してください</span>
              </div>

              <div>
                <label htmlFor="birthdate-input" className="block text-caption text-white/60 mb-2">
                  誕生日
                </label>
                <input
                  id="birthdate-input"
                  type="date"
                  required
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                  aria-required="true"
                  aria-describedby="birthdate-help"
                />
                <span id="birthdate-help" className="sr-only">誕生日を選択してください</span>
              </div>

              <div>
                <label htmlFor="birthtime-input" className="block text-caption text-white/60 mb-2">
                  誕生時刻（任意）
                </label>
                <input
                  id="birthtime-input"
                  type="time"
                  value={formData.birthTime}
                  onChange={(e) => setFormData({ ...formData, birthTime: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                  aria-required="false"
                  aria-describedby="birthtime-help"
                />
                <span id="birthtime-help" className="sr-only">誕生時刻を選択してください（任意）</span>
              </div>

              <div>
                <label htmlFor="birthplace-input" className="block text-caption text-white/60 mb-2">
                  生まれた場所
                </label>
                <input
                  id="birthplace-input"
                  type="text"
                  required
                  value={formData.birthPlace}
                  onChange={(e) => setFormData({ ...formData, birthPlace: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                  placeholder="東京都"
                  aria-required="true"
                  aria-describedby="birthplace-help"
                />
                <span id="birthplace-help" className="sr-only">生まれた場所を入力してください</span>
              </div>

              <div>
                <label htmlFor="sibling-select" className="block text-caption text-white/60 mb-2">
                  兄弟構成
                </label>
                <select
                  id="sibling-select"
                  value={formData.siblingPosition}
                  onChange={(e) => setFormData({ ...formData, siblingPosition: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all duration-200"
                  aria-describedby="sibling-help"
                >
                  <option value="長子">長子</option>
                  <option value="中間子">中間子</option>
                  <option value="末っ子">末っ子</option>
                  <option value="一人っ子">一人っ子</option>
                </select>
                <span id="sibling-help" className="sr-only">兄弟構成を選択してください</span>
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: 1.01, opacity: 0.9 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-accent text-black font-semibold text-body py-3 rounded-xl transition-all duration-200 mt-8"
              >
                占い結果を見る
              </motion.button>
            </form>

            <button
              onClick={() => setStep('landing')}
              className="mt-6 w-full text-white/40 hover:text-white/60 text-caption transition-colors"
            >
              戻る
            </button>
          </div>
        </motion.div>
      )}

      {/* Loading Page */}
      {step === 'loading' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center min-h-screen px-6 text-white"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          {/* Spinner */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mb-8 rounded-full border-2 border-white/10 border-t-accent"
          />

          {/* Phase-based messages */}
          <motion.h2
            key={loadingPhase}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="text-title-1 mb-4"
          >
            {loadingPhase === 'calculating' && '基本データを計算中...'}
            {loadingPhase === 'generating-insight' && 'AI洞察を生成中...'}
            {loadingPhase === 'creating-image' && 'あなた専用の霊獣アートを作成中...'}
            {loadingPhase === 'finalizing' && '最終調整中...'}
          </motion.h2>

          {/* Detailed phase description */}
          <motion.p
            key={`${loadingPhase}-desc`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-body text-white/60 text-center max-w-md mb-8"
          >
            {loadingPhase === 'calculating' && '星座、数秘術、動物占い、マヤ暦を統合しています'}
            {loadingPhase === 'generating-insight' && 'GPT-4があなた専用の深い洞察を紡いでいます'}
            {loadingPhase === 'creating-image' && 'SeeDreamがあなたの霊獣を芸術作品として描いています'}
            {loadingPhase === 'finalizing' && 'すべての要素を統合して完璧な結果を準備しています'}
          </motion.p>

          {/* Progress Bar */}
          <div className="w-full max-w-md mb-4">
            <div className="h-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-accent rounded-full"
              />
            </div>
          </div>

          {/* Progress percentage */}
          <motion.p
            key={loadingProgress}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-caption text-white/40"
          >
            {loadingProgress}%
          </motion.p>
        </motion.div>
      )}

      {/* Result Page */}
      {step === 'result' && fortuneResult && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: easeOut }}
          className="min-h-screen px-6 py-24"
        >
          <div className="max-w-3xl mx-auto">
            {/* Hero - Big Reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.6, ease: easeOut }}
              className="text-center mb-24"
            >
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4, ease: easeOut }}
                className="text-caption text-white/40 mb-4 uppercase tracking-wider"
              >
                {fortuneResult.name}
              </motion.p>

              {/* Generated Animal Image */}
              {fortuneResult.imageUrl && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5, duration: 0.8, ease: easeOut }}
                  className="mb-8 flex justify-center"
                >
                  <div className="relative rounded-3xl overflow-hidden border-2 border-accent/20 shadow-2xl max-w-md">
                    <img
                      src={fortuneResult.imageUrl}
                      alt={`Your spirit animal: ${fortuneResult.animal}`}
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
                  </div>
                </motion.div>
              )}

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6, ease: easeOut }}
                className="font-display text-[64px] leading-tight text-white mb-6"
              >
                You are a<br />
                <span className="text-accent">{fortuneResult.animal}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.4, ease: easeOut }}
                className="text-title-2 text-white/60"
              >
                {fortuneResult.sunSign} · 運命数 {fortuneResult.lifePathNumber}
              </motion.p>
            </motion.div>

            {/* Insight Story */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0, duration: 0.6, ease: easeOut }}
              className="bg-surface border border-white/5 rounded-2xl p-12 mb-12"
            >
              <p className="text-body text-white/80 leading-relaxed whitespace-pre-line">
                {fortuneResult.insight}
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2, duration: 0.6, ease: easeOut }}
              className="grid grid-cols-3 gap-4 mb-12"
            >
              <div className="bg-surface-elevated rounded-xl p-6 text-center">
                <p className="text-caption text-white/40 mb-2">星座</p>
                <p className="text-title-2 text-white">{fortuneResult.sunSign}</p>
              </div>

              <div className="bg-surface-elevated rounded-xl p-6 text-center">
                <p className="text-caption text-white/40 mb-2">運命数</p>
                <p className="text-title-2 text-white">{fortuneResult.lifePathNumber}</p>
              </div>

              <div className="bg-surface-elevated rounded-xl p-6 text-center">
                <p className="text-caption text-white/40 mb-2">兄弟</p>
                <p className="text-title-2 text-white">{fortuneResult.siblingPosition}</p>
              </div>
            </motion.div>

            {/* Mayan Calendar Section */}
            {fortuneResult.mayan && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4, duration: 0.6, ease: easeOut }}
                className="bg-surface border border-white/5 rounded-2xl p-12 mb-12"
              >
                <h2 className="text-title-1 text-white mb-8">マヤ暦</h2>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-caption text-white/40 mb-2">Kin番号</p>
                    <p className="text-[48px] font-display text-accent">{fortuneResult.mayan.kin}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-white/40 mb-2">太陽の紋章</p>
                    <p className="text-title-2 text-white">{fortuneResult.mayan.seal}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-caption text-white/40 mb-2">銀河の音</p>
                    <p className="text-[48px] font-display text-accent">{fortuneResult.mayan.tone}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Horoscope Details Table */}
            {fortuneResult.horoscope && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.6, duration: 0.6, ease: easeOut }}
                className="bg-surface border border-white/5 rounded-2xl p-12 mb-12"
              >
                <h2 className="text-title-1 text-white mb-8">ホロスコープ詳細</h2>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(fortuneResult.horoscope).map(([planet, sign]: [string, unknown]) => (
                    <div key={planet} className="flex justify-between items-center bg-surface-elevated rounded-xl p-4">
                      <span className="text-body text-white/60">{planet}</span>
                      <span className="text-body text-white font-semibold">{String(sign)}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Timeline Section */}
            {fortuneResult.timeline && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8, duration: 0.6, ease: easeOut }}
                className="bg-surface border border-white/5 rounded-2xl p-12 mb-12"
              >
                <h2 className="text-title-1 text-white mb-8">あなたの人生タイムライン</h2>

                {/* Past 10 Years */}
                <div className="mb-8">
                  <h3 className="text-title-2 text-white/80 mb-4">過去10年</h3>
                  <div className="space-y-3">
                    {fortuneResult.timeline.past.map((entry: any) => (
                      <div key={entry.year} className="flex items-start gap-4 bg-surface-elevated rounded-xl p-4">
                        <div className="text-center min-w-[80px]">
                          <p className="text-caption text-white/40">{entry.year}年</p>
                          <p className="text-body text-white">{entry.age}歳</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-body text-accent mb-1">{entry.theme}</p>
                          <p className="text-caption text-white/60">{entry.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Present */}
                <div className="mb-8">
                  <h3 className="text-title-2 text-white/80 mb-4">現在</h3>
                  <div className="bg-accent/10 border border-accent/20 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="text-center min-w-[80px]">
                        <p className="text-caption text-accent">{fortuneResult.timeline.present.year}年</p>
                        <p className="text-title-2 text-accent">{fortuneResult.timeline.present.age}歳</p>
                      </div>
                      <div className="flex-1">
                        <p className="text-title-2 text-white mb-2">{fortuneResult.timeline.present.theme}</p>
                        <p className="text-body text-white/80">{fortuneResult.timeline.present.description}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Future 10 Years */}
                <div>
                  <h3 className="text-title-2 text-white/80 mb-4">未来10年</h3>
                  <div className="space-y-3">
                    {fortuneResult.timeline.future.map((entry: any) => (
                      <div key={entry.year} className="flex items-start gap-4 bg-surface-elevated rounded-xl p-4">
                        <div className="text-center min-w-[80px]">
                          <p className="text-caption text-white/40">{entry.year}年</p>
                          <p className="text-body text-white">{entry.age}歳</p>
                        </div>
                        <div className="flex-1">
                          <p className="text-body text-accent mb-1">{entry.theme}</p>
                          <p className="text-caption text-white/60">{entry.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.4, ease: easeOut }}
              className="flex flex-col gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.01, opacity: 0.9 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleShare}
                className="w-full bg-accent text-black font-semibold text-body py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                aria-label="結果をシェアする"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="18" cy="5" r="3"></circle>
                  <circle cx="6" cy="12" r="3"></circle>
                  <circle cx="18" cy="19" r="3"></circle>
                  <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                  <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                </svg>
                結果をシェア
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  setStep('landing');
                  setFortuneResult(null);
                  setFormData({ name: '', birthDate: '', birthTime: '', birthPlace: '', siblingPosition: '長子' });
                }}
                className="w-full text-white/40 hover:text-white/60 text-body py-2 transition-colors"
                aria-label="最初に戻る"
              >
                戻る
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
