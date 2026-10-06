import { createContext, useContext, useEffect, useState } from 'react';

// Create a context for authentication state
const AuthContext = createContext(null);

const TOKEN_KEY = 'zr_admin_token';

// AuthProvider component to wrap the app and provide auth state
// It manages the JWT token and administrator info, and persists the token in localStorage
export function AuthProvider({ children }) {
    // Initialize state for token and administrator info, retrieving the token from localStorage if available
    const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
    const [administrator, setAdministrator] = useState(null);

    // Persist token in localStorage whenever it changes
    useEffect(() => {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
        } else {
            localStorage.removeItem(TOKEN_KEY);
        }
    }, [token]);
// Function to log in and set the token and administrator info
    function login(newToken, administratorInfo) {
        setToken(newToken);
        setAdministrator(administratorInfo ?? null);
    }

    function logout() {
        setToken(null);
        setAdministrator(null);
    }

// Value provided to the context consumers
    const value = {
        token,
        administrator,
        isAuthenticated: Boolean(token),
        login,
        logout,
    };
// Render the AuthContext.Provider with the value and children
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}
// Custom hook to use the AuthContext
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return ctx;
}