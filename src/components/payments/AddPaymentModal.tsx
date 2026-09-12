import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Member, Membership, Payment, PaymentMethod, Gym } from '../../types';
import { 
  getMembers, 
  getMemberActiveMembership, 
  getPayments, 
  addPayment, 
  getGym 
} from '../../lib/storage';
import { formatINR, formatDate, calculatePendingAmount, getTodayString } from '../../lib/calculations';
import { useToast } from '../ui/Toast';
import { ReceiptModal } from './ReceiptModal';
import { Search, CheckCircle2, User, CreditCard } from 'lucide-react';

interface AddPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedMemberId?: string;
  onPaymentSuccess?: (payment: Payment) => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({
  isOpen,
  onClose,
  preselectedMemberId,
  onPaymentSuccess,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(getTodayString());
  const [isLoading, setIsLoading] = useState(false);
  const [recordedPayment, setRecordedPayment] = useState<Payment | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const gym: Gym = getGym();
  const allMembers = getMembers();

  useEffect(() => {
    if (isOpen) {
      if (preselectedMemberId) {
        setSelectedMemberId(preselectedMemberId);
      } else {
        setSelectedMemberId('');
      }
      setSearchTerm('');
      setAmount('');
      setNotes('');
      setPaymentMethod(gym.defaultPaymentMethod || 'UPI');
      setPaymentDate(getTodayString());
      setRecordedPayment(null);
      setShowReceipt(false);
    }
  }, [isOpen, preselectedMemberId, gym.defaultPaymentMethod]);

  const selectedMember = useMemo(() => {
    return allMembers.find((m) => m.id === selectedMemberId);
  }, [allMembers, selectedMemberId]);

  const currentMembership = useMemo(() => {
    if (!selectedMember) return null;
    return getMemberActiveMembership(selectedMember.id);
  }, [selectedMember]);

  const financialSummary = useMemo(() => {
    if (!currentMembership) return { totalFee: 0, paid: 0, pending: 0 };
    const payments = getPayments().filter(
      (p) => p.membershipId === currentMembership.id && p.status !== 'Refunded'
    );
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const pending = calculatePendingAmount(currentMembership.finalAmount, totalPaid);
    return {
      totalFee: currentMembership.finalAmount,
      paid: totalPaid,
      pending,
    };
  }, [currentMembership]);

  // If member has pending amount, default input amount to the pending amount
  useEffect(() => {
    if (selectedMember && currentMembership && financialSummary.pending > 0 && !amount) {
      setAmount(financialSummary.pending.toString());
    }
  }, [selectedMember, currentMembership, financialSummary.pending, amount]);

  const filteredMembers = useMemo(() => {
    if (!searchTerm.trim()) return allMembers.slice(0, 8);
    const query = searchTerm.toLowerCase();
    return allMembers.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.memberId.toLowerCase().includes(query) ||
        m.phone.includes(query)
    ).slice(0, 10);
  }, [allMembers, searchTerm]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !currentMembership) {
      showToast('Please select a member with an active membership plan', 'error');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a valid payment amount', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const newPayment = addPayment({
        memberId: selectedMember.id,
        membershipId: currentMembership.id,
        amount: numAmount,
        paymentDate,
        paymentMethod,
        notes,
      });

      setIsLoading(false);
      setRecordedPayment(newPayment);
      showToast(`Payment of ${formatINR(numAmount)} recorded successfully!`);
      if (onPaymentSuccess) {
        onPaymentSuccess(newPayment);
      }
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Unable to save payment', 'error');
    }
  };

  const paymentMethods: PaymentMethod[] = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Other'];

  return (
    <>
      <Modal
        isOpen={isOpen && !showReceipt}
        onClose={onClose}
        title={recordedPayment ? 'PAYMENT RECORDED' : '+ ADD PAYMENT'}
        subtitle={
          recordedPayment
            ? `Receipt #${recordedPayment.receiptNumber}`
            : 'Fast collection & receipt generation'
        }
        maxWidth="lg"
      >
        {recordedPayment ? (
          /* Payment Success State */
          <div className="flex flex-col gap-6 font-mono">
            <div className="p-6 bg-[#0d0d0f] border border-[#27272a] text-center space-y-3">
              <div className="w-12 h-12 bg-[#e17100]/20 border border-[#e17100] text-[#e17100] flex items-center justify-center mx-auto">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {formatINR(recordedPayment.amount)}
              </h3>
              <p className="text-xs text-[#a1a1aa]">
                Successfully collected from <span className="text-white font-semibold">{selectedMember?.name}</span>
              </p>
              <div className="inline-block px-3 py-1 bg-[#161618] border border-[#27272a] text-xs text-[#e17100] font-mono">
                Receipt #{recordedPayment.receiptNumber}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                size="md"
                onClick={() => setShowReceipt(true)}
                className="w-full"
              >
                VIEW RECEIPT
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={onClose}
                className="w-full"
              >
                DONE
              </Button>
            </div>
          </div>
        ) : (
          /* Payment Input Workflow */
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-mono text-xs">
            {/* Step 1: Member Selection */}
            {!selectedMember ? (
              <div className="space-y-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest text-[#71717a]">
                  1. SEARCH & SELECT MEMBER
                </label>
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]"
                  />
                  <input
                    type="text"
                    placeholder="Search by name, phone (e.g. 98450) or ID (GM-001)..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100] font-mono text-xs"
                    autoFocus
                  />
                </div>

                <div className="border border-[#27272a] max-h-56 overflow-y-auto divide-y divide-[#27272a] bg-[#0d0d0f]">
                  {filteredMembers.length === 0 ? (
                    <div className="p-4 text-center text-[#71717a]">No matching members found</div>
                  ) : (
                    filteredMembers.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => {
                          setSelectedMemberId(m.id);
                          setSearchTerm('');
                        }}
                        className="p-3 flex items-center justify-between hover:bg-[#161618] cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-[#1e1e21] border border-[#27272a] flex items-center justify-center text-[10px] font-bold text-[#e17100]">
                            {m.memberId.replace('GM-', '')}
                          </div>
                          <div>
                            <div className="text-white font-medium">{m.name}</div>
                            <div className="text-[10px] text-[#71717a]">{m.phone}</div>
                          </div>
                        </div>
                        <span className="text-[10px] text-[#e17100] uppercase">SELECT →</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Selected Member Card */
              <div className="p-3.5 bg-[#0d0d0f] border border-[#27272a] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#1e1e21] border border-[#27272a] flex items-center justify-center text-xs font-bold text-[#e17100]">
                    {selectedMember.memberId}
                  </div>
                  <div>
                    <div className="text-white font-bold">{selectedMember.name}</div>
                    <div className="text-[11px] text-[#71717a]">{selectedMember.phone}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMemberId('');
                    setAmount('');
                  }}
                  className="text-[11px] text-[#e17100] hover:underline"
                >
                  CHANGE
                </button>
              </div>
            )}

            {/* Step 2: Current Membership Overview */}
            {selectedMember && (
              <div className="p-3.5 bg-[#0d0d0f] border border-[#27272a] space-y-3">
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#71717a] flex justify-between">
                  <span>CURRENT MEMBERSHIP</span>
                  <span className="text-white">{currentMembership?.planName || 'No Active Plan'}</span>
                </div>

                {currentMembership ? (
                  <>
                    <div className="text-[11px] text-[#a1a1aa]">
                      Validity: {formatDate(currentMembership.startDate)} —{' '}
                      {formatDate(currentMembership.expiryDate)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-center">
                      <div className="p-2 bg-[#161618] border border-[#27272a]">
                        <div className="text-[9px] text-[#71717a] uppercase">TOTAL FEE</div>
                        <div className="text-white font-bold text-xs mt-0.5">
                          {formatINR(financialSummary.totalFee)}
                        </div>
                      </div>
                      <div className="p-2 bg-[#161618] border border-[#27272a]">
                        <div className="text-[9px] text-[#71717a] uppercase">PAID</div>
                        <div className="text-emerald-500 font-bold text-xs mt-0.5">
                          {formatINR(financialSummary.paid)}
                        </div>
                      </div>
                      <div className="p-2 bg-[#161618] border border-[#27272a]">
                        <div className="text-[9px] text-[#71717a] uppercase">PENDING</div>
                        <div
                          className={`font-bold text-xs mt-0.5 ${
                            financialSummary.pending > 0 ? 'text-[#e17100]' : 'text-[#71717a]'
                          }`}
                        >
                          {financialSummary.pending === 0 ? 'PAID' : formatINR(financialSummary.pending)}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-amber-500 text-xs">
                    This member has no active membership plan. Please assign or renew a membership first.
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Payment Details */}
            {selectedMember && currentMembership && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                    PAYMENT AMOUNT (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white font-bold text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full pl-8 pr-3 py-2.5 bg-[#0d0d0f] border border-[#27272a] text-white font-bold text-sm focus:outline-none focus:border-[#e17100]"
                    />
                  </div>
                  {financialSummary.pending > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(financialSummary.pending.toString())}
                      className="text-[10px] text-[#e17100] hover:underline"
                    >
                      Fill pending due: {formatINR(financialSummary.pending)}
                    </button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                    PAYMENT METHOD *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {paymentMethods.map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`px-2 py-2 text-center text-[10px] uppercase font-bold border transition-colors ${
                          paymentMethod === method
                            ? 'bg-[#e17100] text-white border-[#e17100]'
                            : 'bg-[#0d0d0f] text-[#a1a1aa] border-[#27272a] hover:border-[#71717a]'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                      PAYMENT DATE
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                      NOTES (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UPI Ref #402910..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#27272a] flex justify-end gap-2">
                  <Button type="button" variant="secondary" size="md" onClick={onClose}>
                    CANCEL
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isLoading}
                    disabled={!amount || parseFloat(amount) <= 0}
                  >
                    SAVE PAYMENT
                  </Button>
                </div>
              </>
            )}
          </form>
        )}
      </Modal>

      {/* Instant Receipt Preview Modal */}
      {showReceipt && recordedPayment && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => {
            setShowReceipt(false);
            onClose();
          }}
          payment={recordedPayment}
          member={selectedMember}
          membership={currentMembership}
          gym={gym}
        />
      )}
    </>
  );
};
