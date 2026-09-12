import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext.tsx';
import { useToast } from '../ui/Toast';
import { ShieldCheck, UserCheck, Key, Lock, Mail, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { 
    firebaseUser, 
    userProfile, 
    gym, 
    signInWithGoogle, 
    logout, 
    updateRole, 
    loading, 
    error 
  } = useAuth();

  const [signingIn, setSigningIn] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setSigningIn(true);
      await signInWithGoogle();
      showToast('Successfully authenticated via Google');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Signed out of session');
      onClose();
    } catch (err: any) {
      showToast('Failed to sign out', 'error');
    }
  };

  const handleRoleChange = async (role: 'owner' | 'manager' | 'trainer') => {
    try {
      await updateRole(role);
      showToast(`Operator role updated to ${role.toUpperCase()}`);
    } catch (err: any) {
      showToast('Failed to change role', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="OPERATOR AUTHENTICATION"
      subtitle={`${gym?.name || 'Raw Power Gym'} • Cloud SQL & Firebase Auth`}
      maxWidth="md"
    >
      <div className="flex flex-col gap-5 font-mono text-xs">
        {/* Active Cloud Session Status */}
        <div className="p-3 bg-[#0d0d0f] border border-[#27272a] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider">
              AUTHENTICATION STATUS
            </span>
            {firebaseUser ? (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                <CheckCircle2 size={12} /> CLOUD VERIFIED
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-[#e17100] font-bold">
                <AlertCircle size={12} /> DEMO / LOCAL OPERATOR
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 pt-1">
            <div className="w-10 h-10 bg-[#161618] border border-[#27272a] flex items-center justify-center font-bold text-sm text-[#e17100]">
              {(userProfile?.name || firebaseUser?.displayName || 'K').charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold truncate">
                {userProfile?.name || firebaseUser?.displayName || 'Kiran Kumar'}
              </div>
              <div className="text-[10px] text-[#71717a] truncate">
                {userProfile?.email || firebaseUser?.email || 'kiran@rawpowergym.in'}
              </div>
            </div>
            <span className="text-[10px] text-[#e17100] font-bold border border-[#e17100]/40 px-2 py-0.5">
              {(userProfile?.role || 'OWNER').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Firebase Google Sign-In Action */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold uppercase text-[#71717a] tracking-wider">
            FIREBASE IDENTITY ACCESS
          </div>
          
          {!firebaseUser ? (
            <button
              onClick={handleGoogleLogin}
              disabled={signingIn || loading}
              className="w-full p-3 bg-[#161618] border border-[#e17100] hover:bg-[#e17100] hover:text-black text-white font-bold flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {signingIn ? 'CONNECTING TO GOOGLE AUTH...' : 'SIGN IN WITH GOOGLE'}
            </button>
          ) : (
            <button
              onClick={handleLogout}
              className="w-full p-2.5 bg-[#161618] border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={14} /> SIGN OUT OF CLOUD SESSION
            </button>
          )}
        </div>

        {/* Switch Role Quick Actions */}
        <div className="space-y-2 pt-2 border-t border-[#27272a]">
          <div className="text-[10px] font-bold uppercase text-[#71717a] tracking-wider">
            RBAC ROLE ELEVATION / TEST
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleRoleChange('owner')}
              className={`p-2 border text-center transition-colors ${
                (userProfile?.role || 'owner') === 'owner'
                  ? 'border-[#e17100] bg-[#e17100]/10 text-[#e17100] font-bold'
                  : 'border-[#27272a] bg-[#0d0d0f] text-[#71717a] hover:text-white'
              }`}
            >
              OWNER
            </button>
            <button
              onClick={() => handleRoleChange('manager')}
              className={`p-2 border text-center transition-colors ${
                userProfile?.role === 'manager'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-400 font-bold'
                  : 'border-[#27272a] bg-[#0d0d0f] text-[#71717a] hover:text-white'
              }`}
            >
              MANAGER
            </button>
            <button
              onClick={() => handleRoleChange('trainer')}
              className={`p-2 border text-center transition-colors ${
                userProfile?.role === 'trainer'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400 font-bold'
                  : 'border-[#27272a] bg-[#0d0d0f] text-[#71717a] hover:text-white'
              }`}
            >
              TRAINER
            </button>
          </div>
        </div>

        {/* Close Button */}
        <div className="pt-3 border-t border-[#27272a] flex justify-end">
          <Button variant="secondary" size="md" onClick={onClose}>
            DISMISS
          </Button>
        </div>
      </div>
    </Modal>
  );
};
