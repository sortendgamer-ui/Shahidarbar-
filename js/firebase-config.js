/* =========================================================================
   FIREBASE CONFIG — REPLACE THESE VALUES WITH YOUR OWN PROJECT KEYS

   How to get them (free, ~5 minutes):
   1. Go to https://console.firebase.google.com and create a new project
      (call it "Shahi Darbar" or anything you like).
   2. Inside the project, click the "</>" (Web) icon to register a web app.
   3. Firebase will show you a firebaseConfig object — copy those values
      into the object below.
   4. In the left sidebar go to Build > Authentication > Get Started,
      then enable the "Email/Password" sign-in provider.
   5. In the left sidebar go to Build > Firestore Database > Create Database
      (start in production mode, pick a region close to India, e.g. asia-south1).
   6. Once created, go to the "Rules" tab of Firestore and paste the
      contents of firestore.rules.txt (included in this project), then Publish.

   Full step-by-step guide: see SETUP-GUIDE.md in this folder.
   ========================================================================= */

export const firebaseConfig = {
  apiKey: "AIzaSyAkxxN5NhZ5bNYT9M5M6GQzzWiAbz6HJRQ",
  authDomain: "shahidarbar-4232b.firebaseapp.com",
  projectId: "shahidarbar-4232b",
  storageBucket: "shahidarbar-4232b.firebasestorage.app",
  messagingSenderId: "849391926466",
  appId: "1:849391926466:web:bd7cf357972009d3804f5b"
};

/* Synthetic email domain used to let people log in with just a
   username instead of an email address (Firebase Auth requires an
   email under the hood, so we build one automatically). You don't
   need to change this. */
export const AUTH_EMAIL_DOMAIN = "shahidarbar.app";

/* The ONE email allowed to access the Admin Panel. Only someone who
   knows this exact email + its password can ever reach admin.html —
   regular site accounts (used for posting reviews) can never become
   admins, no matter what. Change this if you want a different admin
   email, then use that new email the first time you open admin-login.html
   (it self-creates the account on first successful login). */
export const ADMIN_EMAIL = "shahidarbar@gmail.com";
