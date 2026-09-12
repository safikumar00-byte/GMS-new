import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Payment, Member, Membership, Gym } from '../../types';
import { formatINR, formatDate, getWhatsAppUrl } from '../../lib/calculations';
import { exportReceiptPDF } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { Printer, Download, Share2, Copy, Check } from 'lucide-react';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  member?: Member | null;
  membership?: Membership | null;
  gym: Gym;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  payment,
  member,
  membership,
  gym,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!payment) return null;

  const totalFee = membership ? membership.finalAmount : payment.amount;
  // Calculate remaining balance
  const remainingBalance = membership
    ? Math.max(0, membership.finalAmount - payment.amount)
    : 0;
  const previousBalance = membership
    ? Math.max(0, membership.finalAmount)
    : payment.amount;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    try {
      exportReceiptPDF({
        gym,
        receiptNumber: payment.receiptNumber,
        paymentDate: payment.paymentDate,
        memberName: payment.memberName,
        memberId: member?.memberId || 'N/A',
        planName: membership?.planName || 'Gym Membership',
        totalFee,
        previousBalance,
        amountPaid: payment.amount,
        remainingBalance,
        paymentMethod: payment.paymentMethod,
      });
      showToast('Receipt PDF downloaded');
    } catch (err) {
      showToast('Error generating PDF receipt', 'error');
    }
  };

  const receiptSummaryText = `
*${gym.name.toUpperCase()}*
*PAYMENT RECEIPT*
--------------------------------
Receipt: ${payment.receiptNumber}
Date: ${formatDate(payment.paymentDate)}
Member: ${payment.memberName} (${member?.memberId || 'N/A'})
Plan: ${membership?.planName || 'Membership'}
--------------------------------
Amount Paid: ${formatINR(payment.amount)}
Remaining Dues: ${formatINR(remainingBalance)}
Payment Mode: ${payment.paymentMethod}
Status: ${payment.status}
--------------------------------
${gym.receiptFooter || 'Thank you for training with us!'}
`.trim();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(receiptSummaryText);
      setCopied(true);
      showToast('Receipt text copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy receipt', 'error');
    }
  };

  const handleShareWhatsApp = () => {
    if (member?.phone) {
      const url = getWhatsAppUrl(member.phone, receiptSummaryText);
      window.open(url, '_blank');
    } else {
      showToast('Member phone not available for WhatsApp', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`RECEIPT ${payment.receiptNumber}`}
      subtitle="Official transaction receipt"
      maxWidth="md"
    >
      <div className="flex flex-col gap-6">
        {/* Printable thermal receipt layout */}
        <div
          id="printable-receipt"
          className="p-6 bg-[#0d0d0f] border border-[#27272a] font-mono text-xs text-[#d4d4d8] leading-relaxed select-text"
        >
          <div className="text-center pb-3 border-b border-dashed border-[#27272a]">
            <h3 className="font-bold text-sm text-white tracking-widest uppercase">
              {gym.name}
            </h3>
            <p className="text-[10px] text-[#71717a] mt-0.5">{gym.address}</p>
            <p className="text-[10px] text-[#71717a]">Tel: {gym.phone}</p>
          </div>

          <div className="py-3 border-b border-dashed border-[#27272a] flex justify-between items-center text-[11px]">
            <div>
              <span className="text-[#71717a]">RECEIPT:</span>{' '}
              <span className="text-white font-bold">{payment.receiptNumber}</span>
            </div>
            <div>
              <span className="text-[#71717a]">DATE:</span>{' '}
              <span className="text-white">{formatDate(payment.paymentDate)}</span>
            </div>
          </div>

          <div className="py-3 border-b border-dashed border-[#27272a] space-y-1">
            <div className="flex justify-between">
              <span className="text-[#71717a]">MEMBER:</span>
              <span className="text-white font-medium">{payment.memberName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71717a]">MEMBER ID:</span>
              <span className="text-[#a1a1aa]">{member?.memberId || 'GM-001'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#71717a]">PLAN:</span>
              <span className="text-[#a1a1aa]">{membership?.planName || 'General Access'}</span>
            </div>
          </div>

          <div className="py-3 border-b border-dashed border-[#27272a] space-y-1.5">
            <div className="flex justify-between text-[#71717a]">
              <span>TOTAL FEE:</span>
              <span>{formatINR(totalFee)}</span>
            </div>
            <div className="flex justify-between text-[#71717a]">
              <span>PREVIOUS BALANCE:</span>
              <span>{formatINR(previousBalance)}</span>
            </div>
            <div className="flex justify-between text-white font-bold text-sm pt-1 border-t border-[#27272a]">
              <span className="text-[#e17100]">AMOUNT PAID:</span>
              <span className="text-[#e17100]">{formatINR(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-[#71717a]">
              <span>REMAINING BALANCE:</span>
              <span className={remainingBalance > 0 ? 'text-[#e17100] font-bold' : 'text-emerald-500'}>
                {remainingBalance === 0 ? 'PAID' : formatINR(remainingBalance)}
              </span>
            </div>
            <div className="flex justify-between text-[#71717a]">
              <span>PAYMENT METHOD:</span>
              <span className="text-white uppercase">{payment.paymentMethod}</span>
            </div>
            {payment.notes && (
              <div className="flex justify-between text-[10px] text-[#71717a] pt-1">
                <span>NOTES:</span>
                <span className="italic">{payment.notes}</span>
              </div>
            )}
          </div>

          <div className="pt-3 text-center text-[10px] text-[#71717a] uppercase tracking-wider">
            {gym.receiptFooter || 'Thank you for training with us!'}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#27272a]">
          <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer size={13} />
            <span>PRINT</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-1.5">
            <Download size={13} />
            <span>PDF</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
            {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
            <span>{copied ? 'COPIED' : 'COPY'}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="gap-1.5 text-emerald-500 border-emerald-900/50 hover:bg-emerald-950/30">
            <Share2 size={13} />
            <span>WHATSAPP</span>
          </Button>
        </div>

        <div className="flex justify-end">
          <Button variant="primary" size="md" onClick={onClose} className="w-full sm:w-auto">
            DONE
          </Button>
        </div>
      </div>
    </Modal>
  );
};
