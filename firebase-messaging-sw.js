// firebase-messaging-sw.js

// استيراد مكتبات فايربيز (النسخ المتوافقة)
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// إعدادات فايربيز الخاصة بمشروعك
firebase.initializeApp({
  apiKey: "AIzaSyA8KQAQgu4nIiomoDpoTLnBz_uAtab63sY",
  authDomain: "monaacademy-cd983.firebaseapp.com",
  projectId: "monaacademy-cd983",
  storageBucket: "monaacademy-cd983.appspot.com",
  messagingSenderId: "410646694761",
  appId: "1:410646694761:web:bea49c51d3b0ff5eb9cbf8"
});

const messaging = firebase.messaging();

// معالجة الرسائل الواردة أثناء إغلاق الموقع
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] تلقي إشعار في الخلفية:', payload);
  
  if (!payload.notification) return;

  const notificationTitle = payload.notification.title || 'Mona Academy';
  const notificationOptions = {
    body: payload.notification.body || 'لديك تحديث جديد في المنصة',
    icon: 'https://cdn-icons-png.flaticon.com/512/196/196354.png',
    badge: 'https://cdn-icons-png.flaticon.com/512/196/196354.png',
    vibrate: [200, 100, 200],
    data: {
        url: payload.data && payload.data.url ? payload.data.url : './index.html'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// فتح الموقع عند الضغط على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let client of windowClients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});