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
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT.appspot.com",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

// Initialize Firebase (uses the compat SDK loaded via <script> tags in each HTML page)
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
