import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Request Google Drive and Calendar scopes
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/calendar');

let isSigningIn = false;
let cachedAccessToken: string | null = localStorage.getItem('apex_google_access_token');

// Initialize auth listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      // We call onAuthSuccess even if cachedAccessToken is not present.
      // This ensures the user is logged into the local React app.
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken || '');
    } else {
      cachedAccessToken = null;
      localStorage.removeItem('apex_google_access_token');
      localStorage.removeItem('apex_google_token_expiry');
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    localStorage.setItem('apex_google_access_token', cachedAccessToken);
    // Standard Google access token lifetime is 3600 seconds (1 hour). 
    // We save expiration time as (now + 55 minutes) to have a buffer.
    const expiryTime = Date.now() + 55 * 60 * 1000;
    localStorage.setItem('apex_google_token_expiry', expiryTime.toString());

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  const expiry = Number(localStorage.getItem('apex_google_token_expiry') || '0');
  if (Date.now() > expiry) {
    return null;
  }
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
  localStorage.removeItem('apex_google_access_token');
  localStorage.removeItem('apex_google_token_expiry');
};
