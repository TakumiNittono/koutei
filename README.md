# Koutei - 全肯定型・音声日本語体験アプリ

「日本語を"教えない"けど、日本語で"受け止めてくれる"音声チャット体験」

## 概要

日本語を話すときに「間違いを指摘される」恐怖を感じることなく、安心して日本語を使える体験を提供するアプリです。評価や訂正ではなく、受け止めてもらえる体験を重視しています。

## 技術スタック

- **フロントエンド**: Next.js 14 + TypeScript + React
- **バックエンド**: Next.js API Routes
- **LLM**: OpenAI GPT-4o-mini
- **音声合成**: ElevenLabs
- **PWA**: Service Worker対応、iOS/Android対応

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
OPENAI_API_KEY=your_openai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=your_voice_id_here
```

### 3. PWA用アイコンの準備

`public/icons/` ディレクトリに以下のサイズのアイコン画像を配置してください：

- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png (iOS用)
- icon-192x192.png (Android用)
- icon-384x384.png
- icon-512x512.png (メインアイコン)

詳細は `public/icons/README.md` を参照してください。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## 使い方

1. ページにアクセス
2. 「話しかけてみる」ボタンを押す
3. AIの優しい声で話しかけられる
4. テキスト入力欄に何か話してみる（またはマイクボタンで音声入力）
5. 全肯定の音声が返ってくる

## PWAとしてインストール

### iPhone/iPad (Safari)

1. Safariでアプリを開く
2. 共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」を選択
4. アイコンと名前を確認して「追加」をタップ

### Android (Chrome)

1. Chromeでアプリを開く
2. メニュー（⋮）から「アプリをインストール」を選択
3. 確認ダイアログで「インストール」をタップ

インストール後、ホーム画面から直接アプリを起動できます。

## 重要なコンセプト

- ❌ 日本語を教えるアプリではない
- ❌ 正解を出す学習アプリではない
- ⭕ 日本語を使っても否定されない体験を提供するアプリ

## ライセンス

MIT

