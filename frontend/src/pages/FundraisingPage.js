import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { toast } from 'sonner';
import { Heart, MapPin, Footprints, Users, Mountain, ArrowRight, Flag, DollarSign, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import ShareButtons from '../components/ShareButtons';

function RouteMap({ challenge, totalKm, progressPct, milestones }) {
  if (!challenge) return null;
  const sortedMilestones = [...(milestones || [])].sort((a, b) => a.distance_km - b.distance_km);
  const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

  return (
    <div className="relative bg-stone-50 rounded-xl p-4" data-testid="fundraise-route-map">
      {/* Progress bar track */}
      <div className="relative h-10 flex items-center mb-2">
        <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-3 bg-stone-200 rounded-full" />
        <div
          className="absolute left-4 top-1/2 -translate-y-1/2 h-3 bg-orange-500 rounded-full transition-all duration-500"
          style={{ width: `calc(${Math.min(progressPct, 100)}% - 2rem)` }}
        />
        {sortedMilestones.map((m, i) => {
          const pct = (m.distance_km / challenge.total_distance_km) * 100;
          const reached = totalKm >= m.distance_km;
          return (
            <div key={i} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
              style={{ left: `calc(${pct}% * 0.92 + 4%)` }}>
              <div className={`w-5 h-5 rounded-full border-2 ${reached ? 'bg-orange-500 border-orange-600' : 'bg-white border-stone-300'}`} title={m.title} />
            </div>
          );
        })}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
          <div className="w-6 h-6 rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center">
            <Flag className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
          <div className="w-6 h-6 rounded-full bg-stone-800 border-2 border-stone-900 flex items-center justify-center">
            <Flag className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-500"
          style={{ left: `calc(${Math.min(progressPct, 100)}% * 0.92 + 4%)` }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-orange-600 border-3 border-white shadow-lg flex items-center justify-center animate-pulse">
              <Footprints className="w-4 h-4 text-white" />
            </div>
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap">
              {progressPct.toFixed(0)}% &middot; {totalKm} km
            </div>
          </div>
        </div>
      </div>
      {/* Milestone labels + pictures */}
      <div className="relative mt-2">
        <div className="flex justify-between px-2" style={{ paddingLeft: '4%', paddingRight: '4%' }}>
          {sortedMilestones.map((m, i) => {
            const reached = totalKm >= m.distance_km;
            const imgUrl = m.image_url ? (m.image_url.startsWith('http') ? m.image_url : `${API_BASE}${m.image_url}`) : null;
            return (
              <div key={i} className="flex flex-col items-center" style={{ width: `${90 / sortedMilestones.length}%` }}>
                <p className={`text-[9px] md:text-[10px] font-medium text-center leading-tight ${reached ? 'text-orange-600' : 'text-stone-400'}`}>
                  {m.title}
                </p>
                <p className="text-[8px] text-stone-300 mb-1">{m.distance_km}km</p>
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-stone-200 overflow-hidden border border-stone-200">
                  {imgUrl ? (
                    <img src={imgUrl} alt={m.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-3 h-3 text-stone-300" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function FundraisingPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Pledge state - both fields always visible
  const [pledgeTotal, setPledgeTotal] = useState('');
  const [pledgePerKm, setPledgePerKm] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // Signup form
  const [signupForm, setSignupForm] = useState({ full_name: '', email: '', password: '' });
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = () => {
    api.get(`/fundraising/${userId}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Page not found'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [userId]);

  // Compute combined pledge total
  const computePledgeTotal = () => {
    let total = 0;
    const totalVal = parseFloat(pledgeTotal) || 0;
    const perKmVal = parseFloat(pledgePerKm) || 0;
    const routeKm = data?.challenge?.total_distance_km || 0;
    total = totalVal + (perKmVal * routeKm);
    return total;
  };

  const hasAnyPledge = () => {
    return (parseFloat(pledgeTotal) > 0) || (parseFloat(pledgePerKm) > 0);
  };

  const getPledgeType = () => {
    const hasTotal = parseFloat(pledgeTotal) > 0;
    const hasPerKm = parseFloat(pledgePerKm) > 0;
    if (hasTotal && hasPerKm) return 'combined';
    if (hasPerKm) return 'per_km';
    return 'total';
  };

  const handleContinue = () => {
    if (!hasAnyPledge()) {
      toast.error('Please enter at least one pledge amount');
      return;
    }
    if (user) {
      createPledgeForLoggedInUser();
    } else {
      setShowSignup(true);
    }
  };

  const createPledgeForLoggedInUser = async () => {
    setSubmitting(true);
    try {
      await api.post(`/pledges/${userId}`, {
        pledge_type: getPledgeType(),
        pledge_per_km: parseFloat(pledgePerKm) || null,
        pledge_total: parseFloat(pledgeTotal) || null,
      });
      toast.success('Pledge created! Thank you for your support!');
      setPledgeTotal('');
      setPledgePerKm('');
      setShowSignup(false);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create pledge');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupporterSignup = async (e) => {
    e.preventDefault();
    if (signupForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/supporters/signup', {
        full_name: signupForm.full_name,
        email: signupForm.email,
        password: signupForm.password,
        walker_id: userId,
        pledge_type: getPledgeType(),
        pledge_per_km: parseFloat(pledgePerKm) || null,
        pledge_total: parseFloat(pledgeTotal) || null,
      });
      await login(res.data.token);
      toast.success('Welcome! Your pledge has been recorded.');
      setPledgeTotal('');
      setPledgePerKm('');
      setShowSignup(false);
      navigate('/supporter-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupporterLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', loginForm);
      await login(res.data.token);
      await api.post(`/pledges/${userId}`, {
        pledge_type: getPledgeType(),
        pledge_per_km: parseFloat(pledgePerKm) || null,
        pledge_total: parseFloat(pledgeTotal) || null,
      });
      toast.success('Pledge recorded! Thank you for your support!');
      setPledgeTotal('');
      setPledgePerKm('');
      setShowSignup(false);
      setShowLogin(false);
      navigate('/supporter-dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="container-app py-20 text-center"><p className="text-stone-500">Walker not found</p></div>
  );

  const { walker, challenge, total_km, total_steps, total_raised, sponsors, team, pledges } = data;
  const currentAchievement = data.current_achievement;
  const progressPct = challenge ? Math.min(100, (total_km / challenge.total_distance_km) * 100) : 0;
  const calculatedTotal = computePledgeTotal();

  return (
    <div className="min-h-screen bg-stone-50" data-testid="fundraising-page">
      {/* Header */}
      <div className="bg-stone-900 py-10 md:py-14">
        <div className="container-app text-center">
          <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">{walker.display_name?.[0] || walker.full_name?.[0]}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1" data-testid="walker-name-header">
            {walker.display_name && walker.display_name !== walker.full_name
              ? <>{walker.full_name} <span className="text-orange-300">"{walker.display_name}"</span></>
              : walker.full_name}
          </h1>
          <p className="text-stone-400 text-sm">is walking for Kenya Education Fund</p>
          {team && (
            <Badge className="mt-3 bg-white/10 text-white rounded-full border-none">
              <Users className="w-3 h-3 mr-1" /> {team.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="container-app py-8 md:py-12 max-w-3xl">
        {/* PLEDGE FORM - Main CTA, centered, above everything */}
        <Card className="bg-white rounded-2xl border-2 border-orange-200 shadow-[0_8px_30px_-4px_rgba(234,88,12,0.15)] mb-8" data-testid="pledge-form-card">
          <CardContent className="p-6 md:p-8">
            {!showSignup ? (
              <div>
                <div className="text-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-2" data-testid="pledge-headline">
                    Pledge Your Support For {walker.display_name || walker.full_name} Today
                  </h2>
                  <p className="text-sm text-stone-600 mb-1">Every dollar goes to Kenyan students' education</p>
                  <p className="text-xs text-stone-400">Choose an option below. Type in your donation amount & click continue.</p>
                </div>

                {/* Two pledge options side by side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5" data-testid="pledge-options">
                  <div className="p-4 rounded-xl border-2 border-stone-100 bg-stone-50 hover:border-orange-200 transition-colors">
                    <Label className="text-sm font-bold text-stone-900 block mb-2">Total Pledge</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pledgeTotal}
                        onChange={(e) => setPledgeTotal(e.target.value)}
                        placeholder="0.00"
                        className="no-arrows pl-7 rounded-xl border-stone-200 bg-white h-12 text-lg font-medium"
                        data-testid="pledge-total-input"
                      />
                    </div>
                    <p className="text-xs text-stone-400 mt-1.5">Fixed amount donation</p>
                  </div>

                  <div className="p-4 rounded-xl border-2 border-stone-100 bg-stone-50 hover:border-orange-200 transition-colors">
                    <Label className="text-sm font-bold text-stone-900 block mb-2">Pledge Per KM</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-medium">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={pledgePerKm}
                        onChange={(e) => setPledgePerKm(e.target.value)}
                        placeholder="0.00"
                        className="no-arrows pl-7 rounded-xl border-stone-200 bg-white h-12 text-lg font-medium"
                        data-testid="pledge-per-km-input"
                      />
                    </div>
                    <p className="text-xs text-stone-400 mt-1.5">
                      {challenge ? `${challenge.total_distance_km}km route` : 'Per km walked'}
                    </p>
                  </div>
                </div>

                {/* Combined total display */}
                {calculatedTotal > 0 && (
                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 mb-5 text-center" data-testid="pledge-total-display">
                    <p className="text-xs text-orange-700 font-medium">
                      {parseFloat(pledgeTotal) > 0 && parseFloat(pledgePerKm) > 0 ? (
                        <>
                          ${pledgeTotal} total + ${pledgePerKm}/km x {challenge?.total_distance_km || 0}km = {' '}
                          <span className="text-lg font-bold">${calculatedTotal.toFixed(2)}</span>
                        </>
                      ) : parseFloat(pledgePerKm) > 0 ? (
                        <>
                          Estimated total if route completed: <span className="text-lg font-bold">${calculatedTotal.toFixed(2)}</span>
                        </>
                      ) : (
                        <>
                          Your pledge: <span className="text-lg font-bold">${calculatedTotal.toFixed(2)}</span>
                        </>
                      )}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleContinue}
                  disabled={!hasAnyPledge() || submitting}
                  className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-5 h-auto text-base disabled:opacity-50 transition-all hover:scale-[1.01] px-12 mx-auto block"
                  data-testid="pledge-continue-btn"
                >
                  {submitting ? 'Processing...' : 'Continue'} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>

                {user && (
                  <p className="text-xs text-stone-400 text-center mt-3">
                    Pledging as {user.display_name || user.full_name}
                  </p>
                )}
              </div>
            ) : (
              /* Supporter Sign Up / Login */
              <div data-testid="supporter-auth-section">
                {!showLogin ? (
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1 text-center">Sign Up to Support</h3>
                    <p className="text-sm text-stone-500 mb-4 text-center">
                      Create an account to track your pledge for {walker.display_name || walker.full_name}.
                    </p>
                    <form onSubmit={handleSupporterSignup} className="space-y-3">
                      <div>
                        <Label className="text-stone-700 text-xs font-medium">Full Name</Label>
                        <Input
                          value={signupForm.full_name}
                          onChange={(e) => setSignupForm(f => ({ ...f, full_name: e.target.value }))}
                          placeholder="Your full name"
                          required
                          className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-11"
                          data-testid="supporter-signup-name"
                        />
                      </div>
                      <div>
                        <Label className="text-stone-700 text-xs font-medium">Email</Label>
                        <Input
                          type="email"
                          value={signupForm.email}
                          onChange={(e) => setSignupForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="you@example.com"
                          required
                          className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-11"
                          data-testid="supporter-signup-email"
                        />
                      </div>
                      <div>
                        <Label className="text-stone-700 text-xs font-medium">Password</Label>
                        <div className="relative mt-1">
                          <Input
                            type={showPw ? 'text' : 'password'}
                            value={signupForm.password}
                            onChange={(e) => setSignupForm(f => ({ ...f, password: e.target.value }))}
                            placeholder="At least 6 characters"
                            required
                            className="rounded-xl border-stone-200 bg-stone-50 h-11 pr-10"
                            data-testid="supporter-signup-password"
                          />
                          <button type="button" onClick={() => setShowPw(!showPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                        <p className="text-xs font-medium text-orange-800">Your pledge:</p>
                        <p className="text-sm font-bold text-orange-600">${calculatedTotal.toFixed(2)} total</p>
                      </div>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto px-10 mx-auto block"
                        data-testid="supporter-signup-submit"
                      >
                        {submitting ? 'Creating...' : 'Sign Up & Pledge'}
                      </Button>
                    </form>
                    <p className="text-center text-xs text-stone-500 mt-4">
                      Already have an account?{' '}
                      <button onClick={() => setShowLogin(true)} className="text-orange-600 font-medium" data-testid="supporter-login-toggle">
                        Log In
                      </button>
                    </p>
                    <button onClick={() => setShowSignup(false)} className="flex items-center gap-1 mx-auto text-xs text-stone-400 mt-2 hover:text-stone-600" data-testid="supporter-back-btn">
                      <ArrowLeft className="w-3 h-3" /> Back to pledge options
                    </button>
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1 text-center">Log In to Support</h3>
                    <p className="text-sm text-stone-500 mb-4 text-center">Log in to record your pledge.</p>
                    <form onSubmit={handleSupporterLogin} className="space-y-3">
                      <div>
                        <Label className="text-stone-700 text-xs font-medium">Email</Label>
                        <Input
                          type="email"
                          value={loginForm.email}
                          onChange={(e) => setLoginForm(f => ({ ...f, email: e.target.value }))}
                          placeholder="you@example.com"
                          required
                          className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-11"
                          data-testid="supporter-login-email"
                        />
                      </div>
                      <div>
                        <Label className="text-stone-700 text-xs font-medium">Password</Label>
                        <div className="relative mt-1">
                          <Input
                            type={showPw ? 'text' : 'password'}
                            value={loginForm.password}
                            onChange={(e) => setLoginForm(f => ({ ...f, password: e.target.value }))}
                            required
                            className="rounded-xl border-stone-200 bg-stone-50 h-11 pr-10"
                            data-testid="supporter-login-password"
                          />
                          <button type="button" onClick={() => setShowPw(!showPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                        <p className="text-xs font-medium text-orange-800">Your pledge:</p>
                        <p className="text-sm font-bold text-orange-600">${calculatedTotal.toFixed(2)} total</p>
                      </div>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto px-10 mx-auto block"
                        data-testid="supporter-login-submit"
                      >
                        {submitting ? 'Logging in...' : 'Log In & Pledge'}
                      </Button>
                    </form>
                    <p className="text-center text-xs text-stone-500 mt-4">
                      Need an account?{' '}
                      <button onClick={() => setShowLogin(false)} className="text-orange-600 font-medium">Sign Up</button>
                    </p>
                    <button onClick={() => { setShowSignup(false); setShowLogin(false); }} className="flex items-center gap-1 mx-auto text-xs text-stone-400 mt-2 hover:text-stone-600">
                      <ArrowLeft className="w-3 h-3" /> Back to pledge options
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats + Challenge + Route Map */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Left: Stats + Challenge Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-4 text-center">
                  <MapPin className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-stone-900">{total_km} km</p>
                  <p className="text-xs text-stone-400">walked</p>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-4 text-center">
                  <Footprints className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-stone-900">{total_steps.toLocaleString()}</p>
                  <p className="text-xs text-stone-400">steps</p>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-4 text-center">
                  <Heart className="w-5 h-5 text-rose-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-stone-900">${total_raised}</p>
                  <p className="text-xs text-stone-400">raised</p>
                </CardContent>
              </Card>
            </div>
            {challenge && (
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <Mountain className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-stone-900">{challenge.name}</h3>
                  </div>
                  <p className="text-sm text-stone-500 mb-3">{challenge.description}</p>
                  <p className="text-xs text-stone-400">
                    {total_km} of {challenge.total_distance_km} km &middot; {progressPct.toFixed(1)}% complete &middot; {Math.max(0, (challenge.total_distance_km - total_km)).toFixed(1)} km remaining
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Route Map Image */}
          {challenge && (
            <div className="flex items-stretch">
              {challenge.route_map_url ? (
                <Card className="bg-white rounded-2xl border border-stone-100 overflow-hidden w-full">
                  <img src={challenge.route_map_url} alt={`${challenge.name} route map`} className="w-full h-auto object-contain" />
                </Card>
              ) : (
                <Card className="bg-stone-50 rounded-2xl border border-stone-100 w-full flex items-center justify-center min-h-[200px]">
                  <div className="text-center p-6">
                    <Mountain className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <p className="text-sm text-stone-400">Route map coming soon</p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Progress Bar with Milestones + Pictures */}
        {challenge && (
          <Card className="bg-white rounded-2xl border border-stone-100 mb-6">
            <CardContent className="p-6">
              <RouteMap challenge={challenge} totalKm={total_km} progressPct={progressPct} milestones={challenge.milestones} />
            </CardContent>
          </Card>
        )}

        {/* Achievement */}
        {currentAchievement && (
          <Card className="bg-white rounded-2xl border border-stone-100 mb-6">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-3">Achievement Level</h3>
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <p className="text-sm font-bold text-emerald-800">{currentAchievement.achievement}</p>
                <p className="text-xs text-emerald-600 mt-1">Swag: {currentAchievement.swag}</p>
                <p className="text-xs text-stone-500 mt-1">Total raised: ${total_raised}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Share Buttons */}
        <Card className="bg-white rounded-2xl border border-stone-100 mb-6">
          <CardContent className="p-6">
            <ShareButtons
              url={window.location.href}
              title={`Support ${walker.display_name || walker.full_name}'s Walk for Kenya Education`}
              description={challenge ? `Walking ${challenge.name} - ${challenge.total_distance_km}km for Kenya Education Fund` : 'Walking for Kenya Education Fund'}
              walkerName={walker.display_name || walker.full_name}
            />
          </CardContent>
        </Card>

        {/* Supporters/Pledges List */}
        <Card className="bg-white rounded-2xl border border-stone-100">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-stone-900 mb-4">Supporters</h3>
            {(!pledges || pledges.length === 0) && (!sponsors || sponsors.length === 0) ? (
              <p className="text-stone-400 text-center py-6">No supporters yet. Be the first!</p>
            ) : (
              <div className="space-y-2">
                {pledges?.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`pledge-${p.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                        <Heart className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">
                          {p.supporter?.display_name || p.supporter?.full_name || 'Supporter'}
                        </p>
                        <p className="text-xs text-stone-400">
                          {p.pledge_type === 'per_km' ? `$${p.pledge_per_km}/km pledge` : p.pledge_type === 'combined' ? 'Combined pledge' : 'Total pledge'}
                        </p>
                      </div>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 rounded-full font-bold">
                      {p.pledge_type === 'per_km'
                        ? `$${p.pledge_per_km}/km`
                        : p.pledge_type === 'combined'
                          ? `$${(p.pledge_total || 0) + (p.pledge_per_km || 0) * (challenge?.total_distance_km || 0)}`
                          : `$${p.pledge_total}`}
                    </Badge>
                  </div>
                ))}
                {sponsors?.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                        <DollarSign className="w-4 h-4 text-rose-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">{s.name}</p>
                        {s.message && <p className="text-xs text-stone-400 italic">"{s.message}"</p>}
                      </div>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-700 rounded-full font-bold">${s.amount}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* GiveButter Placeholder */}
        <Card className="bg-orange-50 rounded-2xl border border-orange-100 mt-6" data-testid="givebutter-placeholder">
          <CardContent className="p-6 text-center">
            <Heart className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <h3 className="text-base font-bold text-stone-900 mb-1">Donate Directly via GiveButter</h3>
            <p className="text-xs text-stone-500 mb-3">
              KEF uses GiveButter for secure payment processing. Click below to donate directly.
            </p>
            <Button
              variant="outline"
              className="rounded-full border-orange-300 text-orange-700 hover:bg-orange-100"
              data-testid="givebutter-donate-btn"
              onClick={() => toast.info('GiveButter integration will be configured with your embed code')}
            >
              <Heart className="w-4 h-4 mr-2" /> Donate via GiveButter
            </Button>
            <p className="text-[10px] text-stone-400 mt-2">GiveButter embed code will be added here</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
