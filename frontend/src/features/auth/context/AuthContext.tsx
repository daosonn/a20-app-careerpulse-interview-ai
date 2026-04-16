import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { apiUrl } from '../../../lib/api';

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
  authenticatedFetch: (
    url: string,
    options?: RequestInit,
    authUser?: User | null,
  ) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const authenticatedFetch = async (
    url: string,
    options: RequestInit = {},
    authUser: User | null = user,
  ) => {
    if (!authUser) {
      throw new Error("User not authenticated");
    }

    const buildHeaders = async (forceRefresh = false) => {
      const token = await authUser.getIdToken(forceRefresh);
      const nextHeaders = new Headers(options.headers);
      nextHeaders.set('Authorization', `Bearer ${token}`);
      return nextHeaders;
    };

    const headers = await buildHeaders();
    
    // Only set Content-Type to application/json if body exists, is not FormData, and not already set
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    let response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      const retryHeaders = await buildHeaders(true);
      if (options.body && !(options.body instanceof FormData) && !retryHeaders.has('Content-Type')) {
        retryHeaders.set('Content-Type', 'application/json');
      }
      response = await fetch(url, { ...options, headers: retryHeaders });
    }

    return response;
  };

  const fetchProfile = async (authUser: User) => {
    try {
      const response = await authenticatedFetch(
        apiUrl('/api/v1/user/profile'),
        {},
        authUser,
      );
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
    if (user) {
      await fetchProfile(user);
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

        await fetchProfile(currentUser);
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
