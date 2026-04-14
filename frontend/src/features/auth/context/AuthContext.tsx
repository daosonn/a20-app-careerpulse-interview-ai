import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../../../lib/firebase';

export interface UserProfile {
  isOnboarded: boolean;
  cvText?: string;
  skills?: string[];
  fullName?: string;
  dob?: string;
  currentPosition?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!user) {
      throw new Error("User not authenticated");
    }
    const token = await user.getIdToken();
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    return fetch(url, { ...options, headers });
  };

  const fetchProfile = async (email: string) => {
    try {
      const response = await authenticatedFetch(`http://127.0.0.1:8000/api/v1/user/profile`);
      if (response.ok) {
        const data = await response.json();
        setProfile({
          isOnboarded: data.onboarded,
          cvText: data.cv_text,
          skills: data.skills,
          fullName: data.full_name,
          dob: data.dob,
          currentPosition: data.current_position
        });
      }
    } catch (error) {
      console.error("Error fetching user profile", error);
    }
  };

  const refreshProfile = async () => {
    if (user?.email) {
      await fetchProfile(user.email);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Ensure user document exists in Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}`);
        }

        if (currentUser.email) {
          await fetchProfile(currentUser.email);
        }
      } else {
        setProfile(null);
      }
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, refreshProfile, authenticatedFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
