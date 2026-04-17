// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Mail, Lock, ArrowRight, Chrome, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api';
import { toast } from 'sonner';
import { getErrorMessage } from '../utils/errorHandler';

export const AuthPage = () => {
  const [mode, setMode] = useState('login'); // login, signup, otp, verify-email
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get('session') === 'expired') {
      toast.error('Session expired. Please log in again.');
      navigate('/login', { replace: true });
    }
  }, [navigate, searchParams]);

  const handleOAuthLogin = (provider) => {
    const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
    window.location.href = `${baseUrl}/auth/oauth/${provider}/login`;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.login({ email, password });
      setMode('otp');
      toast.success('OTP sent to your email');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await authApi.verifyLogin({ email, code: otp });
      login(data.access_token, data.user);
      navigate('/dashboard');
      toast.success('Welcome back!');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { data } = await authApi.register({ name, email, password });
      if (data?.dev_verification_code) {
        setVerificationCode(data.dev_verification_code);
      }
      setMode('verify-email');
      toast.success(data?.message || 'Verification email sent');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await authApi.verifyEmail({ email, code: verificationCode });
      toast.success('Email verified successfully');
      setMode('login');
      setPassword('');
      setOtp('');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/20">
            <Briefcase className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">JobTrack Pro</h1>
          <p className="text-slate-500 mt-2">Your career command center</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <AnimatePresence mode="wait">
            {mode === 'login' && (
              <motion.div
                key="login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Welcome Back</h2>
                  <p className="text-sm text-slate-500">Enter your credentials to access your dashboard</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="email" 
                        placeholder="name@example.com" 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-700">Password</label>
                      <button type="button" className="text-xs font-medium text-blue-600 hover:text-blue-700">Forgot password?</button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="password" 
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <button 
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm group disabled:opacity-50"
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                  
                  <div className="relative py-4">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-slate-500">Or continue with</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <button type="button" onClick={() => handleOAuthLogin('google')} className="flex items-center justify-center gap-2 border border-slate-200 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all">
                      <Chrome className="w-4 h-4" /> Continue with Google
                    </button>
                  </div>
                  
                  <p className="text-sm text-center text-slate-500 mt-6">
                    Don't have an account?{" "}
                    <button type="button" className="text-blue-600 font-medium hover:underline" onClick={() => setMode('signup')}>Sign up</button>
                  </p>
                </form>
              </motion.div>
            )}

            {mode === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Two-Step Verification</h2>
                  <p className="text-sm text-slate-500">We've sent a 6-digit code to {email}</p>
                </div>
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Verification Code</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        placeholder="000000" 
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-mono tracking-[0.5em] text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <button 
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Verifying..." : "Verify & Continue"}
                  </button>
                  <button type="button" className="w-full text-sm font-medium text-slate-500 hover:text-slate-700" onClick={() => setMode('login')}>
                    Back to Login
                  </button>
                </form>
              </motion.div>
            )}

            {mode === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8"
              >
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">Create Account</h2>
                  <p className="text-sm text-slate-500">Start tracking your career journey today</p>
                </div>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Full Name</label>
                    <input 
                      type="text" 
                      placeholder="John Doe" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <input 
                      type="email" 
                      placeholder="name@example.com" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Password</label>
                    <input 
                      type="password" 
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </div>
                  <button 
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                    type="submit" 
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating account..." : "Create Account"}
                  </button>
                  <p className="text-sm text-center text-slate-500 mt-6">
                    Already have an account?{" "}
                    <button type="button" className="text-blue-600 font-medium hover:underline" onClick={() => setMode('login')}>Sign in</button>
                  </p>
                </form>
              </motion.div>
            )}

            {mode === 'verify-email' && (
              <motion.div
                key="verify-email"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="p-8 text-center"
              >
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Verify your email</h2>
                <p className="text-sm text-slate-500 mb-6">
                  Enter the verification code for <strong>{email}</strong>. In local development, the backend returns a dev code when SMTP is not configured.
                </p>
                <form onSubmit={handleVerifyEmail} className="space-y-4 text-left">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Verification Code</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                      <input
                        placeholder="123456"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-lg font-mono tracking-[0.5em] text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        maxLength={6}
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button
                    className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-all shadow-sm disabled:opacity-50"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Verifying...' : 'Verify Email'}
                  </button>
                  <button
                    type="button"
                    className="w-full text-sm font-medium text-slate-500 hover:text-slate-700"
                    onClick={() => setMode('login')}
                  >
                    Back to Login
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
