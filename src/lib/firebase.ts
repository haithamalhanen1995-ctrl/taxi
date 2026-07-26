import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  initializeFirestore, 
  getFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if configured
let db;
try {
  if (firebaseConfig.firestoreDatabaseId) {
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    }, firebaseConfig.firestoreDatabaseId);
  } else {
    db = getFirestore(app);
  }
} catch {
  db = getFirestore(app);
}

// Initialize Auth
const auth = getAuth(app);

export { app, db, auth };
