import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Cpu, Eye, EyeOff, Lock, Mail, User, Store, UserCheck, Loader2, AlertCircle, Check } from 'lucide-react';
import { registerUser } from '../services/api';

export function Register() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('merchant'); // 'customer' | 'merchant'
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const validate = (fieldValues = { fullName, email, password, confirmPassword, acceptedTerms, role }) => {
    let tempErrors = { ...errors };

    if ('fullName' in fieldValues) {
      if (!fieldValues.fullName.trim()) {
        tempErrors.fullName = 'Full name is required.';
      } else if (fieldValues.fullName.trim().length < 2) {
        tempErrors.fullName = 'Full name must be at least 2 characters.';
      } else {
        tempErrors.fullName = '';
      }
    }

    if ('email' in fieldValues) {
      if (!fieldValues.email.trim()) {
        tempErrors.email = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fieldValues.email)) {
        tempErrors.email = 'Please enter a valid email address.';
      } else {
        tempErrors.email = '';
      }
    }

    if ('password' in fieldValues) {
      if (!fieldValues.password) {
        tempErrors.password = 'Password is required.';
      } else if (fieldValues.password.length < 8) {
        tempErrors.password = 'Password must be at least 8 characters.';
      } else {
        tempErrors.password = '';
      }
    }

    if ('confirmPassword' in fieldValues || 'password' in fieldValues) {
      const confirmVal = fieldValues.confirmPassword !== undefined ? fieldValues.confirmPassword : confirmPassword;
      const passVal = fieldValues.password !== undefined ? fieldValues.password : password;
      if (!confirmVal) {
        tempErrors.confirmPassword = 'Please confirm your password.';
      } else if (confirmVal !== passVal) {
        tempErrors.confirmPassword = 'Passwords do not match.';
      } else {
        tempErrors.confirmPassword = '';
      }
    }

    if ('acceptedTerms' in fieldValues) {
      if (!fieldValues.acceptedTerms) {
        tempErrors.acceptedTerms = 'You must accept the terms and conditions.';
      } else {
        tempErrors.acceptedTerms = '';
      }
    }

    if ('role' in fieldValues) {
      if (!fieldValues.role) {
        tempErrors.role = 'Please select an account role.';
      } else {
        tempErrors.role = '';
      }
    }

    setErrors(tempErrors);
    return tempErrors;
  };

  const handleFullNameChange = (e) => {
    const val = e.target.value;
    setFullName(val);
    validate({ fullName: val });
  };

  const handleEmailChange = (e) => {
    const val = e.target.value;
    setEmail(val);
    validate({ email: val });
  };

  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setPassword(val);
    validate({ password: val });
  };

  const handleConfirmPasswordChange = (e) => {
    const val = e.target.value;
    setConfirmPassword(val);
    validate({ confirmPassword: val });
  };

  const handleTermsChange = (e) => {
    const checked = e.target.checked;
    setAcceptedTerms(checked);
    validate({ acceptedTerms: checked });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError('');

    const currentErrors = validate();
    const hasError = Object.values(currentErrors).some((err) => err !== '');

    if (hasError) {
      return;
    }

    setSubmitting(true);

    const result = await registerUser({
      full_name: fullName.trim(),
      email: email.trim(),
      password,
      role: role.toUpperCase(),
    });

    setSubmitting(false);

    if (result.success) {
      // Navigate to /login with success message
      navigate('/login', {
        state: { successMessage: 'Account created successfully. Please sign in.' },
      });
    } else {
      setApiError(result.error);
    }
  };

  const isFormValid = Boolean(
    fullName.trim().length >= 2 &&
    email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 8 &&
    confirmPassword === password &&
    acceptedTerms &&
    role
  );

  return (
    <div className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-4 sm:p-6 bg-grid-pattern py-8">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 mb-3">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
            Create your account
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Sign up to start using RecoverAI for revenue recovery.
          </p>
        </div>

        {/* Backend Error Banner */}
        {apiError && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 shadow-inner">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200 mb-0.5">Registration Failed</p>
              <p>{apiError}</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          
          {/* Role Selection UI */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Select Account Type <span className="text-cyan-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* Customer Role Option */}
              <button
                type="button"
                onClick={() => { setRole('customer'); validate({ role: 'customer' }); }}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  role === 'customer'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <UserCheck className={`h-4 w-4 ${role === 'customer' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {role === 'customer' && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Customer</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Make and manage purchases</p>
                </div>
              </button>

              {/* Merchant Role Option */}
              <button
                type="button"
                onClick={() => { setRole('merchant'); validate({ role: 'merchant' }); }}
                className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  role === 'merchant'
                    ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 shadow-md shadow-cyan-500/10'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Store className={`h-4 w-4 ${role === 'merchant' ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {role === 'merchant' && <Check className="h-3.5 w-3.5 text-cyan-400" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Merchant</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Manage revenue recovery</p>
                </div>
              </button>
            </div>
            {errors.role && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.role}</p>
            )}
          </div>

          {/* Full Name Input */}
          <div>
            <label 
              htmlFor="register-fullname" 
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Full Name <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <input
                id="register-fullname"
                type="text"
                required
                value={fullName}
                onChange={handleFullNameChange}
                placeholder="Alex Morgan"
                className={`w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  errors.fullName 
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
                    : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                }`}
              />
            </div>
            {errors.fullName && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.fullName}</p>
            )}
          </div>

          {/* Email Input */}
          <div>
            <label 
              htmlFor="register-email" 
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Email Address <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                id="register-email"
                type="email"
                required
                value={email}
                onChange={handleEmailChange}
                placeholder="name@company.com"
                className={`w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  errors.email 
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
                    : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                }`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.email}</p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label 
              htmlFor="register-password" 
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Password <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="register-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={handlePasswordChange}
                placeholder="Minimum 8 characters"
                className={`w-full pl-10 pr-11 py-2 rounded-xl bg-slate-950/80 border text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  errors.password 
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
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.password}</p>
            )}
          </div>

          {/* Confirm Password Input */}
          <div>
            <label 
              htmlFor="register-confirm-password" 
              className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5"
            >
              Confirm Password <span className="text-cyan-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                id="register-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                placeholder="Re-enter password"
                className={`w-full pl-10 pr-11 py-2 rounded-xl bg-slate-950/80 border text-sm text-slate-100 placeholder-slate-600 focus:outline-none transition-all ${
                  errors.confirmPassword 
                    ? 'border-rose-500/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500' 
                    : 'border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.confirmPassword}</p>
            )}
          </div>

          {/* Terms & Conditions Checkbox */}
          <div className="pt-1">
            <label htmlFor="accepted-terms" className="flex items-start gap-2.5 text-xs text-slate-400 cursor-pointer select-none">
              <input
                id="accepted-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={handleTermsChange}
                className="h-4 w-4 rounded bg-slate-950 border-slate-800 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer mt-0.5"
              />
              <span>
                I agree to the <span className="text-cyan-400 font-medium hover:underline">Terms of Service</span> and <span className="text-cyan-400 font-medium hover:underline">Privacy Policy</span>.
              </span>
            </label>
            {errors.acceptedTerms && (
              <p className="mt-1 text-xs text-rose-400 font-medium">{errors.acceptedTerms}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.99] flex items-center justify-center gap-2 pt-2"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Footer Login Link */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
