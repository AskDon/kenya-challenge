import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import api from '../lib/api';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      await login(res.data.token);
      toast.success('Welcome back!');
      const role = res.data.user?.role;
      navigate(role === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-white rounded-2xl border border-stone-100 shadow-[0_4px_20px_-2px_rgba(87,83,78,0.1)]" data-testid="login-card">
        <CardHeader className="text-center pb-2">
          <img
            src="https://customer-assets.emergentagent.com/job_kenyamiles/artifacts/82qudjyh_keficon-removebg.png"
            alt="KEF"
            className="w-14 h-14 object-contain mx-auto mb-4"
          />
          <CardTitle className="text-2xl font-bold" style={{ color: '#1a3660' }}>Welcome Back</CardTitle>
          <p className="text-sm text-stone-500 mt-1">Log in to continue your journey</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email" className="text-stone-700 text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12"
                data-testid="login-email-input"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-stone-700 text-sm font-medium">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12 pr-11"
                  data-testid="login-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  data-testid="login-toggle-password"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-6 h-auto text-base transition-all hover:scale-[1.02]"
              data-testid="login-submit-btn"
            >
              {loading ? 'Logging in...' : 'Log In'}
              <LogIn className="w-4 h-4 ml-2" />
            </Button>
          </form>
          <p className="text-center text-sm text-stone-500 mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-600 font-medium hover:text-orange-700" data-testid="login-signup-link">
              Join the Challenge
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
