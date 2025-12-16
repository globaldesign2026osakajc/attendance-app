/**
 * nav.js - ナビゲーション共通スクリプト
 *
 * モバイルナビゲーションのトグル機能
 */

// ページ読み込み時に初期化
document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
});

/**
 * モバイルナビゲーションの初期化
 */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileNavToggle');
  const navContainer = document.querySelector('.nav-container');

  if (toggleBtn && navContainer) {
    toggleBtn.addEventListener('click', () => {
      navContainer.classList.toggle('open');

      // アイコンを変更
      if (navContainer.classList.contains('open')) {
        toggleBtn.innerHTML = '✕';
      } else {
        toggleBtn.innerHTML = '☰';
      }
    });

    // ナビゲーションアイテムをクリックしたらメニューを閉じる
    const navItems = navContainer.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
          navContainer.classList.remove('open');
          toggleBtn.innerHTML = '☰';
        }
      });
    });

    // 画面サイズが変更されたら状態をリセット
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        navContainer.classList.remove('open');
        toggleBtn.innerHTML = '☰';
      }
    });
  }
}
