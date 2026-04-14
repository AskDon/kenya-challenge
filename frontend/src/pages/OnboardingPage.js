import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  Mountain, Check, ArrowRight, ArrowLeft, Users, Search,
  Plus, Heart, Copy, CreditCard, Trash2, Award, X, UserPlus, Camera
} from 'lucide-react';

const STEPS = ['Challenge', 'Registration Level', 'Team', 'Invite Supporters', 'Pay'];

export default function OnboardingPage() {
  const { user, fetchUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);

  // Data
  const [challenges, setChallenges] = useState([]);
  const [walkerTypes, setWalkerTypes] = useState([]);
  const [achievementLevels, setAchievementLevels] = useState([]);

  // Selections
  const [selectedChallenge, setSelectedChallenge] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Team
  const [teamChoice, setTeamChoice] = useState('skip'); // skip, join, create
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [newTeam, setNewTeam] = useState({ name: '', tagline: '' });
  const [teamInvites, setTeamInvites] = useState([{ name: '', email: '' }]);

  // Supporters
  const [supporters, setSupporters] = useState([{ name: '', email: '' }, { name: '', email: '' }, { name: '', email: '' }]);

  // Loading
  const [submitting, setSubmitting] = useState(false);
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicPreview, setProfilePicPreview] = useState(null);
  const picInputRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/challenges'),
      api.get('/walker-types'),
      api.get('/achievement-levels'),
    ]).then(([ch, wt, al]) => {
      setChallenges(ch.data);
      setWalkerTypes(wt.data);
      setAchievementLevels(al.data);
    }).catch(() => toast.error('Failed to load data'));
  }, []);

  // If user already has challenge+type, skip to dashboard
  useEffect(() => {
    if (user?.challenge_id && user?.walker_type_id && user?.paid) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const searchTeams = async (query) => {
    const q = query !== undefined ? query : searchQuery;
    try {
      const res = await api.get(`/teams/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch { toast.error('Search failed'); }
  };

  // Auto-search when query changes (debounced) or when "Join a Team" is selected
  useEffect(() => {
    if (teamChoice === 'join') {
      const timer = setTimeout(() => {
        searchTeams(searchQuery);
      }, searchQuery ? 300 : 0);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, teamChoice]);

  const joinTeam = async (inviteCode) => {
    try {
      await api.post(`/teams/join/${inviteCode}`);
      await fetchUser();
      toast.success('Joined team!');
      setStep(3);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to join team');
    }
  };

  const canNext = () => {
    if (step === 0) return !!selectedChallenge;
    if (step === 1) return !!selectedType;
    return true;
  };

  const handleNext = async () => {
    if (step === 2 && teamChoice === 'create') {
      if (!newTeam.name.trim()) {
        toast.error('Please enter a team name');
        return;
      }
      try {
        await api.post('/teams', {
          name: newTeam.name,
          tagline: newTeam.tagline,
          description: newTeam.tagline,
        });
        await fetchUser();
        // Send team invites
        for (const inv of teamInvites) {
          if (inv.name && inv.email) {
            await api.post('/supporter-invites', { name: inv.name, email: inv.email }).catch(() => {});
          }
        }
        toast.success('Team created!');
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Failed to create team');
        return;
      }
    }
    if (step === 3) {
      // Save supporter invites
      for (const s of supporters) {
        if (s.name && s.email) {
          await api.post('/supporter-invites', { name: s.name, email: s.email }).catch(() => {});
        }
      }
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleFinish = async () => {
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
      await api.post('/users/select-challenge', {
        challenge_id: selectedChallenge,
        walker_type_id: selectedType,
      });
      await api.post('/users/mark-paid');
      await fetchUser();
      toast.success('You\'re all set! Let the walking begin!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeObj = walkerTypes.find(w => w.id === selectedType);

  return (
    <div className="container-app py-8 md:py-12 max-w-3xl" data-testid="onboarding-page">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
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
                <div className={`hidden sm:block w-12 md:w-20 h-0.5 mx-1 ${i < step ? 'bg-orange-600' : 'bg-stone-200'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <p key={s} className={`text-xs font-medium ${i === step ? 'text-orange-600' : 'text-stone-400'}`}>{s}</p>
          ))}
        </div>
      </div>

      {/* Step 0: Select Challenge */}
      {step === 0 && (
        <div data-testid="onboarding-step-challenge">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-2">Select Your Challenge Route</h2>
          <p className="text-stone-500 text-sm mb-6">Choose a virtual Kenyan route to walk.</p>
          <div className="grid grid-cols-1 gap-4">
            {challenges.map((ch) => (
              <button key={ch.id} onClick={() => setSelectedChallenge(ch.id)} className="text-left w-full" data-testid={`onboard-challenge-${ch.id}`}>
                <Card className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
                  selectedChallenge === ch.id
                    ? 'border-orange-500 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.2)]'
                    : 'border-stone-100 hover:border-stone-200'
                }`}>
                  <CardContent className="p-0">
                    <div className="flex items-stretch">
                      {ch.route_map_url && (
                        <div className="w-32 md:w-40 shrink-0 bg-stone-100">
                          <img src={ch.route_map_url} alt={ch.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Mountain className="w-5 h-5 text-orange-600" />
                              <h3 className="text-base font-bold text-stone-900">{ch.name}</h3>
                              <Badge variant="outline" className="text-xs rounded-full border-stone-200">{ch.total_distance_km} km</Badge>
                            </div>
                            <p className="text-sm text-stone-500 leading-relaxed mb-2">{ch.description}</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ch.milestones?.slice(0, 4).map((m, i) => (
                                <span key={i} className="text-xs bg-stone-50 text-stone-600 px-2 py-0.5 rounded-full">{m.title}</span>
                              ))}
                            </div>
                          </div>
                          {selectedChallenge === ch.id && (
                            <div className="w-7 h-7 rounded-full bg-orange-600 flex items-center justify-center shrink-0">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Select Registration Level */}
      {step === 1 && (
        <div data-testid="onboarding-step-walker-type">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-2">Choose Your Registration Level</h2>
          <p className="text-stone-500 text-sm mb-6">Select your registration level. 100% of your fees goes directly to help a student go to school.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {walkerTypes.map((wt) => (
              <button key={wt.id} onClick={() => setSelectedType(wt.id)} className="text-left w-full" data-testid={`onboard-type-${wt.id}`}>
                <Card className={`rounded-2xl border-2 transition-all duration-200 h-full ${
                  selectedType === wt.id
                    ? 'border-orange-500 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.2)]'
                    : 'border-stone-100 hover:border-stone-200'
                }`}>
                  <CardContent className="p-6 text-center">
                    <Badge className={`rounded-full text-xs mb-3 ${selectedType === wt.id ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {wt.name}
                    </Badge>
                    <p className="text-3xl font-bold text-stone-900">${wt.cost_usd}</p>
                    <p className="text-sm text-stone-500 mt-1">Registration fee</p>
                    {selectedType === wt.id && (
                      <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center mx-auto mt-3">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {/* Optional Photo Upload */}
          <Card className="rounded-2xl border border-stone-100 mb-6">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Upload a Photo</h3>
                <Badge variant="outline" className="rounded-full text-[10px] border-stone-200 text-stone-400 ml-auto">Optional</Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-stone-100 flex items-center justify-center border-2 border-stone-200 shrink-0 cursor-pointer hover:border-orange-300 transition-colors"
                  onClick={() => picInputRef.current?.click()} data-testid="onboarding-photo-upload">
                  {profilePicPreview ? (
                    <img src={profilePicPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-6 h-6 text-stone-300" />
                  )}
                </div>
                <div>
                  <Button type="button" variant="outline" size="sm" onClick={() => picInputRef.current?.click()}
                    className="rounded-xl border-stone-200 text-stone-600 text-xs" data-testid="onboarding-photo-btn">
                    {profilePicPreview ? 'Change Photo' : 'Choose Photo'}
                  </Button>
                  <p className="text-xs text-stone-400 mt-1">This will appear on your fundraising page</p>
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

          {/* Achievement Levels - Informational Only */}
          <Card className="rounded-2xl border border-stone-100 bg-stone-50">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-bold text-stone-900">Achievement Levels</h3>
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
                      <th className="text-left py-1.5 px-2 text-xs text-stone-400 font-medium">Amount Raised</th>
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
        </div>
      )}

      {/* Step 2: Team */}
      {step === 2 && (
        <div data-testid="onboarding-step-team">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-2">Team Up <span className="text-stone-400 font-normal text-base">(Optional)</span></h2>
          <p className="text-stone-500 text-sm mb-6">Walk with friends and raise more together.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {[
              { key: 'skip', label: 'Skip for Now', desc: 'Go solo', icon: ArrowRight },
              { key: 'join', label: 'Join a Team', desc: 'Search existing', icon: Search },
              { key: 'create', label: 'Create a Team', desc: 'Be a team leader', icon: Plus },
            ].map(opt => (
              <button key={opt.key} onClick={() => setTeamChoice(opt.key)} className="text-left w-full" data-testid={`team-choice-${opt.key}`}>
                <Card className={`rounded-2xl border-2 transition-all h-full ${
                  teamChoice === opt.key
                    ? 'border-orange-500 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.2)]'
                    : 'border-stone-100 hover:border-stone-200'
                }`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${teamChoice === opt.key ? 'bg-orange-600' : 'bg-stone-100'}`}>
                      <opt.icon className={`w-5 h-5 ${teamChoice === opt.key ? 'text-white' : 'text-stone-500'}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{opt.label}</p>
                      <p className="text-xs text-stone-400">{opt.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {/* Join Team - Search */}
          {teamChoice === 'join' && (
            <Card className="rounded-2xl border border-stone-100">
              <CardContent className="p-5">
                <h3 className="text-base font-bold text-stone-900 mb-3">Search Teams</h3>
                <div className="flex gap-2 mb-4">
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by team name..."
                    className="rounded-xl border-stone-200 bg-stone-50 h-11 flex-1"
                    data-testid="team-search-input"
                    onKeyDown={(e) => e.key === 'Enter' && searchTeams(searchQuery)}
                  />
                  <Button onClick={() => searchTeams(searchQuery)} className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white" data-testid="team-search-btn">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>
                {searchResults.length > 0 ? (
                  <div className="space-y-2">
                    {searchResults.map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`team-result-${t.id}`}>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{t.name}</p>
                          <p className="text-xs text-stone-400">{t.members_count} member{t.members_count !== 1 ? 's' : ''} {t.tagline ? `· ${t.tagline}` : ''}</p>
                        </div>
                        <Button onClick={() => joinTeam(t.invite_code)} size="sm" className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid={`team-join-${t.id}`}>
                          Join
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-stone-400 text-center py-4">
                    {searchQuery ? 'No teams found for that search. Try a different name or create your own!' : 'No teams available yet. You can create your own!'}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Create Team */}
          {teamChoice === 'create' && (
            <Card className="rounded-2xl border border-stone-100">
              <CardContent className="p-5">
                <h3 className="text-base font-bold text-stone-900 mb-3">Create Your Team</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Team Name</Label>
                    <Input
                      value={newTeam.name}
                      onChange={(e) => setNewTeam(t => ({ ...t, name: e.target.value }))}
                      placeholder="e.g. KEF Trailblazers"
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-11"
                      data-testid="create-team-name"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Tagline <span className="text-stone-400 font-normal">(optional)</span></Label>
                    <Input
                      value={newTeam.tagline}
                      onChange={(e) => setNewTeam(t => ({ ...t, tagline: e.target.value }))}
                      placeholder="e.g. Every step educates a child"
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-11"
                      data-testid="create-team-tagline"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label className="text-stone-700 text-sm font-medium">Invite Team Members <span className="text-stone-400 font-normal">(optional)</span></Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setTeamInvites([...teamInvites, { name: '', email: '' }])}
                        className="text-orange-600 text-xs"
                        data-testid="add-team-invite"
                      >
                        <UserPlus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {teamInvites.map((inv, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            value={inv.name}
                            onChange={(e) => {
                              const copy = [...teamInvites];
                              copy[i].name = e.target.value;
                              setTeamInvites(copy);
                            }}
                            placeholder="Name"
                            className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1"
                            data-testid={`team-invite-name-${i}`}
                          />
                          <Input
                            type="email"
                            value={inv.email}
                            onChange={(e) => {
                              const copy = [...teamInvites];
                              copy[i].email = e.target.value;
                              setTeamInvites(copy);
                            }}
                            placeholder="Email"
                            className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1"
                            data-testid={`team-invite-email-${i}`}
                          />
                          {teamInvites.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setTeamInvites(teamInvites.filter((_, j) => j !== i))}
                              className="text-stone-300 hover:text-red-500 shrink-0"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 3: Invite Supporters & Share */}
      {step === 3 && (
        <div data-testid="onboarding-step-supporters">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-2">Spread the Word <span className="text-stone-400 font-normal text-base">(Optional)</span></h2>
          <p className="text-stone-500 text-sm mb-6">
            Invite supporters and share your fundraising page to get more pledges.
          </p>

          <Card className="rounded-2xl border border-stone-100 mb-4">
            <CardContent className="p-5">
              {/* Invite by email */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-orange-600" />
                    <Label className="text-stone-900 text-sm font-bold">Invite Supporters by Email</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSupporters([...supporters, { name: '', email: '' }])}
                    className="text-orange-600 text-xs"
                    data-testid="add-supporter"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add More
                  </Button>
                </div>
                <div className="space-y-2">
                  {supporters.map((s, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        value={s.name}
                        onChange={(e) => {
                          const copy = [...supporters];
                          copy[i].name = e.target.value;
                          setSupporters(copy);
                        }}
                        placeholder="Name"
                        className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1"
                        data-testid={`supporter-name-${i}`}
                      />
                      <Input
                        type="email"
                        value={s.email}
                        onChange={(e) => {
                          const copy = [...supporters];
                          copy[i].email = e.target.value;
                          setSupporters(copy);
                        }}
                        placeholder="Email"
                        className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1"
                        data-testid={`supporter-email-${i}`}
                      />
                      {supporters.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setSupporters(supporters.filter((_, j) => j !== i))}
                          className="text-stone-300 hover:text-red-500 shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-stone-100" />
                <span className="text-xs text-stone-400 font-medium">or share your link</span>
                <div className="flex-1 h-px bg-stone-100" />
              </div>

              {/* Share Fundraising Link */}
              {user && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Heart className="w-5 h-5 text-rose-500" />
                    <Label className="text-stone-900 text-sm font-bold">Your Fundraising Page</Label>
                  </div>
                  <p className="text-stone-400 text-xs mb-3">Share this link with anyone to support your walk</p>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/fundraise/${user.id}`}
                      className="rounded-xl bg-stone-50 border-stone-200 text-stone-600 text-xs h-10"
                      data-testid="fundraise-link-input"
                    />
                    <Button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/fundraise/${user.id}`);
                        toast.success('Link copied!');
                      }}
                      className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                      data-testid="copy-fundraise-link"
                    >
                      <Copy className="w-4 h-4 mr-1" /> Copy
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Pay */}
      {step === 4 && (
        <div data-testid="onboarding-step-pay">
          <h2 className="text-xl md:text-2xl font-bold text-stone-900 mb-2">Complete Registration</h2>
          <p className="text-stone-500 text-sm mb-6">Review your selections and pay to start walking.</p>

          <Card className="rounded-2xl border border-stone-100 mb-6">
            <CardContent className="p-5">
              <h3 className="text-base font-bold text-stone-900 mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                  <div className="flex items-center gap-2">
                    <Mountain className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-stone-700">Challenge</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">
                    {challenges.find(c => c.id === selectedChallenge)?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-orange-600" />
                    <span className="text-sm text-stone-700">Registration Level</span>
                  </div>
                  <span className="text-sm font-bold text-stone-900">
                    {selectedTypeObj?.name}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-orange-50 border border-orange-100">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Registration Fee</span>
                  </div>
                  <span className="text-lg font-bold text-orange-600">
                    ${selectedTypeObj?.cost_usd}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="text-center">
          <Button
            onClick={handleFinish}
            disabled={submitting}
            className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto text-base transition-all hover:scale-[1.02] px-12"
            data-testid="onboarding-pay-btn"
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

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-stone-100">
        {step > 0 ? (
          <Button
            variant="ghost"
            onClick={() => setStep(step - 1)}
            className="rounded-full text-stone-600"
            data-testid="onboarding-back-btn"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
        ) : <div />}

        {step < STEPS.length - 1 && (
          <Button
            onClick={handleNext}
            disabled={!canNext()}
            className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 disabled:opacity-50"
            data-testid="onboarding-next-btn"
          >
            {step === 2 && teamChoice === 'skip' ? 'Skip' : step === 3 ? 'Continue' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
