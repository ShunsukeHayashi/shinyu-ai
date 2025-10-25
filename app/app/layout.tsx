import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'なおちゃん - AI統合占いアプリ',
  description: 'あなたの霊獣を見つける。西洋占星術、マヤ暦、数秘術、動物占い、兄弟構成診断をGPT-4が統合。あなた専用の深い洞察と美しいアートを生成します。',
  keywords: '占い, AI占い, 霊獣, 西洋占星術, マヤ暦, 動物占い, 数秘術, ホロスコープ, なおちゃん',
  openGraph: {
    title: 'なおちゃん - AI統合占いアプリ',
    description: 'あなたの霊獣を見つける。GPT-4による深い洞察とAI生成アート。',
    type: 'website',
    locale: 'ja_JP',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'なおちゃん - AI統合占いアプリ',
    description: 'あなたの霊獣を見つける。GPT-4による深い洞察とAI生成アート。',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
