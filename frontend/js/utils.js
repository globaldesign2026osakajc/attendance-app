/**
 * utils.js - ユーティリティ関数
 *
 * 共通で使用する便利な関数群
 */

const Utils = {
  /**
   * 日付をフォーマット（YYYY-MM-DD）
   */
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  /**
   * 日付をフォーマット（YYYY/MM/DD）
   */
  formatDateSlash(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  },

  /**
   * 日付をフォーマット（M月D日）
   */
  formatDateJapanese(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = d.getMonth() + 1;
    const day = d.getDate();
    return `${month}月${day}日`;
  },

  /**
   * 曜日を取得
   */
  getDayOfWeek(date) {
    if (!date) return '';
    const d = new Date(date);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    return days[d.getDay()];
  },

  /**
   * 日時をフォーマット（YYYY/MM/DD HH:MM）
   */
  formatDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  },

  /**
   * 時刻をフォーマット（HH:MM）
   */
  formatTime(time) {
    if (!time) return '';
    return time.substring(0, 5); // "19:00:00" -> "19:00"
  },

  /**
   * 金額をフォーマット（¥1,000）
   */
  formatCurrency(amount) {
    if (amount === undefined || amount === null) return '';
    return '¥' + Number(amount).toLocaleString('ja-JP');
  },

  /**
   * 締切までの残り日数を計算
   */
  getDaysUntil(date) {
    if (!date) return null;
    const target = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = target - today;
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  },

  /**
   * 締切が過ぎているかチェック
   */
  isExpired(date) {
    if (!date) return false;
    const target = new Date(date);
    const now = new Date();
    return now > target;
  },

  /**
   * エスケープHTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  },

  /**
   * URLパラメータを取得
   */
  getUrlParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
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
  },

  /**
   * 確認ダイアログ
   */
  confirm(message) {
    return window.confirm(message);
  },

  /**
   * QRコードURL生成
   */
  generateQRCodeURL(data, size = 300) {
    const baseUrl = 'https://chart.googleapis.com/chart';
    const params = new URLSearchParams({
      cht: 'qr',
      chs: `${size}x${size}`,
      chl: data
    });
    return `${baseUrl}?${params.toString()}`;
  }
};

/**
 * グローバルユーティリティ関数
 */

/**
 * ローディング表示
 */
function showLoading() {
  const loader = document.getElementById('loading');
  if (loader) {
    loader.style.display = 'flex';
  }
}

/**
 * ローディング非表示
 */
function hideLoading() {
  const loader = document.getElementById('loading');
  if (loader) {
    loader.style.display = 'none';
  }
}

/**
 * エラーメッセージ表示
 */
function showError(message) {
  alert(message || 'エラーが発生しました');
}

/**
 * 成功メッセージ表示
 */
function showSuccess(message) {
  alert(message || '成功しました');
}

/**
 * HTMLエスケープ
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * 時刻フォーマット（HH:MM）
 */
function formatTime(time) {
  if (!time) return '';
  // HH:MM:SS形式の場合、HH:MMのみ返す
  if (typeof time === 'string' && time.includes(':')) {
    const parts = time.split(':');
    return `${parts[0]}:${parts[1]}`;
  }
  return time;
}
