# 出欠管理WEBアプリ

グローバルデザイン推進委員会向けの出欠管理WEBアプリケーションです。

## 📋 機能

- **出欠登録** - イベント参加者の出欠管理
- **QRコード読み込み** - QRコードによる自動チェックイン
- **プロフィール管理** - メンバー情報の登録・更新
- **イベント管理** - イベント情報の作成・編集
- **支払い管理** - 支払い状況の管理
- **領収書生成** - 自動領収書作成
- **分析機能** - 出欠率などの統計情報

## 🏗️ 技術スタック

### フロントエンド
- HTML / CSS / JavaScript
- ローカルストレージでのキャッシング
- http-server で動作

### バックエンド
- **Google Apps Script (GAS)** - メイン API
- **Google Sheets** - データベース
- **Google Drive** - ファイルストレージ
- **Google Calendar** - イベント管理

### インフラ
- **Cloudflare Workers** - API プロキシ（セキュリティ強化）
- **GitHub** - ソースコード管理

## 📁 ディレクトリ構成

```
.
├── frontend/              # フロントエンド（HTML/CSS/JS）
│   ├── index.html        # ログイン画面
│   ├── home.html         # ホーム画面
│   ├── admin/            # 管理画面
│   ├── css/              # スタイルシート
│   └── js/               # JavaScript ファイル
│
├── GAS/                  # Google Apps Script
│   ├── Config.gs         # 設定ファイル
│   ├── Code.gs           # メイン API エントリーポイント
│   ├── Auth.gs           # 認証処理
│   ├── Events.gs         # イベント管理
│   ├── Attendance.gs     # 出欠管理
│   └── ...
│
├── attendance-api-proxy/ # Cloudflare Workers プロキシ
│   ├── src/
│   │   └── index.js      # プロキシロジック
│   ├── wrangler.jsonc    # Wrangler 設定
│   └── package.json
│
└── cloudflare-workers/   # Cloudflare Workers デプロイ用
```

## 🚀 セットアップ手順

### 1. フロントエンド

```bash
cd frontend
npm install
npm start
```

ブラウザで `http://localhost:8000` を開きます。

### 2. GAS の設定

1. `GAS/Config.gs` の ID を確認
2. Google Apps Script コンソールにすべてのファイルをコピー
3. 「デプロイ」 → 「ウェブアプリ」でデプロイ
4. デプロイ URL を取得

### 3. Cloudflare Workers の設定

```bash
cd attendance-api-proxy
npm install
npm run dev    # 開発用
npm run deploy # 本番環境へのデプロイ
```

## 📖 使用方法

### ログイン

1. フロントエンドを開く
2. ログインIDとパスワードを入力
3. 「ログイン」をクリック

### 出欠登録

1. 「ホーム」画面からイベントを選択
2. メンバーのチェックボックスをON/OFF
3. 「保存」をクリック

## 🔒 セキュリティ

- **Cloudflare Workers** でGAS APIをプロキシ化
- GAS API URL を隠蔽
- CORS設定で不正なリクエストをブロック
- セッショントークンによる認証

## ⚙️ 環境設定

`.env` ファイルに以下を設定：

```
GAS_API_URL=https://script.google.com/macros/s/[ID]/exec
CLOUDFLARE_API_TOKEN=[トークン]
```

## 📝 ライセンス

プライベート（内部使用のみ）

## 👥 開発者

グローバルデザイン推進委員会

## 📞 お問い合わせ

問題や質問がある場合は、Issue を作成してください。
