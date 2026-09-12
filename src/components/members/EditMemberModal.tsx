import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Member } from '../../types';
import { updateMember } from '../../lib/storage';
import { useToast } from '../ui/Toast';

interface EditMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: Member | null;
  onSuccess?: () => void;
}

export const EditMemberModal: React.FC<EditMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | 'Prefer not to say'>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (member && isOpen) {
      setName(member.name || '');
      setPhone(member.phone || '');
      setEmail(member.email || '');
      setGender(member.gender || 'Male');
      setDateOfBirth(member.dateOfBirth || '');
      setAddress(member.address || '');
      setEmergencyContact(member.emergencyContact || '');
      setNotes(member.notes || '');
    }
  }, [member, isOpen]);

  if (!member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      showToast('Name and phone are required', 'error');
      return;
    }

    setIsLoading(true);
    try {
      updateMember({
        ...member,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        gender,
        dateOfBirth,
        address: address.trim(),
        emergencyContact: emergencyContact.trim(),
        notes: notes.trim(),
      });

      setIsLoading(false);
      showToast(`Updated details for ${name}`);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      showToast(err.message || 'Failed to update member', 'error');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="EDIT MEMBER"
      subtitle={`Member ID: ${member.memberId}`}
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 font-mono text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">FULL NAME *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">PHONE NUMBER *</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">GENDER</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value as any)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">ADDRESS</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">EMERGENCY CONTACT</label>
            <input
              type="text"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-[10px] font-bold text-[#71717a] uppercase">TRAINER NOTES</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-[#0d0d0f] border border-[#27272a] text-[#f4f4f5] focus:outline-none focus:border-[#e17100]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#27272a] flex justify-end gap-2">
          <Button type="button" variant="secondary" size="md" onClick={onClose}>
            CANCEL
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading}>
            SAVE CHANGES
          </Button>
        </div>
      </form>
    </Modal>
  );
};
