import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { toast } from 'sonner';
import { Mountain, Check, ArrowRight } from 'lucide-react';

export default function ChallengesPage() {
  const { user, fetchUser } = useAuth();
  const [challenges, setChallenges] = useState([]);
  const [levels, setLevels] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(user?.challenge_id || '');
  const [selectedLevel, setSelectedLevel] = useState(user?.pricing_level_id || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.get('/challenges'), api.get('/pricing-levels')])
      .then(([ch, pl]) => { setChallenges(ch.data); setLevels(pl.data); })
      .catch(() => toast.error('Failed to load data'));
  }, []);

  const handleSelect = async () => {
    if (!selectedChallenge || !selectedLevel) {
      toast.error('Please select a challenge and a level');
      return;
    }
    setLoading(true);
    try {
      await api.post('/users/select-challenge', { challenge_id: selectedChallenge, pricing_level_id: selectedLevel });
      await api.post('/users/mark-paid');
      await fetchUser();
      toast.success('Challenge selected! Let the walking begin.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to select challenge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-app py-8 md:py-12" data-testid="challenges-page">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-stone-900">Choose Your Challenge</h1>
        <p className="text-stone-500 mt-1">Pick a virtual Kenyan route and your support level.</p>
      </div>

      {/* Challenges */}
      <div className="mb-10">
        <p className="text-orange-600 font-medium tracking-widest uppercase text-xs mb-4">Select a Route</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {challenges.map((ch) => (
            <button key={ch.id} onClick={() => setSelectedChallenge(ch.id)} className="text-left w-full" data-testid={`challenge-card-${ch.id}`}>
              <Card className={`rounded-2xl border-2 transition-all duration-200 cursor-pointer h-full ${
                selectedChallenge === ch.id
                  ? 'border-orange-500 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.2)]'
                  : 'border-stone-100 hover:border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
              }`}>
                <div className="h-2 rounded-t-2xl bg-gradient-to-r from-orange-500 to-emerald-600" />
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Mountain className="w-5 h-5 text-orange-600" />
                      <Badge variant="outline" className="text-xs rounded-full border-stone-200">{ch.total_distance_km} km</Badge>
                    </div>
                    {selectedChallenge === ch.id && (
                      <div className="w-6 h-6 rounded-full bg-orange-600 flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-stone-900 mb-2">{ch.name}</h3>
                  <p className="text-sm text-stone-500 leading-relaxed mb-3">{ch.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ch.milestones?.map((m, i) => (
                      <span key={i} className="text-xs bg-stone-50 text-stone-600 px-2 py-0.5 rounded-full">{m.title}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* Pricing Levels */}
      <div className="mb-10">
        <p className="text-orange-600 font-medium tracking-widest uppercase text-xs mb-4">Choose Your Level</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {levels.map((level) => (
            <button key={level.id} onClick={() => setSelectedLevel(level.id)} className="text-left w-full" data-testid={`level-card-${level.id}`}>
              <Card className={`rounded-2xl border-2 transition-all duration-200 cursor-pointer h-full ${
                selectedLevel === level.id
                  ? 'border-orange-500 shadow-[0_4px_20px_-2px_rgba(234,88,12,0.2)]'
                  : 'border-stone-100 hover:border-stone-200 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
              }`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`rounded-full text-xs ${selectedLevel === level.id ? 'bg-orange-600 text-white' : 'bg-stone-100 text-stone-600'}`}>
                      {level.name}
                    </Badge>
                    {selectedLevel === level.id && (
                      <div className="w-5 h-5 rounded-full bg-orange-600 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-2xl font-bold text-stone-900 mt-3">${level.price_usd.toLocaleString()}</p>
                  <p className="text-sm text-stone-500 mt-1">{level.description}</p>
                  <p className="text-xs text-orange-600 mt-2 font-medium">SWAG: {level.swag}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      </div>

      {/* Confirm */}
      <div className="flex justify-center">
        <Button
          onClick={handleSelect}
          disabled={loading || !selectedChallenge || !selectedLevel}
          className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium px-10 py-6 h-auto text-base transition-all hover:scale-[1.02] disabled:opacity-50"
          data-testid="challenge-confirm-btn"
        >
          {loading ? 'Setting up...' : 'Start Challenge'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
