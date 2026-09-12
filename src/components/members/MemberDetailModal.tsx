import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Member, Payment, Membership, Gym } from '../../types';
import { 
  getMemberActiveMembership, 
  getMemberMembershipHistory, 
  getPayments, 
  getGym 
} from '../../lib/storage';
import { formatINR, formatDate, calculatePendingAmount } from '../../lib/calculations';
import { ReceiptModal } from '../payments/ReceiptModal';
import { CreditCard, Calendar, Phone, Mail, MapPin, AlertCircle, History, Receipt } from 'lucide-react';

interface MemberDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onAddPayment: (memberId: string) => void;
  onRenewMembership: (member: Member) => void;
  onEditMember: (member: Member) => void;
}

export const MemberDetailModal: React.FC<MemberDetailModalProps> = ({
  isOpen,
  onClose,
  member,
  onAddPayment,
  onRenewMembership,
  onEditMember,
}) => {
  const [selectedReceiptPayment, setSelectedReceiptPayment] = useState<Payment | null>(null);
  const gym: Gym = getGym();

  const activeMembership = useMemo(() => {
    if (!member) return null;
    return getMemberActiveMembership(member.id);
  }, [member]);

  const membershipHistory = useMemo(() => {
    if (!member) return [];
    return getMemberMembershipHistory(member.id);
  }, [member]);

  const payments = useMemo(() => {
    if (!member) return [];
    return getPayments()
      .filter((p) => p.memberId === member.id)
      .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [member]);

  const financialStats = useMemo(() => {
    if (!activeMembership) return { totalFee: 0, paid: 0, pending: 0 };
    const paid = payments
      .filter((p) => p.membershipId === activeMembership.id && p.status !== 'Refunded')
      .reduce((sum, p) => sum + p.amount, 0);
    const pending = calculatePendingAmount(activeMembership.finalAmount, paid);
    return {
      totalFee: activeMembership.finalAmount,
      paid,
      pending,
    };
  }, [activeMembership, payments]);

  if (!member) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !selectedReceiptPayment}
        onClose={onClose}
        title={`${member.name}`}
        subtitle={`${member.memberId} • Joined ${formatDate(member.joinedDate)}`}
        maxWidth="2xl"
      >
        <div className="flex flex-col gap-6 font-mono text-xs text-[#d4d4d8]">
          {/* Header Action Bar */}
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#161618] border border-[#27272a] flex items-center justify-center font-bold text-sm text-[#e17100]">
                {member.memberId}
              </div>
              <div>
                <h2 className="text-base font-bold text-white uppercase tracking-tight">
                  {member.name}
                </h2>
                <div className="mt-1">
                  <StatusBadge status={member.status} />
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onClose();
                  onAddPayment(member.id);
                }}
              >
                + ADD PAYMENT
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  onRenewMembership(member);
                }}
              >
                RENEW
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onEditMember(member);
                }}
              >
                EDIT
              </Button>
            </div>
          </div>

          {/* Current Membership Card */}
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a] space-y-3">
            <div className="flex justify-between items-center border-b border-[#27272a] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#e17100]">
                CURRENT MEMBERSHIP
              </span>
              <span className="text-white font-bold">
                {activeMembership?.planName || 'No Active Plan'}
              </span>
            </div>

            {activeMembership ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center pt-1">
                <div className="p-2 bg-[#161618] border border-[#27272a]">
                  <div className="text-[9px] text-[#71717a] uppercase">START</div>
                  <div className="text-white font-bold text-xs mt-0.5">
                    {formatDate(activeMembership.startDate)}
                  </div>
                </div>
                <div className="p-2 bg-[#161618] border border-[#27272a]">
                  <div className="text-[9px] text-[#71717a] uppercase">EXPIRY</div>
                  <div className="text-white font-bold text-xs mt-0.5">
                    {formatDate(activeMembership.expiryDate)}
                  </div>
                </div>
                <div className="p-2 bg-[#161618] border border-[#27272a]">
                  <div className="text-[9px] text-[#71717a] uppercase">TOTAL</div>
                  <div className="text-white font-bold text-xs mt-0.5">
                    {formatINR(financialStats.totalFee)}
                  </div>
                </div>
                <div className="p-2 bg-[#161618] border border-[#27272a]">
                  <div className="text-[9px] text-[#71717a] uppercase">PAID</div>
                  <div className="text-emerald-500 font-bold text-xs mt-0.5">
                    {formatINR(financialStats.paid)}
                  </div>
                </div>
                <div className="p-2 bg-[#161618] border border-[#27272a] col-span-2 sm:col-span-1">
                  <div className="text-[9px] text-[#71717a] uppercase">PENDING</div>
                  <div
                    className={`font-bold text-xs mt-0.5 ${
                      financialStats.pending > 0 ? 'text-[#e17100]' : 'text-[#71717a]'
                    }`}
                  >
                    {financialStats.pending === 0 ? 'PAID' : formatINR(financialStats.pending)}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[#a1a1aa] py-2">
                Member does not have an active membership. Click RENEW to assign a plan.
              </div>
            )}
          </div>

          {/* Personal Info Grid */}
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a] space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
              PERSONAL INFORMATION
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs">
              <div className="flex items-center gap-2">
                <Phone size={13} className="text-[#71717a]" />
                <span className="text-[#71717a]">Phone:</span>
                <span className="text-white">{member.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={13} className="text-[#71717a]" />
                <span className="text-[#71717a]">Email:</span>
                <span className="text-white">{member.email || '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#71717a]">Gender:</span>
                <span className="text-white">{member.gender}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#71717a]">DOB:</span>
                <span className="text-white">{member.dateOfBirth ? formatDate(member.dateOfBirth) : '—'}</span>
              </div>
              <div className="flex items-start gap-2 sm:col-span-2">
                <MapPin size={13} className="text-[#71717a] shrink-0 mt-0.5" />
                <span className="text-[#71717a]">Address:</span>
                <span className="text-white">{member.address || '—'}</span>
              </div>
              {member.emergencyContact && (
                <div className="flex items-center gap-2 sm:col-span-2">
                  <AlertCircle size={13} className="text-[#71717a] shrink-0" />
                  <span className="text-[#71717a]">Emergency:</span>
                  <span className="text-white">{member.emergencyContact}</span>
                </div>
              )}
              {member.notes && (
                <div className="p-2 bg-[#161618] border border-[#27272a] sm:col-span-2 mt-1">
                  <div className="text-[9px] text-[#71717a] uppercase mb-0.5">NOTES</div>
                  <div className="text-[#a1a1aa] italic">{member.notes}</div>
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a] space-y-3">
            <div className="flex justify-between items-center border-b border-[#27272a] pb-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
                PAYMENT HISTORY ({payments.length})
              </span>
            </div>

            {payments.length === 0 ? (
              <div className="py-3 text-center text-[#71717a]">No payments recorded yet</div>
            ) : (
              <div className="divide-y divide-[#27272a]">
                {payments.map((p) => (
                  <div key={p.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{formatINR(p.amount)}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[#161618] border border-[#27272a] text-[#e17100]">
                          {p.receiptNumber}
                        </span>
                        <span className="text-[10px] text-[#71717a] uppercase">via {p.paymentMethod}</span>
                      </div>
                      <div className="text-[10px] text-[#71717a] mt-0.5">
                        {formatDate(p.paymentDate)} {p.notes ? `• ${p.notes}` : ''}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedReceiptPayment(p)}
                      className="text-[#e17100] gap-1 hover:text-white"
                    >
                      <Receipt size={13} />
                      <span>RECEIPT</span>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Membership History */}
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a] space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#71717a]">
              MEMBERSHIP ARCHIVE ({membershipHistory.length})
            </span>
            <div className="divide-y divide-[#27272a]">
              {membershipHistory.map((m) => (
                <div key={m.id} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-white font-medium">{m.planName}</span>
                    <span className="text-[10px] text-[#71717a] ml-2">
                      {formatDate(m.startDate)} — {formatDate(m.expiryDate)}
                    </span>
                  </div>
                  <span className="text-[#a1a1aa] font-bold">{formatINR(m.finalAmount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* Receipt Modal from Member Profile */}
      {selectedReceiptPayment && (
        <ReceiptModal
          isOpen={!!selectedReceiptPayment}
          onClose={() => setSelectedReceiptPayment(null)}
          payment={selectedReceiptPayment}
          member={member}
          membership={activeMembership}
          gym={gym}
        />
      )}
    </>
  );
};
