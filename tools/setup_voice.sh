#!/bin/bash
#
# 音声入力システムのセットアップスクリプト
#

set -e

echo "🔧 音声入力システムのセットアップを開始します"
echo ""

# Python依存パッケージのインストール
echo "📦 Pythonパッケージをインストール中..."
pip3 install pyaudio pynput openai

echo ""
echo "✅ セットアップ完了！"
echo ""
echo "使い方:"
echo "  python3 tools/voice_input.py"
echo ""
echo "必要な環境変数:"
echo "  export OPENAI_API_KEY=your-api-key-here"
echo ""
