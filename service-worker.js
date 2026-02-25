// ⚠️ مهم: غيّر هذا الرقم عند كل نشر جديد لتحديث الكاش للمستخدمين
const CACHE_VERSION = 'v3';
const CACHE_NAME = `mona-academy-${CACHE_VERSION}`;
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// الملفات الأساسية اللي هتتخزن في الكاش أول ما التطبيق يتحمل
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/profile.html',
  '/offline.html',
  '/style.css',
  '/script.js',
  '/notifications.js',
  '/badges.js',
  '/manifest.json',
  '/mona.jpg',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// ملفات الـ API اللي ممكن نخزنها مؤقتاً
const DYNAMIC_ASSETS = [
  '/api/courses',
  '/api/user'
];

// تثبيت الـ Service Worker
self.addEventListener('install', event => {
  console.log('✅ Service Worker installing...');
  
  // انتظر لحد ما الملفات الأساسية تتحمل
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('📦 Caching static assets');
        // نستخدم allSettled عشان لو ملف واحد فشل، باقي الملفات تتحمل
        return Promise.allSettled(
          STATIC_ASSETS.map(url =>
            cache.add(url).catch(err => console.warn('⚠️ Failed to cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

// تفعيل الـ Service Worker
self.addEventListener('activate', event => {
  console.log('✅ Service Worker activating...');
  
  // امسح الكاش القديم
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// استراتيجية: Cache First ثم Network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // لو الملف من نفس الدومين
  if (url.origin === self.location.origin) {
    // للملفات الأساسية (HTML, CSS, JS)
    if (event.request.url.includes('.html') || 
        event.request.url.includes('.css') || 
        event.request.url.includes('.js')) {
      event.respondWith(
        caches.match(event.request)
          .then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return fetch(event.request)
              .then(networkResponse => {
                // خزن النسخة الجديدة في الكاش (بدون await لعدم تأخير الاستجابة)
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(STATIC_CACHE).then(cache => {
                    cache.put(event.request, networkResponse.clone()).catch(e => console.warn('Cache put failed:', e));
                  });
                }
                return networkResponse;
              })
              .catch(() => {
                // لو في error ومفيش نت، اعرض صفحة offline
                if (event.request.url.includes('.html')) {
                  return caches.match('/offline.html');
                }
              });
          })
      );
      return;
    }
    
    // للصور (استراتيجية: Cache First)
    if (event.request.url.includes('.jpg') || 
        event.request.url.includes('.png') || 
        event.request.url.includes('.svg')) {
      event.respondWith(
        caches.match(event.request)
          .then(cachedResponse => {
            return cachedResponse || fetch(event.request)
              .then(networkResponse => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(DYNAMIC_CACHE).then(cache => {
                    cache.put(event.request, networkResponse.clone()).catch(e => console.warn('Cache put failed:', e));
                  });
                }
                return networkResponse;
              });
          })
      );
      return;
    }
  }
  
  // ✅ لا تخزن طلبات Firebase أو أي API خارجي في الكاش
  const isExternalAPI = event.request.url.includes('firebaseio.com') ||
      event.request.url.includes('googleapis.com') ||
      event.request.url.includes('firebaseapp.com') ||
      event.request.url.includes('api.anthropic.com') ||
      event.request.url.includes('api.telegram.org');

  if (isExternalAPI) {
    event.respondWith(fetch(event.request));
    return;
  }

  // للـ API والبيانات (استراتيجية: Network First)
  if (event.request.url.includes('/api/') || 
      event.request.url.includes('.json')) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(DYNAMIC_CACHE).then(cache => {
              cache.put(event.request, networkResponse.clone()).catch(e => console.warn('Cache put failed:', e));
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // للطلبات التانية (استراتيجية: Network then Cache)
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(DYNAMIC_CACHE).then(cache => {
            cache.put(event.request, networkResponse.clone()).catch(e => console.warn('Cache put failed:', e));
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// الاستماع لإشعارات الـ Push
self.addEventListener('push', event => {
  console.log('📨 Push notification received', event);
  
  const options = {
    body: event.data?.text() || '🔔 لديك إشعار جديد',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'فتح'
      },
      {
        action: 'close',
        title: 'إغلاق'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Mona Academy', options)
  );
});

// التعامل مع الضغط على الإشعار
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notification clicked', event);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// التعامل مع التزامن في الخلفية (Background Sync)
self.addEventListener('sync', event => {
  console.log('🔄 Background sync', event);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // هنضيف هنا مزامنة البيانات لما يكون في نت
      syncData()
    );
  }
});

// فتح قاعدة بيانات IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('mona-academy-sync', 1);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('unsyncedData')) {
        db.createObjectStore('unsyncedData', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

// جلب البيانات غير المزامنة من IndexedDB
function getUnsyncedData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('unsyncedData', 'readonly');
    const store = transaction.objectStore('unsyncedData');
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// حذف البيانات بعد المزامنة الناجحة
function clearSyncedData(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('unsyncedData', 'readwrite');
    const store = transaction.objectStore('unsyncedData');
    const request = store.clear();
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// دالة لمزامنة البيانات
async function syncData() {
  try {
    // جلب البيانات المحفوظة من IndexedDB
    const db = await openDB();
    const unsyncedData = await getUnsyncedData(db);
    
    if (unsyncedData.length === 0) {
      console.log('✅ No data to sync');
      return;
    }
    
    // ارسل البيانات للسيرفر
    await Promise.all(
      unsyncedData.map(data => {
        return fetch('/api/sync', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json'
          }
        });
      })
    );
    
    // امسح البيانات بعد المزامنة الناجحة
    await clearSyncedData(db);
    
    console.log('✅ Data synced successfully');
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}