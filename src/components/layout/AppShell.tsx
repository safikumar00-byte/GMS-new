import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  Layers, 
  DollarSign, 
  BarChart3, 
  Bell, 
  Settings, 
  Plus, 
  Search, 
  LogOut, 
  Menu, 
  X,
  Dumbbell
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Gym, User } from '../../types';
import { getGym, getUser, getNotifications } from '../../lib/storage';

export type NavView = 
  | 'dashboard'
  | 'members'
  | 'payments'
  | 'plans'
  | 'expenses'
  | 'reports'
  | 'notifications'
  | 'settings';

interface AppShellProps {
  currentView: NavView;
  onNavigate: (view: NavView) => void;
  onAddPaymentClick: () => void;
  onOpenSearch: () => void;
  onOpenAuth: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentView,
  onNavigate,
  onAddPaymentClick,
  onOpenSearch,
  onOpenAuth,
  children,
}) => {
  const [gym, setGym] = useState<Gym>(getGym());
  const [user, setUser] = useState<User>(getUser());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notifications = getNotifications();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Listen for storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setGym(getGym());
      setUser(getUser());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch]);

  const navItems: { id: NavView; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'members', label: 'Members', icon: <Users size={15} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={15} /> },
    { id: 'plans', label: 'Plans', icon: <Layers size={15} /> },
    { id: 'expenses', label: 'Expenses', icon: <DollarSign size={15} /> },
    { id: 'reports', label: 'Reports', icon: <BarChart3 size={15} /> },
    { id: 'notifications', label: 'Notifications', icon: <Bell size={15} />, badge: unreadCount },
    { id: 'settings', label: 'Settings', icon: <Settings size={15} /> },
  ];

  const handleNavClick = (view: NavView) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  return (
    <div className="bg-[#0a0a0b] text-[#d4d4d8] w-full min-h-screen flex font-mono selection:bg-[#e17100] selection:text-white">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-64 border-r border-[#27272a] flex-col justify-between p-4 bg-[#0a0a0b] shrink-0">
        <div className="flex flex-col gap-6">
          {/* Gym Brand Identity */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-8 h-8 bg-[#161618] border border-[#27272a] flex items-center justify-center font-bold text-sm text-[#e17100]">
              <Dumbbell size={16} />
            </div>
            <div className="overflow-hidden">
              <div className="text-sm font-bold tracking-tight text-white uppercase truncate">
                {gym.name}
              </div>
              <div className="text-[9px] text-[#71717a] tracking-wider uppercase font-bold">
                COMMERCIAL SAAS
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <Button
            variant="primary"
            size="md"
            onClick={onAddPaymentClick}
            className="w-full gap-2 shadow-md shadow-[#e17100]/20 text-xs"
          >
            <Plus size={15} />
            <span>+ ADD PAYMENT</span>
          </Button>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1">
            <div className="px-2 text-[9px] font-bold text-[#71717a] tracking-widest uppercase mb-1">
              NAVIGATION
            </div>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center justify-between px-3 py-2 text-xs transition-colors text-left ${
                    isActive
                      ? 'bg-[#161618] text-white font-bold border-l-2 border-[#e17100]'
                      : 'text-[#a1a1aa] hover:text-white hover:bg-[#161618]/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#e17100]' : 'text-[#71717a]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="px-1.5 py-0.2 bg-[#e17100] text-white text-[9px] font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Operator Section */}
        <div className="pt-4 border-t border-[#27272a] flex items-center justify-between px-1">
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity text-left"
          >
            <div className="w-7 h-7 bg-[#161618] border border-[#27272a] flex items-center justify-center text-xs font-bold text-white">
              {user.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate max-w-[110px]">
                {user.name}
              </div>
              <div className="text-[10px] text-[#71717a]">{user.role}</div>
            </div>
          </button>

          <button
            onClick={onOpenAuth}
            title="Switch Account / Lock"
            className="text-[#71717a] hover:text-white p-1 transition-colors"
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[80vw] bg-[#0a0a0b] border-r border-[#27272a] p-4 flex flex-col justify-between z-10">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 bg-[#161618] border border-[#27272a] flex items-center justify-center font-bold text-xs text-[#e17100]">
                    GM
                  </div>
                  <span className="font-bold text-white text-xs">{gym.name}</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-[#71717a] hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onAddPaymentClick();
                }}
                className="w-full gap-2 text-xs"
              >
                <Plus size={15} />
                <span>+ ADD PAYMENT</span>
              </Button>

              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                      currentView === item.id
                        ? 'bg-[#161618] text-white font-bold border-l-2 border-[#e17100]'
                        : 'text-[#a1a1aa] hover:text-white hover:bg-[#161618]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-1.5 py-0.5 bg-[#e17100] text-white text-[9px] font-bold">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#27272a] flex items-center justify-between">
              <div className="text-xs">
                <div className="font-bold text-white">{user.name}</div>
                <div className="text-[10px] text-[#71717a]">{user.role}</div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="text-[#71717a] hover:text-white text-xs"
              >
                SWITCH
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#0a0a0b] overflow-y-auto">
        {/* Top Navbar */}
        <header className="h-14 border-b border-[#27272a] flex items-center justify-between px-4 sm:px-6 bg-[#0a0a0b]/90 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-[#71717a] hover:text-white border border-[#27272a]"
              aria-label="Toggle navigation"
            >
              <Menu size={16} />
            </button>

            {/* Global Quick Search Input */}
            <button
              onClick={onOpenSearch}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#161618] border border-[#27272a] hover:border-[#71717a] transition-colors text-xs text-[#71717a] rounded-none w-56 sm:w-72 justify-between"
            >
              <div className="flex items-center gap-2 truncate">
                <Search size={13} className="shrink-0" />
                <span className="truncate">Search members, receipts...</span>
              </div>
              <span className="text-[9px] text-[#71717a] border border-[#27272a] px-1 py-0.2 shrink-0 hidden sm:inline">
                Ctrl+K
              </span>
            </button>
          </div>

          {/* Right Header Utilities */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => onNavigate('notifications')}
              className="relative p-2 text-[#71717a] hover:text-white hover:bg-[#161618] transition-colors border border-transparent hover:border-[#27272a]"
              title="Notifications"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#e17100]" />
              )}
            </button>

            <button
              onClick={() => onNavigate('settings')}
              className="p-2 text-[#71717a] hover:text-white hover:bg-[#161618] transition-colors border border-transparent hover:border-[#27272a] hidden sm:block"
              title="Settings"
            >
              <Settings size={16} />
            </button>

            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 pl-2 border-l border-[#27272a] hover:opacity-80 transition-opacity"
            >
              <div className="w-7 h-7 bg-[#161618] border border-[#27272a] flex items-center justify-center font-bold text-xs text-[#e17100]">
                {user.name.charAt(0)}
              </div>
              <span className="text-xs font-bold text-white hidden md:inline truncate max-w-[120px]">
                {user.name}
              </span>
            </button>
          </div>
        </header>

        {/* Inner Page View */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
