/**
 * Fishing Life v3.0.0 - Service Worker
 * 오프라인 지원 및 정적 에셋 캐싱 로직
 */

const CACHE_NAME = 'fishing-life-v3.0.0';

// 캐싱할 에셋 목록 (앱 구동에 필요한 핵심 파일)
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'manifest.json',
  'https://cdn-icons-png.flaticon.com/512/2830/2830114.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;700;800;900&display=swap',
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@900&display=swap'
];

// 서비스 워커 설치: 에셋 캐싱 시작
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all assets');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 서비스 워커 활성화: 이전 버전의 캐시 정리
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 페치 이벤트: 네트워크 요청 시 캐시 우선 응답
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 있으면 반환, 없으면 네트워크에서 가져옴
      return response || fetch(event.request);
    })
  );
});