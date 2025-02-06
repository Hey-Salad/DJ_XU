import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC5lwJMV0j1-ohWbZ-aJJfrmwNHQ1wG00o",
  authDomain: "dj-xu-c4678.firebaseapp.com",
  projectId: "dj-xu-c4678",
  storageBucket: "dj-xu-c4678.firebasestorage.app",
  messagingSenderId: "277690157150",
  appId: "1:277690157150:web:13c035b8bd6d6373b40ccf",
  measurementId: "G-KNET4Q2313"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);