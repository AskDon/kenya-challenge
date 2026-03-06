import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { toast } from 'sonner';
import { Heart, MapPin, Footprints, Users, Mountain, ArrowRight, Flag, DollarSign, Eye, EyeOff } from 'lucide-react';

function RouteMap({ challenge, totalKm, progressPct, milestones }) {
  if (!challenge) return null;
  const sortedMilestones = [...(milestones || [])].sort((a, b) => a.distance_km - b.distance_km);
  return (
    <div className="relative bg-stone-50 rounded-xl p-4" data-testid="fundraise-route-map">
      <div className="relative">
        <div className="relative h-14 flex items-center">
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-2 bg-stone-200 rounded-full" />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 h-2 bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `calc(${Math.min(progressPct, 100)}% - 2rem)` }} />
          {sortedMilestones.map((m, i) => {
            const pct = (m.distance_km / challenge.total_distance_km) * 100;
            const reached = totalKm >= m.distance_km;
            return (
              <div key={i} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `calc(${pct}% * 0.92 + 4%)` }}>
                <div className={`w-3.5 h-3.5 rounded-full border-2 ${reached ? 'bg-orange-500 border-orange-600' : 'bg-white border-stone-300'}`} title={m.title} />
              </div>
            );
          })}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <div className="w-4 h-4 rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center">
              <Flag className="w-2 h-2 text-white" />
            </div>
          </div>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <div className="w-4 h-4 rounded-full bg-stone-800 border-2 border-stone-900 flex items-center justify-center">
              <Flag className="w-2 h-2 text-white" />
            </div>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-500"
            style={{ left: `calc(${Math.min(progressPct, 100)}% * 0.92 + 4%)` }}>
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-orange-600 border-2 border-white shadow-lg flex items-center justify-center animate-pulse">
                <Footprints className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap">
                {totalKm}km
              </div>
            </div>
          </div>
        </div>
        <div className="relative h-10 mt-0.5">
          {sortedMilestones.map((m, i) => {
            const pct = (m.distance_km / challenge.total_distance_km) * 100;
            const reached = totalKm >= m.distance_km;
            return (
              <div key={i} className="absolute -translate-x-1/2 text-center"
                style={{ left: `calc(${pct}% * 0.92 + 4%)`, maxWidth: '70px' }}>
                <p className={`text-[8px] font-medium leading-tight ${reached ? 'text-orange-600' : 'text-stone-400'}`}>{m.title}</p>
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

  // Pledge state
  const [pledgeType, setPledgeType] = useState('');
  const [pledgePerKm, setPledgePerKm] = useState('');
  const [pledgeTotal, setPledgeTotal] = useState('');
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

  useEffect(() => { loadData(); }, [userId]);

  const handleContinue = () => {
    if (pledgeType === 'per_km' && (!pledgePerKm || parseFloat(pledgePerKm) <= 0)) {
      toast.error('Please enter an amount per km');
      return;
    }
    if (pledgeType === 'total' && (!pledgeTotal || parseFloat(pledgeTotal) <= 0)) {
      toast.error('Please enter a pledge amount');
      return;
    }
    // If already logged in, create pledge directly
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
        pledge_type: pledgeType,
        pledge_per_km: pledgeType === 'per_km' ? parseFloat(pledgePerKm) : null,
        pledge_total: pledgeType === 'total' ? parseFloat(pledgeTotal) : null,
      });
      toast.success('Pledge created! Thank you for your support!');
      setPledgeType('');
      setPledgePerKm('');
      setPledgeTotal('');
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
        pledge_type: pledgeType,
        pledge_per_km: pledgeType === 'per_km' ? parseFloat(pledgePerKm) : null,
        pledge_total: pledgeType === 'total' ? parseFloat(pledgeTotal) : null,
      });
      await login(res.data.token);
      toast.success('Welcome! Your pledge has been recorded.');
      setPledgeType('');
      setShowSignup(false);
      loadData();
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
      // Now create pledge
      await api.post(`/pledges/${userId}`, {
        pledge_type: pledgeType,
        pledge_per_km: pledgeType === 'per_km' ? parseFloat(pledgePerKm) : null,
        pledge_total: pledgeType === 'total' ? parseFloat(pledgeTotal) : null,
      });
      toast.success('Pledge recorded! Thank you for your support!');
      setPledgeType('');
      setShowSignup(false);
      setShowLogin(false);
      loadData();
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
  const estimatedPerKm = pledgePerKm && challenge ? (parseFloat(pledgePerKm) * challenge.total_distance_km).toFixed(2) : null;

  return (
    <div className="min-h-screen bg-stone-50" data-testid="fundraising-page">
      {/* Header */}
      <div className="bg-stone-900 py-10 md:py-14">
        <div className="container-app text-center">
          <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">{walker.display_name?.[0] || walker.full_name?.[0]}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {walker.display_name || walker.full_name}
          </h1>
          <p className="text-stone-400 text-sm">is walking for Kenya Education Fund</p>
          {team && (
            <Badge className="mt-3 bg-white/10 text-white rounded-full border-none">
              <Users className="w-3 h-3 mr-1" /> {team.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="container-app py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Progress + Stats */}
          <div className="lg:col-span-2 space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-5 text-center">
                  <MapPin className="w-5 h-5 text-orange-600 mx-auto mb-2" />
                  <p className="text-xl font-bold text-stone-900">{total_km} km</p>
                  <p className="text-xs text-stone-400">walked</p>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-5 text-center">
                  <Footprints className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
                  <p className="text-xl font-bold text-stone-900">{total_steps.toLocaleString()}</p>
                  <p className="text-xs text-stone-400">steps</p>
                </CardContent>
              </Card>
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-5 text-center">
                  <Heart className="w-5 h-5 text-rose-600 mx-auto mb-2" />
                  <p className="text-xl font-bold text-stone-900">${total_raised}</p>
                  <p className="text-xs text-stone-400">raised</p>
                </CardContent>
              </Card>
            </div>

            {/* Challenge + Route Map */}
            {challenge && (
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Mountain className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-stone-900">{challenge.name}</h3>
                  </div>
                  <p className="text-sm text-stone-500 mb-4">{challenge.description}</p>

                  {/* Route Map */}
                  <RouteMap
                    challenge={challenge}
                    totalKm={total_km}
                    progressPct={progressPct}
                    milestones={challenge.milestones}
                  />

                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-stone-600">{total_km} km completed</span>
                      <span className="font-bold text-stone-900">{progressPct.toFixed(1)}%</span>
                    </div>
                    <Progress value={progressPct} className="h-3" />
                    <p className="text-xs text-stone-400 mt-2">
                      {total_km} of {challenge.total_distance_km} km &middot; {Math.max(0, (challenge.total_distance_km - total_km)).toFixed(1)} km remaining
                    </p>
                  </div>

                  {/* Milestones */}
                  <div className="mt-5 space-y-2">
                    {challenge.milestones?.map((m, i) => {
                      const reached = total_km >= m.distance_km;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${reached ? 'bg-emerald-50' : 'bg-stone-50'}`}>
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${reached ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'}`}>
                            {reached ? '\u2713' : i + 1}
                          </div>
                          <div>
                            <p className={`text-xs font-medium ${reached ? 'text-emerald-700' : 'text-stone-600'}`}>{m.title}</p>
                            <p className="text-[10px] text-stone-400">{m.distance_km} km &middot; {m.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Achievement */}
            {currentAchievement && (
              <Card className="bg-white rounded-2xl border border-stone-100">
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
                              {p.pledge_type === 'per_km' ? `$${p.pledge_per_km}/km pledge` : 'Total pledge'}
                            </p>
                          </div>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-700 rounded-full font-bold">
                          {p.pledge_type === 'per_km'
                            ? `$${p.pledge_per_km}/km`
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
          </div>

          {/* Right: Pledge Form */}
          <div>
            <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_4px_20px_-2px_rgba(87,83,78,0.1)] sticky top-24">
              <CardContent className="p-6">
                {!showSignup ? (
                  /* Pledge Selection */
                  <div>
                    <h3 className="text-lg font-bold text-stone-900 mb-1">Support This Walk</h3>
                    <p className="text-sm text-stone-500 mb-5">Your pledge supports Kenyan students' education.</p>

                    {/* Pledge Type Selection */}
                    <div className="space-y-3 mb-5">
                      <button onClick={() => { setPledgeType('per_km'); setPledgeTotal(''); }} className="w-full text-left" data-testid="pledge-type-per-km">
                        <div className={`p-4 rounded-xl border-2 transition-all ${
                          pledgeType === 'per_km' ? 'border-orange-500 bg-orange-50' : 'border-stone-100 hover:border-stone-200'
                        }`}>
                          <p className="text-sm font-bold text-stone-900">Pledge per km</p>
                          <p className="text-xs text-stone-500 mt-0.5">Amount multiplied by distance completed</p>
                          {pledgeType === 'per_km' && (
                            <div className="mt-3">
                              <Label className="text-xs text-stone-600">Amount per km (USD)</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={pledgePerKm}
                                onChange={(e) => setPledgePerKm(e.target.value)}
                                placeholder="e.g. 1.00"
                                className="mt-1 rounded-xl border-stone-200 bg-white h-11"
                                data-testid="pledge-per-km-input"
                              />
                              {estimatedPerKm && (
                                <p className="text-xs text-orange-600 mt-1 font-medium">
                                  Est. total if completed: ${estimatedPerKm}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </button>

                      <button onClick={() => { setPledgeType('total'); setPledgePerKm(''); }} className="w-full text-left" data-testid="pledge-type-total">
                        <div className={`p-4 rounded-xl border-2 transition-all ${
                          pledgeType === 'total' ? 'border-orange-500 bg-orange-50' : 'border-stone-100 hover:border-stone-200'
                        }`}>
                          <p className="text-sm font-bold text-stone-900">Total Pledge</p>
                          <p className="text-xs text-stone-500 mt-0.5">A fixed amount upon challenge completion</p>
                          {pledgeType === 'total' && (
                            <div className="mt-3">
                              <Label className="text-xs text-stone-600">Pledge amount (USD)</Label>
                              <div className="grid grid-cols-3 gap-2 mt-1 mb-2">
                                {[25, 50, 100].map(amt => (
                                  <Button
                                    key={amt}
                                    type="button"
                                    variant={pledgeTotal === String(amt) ? 'default' : 'outline'}
                                    onClick={() => setPledgeTotal(String(amt))}
                                    className={`rounded-xl text-xs ${pledgeTotal === String(amt) ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-stone-200'}`}
                                    data-testid={`pledge-amount-${amt}`}
                                  >
                                    ${amt}
                                  </Button>
                                ))}
                              </div>
                              <Input
                                type="number"
                                value={pledgeTotal}
                                onChange={(e) => setPledgeTotal(e.target.value)}
                                placeholder="Or enter custom amount"
                                className="rounded-xl border-stone-200 bg-white h-11"
                                data-testid="pledge-total-input"
                              />
                            </div>
                          )}
                        </div>
                      </button>
                    </div>

                    <Button
                      onClick={handleContinue}
                      disabled={!pledgeType || submitting}
                      className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto disabled:opacity-50"
                      data-testid="pledge-continue-btn"
                    >
                      Continue <ArrowRight className="w-4 h-4 ml-2" />
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
                        <h3 className="text-lg font-bold text-stone-900 mb-1">Sign Up to Support</h3>
                        <p className="text-sm text-stone-500 mb-4">
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
                            <p className="text-sm font-bold text-orange-600">
                              {pledgeType === 'per_km' ? `$${pledgePerKm}/km` : `$${pledgeTotal} total`}
                            </p>
                          </div>
                          <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto"
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
                        <button onClick={() => setShowSignup(false)} className="block mx-auto text-xs text-stone-400 mt-2 hover:text-stone-600" data-testid="supporter-back-btn">
                          Back to pledge options
                        </button>
                      </div>
                    ) : (
                      <div>
                        <h3 className="text-lg font-bold text-stone-900 mb-1">Log In to Support</h3>
                        <p className="text-sm text-stone-500 mb-4">Log in to record your pledge.</p>
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
                            <p className="text-sm font-bold text-orange-600">
                              {pledgeType === 'per_km' ? `$${pledgePerKm}/km` : `$${pledgeTotal} total`}
                            </p>
                          </div>
                          <Button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto"
                            data-testid="supporter-login-submit"
                          >
                            {submitting ? 'Logging in...' : 'Log In & Pledge'}
                          </Button>
                        </form>
                        <p className="text-center text-xs text-stone-500 mt-4">
                          Need an account?{' '}
                          <button onClick={() => setShowLogin(false)} className="text-orange-600 font-medium">
                            Sign Up
                          </button>
                        </p>
                        <button onClick={() => { setShowSignup(false); setShowLogin(false); }} className="block mx-auto text-xs text-stone-400 mt-2 hover:text-stone-600">
                          Back to pledge options
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
