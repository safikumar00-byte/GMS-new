import React, { useState, useMemo } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Expense, ExpenseCategory, PaymentMethod } from '../../types';
import { 
  getExpenses, 
  addExpense, 
  deleteExpense, 
  getDashboardMetrics, 
  getGym 
} from '../../lib/storage';
import { formatINR, formatDate, getTodayString } from '../../lib/calculations';
import { exportExpensesCSV } from '../../lib/export';
import { useToast } from '../ui/Toast';
import { Plus, Download, Search, Trash2, TrendingDown, DollarSign } from 'lucide-react';

export const ExpensesView: React.FC = () => {
  const { showToast } = useToast();
  const gym = getGym();
  const metrics = getDashboardMetrics();
  const expenses = getExpenses();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('Maintenance');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(getTodayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [notes, setNotes] = useState('');

  const categories: ExpenseCategory[] = [
    'Rent',
    'Electricity',
    'Salaries',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Other',
  ];

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const query = searchTerm.toLowerCase();
      const matchesSearch =
        e.description.toLowerCase().includes(query) ||
        (e.notes && e.notes.toLowerCase().includes(query));
      const matchesCategory =
        categoryFilter === 'ALL' || e.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchTerm, categoryFilter]);

  const totalFilteredExpense = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const handleExportCSV = () => {
    exportExpensesCSV(filteredExpenses);
    showToast(`Exported ${filteredExpenses.length} expense records to CSV`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0) {
      showToast('Please enter a description and valid amount', 'error');
      return;
    }

    try {
      addExpense({
        category,
        description: description.trim(),
        amount: numAmount,
        date,
        paymentMethod,
        notes: notes.trim(),
      });
      showToast(`Expense of ${formatINR(numAmount)} recorded`);
      setIsAddModalOpen(false);
      setDescription('');
      setAmount('');
      setNotes('');
    } catch (err: any) {
      showToast(err.message || 'Failed to record expense', 'error');
    }
  };

  const handleDeleteConfirm = () => {
    if (expenseToDelete) {
      deleteExpense(expenseToDelete.id);
      showToast('Expense record deleted');
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            OPERATIONAL EXPENDITURE
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            EXPENSES
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Track rent, equipment maintenance, utilities, and team payroll
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="md" onClick={handleExportCSV} className="gap-1.5">
            <Download size={14} />
            <span className="hidden sm:inline">EXPORT CSV</span>
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-1.5"
          >
            <Plus size={15} />
            <span>+ ADD EXPENSE</span>
          </Button>
        </div>
      </div>

      {/* 3 Executive Financial Health Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 bg-[#161618] border border-[#27272a] flex flex-col justify-between">
          <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">
            THIS MONTH'S EXPENSES
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {formatINR(metrics.thisMonthExpenses)}
            </span>
          </div>
          <div className="text-[11px] text-[#71717a]">
            Total outgoings logged this month
          </div>
        </div>

        <div className="p-5 bg-[#161618] border border-[#27272a] flex flex-col justify-between">
          <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">
            THIS MONTH'S REVENUE
          </div>
          <div className="my-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-500 tracking-tight">
              {formatINR(metrics.thisMonthRevenue)}
            </span>
          </div>
          <div className="text-[11px] text-[#71717a]">
            Gross membership payments collected
          </div>
        </div>

        <div className="p-5 bg-[#161618] border border-[#27272a] flex flex-col justify-between">
          <div className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest">
            NET OPERATING INCOME
          </div>
          <div className="my-2">
            <span
              className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                metrics.netIncome >= 0 ? 'text-[#e17100]' : 'text-[#ef4444]'
              }`}
            >
              {formatINR(metrics.netIncome)}
            </span>
          </div>
          <div className="text-[11px] text-[#71717a]">
            Revenue minus operational expenses
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 bg-[#161618] border border-[#27272a] flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative w-full md:w-80">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
          <input
            type="text"
            placeholder="Search description, notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-[10px] text-[#71717a] uppercase font-bold">CATEGORY:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] text-xs focus:outline-none focus:border-[#e17100]"
          >
            <option value="ALL">ALL CATEGORIES</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#161618] border border-[#27272a] overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#0d0d0f] text-[10px] text-[#71717a] uppercase">
              <th className="p-3 font-bold">DATE</th>
              <th className="p-3 font-bold">CATEGORY</th>
              <th className="p-3 font-bold">DESCRIPTION</th>
              <th className="p-3 font-bold">METHOD</th>
              <th className="p-3 font-bold">AMOUNT</th>
              <th className="p-3 font-bold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272a]">
            {filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-[#71717a]">
                  No expense records match the query.
                </td>
              </tr>
            ) : (
              filteredExpenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-[#0d0d0f]/60 transition-colors">
                  <td className="p-3 text-[#a1a1aa]">{formatDate(exp.date)}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 bg-[#0d0d0f] border border-[#27272a] text-[10px] text-white">
                      {exp.category}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="text-white font-medium">{exp.description}</div>
                    {exp.notes && (
                      <div className="text-[10px] text-[#71717a] mt-0.5">{exp.notes}</div>
                    )}
                  </td>
                  <td className="p-3 text-[#a1a1aa] uppercase text-[11px]">{exp.paymentMethod}</td>
                  <td className="p-3 text-white font-bold">{formatINR(exp.amount)}</td>
                  <td className="p-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpenseToDelete(exp)}
                      className="p-1.5 h-7 text-[#ef4444] hover:bg-[#ef4444]/10"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Expense Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="+ RECORD EXPENSE"
        subtitle="Log gym overhead, equipment maintenance, or vendor bills"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">CATEGORY *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">DATE *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">DESCRIPTION *</label>
            <input
              type="text"
              required
              placeholder="e.g. Cable replacement for pulley machine, September power bill"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">AMOUNT (₹) *</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 3500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-white font-bold focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">
                PAYMENT METHOD *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">NOTES (OPTIONAL)</label>
            <textarea
              rows={2}
              placeholder="Vendor details, bill number, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>

          <div className="pt-3 border-t border-[#27272a] flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setIsAddModalOpen(false)}
            >
              CANCEL
            </Button>
            <Button type="submit" variant="primary" size="md">
              RECORD EXPENSE
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {expenseToDelete && (
        <ConfirmDialog
          isOpen={!!expenseToDelete}
          onClose={() => setExpenseToDelete(null)}
          onConfirm={handleDeleteConfirm}
          title="DELETE EXPENSE?"
          message={`Are you sure you want to delete "${expenseToDelete.description}" (${formatINR(expenseToDelete.amount)})?`}
          confirmLabel="DELETE"
        />
      )}
    </div>
  );
};
