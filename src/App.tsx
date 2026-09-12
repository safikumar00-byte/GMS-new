import React, { useState, useEffect, useCallback } from 'react';
import { ToastProvider } from './components/ui/Toast';
import { AuthProvider } from './context/AuthContext.tsx';
import { AppShell, NavView } from './components/layout/AppShell';
import { DashboardView } from './components/dashboard/DashboardView';
import { MembersView } from './components/members/MembersView';
import { PaymentsView } from './components/payments/PaymentsView';
import { PlansView } from './components/plans/PlansView';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ReportsView } from './components/reports/ReportsView';
import { NotificationsView } from './components/notifications/NotificationsView';
import { SettingsView } from './components/settings/SettingsView';

// Modals
import { AddPaymentModal } from './components/payments/AddPaymentModal';
import { ReceiptModal } from './components/payments/ReceiptModal';
import { AddMemberModal } from './components/members/AddMemberModal';
import { RenewMembershipModal } from './components/members/RenewMembershipModal';
import { MemberDetailModal } from './components/members/MemberDetailModal';
import { EditMemberModal } from './components/members/EditMemberModal';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { AuthModal } from './components/auth/AuthModal';

import { Member, Payment, Gym } from './types';
import { getGym, subscribeToStore } from './lib/storage';

export default function App() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [gym, setGym] = useState<Gym>(getGym());
  const [renderTrigger, setRenderTrigger] = useState(0);

  // Modals state
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentPreselectedMemberId, setPaymentPreselectedMemberId] = useState<string | undefined>();

  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [renewTargetMember, setRenewTargetMember] = useState<Member | null>(null);
  const [detailTargetMember, setDetailTargetMember] = useState<Member | null>(null);
  const [editTargetMember, setEditTargetMember] = useState<Member | null>(null);
  const [receiptTargetPayment, setReceiptTargetPayment] = useState<Payment | null>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Subscribe to storage modifications
  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      setRenderTrigger((prev) => prev + 1);
      setGym(getGym());
    });
    return () => unsubscribe();
  }, []);

  const handleOpenAddPayment = useCallback((memberId?: string) => {
    setPaymentPreselectedMemberId(memberId);
    setIsAddPaymentOpen(true);
  }, []);

  const handleOpenRenew = useCallback((member: Member) => {
    setRenewTargetMember(member);
  }, []);

  const handleOpenMemberDetail = useCallback((member: Member) => {
    setDetailTargetMember(member);
  }, []);

  const handleOpenEditMember = useCallback((member: Member) => {
    setEditTargetMember(member);
  }, []);

  const handleOpenReceipt = useCallback((payment: Payment) => {
    setReceiptTargetPayment(payment);
  }, []);

  return (
    <AuthProvider>
      <ToastProvider>
        <AppShell
          currentView={currentView}
          onNavigate={setCurrentView}
          onAddPaymentClick={() => handleOpenAddPayment()}
          onOpenSearch={() => setIsSearchOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
        >
        {/* Render current view */}
        {currentView === 'dashboard' && (
          <DashboardView
            onAddPaymentClick={handleOpenAddPayment}
            onRenewClick={handleOpenRenew}
            onViewMemberClick={handleOpenMemberDetail}
            onViewReceiptClick={handleOpenReceipt}
          />
        )}

        {currentView === 'members' && (
          <MembersView
            onAddMemberClick={() => setIsAddMemberOpen(true)}
            onViewMemberClick={handleOpenMemberDetail}
            onAddPaymentClick={handleOpenAddPayment}
            onRenewClick={handleOpenRenew}
            onEditClick={handleOpenEditMember}
          />
        )}

        {currentView === 'payments' && (
          <PaymentsView
            onAddPaymentClick={() => handleOpenAddPayment()}
            onViewReceiptClick={handleOpenReceipt}
          />
        )}

        {currentView === 'plans' && <PlansView />}

        {currentView === 'expenses' && <ExpensesView />}

        {currentView === 'reports' && <ReportsView />}

        {currentView === 'notifications' && (
          <NotificationsView
            onAddPaymentClick={handleOpenAddPayment}
            onRenewClick={handleOpenRenew}
          />
        )}

        {currentView === 'settings' && <SettingsView />}

        {/* Global Modals */}
        {isAddPaymentOpen && (
          <AddPaymentModal
            isOpen={isAddPaymentOpen}
            onClose={() => {
              setIsAddPaymentOpen(false);
              setPaymentPreselectedMemberId(undefined);
            }}
            preselectedMemberId={paymentPreselectedMemberId}
          />
        )}

        {isAddMemberOpen && (
          <AddMemberModal
            isOpen={isAddMemberOpen}
            onClose={() => setIsAddMemberOpen(false)}
          />
        )}

        {renewTargetMember && (
          <RenewMembershipModal
            isOpen={!!renewTargetMember}
            onClose={() => setRenewTargetMember(null)}
            member={renewTargetMember}
          />
        )}

        {detailTargetMember && (
          <MemberDetailModal
            isOpen={!!detailTargetMember}
            onClose={() => setDetailTargetMember(null)}
            member={detailTargetMember}
            onAddPayment={handleOpenAddPayment}
            onRenewMembership={handleOpenRenew}
            onEditMember={handleOpenEditMember}
          />
        )}

        {editTargetMember && (
          <EditMemberModal
            isOpen={!!editTargetMember}
            onClose={() => setEditTargetMember(null)}
            member={editTargetMember}
          />
        )}

        {receiptTargetPayment && (
          <ReceiptModal
            isOpen={!!receiptTargetPayment}
            onClose={() => setReceiptTargetPayment(null)}
            payment={receiptTargetPayment}
            gym={gym}
          />
        )}

        {isSearchOpen && (
          <GlobalSearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
            onSelectMember={(m) => {
              setIsSearchOpen(false);
              handleOpenMemberDetail(m);
            }}
            onSelectReceipt={(p) => {
              setIsSearchOpen(false);
              handleOpenReceipt(p);
            }}
          />
        )}

        {isAuthOpen && (
          <AuthModal
            isOpen={isAuthOpen}
            onClose={() => setIsAuthOpen(false)}
          />
        )}
      </AppShell>
    </ToastProvider>
    </AuthProvider>
  );
}
