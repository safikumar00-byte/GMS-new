import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Member, Membership, PaymentMethod } from '../../types';
import { getPlans, renewMembership, getMemberActiveMembership, getGym } from '../../lib/storage';
import { formatINR, getTodayString, addMonthsToDate } from '../../lib/calculations';
import { useToast } from '../ui/Toast';

interface RenewMembershipModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSuccess?: () => void;
}

export const RenewMembershipModal: React.FC<RenewMembershipModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const plans = getPlans();
  const gym = getGym();

  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [discount, setDiscount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isLoading, setIsLoading] = useState(false);

  const activeMembership = useMemo(() => {
    if (!member) return null;
    return getMemberActiveMembership(member.id);
  }, [member]);

  useEffect(() => {
    if (isOpen && member) {
      // If member has an active membership, default start date to the day after expiry if still future
      if (activeMembership) {
        const expDate = new Date(activeMembership.expiryDate);
        const today = new Date(getTodayString());
        if (expDate >= today) {
          const nextDay = new Date(expDate);
          nextDay.setDate(nextDay.getDate() + 1);
          setStartDate(nextDay.toISOString().split('T')[0]);
        } else {
          setStartDate(getTodayString());
        }
        setPlanId(activeMembership.planId);
      } else if (plans.length > 0) {
        setStartDate(getTodayString());
        setPlanId(plans[0].id);
      }
      setDiscount(0);
      setPaymentMethod(gym.defaultPaymentMethod || 'UPI');
    }
  }, [isOpen, member, activeMembership, gym.defaultPaymentMethod]);

  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.id === planId) || plans[0];
  }, [plans, planId]);

  const totalFee = selectedPlan?.price || 0;
  const finalAmount = Math.max(0, totalFee - (discount || 0));

  const expiryDate = useMemo(() => {
    if (!selectedPlan) return getTodayString();
    return addMonthsToDate(startDate, selectedPlan.durationMonths);
  }, [startDate, selectedPlan]);

  useEffect(() => {
    if (finalAmount > 0 && !paymentAmount) {
      setPaymentAmount(finalAmount.toString());
    }
  }, [finalAmount]);

  if (!member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) {
      showToast('Please select a membership plan', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payAmt = parseFloat(paymentAmount) || 0;
      renewMembership(
        member.id,
        selectedPlan.id,
        startDate,
        discount,
        payAmt,
        paymentMethod
      );

      setIsLoading(false);
      showToast(`Membership renewed for ${member.name}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Renewal failed', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RENEW MEMBERSHIP"
      subtitle={`${member.name} (${member.memberId})`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 font-mono text-xs">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-[#71717a] uppercase">SELECT PLAN *</label>
          <select
            value={planId}
            onChange={(e) => {
              setPlanId(e.target.value);
              const p = plans.find((pl) => pl.id === e.target.value);
              if (p) setPaymentAmount(p.price.toString());
            }}
            className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {formatINR(p.price)} ({p.durationMonths} Months)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">START DATE *</label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">EXPIRY DATE (AUTO)</label>
            <input
              type="date"
              readOnly
              value={expiryDate}
              className="w-full px-3 py-2 bg-[#161618] border border-[#27272a] text-[#a1a1aa] cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">DISCOUNT (₹)</label>
            <input
              type="number"
              min="0"
              value={discount}
              onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">FINAL AMOUNT</label>
            <div className="px-3 py-2 bg-[#161618] border border-[#27272a] text-white font-bold">
              {formatINR(finalAmount)}
            </div>
          </div>
        </div>

        <div className="p-3 bg-[#0d0d0f] border border-[#27272a] space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#e17100]">
            PAYMENT DETAILS
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">AMOUNT PAID (₹)</label>
              <input
                type="number"
                min="0"
                max={finalAmount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#161618] border border-[#27272a] text-white font-bold focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">PAYMENT METHOD</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#161618] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#27272a] flex justify-end gap-2">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            CANCEL
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            CONFIRM RENEWAL
          </Button>
        </div>
      </form>
    </Modal>
  );
};
