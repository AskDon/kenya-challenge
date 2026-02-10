import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { toast } from 'sonner';
import { Heart, MapPin, Footprints, Users, Mountain, Send } from 'lucide-react';

export default function FundraisingPage() {
  const { userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', amount: '', message: '' });
  const [donating, setDonating] = useState(false);

  const loadData = () => {
    api.get(`/fundraising/${userId}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Page not found'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [userId]);

  const handleDonate = async (e) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    setDonating(true);
    try {
      await api.post(`/sponsors/${userId}`, {
        name: form.name,
        email: form.email,
        amount: parseFloat(form.amount),
        message: form.message,
      });
      toast.success('Thank you for your sponsorship!');
      setForm({ name: '', email: '', amount: '', message: '' });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit');
    } finally {
      setDonating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="container-app py-20 text-center">
      <p className="text-stone-500">Walker not found</p>
    </div>
  );

  const { walker, challenge, total_km, total_steps, total_raised, sponsors, team } = data;
  const progressPct = challenge ? Math.min(100, (total_km / challenge.total_distance_km) * 100) : 0;

  return (
    <div className="min-h-screen bg-stone-50" data-testid="fundraising-page">
      {/* Header */}
      <div className="bg-stone-900 py-12 md:py-16">
        <div className="container-app text-center">
          <div className="w-16 h-16 rounded-full bg-orange-600 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl font-bold text-white">{walker.display_name?.[0] || walker.first_name?.[0]}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
            {walker.display_name || walker.first_name}
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

            {/* Challenge Progress */}
            {challenge && (
              <Card className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <Mountain className="w-5 h-5 text-orange-600" />
                    <h3 className="text-lg font-bold text-stone-900">{challenge.name}</h3>
                  </div>
                  <p className="text-sm text-stone-500 mb-4">{challenge.description}</p>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-stone-600">{total_km} km completed</span>
                    <span className="font-bold text-stone-900">{progressPct.toFixed(1)}%</span>
                  </div>
                  <Progress value={progressPct} className="h-3" />
                  <p className="text-xs text-stone-400 mt-2">
                    {total_km} of {challenge.total_distance_km} km &middot; {(challenge.total_distance_km - total_km).toFixed(1)} km remaining
                  </p>

                  {/* Milestones */}
                  <div className="mt-6 space-y-2">
                    {challenge.milestones?.map((m, i) => {
                      const reached = total_km >= m.distance_km;
                      return (
                        <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${reached ? 'bg-emerald-50' : 'bg-stone-50'}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${reached ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-500'}`}>
                            {reached ? '✓' : i + 1}
                          </div>
                          <div>
                            <p className={`text-sm font-medium ${reached ? 'text-emerald-700' : 'text-stone-600'}`}>{m.title}</p>
                            <p className="text-xs text-stone-400">{m.distance_km} km</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sponsors List */}
            <Card className="bg-white rounded-2xl border border-stone-100">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-4">Sponsors ({sponsors.length})</h3>
                {sponsors.length === 0 ? (
                  <p className="text-stone-400 text-center py-6">No sponsors yet. Be the first!</p>
                ) : (
                  <div className="space-y-3">
                    {sponsors.map((s) => (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`sponsor-${s.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                            <Heart className="w-4 h-4 text-rose-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-stone-900">{s.name}</p>
                            {s.message && <p className="text-xs text-stone-400 italic">"{s.message}"</p>}
                          </div>
                        </div>
                        <p className="text-sm font-bold text-emerald-600">${s.amount}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right: Donate Form */}
          <div>
            <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_4px_20px_-2px_rgba(87,83,78,0.1)] sticky top-24">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-1">Sponsor {walker.display_name || walker.first_name}</h3>
                <p className="text-sm text-stone-500 mb-4">Your donation supports Kenyan students' education.</p>
                <form onSubmit={handleDonate} className="space-y-4">
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Your Name</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
                      placeholder="Full name"
                      required
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-11"
                      data-testid="sponsor-name-input"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({...f, email: e.target.value}))}
                      placeholder="you@example.com"
                      required
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-11"
                      data-testid="sponsor-email-input"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Donation Amount (USD)</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1 mb-2">
                      {[25, 50, 100].map(amt => (
                        <Button
                          key={amt}
                          type="button"
                          variant={form.amount === String(amt) ? 'default' : 'outline'}
                          onClick={() => setForm(f => ({...f, amount: String(amt)}))}
                          className={`rounded-xl ${form.amount === String(amt) ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-stone-200'}`}
                          data-testid={`sponsor-amount-${amt}`}
                        >
                          ${amt}
                        </Button>
                      ))}
                    </div>
                    <Input
                      type="number"
                      value={form.amount}
                      onChange={(e) => setForm(f => ({...f, amount: e.target.value}))}
                      placeholder="Or enter custom amount"
                      className="rounded-xl border-stone-200 bg-stone-50 h-11"
                      data-testid="sponsor-amount-input"
                    />
                  </div>
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Message (optional)</Label>
                    <Textarea
                      value={form.message}
                      onChange={(e) => setForm(f => ({...f, message: e.target.value}))}
                      placeholder="Leave a message of support..."
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50"
                      data-testid="sponsor-message-input"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={donating}
                    className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto"
                    data-testid="sponsor-submit-btn"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {donating ? 'Processing...' : 'Sponsor Now'}
                  </Button>
                  <p className="text-xs text-stone-400 text-center">
                    No real payment is processed in this prototype.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
