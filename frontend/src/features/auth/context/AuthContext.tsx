import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { apiUrl } from '../../../lib/api';

export interface UserProfile {
  isOnboarded: boolean;
  cvText?: string;
  skills?: string[];
  tools?: string[];
  projects?: any[];
  fullName?: string;
  dob?: string;
  currentPosition?: string;
  education?: Array<{
    id: number;
    school: string;
    degree: string;
    field: string;
    year: string;
  }>;
  preferences?: {
    preferred_language: string;
    difficulty: string;
    ai_persona: string;
    availability: string;
    default_interview_type: string;
    stress_test_default: boolean;
    auto_read_questions: boolean;
    questions_per_session: number;
  };
  settings?: {
    ui_language: string;
    theme: string;
    email_reminders: boolean;
    ai_suggestions: boolean;
    security_alerts: boolean;
    public_profile: boolean;
    anonymous_practice: boolean;
  };
}

const normalizeUserProfile = (data: any): UserProfile => {
  const profileData = data?.profile || data || {};
  return {
    isOnboarded: Boolean(profileData.onboarded),
    cvText: profileData.cv_text,
    skills: Array.isArray(profileData.skills) ? profileData.skills : [],
    tools: Array.isArray(profileData.tools) ? profileData.tools : [],
    projects: Array.isArray(profileData.projects) ? profileData.projects : [],
    fullName: profileData.full_name,
    dob: profileData.dob,
    currentPosition: profileData.current_position,
    education: Array.isArray(data?.education) ? data.education : [],
    preferences: data?.preferences,
    settings: data?.settings,
  };
};

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

  const authenticatedFetch = useCallback(async (
    url: string,
    options: RequestInit = {},
    authUser: User | null = auth.currentUser,
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
  }, []);

  const fetchProfile = useCallback(async (authUser: User) => {
    try {
      let response = await authenticatedFetch(
        apiUrl('/api/v1/user/me'),
        {},
        authUser,
      );

      if (!response.ok) {
        console.warn(`Profile bundle request failed with ${response.status}; falling back to basic profile.`);
        response = await authenticatedFetch(
          apiUrl('/api/v1/user/profile'),
          {},
          authUser,
        );
      }

      if (!response.ok) {
        const detail = await response.text().catch(() => '');
        throw new Error(`Profile request failed with ${response.status}: ${detail}`);
      }

      const data = await response.json();
      setProfile(normalizeUserProfile(data));
    } catch (error) {
      console.error("Error fetching user profile", error);
      setProfile(null);
    }
  }, [authenticatedFetch]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user);
    }
  }, [fetchProfile, user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // Non-blocking Firestore check
        const userRef = doc(db, 'users', currentUser.uid);
        getDoc(userRef).then(async (userSnap) => {
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              createdAt: new Date().toISOString(),
            }).catch(err => console.error("Firestore sync error", err));
          }
        }).catch(err => console.error("Firestore fetch error", err));

        setUser(currentUser);
        // Fetch backend profile before unlocking to prevent routing flicker
        await fetchProfile(currentUser).catch(err => {
          console.error("Profile fetch error:", err);
        });
        setLoading(false);
      } else {
        setProfile(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
      throw error;
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      user,
      profile,
      loading,
      signInWithGoogle,
      logout,
      refreshProfile,
      authenticatedFetch,
    }),
    [user, profile, loading, signInWithGoogle, logout, refreshProfile, authenticatedFetch],
  );

  return (
    <AuthContext.Provider value={contextValue}>
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
