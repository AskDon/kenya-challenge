import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import api from '../lib/api';
import { toast } from 'sonner';
import { BarChart3, Mountain, DollarSign, Users, Settings, Plus, Pencil, Trash2, Building2, Award, Footprints } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [challenges, setChallenges] = useState([]);
  const [walkerTypes, setWalkerTypes] = useState([]);
  const [achievementLevels, setAchievementLevels] = useState([]);
  const [users, setUsers] = useState([]);
  const [corpSponsors, setCorpSponsors] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/challenges'),
      api.get('/walker-types'),
      api.get('/achievement-levels'),
      api.get('/admin/users'),
      api.get('/admin/config'),
      api.get('/corporate-sponsors').catch(() => ({ data: [] })),
    ]).then(([s, c, wt, al, u, cfg, cs]) => {
      setStats(s.data);
      setChallenges(c.data);
      setWalkerTypes(wt.data);
      setAchievementLevels(al.data);
      setUsers(u.data);
      setConfig(cfg.data);
      setCorpSponsors(cs.data);
    }).catch(() => toast.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container-app py-8 md:py-12" data-testid="admin-page">
      <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-8">Admin Console</h1>

      <Tabs defaultValue="stats">
        <TabsList className="flex flex-wrap bg-stone-100 rounded-xl p-1 mb-6 gap-1">
          <TabsTrigger value="stats" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-stats"><BarChart3 className="w-3 h-3 mr-1" /> Stats</TabsTrigger>
          <TabsTrigger value="challenges" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-challenges"><Mountain className="w-3 h-3 mr-1" /> Challenges</TabsTrigger>
          <TabsTrigger value="walker-types" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-walker-types"><Footprints className="w-3 h-3 mr-1" /> Walker Types</TabsTrigger>
          <TabsTrigger value="achievements" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-achievements"><Award className="w-3 h-3 mr-1" /> Achievements</TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-users"><Users className="w-3 h-3 mr-1" /> Users</TabsTrigger>
          <TabsTrigger value="corporate" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-corporate"><Building2 className="w-3 h-3 mr-1" /> Corporate</TabsTrigger>
          <TabsTrigger value="config" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-config"><Settings className="w-3 h-3 mr-1" /> Config</TabsTrigger>
        </TabsList>

        {/* Stats */}
        <TabsContent value="stats">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Walkers', value: stats?.total_users, icon: Users },
              { label: 'Total Teams', value: stats?.total_teams, icon: Users },
              { label: 'Total Distance', value: `${stats?.total_distance_km} km`, icon: Mountain },
              { label: 'Total Steps', value: stats?.total_steps?.toLocaleString(), icon: Footprints },
              { label: 'Total Pledged', value: `$${stats?.total_pledged}`, icon: DollarSign },
              { label: 'Corporate Sponsors', value: stats?.total_corporate_sponsors, icon: Building2 },
            ].map(s => (
              <Card key={s.label} className="bg-white rounded-2xl border border-stone-100">
                <CardContent className="p-5">
                  <s.icon className="w-5 h-5 text-orange-600 mb-2" />
                  <p className="text-2xl font-bold text-stone-900">{s.value}</p>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-0.5">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Challenges */}
        <TabsContent value="challenges">
          <ChallengesAdmin challenges={challenges} onRefresh={loadAll} />
        </TabsContent>

        {/* Walker Types */}
        <TabsContent value="walker-types">
          <WalkerTypesAdmin walkerTypes={walkerTypes} onRefresh={loadAll} />
        </TabsContent>

        {/* Achievement Levels */}
        <TabsContent value="achievements">
          <AchievementLevelsAdmin levels={achievementLevels} onRefresh={loadAll} />
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card className="bg-white rounded-2xl border border-stone-100">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">All Users ({users.length})</h3>
              <div className="space-y-2">
                {users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`admin-user-${u.id}`}>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{u.display_name || u.first_name}</p>
                      <p className="text-xs text-stone-400">{u.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`rounded-full text-xs ${u.role === 'admin' ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-600'}`}>{u.role}</Badge>
                      {u.paid && <Badge className="rounded-full text-xs bg-emerald-100 text-emerald-700">paid</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Corporate */}
        <TabsContent value="corporate">
          <Card className="bg-white rounded-2xl border border-stone-100">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Corporate Sponsors ({corpSponsors.length})</h3>
              {corpSponsors.length === 0 ? (
                <p className="text-stone-400 text-center py-6">No corporate sponsors yet</p>
              ) : (
                <div className="space-y-2">
                  {corpSponsors.map(cs => (
                    <div key={cs.id} className="p-3 rounded-xl bg-stone-50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-stone-900">{cs.company_name}</p>
                        <Badge className="rounded-full text-xs bg-stone-100 text-stone-600">{cs.package}</Badge>
                      </div>
                      <p className="text-xs text-stone-400">{cs.contact_name} &middot; {cs.email}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config */}
        <TabsContent value="config">
          <ConfigAdmin config={config} onRefresh={loadAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChallengesAdmin({ challenges, onRefresh }) {
  const [form, setForm] = useState({ name: '', description: '', total_distance_km: '', milestones: [] });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [milestoneStr, setMilestoneStr] = useState('');

  const openCreate = () => {
    setForm({ name: '', description: '', total_distance_km: '', milestones: [] });
    setMilestoneStr('');
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (ch) => {
    setForm({ name: ch.name, description: ch.description, total_distance_km: String(ch.total_distance_km), milestones: ch.milestones || [] });
    setMilestoneStr(ch.milestones?.map(m => `${m.distance_km}:${m.title}:${m.description}`).join('\n') || '');
    setEditing(ch.id);
    setOpen(true);
  };

  const parseMilestones = (str) => {
    return str.split('\n').filter(l => l.trim()).map(l => {
      const parts = l.split(':');
      return { distance_km: parseFloat(parts[0]) || 0, title: parts[1]?.trim() || '', description: parts[2]?.trim() || '' };
    });
  };

  const handleSave = async () => {
    const payload = {
      name: form.name,
      description: form.description,
      total_distance_km: parseFloat(form.total_distance_km),
      milestones: parseMilestones(milestoneStr),
    };
    try {
      if (editing) {
        await api.put(`/challenges/${editing}`, payload);
        toast.success('Challenge updated');
      } else {
        await api.post('/challenges', payload);
        toast.success('Challenge created');
      }
      setOpen(false);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this challenge?')) return;
    try {
      await api.delete(`/challenges/${id}`);
      toast.success('Challenge deleted');
      onRefresh();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <Card className="bg-white rounded-2xl border border-stone-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-900">Challenges ({challenges.length})</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-add-challenge-btn">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Challenge' : 'New Challenge'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-challenge-name" />
                </div>
                <div>
                  <Label className="text-sm">Description</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-challenge-desc" />
                </div>
                <div>
                  <Label className="text-sm">Total Distance (km)</Label>
                  <Input type="number" value={form.total_distance_km} onChange={e => setForm(f => ({...f, total_distance_km: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-challenge-distance" />
                </div>
                <div>
                  <Label className="text-sm">Milestones (one per line: distance:title:description)</Label>
                  <Textarea value={milestoneStr} onChange={e => setMilestoneStr(e.target.value)} placeholder="10:Checkpoint 1:First milestone" rows={4} className="mt-1 rounded-xl font-mono text-xs" data-testid="admin-challenge-milestones" />
                </div>
                <Button onClick={handleSave} className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-challenge-save-btn">
                  {editing ? 'Update' : 'Create'} Challenge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {challenges.map(ch => (
            <div key={ch.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`admin-challenge-${ch.id}`}>
              <div>
                <p className="text-sm font-medium text-stone-900">{ch.name}</p>
                <p className="text-xs text-stone-400">{ch.total_distance_km} km &middot; {ch.milestones?.length || 0} milestones</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(ch)} className="rounded-full"><Pencil className="w-4 h-4 text-stone-400" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(ch.id)} className="rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WalkerTypesAdmin({ walkerTypes, onRefresh }) {
  const [form, setForm] = useState({ name: '', cost_usd: '', display_order: '' });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const openCreate = () => { setForm({ name: '', cost_usd: '', display_order: '' }); setEditing(null); setOpen(true); };
  const openEdit = (wt) => { setForm({ name: wt.name, cost_usd: String(wt.cost_usd), display_order: String(wt.display_order) }); setEditing(wt.id); setOpen(true); };

  const handleSave = async () => {
    const payload = { name: form.name, cost_usd: parseFloat(form.cost_usd), display_order: parseInt(form.display_order) || 0 };
    try {
      if (editing) { await api.put(`/walker-types/${editing}`, payload); toast.success('Updated'); }
      else { await api.post('/walker-types', payload); toast.success('Created'); }
      setOpen(false); onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await api.delete(`/walker-types/${id}`); toast.success('Deleted'); onRefresh(); }
    catch { toast.error('Failed'); }
  };

  return (
    <Card className="bg-white rounded-2xl border border-stone-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Walker Types ({walkerTypes.length})</h3>
            <p className="text-xs text-stone-400 mt-0.5">Registration fee levels for walkers</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-add-walker-type-btn">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit Walker Type' : 'New Walker Type'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-sm">Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-wt-name" /></div>
                <div><Label className="text-sm">Cost (USD)</Label><Input type="number" value={form.cost_usd} onChange={e => setForm(f => ({...f, cost_usd: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-wt-cost" /></div>
                <div><Label className="text-sm">Display Order</Label><Input type="number" value={form.display_order} onChange={e => setForm(f => ({...f, display_order: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-wt-order" /></div>
                <Button onClick={handleSave} className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-wt-save-btn">{editing ? 'Update' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {walkerTypes.map(wt => (
            <div key={wt.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`admin-wt-${wt.id}`}>
              <div>
                <p className="text-sm font-medium text-stone-900">{wt.name} - ${wt.cost_usd}</p>
                <p className="text-xs text-stone-400">Order: {wt.display_order}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(wt)} className="rounded-full"><Pencil className="w-4 h-4 text-stone-400" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(wt.id)} className="rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AchievementLevelsAdmin({ levels, onRefresh }) {
  const [form, setForm] = useState({ total_amount_usd: '', achievement: '', swag: '', display_order: '' });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);

  const openCreate = () => { setForm({ total_amount_usd: '', achievement: '', swag: '', display_order: '' }); setEditing(null); setOpen(true); };
  const openEdit = (al) => { setForm({ total_amount_usd: String(al.total_amount_usd), achievement: al.achievement, swag: al.swag, display_order: String(al.display_order) }); setEditing(al.id); setOpen(true); };

  const handleSave = async () => {
    const payload = { total_amount_usd: parseFloat(form.total_amount_usd), achievement: form.achievement, swag: form.swag, display_order: parseInt(form.display_order) || 0 };
    try {
      if (editing) { await api.put(`/achievement-levels/${editing}`, payload); toast.success('Updated'); }
      else { await api.post('/achievement-levels', payload); toast.success('Created'); }
      setOpen(false); onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete?')) return;
    try { await api.delete(`/achievement-levels/${id}`); toast.success('Deleted'); onRefresh(); }
    catch { toast.error('Failed'); }
  };

  return (
    <Card className="bg-white rounded-2xl border border-stone-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Achievement Levels ({levels.length})</h3>
            <p className="text-xs text-stone-400 mt-0.5">Based on total amount raised (walker fee + teammates + supporters)</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-add-achievement-btn">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit Achievement Level' : 'New Achievement Level'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-sm">Total Amount (USD)</Label><Input type="number" value={form.total_amount_usd} onChange={e => setForm(f => ({...f, total_amount_usd: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-al-amount" /></div>
                <div><Label className="text-sm">Achievement</Label><Input value={form.achievement} onChange={e => setForm(f => ({...f, achievement: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-al-achievement" /></div>
                <div><Label className="text-sm">Thank You Swag</Label><Input value={form.swag} onChange={e => setForm(f => ({...f, swag: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-al-swag" /></div>
                <div><Label className="text-sm">Display Order</Label><Input type="number" value={form.display_order} onChange={e => setForm(f => ({...f, display_order: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-al-order" /></div>
                <Button onClick={handleSave} className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-al-save-btn">{editing ? 'Update' : 'Create'}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-2">
          {levels.map(al => (
            <div key={al.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`admin-al-${al.id}`}>
              <div>
                <p className="text-sm font-medium text-stone-900">${al.total_amount_usd.toLocaleString()} - {al.achievement}</p>
                <p className="text-xs text-stone-400">Swag: {al.swag}</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(al)} className="rounded-full"><Pencil className="w-4 h-4 text-stone-400" /></Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(al.id)} className="rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ConfigAdmin({ config, onRefresh }) {
  const [form, setForm] = useState({ name: config.name || '', logo_url: config.logo_url || '', primary_color: config.primary_color || '', secondary_color: config.secondary_color || '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/config', form);
      toast.success('Config updated');
      onRefresh();
    } catch { toast.error('Failed to update config'); }
    finally { setSaving(false); }
  };

  return (
    <Card className="bg-white rounded-2xl border border-stone-100 max-w-lg">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-4">App Configuration</h3>
        <div className="space-y-3">
          <div><Label className="text-sm">App Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-config-name" /></div>
          <div><Label className="text-sm">Logo URL</Label><Input value={form.logo_url} onChange={e => setForm(f => ({...f, logo_url: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-config-logo" /></div>
          <div><Label className="text-sm">Primary Color</Label><Input value={form.primary_color} onChange={e => setForm(f => ({...f, primary_color: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-config-primary" /></div>
          <div><Label className="text-sm">Secondary Color</Label><Input value={form.secondary_color} onChange={e => setForm(f => ({...f, secondary_color: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-config-secondary" /></div>
          <Button onClick={handleSave} disabled={saving} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-config-save-btn">
            {saving ? 'Saving...' : 'Save Config'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
