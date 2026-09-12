import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { Payment, PaymentMethod, PaymentStatus, Gym } from '../../types';
import { 
  getPayments, 
  getMembers, 
  getMemberships, 
  refundPayment, 
  deletePayment, 
  getGym 
} from '../../lib/storage';
import { formatINR, formatDate, getTodayString } from '../../lib/calculations';
import { exportPaymentsCSV, exportPaymentsPDF } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { 
  Plus, 
  Search, 
  Download, 
  Receipt, 
  RotateCcw, 
  Trash2, 
  FileText,
  Filter 
} from 'lucide-react';

interface PaymentsViewProps {
  onAddPaymentClick: () => void;
  onViewReceiptClick: (payment: Payment) => void;
}

export const PaymentsView: React.FC<PaymentsViewProps> = ({
  onAddPaymentClick,
  onViewReceiptClick,
}) => {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [paymentToRefund, setPaymentToRefund] = useState<Payment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(null);

  const gym: Gym = getGym();
  const payments = getPayments();
  const members = getMembers();
  const memberships = getMemberships();

  // Enriched payment list with membership plan names
  const enrichedPayments = useMemo(() => {
    return payments.map((p) => {
      const ms = memberships.find((m) => m.id === p.membershipId);
      const member = members.find((m) => m.id === p.memberId);
      return {
        ...p,
        planName: ms?.planName || 'Gym Membership',
        memberCode: member?.memberId || 'N/A',
      };
    });
  }, [payments, memberships, members]);

  const filteredPayments = useMemo(() => {
    return enrichedPayments.filter((p) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        p.memberName.toLowerCase().includes(query) ||
        p.receiptNumber.toLowerCase().includes(query) ||
        p.memberCode.toLowerCase().includes(query) ||
        (p.notes && p.notes.toLowerCase().includes(query));

      const matchesMethod =
        methodFilter === 'ALL' || p.paymentMethod === methodFilter;

      const matchesStatus =
        statusFilter === 'ALL' || p.status === statusFilter;

      let matchesDate = true;
      if (startDate && p.paymentDate < startDate) matchesDate = false;
      if (endDate && p.paymentDate > endDate) matchesDate = false;

      return matchesSearch && matchesMethod && matchesStatus && matchesDate;
    });
  }, [enrichedPayments, searchTerm, methodFilter, statusFilter, startDate, endDate]);

  const totalCollected = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status !== 'Refunded')
      .reduce((sum, p) => sum + p.amount, 0);
  }, [filteredPayments]);

  const handleExportCSV = () => {
    exportPaymentsCSV(filteredPayments);
    showToast(`Exported ${filteredPayments.length} payment records to CSV`);
  };

  const handleExportPDF = () => {
    exportPaymentsPDF(filteredPayments, gym);
    showToast(`Generated payments PDF report`);
  };

  const handleRefundConfirm = () => {
    if (paymentToRefund) {
      refundPayment(paymentToRefund.id, 'Refund processed via admin dashboard');
      showToast(`Payment #${paymentToRefund.receiptNumber} refunded`);
      setPaymentToRefund(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (paymentToDelete) {
      deletePayment(paymentToDelete.id);
      showToast(`Payment #${paymentToDelete.receiptNumber} deleted`);
      setPaymentToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            FINANCIAL TRANSACTIONS
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            PAYMENTS
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Total Inflow: <span className="text-emerald-500 font-bold">{formatINR(totalCollected)}</span> ({filteredPayments.length} records)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="md" onClick={handleExportCSV} className="gap-1.5">
            <Download size={14} />
            <span className="hidden sm:inline">CSV</span>
          </Button>
          <Button variant="outline" size="md" onClick={handleExportPDF} className="gap-1.5">
            <FileText size={14} />
            <span className="hidden sm:inline">PDF</span>
          </Button>
          <Button variant="primary" size="md" onClick={onAddPaymentClick} className="gap-1.5">
            <Plus size={15} />
            <span>+ ADD PAYMENT</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#161618] border border-[#27272a] flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            placeholder="Search member, receipt #GM-..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Method Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#71717a] uppercase font-bold">METHOD:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
            >
              <option value="ALL">ALL METHODS</option>
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-[#71717a] uppercase font-bold">STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
            >
              <option value="ALL">ALL STATUSES</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-[#161618] border border-[#27272a] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#0d0d0f] text-[10px] text-[#71717a] uppercase">
              <th className="p-3 font-bold">RECEIPT #</th>
              <th className="p-3 font-bold">MEMBER</th>
              <th className="p-3 font-bold">AMOUNT</th>
              <th className="p-3 font-bold">DATE</th>
              <th className="p-3 font-bold">METHOD</th>
              <th className="p-3 font-bold">MEMBERSHIP</th>
              <th className="p-3 font-bold">STATUS</th>
              <th className="p-3 font-bold text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]">
            {filteredPayments.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-[#71717a]">
                  No recorded transactions found.
                </td>
              </tr>
            ) : (
              filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-[#0d0d0f]/60 transition-colors">
                  <td className="p-3 font-bold text-[#e17100]">{p.receiptNumber}</td>
                  <td className="p-3">
                    <div className="text-white font-bold">{p.memberName}</div>
                    <div className="text-[10px] text-[#71717a]">{p.memberCode}</div>
                  </td>
                  <td className="p-3 font-bold text-emerald-500">
                    {p.status === 'Refunded' ? (
                      <span className="line-through text-neutral-500">{formatINR(p.amount)}</span>
                    ) : (
                      formatINR(p.amount)
                    )}
                  </td>
                  <td className="p-3 text-[#a1a1aa]">{formatDate(p.paymentDate)}</td>
                  <td className="p-3 text-white uppercase text-[11px]">{p.paymentMethod}</td>
                  <td className="p-3 text-[#a1a1aa]">{p.planName}</td>
                  <td className="p-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewReceiptClick(p)}
                        title="View Official Receipt"
                        className="p-1.5 h-7 text-[#e17100]"
                      >
                        <Receipt size={13} />
                      </Button>
                      {p.status !== 'Refunded' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPaymentToRefund(p)}
                          title="Refund Payment"
                          className="p-1.5 h-7 text-amber-500"
                        >
                          <RotateCcw size={13} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPaymentToDelete(p)}
                        title="Delete Record"
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
      <div className="lg:hidden flex flex-col gap-3 text-xs">
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-[#71717a] bg-[#161618] border border-[#27272a]">
            No payments recorded.
          </div>
        ) : (
          filteredPayments.map((p) => (
            <div key={p.id} className="p-4 bg-[#161618] border border-[#27272a] space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] text-[#e17100] font-bold">{p.receiptNumber}</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{p.memberName}</h3>
                  <div className="text-[10px] text-[#71717a]">{formatDate(p.paymentDate)} • via {p.paymentMethod}</div>
                </div>
                <StatusBadge status={p.status} />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#27272a]">
                <div>
                  <span className="text-[9px] text-[#71717a] block uppercase">AMOUNT PAID</span>
                  <span className="text-base font-bold text-emerald-500">
                    {formatINR(p.amount)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewReceiptClick(p)}
                    className="h-7 text-[10px] gap-1 text-[#e17100]"
                  >
                    <Receipt size={12} />
                    <span>RECEIPT</span>
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refund Confirmation Dialog */}
      {paymentToRefund && (
        <ConfirmDialog
          isOpen={!!paymentToRefund}
          onClose={() => setPaymentToRefund(null)}
          onConfirm={handleRefundConfirm}
          title="REFUND PAYMENT?"
          message={`Are you sure you want to mark payment #${paymentToRefund.receiptNumber} (${formatINR(paymentToRefund.amount)}) for ${paymentToRefund.memberName} as Refunded? This will update membership balances and financial reports while preserving transaction logs.`}
          confirmLabel="PROCESS REFUND"
          isDestructive={false}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {paymentToDelete && (
        <ConfirmDialog
          isOpen={!!paymentToDelete}
          onClose={() => setPaymentToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="DELETE PAYMENT RECORD?"
          message={`Are you sure you want to permanently delete payment #${paymentToDelete.receiptNumber} (${formatINR(paymentToDelete.amount)})? This will recalculate the member's pending amount. This cannot be undone.`}
          confirmLabel="DELETE PAYMENT"
        />
      )}
    </div>
  );
};
