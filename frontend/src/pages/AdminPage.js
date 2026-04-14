import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import api from '../lib/api';
import { toast } from 'sonner';
import { BarChart3, Mountain, DollarSign, Users, Settings, Plus, Pencil, Trash2, Building2, Award, Footprints, Upload, X, Image, Mail, Phone, CheckCircle, Clock, XCircle, MapPin, ChevronUp, ChevronDown } from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [challengeStats, setChallengeStats] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [walkerTypes, setWalkerTypes] = useState([]);
  const [achievementLevels, setAchievementLevels] = useState([]);
  const [users, setUsers] = useState([]);
  const [corpSponsors, setCorpSponsors] = useState([]);
  const [sponsorshipLevels, setSponsorshipLevels] = useState([]);
  const [sponsorInquiries, setSponsorInquiries] = useState([]);
  const [config, setConfig] = useState({});
  const [loading, setLoading] = useState(true);

  const loadAll = () => {
    Promise.all([
      api.get('/admin/stats'),
      api.get('/challenges/all'),
      api.get('/walker-types'),
      api.get('/achievement-levels'),
      api.get('/admin/users'),
      api.get('/admin/config'),
      api.get('/corporate-sponsors').catch(() => ({ data: [] })),
      api.get('/sponsorship-levels').catch(() => ({ data: [] })),
      api.get('/sponsor-inquiries').catch(() => ({ data: [] })),
      api.get('/admin/stats/by-challenge').catch(() => ({ data: [] })),
    ]).then(([s, c, wt, al, u, cfg, cs, sl, si, chs]) => {
      setStats(s.data);
      setChallenges(c.data);
      setWalkerTypes(wt.data);
      setAchievementLevels(al.data);
      setUsers(u.data);
      setConfig(cfg.data);
      setCorpSponsors(cs.data);
      setSponsorshipLevels(sl.data);
      setSponsorInquiries(si.data);
      setChallengeStats(chs.data);
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
          <TabsTrigger value="walker-types" className="rounded-lg text-xs sm:text-sm" data-testid="admin-tab-walker-types"><Footprints className="w-3 h-3 mr-1" /> Registration Levels</TabsTrigger>
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

          {/* Stats by Challenge */}
          {challengeStats.length > 0 && (
            <Card className="bg-white rounded-2xl border border-stone-100 mt-6" data-testid="admin-stats-by-challenge">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-4">Stats by Challenge</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-stone-100">
                        <th className="text-left py-2 px-3 text-xs text-stone-400 font-medium uppercase">Challenge</th>
                        <th className="text-left py-2 px-3 text-xs text-stone-400 font-medium uppercase">Status</th>
                        <th className="text-right py-2 px-3 text-xs text-stone-400 font-medium uppercase">Walkers</th>
                        <th className="text-right py-2 px-3 text-xs text-stone-400 font-medium uppercase">Teams</th>
                        <th className="text-right py-2 px-3 text-xs text-stone-400 font-medium uppercase">Pledged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {challengeStats.map(cs => (
                        <tr key={cs.challenge_id} className="border-b border-stone-50">
                          <td className="py-2.5 px-3 font-medium text-stone-900">{cs.challenge_name}</td>
                          <td className="py-2.5 px-3">
                            <Badge className={`rounded-full text-xs ${cs.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-stone-100 text-stone-400'}`}>
                              {cs.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-right text-stone-600">{cs.walkers}</td>
                          <td className="py-2.5 px-3 text-right text-stone-600">{cs.teams}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-stone-900">${cs.pledged}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
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
          <UsersAdmin users={users} onRefresh={loadAll} />
        </TabsContent>

        {/* Corporate */}
        <TabsContent value="corporate">
          <CorporateSponsorsAdmin 
            levels={sponsorshipLevels} 
            sponsors={corpSponsors} 
            onRefresh={loadAll} 
          />
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
  const [form, setForm] = useState({ name: '', description: '', total_distance_km: '', milestones: [], is_active: true, send_postcards: false });
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(false);
  const [milestoneStr, setMilestoneStr] = useState('');
  const [uploadingMap, setUploadingMap] = useState(null);
  const [uploadingMilestonePhoto, setUploadingMilestonePhoto] = useState(null);
  const mapInputRef = useRef(null);
  // Postcard state
  const [postcardOpen, setPostcardOpen] = useState(false);
  const [postcardChallengeId, setPostcardChallengeId] = useState(null);
  const [postcardForm, setPostcardForm] = useState({ title: '', distance_km: '', subject_line: '', body: '' });
  const [editingPostcard, setEditingPostcard] = useState(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(null);

  const openCreate = () => {
    setForm({ name: '', description: '', total_distance_km: '', milestones: [], is_active: true, send_postcards: false });
    setMilestoneStr('');
    setEditing(null);
    setOpen(true);
  };

  const openEdit = (ch) => {
    setForm({ 
      name: ch.name, 
      description: ch.description, 
      total_distance_km: String(ch.total_distance_km), 
      milestones: ch.milestones || [],
      is_active: ch.is_active !== false,
      route_map_url: ch.route_map_url || null,
      send_postcards: ch.send_postcards || false
    });
    setMilestoneStr(ch.milestones?.map(m => `${m.distance_km}:${m.title}:${m.description || ''}`).join('\n') || '');
    setEditing(ch.id);
    setOpen(true);
  };

  const parseMilestones = (str) => {
    return str.split('\n').filter(l => l.trim()).map(l => {
      const parts = l.split(':');
      return { distance_km: parseFloat(parts[0]) || 0, title: parts[1]?.trim() || '', description: parts.slice(2).join(':').trim() || '' };
    });
  };

  const handleSave = async () => {
    if (form.description.length < 50) {
      toast.error('Description must be at least 50 characters');
      return;
    }
    if (form.description.length > 2000) {
      toast.error('Description must be at most 2000 characters');
      return;
    }
    const payload = {
      name: form.name,
      description: form.description,
      total_distance_km: parseFloat(form.total_distance_km),
      milestones: parseMilestones(milestoneStr),
      is_active: form.is_active,
      send_postcards: form.send_postcards,
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

  const handleToggleActive = async (ch) => {
    try {
      await api.put(`/challenges/${ch.id}`, { is_active: !ch.is_active });
      toast.success(ch.is_active ? 'Challenge deactivated' : 'Challenge activated');
      onRefresh();
    } catch { toast.error('Failed to update'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this challenge?')) return;
    try {
      await api.delete(`/challenges/${id}`);
      toast.success('Challenge deleted');
      onRefresh();
    } catch { toast.error('Failed to delete'); }
  };

  const handleMove = async (index, direction) => {
    const sorted = [...challenges];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;
    [sorted[index], sorted[targetIndex]] = [sorted[targetIndex], sorted[index]];
    const ordered_ids = sorted.map(c => c.id);
    try {
      await api.post('/challenges/reorder', { ordered_ids });
      onRefresh();
    } catch { toast.error('Failed to reorder'); }
  };

  // Postcard handlers
  const openAddPostcard = (challengeId) => {
    setPostcardChallengeId(challengeId);
    setPostcardForm({ title: '', distance_km: '', subject_line: '', body: '' });
    setEditingPostcard(null);
    setPostcardOpen(true);
  };
  const openEditPostcard = (challengeId, pc) => {
    setPostcardChallengeId(challengeId);
    setPostcardForm({ title: pc.title, distance_km: String(pc.distance_km), subject_line: pc.subject_line, body: pc.body });
    setEditingPostcard(pc.id);
    setPostcardOpen(true);
  };
  const handleSavePostcard = async () => {
    const payload = { title: postcardForm.title, distance_km: parseFloat(postcardForm.distance_km) || 0, subject_line: postcardForm.subject_line, body: postcardForm.body };
    try {
      if (editingPostcard) {
        await api.put(`/challenges/${postcardChallengeId}/postcards/${editingPostcard}`, payload);
        toast.success('Postcard updated');
      } else {
        await api.post(`/challenges/${postcardChallengeId}/postcards`, payload);
        toast.success('Postcard added');
      }
      setPostcardOpen(false);
      onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to save postcard'); }
  };
  const handleDeletePostcard = async (challengeId, postcardId) => {
    if (!window.confirm('Delete this postcard?')) return;
    try {
      await api.delete(`/challenges/${challengeId}/postcards/${postcardId}`);
      toast.success('Postcard deleted');
      onRefresh();
    } catch { toast.error('Failed to delete postcard'); }
  };
  const handleTogglePostcards = async (ch) => {
    try {
      await api.put(`/challenges/${ch.id}`, { send_postcards: !ch.send_postcards });
      onRefresh();
    } catch { toast.error('Failed to update'); }
  };
  const handleUploadAttachment = async (challengeId, postcardId, file) => {
    setUploadingAttachment(postcardId);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/challenges/${challengeId}/postcards/${postcardId}/attachment`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Attachment uploaded');
      onRefresh();
    } catch { toast.error('Failed to upload attachment'); }
    finally { setUploadingAttachment(null); }
  };

  const handleUploadMap = async (challengeId, file) => {
    setUploadingMap(challengeId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/challenges/${challengeId}/route-map`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Route map uploaded');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload map');
    } finally {
      setUploadingMap(null);
    }
  };

  const handleUploadMilestonePhoto = async (challengeId, milestoneIndex, file) => {
    setUploadingMilestonePhoto(`${challengeId}-${milestoneIndex}`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/challenges/${challengeId}/milestones/${milestoneIndex}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Photo uploaded');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload photo');
    } finally {
      setUploadingMilestonePhoto(null);
    }
  };

  const activeCount = challenges.filter(c => c.is_active !== false).length;

  return (
    <Card className="bg-white rounded-2xl border border-stone-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Challenges ({challenges.length})</h3>
            <p className="text-xs text-stone-400">{activeCount} active, {challenges.length - activeCount} inactive</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-add-challenge-btn">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit Challenge' : 'New Challenge'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Name (unique)</Label>
                  <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="e.g., Nairobi to Naivasha" className="mt-1 rounded-xl" data-testid="admin-challenge-name" />
                </div>
                <div>
                  <Label className="text-sm">Description (50-2000 characters)</Label>
                  <Textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Describe the journey, what walkers will experience..." rows={4} className="mt-1 rounded-xl" data-testid="admin-challenge-desc" />
                  <p className="text-[10px] text-stone-400 mt-1">{form.description.length}/2000 characters</p>
                </div>
                <div>
                  <Label className="text-sm">Total Distance (km)</Label>
                  <Input type="number" value={form.total_distance_km} onChange={e => setForm(f => ({...f, total_distance_km: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-challenge-distance" />
                </div>
                <div>
                  <Label className="text-sm">Milestones (one per line: distance:title:description)</Label>
                  <Textarea value={milestoneStr} onChange={e => setMilestoneStr(e.target.value)} placeholder="10:Checkpoint 1:A scenic viewpoint with acacia trees\n25:Rest Stop:Local village with fresh water" rows={5} className="mt-1 rounded-xl font-mono text-xs" data-testid="admin-challenge-milestones" />
                  <p className="text-[10px] text-stone-400 mt-1">Format: distance_km:title:what walker sees/smells/hears</p>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                  <div>
                    <p className="text-sm font-medium text-stone-900">Active</p>
                    <p className="text-xs text-stone-400">Show this challenge to walkers</p>
                  </div>
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({...f, is_active: v}))} data-testid="admin-challenge-active" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-stone-50">
                  <div>
                    <p className="text-sm font-medium text-stone-900">Send a Postcard?</p>
                    <p className="text-xs text-stone-400">Enable surprise email postcards at distance milestones</p>
                  </div>
                  <Switch checked={form.send_postcards} onCheckedChange={(v) => setForm(f => ({...f, send_postcards: v}))} data-testid="admin-challenge-postcards-toggle" />
                </div>
                <Button onClick={handleSave} className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-challenge-save-btn">
                  {editing ? 'Update' : 'Create'} Challenge
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="space-y-3">
          {challenges.map((ch, idx) => (
            <div key={ch.id} className={`rounded-xl ${ch.is_active !== false ? 'bg-stone-50' : 'bg-stone-100 opacity-60'}`} data-testid={`admin-challenge-${ch.id}`}>
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" disabled={idx === 0} onClick={() => handleMove(idx, -1)} data-testid={`challenge-move-up-${ch.id}`}>
                      <ChevronUp className="w-4 h-4 text-stone-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" disabled={idx === challenges.length - 1} onClick={() => handleMove(idx, 1)} data-testid={`challenge-move-down-${ch.id}`}>
                      <ChevronDown className="w-4 h-4 text-stone-500" />
                    </Button>
                  </div>
                  <Switch 
                    checked={ch.is_active !== false} 
                    onCheckedChange={() => handleToggleActive(ch)}
                    data-testid={`toggle-challenge-${ch.id}`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-900">{ch.name}</p>
                      {ch.is_active === false && <Badge className="bg-stone-200 text-stone-500 text-[10px] rounded-full">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-stone-400">{ch.total_distance_km} km &middot; {ch.milestones?.length || 0} milestones &middot; Order: {ch.display_order || idx + 1}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(ch)} className="rounded-full"><Pencil className="w-4 h-4 text-stone-400" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(ch.id)} className="rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></Button>
                </div>
              </div>
              {/* Route Map + Milestone Photos */}
              <div className="px-3 pb-3 space-y-2">
                {/* Route Map */}
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white border border-stone-100">
                  <div className="shrink-0">
                    {ch.route_map_url ? (
                      <img src={ch.route_map_url} alt="Route map" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-stone-100 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-stone-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-stone-700">Route Map</p>
                    <p className="text-[10px] text-stone-400">{ch.route_map_url ? 'Uploaded' : 'No map uploaded'}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                      const f = e.target.files?.[0]; if (f) handleUploadMap(ch.id, f);
                    }} />
                    <Badge className="bg-orange-50 text-orange-700 hover:bg-orange-100 cursor-pointer text-[10px] rounded-full">
                      {uploadingMap === ch.id ? 'Uploading...' : ch.route_map_url ? 'Replace' : 'Upload'}
                    </Badge>
                  </label>
                </div>
                {/* Milestone Photos */}
                {ch.milestones?.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider px-1">Milestone Photos</p>
                    {ch.milestones.map((m, mi) => (
                      <div key={mi} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-stone-100">
                        <div className="flex gap-1 shrink-0">
                          {(m.images || []).map((p, pi) => (
                            <img key={pi} src={p} alt="" className="w-8 h-8 rounded object-cover" />
                          ))}
                          {(!m.images || m.images.length === 0) && (
                            <div className="w-8 h-8 rounded bg-stone-100 flex items-center justify-center">
                              <Mountain className="w-3 h-3 text-stone-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-stone-700 truncate">{m.title}</p>
                          <p className="text-[10px] text-stone-400">{m.distance_km}km &middot; {(m.images || []).length} photo(s)</p>
                        </div>
                        <label className="cursor-pointer shrink-0">
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                            const f = e.target.files?.[0]; if (f) handleUploadMilestonePhoto(ch.id, mi, f);
                          }} />
                          <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer text-[10px] rounded-full">
                            {uploadingMilestonePhoto === `${ch.id}-${mi}` ? '...' : '+ Photo'}
                          </Badge>
                        </label>
                      </div>
                    ))}
                  </div>
                )}
                {/* Postcards Section */}
                {ch.send_postcards && (
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center justify-between px-1">
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wider">Postcards ({(ch.postcards || []).length})</p>
                      <button onClick={() => openAddPostcard(ch.id)} className="text-[10px] text-orange-600 hover:text-orange-700 font-medium" data-testid={`add-postcard-${ch.id}`}>+ Add Postcard</button>
                    </div>
                    {(ch.postcards || []).map(pc => (
                      <div key={pc.id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-stone-100">
                        <Mail className="w-4 h-4 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-stone-700 truncate">{pc.title}</p>
                          <p className="text-[10px] text-stone-400">{pc.distance_km}km &middot; {pc.attachment_url ? 'Has attachment' : 'No attachment'}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <label className="cursor-pointer">
                            <input type="file" className="hidden" onChange={(e) => {
                              const f = e.target.files?.[0]; if (f) handleUploadAttachment(ch.id, pc.id, f);
                            }} />
                            <Badge className="bg-stone-100 text-stone-600 hover:bg-stone-200 cursor-pointer text-[10px] rounded-full">
                              {uploadingAttachment === pc.id ? '...' : pc.attachment_url ? 'Replace' : 'Attach'}
                            </Badge>
                          </label>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => openEditPostcard(ch.id, pc)}><Pencil className="w-3 h-3 text-stone-400" /></Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => handleDeletePostcard(ch.id, pc.id)}><Trash2 className="w-3 h-3 text-red-400" /></Button>
                        </div>
                      </div>
                    ))}
                    {(ch.postcards || []).length === 0 && (
                      <p className="text-[10px] text-stone-300 italic px-1">No postcards defined yet</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Postcard Add/Edit Dialog */}
        <Dialog open={postcardOpen} onOpenChange={setPostcardOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editingPostcard ? 'Edit Postcard' : 'Add Postcard'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label className="text-sm">Title</Label><Input value={postcardForm.title} onChange={e => setPostcardForm(f => ({...f, title: e.target.value}))} placeholder="e.g., Halfway There!" className="mt-1 rounded-xl" data-testid="postcard-title" /></div>
              <div><Label className="text-sm">Distance (km)</Label><Input type="number" value={postcardForm.distance_km} onChange={e => setPostcardForm(f => ({...f, distance_km: e.target.value}))} placeholder="e.g., 50" className="mt-1 rounded-xl" data-testid="postcard-distance" /></div>
              <div><Label className="text-sm">Subject Line</Label><Input value={postcardForm.subject_line} onChange={e => setPostcardForm(f => ({...f, subject_line: e.target.value}))} placeholder="Email subject line" className="mt-1 rounded-xl" data-testid="postcard-subject" /></div>
              <div><Label className="text-sm">Body</Label><Textarea value={postcardForm.body} onChange={e => setPostcardForm(f => ({...f, body: e.target.value}))} placeholder="Email body content..." rows={4} className="mt-1 rounded-xl" data-testid="postcard-body" /></div>
              <p className="text-[10px] text-stone-400">Attachment can be uploaded after saving the postcard.</p>
              <Button onClick={handleSavePostcard} className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="postcard-save-btn">{editingPostcard ? 'Update' : 'Add'} Postcard</Button>
            </div>
          </DialogContent>
        </Dialog>
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
    const payload = { name: form.name, cost_usd: parseFloat(form.cost_usd), display_order: Math.max(1, parseInt(form.display_order) || 1) };
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
            <h3 className="text-lg font-bold text-stone-900">Registration Levels ({walkerTypes.length})</h3>
            <p className="text-xs text-stone-400 mt-0.5">Registration fee levels for walkers</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-add-walker-type-btn">
                <Plus className="w-4 h-4 mr-1" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editing ? 'Edit Registration Level' : 'New Registration Level'}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-sm">Name</Label><Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-wt-name" /></div>
                <div><Label className="text-sm">Cost (USD)</Label><Input type="number" value={form.cost_usd} onChange={e => setForm(f => ({...f, cost_usd: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-wt-cost" /></div>
                <div><Label className="text-sm">Display Order</Label><Input type="number" min="1" value={form.display_order} onChange={e => setForm(f => ({...f, display_order: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-wt-order" /></div>
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
    const payload = { total_amount_usd: parseFloat(form.total_amount_usd), achievement: form.achievement, swag: form.swag, display_order: Math.max(1, parseInt(form.display_order) || 1) };
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
                <div><Label className="text-sm">Display Order</Label><Input type="number" min="1" value={form.display_order} onChange={e => setForm(f => ({...f, display_order: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-al-order" /></div>
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
  const [form, setForm] = useState({ name: config.name || '', logo_url: config.logo_url || '', primary_color: config.primary_color || '', secondary_color: config.secondary_color || '', steps_per_km: config.steps_per_km || 1300 });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const stepsVal = parseInt(form.steps_per_km) || 1300;
    if (stepsVal < 1100 || stepsVal > 1600) {
      toast.error('Steps per km must be between 1100 and 1600');
      return;
    }
    setSaving(true);
    try {
      await api.put('/admin/config', { ...form, steps_per_km: stepsVal });
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
          <div>
            <Label className="text-sm">Steps per Kilometer</Label>
            <Input type="number" min={1100} max={1600} value={form.steps_per_km} onChange={e => setForm(f => ({...f, steps_per_km: e.target.value}))} className="mt-1 rounded-xl" data-testid="admin-config-steps-per-km" />
            <p className="text-[10px] text-stone-400 mt-1">Used to convert steps to km when logging activity (min 1100, max 1600)</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-config-save-btn">
            {saving ? 'Saving...' : 'Save Config'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CorporateSponsorsAdmin({ levels, sponsors, onRefresh }) {
  // Sponsorship Levels state
  const [levelForm, setLevelForm] = useState({ name: '', max_sponsors: '', display_order: '' });
  const [editingLevel, setEditingLevel] = useState(null);
  const [levelOpen, setLevelOpen] = useState(false);

  // Sponsors state
  const [sponsorForm, setSponsorForm] = useState({ name: '', level_id: '', website_url: '' });
  const [editingSponsor, setEditingSponsor] = useState(null);
  const [sponsorOpen, setSponsorOpen] = useState(false);
  const [uploading, setUploading] = useState(null);
  const fileInputRef = useRef(null);

  // Level CRUD
  const openCreateLevel = () => { setLevelForm({ name: '', max_sponsors: '', display_order: '' }); setEditingLevel(null); setLevelOpen(true); };
  const openEditLevel = (l) => { setLevelForm({ name: l.name, max_sponsors: String(l.max_sponsors || ''), display_order: String(l.display_order || 0) }); setEditingLevel(l.id); setLevelOpen(true); };

  const handleSaveLevel = async () => {
    const payload = { name: levelForm.name, max_sponsors: levelForm.max_sponsors ? parseInt(levelForm.max_sponsors) : null, display_order: Math.max(1, parseInt(levelForm.display_order) || 1) };
    try {
      if (editingLevel) { await api.put(`/sponsorship-levels/${editingLevel}`, payload); toast.success('Level updated'); }
      else { await api.post('/sponsorship-levels', payload); toast.success('Level created'); }
      setLevelOpen(false); onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleDeleteLevel = async (id) => {
    if (!window.confirm('Delete this sponsorship level?')) return;
    try { await api.delete(`/sponsorship-levels/${id}`); toast.success('Deleted'); onRefresh(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Failed to delete'); }
  };

  // Sponsor CRUD
  const getSponsorCount = (levelId) => sponsors.filter(s => s.level_id === levelId).length;
  const getAvailableLevel = () => {
    for (const l of levels) {
      if (!l.max_sponsors || getSponsorCount(l.id) < l.max_sponsors) return l.id;
    }
    return levels[0]?.id || '';
  };
  const openCreateSponsor = () => { setSponsorForm({ name: '', level_id: getAvailableLevel(), website_url: '' }); setEditingSponsor(null); setSponsorOpen(true); };
  const openEditSponsor = (s) => { setSponsorForm({ name: s.name, level_id: s.level_id, website_url: s.website_url || '' }); setEditingSponsor(s.id); setSponsorOpen(true); };

  const handleSaveSponsor = async () => {
    const payload = { name: sponsorForm.name, level_id: sponsorForm.level_id, website_url: sponsorForm.website_url || null };
    try {
      if (editingSponsor) { await api.put(`/corporate-sponsors/${editingSponsor}`, payload); toast.success('Sponsor updated'); }
      else { await api.post('/corporate-sponsors', payload); toast.success('Sponsor created'); }
      setSponsorOpen(false); onRefresh();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
  };

  const handleDeleteSponsor = async (id) => {
    if (!window.confirm('Delete this sponsor?')) return;
    try { await api.delete(`/corporate-sponsors/${id}`); toast.success('Deleted'); onRefresh(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleUploadLogo = async (sponsorId, file) => {
    setUploading(sponsorId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/corporate-sponsors/${sponsorId}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Logo uploaded');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to upload logo');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteLogo = async (sponsorId) => {
    if (!window.confirm('Remove logo?')) return;
    try {
      await api.delete(`/corporate-sponsors/${sponsorId}/logo`);
      toast.success('Logo removed');
      onRefresh();
    } catch { toast.error('Failed'); }
  };

  const getLevelName = (levelId) => levels.find(l => l.id === levelId)?.name || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Sponsorship Levels */}
      <Card className="bg-white rounded-2xl border border-stone-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900">Sponsorship Levels ({levels.length})</h3>
              <p className="text-xs text-stone-400 mt-0.5">Define sponsorship tiers (e.g., Title, Gold, Silver)</p>
            </div>
            <Dialog open={levelOpen} onOpenChange={setLevelOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateLevel} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-add-sponsor-level-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add Level
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingLevel ? 'Edit Level' : 'New Sponsorship Level'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Level Name</Label>
                    <Input value={levelForm.name} onChange={e => setLevelForm(f => ({...f, name: e.target.value}))} placeholder="e.g., Title Sponsor" className="mt-1 rounded-xl" data-testid="admin-level-name" />
                  </div>
                  <div>
                    <Label className="text-sm">Max Sponsors (leave empty for unlimited)</Label>
                    <Input type="number" value={levelForm.max_sponsors} onChange={e => setLevelForm(f => ({...f, max_sponsors: e.target.value}))} placeholder="e.g., 1" className="mt-1 rounded-xl" data-testid="admin-level-max" />
                  </div>
                  <div>
                    <Label className="text-sm">Display Order</Label>
                    <Input type="number" min="1" value={levelForm.display_order} onChange={e => setLevelForm(f => ({...f, display_order: e.target.value}))} placeholder="1" className="mt-1 rounded-xl" data-testid="admin-level-order" />
                  </div>
                  <Button onClick={handleSaveLevel} className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-level-save-btn">{editingLevel ? 'Update' : 'Create'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-2">
            {levels.length === 0 ? (
              <p className="text-stone-400 text-center py-4">No sponsorship levels yet. Add one to get started.</p>
            ) : (
              levels.map(l => {
                const sponsorCount = sponsors.filter(s => s.level_id === l.id).length;
                return (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`admin-level-${l.id}`}>
                    <div>
                      <p className="text-sm font-medium text-stone-900">{l.name}</p>
                      <p className="text-xs text-stone-400">
                        {sponsorCount} sponsor{sponsorCount !== 1 ? 's' : ''}
                        {l.max_sponsors ? ` / max ${l.max_sponsors}` : ' / unlimited'}
                        {' · Order: '}{l.display_order}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditLevel(l)} className="rounded-full"><Pencil className="w-4 h-4 text-stone-400" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLevel(l.id)} className="rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Corporate Sponsors */}
      <Card className="bg-white rounded-2xl border border-stone-100">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-stone-900">Corporate Sponsors ({sponsors.length})</h3>
              <p className="text-xs text-stone-400 mt-0.5">Manage sponsor names and logos</p>
            </div>
            <Dialog open={sponsorOpen} onOpenChange={setSponsorOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateSponsor} disabled={levels.length === 0} className="rounded-full bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50" data-testid="admin-add-sponsor-btn">
                  <Plus className="w-4 h-4 mr-1" /> Add Sponsor
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'New Sponsor'}</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm">Sponsor Name</Label>
                    <Input value={sponsorForm.name} onChange={e => setSponsorForm(f => ({...f, name: e.target.value}))} placeholder="Company name" className="mt-1 rounded-xl" data-testid="admin-sponsor-name" />
                  </div>
                  <div>
                    <Label className="text-sm">Sponsorship Level</Label>
                    <Select value={sponsorForm.level_id} onValueChange={v => setSponsorForm(f => ({...f, level_id: v}))}>
                      <SelectTrigger className="mt-1 rounded-xl" data-testid="admin-sponsor-level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        {levels.map(l => {
                          const count = getSponsorCount(l.id);
                          const full = l.max_sponsors && count >= l.max_sponsors;
                          return (
                            <SelectItem key={l.id} value={l.id} disabled={full && !editingSponsor}>
                              {l.name} ({count}/{l.max_sponsors || '\u221e'}) {full ? '- FULL' : ''}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm">Website URL (optional)</Label>
                    <Input value={sponsorForm.website_url} onChange={e => setSponsorForm(f => ({...f, website_url: e.target.value}))} placeholder="https://..." className="mt-1 rounded-xl" data-testid="admin-sponsor-website" />
                  </div>
                  <Button onClick={handleSaveSponsor} className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="admin-sponsor-save-btn">{editingSponsor ? 'Update' : 'Create'}</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          {levels.length === 0 ? (
            <p className="text-stone-400 text-center py-4">Create sponsorship levels first before adding sponsors.</p>
          ) : sponsors.length === 0 ? (
            <p className="text-stone-400 text-center py-4">No sponsors yet. Click "Add Sponsor" to get started.</p>
          ) : (
            <div className="space-y-3">
              {sponsors.map(s => (
                <div key={s.id} className="flex items-center gap-4 p-4 rounded-xl bg-stone-50" data-testid={`admin-sponsor-${s.id}`}>
                  {/* Logo */}
                  <div className="w-16 h-16 rounded-xl bg-white border border-stone-200 flex items-center justify-center overflow-hidden shrink-0">
                    {s.logo_url ? (
                      <img src={s.logo_url} alt={s.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <Image className="w-6 h-6 text-stone-300" />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900">{s.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="rounded-full text-xs bg-orange-100 text-orange-700">{getLevelName(s.level_id)}</Badge>
                      {s.website_url && <span className="text-xs text-stone-400 truncate">{s.website_url}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files[0]) handleUploadLogo(s.id, e.target.files[0]);
                          e.target.value = '';
                        }}
                        data-testid={`upload-input-${s.id}`}
                      />
                      <div className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors" data-testid={`upload-logo-${s.id}`}>
                        {uploading === s.id ? (
                          <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4 text-stone-400" />
                        )}
                      </div>
                    </label>
                    {s.logo_url && (
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteLogo(s.id)} className="rounded-full" data-testid={`delete-logo-${s.id}`}>
                        <X className="w-4 h-4 text-stone-400" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => openEditSponsor(s)} className="rounded-full"><Pencil className="w-4 h-4 text-stone-400" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteSponsor(s.id)} className="rounded-full"><Trash2 className="w-4 h-4 text-red-400" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SponsorInquiriesAdmin({ inquiries, onRefresh }) {
  const statusColors = {
    new: 'bg-orange-100 text-orange-700',
    contacted: 'bg-blue-100 text-blue-700',
    confirmed: 'bg-emerald-100 text-emerald-700',
    declined: 'bg-stone-100 text-stone-500',
  };

  const statusIcons = {
    new: Clock,
    contacted: Mail,
    confirmed: CheckCircle,
    declined: XCircle,
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/sponsor-inquiries/${id}/status?status=${status}`);
      toast.success('Status updated');
      onRefresh();
    } catch { toast.error('Failed to update status'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inquiry?')) return;
    try {
      await api.delete(`/sponsor-inquiries/${id}`);
      toast.success('Deleted');
      onRefresh();
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <Card className="bg-white rounded-2xl border border-stone-100">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-stone-900">Sponsor Inquiries ({inquiries.length})</h3>
            <p className="text-xs text-stone-400 mt-0.5">Organizations interested in becoming sponsors</p>
          </div>
        </div>

        {inquiries.length === 0 ? (
          <p className="text-stone-400 text-center py-8">No sponsor inquiries yet. They will appear here when submitted via the landing page.</p>
        ) : (
          <div className="space-y-3">
            {inquiries.map(inq => {
              const StatusIcon = statusIcons[inq.status] || Clock;
              return (
                <div key={inq.id} className="p-4 rounded-xl bg-stone-50" data-testid={`inquiry-${inq.id}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-stone-900">{inq.company_name}</p>
                        <Badge className={`rounded-full text-xs ${statusColors[inq.status] || statusColors.new}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {inq.status}
                        </Badge>
                        {inq.interested_level && (
                          <Badge variant="outline" className="rounded-full text-xs border-stone-200">{inq.interested_level}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-stone-600">{inq.contact_name}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-500">
                        <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {inq.email}</span>
                        {inq.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {inq.phone}</span>}
                      </div>
                      {inq.message && (
                        <p className="text-sm text-stone-600 mt-2 p-2 rounded bg-white border border-stone-100">{inq.message}</p>
                      )}
                      <p className="text-[10px] text-stone-400 mt-2">
                        Submitted: {new Date(inq.created_at).toLocaleDateString()} at {new Date(inq.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Select value={inq.status} onValueChange={(v) => handleUpdateStatus(inq.id, v)}>
                        <SelectTrigger className="w-28 h-8 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="contacted">Contacted</SelectItem>
                          <SelectItem value="confirmed">Confirmed</SelectItem>
                          <SelectItem value="declined">Declined</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(inq.id)} className="text-red-500 hover:text-red-600 h-8">
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


function UsersAdmin({ users, onRefresh }) {
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (userId, displayName) => {
    if (!window.confirm(`Delete user "${displayName}"? This will also remove their activities, pledges, and team data.`)) return;
    setDeleting(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      toast.success('User deleted');
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete user');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card className="bg-white rounded-2xl border border-stone-100">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-stone-900 mb-4">All Users ({users.length})</h3>
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`admin-user-${u.id}`}>
              <div>
                <p className="text-sm font-medium text-stone-900">{u.display_name || u.full_name}</p>
                <p className="text-xs text-stone-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`rounded-full text-xs ${u.role === 'admin' ? 'bg-orange-100 text-orange-700' : u.role === 'supporter' ? 'bg-blue-100 text-blue-700' : 'bg-stone-100 text-stone-600'}`}>{u.role}</Badge>
                {u.paid && <Badge className="rounded-full text-xs bg-emerald-100 text-emerald-700">paid</Badge>}
                {u.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(u.id, u.display_name || u.full_name)}
                    disabled={deleting === u.id}
                    className="text-red-400 hover:text-red-600 h-7 w-7 p-0"
                    data-testid={`admin-delete-user-${u.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
