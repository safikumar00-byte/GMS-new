import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { 
  getPayments, 
  getExpenses, 
  getMembers, 
  getMemberships, 
  getPlans, 
  getGym 
} from '../../lib/storage';
import { formatINR } from '../../lib/calculations';
import { exportPaymentsPDF } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { Download, FileText, Calendar, TrendingUp, PieChart, Users, ArrowUpRight } from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart as RechartsPie, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis 
} from 'recharts';

export const ReportsView: React.FC = () => {
  const { showToast } = useToast();
  const gym = getGym();
  const payments = getPayments();
  const expenses = getExpenses();
  const members = getMembers();
  const memberships = getMemberships();
  const plans = getPlans();

  const [dateRange, setDateRange] = useState<'THIS_MONTH' | 'LAST_MONTH' | 'LAST_3_MONTHS' | 'THIS_YEAR' | 'ALL'>('THIS_MONTH');

  // Filter payments & expenses by selected date range
  const filteredData = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    let startDateString = '';

    if (dateRange === 'THIS_MONTH') {
      startDateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;
    } else if (dateRange === 'LAST_MONTH') {
      const lm = currentMonth === 0 ? 11 : currentMonth - 1;
      const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
      startDateString = `${ly}-${String(lm + 1).padStart(2, '0')}-01`;
    } else if (dateRange === 'LAST_3_MONTHS') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      startDateString = d.toISOString().split('T')[0];
    } else if (dateRange === 'THIS_YEAR') {
      startDateString = `${currentYear}-01-01`;
    }

    const validPayments = payments.filter((p) => {
      if (p.status === 'Refunded') return false;
      if (!startDateString) return true;
      return p.paymentDate >= startDateString;
    });

    const validExpenses = expenses.filter((e) => {
      if (!startDateString) return true;
      return e.date >= startDateString;
    });

    return { validPayments, validExpenses };
  }, [payments, expenses, dateRange]);

  const { validPayments, validExpenses } = filteredData;

  const totalCollected = useMemo(() => {
    return validPayments.reduce((sum, p) => sum + p.amount, 0);
  }, [validPayments]);

  const totalExpenses = useMemo(() => {
    return validExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [validExpenses]);

  const netProfit = totalCollected - totalExpenses;

  // Breakdown by Payment Method
  const methodData = useMemo(() => {
    const map: Record<string, number> = {};
    validPayments.forEach((p) => {
      map[p.paymentMethod] = (map[p.paymentMethod] || 0) + p.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [validPayments]);

  // Breakdown by Membership Plan
  const planData = useMemo(() => {
    const map: Record<string, number> = {};
    validPayments.forEach((p) => {
      const ms = memberships.find((m) => m.id === p.membershipId);
      const planName = ms?.planName || 'General Access';
      map[planName] = (map[planName] || 0) + p.amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [validPayments, memberships]);

  // Membership retention statistics
  const newMembersThisMonth = useMemo(() => {
    const currentMonthPrefix = new Date().toISOString().substring(0, 7);
    return members.filter((m) => (m.joinedDate || (m as any).joinDate || '').startsWith(currentMonthPrefix)).length;
  }, [members]);

  const activeCount = members.filter((m) => m.status === 'ACTIVE').length;
  const expiredCount = members.filter((m) => m.status === 'EXPIRED').length;

  const handleExportPDF = () => {
    exportPaymentsPDF(validPayments, gym);
    showToast('Exported analytical report to PDF');
  };

  const handleExportCSV = () => {
    let csv = 'Metric,Value\n';
    csv += `Total Revenue Collected,${totalCollected}\n`;
    csv += `Total Expenses,${totalExpenses}\n`;
    csv += `Net Operating Profit,${netProfit}\n`;
    csv += `Total Active Members,${activeCount}\n`;
    csv += `Total Expired Members,${expiredCount}\n\n`;

    csv += 'Payment Method Breakdown\nMethod,Amount\n';
    methodData.forEach((m) => {
      csv += `${m.name},${m.value}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial-report-${dateRange.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Report CSV exported');
  };

  const COLORS = ['#e17100', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#64748b'];

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            BUSINESS INTELLIGENCE
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            REPORTS & ANALYTICS
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Auditable revenue collections, expense distributions, and retention metrics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time range selector */}
          <div className="flex items-center bg-[#161618] border border-[#27272a] p-1 text-[10px]">
            {(['THIS_MONTH', 'LAST_MONTH', 'LAST_3_MONTHS', 'THIS_YEAR', 'ALL'] as const).map(
              (r) => (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`px-2.5 py-1 transition-colors uppercase ${
                    dateRange === r
                      ? 'bg-[#e17100] text-white font-bold'
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  {r.replace(/_/g, ' ')}
                </button>
              )
            )}
          </div>

          <Button variant="outline" size="md" onClick={handleExportCSV} className="gap-1.5 text-xs">
            <Download size={14} />
            <span className="hidden sm:inline">EXPORT CSV</span>
          </Button>
          <Button variant="outline" size="md" onClick={handleExportPDF} className="gap-1.5 text-xs">
            <FileText size={14} />
            <span className="hidden sm:inline">EXPORT PDF</span>
          </Button>
        </div>
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#161618] border border-[#27272a]">
          <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">
            GROSS INFLOW
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-500 tracking-tight">
              {formatINR(totalCollected)}
            </span>
          </div>
          <div className="text-[11px] text-[#71717a]">
            Total fee collections in period
          </div>
        </div>

        <div className="p-5 bg-[#161618] border border-[#27272a]">
          <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">
            TOTAL OUTFLOW
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {formatINR(totalExpenses)}
            </span>
          </div>
          <div className="text-[11px] text-[#71717a]">
            Operating overhead expenses
          </div>
        </div>

        <div className="p-5 bg-[#161618] border border-[#27272a]">
          <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">
            NET EARNINGS
          </div>
          <div className="my-2">
            <span
              className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                netProfit >= 0 ? 'text-[#e17100]' : 'text-[#ef4444]'
              }`}
            >
              {formatINR(netProfit)}
            </span>
          </div>
          <div className="text-[11px] text-[#71717a]">
            Operating margin: {totalCollected > 0 ? ((netProfit / totalCollected) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Distribution */}
        <div className="p-5 bg-[#161618] border border-[#27272a] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                COLLECTION CHANNELS
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
                Breakdown by Payment Method
              </h2>
            </div>
            <PieChart size={16} className="text-[#e17100]" />
          </div>

          <div className="h-64 w-full">
            {methodData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#71717a]">
                No payment data in this window
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={methodData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" stroke="#52525b" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <YAxis type="category" dataKey="name" stroke="#52525b" fontSize={11} width={80} />
                  <Tooltip
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0d0d0f] border border-[#27272a] p-2 text-xs font-mono">
                            <div className="text-[#71717a] uppercase">{payload[0].payload.name}</div>
                            <div className="text-[#e17100] font-bold text-sm">
                              {formatINR(payload[0].value as number)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#e17100" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-[#27272a] grid grid-cols-2 gap-2 text-xs">
            {methodData.map((m) => (
              <div key={m.name} className="flex justify-between text-[#a1a1aa]">
                <span>{m.name}:</span>
                <span className="text-white font-bold">{formatINR(m.value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Plan Breakdown */}
        <div className="p-5 bg-[#161618] border border-[#27272a] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
                PACKAGE POPULARITY
              </div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
                Revenue by Membership Plan
              </h2>
            </div>
            <TrendingUp size={16} className="text-[#e17100]" />
          </div>

          <div className="h-64 w-full">
            {planData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#71717a]">
                No plan data in this window
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={planData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#52525b" fontSize={10} />
                  <YAxis stroke="#52525b" fontSize={10} tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-[#0d0d0f] border border-[#27272a] p-2 text-xs font-mono">
                            <div className="text-[#71717a]">{payload[0].payload.name}</div>
                            <div className="text-emerald-500 font-bold text-sm">
                              {formatINR(payload[0].value as number)}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill="#e17100" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pt-3 border-t border-[#27272a] grid grid-cols-2 gap-2 text-xs">
            {planData.map((p) => (
              <div key={p.name} className="flex justify-between text-[#a1a1aa]">
                <span className="truncate pr-2">{p.name}:</span>
                <span className="text-white font-bold">{formatINR(p.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Membership Analytics Summary */}
      <div className="p-5 bg-[#161618] border border-[#27272a]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">
              RETENTION INSIGHTS
            </div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">
              Membership Health & Churn
            </h2>
          </div>
          <Users size={16} className="text-[#e17100]" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a]">
            <div className="text-[10px] text-[#71717a] uppercase">NEW SIGN-UPS</div>
            <div className="text-2xl font-bold text-white mt-1">{newMembersThisMonth}</div>
            <div className="text-[10px] text-emerald-500 mt-0.5">Current month</div>
          </div>
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a]">
            <div className="text-[10px] text-[#71717a] uppercase">ACTIVE BASE</div>
            <div className="text-2xl font-bold text-white mt-1">{activeCount}</div>
            <div className="text-[10px] text-[#71717a] mt-0.5">Regular athletes</div>
          </div>
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a]">
            <div className="text-[10px] text-[#71717a] uppercase">EXPIRED PASSES</div>
            <div className="text-2xl font-bold text-amber-500 mt-1">{expiredCount}</div>
            <div className="text-[10px] text-[#71717a] mt-0.5">Unrenewed members</div>
          </div>
          <div className="p-4 bg-[#0d0d0f] border border-[#27272a]">
            <div className="text-[10px] text-[#71717a] uppercase">ESTIMATED CHURN</div>
            <div className="text-2xl font-bold text-[#e17100] mt-1">
              {members.length > 0 ? ((expiredCount / members.length) * 100).toFixed(1) : 0}%
            </div>
            <div className="text-[10px] text-[#71717a] mt-0.5">Total lapsed ratio</div>
          </div>
        </div>
      </div>
    </div>
  );
};
