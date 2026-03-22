import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Users, Eye, EyeOff, ArrowRight, ArrowLeft, Mountain, Check,
  CreditCard, Heart, Copy, Award, X, UserPlus, Camera, Plus
} from 'lucide-react';

const STEPS = ['Create Account', 'Setup'];

export default function TeammateSignupPage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user, login, fetchUser } = useAuth();
  
  const [step, setStep] = useState(0);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Part 1: Account creation
  const [showLogin, setShowLogin] = useState(false);
  const [form, setForm] = useState({
    full_name: '',
    display_name: '',
    email: '',
    password: '',
    confirm_password: ''
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Part 2: Challenge selection
  const [challenges, setChallenges] = useState([]);
  const [walkerTypes, setWalkerTypes] = useState([]);
  const [achievementLevels, setAchievementLevels] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [supporters, setSupporters] = useState([{ name: '', email: '' }, { name: '', email: '' }, { name: '', email: '' }]);
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const picInputRef = useRef(null);

  // Load team info
  useEffect(() => {
    api.get(`/teams/invite/${inviteCode}`)
      .then(r => setTeam(r.data))
      .catch(() => {
        toast.error('Invalid team invite link');
        navigate('/');
      })
      .finally(() => setLoading(false));
  }, [inviteCode, navigate]);

  // Load challenges, walker types, achievement levels
  useEffect(() => {
    Promise.all([
      api.get('/challenges'),
      api.get('/walker-types'),
      api.get('/achievement-levels'),
    ]).then(([ch, wt, al]) => {
      setChallenges(ch.data);
      setWalkerTypes(wt.data);
      setAchievementLevels(al.data);
    }).catch(() => {});
  }, []);

  // If user is already logged in, go to step 2
  useEffect(() => {
    if (user && step === 0) {
      setStep(1);
    }
  }, [user, step]);

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Handle signup
  const handleSignup = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirm_password) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/auth/signup', {
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        display_name: form.display_name || undefined,
      });
      await login(res.data.token);
      // Join the team
      await api.post(`/teams/join/${inviteCode}`);
      await fetchUser();
      toast.success(`Welcome to ${team?.name}!`);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle login
  const handleLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/auth/login', {
        email: form.email,
        password: form.password,
      });
      await login(res.data.token);
      // Join the team
      await api.post(`/teams/join/${inviteCode}`);
      await fetchUser();
      toast.success(`Welcome back! You've joined ${team?.name}`);
      setStep(1);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle final registration
  const handleFinish = async () => {
    if (!selectedChallenge) {
      toast.error('Please select a challenge');
      return;
    }
    if (!selectedType) {
      toast.error('Please select a walker type');
      return;
    }
    setSubmitting(true);
    try {
      // Upload profile pic if selected
      if (profilePic) {
        const formData = new FormData();
        formData.append('file', profilePic);
        await api.post('/auth/profile-picture', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }).catch(() => {});
      }
      // Save challenge selection
      await api.post('/users/select-challenge', {
        challenge_id: selectedChallenge,
        walker_type_id: selectedType,
      });
      // Mark as paid (mock)
      await api.post('/users/mark-paid');
      // Send supporter invites
      for (const s of supporters) {
        if (s.name && s.email) {
          await api.post('/supporter-invites', { name: s.name, email: s.email }).catch(() => {});
        }
      }
      await fetchUser();
      toast.success("You're all set! Let the walking begin!");
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeObj = walkerTypes.find(w => w.id === selectedType);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!team) return (
    <div className="container-app py-20 text-center">
      <p className="text-stone-500">Invalid team invite</p>
    </div>
  );

  return (
    <div className="container-app py-8 md:py-12 max-w-2xl" data-testid="teammate-signup-page">
      {/* Team Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
          <Users className="w-7 h-7 text-orange-600" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-1">
          Join {team.name}
        </h1>
        {team.tagline && <p className="text-stone-500">{team.tagline}</p>}
        <Badge variant="outline" className="mt-2 rounded-full border-stone-200">
          {team.members_count} member{team.members_count !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-4">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i < step ? 'bg-orange-600 text-white' :
                i === step ? 'bg-orange-600 text-white ring-4 ring-orange-100' :
                'bg-stone-200 text-stone-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-16 md:w-24 h-0.5 mx-2 ${i < step ? 'bg-orange-600' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-16 mt-2">
          {STEPS.map((s, i) => (
            <p key={s} className={`text-xs font-medium ${i === step ? 'text-orange-600' : 'text-stone-400'}`}>{s}</p>
          ))}
        </div>
      </div>

      {/* Step 1: Create Account or Login */}
      {step === 0 && (
        <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_4px_20px_-2px_rgba(87,83,78,0.1)]" data-testid="teammate-step-account">
          <CardContent className="p-6 md:p-8">
            {!showLogin ? (
              // Signup Form
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-1">Create Your Account</h2>
                <p className="text-sm text-stone-500 mb-6">Join {team.name} as a walker</p>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Full Name</Label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => update('full_name', e.target.value)}
                      placeholder="Your full name"
                      required
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-12"
                      data-testid="teammate-signup-name"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Display Name <span className="text-stone-400 font-normal">(optional)</span></Label>
                    <Input
                      value={form.display_name}
                      onChange={(e) => update('display_name', e.target.value)}
                      placeholder="Your walker nickname"
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-12"
                      data-testid="teammate-signup-display-name"
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
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-12"
                      data-testid="teammate-signup-email"
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
                        className="rounded-xl border-stone-200 bg-stone-50 h-12 pr-11"
                        data-testid="teammate-signup-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
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
                        className="rounded-xl border-stone-200 bg-stone-50 h-12 pr-11"
                        data-testid="teammate-signup-confirm-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto px-10 mx-auto block"
                    data-testid="teammate-signup-submit"
                  >
                    {submitting ? 'Creating Account...' : 'Create Account & Join Team'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
                <p className="text-center text-sm text-stone-500 mt-6">
                  Already have an account?{' '}
                  <button onClick={() => setShowLogin(true)} className="text-orange-600 font-medium hover:text-orange-700" data-testid="teammate-login-toggle">
                    Log In
                  </button>
                </p>
              </div>
            ) : (
              // Login Form
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-1">Log In to Join</h2>
                <p className="text-sm text-stone-500 mb-6">Sign in to join {team.name}</p>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => update('email', e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-12"
                      data-testid="teammate-login-email"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Password</Label>
                    <div className="relative mt-1">
                      <Input
                        type={showPw ? 'text' : 'password'}
                        value={form.password}
                        onChange={(e) => update('password', e.target.value)}
                        required
                        className="rounded-xl border-stone-200 bg-stone-50 h-12 pr-11"
                        data-testid="teammate-login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw(!showPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                      >
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto px-10 mx-auto block"
                    data-testid="teammate-login-submit"
                  >
                    {submitting ? 'Logging in...' : 'Log In & Join Team'}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </form>
                <p className="text-center text-sm text-stone-500 mt-6">
                  Need an account?{' '}
                  <button onClick={() => setShowLogin(false)} className="text-orange-600 font-medium hover:text-orange-700">
                    Sign Up
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 2: Challenge, Walker Type, Supporters, Pay */}
      {step === 1 && (
        <div data-testid="teammate-step-setup">
          {/* Team Info Banner */}
          <Card className="bg-stone-900 rounded-2xl border-none mb-6">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">{team.name}</p>
                  <p className="text-stone-400 text-xs">{team.members_count + 1} members</p>
                </div>
              </div>
              <Badge className="bg-emerald-500 text-white rounded-full">Joined!</Badge>
            </CardContent>
          </Card>

          {/* Select Challenge */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-stone-900 mb-3">Select Your Challenge</h3>
            <div className="grid grid-cols-1 gap-3">
              {challenges.map((ch) => (
                <button key={ch.id} onClick={() => setSelectedChallenge(ch.id)} className="text-left w-full" data-testid={`teammate-challenge-${ch.id}`}>
                  <Card className={`rounded-xl border-2 transition-all ${
                    selectedChallenge === ch.id
                      ? 'border-orange-500 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.2)]'
                      : 'border-stone-100 hover:border-stone-200'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Mountain className="w-5 h-5 text-orange-600" />
                          <div>
                            <p className="font-bold text-stone-900">{ch.name}</p>
                            <p className="text-xs text-stone-500">{ch.total_distance_km} km</p>
                          </div>
                        </div>
                        {selectedChallenge === ch.id && (
                          <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>

          {/* Select Walker Type */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-stone-900 mb-3">Select Walker Type</h3>
            <div className="grid grid-cols-3 gap-3">
              {walkerTypes.map((wt) => (
                <button key={wt.id} onClick={() => setSelectedType(wt.id)} className="text-left w-full" data-testid={`teammate-type-${wt.id}`}>
                  <Card className={`rounded-xl border-2 transition-all h-full ${
                    selectedType === wt.id
                      ? 'border-orange-500 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.2)]'
                      : 'border-stone-100 hover:border-stone-200'
                  }`}>
                    <CardContent className="p-4 text-center">
                      <Badge className={`rounded-full text-xs mb-2 ${selectedType === wt.id ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                        {wt.name}
                      </Badge>
                      <p className="text-xl font-bold text-stone-900">${wt.cost_usd}</p>
                      {selectedType === wt.id && (
                        <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center mx-auto mt-2">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Photo Upload */}
          <Card className="rounded-xl border border-stone-100 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-stone-900">Upload a Photo</h3>
                <Badge variant="outline" className="rounded-full text-[10px] border-stone-200 text-stone-400 ml-auto">Optional</Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center border-2 border-stone-200 shrink-0 cursor-pointer hover:border-orange-300 transition-colors"
                  onClick={() => picInputRef.current?.click()} data-testid="teammate-photo-upload">
                  {profilePicPreview ? (
                    <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-5 h-5 text-stone-300" />
                  )}
                </div>
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={() => picInputRef.current?.click()}
                    className="rounded-xl border-stone-200 text-stone-600 text-xs">
                    {profilePicPreview ? 'Change Photo' : 'Choose Photo'}
                  </Button>
                  <p className="text-xs text-stone-400 mt-1">Appears on your fundraising page</p>
                </div>
                <input ref={picInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setProfilePic(file);
                      setProfilePicPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Achievement Levels - Informational Table */}
          <Card className="rounded-xl border border-stone-100 bg-stone-50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-stone-900">Achievement Levels</h3>
                <Badge variant="outline" className="rounded-full text-[10px] border-stone-200 text-stone-400 ml-auto">Info</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-3">
                As your total amount raised grows (your fee + teammates + supporters), you unlock achievement levels and earn swag.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-1.5 px-2 text-xs text-stone-400 font-medium">Level</th>
                      <th className="text-left py-1.5 px-2 text-xs text-stone-400 font-medium">Amount</th>
                      <th className="text-left py-1.5 px-2 text-xs text-stone-400 font-medium">Swag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {achievementLevels.map((al) => (
                      <tr key={al.id} className="border-b border-stone-100 last:border-none">
                        <td className="py-2 px-2 text-sm font-medium text-stone-700">{al.achievement}</td>
                        <td className="py-2 px-2 text-sm text-stone-600">${al.total_amount_usd.toLocaleString()}</td>
                        <td className="py-2 px-2 text-xs text-stone-500">{al.swag}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Invite Supporters & Share */}
          <Card className="rounded-xl border border-stone-100 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <UserPlus className="w-5 h-5 text-orange-600" />
                <h3 className="font-bold text-stone-900">Spread the Word</h3>
                <Badge variant="outline" className="rounded-full text-[10px] border-stone-200 text-stone-400 ml-auto">Optional</Badge>
              </div>
              <p className="text-xs text-stone-500 mb-4">Invite supporters and share your fundraising page to get more pledges.</p>
              
              {/* Invite by email */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-stone-700 text-xs font-bold">Invite Supporters by Email</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSupporters([...supporters, { name: '', email: '' }])} className="text-orange-600 text-xs" data-testid="teammate-add-supporter">
                    <Plus className="w-3 h-3 mr-1" /> Add More
                  </Button>
                </div>
                <div className="space-y-2">
                  {supporters.map((s, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input value={s.name} onChange={(e) => { const copy = [...supporters]; copy[i].name = e.target.value; setSupporters(copy); }}
                        placeholder="Name" className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1" data-testid={`teammate-supporter-name-${i}`} />
                      <Input type="email" value={s.email} onChange={(e) => { const copy = [...supporters]; copy[i].email = e.target.value; setSupporters(copy); }}
                        placeholder="Email" className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1" data-testid={`teammate-supporter-email-${i}`} />
                      {supporters.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => setSupporters(supporters.filter((_, j) => j !== i))} className="text-stone-300 hover:text-red-500 shrink-0">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-stone-100" />
                <span className="text-xs text-stone-400 font-medium">or share your link</span>
                <div className="flex-1 h-px bg-stone-100" />
              </div>

              {/* Share Link */}
              {user && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <Label className="text-stone-700 text-xs font-bold">Your Fundraising Page</Label>
                  </div>
                  <div className="flex gap-2">
                    <Input readOnly value={`${window.location.origin}/fundraise/${user.id}`}
                      className="rounded-xl bg-stone-50 border-stone-200 text-stone-600 text-xs h-10" data-testid="teammate-fundraise-link" />
                    <Button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/fundraise/${user.id}`); toast.success('Link copied!'); }}
                      className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shrink-0" data-testid="teammate-copy-link">
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pay Button */}
          <Card className="bg-white rounded-xl border border-stone-100 mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-stone-700">Registration Fee</span>
                <span className="text-2xl font-bold text-orange-600">${selectedTypeObj?.cost_usd || 0}</span>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
          <Button
            onClick={handleFinish}
            disabled={submitting || !selectedChallenge || !selectedType}
            className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto text-base disabled:opacity-50 px-12"
            data-testid="teammate-pay-btn"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {submitting ? 'Processing...' : `Pay $${selectedTypeObj?.cost_usd || 0} & Start Walking`}
          </Button>
          </div>
          <p className="text-xs text-stone-400 text-center mt-3">
            No real payment is processed in this prototype.
          </p>
        </div>
      )}
    </div>
  );
}
