import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * @typedef {Object} AuthContextValue
 * @property {Object | null} user
 * @property {string | null} token
 * @property {(newToken: string, newUser: Object) => void} login
 * @property {() => void} logout
 * @property {boolean} isAuthenticated
 */

const AuthContext = createContext(/** @type {AuthContextValue | undefined} */ (undefined));

/**
 * @param {{ children: React.ReactNode }} props
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(/** @type {Object | null} */ (null));
  const [token, setToken] = useState(/** @type {string | null} */ (localStorage.getItem('token')));

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Failed to parse user from localStorage", e);
      }
    }
  }, []);

  /**
   * @param {string} newToken
   * @param {Object} newUser
   */
  const login = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
