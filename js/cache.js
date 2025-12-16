// キャッシュ管理モジュール
const Cache = {
  // キャッシュに保存
  set(key, value, ttl = CONFIG.CACHE_TTL) {
    const item = {
      value: value,
      timestamp: Date.now(),
      ttl: ttl
    };
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.error('キャッシュ保存エラー:', error);
      // localStorageが満杯の場合は古いキャッシュを削除
      this.clearOldCache();
      try {
        localStorage.setItem(`cache_${key}`, JSON.stringify(item));
      } catch (e) {
        console.error('キャッシュ保存に失敗しました:', e);
      }
    }
  },

  // キャッシュから取得
  get(key) {
    try {
      const itemStr = localStorage.getItem(`cache_${key}`);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);

      // 有効期限チェック
      if (Date.now() - item.timestamp > item.ttl) {
        localStorage.removeItem(`cache_${key}`);
        return null;
      }

      return item.value;
    } catch (error) {
      console.error('キャッシュ取得エラー:', error);
      return null;
    }
  },

  // 特定のキャッシュを削除
  remove(key) {
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.error('キャッシュ削除エラー:', error);
    }
  },

  // すべてのキャッシュをクリア
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
    }
  },

  // 古いキャッシュを削除（容量確保用）
  clearOldCache() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      // タイムスタンプでソート
      const cacheItems = cacheKeys.map(key => {
        try {
          const item = JSON.parse(localStorage.getItem(key));
          return { key, timestamp: item.timestamp };
        } catch {
          return { key, timestamp: 0 };
        }
      }).sort((a, b) => a.timestamp - b.timestamp);

      // 古い順に半分削除
      const removeCount = Math.ceil(cacheItems.length / 2);
      for (let i = 0; i < removeCount; i++) {
        localStorage.removeItem(cacheItems[i].key);
      }
    } catch (error) {
      console.error('古いキャッシュ削除エラー:', error);
    }
  },

  // キャッシュが存在するか確認
  has(key) {
    return this.get(key) !== null;
  },

  // キャッシュのサイズを取得（デバッグ用）
  getSize() {
    let total = 0;
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          total += (localStorage.getItem(key) || '').length;
        }
      });
    } catch (error) {
      console.error('キャッシュサイズ取得エラー:', error);
    }
    return total;
  },

  // キャッシュ統計情報
  getStats() {
    try {
      const keys = Object.keys(localStorage);
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));

      let totalSize = 0;
      let validCount = 0;
      let expiredCount = 0;

      cacheKeys.forEach(key => {
        const itemStr = localStorage.getItem(key);
        totalSize += (itemStr || '').length;

        try {
          const item = JSON.parse(itemStr);
          if (Date.now() - item.timestamp > item.ttl) {
            expiredCount++;
          } else {
            validCount++;
          }
        } catch {
          expiredCount++;
        }
      });

      return {
        totalKeys: cacheKeys.length,
        validKeys: validCount,
        expiredKeys: expiredCount,
        totalSize: totalSize,
        totalSizeKB: (totalSize / 1024).toFixed(2)
      };
    } catch (error) {
      console.error('キャッシュ統計取得エラー:', error);
      return null;
    }
  }
};
