/**
 * Cloudflare Workers - GAS API Proxy
 * フロントエンドとGAS APIの間に立ち、実際のGAS URLを隠蔽する
 *
 * 環境変数設定:
 * - GAS_API_URL: Google Apps ScriptのデプロイURL
 * - ALLOWED_ORIGIN: フロントエンドのドメイン（GitHub Pagesなど）
 */

export default {
  async fetch(request, env) {
    // CORS対応ヘッダー
    const corsHeaders = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    // プリフライトリクエスト（OPTIONS）対応
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    try {
      // GAS API URLを環境変数から取得
      // Cloudflare ダッシュボードで名前が `GET_API_URL` になっていることがあるため両方サポート
      const gasApiUrl = env.GAS_API_URL || env.GET_API_URL;

      if (!gasApiUrl) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'GAS_API_URL is not configured',
            message: 'サーバー設定エラー'
          }),
          {
            status: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        );
      }

      // リクエストURLからクエリパラメータを取得
      const url = new URL(request.url);
      const params = url.searchParams;

      // GAS APIのURLにパラメータを追加
      const gasUrl = new URL(gasApiUrl);
      params.forEach((value, key) => {
        gasUrl.searchParams.append(key, value);
      });

      // リクエストボディを取得（POSTの場合）
      let body = null;
      if (request.method === 'POST') {
        body = await request.text();
      }

      // 元リクエストのヘッダーを可能な限り転送（Authorization等）
      const forwardHeaders = new Headers();
      request.headers.forEach((value, key) => {
        forwardHeaders.set(key, value);
      });
      // GAS側へのPOSTはJSONが想定されるため明示
      if (!forwardHeaders.has('content-type')) {
        forwardHeaders.set('Content-Type', 'application/json');
      }

      // GAS APIにリクエストを転送（リダイレクトは追従）
      const gasResponse = await fetch(gasUrl.toString(), {
        method: request.method,
        headers: forwardHeaders,
        body: body,
        redirect: 'follow',
      });

      // GASからのレスポンスを取得
      const responseData = await gasResponse.text();

      // CORSヘッダーを付けてレスポンスを返す
      return new Response(responseData, {
        status: gasResponse.status,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      });

    } catch (error) {
      // エラーハンドリング
      console.error('Proxy Error:', error);

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Proxy Error',
          message: error.message || 'プロキシでエラーが発生しました'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};
