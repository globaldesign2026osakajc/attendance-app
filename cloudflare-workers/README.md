# Cloudflare Workers デプロイ手順

このドキュメントでは、GAS API ProxyをCloudflare Workersにデプロイする手順を説明します。

## 前提条件

- Cloudflareアカウント（無料プランで利用可能）
- Node.js（v16以降）とnpm
- GASのデプロイ済みAPI URL

## 手順1: Cloudflareアカウントの作成

1. [Cloudflare](https://www.cloudflare.com/)にアクセス
2. 「Sign Up」をクリックしてアカウントを作成
3. メールアドレスとパスワードを入力して登録

## 手順2: Wranglerのインストール

Wranglerは、Cloudflare Workers用のCLIツールです。

```bash
npm install -g wrangler
```

## 手順3: Cloudflareにログイン

```bash
wrangler login
```

ブラウザが開き、Cloudflareへのログインを求められます。

## 手順4: プロジェクトの初期化

```bash
cd cloudflare-workers
wrangler init attendance-api-proxy
```

質問に対して以下のように回答：
- Would you like to use TypeScript? → No
- Would you like to create a Worker? → Yes
- Would you like to install dependencies? → Yes

## 手順5: wrangler.tomlの設定

`wrangler.toml`ファイルを以下の内容に編集：

```toml
name = "attendance-api-proxy"
main = "worker.js"
compatibility_date = "2024-01-01"

# 環境変数（本番環境）
[env.production]
name = "attendance-api-proxy"
```

## 手順6: 環境変数の設定

### 6-1. GAS_API_URLの設定

GASをデプロイして取得したURLを設定します：

```bash
wrangler secret put GAS_API_URL
```

プロンプトが表示されたら、GASのデプロイURLを貼り付けます：
```
https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

### 6-2. ALLOWED_ORIGINの設定

フロントエンドのドメイン（GitHub Pagesなど）を設定します：

```bash
wrangler secret put ALLOWED_ORIGIN
```

プロンプトが表示されたら、フロントエンドのURLを入力：
```
https://your-username.github.io
```

## 手順7: デプロイ

```bash
wrangler deploy
```

デプロイが完功すると、Workers URLが表示されます：
```
https://attendance-api-proxy.your-subdomain.workers.dev
```

このURLをメモしておいてください。

## 手順8: フロントエンドの設定を更新

`frontend/js/config.js`を以下のように更新：

```javascript
const CONFIG = {
  // Cloudflare Workers API URL
  API_URL: 'https://attendance-api-proxy.your-subdomain.workers.dev',

  APP_NAME: 'グローバルデザイン推進委員会 出欠管理',
  CACHE_TTL: 5 * 60 * 1000,
  SESSION_TIMEOUT: 24 * 60 * 60 * 1000
};
```

**重要**: `your-subdomain`の部分を、手順7で取得した実際のWorkers URLに置き換えてください。

## 手順9: 動作確認

1. フロントエンドをブラウザで開く
2. ログイン機能が正常に動作するか確認
3. イベント一覧が表示されるか確認
4. ブラウザの開発者ツールで、リクエストがCloudflare Workers経由で送信されているか確認

## トラブルシューティング

### エラー: CORS policy error

- `ALLOWED_ORIGIN`環境変数が正しく設定されているか確認
- フロントエンドのURLとALLOWED_ORIGINが完全一致しているか確認（末尾のスラッシュなど）

### エラー: GAS_API_URL is not configured

- `wrangler secret put GAS_API_URL`で環境変数を再設定
- `wrangler deploy`で再デプロイ

### リクエストが失敗する

- GASのデプロイURLが正しいか確認
- GASの「アクセスできるユーザー」設定が「全員」になっているか確認

## Cloudflare Workersダッシュボード

デプロイ後、以下でWorkerの状態を確認できます：
- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- Workers & Pages → attendance-api-proxy

ダッシュボードから以下が可能：
- リクエスト数の確認
- エラーログの確認
- 環境変数の管理
- Workerの削除や設定変更

## 料金について

Cloudflare Workersの無料プランでは：
- 1日あたり100,000リクエストまで無料
- CPU時間10ms/リクエストまで無料

通常の出欠管理アプリの利用では、無料プランで十分です。

## セキュリティ上の利点

Cloudflare Workersを使用することで：
1. **GAS URLの隠蔽**: フロントエンドのコードからGASの実際のURLが見えない
2. **レート制限**: 必要に応じてリクエスト数制限を追加可能
3. **DDoS保護**: Cloudflareの保護機能が自動的に適用される
4. **CORS管理**: 許可されたドメインからのみアクセス可能
