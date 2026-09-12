import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { MembershipPlan } from '../../types';
import { 
  getPlans, 
  addPlan, 
  updatePlan, 
  deletePlan, 
  getMemberships 
} from '../../lib/storage';
import { formatINR } from '../../lib/calculations';
import { useToast } from '../ui/Toast';
import { Plus, Edit, Trash2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';

export const PlansView: React.FC = () => {
  const { showToast } = useToast();
  const plans = getPlans();
  const memberships = getMemberships();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [planToDelete, setPlanToDelete] = useState<MembershipPlan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [durationMonths, setDurationMonths] = useState<number>(1);
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const openAddModal = () => {
    setName('');
    setDurationMonths(1);
    setPrice('');
    setDescription('');
    setIsActive(true);
    setIsAddModalOpen(true);
  };

  const openEditModal = (p: MembershipPlan) => {
    setEditingPlan(p);
    setName(p.name);
    setDurationMonths(p.durationMonths);
    setPrice(p.price.toString());
    setDescription(p.description || '');
    setIsActive(p.isActive);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const numPrice = parseFloat(price);
    if (!name.trim() || isNaN(numPrice) || numPrice <= 0) {
      showToast('Please enter a valid plan name and positive price', 'error');
      return;
    }

    try {
      if (editingPlan) {
        updatePlan({
          ...editingPlan,
          name: name.trim(),
          durationMonths,
          price: numPrice,
          description: description.trim(),
          isActive,
        });
        showToast(`Plan ${name} updated`);
        setEditingPlan(null);
      } else {
        addPlan({
          name: name.trim(),
          durationMonths,
          price: numPrice,
          description: description.trim(),
          isActive,
        });
        showToast(`New plan ${name} created`);
        setIsAddModalOpen(false);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to save plan', 'error');
    }
  };

  const handleDeleteClick = (p: MembershipPlan) => {
    // Check if any members have active or past memberships with this plan
    const usedCount = memberships.filter((m) => m.planId === p.id).length;
    if (usedCount > 0) {
      showToast(
        `Cannot delete "${p.name}" because it is linked to ${usedCount} member record(s). Deactivate the plan instead to stop new sign-ups.`,
        'error'
      );
      return;
    }
    setPlanToDelete(p);
  };

  const handleConfirmDelete = () => {
    if (planToDelete) {
      deletePlan(planToDelete.id);
      showToast(`Plan ${planToDelete.name} deleted`);
      setPlanToDelete(null);
    }
  };

  const handleToggleActive = (p: MembershipPlan) => {
    updatePlan({
      ...p,
      isActive: !p.isActive,
    });
    showToast(`Plan marked ${!p.isActive ? 'Active' : 'Inactive'}`);
  };

  return (
    <div className="flex flex-col gap-6 font-mono">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            TIER CONFIGURATION
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            MEMBERSHIP PLANS
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Configure pricing schemes, billing durations, and active packages
          </p>
        </div>

        <Button variant="primary" size="md" onClick={openAddModal} className="gap-1.5">
          <Plus size={15} />
          <span>+ ADD PLAN</span>
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((p) => {
          const activeSubscribers = memberships.filter(
            (m) => m.planId === p.id && m.status === 'Active'
          ).length;

          return (
            <div
              key={p.id}
              className={`p-5 bg-[#161618] border flex flex-col justify-between transition-colors ${
                p.isActive ? 'border-[#27272a]' : 'border-[#27272a]/50 opacity-60'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight uppercase">
                      {p.name}
                    </h3>
                    <span className="text-[10px] text-[#71717a]">
                      {p.durationMonths} {p.durationMonths === 1 ? 'Month' : 'Months'} Duration
                    </span>
                  </div>
                  <button
                    onClick={() => handleToggleActive(p)}
                    className={`px-2 py-0.5 text-[9px] uppercase font-bold border ${
                      p.isActive
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60'
                        : 'bg-zinc-900 text-zinc-500 border-zinc-800'
                    }`}
                  >
                    {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </button>
                </div>

                <div className="my-4">
                  <span className="text-3xl font-bold text-white tracking-tight">
                    {formatINR(p.price)}
                  </span>
                  <span className="text-xs text-[#71717a] ml-1.5">
                    / {p.durationMonths}m
                  </span>
                </div>

                <p className="text-xs text-[#a1a1aa] leading-relaxed min-h-[40px]">
                  {p.description || 'Full equipment access, locker facility, and trainer assistance.'}
                </p>

                <div className="mt-4 pt-3 border-t border-[#27272a] text-[10px] text-[#71717a] flex items-center gap-1.5">
                  <ShieldCheck size={13} className="text-[#e17100]" />
                  <span>{activeSubscribers} members currently subscribed</span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-[#27272a] flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(p)}
                  className="h-8 text-xs gap-1"
                >
                  <Edit size={12} />
                  <span>EDIT</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(p)}
                  className="h-8 text-xs text-[#ef4444] hover:bg-[#ef4444]/10"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Plan Modal */}
      <Modal
        isOpen={isAddModalOpen || !!editingPlan}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingPlan(null);
        }}
        title={editingPlan ? 'EDIT MEMBERSHIP PLAN' : '+ CREATE PLAN'}
        subtitle="Define plan duration and standard price"
        maxWidth="md"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-4 text-xs">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">PLAN NAME *</label>
            <input
              type="text"
              required
              placeholder="e.g. Quarterly Pro, Annual Access"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">
                DURATION (MONTHS) *
              </label>
              <input
                type="number"
                min="1"
                max="60"
                required
                value={durationMonths}
                onChange={(e) => setDurationMonths(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">
                STANDARD PRICE (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 5000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-white font-bold focus:outline-none focus:border-[#e17100]"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">DESCRIPTION</label>
            <textarea
              rows={3}
              placeholder="e.g. Includes gym access, steam bath, cardio zone, and locker."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="plan-active"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="accent-[#e17100] w-4 h-4 cursor-pointer"
            />
            <label htmlFor="plan-active" className="text-white cursor-pointer select-none">
              Plan is Active (visible during member registration & renewal)
            </label>
          </div>

          <div className="pt-3 border-t border-[#27272a] flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => {
                setIsAddModalOpen(false);
                setEditingPlan(null);
              }}
            >
              CANCEL
            </Button>
            <Button type="submit" variant="primary" size="md">
              {editingPlan ? 'SAVE CHANGES' : 'CREATE PLAN'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      {planToDelete && (
        <ConfirmDialog
          isOpen={!!planToDelete}
          onClose={() => setPlanToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="DELETE PLAN?"
          message={`Are you sure you want to permanently delete plan "${planToDelete.name}"?`}
          confirmLabel="DELETE PLAN"
        />
      )}
    </div>
  );
};
