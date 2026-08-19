// ============================================================
// DARKNESS ESPORTS — Firebase configuration
// ============================================================
// 1. Go to https://console.firebase.google.com
// 2. Create a project (free "Spark" plan is enough to start)
// 3. Add a Web App to the project (</> icon on the project overview page)
// 4. Copy the firebaseConfig object it gives you and paste the values below
// 5. In the Firebase console, enable:
//      Authentication -> Sign-in method -> Email/Password
//      Firestore Database -> Create database (start in production mode)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyDKZVdBRokLn7t6aB5-onHEeXqmnQuZ1qs",
  authDomain: "darkness-esports.firebaseapp.com",
  projectId: "darkness-esports",
  storageBucket: "darkness-esports.firebasestorage.app",
  messagingSenderId: "634922945207",
  appId: "1:634922945207:web:b69460d508bd13b9c59b32",
  measurementId: "G-WN9WKJFRTH"
};

// Initialize Firebase (uses the compat SDK loaded via <script> tags in each HTML page)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
