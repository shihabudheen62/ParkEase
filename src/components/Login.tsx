import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DirectionsCarRounded as Car, MailRounded as Mail, LockRounded as Lock, ChevronRightRounded as ChevronRight, ArrowForwardRounded as ArrowRight } from '@mui/icons-material';
import { useAuth } from '../AuthContext';
import { toast } from 'sonner';

const Login: React.FC = () => {
  const { login, loginWithEmail, registerWithEmail, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (isRegistering && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      if (isRegistering) {
        await registerWithEmail(email, password);
        toast.success('Account created successfully!');
      } else {
        await loginWithEmail(email, password);
        toast.success('Signed in successfully!');
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/Password login is not enabled in Firebase Console. Please enable it in the Authentication tab.', {
          duration: 10000,
        });
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-60 scale-110"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=1920&auto=format&fit=crop")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)'
        }}
      />

      {/* Content Overlay */}
      <div className="relative z-10 h-full w-full flex flex-col px-0 pt-15 pb-0 overflow-y-auto no-scrollbar">
        {/* Logo - Centered */}
        <div className="flex flex-col items-center mb-12">
          <img 
            src="/img/logo-symb.svg" 
            alt="Logo" 
            className="w-24 h-24 object-contain"
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="mt-auto bg-[#fff] rounded-[30px] p-8 shadow-2xl"
        >
          <div className="space-y-2 mb-8">
            <h2 className="text-3xl font-extrabold text-[#1A1C1E]">
              {isRegistering ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-gray-500 font-medium">
              {isRegistering ? 'Join us to find your parking spot.' : 'Enter your details to access your parking spot.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                Email Address
              </label></div>
             
              <div className="relative">
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="hello@leafypark.com"
                  className="w-full bg-[#f5f5f5] border-none rounded-2xl py-4 px-5 text-[#1A1C1E] font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Password
                </label>
                {!isRegistering && (
                  <button type="button" className="text-[10px] font-black text-[#007AFF] uppercase tracking-widest">
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#f5f5f5] border-none rounded-2xl py-4 px-5 text-[#1A1C1E] font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-[#007AFF] transition-all"
                />
              </div>
            </div>

            {/* Confirm Password Field */}
            {isRegistering && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    Confirm Password
                  </label>
                </div>
                <div className="relative">
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#f5f5f5] border-none rounded-2xl py-4 px-5 text-[#1A1C1E] font-bold placeholder:text-gray-400 focus:ring-2 focus:ring-[#007AFF] transition-all"
                  />
                </div>
              </div>
            )}

            {/* Sign In Button - Rectangular & Primary Color */}
            <div className="pt-2">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#007AFF] text-white rounded-2xl py-4 px-5 font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="flex-shrink mx-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Or continue with
              </span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>

            {/* Social Logins */}
            <div className="flex justify-center gap-6">
              <button 
                type="button"
                onClick={login}
                disabled={loading}
                className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform disabled:opacity-50"
              >
                <img 
                  src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
                  alt="Google" 
                  className="w-6 h-6"
                />
              </button>
              <button type="button" className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform">
                <div className="w-6 h-6 bg-[#007AFF] rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full flex items-center justify-center">
                    <div className="w-1.5 h-1.5 bg-[#007AFF] rounded-full" />
                  </div>
                </div>
              </button>
              <button type="button" className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-md active:scale-90 transition-transform">
                <span className="text-xs font-black text-[#1A1C1E]">iOS</span>
              </button>
            </div>

            {/* Toggle Login/Register */}
            <p className="text-center text-sm font-bold text-gray-500 mt-8">
              {isRegistering ? 'Already have an account?' : 'New to Parkease?'} 
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-[#007AFF] ml-1"
              >
                {isRegistering ? 'Sign In' : 'Create account'}
              </button>
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
