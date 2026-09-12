import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  User as FirebaseUser, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut as firebaseSignOut 
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { api } from '../lib/api.ts';
import { Gym, UserProfile } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  gym: Gym | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (role: 'owner' | 'manager' | 'trainer') => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gym, setGym] = useState<Gym | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfileAndGym = async () => {
    if (!auth.currentUser) {
      return;
    }
    try {
      setError(null);
      const data = await api.getMe();
      if (data?.user) {
        setUserProfile({
          id: data.user.userId,
          gymId: data.user.gymId,
          name: data.user.name,
          email: data.user.email || '',
          role: (data.user.role || 'owner').toLowerCase() as any,
          createdAt: new Date().toISOString(),
        });
      }
      if (data?.gym) {
        setGym({
          id: data.gym.id,
          name: data.gym.name,
          phone: data.gym.phone || '',
          email: data.gym.email || '',
          address: data.gym.address || '',
          receiptPrefix: data.gym.receiptPrefix || 'GM-',
          receiptFooter: data.gym.receiptFooter || '',
          upiId: data.gym.upiId || '',
          defaultPaymentMethod: 'UPI',
          currency: data.gym.currency || 'INR',
          createdAt: data.gym.createdAt,
          updatedAt: data.gym.updatedAt,
        });
      }
    } catch (err: any) {
      console.warn('Could not fetch server profile (yet):', err.message);
      setError(err.message);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        await fetchProfileAndGym();
      } else {
        setUserProfile(null);
        setGym(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      await signInWithPopup(auth, googleAuthProvider);
      await fetchProfileAndGym();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setError(err.message || 'Failed to sign in with Google');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setFirebaseUser(null);
      setUserProfile(null);
      setGym(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const updateRole = async (newRole: 'owner' | 'manager' | 'trainer') => {
    try {
      if (auth.currentUser) {
        await api.syncUser({ role: newRole.toUpperCase() });
      }
      setUserProfile((prev) => {
        if (prev) return { ...prev, role: newRole };
        return {
          id: 'operator',
          gymId: gym?.id || 'demo-gym',
          name: 'Demo Operator',
          email: 'demo@rawpowergym.in',
          role: newRole,
          createdAt: new Date().toISOString(),
        };
      });
    } catch (err: any) {
      console.error('Role update error:', err);
      // Still apply to local session for seamless operator testing
      setUserProfile((prev) => prev ? { ...prev, role: newRole } : null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        gym,
        loading,
        error,
        signInWithGoogle,
        logout,
        updateRole,
        refreshProfile: fetchProfileAndGym,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
