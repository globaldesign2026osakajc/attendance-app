# 出欠管理システム - GASバックエンド

## 📁 ファイル構成

```
GAS/
├── Config.gs       - 設定ファイル（スプレッドシートID、フォルダIDなど）
├── Code.gs         - メインAPIエントリーポイント
├── Auth.gs         - 認証処理（ログイン、トークン管理）
├── Events.gs       - イベント管理
├── Attendance.gs   - 出欠管理
├── Members.gs      - メンバー管理
├── Checkin.gs      - チェックイン処理
├── Payments.gs     - 支払い管理
├── Receipts.gs     - 領収書管理
├── Analytics.gs    - 分析機能
├── Masters.gs      - マスタデータ管理
└── Utils.gs        - ユーティリティ関数
```

## 🚀 セットアップ手順

### 1. Google Spreadsheetの準備

1. 新しいGoogle Spreadsheetを作成
2. スプレッドシートIDをコピー（URLの`/d/`と`/edit`の間の文字列）
3. `setup.gs`を実行してシートを自動作成

### 2. Google Driveフォルダの準備

1. `profile_photos` フォルダを作成
   - フォルダIDをコピー
2. `領収書` フォルダを作成
   - フォルダIDをコピー

### 3. 領収書テンプレートの準備

1. Google Docsで新しいドキュメントを作成
2. 以下のプレースホルダーを含むテンプレートを作成:

```
領収書

No. {{receipt_number}}

{{company_name}} 様

金額: ¥{{amount}}

上記の金額を{{receipt_note}}として領収いたしました。

発行日: {{issued_at}}
イベント名: {{event_name}}

※内訳: {{detail_note}}
```

3. ドキュメントIDをコピー

### 4. Apps Scriptプロジェクトの作成

1. スプレッドシートから「拡張機能」→「Apps Script」を開く
2. すべての `.gs` ファイルを追加
3. **Config.gs** の以下の値を設定:

```javascript
const SPREADSHEET_ID = 'あなたのスプレッドシートID';
const PROFILE_PHOTO_FOLDER_ID = 'プロフィール写真フォルダID';
const RECEIPT_FOLDER_ID = '領収書フォルダID';
const RECEIPT_TEMPLATE_ID = '領収書テンプレートID';
const CALENDAR_ID = ''; // オプション: カレンダーID
```

### 5. デプロイ

1. Apps Scriptエディタで「デプロイ」→「新しいデプロイ」
2. 種類: **ウェブアプリ**
3. 説明: 「出欠管理API v1」
4. 実行者: **自分**
5. アクセス権限: **全員**
6. 「デプロイ」をクリック
7. 表示されたURLをコピー（このURLは後でフロントエンドで使用）

### 6. Googleカレンダー連携（オプション）

1. 団体用のGoogleカレンダーを作成
2. カレンダー設定でカレンダーIDを確認
3. Apps Scriptで「サービス」→「Calendar API」を追加
4. Config.gsの`CALENDAR_ID`に設定

## 📝 API仕様

### 認証

#### ログイン
```
GET/POST ?action=login&login_id=xxx&password=xxx
```

**レスポンス:**
```json
{
  "success": true,
  "token": "xxxxx",
  "member_id": "M001",
  "name": "山田太郎",
  "role": "staff"
}
```

#### ログアウト
```
GET/POST ?action=logout&token=xxxxx
```

### イベント

#### イベント一覧取得
```
GET/POST ?action=getEvents&token=xxxxx
```

オプションパラメータ:
- `date`: 日付フィルター
- `tag`: タグフィルター
- `host`: 主催者フィルター

#### イベント詳細取得
```
GET/POST ?action=getEventDetail&token=xxxxx&event_id=EVT001
```

#### イベント登録（管理者のみ）
```
POST ?action=addEvent&token=xxxxx&data={JSON}
```

#### イベント更新（管理者のみ）
```
POST ?action=updateEvent&token=xxxxx&data={JSON}
```

#### イベント削除（管理者のみ）
```
POST ?action=deleteEvent&token=xxxxx&event_id=EVT001
```

### 出欠

#### 出欠登録
```
POST ?action=registerAttendance&token=xxxxx&event_id=EVT001&status=参加&memo=xxx
```

#### 自分の出欠履歴取得
```
GET/POST ?action=getMyAttendance&token=xxxxx
```

#### イベントの出欠状況取得（管理者のみ）
```
GET/POST ?action=getEventAttendance&token=xxxxx&event_id=EVT001
```

### メンバー

#### メンバー一覧取得（管理者のみ）
```
GET/POST ?action=getMembers&token=xxxxx
```

#### 自分のプロフィール取得
```
GET/POST ?action=getMemberProfile&token=xxxxx
```

#### プロフィール更新
```
POST ?action=updateMemberProfile&token=xxxxx&data={JSON}
```

#### パスワード変更
```
POST ?action=changePassword&token=xxxxx&data={JSON}
```

### チェックイン

#### チェックイン
```
POST ?action=checkin&token=xxxxx&event_id=EVT001&member_id=M001
```

#### チェックイン＋支払い確認
```
POST ?action=checkinWithPayment&token=xxxxx&event_id=EVT001&member_id=M001&payment_confirmed=true
```

#### チェックイン一覧取得
```
GET/POST ?action=getCheckinList&token=xxxxx&event_id=EVT001
```

### 支払い管理

#### 支払い確認
```
POST ?action=confirmPayment&token=xxxxx&payment_id=PAY001
```

#### 未払い一覧取得
```
GET/POST ?action=getUnpaidList&token=xxxxx
```

#### キャンセル料一覧取得
```
GET/POST ?action=getCancellationFeeList&token=xxxxx
```

### 領収書

#### 領収書発行可能イベント一覧（メンバー用）
```
GET/POST ?action=getReceiptableEvents&token=xxxxx
```

#### 領収書発行対象メンバー一覧（管理者用）
```
GET/POST ?action=getAdminReceiptableEvents&token=xxxxx&event_id=EVT001&affiliation=営業部
```

#### 領収書発行
```
POST ?action=issueReceipt&token=xxxxx&data={JSON}
```

#### 合算領収書発行
```
POST ?action=issueCombinedReceipt&token=xxxxx&data={JSON}
```

### 分析

#### 分析データ取得
```
GET/POST ?action=getAnalytics&token=xxxxx&filter_type=position&filter_value=委員長
```

### マスタ

#### マスタデータ取得
```
GET/POST ?action=getMasters&token=xxxxx
```

## 🔒 セキュリティ対策

### 1. Cloudflare Workersプロキシ設定（推奨）

GAS APIのURLを直接フロントエンドに記載せず、Cloudflare Workersを経由させることを強く推奨します。

**Cloudflare Workers コード例:**

```javascript
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const gasUrl = env.GAS_API_URL; // 環境変数に設定

    // GAS APIにリクエストを転送
    const gasRequest = new URL(gasUrl);
    gasRequest.search = url.search;

    const response = await fetch(gasRequest.toString(), {
      method: request.method,
      headers: request.headers,
      body: request.body
    });

    return response;
  }
}
```

**環境変数設定:**
- Workers → Settings → Variables → Environment Variables
- Name: `GAS_API_URL`
- Value: `https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec`
- Type: **Secret**

### 2. robots.txt設定

フロントエンドのルートに`robots.txt`を配置:

```
User-agent: *
Disallow: /
```

### 3. HTMLにnoindexタグ追加

すべてのHTMLの`<head>`に追加:

```html
<meta name="robots" content="noindex, nofollow">
<meta name="googlebot" content="noindex, nofollow">
```

## 📊 データ構造

詳細は `# 📘 出欠登録WEBアプリ制作指示書(GAS API + GitHub Pa.ini` を参照してください。

## 🐛 トラブルシューティング

### エラー: "認証が必要です"
- トークンが期限切れ（24時間）
- 再ログインが必要

### エラー: "管理者権限が必要です"
- `members`シートでroleを`staff`に設定

### カレンダー連携が動作しない
- Apps Scriptで Calendar API が有効になっているか確認
- `CALENDAR_ID`が正しく設定されているか確認

### 領収書PDF生成エラー
- `RECEIPT_TEMPLATE_ID`が正しいか確認
- テンプレートのプレースホルダーが正しいか確認
- Driveフォルダの権限を確認

## 📞 サポート

質問や不具合報告は、プロジェクト管理者にお問い合わせください。
