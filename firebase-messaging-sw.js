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

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'Mona Academy';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge.png',
    data: payload.data,
    vibrate: [200, 100, 200],
    requireInteraction: true
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});