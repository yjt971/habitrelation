// PWA Service Worker 註冊：請放在 index.html 的 </body> 前，或整合到既有 JS 最後面。
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(reg => {
        console.log('PWA service worker registered:', reg.scope);
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // 有新版可用時，讓新版立即接手。若你想提示使用者，可在這裡改成顯示 toast。
              newWorker.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      })
      .catch(err => console.warn('PWA service worker registration failed:', err));
  });
}
