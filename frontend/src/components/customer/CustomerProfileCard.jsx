import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserCheck, ShieldCheck, Mail, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function CustomerProfileCard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Helper to extract initials from customer full name
  const getInitials = (name) => {
    if (!name || typeof name !== 'string') return 'C';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(user?.full_name);
  const fullName = user?.full_name || 'Customer Account';
  const email = user?.email || 'customer@example.com';
  const role = user?.role || 'CUSTOMER';
  const isActive = user?.is_active !== false;

  return (
    <div className="w-full bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-xl transition-all">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Left Section: Avatar & Info */}
        <div className="flex items-start md:items-center gap-4 sm:gap-6">
          {/* Avatar with initials */}
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl shadow-lg shadow-cyan-500/20 shrink-0 border border-cyan-400/30 select-none">
            {initials}
          </div>

          {/* User Details */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white truncate">
                {fullName}
              </h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                <UserCheck className="h-3 w-3" />
                {role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-400 truncate">
              <Mail className="h-4 w-4 shrink-0 text-slate-500" />
              <span className="truncate">{email}</span>
            </div>

            {/* Account Status Badge */}
            <div className="flex items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Active Account
              </span>
              <span className="text-slate-600 text-xs">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" /> Verified Identity
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Logout Button */}
        <div className="shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 border border-slate-700/60 hover:border-rose-900/60 text-xs sm:text-sm font-semibold transition-all shadow-sm active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>
    </div>
  );
}
