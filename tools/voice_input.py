#!/usr/bin/env python3
"""
音声入力システム - Whisper APIを使った音声→テキスト変換

使い方:
    python3 tools/voice_input.py

機能:
    1. マイクから音声を録音（Spaceキーで開始/停止）
    2. Whisper APIで文字起こし
    3. テキストを標準出力に出力
"""

import os
import sys
import time
import tempfile
from pathlib import Path

try:
    import pyaudio
    import wave
    from pynput import keyboard
    from openai import OpenAI
except ImportError:
    print("❌ 必要なパッケージがインストールされていません")
    print("次のコマンドを実行してください：")
    print("pip3 install pyaudio pynput openai")
    sys.exit(1)


class VoiceRecorder:
    """音声録音クラス"""

    def __init__(self):
        self.is_recording = False
        self.frames = []
        self.audio = pyaudio.PyAudio()
        self.stream = None

        # 録音設定
        self.CHUNK = 1024
        self.FORMAT = pyaudio.paInt16
        self.CHANNELS = 1
        self.RATE = 16000  # Whisper APIの推奨サンプリングレート

    def start_recording(self):
        """録音開始"""
        self.is_recording = True
        self.frames = []

        self.stream = self.audio.open(
            format=self.FORMAT,
            channels=self.CHANNELS,
            rate=self.RATE,
            input=True,
            frames_per_buffer=self.CHUNK,
            stream_callback=self._callback
        )

        print("🎤 録音中... (Spaceキーで停止)")
        self.stream.start_stream()

    def stop_recording(self):
        """録音停止"""
        if self.stream:
            self.is_recording = False
            self.stream.stop_stream()
            self.stream.close()
            print("⏹️  録音停止")

    def _callback(self, in_data, frame_count, time_info, status):
        """録音コールバック"""
        if self.is_recording:
            self.frames.append(in_data)
        return (in_data, pyaudio.paContinue)

    def save_to_file(self, filename):
        """WAVファイルに保存"""
        with wave.open(filename, 'wb') as wf:
            wf.setnchannels(self.CHANNELS)
            wf.setsampwidth(self.audio.get_sample_size(self.FORMAT))
            wf.setframerate(self.RATE)
            wf.writeframes(b''.join(self.frames))

    def cleanup(self):
        """クリーンアップ"""
        if self.stream:
            self.stream.close()
        self.audio.terminate()


def transcribe_audio(audio_file_path: str) -> str:
    """
    Whisper APIで音声をテキストに変換

    Args:
        audio_file_path: 音声ファイルのパス

    Returns:
        文字起こしされたテキスト
    """
    # OpenAI APIキーの確認
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ OPENAI_API_KEYが設定されていません")
        print("次のコマンドを実行してください：")
        print("export OPENAI_API_KEY=your-api-key-here")
        sys.exit(1)

    client = OpenAI(api_key=api_key)

    print("🔄 Whisper APIで文字起こし中...")

    with open(audio_file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="ja"  # 日本語指定
        )

    return transcript.text


def main():
    """メイン処理"""
    print("=" * 60)
    print("🎤 音声入力システム - Whisper API版")
    print("=" * 60)
    print()
    print("操作方法:")
    print("  Spaceキー: 録音開始/停止")
    print("  Ctrl+C: 終了")
    print()

    recorder = VoiceRecorder()
    is_recording = False

    def on_press(key):
        """キー押下時の処理"""
        nonlocal is_recording

        try:
            if key == keyboard.Key.space:
                if not is_recording:
                    recorder.start_recording()
                    is_recording = True
                else:
                    recorder.stop_recording()
                    is_recording = False

                    # 一時ファイルに保存
                    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_file:
                        tmp_filename = tmp_file.name

                    recorder.save_to_file(tmp_filename)
                    print(f"💾 音声ファイル保存: {tmp_filename}")

                    # Whisper APIで文字起こし
                    try:
                        text = transcribe_audio(tmp_filename)
                        print()
                        print("=" * 60)
                        print("📝 文字起こし結果:")
                        print("=" * 60)
                        print(text)
                        print("=" * 60)
                        print()

                        # 一時ファイル削除
                        os.unlink(tmp_filename)

                    except Exception as e:
                        print(f"❌ 文字起こしエラー: {e}")

                    print("Spaceキーで再度録音できます")

        except AttributeError:
            pass

    # キーボードリスナー起動
    listener = keyboard.Listener(on_press=on_press)
    listener.start()

    try:
        # メインループ
        while True:
            time.sleep(0.1)
    except KeyboardInterrupt:
        print("\n👋 終了します")
        recorder.cleanup()
        listener.stop()


if __name__ == "__main__":
    main()
