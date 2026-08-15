import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';

// Reuse your existing Firebase project (same one AttendEase uses) or create a
// new project at https://console.firebase.google.com and paste its config here.
const firebaseConfig = {
  apiKey: 'AIzaSyBxI681b3TShFfZBt2SBQLOOkkVpEFpUVk',
  authDomain: 'bumpshare-ed28b.firebaseapp.com',
  projectId: 'bumpshare-ed28b',
  storageBucket: 'bumpshare-ed28b.firebasestorage.app',
  messagingSenderId: '1067311475265',
  appId: '1:1067311475265:web:ffea288a3924ed1a09b4c0',
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Anonymous auth is enough here — we're matching on a random uid + timestamp,
// not building user profiles. Enable "Anonymous" under Firebase Auth > Sign-in method.
export function ensureSignedIn(): Promise<User> {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub();
      if (user) {
        resolve(user);
      } else {
        signInAnonymously(auth)
          .then((cred) => resolve(cred.user))
          .catch(reject);
      }
    });
  });
}
