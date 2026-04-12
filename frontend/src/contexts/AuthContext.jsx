import { createContext, useContext, useState, useEffect } from 'react';

const UserContext = createContext(undefined);

export function UserProvider({ children }) {
  // User lưu vào localStorage để persist qua reload
  const [user, setUserState] = useState(() => {
    try {
      const saved = localStorage.getItem('cp_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const signIn = (userData) => {
    // userData: { name, email }
    const fullUser = {
      ...userData,
      uid: localStorage.getItem('cp_uid') || crypto.randomUUID(),
    };
    localStorage.setItem('cp_user', JSON.stringify(fullUser));
    localStorage.setItem('cp_uid', fullUser.uid);
    setUserState(fullUser);
  };

  const logout = () => {
    localStorage.removeItem('cp_user');
    setUserState(null);
  };

  return (
    <UserContext.Provider value={{ user, signIn, logout, loading: false }}>
      {children}
    </UserContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within a UserProvider');
  }
  return context;
}
