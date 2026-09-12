import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Member, MemberStatus } from '../../types';
import { 
  getMembers, 
  getPlans, 
  getMemberActiveMembership, 
  getPayments, 
  deleteMember 
} from '../../lib/storage';
import { formatINR, formatDate, calculatePendingAmount } from '../../lib/calculations';
import { exportMembersCSV } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { 
  Plus, 
  Search, 
  Download, 
  Filter, 
  Eye, 
  CreditCard, 
  RefreshCw, 
  Edit, 
  Trash2,
  Phone,
  Calendar
} from 'lucide-react';

interface MembersViewProps {
  onAddMemberClick: () => void;
  onViewMemberClick: (member: Member) => void;
  onAddPaymentClick: (memberId: string) => void;
  onRenewClick: (member: Member) => void;
  onEditClick: (member: Member) => void;
}

export const MembersView: React.FC<MembersViewProps> = ({
  onAddMemberClick,
  onViewMemberClick,
  onAddPaymentClick,
  onRenewClick,
  onEditClick,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [planFilter, setPlanFilter] = useState<string>('ALL');
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  const members = getMembers();
  const plans = getPlans();
  const allPayments = getPayments();

  // Compute enriched member data
  const enrichedMembers = useMemo(() => {
    return members.map((m) => {
      const activeMs = getMemberActiveMembership(m.id);
      let totalFee = 0;
      let totalPaid = 0;
      let pending = 0;
      let planName = '—';
      let startDate = '—';
      let expiryDate = '—';

      if (activeMs) {
        planName = activeMs.planName;
        startDate = activeMs.startDate;
        expiryDate = activeMs.expiryDate;
        totalFee = activeMs.finalAmount;

        const payments = allPayments.filter(
          (p) => p.membershipId === activeMs.id && p.status !== 'Refunded'
        );
        totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
        pending = calculatePendingAmount(totalFee, totalPaid);
      }

      return {
        ...m,
        planName,
        startDate,
        expiryDate,
        totalFee,
        totalPaid,
        pending,
      };
    });
  }, [members, allPayments]);

  const filteredMembers = useMemo(() => {
    return enrichedMembers.filter((m) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        m.name.toLowerCase().includes(query) ||
        m.phone.includes(query) ||
        m.memberId.toLowerCase().includes(query) ||
        m.email.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === 'ALL' || m.status === statusFilter;

      const matchesPlan =
        planFilter === 'ALL' || m.planName === planFilter;

      return matchesSearch && matchesStatus && matchesPlan;
    });
  }, [enrichedMembers, searchTerm, statusFilter, planFilter]);

  const handleExportCSV = () => {
    exportMembersCSV(members);
    showToast(`Exported ${members.length} members to CSV`);
  };

  const handleDeleteConfirm = () => {
    if (memberToDelete) {
      deleteMember(memberToDelete.id);
      showToast(`Member ${memberToDelete.name} deleted`);
      setMemberToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            MEMBER DIRECTORY
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            MEMBERS
          </h1>
          <p className="text-xs font-mono text-[#a1a1aa] mt-1">
            Total {members.length} registered athlete records
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={handleExportCSV} className="gap-1.5">
            <Download size={14} />
            <span className="hidden sm:inline">EXPORT CSV</span>
          </Button>
          <Button variant="primary" size="md" onClick={onAddMemberClick} className="gap-1.5">
            <Plus size={15} />
            <span>+ ADD MEMBER</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#161618] border border-[#27272a] flex flex-col md:flex-row gap-3 items-center justify-between font-mono text-xs">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            placeholder="Search by name, phone or member ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#71717a] uppercase font-bold">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="PAYMENT PENDING">PAYMENT PENDING</option>
              <option value="EXPIRING SOON">EXPIRING SOON</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#71717a] uppercase font-bold">PLAN:</span>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
            >
              <option value="ALL">ALL PLANS</option>
              {plans.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-[#161618] border border-[#27272a] overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#0d0d0f] text-[10px] text-[#71717a] uppercase">
              <th className="p-3 font-bold">ID</th>
              <th className="p-3 font-bold">MEMBER</th>
              <th className="p-3 font-bold">PHONE</th>
              <th className="p-3 font-bold">PLAN</th>
              <th className="p-3 font-bold">EXPIRY</th>
              <th className="p-3 font-bold">PAID</th>
              <th className="p-3 font-bold">PENDING</th>
              <th className="p-3 font-bold">STATUS</th>
              <th className="p-3 font-bold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]">
            {filteredMembers.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-[#71717a]">
                  No members found matching your search.
                </td>
              </tr>
            ) : (
              filteredMembers.map((m) => (
                <tr key={m.id} className="hover:bg-[#0d0d0f]/60 transition-colors">
                  <td className="p-3 font-bold text-[#e17100]">{m.memberId}</td>
                  <td className="p-3">
                    <button
                      onClick={() => onViewMemberClick(m)}
                      className="text-white font-bold hover:text-[#e17100] text-left cursor-pointer"
                    >
                      {m.name}
                    </button>
                    <div className="text-[10px] text-[#71717a]">{m.email || '—'}</div>
                  </td>
                  <td className="p-3 text-[#a1a1aa]">{m.phone}</td>
                  <td className="p-3 text-white">{m.planName}</td>
                  <td className="p-3 text-[#a1a1aa]">{formatDate(m.expiryDate)}</td>
                  <td className="p-3 text-emerald-500 font-bold">{formatINR(m.totalPaid)}</td>
                  <td className="p-3">
                    <span
                      className={`font-bold ${
                        m.pending > 0 ? 'text-[#e17100]' : 'text-[#71717a]'
                      }`}
                    >
                      {m.pending === 0 ? '—' : formatINR(m.pending)}
                    </span>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewMemberClick(m)}
                        title="View Profile"
                        className="p-1.5 h-7"
                      >
                        <Eye size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddPaymentClick(m.id)}
                        title="Add Payment"
                        className="p-1.5 h-7 text-[#e17100]"
                      >
                        <CreditCard size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRenewClick(m)}
                        title="Renew Membership"
                        className="p-1.5 h-7 text-amber-500"
                      >
                        <RefreshCw size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditClick(m)}
                        title="Edit Details"
                        className="p-1.5 h-7"
                      >
                        <Edit size={13} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMemberToDelete(m)}
                        title="Delete Member"
                        className="p-1.5 h-7 text-[#ef4444] hover:bg-[#ef4444]/10"
                      >
                        <Trash2 size={13} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Transform View */}
      <div className="lg:hidden flex flex-col gap-3 font-mono text-xs">
        {filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-[#71717a] bg-[#161618] border border-[#27272a]">
            No members found.
          </div>
        ) : (
          filteredMembers.map((m) => (
            <div key={m.id} className="p-4 bg-[#161618] border border-[#27272a] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] text-[#e17100] font-bold">{m.memberId}</div>
                  <h3
                    onClick={() => onViewMemberClick(m)}
                    className="text-base font-bold text-white cursor-pointer hover:text-[#e17100]"
                  >
                    {m.name}
                  </h3>
                  <div className="text-[11px] text-[#71717a] mt-0.5">{m.phone}</div>
                </div>
                <StatusBadge status={m.status} />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#27272a] text-[11px]">
                <div>
                  <span className="text-[9px] text-[#71717a] block uppercase">PLAN</span>
                  <span className="text-white font-medium">{m.planName}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#71717a] block uppercase">PAID</span>
                  <span className="text-emerald-500 font-bold">{formatINR(m.totalPaid)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-[#71717a] block uppercase">PENDING</span>
                  <span
                    className={`font-bold ${
                      m.pending > 0 ? 'text-[#e17100]' : 'text-[#71717a]'
                    }`}
                  >
                    {m.pending === 0 ? '₹0' : formatINR(m.pending)}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-[#27272a] flex items-center justify-between">
                <span className="text-[10px] text-[#71717a]">
                  Exp: {formatDate(m.expiryDate)}
                </span>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onAddPaymentClick(m.id)}
                    className="h-7 text-[10px]"
                  >
                    PAY
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRenewClick(m)}
                    className="h-7 text-[10px]"
                  >
                    RENEW
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onViewMemberClick(m)}
                    className="h-7 text-[10px]"
                  >
                    VIEW →
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Member Confirmation */}
      {memberToDelete && (
        <ConfirmDialog
          isOpen={!!memberToDelete}
          onClose={() => setMemberToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="DELETE MEMBER?"
          message={`Are you sure you want to delete ${memberToDelete.name} (${memberToDelete.memberId})? All associated memberships and payments will also be permanently deleted. This cannot be undone.`}
          confirmLabel="DELETE MEMBER"
        />
      )}
    </div>
  );
};
