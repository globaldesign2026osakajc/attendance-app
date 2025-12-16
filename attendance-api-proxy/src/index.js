/**
 * GAS API プロキシ - Cloudflare Workers
 *
 * GAS APIへのリクエストを中継し、セキュリティを強化
 */

export default {
	async fetch(request, env, ctx) {
		// GAS API URL（環境変数から取得）
		const GAS_API_URL = 'https://script.google.com/macros/s/AKfycbw2lmbQTiHdGWrXQgJI-wd2-OEErxwA2yuUG-Ca8pBDpABj047jfuDEW16TOHmzGOOc/exec';

		// CORS設定
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
			'Access-Control-Max-Age': '86400'
		};

		// プリフライトリクエストの処理
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: corsHeaders
			});
		}

		try {
			// リクエストURLのクエリパラメータとボディを取得
			const url = new URL(request.url);
			const searchParams = new URL(request.url).searchParams;

			// GAS APIへのリクエストを構築
			const gasUrl = new URL(GAS_API_URL);

			// GET/POSTパラメータをGAS URLに追加
			for (const [key, value] of searchParams) {
				gasUrl.searchParams.append(key, value);
			}

			// リクエストオプション
			const fetchOptions = {
				method: request.method,
				headers: {
					'Content-Type': 'application/json'
				}
			};

			// POSTリクエストの場合、ボディをコピー
			if (request.method === 'POST') {
				fetchOptions.body = await request.text();
			}

			// GAS APIへリクエストを送信
			const gasResponse = await fetch(gasUrl.toString(), fetchOptions);

			// レスポンスをコピー
			const responseData = await gasResponse.text();

			// CORSヘッダーを付与してレスポンスを返す
			return new Response(responseData, {
				status: gasResponse.status,
				headers: {
					...corsHeaders,
					'Content-Type': gasResponse.headers.get('Content-Type') || 'application/json'
				}
			});

		} catch (error) {
			// エラーレスポンス
			return new Response(JSON.stringify({
				error: 'Proxy Error',
				message: error.message
			}), {
				status: 500,
				headers: {
					...corsHeaders,
					'Content-Type': 'application/json'
				}
			});
		}
	}
};
