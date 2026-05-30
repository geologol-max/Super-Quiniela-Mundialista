import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

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
          const docRef = doc(db, 'users', authUser.uid);
          
          unsubscribeProfile = onSnapshot(docRef, async (docSnap) => {
            try {
              if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                if (authUser.email?.toLowerCase() === 'geologol@gmail.com' && data.role !== 'admin') {
                  try {
                    await updateDoc(docRef, { role: 'admin' });
                  } catch (e) {
                    console.error("Error auto-updating admin role:", e);
                  }
                  setProfile({ ...data, role: 'admin' });
                } else {
                  setProfile(data);
                }
              } else {
                // Create default profile (e.g. for Google Login where profile wasn't pre-created)
                const newProfile: UserProfile = {
                  uid: authUser.uid,
                  name: authUser.displayName || 'Participante',
                  email: authUser.email || '',
                  role: authUser.email?.toLowerCase() === 'geologol@gmail.com' ? 'admin' : 'participant',
                  totalPoints: 0,
                  avatarEmoji: '⚽' // Default emoji
                };
                await setDoc(docRef, newProfile);
                setProfile(newProfile);
              }
            } catch (error) {
              console.error("Error loading or creating user profile:", error);
            } finally {
              // Set loading false AFTER profile data is actually available or failed
              setLoading(false);
            }
          }, (error) => {
            console.error("Error in profile snapshot:", error);
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
    await signInWithPopup(auth, provider);
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

    // Write user profile to Firestore immediately to prevent race conditions (like name defaulting to 'Participante')
    try {
      const docRef = doc(db, 'users', authUser.uid);
      await setDoc(docRef, {
        uid: authUser.uid,
        name: name,
        email: authUser.email || email,
        role: authUser.email?.toLowerCase() === 'geologol@gmail.com' ? 'admin' : 'participant',
        totalPoints: 0,
        avatarEmoji: '⚽'
      }, { merge: true });
    } catch (e) {
      console.error("Error creating user profile in registration:", e);
    }

    // Try to send verification email but don't fail the registration if it fails
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
