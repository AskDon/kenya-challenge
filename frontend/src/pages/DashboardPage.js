import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { Footprints, MapPin, Heart, Users, ArrowRight, Mountain, TrendingUp, Share2, Flag, Camera } from 'lucide-react';
import { toast } from 'sonner';

const ROUTE_BG = 'https://images.unsplash.com/photo-1759767119566-e7dad33d540b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwyfHxrZW55YSUyMGxhbmRzY2FwZSUyMHJvYWQlMjByZWQlMjBlYXJ0aCUyMG1vdW50JTIwa2VueWF8ZW58MHx8fHwxNzcwNzQ3MzM3fDA&ixlib=rb-4.1.0&q=85';

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copied!');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
    toast.success('Link copied!');
  } catch {
    toast.error('Failed to copy. Please copy manually: ' + text);
  }
  document.body.removeChild(textarea);
}

function RouteMap({ challenge, totalKm, progressPct, milestones }) {
  if (!challenge) return null;
  const sortedMilestones = [...(milestones || [])].sort((a, b) => a.distance_km - b.distance_km);

  return (
    <div className="relative bg-stone-50 rounded-xl p-4 md:p-6" data-testid="route-map">
      {/* Map background */}
      <div className="relative">
        {/* Route line */}
        <div className="relative h-16 md:h-20 flex items-center">
          {/* Background track */}
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-2 bg-stone-200 rounded-full" />
          {/* Completed track */}
          <div
            className="absolute left-4 top-1/2 -translate-y-1/2 h-2 bg-orange-500 rounded-full transition-all duration-500"
            style={{ width: `calc(${Math.min(progressPct, 100)}% - 2rem)` }}
          />
          {/* Milestone markers */}
          {sortedMilestones.map((m, i) => {
            const pct = (m.distance_km / challenge.total_distance_km) * 100;
            const reached = totalKm >= m.distance_km;
            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                style={{ left: `calc(${pct}% * 0.92 + 4%)` }}
              >
                <div className={`w-4 h-4 rounded-full border-2 ${
                  reached
                    ? 'bg-orange-500 border-orange-600'
                    : 'bg-white border-stone-300'
                }`} title={m.title} />
              </div>
            );
          })}
          {/* Start marker */}
          <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
            <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-emerald-600 flex items-center justify-center">
              <Flag className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          {/* Finish marker */}
          <div className="absolute right-4 top-1/2 -translate-y-1/2 z-10">
            <div className="w-5 h-5 rounded-full bg-stone-800 border-2 border-stone-900 flex items-center justify-center">
              <Flag className="w-2.5 h-2.5 text-white" />
            </div>
          </div>
          {/* Walker position */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 transition-all duration-500"
            style={{ left: `calc(${Math.min(progressPct, 100)}% * 0.92 + 4%)` }}
          >
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-orange-600 border-3 border-white shadow-lg flex items-center justify-center animate-pulse">
                <Footprints className="w-4 h-4 text-white" />
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-stone-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                {totalKm} km
              </div>
            </div>
          </div>
        </div>
        {/* Milestone labels */}
        <div className="relative h-12 mt-1">
          {sortedMilestones.map((m, i) => {
            const pct = (m.distance_km / challenge.total_distance_km) * 100;
            const reached = totalKm >= m.distance_km;
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 text-center"
                style={{ left: `calc(${pct}% * 0.92 + 4%)`, maxWidth: '80px' }}
              >
                <p className={`text-[9px] font-medium leading-tight ${reached ? 'text-orange-600' : 'text-stone-400'}`}>
                  {m.title}
                </p>
                <p className="text-[8px] text-stone-300">{m.distance_km}km</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, fetchUser } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPic, setUploadingPic] = useState(false);
  const picInputRef = useRef(null);

  useEffect(() => {
    api.get('/users/progress')
      .then(r => setProgress(r.data))
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false));
  }, []);

  const copyFundraiseLink = () => {
    const url = `${window.location.origin}/fundraise/${user.id}`;
    copyToClipboard(url);
  };

  const handleProfilePicUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    setUploadingPic(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post('/auth/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Profile picture updated!');
      if (fetchUser) fetchUser();
    } catch {
      toast.error('Failed to upload picture');
    } finally {
      setUploadingPic(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hasChallenge = user?.challenge_id && progress?.challenge;
  const isComplete = progress?.progress_pct >= 100;

  return (
    <div className="container-app py-8 md:py-12" data-testid="dashboard-page">
      {/* Greeting + Profile Picture */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          {/* Profile Picture */}
          <div className="relative group">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-orange-100 flex items-center justify-center border-2 border-orange-200">
              {user?.profile_picture_url ? (
                <img src={user.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-orange-600">{(user?.display_name || user?.full_name)?.[0]}</span>
              )}
            </div>
            <button
              onClick={() => picInputRef.current?.click()}
              disabled={uploadingPic}
              className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
              data-testid="profile-pic-upload-btn"
            >
              <Camera className="w-4 h-4 text-white" />
            </button>
            <input ref={picInputRef} type="file" accept="image/*" onChange={handleProfilePicUpload} className="hidden" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-stone-900">
              Karibuni, {user?.display_name || user?.full_name}!
            </h1>
            <p className="text-stone-500 mt-1">
              {hasChallenge
                ? isComplete ? 'Congratulations! You completed your challenge!' : 'Your journey continues. Keep walking!'
                : 'Choose a challenge to start your journey.'}
            </p>
          </div>
        </div>
        {hasChallenge && isComplete && (
          <Link to="/onboarding">
            <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium px-6 py-5 h-auto" data-testid="start-next-challenge-btn">
              Start Your Next Challenge <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>

      {!hasChallenge ? (
        <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardContent className="p-8 text-center">
            <Mountain className="w-12 h-12 text-orange-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-stone-900 mb-2">Pick Your Challenge</h2>
            <p className="text-stone-500 mb-6 max-w-md mx-auto">
              Choose a virtual Kenyan route and walker type to begin your walking journey.
            </p>
            <Link to="/onboarding">
              <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 py-6 h-auto" data-testid="dashboard-pick-challenge-btn">
                Get Started <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Distance', value: `${progress.total_km} km`, icon: MapPin, color: 'bg-orange-50 text-orange-600' },
              { label: 'Steps', value: progress.total_steps?.toLocaleString(), icon: Footprints, color: 'bg-emerald-50 text-emerald-600' },
              { label: 'Raised', value: `$${progress.total_raised}`, icon: Heart, color: 'bg-rose-50 text-rose-600' },
              { label: 'Supporters', value: progress.sponsors_count, icon: Users, color: 'bg-sky-50 text-sky-600' },
            ].map((stat) => (
              <Card key={stat.label} className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardContent className="p-5">
                  <div className={`w-9 h-9 rounded-xl ${stat.color.split(' ')[0]} flex items-center justify-center mb-3`}>
                    <stat.icon className={`w-4 h-4 ${stat.color.split(' ')[1]}`} />
                  </div>
                  <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
                  <p className="text-xs text-stone-400 mt-0.5 uppercase tracking-wider font-medium">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Challenge Progress */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden" data-testid="challenge-progress-card">
            <div className="relative h-40 md:h-48">
              <img src={ROUTE_BG} alt="Kenya route" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-900/50" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="flex items-center justify-between text-white mb-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-stone-300 font-medium">Current Challenge</p>
                    <p className="text-lg font-bold">{progress.challenge.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{progress.progress_pct}%</p>
                    <p className="text-xs text-stone-300">{progress.total_km} / {progress.challenge.total_distance_km} km</p>
                  </div>
                </div>
                <Progress value={progress.progress_pct} className="h-3 bg-white/20" />
              </div>
            </div>
            <CardContent className="p-6">
              {/* Route Map */}
              <RouteMap
                challenge={progress.challenge}
                totalKm={progress.total_km}
                progressPct={progress.progress_pct}
                milestones={progress.challenge.milestones}
              />

              {/* Milestone info */}
              <div className="flex flex-wrap gap-4 mt-4">
                {progress.current_milestone && (
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-1">Current Location</p>
                    <p className="text-sm font-bold text-stone-900">{progress.current_milestone.title}</p>
                    <p className="text-xs text-stone-500">{progress.current_milestone.description}</p>
                  </div>
                )}
                {progress.next_milestone && (
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mb-1">Next Milestone</p>
                    <p className="text-sm font-bold text-stone-900">{progress.next_milestone.title}</p>
                    <p className="text-xs text-stone-500">{progress.next_milestone.distance_km - progress.total_km > 0 ? `${(progress.next_milestone.distance_km - progress.total_km).toFixed(1)} km away` : 'Reached!'}</p>
                  </div>
                )}
                {isComplete && !progress.next_milestone && (
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs text-emerald-600 uppercase tracking-wider font-bold mb-1">Challenge Complete!</p>
                    <p className="text-sm font-bold text-stone-900">You've completed {progress.challenge.name}</p>
                    <p className="text-xs text-stone-500">{progress.total_km} km walked</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/activity" className="block">
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Log Activity</p>
                    <p className="text-xs text-stone-500">Add today's steps or km</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <button onClick={copyFundraiseLink} className="block w-full text-left">
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Share Fundraising Page</p>
                    <p className="text-xs text-stone-500">Copy your supporter link</p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <Link to="/team" className="block">
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Your Team</p>
                    <p className="text-xs text-stone-500">{progress.team ? progress.team.name : 'Create or join a team'}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/supporters" className="block">
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer h-full">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                    <Heart className="w-5 h-5 text-rose-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Your Supporters</p>
                    <p className="text-xs text-stone-500">Review and invite supporters</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Recent Activities */}
          {progress.recent_activities?.length > 0 && (
            <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-stone-900">Recent Activity</h3>
                  <Link to="/activity">
                    <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700 rounded-full" data-testid="dashboard-view-all-btn">
                      View All <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {progress.recent_activities.slice(0, 5).map((act) => (
                    <div key={act.id} className="flex items-center justify-between py-2 border-b border-stone-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center">
                          <Footprints className="w-4 h-4 text-stone-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{act.km} km</p>
                          <p className="text-xs text-stone-400">{act.steps?.toLocaleString()} steps</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs text-stone-400 border-stone-200 rounded-full">{act.date}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Walker Type & Achievement */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {progress.walker_type && (
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Walker Type</p>
                      <p className="text-lg font-bold text-stone-900 mt-1">{progress.walker_type.name}</p>
                      <p className="text-sm text-stone-500">${progress.walker_type.cost_usd} registration fee</p>
                    </div>
                    <Badge className={user.paid ? 'bg-emerald-100 text-emerald-700 rounded-full' : 'bg-amber-100 text-amber-700 rounded-full'}>
                      {user.paid ? 'Paid' : 'Pending'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}
            {progress.current_achievement && (
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
                <CardContent className="p-6">
                  <div>
                    <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Achievement Level</p>
                    <p className="text-lg font-bold text-stone-900 mt-1">{progress.current_achievement.achievement}</p>
                    <p className="text-sm text-stone-500">Swag: {progress.current_achievement.swag}</p>
                    {progress.next_achievement && (
                      <p className="text-xs text-orange-600 mt-2 font-medium">
                        Next: ${progress.next_achievement.total_amount_usd.toLocaleString()} &rarr; {progress.next_achievement.achievement}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
