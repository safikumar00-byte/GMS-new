import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Member, MembershipPlan, PaymentMethod } from '../../types';
import { getPlans, addMemberWithDetails, getNextMemberId, getGym } from '../../lib/storage';
import { formatINR, getTodayString, addMonthsToDate } from '../../lib/calculations';
import { useToast } from '../ui/Toast';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const plans = getPlans();
  const gym = getGym();

  // Personal Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Membership
  const [planId, setPlanId] = useState('');
  const [startDate, setStartDate] = useState(getTodayString());
  const [discount, setDiscount] = useState<number>(0);

  // Initial Payment
  const [initialPaymentAmount, setInitialPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isLoading, setIsLoading] = useState(false);

  const nextMemberId = useMemo(() => getNextMemberId(), [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setPhone('');
      setEmail('');
      setGender('Male');
      setDateOfBirth('');
      setAddress('');
      setEmergencyContact('');
      setNotes('');
      setStartDate(getTodayString());
      setDiscount(0);
      setPaymentMethod(gym.defaultPaymentMethod || 'UPI');
      if (plans.length > 0) {
        setPlanId(plans[0].id);
      }
    }
  }, [isOpen, gym.defaultPaymentMethod]);

  const selectedPlan = useMemo(() => {
    return plans.find((p) => p.id === planId) || plans[0];
  }, [plans, planId]);

  const totalFee = selectedPlan?.price || 0;
  const finalAmount = Math.max(0, totalFee - (discount || 0));

  const expiryDate = useMemo(() => {
    if (!selectedPlan) return getTodayString();
    return addMonthsToDate(startDate, selectedPlan.durationMonths);
  }, [startDate, selectedPlan]);

  // Default initial payment to final amount
  useEffect(() => {
    if (finalAmount > 0 && !initialPaymentAmount) {
      setInitialPaymentAmount(finalAmount.toString());
    }
  }, [finalAmount]);

  const remainingAmount = Math.max(
    0,
    finalAmount - (parseFloat(initialPaymentAmount) || 0)
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Member name and phone number are required', 'error');
      return;
    }

    if (!selectedPlan) {
      showToast('Please select a membership plan', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payAmt = parseFloat(initialPaymentAmount) || 0;
      addMemberWithDetails(
        {
          memberId: nextMemberId,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          gender,
          dateOfBirth,
          address: address.trim(),
          emergencyContact: emergencyContact.trim(),
          joinedDate: startDate,
          status: payAmt >= finalAmount ? 'ACTIVE' : 'PAYMENT PENDING',
          notes: notes.trim(),
        },
        selectedPlan.id,
        startDate,
        discount,
        payAmt,
        paymentMethod
      );

      setIsLoading(false);
      showToast(`Member ${name} added with ID ${nextMemberId}!`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Failed to add member', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="+ ADD MEMBER"
      subtitle={`Auto-assigning ID: ${nextMemberId}`}
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6 font-mono text-xs">
        {/* Section 1: Personal Information */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#e17100] border-b border-[#27272a] pb-1.5">
            1. PERSONAL INFORMATION
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">FULL NAME *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rahul Kumar"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">PHONE NUMBER *</label>
              <input
                type="tel"
                required
                placeholder="e.g. 9845012345"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">EMAIL</label>
              <input
                type="email"
                placeholder="e.g. rahul.kumar@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">GENDER</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">ADDRESS</label>
              <input
                type="text"
                placeholder="e.g. Flat 302, Green Glen Layout, Bellandur, Bengaluru"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">
                EMERGENCY CONTACT (NAME & PHONE)
              </label>
              <input
                type="text"
                placeholder="e.g. Sunita Kumar (Mother) - 9845099999"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Membership Details */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#e17100] border-b border-[#27272a] pb-1.5">
            2. MEMBERSHIP PLAN
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">SELECT PLAN *</label>
              <select
                value={planId}
                onChange={(e) => {
                  setPlanId(e.target.value);
                  const p = plans.find((pl) => pl.id === e.target.value);
                  if (p) setInitialPaymentAmount(p.price.toString());
                }}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatINR(p.price)} ({p.durationMonths} Mo)
                  </option>
                ))}
              </select>
            </div>
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
          </div>

          <div className="p-3 bg-[#0d0d0f] border border-[#27272a] flex justify-between items-center text-xs">
            <span className="text-[#71717a]">FINAL MEMBERSHIP FEE:</span>
            <span className="text-white font-bold text-sm">{formatINR(finalAmount)}</span>
          </div>
        </div>

        {/* Section 3: Initial Payment */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#e17100] border-b border-[#27272a] pb-1.5">
            3. INITIAL PAYMENT
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">AMOUNT PAID NOW (₹)</label>
              <input
                type="number"
                min="0"
                max={finalAmount}
                value={initialPaymentAmount}
                onChange={(e) => setInitialPaymentAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-white font-bold focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">PAYMENT METHOD</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-[#0d0d0f] border border-[#27272a] flex justify-between items-center text-xs">
            <span className="text-[#71717a]">REMAINING BALANCE (PENDING):</span>
            <span
              className={`font-bold ${
                remainingAmount > 0 ? 'text-[#e17100]' : 'text-emerald-500'
              }`}
            >
              {remainingAmount === 0 ? 'PAID IN FULL' : formatINR(remainingAmount)}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#27272a] flex justify-end gap-2">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            CANCEL
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            REGISTER MEMBER
          </Button>
        </div>
      </form>
    </Modal>
  );
};
