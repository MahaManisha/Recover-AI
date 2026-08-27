import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Cpu, Eye, EyeOff, Lock, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { loginUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [apiError, setApiError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage);
    }
  }, [location]);

  const validateEmail = (val) => {
    if (!val.trim()) {
      return 'Email address is required.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(val)) {
      return 'Please enter a valid email address.';
    }
    return '';
  };

  const validatePassword = (val) => {
    if (!val) {
      return 'Password is required.';
    }
    return '';
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    if (emailError) {
      setEmailError(validateEmail(val));
    }
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    if (passwordError) {
      setPasswordError(validatePassword(val));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const errEmail = validateEmail(email);
    const errPass = validatePassword(password);

    setEmailError(errEmail);
    setPasswordError(errPass);

    if (errEmail || errPass) {
      return;
    }

    setSubmitting(true);

    const result = await loginUser({
      email: email.trim(),
      password,
    });

    setSubmitting(false);

    if (result.success) {
      // Update global AuthContext state
      login(result.data.access_token, result.data.user);

      const userRole = result.data.user?.role?.toUpperCase();
      const returnTo = location.state?.returnTo || location.state?.from?.pathname;

      // Safe return path navigation if authorized for role
      if (returnTo && returnTo.startsWith('/customer') && userRole === 'CUSTOMER') {
        navigate('/customer', { replace: true });
      } else if (returnTo && returnTo.startsWith('/merchant') && userRole === 'MERCHANT') {
        navigate('/merchant', { replace: true });
      } else if (userRole === 'CUSTOMER') {
        navigate('/customer', { replace: true });
      } else if (userRole === 'MERCHANT') {
        navigate('/merchant', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } else {
      setApiError(result.error);
    }
  };

  const isFormValid = Boolean(email.trim() && password && !validateEmail(email) && !validatePassword(password));

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-4 sm:p-6 bg-grid-pattern">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-4">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5">
            Welcome back
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Sign in to your RecoverAI account to manage revenue recovery.
          </p>
        </div>

        {/* Success Banner (e.g. redirected from registration) */}
        {successMessage && (
          <div className="mb-6 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-start gap-2.5 shadow-inner">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-200 mb-0.5">Success</p>
              <p>{successMessage}</p>
            </div>
          </div>
        )}

        {/* Backend Error Banner */}
        {apiError && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 shadow-inner">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200 mb-0.5">Authentication Failed</p>
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email Input */}
          <div>
            <label 
              htmlFor="login-email" 
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Email Address <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                placeholder="name@company.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950/80 border text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  emailError 
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
                    : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                }`}
              />
            </div>
            {emailError && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                {emailError}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label 
              htmlFor="login-password" 
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2"
            >
              Password <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="••••••••"
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl bg-slate-950/80 border text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  passwordError 
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
                    : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1.5 text-xs text-rose-400 font-medium flex items-center gap-1">
                {passwordError}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between text-xs pt-1">
            <label htmlFor="remember-me" className="flex items-center gap-2 text-slate-400 cursor-pointer select-none">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              onClick={() => alert("Password reset functionality will be implemented in a future milestone.")}
              className="text-slate-400 hover:text-cyan-400 transition-colors font-medium"
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Footer Registration Link */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}
