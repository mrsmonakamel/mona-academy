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

    // ================ معالجة الرسائل في الخلفية ================
    messaging.onBackgroundMessage((payload) => {
        // التحقق من وجود payload
        if (!payload) {
            console.warn('[SW] استقبلت رسالة فارغة');
            return;
        }

        console.log('[SW] إشعار خلفية:', payload);

        // استخراج البيانات مع التحقق من القيم
        const notificationData = payload.notification || {};
        const dataPayload = payload.data || {};

        // قيم افتراضية آمنة
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

        // تحديد رابط الوجهة بشكل آمن
        let urlToOpen = './index.html';
        if (dataPayload.url) {
            try {
                // التحقق من صحة الرابط
                const url = new URL(dataPayload.url, self.location.origin);
                // التأكد أن الرابط داخل نفس النطاق
                if (url.origin === self.location.origin) {
                    urlToOpen = dataPayload.url;
                }
            } catch (e) {
                console.warn('[SW] رابط غير صالح، استخدام الرابط الافتراضي');
            }
        }

        // خيارات الإشعار
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

        // عرض الإشعار
        self.registration.showNotification(notificationTitle, notificationOptions)
            .catch(error => {
                console.error('[SW] فشل عرض الإشعار:', error);
            });
    });

    // ================ معالجة الضغط على الإشعار ================
    self.addEventListener('notificationclick', (event) => {
        console.log('[SW] تم الضغط على الإشعار:', event);

        // إغلاق الإشعار
        event.notification.close();

        // الحصول على الرابط بشكل آمن
        const urlToOpen = event.notification?.data?.url || './index.html';

        // فتح الرابط
        event.waitUntil(
            clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            })
            .then((clientList) => {
                // البحث عن نافذة مفتوحة بالفعل
                for (const client of clientList) {
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // فتح نافذة جديدة إذا لم توجد مفتوحة
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

    // ================ الاستماع لتثبيت Service Worker ================
    self.addEventListener('install', (event) => {
        console.log('[SW] تم التثبيت بنجاح');
        // تفعيل Service Worker فوراً
        self.skipWaiting();
    });

    // ================ الاستماع لتفعيل Service Worker ================
    self.addEventListener('activate', (event) => {
        console.log('[SW] تم التفعيل بنجاح');
        // السيطرة على جميع الصفحات المفتوحة
        event.waitUntil(clients.claim());
    });

    // ================ معالجة الأخطاء العامة ================
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

    // ================ التحقق من الاتصال ================
    self.addEventListener('fetch', (event) => {
        // تجاهل طلبات fetch - لا نحتاج للتعامل معها
        return;
    });
}