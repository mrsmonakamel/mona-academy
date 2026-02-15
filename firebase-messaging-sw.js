// ================ FIREBASE MESSAGING SERVICE WORKER ================
// Mona Academy - نسخة محسنة بالكامل مع دعم PWA المتقدم - 2026

// استيراد مكتبات فايربيز
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// التحقق من وجود self
if (typeof self === 'undefined') {
    console.error('[SW] Service Worker requires self context');
} else {
    // إعدادات فايربيز - ثابتة وآمنة للاستخدام العام
    firebase.initializeApp({
        apiKey: "AIzaSyA8KQAQgu4nIiomoDpoTLnBz_uAtab63sY",
        authDomain: "monaacademy-cd983.firebaseapp.com",
        projectId: "monaacademy-cd983",
        storageBucket: "monaacademy-cd983.appspot.com",
        messagingSenderId: "410646694761",
        appId: "1:410646694761:web:bea49c51d3b0ff5eb9cbf8"
    });

    const messaging = firebase.messaging();

    // ================ التخزين المؤقت المتقدم للـ PWA ================
    const CACHE_NAME = 'mona-academy-v2';
    const DYNAMIC_CACHE = 'mona-academy-dynamic-v1';
    const OFFLINE_URL = './offline.html';
    
    // الملفات الأساسية للتخزين المؤقت الفوري
    const STATIC_ASSETS = [
        './',
        './index.html',
        './offline.html',
        './style.css',
        './manifest.json',
        'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
    ];

    // ================ استراتيجيات التخزين المؤقت ================
    const CACHE_STRATEGIES = {
        // استراتيجية Cache First للملفات الثابتة
        CACHE_FIRST: 'cache-first',
        // استراتيجية Network First للملفات الديناميكية
        NETWORK_FIRST: 'network-first',
        // استراتيجية Stale While Revalidate للتوازن
        STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
    };

    // ================ التثبيت والتخزين المؤقت ================
    self.addEventListener('install', (event) => {
        console.log('[SW] تم التثبيت، جاري التخزين المؤقت للملفات الأساسية');
        
        // Force waiting service worker to become active
        self.skipWaiting();
        
        event.waitUntil(
            (async () => {
                const cache = await caches.open(CACHE_NAME);
                
                // تخزين الملفات الأساسية
                try {
                    await cache.addAll(STATIC_ASSETS);
                    console.log('[SW] ✅ تم تخزين الملفات الأساسية بنجاح');
                } catch (error) {
                    console.error('[SW] ❌ فشل تخزين بعض الملفات:', error);
                    
                    // محاولة تخزين الملفات واحدًا تلو الآخر
                    for (const asset of STATIC_ASSETS) {
                        try {
                            await cache.add(asset);
                            console.log('[SW] ✅ تم تخزين:', asset);
                        } catch (e) {
                            console.warn('[SW] ⚠️ فشل تخزين:', asset);
                        }
                    }
                }
            })()
        );
    });

    // ================ التفعيل وتنظيف المخابئ القديمة ================
    self.addEventListener('activate', (event) => {
        console.log('[SW] تم التفعيل، جاري تنظيف المخابئ القديمة');
        
        event.waitUntil(
            (async () => {
                // حذف المخابئ القديمة
                const cacheKeys = await caches.keys();
                const oldCaches = cacheKeys.filter(key => 
                    key !== CACHE_NAME && key !== DYNAMIC_CACHE
                );
                
                await Promise.all(oldCaches.map(key => caches.delete(key)));
                console.log('[SW] ✅ تم حذف المخابئ القديمة');
                
                // تفعيل الـ Service Worker على جميع الصفحات المفتوحة
                await self.clients.claim();
                console.log('[SW] ✅ تم تفعيل الـ Service Worker');
            })()
        );
    });

    // ================ معالجة طلبات الشبكة ================
    self.addEventListener('fetch', (event) => {
        // تجاهل الطلبات غير GET
        if (event.request.method !== 'GET') return;
        
        const url = new URL(event.request.url);
        
        // تجاهل طلبات Firebase و Analytics
        if (url.hostname.includes('firebase') || 
            url.hostname.includes('google') ||
            url.pathname.includes('analytics')) {
            return;
        }

        // استراتيجية مختلفة حسب نوع الملف
        if (isStaticAsset(url)) {
            // استراتيجية Cache First للملفات الثابتة
            event.respondWith(cacheFirstStrategy(event.request));
        } else if (isHtmlRequest(event.request)) {
            // استراتيجية Network First لصفحات HTML
            event.respondWith(networkFirstStrategy(event.request));
        } else {
            // استراتيجية Stale While Revalidate للبقية
            event.respondWith(staleWhileRevalidateStrategy(event.request));
        }
    });

    // ================ استراتيجيات التخزين المؤقت ================
    
    // استراتيجية Cache First
    async function cacheFirstStrategy(request) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        try {
            const networkResponse = await fetch(request);
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        } catch (error) {
            console.warn('[SW] فشل جلب:', request.url);
            
            // إذا كان طلب صفحة HTML، أعد صفحة Offline
            if (isHtmlRequest(request)) {
                return caches.match(OFFLINE_URL);
            }
            
            return new Response('غير متصل', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        }
    }

    // استراتيجية Network First
    async function networkFirstStrategy(request) {
        try {
            const networkResponse = await fetch(request);
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
            return networkResponse;
        } catch (error) {
            const cachedResponse = await caches.match(request);
            if (cachedResponse) {
                return cachedResponse;
            }
            
            if (isHtmlRequest(request)) {
                return caches.match(OFFLINE_URL);
            }
            
            return new Response('غير متصل', {
                status: 503,
                statusText: 'Service Unavailable'
            });
        }
    }

    // استراتيجية Stale While Revalidate
    async function staleWhileRevalidateStrategy(request) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        const networkPromise = fetch(request)
            .then(networkResponse => {
                cache.put(request, networkResponse.clone());
                return networkResponse;
            })
            .catch(() => null);
        
        return cachedResponse || networkPromise || new Response('غير متصل', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }

    // ================ دوال مساعدة ================
    function isStaticAsset(url) {
        const staticExtensions = ['.css', '.js', '.jpg', '.png', '.gif', '.svg', '.woff', '.woff2'];
        return staticExtensions.some(ext => url.pathname.endsWith(ext));
    }

    function isHtmlRequest(request) {
        return request.headers.get('Accept')?.includes('text/html') || false;
    }

    // ================ معالجة الرسائل في الخلفية ================
    messaging.onBackgroundMessage((payload) => {
        if (!payload) {
            console.warn('[SW] استقبلت رسالة فارغة');
            return;
        }

        console.log('[SW] إشعار خلفية:', payload);

        const notificationData = payload.notification || {};
        const dataPayload = payload.data || {};

        const notificationTitle = notificationData.title || 
                                 dataPayload.title || 
                                 'Mona Academy';

        const notificationBody = notificationData.body || 
                                dataPayload.body || 
                                'لديك تحديث جديد في المنصة';

        const notificationIcon = notificationData.icon || 
                                'https://cdn-icons-png.flaticon.com/512/196/196354.png';

        const notificationBadge = notificationData.badge || 
                                 'https://cdn-icons-png.flaticon.com/512/196/196354.png';

        let urlToOpen = './index.html';
        if (dataPayload.url) {
            try {
                const url = new URL(dataPayload.url, self.location.origin);
                if (url.origin === self.location.origin) {
                    urlToOpen = dataPayload.url;
                }
            } catch (e) {
                console.warn('[SW] رابط غير صالح، استخدام الرابط الافتراضي');
            }
        }

        const notificationOptions = {
            body: notificationBody,
            icon: notificationIcon,
            badge: notificationBadge,
            vibrate: [200, 100, 200, 100, 100],
            data: {
                url: urlToOpen,
                timestamp: Date.now(),
                click_action: 'open_url'
            },
            actions: [
                {
                    action: 'open',
                    title: '📱 فتح الموقع'
                },
                {
                    action: 'dismiss',
                    title: '❌ تجاهل'
                }
            ],
            requireInteraction: true,
            silent: false,
            tag: 'mona-academy-notification-' + Date.now(),
            renotify: true,
            timestamp: Date.now()
        };

        self.registration.showNotification(notificationTitle, notificationOptions)
            .catch(error => {
                console.error('[SW] فشل عرض الإشعار:', error);
            });
    });

    // ================ معالجة الضغط على الإشعارات ================
    self.addEventListener('notificationclick', (event) => {
        console.log('[SW] تم الضغط على الإشعار:', event);
        event.notification.close();

        if (event.action === 'dismiss') {
            return;
        }

        const urlToOpen = event.notification?.data?.url || './index.html';

        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            })
            .then((clientList) => {
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
                return Promise.resolve();
            })
            .catch(error => {
                console.error('[SW] خطأ في فتح الرابط:', error);
                return clients.openWindow('./index.html');
            })
        );
    });

    // ================ مزامنة البيانات في الخلفية ================
    self.addEventListener('sync', (event) => {
        console.log('[SW] حدث مزامنة:', event.tag);
        
        if (event.tag === 'sync-data') {
            event.waitUntil(syncData());
        }
    });

    async function syncData() {
        console.log('[SW] جاري مزامنة البيانات في الخلفية');
        
        // محاولة تحديث المخابئ
        const cache = await caches.open(DYNAMIC_CACHE);
        const keys = await cache.keys();
        
        for (const request of keys) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.put(request, response);
                }
            } catch (error) {
                console.warn('[SW] فشل تحديث:', request.url);
            }
        }
    }

    // ================ معالجة الأخطاء ================
    self.addEventListener('error', (event) => {
        console.error('[SW] خطأ:', {
            message: event.error?.message || 'خطأ غير معروف',
            filename: event.filename,
            lineno: event.lineno
        });
    });

    self.addEventListener('unhandledrejection', (event) => {
        console.error('[SW] وعد مرفوض:', {
            reason: event.reason?.message || 'سبب غير معروف',
            stack: event.reason?.stack
        });
    });

    // ================ تحديث دوري للـ Service Worker ================
    setInterval(() => {
        console.log('[SW] التحقق من تحديثات جديدة...');
        self.registration.update();
    }, 60 * 60 * 1000); // كل ساعة

    console.log('[SW] ✅ Service Worker جاهز للعمل');
}