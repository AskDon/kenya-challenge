import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import api from '../lib/api';
import { Mountain, ArrowRight } from 'lucide-react';

const COUNTRIES = [
  'US', 'UK', 'KE', 'CA', 'AU', 'DE', 'FR', 'IN', 'NG', 'ZA', 'Other'
];

export default function SignupPage() {
  const [form, setForm] = useState({ first_name: '', email: '', password: '', display_name: '', country: 'US' });
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
    setLoading(true);
    try {
      const res = await api.post('/auth/signup', form);
      await login(res.data.token);
      toast.success('Welcome to The Kenya Challenge!');
      if (joinCode) {
        navigate(`/teams/join/${joinCode}`);
      } else {
        navigate('/challenges');
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
          <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center mx-auto mb-4">
            <Mountain className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-stone-900">Join The Challenge</CardTitle>
          <p className="text-sm text-stone-500 mt-1">
            {joinCode ? 'Sign up to join your team' : 'Create your walker account'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-stone-700 text-sm font-medium">First Name</Label>
              <Input
                value={form.first_name}
                onChange={(e) => update('first_name', e.target.value)}
                placeholder="Your first name"
                required
                className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12"
                data-testid="signup-name-input"
              />
            </div>
            <div>
              <Label className="text-stone-700 text-sm font-medium">Display Name (optional)</Label>
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
              <Input
                type="password"
                value={form.password}
                onChange={(e) => update('password', e.target.value)}
                placeholder="At least 6 characters"
                required
                className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 h-12"
                data-testid="signup-password-input"
              />
            </div>
            <div>
              <Label className="text-stone-700 text-sm font-medium">Country</Label>
              <Select value={form.country} onValueChange={(v) => update('country', v)}>
                <SelectTrigger className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-12" data-testid="signup-country-select">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-6 h-auto text-base transition-all hover:scale-[1.02]"
              data-testid="signup-submit-btn"
            >
              {loading ? 'Creating account...' : 'Start Walking'}
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
