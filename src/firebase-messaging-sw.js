importScripts('https://www.gstatic.com/firebasejs/3.6.6/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/3.6.6/firebase-messaging.js');

firebase.initializeApp({
  messagingSenderId: 116289864357
});
var messaging = firebase.messaging();
