import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import api from '../lib/api';
import { toast } from 'sonner';
import { Heart, MapPin, Footprints, ArrowRight, Mountain, Users, DollarSign, ExternalLink } from 'lucide-react';

export default function SupporterDashboard() {
  const { user } = useAuth();
  const [pledges, setPledges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/supporters/dashboard')
      .then(r => setPledges(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  const totalPledged = pledges.reduce((sum, p) => sum + (p.calculated_amount || 0), 0);
  const activeWalkers = new Set(pledges.map(p => p.walker_id)).size;

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container-app py-8 md:py-12" data-testid="supporter-dashboard">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2">Your Supporter Dashboard</h1>
        <p className="text-stone-500">Track the walkers you're supporting and your pledges.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="bg-white rounded-2xl border border-stone-100">
          <CardContent className="p-5 text-center">
            <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-stone-900">{pledges.length}</p>
            <p className="text-xs text-stone-400">Active Pledges</p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl border border-stone-100">
          <CardContent className="p-5 text-center">
            <Users className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-stone-900">{activeWalkers}</p>
            <p className="text-xs text-stone-400">Walkers Supported</p>
          </CardContent>
        </Card>
        <Card className="bg-white rounded-2xl border border-stone-100">
          <CardContent className="p-5 text-center">
            <DollarSign className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-emerald-600">${totalPledged.toFixed(2)}</p>
            <p className="text-xs text-stone-400">Total Pledged</p>
          </CardContent>
        </Card>
      </div>

      {/* Pledges List */}
      {pledges.length === 0 ? (
        <Card className="bg-white rounded-2xl border border-stone-100">
          <CardContent className="p-12 text-center">
            <Heart className="w-12 h-12 text-stone-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-stone-900 mb-2">No Pledges Yet</h3>
            <p className="text-stone-500 mb-6">Support walkers by visiting their fundraising pages and making a pledge.</p>
            <Link to="/leaderboard">
              <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white">
                Discover Walkers <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-stone-900">Your Pledges</h2>
          {pledges.map((pledge) => {
            const walker = pledge.walker;
            const challenge = pledge.challenge;
            const progressPct = pledge.walker_progress_pct || 0;

            return (
              <Card key={pledge.id} className="bg-white rounded-2xl border border-stone-100 hover:shadow-md transition-shadow" data-testid={`pledge-card-${pledge.id}`}>
                <CardContent className="p-5">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Walker Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-lg font-bold text-orange-700">
                          {walker?.display_name?.[0] || walker?.full_name?.[0] || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-stone-900 truncate">
                          {walker?.display_name || walker?.full_name || 'Walker'}
                        </h3>
                        {challenge && (
                          <div className="flex items-center gap-1 text-xs text-stone-500">
                            <Mountain className="w-3 h-3" />
                            <span className="truncate">{challenge.name}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-stone-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {pledge.walker_total_km || 0} km
                        </span>
                        <span className="font-medium text-stone-700">{progressPct}%</span>
                      </div>
                      <Progress value={progressPct} className="h-2" />
                      {challenge && (
                        <p className="text-[10px] text-stone-400 mt-1">
                          of {challenge.total_distance_km} km
                        </p>
                      )}
                    </div>

                    {/* Pledge Amount */}
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge className="bg-emerald-50 text-emerald-700 rounded-full font-bold px-3 py-1">
                          {pledge.pledge_type === 'per_km'
                            ? `$${pledge.pledge_per_km}/km`
                            : `$${pledge.pledge_total}`}
                        </Badge>
                        {pledge.pledge_type === 'per_km' && (
                          <p className="text-[10px] text-stone-400 mt-1">
                            Est: ${pledge.calculated_amount?.toFixed(2) || '0.00'}
                          </p>
                        )}
                      </div>
                      <Link to={`/fundraise/${pledge.walker_id}`}>
                        <Button variant="ghost" size="icon" className="rounded-full text-stone-400 hover:text-orange-600" data-testid={`view-walker-${pledge.walker_id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="rounded-full text-xs border-stone-200 text-stone-500">
                        {pledge.status === 'active' ? 'Active' : pledge.status}
                      </Badge>
                      <span className="text-xs text-stone-400">
                        Pledged on {new Date(pledge.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* CTA to support more */}
      {pledges.length > 0 && (
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100 mt-8">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-stone-900 mb-1">Want to support more walkers?</h3>
              <p className="text-sm text-stone-600">Check out the leaderboard to find more walkers making a difference.</p>
            </div>
            <Link to="/leaderboard">
              <Button className="rounded-full bg-orange-600 hover:bg-orange-700 text-white shrink-0">
                View Leaderboard <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
