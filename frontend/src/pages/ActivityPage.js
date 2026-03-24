import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import api from '../lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Footprints, MapPin, Plus, Trash2, Smartphone, RefreshCw, Unlink, CheckCircle } from 'lucide-react';

const ROUTE_BG = 'https://images.unsplash.com/photo-1759767119566-e7dad33d540b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1MDV8MHwxfHNlYXJjaHwyfHxrZW55YSUyMGxhbmRzY2FwZSUyMHJvYWQlMjByZWQlMjBlYXJ0aCUyMG1vdW50JTIwa2VueWF8ZW58MHx8fHwxNzcwNzQ3MzM3fDA&ixlib=rb-4.1.0&q=85';

export default function ActivityPage() {
  const { user, fetchUser } = useAuth();
  const [searchParams] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [progress, setProgress] = useState(null);
  const [date, setDate] = useState(new Date());
  const [steps, setSteps] = useState('');
  const [km, setKm] = useState('');
  const [mode, setMode] = useState('steps');
  const [submitting, setSubmitting] = useState(false);
  
  // Google Fit state
  const [fitnessStatus, setFitnessStatus] = useState({ configured: false });
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadData = () => {
    Promise.all([
      api.get('/activities'), 
      api.get('/users/progress'),
      api.get('/fitness/status').catch(() => ({ data: { configured: false } }))
    ])
      .then(([a, p, f]) => { 
        setActivities(a.data); 
        setProgress(p.data);
        setFitnessStatus(f.data);
      })
      .catch(() => {});
  };

  useEffect(() => { 
    loadData();
    
    // Check for fitness connection callback
    if (searchParams.get('fitness_connected') === 'true') {
      toast.success('Google Fit connected successfully!');
      fetchUser();
    } else if (searchParams.get('fitness_error') === 'true') {
      toast.error('Failed to connect Google Fit');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleConnectGoogleFit = async () => {
    try {
      const res = await api.get('/fitness/connect');
      window.location.href = res.data.authorization_url;
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to connect');
    }
  };

  const handleSyncSteps = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/fitness/sync');
      if (res.data.steps > 0) {
        toast.success(`Synced ${res.data.steps.toLocaleString()} steps from Google Fit!`);
        loadData();
      } else {
        toast.info('No new steps to sync');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to sync steps');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect Google Fit? You can reconnect later.')) return;
    setDisconnecting(true);
    try {
      await api.delete('/fitness/disconnect');
      toast.success('Google Fit disconnected');
      fetchUser();
    } catch (err) {
      toast.error('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'steps' && (!steps || parseInt(steps) <= 0)) {
      toast.error('Enter a valid step count');
      return;
    }
    if (mode === 'km' && (!km || parseFloat(km) <= 0)) {
      toast.error('Enter a valid distance');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        date: format(date, 'yyyy-MM-dd'),
        steps: mode === 'steps' ? parseInt(steps) : null,
        km: mode === 'km' ? parseFloat(km) : null,
      };
      await api.post('/activities', payload);
      toast.success('Activity logged!');
      setSteps('');
      setKm('');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to log activity');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/activities/${id}`);
      toast.success('Activity deleted');
      loadData();
    } catch {
      toast.error('Failed to delete');
    }
  };

  return (
    <div className="container-app py-8 md:py-12" data-testid="activity-page">
      <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-8">Activity Log</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Add Activity + Google Fit + Route Progress */}
        <div className="lg:col-span-1 space-y-6">
          {/* Google Fit Integration */}
          {fitnessStatus.configured && (
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100" data-testid="google-fit-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Smartphone className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">Google Fit</h3>
                    <p className="text-xs text-stone-500">Sync steps from your phone</p>
                  </div>
                </div>
                
                {user?.google_fit_connected ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Connected</span>
                      {user.google_fit_email && (
                        <span className="text-xs text-stone-400">({user.google_fit_email})</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={handleSyncSteps}
                        disabled={syncing}
                        className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                        data-testid="sync-steps-btn"
                      >
                        <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync Steps'}
                      </Button>
                      <Button
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        variant="outline"
                        className="rounded-xl border-stone-200 text-stone-500 h-10"
                        data-testid="disconnect-fit-btn"
                      >
                        <Unlink className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={handleConnectGoogleFit}
                    className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white h-10"
                    data-testid="connect-google-fit-btn"
                  >
                    <Smartphone className="w-4 h-4 mr-2" /> Connect Google Fit
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Add Activity Form */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Log Activity</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-stone-700 text-sm font-medium">Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full mt-1 justify-start text-left font-normal rounded-xl border-stone-200 h-12" data-testid="activity-date-picker">
                        <CalendarIcon className="mr-2 h-4 w-4 text-stone-400" />
                        {format(date, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label className="text-stone-700 text-sm font-medium">Input Mode</Label>
                  <div className="flex gap-2 mt-1">
                    <Button
                      type="button"
                      variant={mode === 'steps' ? 'default' : 'outline'}
                      onClick={() => setMode('steps')}
                      className={`flex-1 rounded-xl ${mode === 'steps' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-stone-200 text-stone-600'}`}
                      data-testid="activity-mode-steps"
                    >
                      <Footprints className="w-4 h-4 mr-1" /> Steps
                    </Button>
                    <Button
                      type="button"
                      variant={mode === 'km' ? 'default' : 'outline'}
                      onClick={() => setMode('km')}
                      className={`flex-1 rounded-xl ${mode === 'km' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'border-stone-200 text-stone-600'}`}
                      data-testid="activity-mode-km"
                    >
                      <MapPin className="w-4 h-4 mr-1" /> Kilometers
                    </Button>
                  </div>
                </div>

                {mode === 'steps' ? (
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Steps</Label>
                    <Input
                      type="number"
                      value={steps}
                      onChange={(e) => setSteps(e.target.value)}
                      placeholder="e.g. 10000"
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white h-12"
                      data-testid="activity-steps-input"
                    />
                  </div>
                ) : (
                  <div>
                    <Label className="text-stone-700 text-sm font-medium">Kilometers</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={km}
                      onChange={(e) => setKm(e.target.value)}
                      placeholder="e.g. 5.5"
                      className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white h-12"
                      data-testid="activity-km-input"
                    />
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto"
                  data-testid="activity-submit-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {submitting ? 'Logging...' : 'Log Activity'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Route Progress Mini */}
          {progress?.challenge && (
            <Card className="rounded-2xl border border-stone-100 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)]" data-testid="route-progress-mini">
              <div className="relative h-32">
                <img src={ROUTE_BG} alt="Route" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-stone-900/60" />
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div>
                    <p className="text-white text-xs uppercase tracking-wider">Your Progress</p>
                    <p className="text-white text-2xl font-bold">{progress.progress_pct}%</p>
                    <p className="text-stone-300 text-xs">{progress.total_km} / {progress.challenge.total_distance_km} km</p>
                  </div>
                </div>
              </div>
              <CardContent className="p-4">
                <Progress value={progress.progress_pct} className="h-2" />
                <p className="text-xs text-stone-500 mt-2">
                  {progress.next_milestone
                    ? `Next: ${progress.next_milestone.title} (${(progress.next_milestone.distance_km - progress.total_km).toFixed(1)} km away)`
                    : 'Route complete!'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Activity History */}
        <div className="lg:col-span-2">
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Activity History</h3>
              {activities.length === 0 ? (
                <div className="text-center py-12">
                  <Footprints className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400">No activities logged yet. Start walking!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((act) => (
                    <div key={act.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition-colors" data-testid={`activity-row-${act.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                          <Footprints className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{act.km} km &middot; {act.steps?.toLocaleString()} steps</p>
                          <p className="text-xs text-stone-400">{act.date}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(act.id)}
                        className="text-stone-300 hover:text-red-500 rounded-full"
                        data-testid={`activity-delete-${act.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
