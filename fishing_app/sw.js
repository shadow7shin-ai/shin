// 캐시 이름 설정 (앱 업데이트 시 버전을 변경하면 캐시가 갱신됩니다)
const CACHE_NAME = 'fishing-life-v1.0';

// 캐싱할 정적 자원 목록 (오프라인에서도 로드할 파일들)
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/@babel/standalone/babel.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Noto+Sans+KR:wght@400;700;900&display=swap'
];

// 1. 서비스 워커 설치: 지정된 자원들을 캐시에 저장
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] App Shell 캐싱 완료');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting(); // 즉시 활성화
});

// 2. 서비스 워커 활성화: 이전 버전의 캐시 삭제
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] 구버전 캐시 삭제:', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim(); // 모든 클라이언트 제어권 확보
});

// 3. 네트워크 요청 가로채기: 오프라인 캐시 지원 로직
self.addEventListener('fetch', (event) => {
  // Firebase 데이터베이스 요청은 서비스 워커가 간섭하지 않도록 패스 (매우 중요)
  if (
    event.request.url.includes('firestore.googleapis.com') || 
    event.request.url.includes('identitytoolkit.googleapis.com') || 
    event.request.url.includes('google.com')
  ) {
    return;
  }

  // 캐시 우선, 없으면 네트워크 요청 전략
  event.respondWith(
    caches.match(event.request).then((response) => {
      // 캐시에 자원이 있으면 반환
      if (response) {
        return response;
      }
      
      // 캐시에 없으면 네트워크로 요청
      return fetch(event.request).then((fetchResponse) => {
        // 유효한 응답인지 확인
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }

        // 스트림은 한 번만 읽을 수 있으므로 복사본 생성
        const responseToCache = fetchResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // POST 요청 등은 캐싱하지 않음
          if (event.request.method === 'GET') {
            cache.put(event.request, responseToCache);
          }
        });

        return fetchResponse;
      });
    }).catch(() => {
      // 오프라인 상태이면서 요청 실패 시 기본 HTML 반환
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});