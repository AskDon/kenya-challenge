import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { MapPin, Heart, Users, Trophy } from 'lucide-react';

export default function LeaderboardPage() {
  const [distLeaders, setDistLeaders] = useState([]);
  const [raisedLeaders, setRaisedLeaders] = useState([]);
  const [teamDist, setTeamDist] = useState([]);
  const [teamRaised, setTeamRaised] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/leaderboards/distance'),
      api.get('/leaderboards/raised'),
      api.get('/leaderboards/teams/distance'),
      api.get('/leaderboards/teams/raised'),
    ]).then(([d, r, td, tr]) => {
      setDistLeaders(d.data);
      setRaisedLeaders(r.data);
      setTeamDist(td.data);
      setTeamRaised(tr.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const getMedal = (i) => {
    if (i === 0) return '🥇';
    if (i === 1) return '🥈';
    if (i === 2) return '🥉';
    return i + 1;
  };

  const LeaderRow = ({ rank, name, country, value, unit, userId }) => {
    const content = (
      <div className={`flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors ${userId ? 'cursor-pointer' : ''}`} data-testid={`leader-row-${rank}`}>
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
            rank < 3 ? 'bg-orange-100 text-orange-700' : 'bg-stone-200 text-stone-600'
          }`}>
            {rank < 3 ? getMedal(rank) : rank + 1}
          </div>
          <div>
            <p className={`text-sm font-medium ${userId ? 'text-orange-700 hover:underline' : 'text-stone-900'}`}>{name}</p>
            {country && <p className="text-xs text-stone-400">{country}</p>}
          </div>
        </div>
        <p className="text-sm font-bold text-stone-900">{value} {unit}</p>
      </div>
    );
    if (userId) {
      return <Link to={`/fundraise/${userId}`} data-testid={`leader-link-${userId}`}>{content}</Link>;
    }
    return content;
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container-app py-8 md:py-12" data-testid="leaderboard-page">
      <div className="text-center mb-8">
        <Trophy className="w-10 h-10 text-orange-600 mx-auto mb-3" />
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900">Leaderboard</h1>
        <p className="text-stone-500 mt-1">See who's leading the challenge</p>
      </div>

      <Tabs defaultValue="distance" className="max-w-2xl mx-auto">
        <TabsList className="grid grid-cols-4 bg-stone-100 rounded-xl p-1 mb-6">
          <TabsTrigger value="distance" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white" data-testid="tab-distance">
            <MapPin className="w-3 h-3 mr-1 hidden sm:inline" /> Distance
          </TabsTrigger>
          <TabsTrigger value="raised" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white" data-testid="tab-raised">
            <Heart className="w-3 h-3 mr-1 hidden sm:inline" /> Raised
          </TabsTrigger>
          <TabsTrigger value="team-distance" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white" data-testid="tab-team-distance">
            <Users className="w-3 h-3 mr-1 hidden sm:inline" /> Teams (km)
          </TabsTrigger>
          <TabsTrigger value="team-raised" className="rounded-lg text-xs sm:text-sm data-[state=active]:bg-white" data-testid="tab-team-raised">
            <Users className="w-3 h-3 mr-1 hidden sm:inline" /> Teams ($)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distance">
          <Card className="bg-white rounded-2xl border border-stone-100">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Top Walkers by Distance</h3>
              {distLeaders.length === 0 ? (
                <p className="text-stone-400 text-center py-6">No entries yet</p>
              ) : (
                <div className="space-y-2">
                  {distLeaders.map((l, i) => (
                    <LeaderRow key={l.user_id} rank={i} name={l.display_name} country={l.country} value={l.total_km} unit="km" userId={l.user_id} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raised">
          <Card className="bg-white rounded-2xl border border-stone-100">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Top Fundraisers</h3>
              {raisedLeaders.length === 0 ? (
                <p className="text-stone-400 text-center py-6">No entries yet</p>
              ) : (
                <div className="space-y-2">
                  {raisedLeaders.map((l, i) => (
                    <LeaderRow key={l.user_id} rank={i} name={l.display_name} country={l.country} value={`$${l.total_raised}`} unit="" userId={l.user_id} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-distance">
          <Card className="bg-white rounded-2xl border border-stone-100">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Top Teams by Distance</h3>
              {teamDist.length === 0 ? (
                <p className="text-stone-400 text-center py-6">No entries yet</p>
              ) : (
                <div className="space-y-2">
                  {teamDist.map((t, i) => (
                    <LeaderRow key={t.team_id} rank={i} name={t.name} country={`${t.members_count} members`} value={t.total_km} unit="km" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team-raised">
          <Card className="bg-white rounded-2xl border border-stone-100">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Top Teams by Fundraising</h3>
              {teamRaised.length === 0 ? (
                <p className="text-stone-400 text-center py-6">No entries yet</p>
              ) : (
                <div className="space-y-2">
                  {teamRaised.map((t, i) => (
                    <LeaderRow key={t.team_id} rank={i} name={t.name} country={`${t.members_count} members`} value={`$${t.total_raised}`} unit="" />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
