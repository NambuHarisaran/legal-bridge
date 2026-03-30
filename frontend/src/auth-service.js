import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  googleProvider,
  signOut,
  updateProfile,
  auth
} from './firebase-config.js';

// Email/Password Sign Up
export async function registerWithEmail(email, password, name) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user profile with name
    await updateProfile(user, { displayName: name });
    
    return {
      success: true,
      uid: user.uid,
      email: user.email,
      name: name || email.split('@')[0],
      provider: 'email'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Email/Password Login
export async function loginWithEmail(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    return {
      success: true,
      uid: user.uid,
      email: user.email,
      name: user.displayName || email.split('@')[0],
      provider: 'email'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Google Sign In
export async function loginWithGoogle() {
  try {
    const userCredential = await signInWithPopup(auth, googleProvider);
    const user = userCredential.user;
    
    return {
      success: true,
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'User',
      photoURL: user.photoURL,
      provider: 'google'
    };
  } catch (error) {
    const popupBlocked =
      error?.code === 'auth/popup-blocked' ||
      error?.code === 'auth/popup-closed-by-user';

    if (popupBlocked) {
      await signInWithRedirect(auth, googleProvider);
      return { success: false, pendingRedirect: true };
    }

    return {
      success: false,
      error: error.message
    };
  }
}

export async function completeGoogleRedirectLogin() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) {
      return { success: false, noRedirectResult: true };
    }

    const user = result.user;
    return {
      success: true,
      uid: user.uid,
      email: user.email,
      name: user.displayName || 'User',
      photoURL: user.photoURL,
      provider: 'google'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Logout
export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
