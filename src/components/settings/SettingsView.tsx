import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Gym, User } from '../../types';
import { 
  getGym, 
  saveGym, 
  getUser, 
  saveUser, 
  exportAllDataJson, 
  importDataJson, 
  resetToDemoData 
} from '../../lib/storage';
import { useToast } from '../ui/Toast';
import { Download, Upload, RotateCcw, Save, Shield, Moon, Sun } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { showToast } = useToast();
  const [gym, setGymState] = useState<Gym>(getGym());
  const [user, setUserState] = useState<User>(getUser());
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isThemeDark, setIsThemeDark] = useState(true);

  // Sync state
  useEffect(() => {
    setGymState(getGym());
    setUserState(getUser());
    setIsThemeDark(document.documentElement.classList.contains('dark') || true);
  }, []);

  const handleSaveGym = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      saveGym(gym);
      saveUser(user);
      showToast('Settings successfully updated');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  };

  const handleExportBackup = () => {
    const jsonStr = exportAllDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `gym-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Database exported as JSON backup');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const success = importDataJson(content);
        if (success) {
          showToast('Data imported successfully! Reloading...');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('Invalid backup file structure', 'error');
        }
      } catch {
        showToast('Error reading backup file', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDemoData = () => {
    resetToDemoData();
    showToast('Application reset to initial demo data');
    setTimeout(() => window.location.reload(), 800);
  };

  const toggleTheme = (dark: boolean) => {
    setIsThemeDark(dark);
    if (dark) {
      document.documentElement.classList.add('dark');
      document.body.className = 'bg-[#0a0a0b] text-[#d4d4d8] antialiased';
    } else {
      document.documentElement.classList.remove('dark');
      document.body.className = 'bg-[#fafafa] text-[#171717] antialiased';
    }
    showToast(`Theme switched to ${dark ? 'Elegant Dark' : 'Clean Light'}`);
  };

  return (
    <div className="flex flex-col gap-6 font-mono text-xs max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#27272a] pb-6">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#71717a] mb-1">
            APPLICATION PREFERENCES
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            SETTINGS
          </h1>
          <p className="text-xs text-[#a1a1aa] mt-1">
            Manage gym branding, receipt sequence, UPI payment configurations, and backups
          </p>
        </div>
      </div>

      <form onSubmit={handleSaveGym} className="flex flex-col gap-6">
        {/* Section 1: Gym Identity & Branding */}
        <div className="p-5 bg-[#161618] border border-[#27272a] space-y-4">
          <div className="border-b border-[#27272a] pb-2">
            <h2 className="text-xs font-bold text-[#e17100] uppercase tracking-wider">
              1. GYM IDENTITY & BRANDING
            </h2>
            <p className="text-[11px] text-[#71717a]">Appears on member receipts and headers</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">GYM NAME *</label>
              <input
                type="text"
                required
                value={gym.name}
                onChange={(e) => setGymState({ ...gym, name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-white font-bold focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">PHONE NUMBER *</label>
              <input
                type="tel"
                required
                value={gym.phone}
                onChange={(e) => setGymState({ ...gym, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">OFFICIAL EMAIL</label>
              <input
                type="email"
                value={gym.email}
                onChange={(e) => setGymState({ ...gym, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">GSTIN / TAX REG</label>
              <input
                type="text"
                value={gym.gstNumber || ''}
                onChange={(e) => setGymState({ ...gym, gstNumber: e.target.value })}
                placeholder="e.g. 29AAAAA0000A1Z5"
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">FULL PHYSICAL ADDRESS</label>
              <input
                type="text"
                value={gym.address}
                onChange={(e) => setGymState({ ...gym, address: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Receipt & Payment Parameters */}
        <div className="p-5 bg-[#161618] border border-[#27272a] space-y-4">
          <div className="border-b border-[#27272a] pb-2">
            <h2 className="text-xs font-bold text-[#e17100] uppercase tracking-wider">
              2. RECEIPT & PAYMENT PARAMETERS
            </h2>
            <p className="text-[11px] text-[#71717a]">
              Sequential numbering scheme and default payment gateway configurations
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">
                RECEIPT PREFIX
              </label>
              <input
                type="text"
                value={gym.receiptPrefix}
                onChange={(e) => setGymState({ ...gym, receiptPrefix: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-white font-bold focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">
                BUSINESS UPI ID
              </label>
              <input
                type="text"
                value={gym.upiId || ''}
                placeholder="e.g. gymfit@okaxis"
                onChange={(e) => setGymState({ ...gym, upiId: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-[10px] font-bold text-[#71717a] uppercase">
                RECEIPT FOOTER NOTE
              </label>
              <input
                type="text"
                value={gym.receiptFooter || ''}
                placeholder="Thank you for training with us! Fees once paid are non-refundable."
                onChange={(e) => setGymState({ ...gym, receiptFooter: e.target.value })}
                className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Visual Theme Selection */}
        <div className="p-5 bg-[#161618] border border-[#27272a] space-y-4">
          <div className="border-b border-[#27272a] pb-2">
            <h2 className="text-xs font-bold text-[#e17100] uppercase tracking-wider">
              3. VISUAL THEME
            </h2>
            <p className="text-[11px] text-[#71717a]">Select aesthetic color system</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div
              onClick={() => toggleTheme(true)}
              className={`p-4 border cursor-pointer transition-colors ${
                isThemeDark
                  ? 'border-[#e17100] bg-[#0d0d0f]'
                  : 'border-[#27272a] bg-[#161618] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 text-white font-bold">
                <Moon size={15} className="text-[#e17100]" />
                <span>ELEGANT DARK (ACTIVE)</span>
              </div>
              <p className="text-[10px] text-[#a1a1aa]">
                Dark OLED zinc palette (#0a0a0b) with industrial amber accents (#e17100) and Geist Mono font.
              </p>
            </div>

            <div
              onClick={() => toggleTheme(false)}
              className={`p-4 border cursor-pointer transition-colors ${
                !isThemeDark
                  ? 'border-[#e17100] bg-white text-zinc-900'
                  : 'border-[#27272a] bg-[#161618] opacity-60'
              }`}
            >
              <div className="flex items-center gap-2 mb-2 font-bold">
                <Sun size={15} className="text-[#e17100]" />
                <span>CLEAN LIGHT</span>
              </div>
              <p className="text-[10px] text-[#71717a]">
                High-contrast off-white canvas with dark slate typography and clean borders.
              </p>
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" className="gap-2">
            <Save size={14} />
            <span>SAVE SETTINGS</span>
          </Button>
        </div>
      </form>

      {/* Section 4: Backup & Restoration Engine */}
      <div className="p-5 bg-[#161618] border border-[#27272a] space-y-4 mt-2">
        <div className="border-b border-[#27272a] pb-2">
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">
            4. BACKUP & DATA RECOVERY
          </h2>
          <p className="text-[11px] text-[#71717a]">
            Export or restore all members, payments, memberships, and receipts locally
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleExportBackup} className="gap-1.5">
            <Download size={13} />
            <span>EXPORT FULL BACKUP (JSON)</span>
          </Button>

          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0d0d0f] border border-[#27272a] text-[#d4d4d8] hover:text-white cursor-pointer transition-colors text-xs">
            <Upload size={13} />
            <span>RESTORE FROM JSON</span>
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsResetConfirmOpen(true)}
            className="gap-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 ml-auto"
          >
            <RotateCcw size={13} />
            <span>RESET TO DEMO DATA</span>
          </Button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {isResetConfirmOpen && (
        <ConfirmDialog
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={handleResetDemoData}
          title="RESET APPLICATION DATA?"
          message="This will erase any newly added members or transactions and restore the standard Bangalore gym commercial dataset. Are you sure?"
          confirmLabel="RESET EVERYTHING"
        />
      )}
    </div>
  );
};
