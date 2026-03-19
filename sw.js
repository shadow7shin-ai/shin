// 캐시 이름 설정 (버전 업데이트 시 이 이름을 변경하세요)
const CACHE_NAME = 'fishing-life-v1';

// 캐싱할 정적 자원 목록
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/lucide-react/0.263.1/lucide-react.min.js'
];

// 서비스 워커 설치: 자원 캐싱
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 서비스 워커 활성화: 오래된 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// 네트워크 요청 가로채기: 캐시 우선 전략 또는 네트워크 우선 전략
self.addEventListener('fetch', (event) => {
  // Firebase 데이터베이스 요청은 서비스 워커가 간섭하지 않도록 예외 처리
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('google.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 있으면 반환, 없으면 네트워크 요청
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          // 새로운 자원은 캐시에 추가 (선택 사항)
          if (event.request.method === 'GET') {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // 오프라인 상태에서 페이지를 찾을 수 없는 경우 처리
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});