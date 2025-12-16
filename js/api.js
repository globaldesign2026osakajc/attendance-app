/**
 * api.js - API通信モジュール
 *
 * GAS APIとの通信を管理
 */

const API = {
  /**
   * APIを呼び出す
   * @param {string} action - アクション名
   * @param {object} params - パラメータ
   * @param {boolean} usePost - POSTメソッドを使用するか（大きなデータの場合）
   * @returns {Promise<object>} - レスポンス
   */
  async call(action, params = {}, usePost = false) {
    const token = localStorage.getItem('authToken');
    const url = new URL(CONFIG.API_URL);

    // 画像アップロードの場合は必ずPOSTを使用
    if (action === 'uploadProfilePhoto') {
      usePost = true;
    }

    if (usePost) {
      // POSTリクエスト（大きなデータの場合）
      const requestBody = {
        action: action,
        ...params
      };

      // トークンを追加（ログイン以外）
      if (token && action !== 'login') {
        requestBody.token = token;
      }

      try {
        const response = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain'  // プリフライトリクエストを回避
          },
          body: JSON.stringify(requestBody)
        });
        const data = await response.json();

        // 認証エラーの場合
        if (data.error === 'Unauthorized') {
          Auth.logout();
          window.location.href = '/index.html';
          throw new Error('認証エラー');
        }

        return data;

      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    } else {
      // GETリクエスト（従来の方法）
      // actionパラメータを追加
      url.searchParams.append('action', action);

      // トークンを追加（ログイン以外）
      if (token && action !== 'login') {
        url.searchParams.append('token', token);
      }

      // その他のパラメータを追加
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (typeof value === 'object' && value !== null) {
          url.searchParams.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });

      try {
        const response = await fetch(url.toString());
        const data = await response.json();

        // 認証エラーの場合
        if (data.error === 'Unauthorized') {
          Auth.logout();
          window.location.href = '/index.html';
          throw new Error('認証エラー');
        }

        return data;

      } catch (error) {
        console.error('API Error:', error);
        throw error;
      }
    }
  },

  /**
   * ローディング表示
   */
  showLoading() {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.display = 'flex';
    }
  },

  /**
   * ローディング非表示
   */
  hideLoading() {
    const loader = document.getElementById('loading');
    if (loader) {
      loader.style.display = 'none';
    }
  },

  /**
   * エラーメッセージ表示
   */
  showError(message) {
    alert(message || 'エラーが発生しました');
  },

  /**
   * 成功メッセージ表示
   */
  showSuccess(message) {
    alert(message || '成功しました');
  }
};
