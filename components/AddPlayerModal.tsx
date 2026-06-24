'use client';

import { useState, useTransition } from 'react';
import { UserPlus, X } from 'lucide-react';
import { addPlayerAction } from '@/app/actions';

export default function AddPlayerModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    startTransition(async () => {
      const result = await addPlayerAction(name, avatarUrl);

      if (!result.success) {
        setErrorMsg(result.error || 'Something went wrong.');
      } else {
        // Reset states and clear view on success
        setName('');
        setAvatarUrl('');
        setIsOpen(false);
      }
    });
  };

  return (
    <>
      {/* Clean, un-positioned Add Player Trigger */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-gray-900 hover:bg-black text-white rounded-full py-3.5 sm:py-4 flex items-center justify-center gap-2 font-black text-[11px] sm:text-[12px] tracking-widest shadow-xl shadow-gray-900/20 transition-all active:scale-[0.98]"
      >
        <UserPlus size={16} strokeWidth={3} />
        <span>ADD PLAYER</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[24px] p-5 sm:p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">

            <header className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Register Player</h3>
                <p className="text-xs font-medium text-gray-400 mt-0.5">Expand the ATP-Nabunturan roster</p>
              </div>
              <button
                onClick={() => { setIsOpen(false); setErrorMsg(''); }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5 pl-1">Full Name</label>
                <input
                  type="text"
                  required
                  disabled={isPending}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Alker Raya"
                  className="w-full bg-[#F4F6F9] border-0 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#00D68F] transition-all disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 tracking-wider uppercase mb-1.5 pl-1">Avatar Image URL (Optional)</label>
                <input
                  type="text"
                  disabled={isPending}
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full bg-[#F4F6F9] border-0 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-[#00D68F] transition-all disabled:opacity-60"
                />
              </div>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-rose-600 text-xs font-semibold pl-4">
                  ⚠️ {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full bg-[#00D68F] hover:bg-[#00c483] disabled:bg-gray-200 text-white font-black text-sm py-3.5 rounded-full tracking-wider transition-all active:scale-[0.98] shadow-md shadow-[#00D68F]/10 flex items-center justify-center gap-2"
              >
                {isPending ? 'REGISTRATION IN PROGRESS...' : 'ADD TO ROSTER'}
              </button>
            </form>

          </div>
        </div>
      )}
    </>
  );
}