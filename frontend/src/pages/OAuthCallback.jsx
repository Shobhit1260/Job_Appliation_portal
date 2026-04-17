import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [oauthStarted, setOauthStarted] = useState(false);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;

    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const provider = searchParams.get('provider');
    const error = searchParams.get('error');

    if (error) {
      hasProcessedRef.current = true;
      toast.error(`OAuth login failed: ${error}`);
      navigate('/login', { replace: true });
      return;
    }

    if (!token) {
      hasProcessedRef.current = true;
      toast.error('OAuth login failed: missing token');
      navigate('/login', { replace: true });
      return;
    }

    hasProcessedRef.current = true;
    login(token, {
      email: email || `${provider || 'oauth'}@user.local`,
      provider: provider || 'oauth',
    });
    setOauthStarted(true);
    toast.success('Logged in successfully');
  }, [login, navigate, searchParams]);

  useEffect(() => {
    if (!oauthStarted) return;
    if (!isAuthenticated) return;

    navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate, oauthStarted]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center max-w-md w-full">
        <h1 className="text-xl font-bold text-slate-900">Completing sign in...</h1>
        <p className="text-sm text-slate-500 mt-2">Please wait while we finish OAuth authentication.</p>
      </div>
    </div>
  );
};
