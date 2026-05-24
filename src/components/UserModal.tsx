import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User as UserIcon, MapPin, LogOut } from 'lucide-react';

export interface UserProfile {
  name: string;
  email: string;
  address: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
}

export default function UserModal({
  isOpen,
  onClose,
  user,
  onLogin,
  onLogout,
}: UserModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'signup') {
      onLogin({ name: name || 'New User', email, address: address || 'No address provided' });
    } else {
      onLogin({ name: 'Demo User', email, address: '123 Main St, Tech City' });
    }
    // Reset form
    setName('');
    setEmail('');
    setPassword('');
    setAddress('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 z-[70] w-full max-w-md -translate-x-1/2 -translate-y-1/2 p-4 sm:p-0"
          >
            <div className="overflow-hidden rounded-3xl glass-panel-solid shadow-2xl">
              <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
                <h2 className="font-display text-xl font-medium text-ink">
                  {user ? 'My Profile' : mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-ink-muted transition-colors hover:bg-parchment hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6">
                {user ? (
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-bronze/10 text-bronze">
                        <UserIcon className="h-8 w-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-ink">{user.name}</h3>
                        <p className="text-sm text-ink-muted">{user.email}</p>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-2xl bg-parchment/50 p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-bronze" />
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted">
                            Delivery Address
                          </p>
                          <p className="mt-1 text-sm text-ink">{user.address}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onLogout}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 bg-cream py-3 text-sm font-medium text-ink transition-colors hover:bg-parchment active:scale-[0.98]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {mode === 'signup' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-ink-muted">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-ink/10 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink placeholder-ink/30 outline-none transition-all focus:border-bronze focus:ring-1 focus:ring-bronze"
                            placeholder="John Doe"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ink-muted">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full rounded-xl border border-ink/10 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink placeholder-ink/30 outline-none transition-all focus:border-bronze focus:ring-1 focus:ring-bronze"
                          placeholder="you@example.com"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-ink-muted">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full rounded-xl border border-ink/10 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink placeholder-ink/30 outline-none transition-all focus:border-bronze focus:ring-1 focus:ring-bronze"
                          placeholder="••••••••"
                        />
                      </div>
                    </div>

                    {mode === 'signup' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-ink-muted">Delivery Address</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-4 w-4 text-ink-muted" />
                          <textarea
                            required
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="w-full resize-none rounded-xl border border-ink/10 bg-cream py-2.5 pl-10 pr-4 text-sm text-ink placeholder-ink/30 outline-none transition-all focus:border-bronze focus:ring-1 focus:ring-bronze"
                            placeholder="123 Main St, City, Country"
                            rows={2}
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="mt-2 w-full rounded-xl bg-ink py-3 text-sm font-medium text-cream transition-all hover:bg-ink/90 active:scale-[0.98]"
                    >
                      {mode === 'login' ? 'Sign In' : 'Create Account'}
                    </button>

                    <div className="mt-4 text-center text-sm text-ink-muted">
                      {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
                      <button
                        type="button"
                        onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                        className="font-medium text-bronze hover:underline"
                      >
                        {mode === 'login' ? 'Sign Up' : 'Sign In'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
