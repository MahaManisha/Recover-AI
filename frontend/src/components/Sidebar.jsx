import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, UserCheck, Store, LogIn, LogOut, LayoutDashboard, Bot } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function Sidebar() {
  const { isAuthenticated, role, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Home', path: '/', icon: Home, show: true },
    { name: 'Customer', path: '/customer', icon: UserCheck, show: isAuthenticated && role === 'CUSTOMER' },
    { name: 'Merchant', path: '/merchant', icon: Store, show: isAuthenticated && role === 'MERCHANT' },
    { name: 'Agent Console', path: '/agent', icon: Bot, show: isAuthenticated && role === 'MERCHANT' },
    { name: 'Login', path: '/login', icon: LogIn, show: !isAuthenticated },
  ];

  const visibleNavItems = navItems.filter((item) => item.show);

  return (
    <aside className="w-full md:w-64 bg-slate-900/60 border-b md:border-b-0 md:border-r border-slate-800/80 backdrop-blur-xl flex md:flex-col justify-between shrink-0 z-40">
      <div className="p-4 md:p-6 w-full">
        <div className="hidden md:flex items-center gap-2 px-3 py-2 mb-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <LayoutDashboard className="h-4 w-4 text-cyan-400" />
          Navigation
        </div>

        <nav className="flex md:flex-col gap-1 w-full overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm shadow-cyan-500/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}

          {/* Logout Button for Authenticated Users */}
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all w-full text-left mt-2 md:mt-4"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span>Logout</span>
            </button>
          )}
        </nav>
      </div>

      {/* Authenticated User Session Info Badge */}
      <div className="hidden md:block p-4 mx-4 mb-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
        {isAuthenticated ? (
          <div>
            <p className="font-semibold text-slate-200 truncate">{user?.full_name || 'User'}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                {role}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <p className="font-semibold text-slate-400 mb-0.5">RecoverAI v0.1.0</p>
            <p className="text-slate-500">Role-Based Access Control</p>
          </div>
        )}
      </div>
    </aside>
  );
}
