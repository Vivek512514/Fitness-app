const CACHE_NAME = 'fitness-v2';
const ASSETS = ['/', '/index.html'];

// Install — cache the app shell
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network-first for the app shell (so updates show up immediately),
// falling back to cache only when offline. Other requests stay cache-first.
self.addEventListener('fetch', e => {
  const isAppShell =
    e.request.mode === 'navigate' ||
    e.request.url.endsWith('/index.html');

  if (isAppShell) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});

// Push notification received
self.addEventListener('push', e => {
  const data = e.data
    ? e.data.json()
    : {
        title: 'Workout Time 💪',
        body: "It's time for your session. Let's go!"
      };

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'workout-reminder',
      requireInteraction: true,
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' }
      ]
    })
  );
});

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();

  if (e.action !== 'dismiss') {
    e.waitUntil(clients.openWindow('/'));
  }
});

// Schedule local workout reminders using periodic checks
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_REMINDER') {
    // Store the reminder config
    self.reminderConfig = e.data.config;
  }
});
