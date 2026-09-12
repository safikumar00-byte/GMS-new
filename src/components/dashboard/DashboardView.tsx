import React, { useState, useMemo } from 'react';
import { MetricCard } from '../ui/MetricCard';
import { Button } from '../ui/Button';
import { StatusBadge } from '../ui/StatusBadge';
import { 
  getDashboardMetrics, 
  getPendingPaymentsList, 
  getExpiringMembersList, 
  getPayments, 
  getMembers,
  getGym,
  getUser
} from '../../lib/storage';
import { 
  formatINR, 
  formatDate, 
  formatShortDate, 
  generateWhatsAppReminderMessage,
  getWhatsAppUrl 
} from '../../lib/calculations';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip 
} from 'recharts';
import { 
  Plus, 
  ArrowUpRight, 
  MessageSquare, 
  Copy, 
  RefreshCw, 
  Receipt as ReceiptIcon,
  TrendingUp,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useToast } from '../ui/Toast';
import { Payment, Member } from '../../types';

interface DashboardViewProps {
  onAddPaymentClick: (memberId?: string) => void;
  onRenewClick: (member: Member) => void;
  onViewMemberClick: (member: Member) => void;
  onViewReceiptClick: (payment: Payment) => void;
}

type ChartPeriod = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export const DashboardView: React.FC<DashboardViewProps> = ({
  onAddPaymentClick,
  onRenewClick,
  onViewMemberClick,
  onViewReceiptClick,
}) => {
  const { showToast } = useToast();
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>('MONTH');

  const gym = getGym();
  const user = getUser();
  const metrics = getDashboardMetrics();
  const pendingPayments = getPendingPaymentsList().slice(0, 6);
  const expiringMembers = getExpiringMembersList().slice(0, 6);
  const allPayments = getPayments();
  const allMembers = getMembers();

  const recentPayments = useMemo(() => {
    return allPayments
      .filter((p) => p.status !== 'Refunded')
      .slice(0, 6);
  }, [allPayments]);

  // Chart data calculation
  const chartData = useMemo(() => {
    if (chartPeriod === 'DAY') {
      return [
        { label: '08:00', amount: 3500 },
        { label: '10:00', amount: 5000 },
        { label: '12:00', amount: 1500 },
        { label: '14:00', amount: 0 },
        { label: '16:00', amount: 2500 },
        { label: '18:00', amount: 4500 },
        { label: '20:00', amount: 3000 },
      ];
    } else if (chartPeriod === 'WEEK') {
      return [
        { label: 'Mon', amount: 14000 },
        { label: 'Tue', amount: 22500 },
        { label: 'Wed', amount: 18000 },
        { label: 'Thu', amount: 9500 },
        { label: 'Fri', amount: 28000 },
        { label: 'Sat', amount: 35000 },
        { label: 'Sun', amount: 24500 },
      ];
    } else if (chartPeriod === 'YEAR') {
      return [
        { label: 'Jan', amount: 145000 },
        { label: 'Feb', amount: 160000 },
        { label: 'Mar', amount: 175000 },
        { label: 'Apr', amount: 168000 },
        { label: 'May', amount: 182000 },
        { label: 'Jun', amount: 195000 },
        { label: 'Jul', amount: 170000 },
        { label: 'Aug', amount: 190000 },
        { label: 'Sep', amount: metrics.thisMonthRevenue },
      ];
    } else {
      // MONTH by default: weeks of September
      return [
        { label: 'Week 1', amount: 48000 },
        { label: 'Week 2', amount: 52500 },
        { label: 'Week 3', amount: 44000 },
        { label: 'Week 4', amount: 40500 },
      ];
    }
  }, [chartPeriod, metrics.thisMonthRevenue]);

  const handleCopyReminder = (memberName: string, amount: number) => {
    const msg = generateWhatsAppReminderMessage(gym.name, memberName, amount);
    navigator.clipboard.writeText(msg);
    showToast(`Reminder copied for ${memberName}`);
  };

  const handleWhatsAppReminder = (phone: string, memberName: string, amount: number) => {
    const msg = generateWhatsAppReminderMessage(gym.name, memberName, amount);
    const url = getWhatsAppUrl(phone, msg);
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Top Header with prominent + ADD PAYMENT action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            MANAGEMENT OVERVIEW
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs font-mono text-[#a1a1aa] mt-1">
            Welcome back, <span className="text-white font-medium">{user.name}</span> • {gym.name}
          </p>
        </div>

        <div>
          <Button
            variant="primary"
            size="lg"
            onClick={() => onAddPaymentClick()}
            className="w-full sm:w-auto shadow-lg shadow-[#e17100]/20 gap-2 text-xs"
          >
            <Plus size={16} />
            <span>+ ADD PAYMENT</span>
          </Button>
        </div>
      </div>

      {/* 8 Essential Executive Metric Cards (4 Columns on Desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="TOTAL MEMBERS"
          value={metrics.totalMembers}
          subValue="All gym records"
        />
        <MetricCard
          label="ACTIVE MEMBERS"
          value={metrics.activeMembers}
          subValue="Valid passes"
        />
        <MetricCard
          label="EXPIRING SOON"
          value={metrics.expiringSoon}
          isWarning={metrics.expiringSoon > 0}
          subValue="Within 7-14 days"
        />
        <MetricCard
          label="EXPIRED"
          value={metrics.expired}
          isDestructive={metrics.expired > 0}
          subValue="Requires renewal"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="PAID THIS MONTH"
          value={formatINR(metrics.paidThisMonth)}
          subValue="Current month"
        />
        <MetricCard
          label="PENDING PAYMENTS"
          value={formatINR(metrics.pendingPayments)}
          isAccent={true}
          subValue="Overdue collection"
        />
        <MetricCard
          label="TODAY'S COLLECTION"
          value={formatINR(metrics.todayCollection)}
          subValue="Collected today"
        />
        <MetricCard
          label="THIS MONTH'S REVENUE"
          value={formatINR(metrics.thisMonthRevenue)}
          subValue={`Net Income: ${formatINR(metrics.netIncome)}`}
        />
      </div>

      {/* Middle Grid: Revenue Collection Chart + Pending Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Revenue Trends Chart */}
        <div className="lg:col-span-7 bg-[#161618] border border-[#27272a] p-5 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-[#71717a] tracking-wider">
                COLLECTION TRENDS
              </div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mt-0.5">
                Revenue Inflow
              </h2>
            </div>

            {/* Time toggles */}
            <div className="flex items-center gap-1 bg-[#0d0d0f] border border-[#27272a] p-1 text-[10px] font-mono uppercase">
              {(['DAY', 'WEEK', 'MONTH', 'YEAR'] as ChartPeriod[]).map((period) => (
                <button
                  key={period}
                  onClick={() => setChartPeriod(period)}
                  className={`px-2.5 py-1 transition-colors ${
                    chartPeriod === period
                      ? 'bg-[#e17100] text-white font-bold'
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  stroke="#52525b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                />
                <YAxis
                  stroke="#52525b"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#27272a' }}
                  tickFormatter={(val) => `₹${val / 1000}k`}
                />
                <Tooltip
                  cursor={{ fill: '#27272a', opacity: 0.4 }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[#0d0d0f] border border-[#27272a] p-2.5 text-xs font-mono shadow-xl">
                          <div className="text-[#71717a] uppercase text-[10px]">
                            {payload[0].payload.label}
                          </div>
                          <div className="text-[#e17100] font-bold text-sm mt-0.5">
                            {formatINR(payload[0].value as number)}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="amount" fill="#e17100" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-[#27272a] flex items-center justify-between text-[11px] font-mono text-[#a1a1aa]">
            <span>Active Collection Rate: 94.2%</span>
            <span className="text-[#e17100] font-bold">Total: {formatINR(metrics.thisMonthRevenue)}</span>
          </div>
        </div>

        {/* Pending Payments Action Block */}
        <div className="lg:col-span-5 bg-[#161618] border border-[#27272a] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase font-bold text-[#71717a] tracking-wider">
                  ACTION REQUIRED
                </div>
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mt-0.5">
                  Pending Payments
                </h2>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 bg-[#e17100]/10 border border-[#e17100]/40 text-[#e17100] font-bold">
                {formatINR(metrics.pendingPayments)}
              </span>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="py-8 text-center text-[#71717a] font-mono text-xs">
                All member accounts are fully settled.
              </div>
            ) : (
              <div className="divide-y divide-[#27272a]">
                {pendingPayments.map((item) => (
                  <div key={item.memberId} className="py-3 flex items-center justify-between gap-2 font-mono text-xs">
                    <div>
                      <div className="text-white font-bold">{item.memberName}</div>
                      <div className="text-[10px] text-[#71717a] mt-0.5">
                        Due: {formatShortDate(item.dueDate)} • {item.daysOverdue}d overdue
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[#e17100] font-bold text-sm">
                        {formatINR(item.amount)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyReminder(item.memberName, item.amount)}
                          title="Copy Reminder Text"
                          className="p-1.5 bg-[#0d0d0f] border border-[#27272a] text-[#71717a] hover:text-white hover:border-[#71717a] transition-colors"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          onClick={() => handleWhatsAppReminder(item.phone, item.memberName, item.amount)}
                          title="Send WhatsApp Reminder"
                          className="p-1.5 bg-[#0d0d0f] border border-[#27272a] text-emerald-500 hover:bg-emerald-950/30 transition-colors"
                        >
                          <MessageSquare size={13} />
                        </button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onAddPaymentClick(item.memberId)}
                          className="text-[10px] px-2 py-1 h-7"
                        >
                          PAY
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#27272a] text-[10px] font-mono text-[#71717a] flex justify-between">
            <span>Reminders powered by WhatsApp & Clipboard</span>
            <span>{pendingPayments.length} pending members</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Payments & Expiring Members */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Transactions */}
        <div className="lg:col-span-7 bg-[#161618] border border-[#27272a] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-mono uppercase font-bold text-[#71717a] tracking-wider">
                TRANSACTION LOG
              </div>
              <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mt-0.5">
                Recent Payments
              </h2>
            </div>
            <div className="text-[11px] font-mono text-[#71717a]">
              Today: <span className="text-white font-bold">{formatINR(metrics.todayCollection)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#27272a] text-[10px] text-[#71717a] uppercase">
                  <th className="pb-2 font-bold">MEMBER</th>
                  <th className="pb-2 font-bold">AMOUNT</th>
                  <th className="pb-2 font-bold">METHOD</th>
                  <th className="pb-2 font-bold">DATE</th>
                  <th className="pb-2 font-bold text-right">RECEIPT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a]">
                {recentPayments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => onViewReceiptClick(p)}
                    className="hover:bg-[#0d0d0f] cursor-pointer transition-colors"
                  >
                    <td className="py-2.5 font-bold text-white">{p.memberName}</td>
                    <td className="py-2.5 text-emerald-500 font-bold">{formatINR(p.amount)}</td>
                    <td className="py-2.5 text-[#a1a1aa] uppercase text-[11px]">{p.paymentMethod}</td>
                    <td className="py-2.5 text-[#71717a] text-[11px]">{formatShortDate(p.paymentDate)}</td>
                    <td className="py-2.5 text-right">
                      <span className="text-[10px] text-[#e17100] px-1.5 py-0.5 border border-[#27272a] bg-[#0d0d0f]">
                        {p.receiptNumber}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="lg:col-span-5 bg-[#161618] border border-[#27272a] p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-[10px] font-mono uppercase font-bold text-[#71717a] tracking-wider">
                  RETENTION ALERT
                </div>
                <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider mt-0.5">
                  Expiring Soon
                </h2>
              </div>
              <span className="text-xs font-mono text-amber-500 font-bold">
                {metrics.expiringSoon} MEMBERS
              </span>
            </div>

            {expiringMembers.length === 0 ? (
              <div className="py-8 text-center text-[#71717a] font-mono text-xs">
                No memberships expiring in the next 14 days.
              </div>
            ) : (
              <div className="divide-y divide-[#27272a]">
                {expiringMembers.map((item) => {
                  const fullMember = allMembers.find((m) => m.id === item.memberId);
                  return (
                    <div key={item.memberId} className="py-2.5 flex items-center justify-between font-mono text-xs">
                      <div>
                        <div
                          onClick={() => fullMember && onViewMemberClick(fullMember)}
                          className="text-white font-bold hover:text-[#e17100] cursor-pointer"
                        >
                          {item.memberName}
                        </div>
                        <div className="text-[10px] text-[#71717a] mt-0.5">
                          {item.planName} • Expires {formatShortDate(item.expiryDate)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-amber-500 font-bold text-[11px]">
                          {item.daysLeft === 0 ? 'Today' : `${item.daysLeft}d left`}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fullMember && onRenewClick(fullMember)}
                          className="text-[10px] px-2 py-1 h-7"
                        >
                          RENEW
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-[#27272a] text-[10px] font-mono text-[#71717a] flex justify-between">
            <span>Proactive renewal prevents member churn</span>
          </div>
        </div>
      </div>
    </div>
  );
};
