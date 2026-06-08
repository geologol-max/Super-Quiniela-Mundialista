import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';
import { autoSeedCollections } from '../lib/autoSeed';
import { syncUserCompletionData, syncUserCompletionDataImmediate } from '../lib/completionSync';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to safely read/write user profile to Firestore with retries
async function ensureUserProfileExists(authUser: User, customName?: string, retries = 3): Promise<UserProfile> {
  const docRef = doc(db, 'users', authUser.uid);
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        // If a custom name is specified (e.g. from registration) and differs from the saved one, update it.
        if (customName && data.name !== customName) {
          await updateDoc(docRef, { name: customName });
          data.name = customName;
        }
        return data;
      }
      
      const newProfile: UserProfile = {
        uid: authUser.uid,
        name: customName || authUser.displayName || 'Participante',
        email: authUser.email || '',
        role: authUser.email?.toLowerCase() === 'geologol@gmail.com' ? 'admin' : 'participant',
        totalPoints: 0,
        avatarEmoji: '⚽',
        predictionsCount: 0,
        parleyCount: 0,
        completed: false
      };
      
      await setDoc(docRef, newProfile);
      return newProfile;
    } catch (error: any) {
      console.warn(`[ensureUserProfileExists] Attempt ${attempt} failed:`, error);
      
      const isPermissionDenied = error?.code === 'permission-denied' || 
                                 error?.message?.includes('permission') ||
                                 String(error).toLowerCase().includes('permission');
                                 
      if (isPermissionDenied && attempt < retries) {
        // Wait 800ms for the Auth token to propagate before retrying
        await new Promise((resolve) => setTimeout(resolve, 800));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error("Failed to ensure user profile exists after retries");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
      try {
        if (unsubscribeProfile) {
          unsubscribeProfile();
          unsubscribeProfile = null;
        }

        setUser(authUser);
        if (authUser) {
          // Trigger background auto-seeding of matches & parley templates
          autoSeedCollections(db);

          // 1. Ensure user profile exists in Firestore (resolves token propagation race conditions)
          try {
            await ensureUserProfileExists(authUser);
            // Sync user completion counts immediately so they appear in the leaderboard
            syncUserCompletionDataImmediate(authUser.uid);
          } catch (e) {
            console.error("Critical error ensuring user profile exists on auth state change:", e);
          }

          // 2. Start the real-time snapshot listener on the profile document
          const docRef = doc(db, 'users', authUser.uid);
          unsubscribeProfile = onSnapshot(docRef, (docSnap) => {
            try {
              if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                if (authUser.email?.toLowerCase() === 'geologol@gmail.com' && data.role !== 'admin') {
                  updateDoc(docRef, { role: 'admin' }).catch(e => {
                    console.error("Error auto-updating admin role:", e);
                  });
                  setProfile({ ...data, role: 'admin' });
                } else {
                  setProfile(data);
                }
              } else {
                setProfile(null);
              }
            } catch (error) {
              console.error("Error handling user profile snapshot:", error);
            } finally {
              setLoading(false);
            }
          }, (error) => {
            console.error("Error in profile snapshot listener:", error);
            
            // Fallback: If database permissions fail (e.g. rules not deployed),
            // don't leave the profile null/loading. Give the admin or participant
            // an in-memory profile so they can navigate the app and access diagnostics.
            if (authUser.email?.toLowerCase() === 'geologol@gmail.com') {
              console.log("[AuthContext] Setting fallback ADMIN profile due to Firestore read failure.");
              setProfile({
                uid: authUser.uid,
                name: authUser.displayName || 'Administrador (Fallback)',
                email: authUser.email || 'geologol@gmail.com',
                role: 'admin',
                totalPoints: 0,
                avatarEmoji: '👑',
                predictionsCount: 0,
                parleyCount: 0,
                completed: false
              });
            } else {
              console.log("[AuthContext] Setting fallback PARTICIPANT profile due to Firestore read failure.");
              setProfile({
                uid: authUser.uid,
                name: authUser.displayName || 'Participante (Fallback)',
                email: authUser.email || '',
                role: 'participant',
                totalPoints: 0,
                avatarEmoji: '⚽',
                predictionsCount: 0,
                parleyCount: 0,
                completed: false
              });
            }
            setLoading(false);
          });
        } else {
          setProfile(null);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error setting up user profile in auth listener:", error);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const authUser = userCredential.user;
    try {
      await ensureUserProfileExists(authUser);
    } catch (e) {
      console.error("Error ensuring user profile exists on Google login:", e);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const registerWithEmail = async (email: string, password: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const authUser = userCredential.user;

    // Update display name
    try {
      await updateProfile(authUser, { displayName: name });
    } catch (e) {
      console.error("Error setting displayName:", e);
    }

    // Write user profile to Firestore immediately to prevent race conditions
    try {
      await ensureUserProfileExists(authUser, name);
      // Immediate sync so the new user appears in the leaderboard right away
      await syncUserCompletionDataImmediate(authUser.uid);
    } catch (e) {
      console.error("Error creating user profile in registration:", e);
    }

    // Try to send verification email
    try {
      await sendEmailVerification(authUser);
    } catch (e) {
      console.warn("Could not send email verification. This is normal if SMTP is not configured in Firebase.", e);
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, loginWithGoogle, loginWithEmail, registerWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
