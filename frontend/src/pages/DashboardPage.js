import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { Footprints, MapPin, Heart, Users, ArrowRight, Mountain, TrendingUp, Share2 } from 'lucide-react';
import { toast } from 'sonner';

const ROUTE_BG = 'https://images.unsplash.com/photo-1759767119566-e7dad33d540b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwyfHxrZW55YSUyMGxhbmRzY2FwZSUyMHJvYWQlMjByZWQlMjBlYXJ0aCUyMG1vdW50JTIwa2VueWF8ZW58MHx8fHwxNzcwNzQ3MzM3fDA&ixlib=rb-4.1.0&q=85';

export default function DashboardPage() {
  const { user } = useAuth();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/users/progress')
      .then(r => setProgress(r.data))
      .catch(() => toast.error('Failed to load progress'))
      .finally(() => setLoading(false));
  }, []);

  const copyFundraiseLink = () => {
    const url = `${window.location.origin}/fundraise/${user.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Fundraising link copied!');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const hasChallenge = user?.challenge_id && progress?.challenge;

  return (
    <div className="container-app py-8 md:py-12" data-testid="dashboard-page">
      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900">
          Habari, {user?.display_name || user?.full_name}!
        </h1>
        <p className="text-stone-500 mt-1">
          {hasChallenge ? 'Your journey continues. Keep walking!' : 'Choose a challenge to start your journey.'}
        </p>
      </div>

      {!hasChallenge ? (
        /* No challenge selected */
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
              { label: 'Sponsors', value: progress.sponsors_count, icon: Users, color: 'bg-sky-50 text-sky-600' },
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

          {/* Route Progress */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] overflow-hidden" data-testid="route-progress-card">
            <div className="relative h-48 md:h-56">
              <img src={ROUTE_BG} alt="Kenya route" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-900/50" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="flex items-center justify-between text-white mb-2">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-stone-300 font-medium">Current Route</p>
                    <p className="text-lg font-bold">{progress.challenge.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{progress.progress_pct}%</p>
                    <p className="text-xs text-stone-300">{progress.total_km} / {progress.challenge.total_distance_km} km</p>
                  </div>
                </div>
                <div className="relative">
                  <Progress value={progress.progress_pct} className="h-3 bg-white/20" />
                  {/* Milestone markers */}
                  {progress.challenge.milestones?.map((m, i) => {
                    const pct = (m.distance_km / progress.challenge.total_distance_km) * 100;
                    return (
                      <div
                        key={i}
                        className="absolute top-0 w-1 h-3 bg-white/60"
                        style={{ left: `${pct}%` }}
                        title={m.title}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/activity" className="block">
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer">
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
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">Share Fundraising Page</p>
                    <p className="text-xs text-stone-500">Copy your sponsor link</p>
                  </div>
                </CardContent>
              </Card>
            </button>

            <Link to="/team" className="block">
              <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all duration-300 cursor-pointer">
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
