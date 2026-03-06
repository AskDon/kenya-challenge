import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from 'sonner';
import api from '../lib/api';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', display_name: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('join');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        display_name: form.display_name || undefined,
      });
      await login(res.data.token);
      toast.success('Welcome to The Kenya Challenge!');
      if (joinCode) {
        navigate(`/teams/join/${joinCode}`);
      } else {
        navigate('/onboarding');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-white rounded-2xl border border-stone-100 shadow-[0_4px_20px_-2px_rgba(87,83,78,0.1)]" data-testid="signup-card">
        <CardHeader className="text-center pb-2">
          <img
            src="https://customer-assets.emergentagent.com/job_kenyamiles/artifacts/82qudjyh_keficon-removebg.png"
            alt="KEF"
            className="w-14 h-14 object-contain mx-auto mb-4"
          />
          <CardTitle className="text-2xl font-bold" style={{ color: '#1a3660' }}>Join The Challenge</CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            {joinCode ? 'Sign up to join your team' : 'Create your walker account'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-stone-700 text-sm font-medium">Full Name</Label>
              <Input
                value={form.full_name}
                onChange={(e) => update('full_name', e.target.value)}
                placeholder="Your full name"
                required
                className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12"
                data-testid="signup-name-input"
              />
            </div>
            <div>
              <Label className="text-stone-700 text-sm font-medium">Display Name <span className="text-stone-400 font-normal">(optional)</span></Label>
              <Input
                value={form.display_name}
                onChange={(e) => update('display_name', e.target.value)}
                placeholder="Your walker nickname"
                className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12"
                data-testid="signup-display-name-input"
              />
            </div>
            <div>
              <Label className="text-stone-700 text-sm font-medium">Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12"
                data-testid="signup-email-input"
              />
            </div>
            <div>
              <Label className="text-stone-700 text-sm font-medium">Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  placeholder="At least 6 characters"
                  required
                  className="rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12 pr-11"
                  data-testid="signup-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  data-testid="signup-toggle-password"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-stone-700 text-sm font-medium">Confirm Password</Label>
              <div className="relative mt-1">
                <Input
                  type={showConfirmPw ? 'text' : 'password'}
                  value={form.confirm_password}
                  onChange={(e) => update('confirm_password', e.target.value)}
                  placeholder="Re-enter your password"
                  required
                  className="rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12 pr-11"
                  data-testid="signup-confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPw(!showConfirmPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  data-testid="signup-toggle-confirm-password"
                >
                  {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-6 h-auto text-base transition-all hover:scale-[1.02]"
              data-testid="signup-submit-btn"
            >
              {loading ? 'Creating account...' : 'Continue'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
          <p className="text-center text-sm text-stone-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-600 font-medium hover:text-orange-700" data-testid="signup-login-link">
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
