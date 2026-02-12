// firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyA8KQAQgu4nIiomoDpoTLnBz_uAtab63sY",
  authDomain: "monaacademy-cd983.firebaseapp.com",
  projectId: "monaacademy-cd983",
  storageBucket: "monaacademy-cd983.appspot.com",
  messagingSenderId: "410646694761",
  appId: "1:410646694761:web:bea49c51d3b0ff5eb9cbf8"
});

const messaging = firebase.messaging();

// استقبال الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] إشعار خلفي:', payload);

  // التأكد من وجود بيانات الإشعار
  if (!payload.notification) return;

  const notificationTitle = payload.notification.title || 'Mona Academy';
  const notificationOptions = {
    body: payload.notification.body || 'لديك إشعار جديد',
    // ✅ تم إزالة icon و badge – لا يوجد أيقونات
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: payload.data || {},
    actions: [
      {
        action: 'open',
        title: 'فتح التطبيق'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// فتح التطبيق عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // فتح الصفحة الرئيسية (عدّل المسار حسب هيكل موقعك)
  const urlToOpen = '/mona-academy/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // إذا كان هناك نافذة مفتوحة بالفعل، ركز عليها
      for (const client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // وإلا افتح نافذة جديدة
      return clients.openWindow(urlToOpen);
    })
  );
});