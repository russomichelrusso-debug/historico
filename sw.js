/* ConsolidaPDF — Service Worker
   Estratégia: cache-first com atualização em segundo plano (stale-while-revalidate
   simplificado) + fallback de navegação para index.html quando offline. */

const CACHE_NOME = 'consolida-pdf-v1';
const PDFJS_VERSAO = '6.1.200';

const URLS_PARA_CACHE = [
  './',
  './index.html',
  './sw.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png',
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSAO}/pdf.min.mjs`,
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSAO}/pdf.worker.min.mjs`
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NOME)
      .then((cache) => cache.addAll(URLS_PARA_CACHE))
      .catch((erro) => console.warn('Falha ao pré-cachear alguns recursos:', erro))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(
        chaves.filter((chave) => chave !== CACHE_NOME).map((chave) => caches.delete(chave))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      if (respostaCache) return respostaCache;

      return fetch(event.request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.status === 200) {
            const clone = respostaRede.clone();
            caches.open(CACHE_NOME).then((cache) => cache.put(event.request, clone));
          }
          return respostaRede;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return undefined;
        });
    })
  );
});
