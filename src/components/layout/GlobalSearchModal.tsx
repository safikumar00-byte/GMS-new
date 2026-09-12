import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { Search, User, Receipt, DollarSign, Calendar, ArrowRight } from 'lucide-react';
import { getMembers, getPayments, getExpenses } from '../../lib/storage';
import { formatINR, formatDate } from '../../lib/calculations';
import { Member, Payment } from '../../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMember: (member: Member) => void;
  onSelectReceipt: (payment: Payment) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectMember,
  onSelectReceipt,
}) => {
  const [query, setQuery] = useState('');
  const members = getMembers();
  const payments = getPayments();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
    }
  }, [isOpen]);

  const results = useMemo(() => {
    if (!query.trim()) {
      return {
        matchedMembers: members.slice(0, 4),
        matchedPayments: payments.slice(0, 4),
      };
    }
    const q = query.toLowerCase();
    const matchedMembers = members
      .filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          m.memberId.toLowerCase().includes(q)
      )
      .slice(0, 5);

    const matchedPayments = payments
      .filter(
        (p) =>
          p.receiptNumber.toLowerCase().includes(q) ||
          p.memberName.toLowerCase().includes(q)
      )
      .slice(0, 5);

    return { matchedMembers, matchedPayments };
  }, [query, members, payments]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QUICK NAVIGATE & SEARCH"
      subtitle="Search members, phone numbers, receipts, or transactions"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4 font-mono text-xs">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            placeholder="Type member name, phone (98450...), or receipt (GM-000124)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
            autoFocus
          />
        </div>

        {/* Member matches */}
        <div>
          <div className="text-[10px] font-bold uppercase text-[#71717a] tracking-wider mb-2">
            MEMBERS ({results.matchedMembers.length})
          </div>
          {results.matchedMembers.length === 0 ? (
            <div className="text-[#71717a] py-2 text-center">No member matches</div>
          ) : (
            <div className="divide-y divide-[#27272a] border border-[#27272a] bg-[#0d0d0f]">
              {results.matchedMembers.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    onClose();
                    onSelectMember(m);
                  }}
                  className="p-3 flex items-center justify-between hover:bg-[#161618] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 bg-[#161618] border border-[#27272a] flex items-center justify-center font-bold text-[#e17100] text-[10px]">
                      {m.memberId}
                    </div>
                    <div>
                      <span className="text-white font-bold">{m.name}</span>
                      <span className="text-[10px] text-[#71717a] ml-2">{m.phone}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#e17100]">VIEW →</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt matches */}
        <div>
          <div className="text-[10px] font-bold uppercase text-[#71717a] tracking-wider mb-2">
            RECEIPTS & PAYMENTS ({results.matchedPayments.length})
          </div>
          {results.matchedPayments.length === 0 ? (
            <div className="text-[#71717a] py-2 text-center">No receipt matches</div>
          ) : (
            <div className="divide-y divide-[#27272a] border border-[#27272a] bg-[#0d0d0f]">
              {results.matchedPayments.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onClose();
                    onSelectReceipt(p);
                  }}
                  className="p-3 flex items-center justify-between hover:bg-[#161618] cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Receipt size={14} className="text-[#e17100]" />
                    <div>
                      <span className="text-white font-bold">{p.receiptNumber}</span>
                      <span className="text-[10px] text-[#71717a] ml-2">
                        {p.memberName} • {formatINR(p.amount)}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-[#e17100]">RECEIPT →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
