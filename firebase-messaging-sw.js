// ================ FIREBASE MESSAGING SERVICE WORKER ================
// Mona Academy - نسخة آمنة ومحسنة - 2026

// استيراد مكتبات فايربيز
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

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

    // ================ التخزين المؤقت للـ PWA ================
    const CACHE_NAME = 'mona-academy-v1';
    const urlsToCache = [
        './',
        './index.html',
        './style.css',
        './manifest.json',
        'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
        'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
    ];

    self.addEventListener('install', (event) => {
        console.log('[SW] تم التثبيت، جاري التخزين المؤقت');
        self.skipWaiting();
        
        event.waitUntil(
            caches.open(CACHE_NAME)
                .then(cache => {
                    console.log('[SW] تم فتح المخبأ');
                    return cache.addAll(urlsToCache);
                })
                .catch(error => {
                    console.error('[SW] فشل التخزين المؤقت:', error);
                })
        );
    });

    self.addEventListener('activate', (event) => {
        console.log('[SW] تم التفعيل');
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] حذف مخبأ قديم:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
        );
        event.waitUntil(clients.claim());
    });

    self.addEventListener('fetch', (event) => {
        if (event.request.method !== 'GET') return;
        
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    return caches.match(event.request)
                        .then(response => {
                            if (response) {
                                return response;
                            }
                            if (event.request.mode === 'navigate') {
                                return caches.match('./index.html');
                            }
                            return new Response('غير متصل', {
                                status: 404,
                                statusText: 'غير متصل'
                            });
                        });
                })
        );
    });

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
            vibrate: [200, 100, 200],
            data: {
                url: urlToOpen,
                timestamp: Date.now(),
                click_action: 'open_url'
            },
            actions: [
                {
                    action: 'open',
                    title: 'فتح الموقع'
                }
            ],
            requireInteraction: true,
            silent: false,
            tag: 'mona-academy-notification'
        };

        self.registration.showNotification(notificationTitle, notificationOptions)
            .catch(error => {
                console.error('[SW] فشل عرض الإشعار:', error);
            });
    });

    self.addEventListener('notificationclick', (event) => {
        console.log('[SW] تم الضغط على الإشعار:', event);
        event.notification.close();

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
            })
        );
    });

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
}