import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import api from '../lib/api';
import { toast } from 'sonner';
import { Users, MapPin, Heart, Copy, Plus, Footprints } from 'lucide-react';

export default function TeamPage() {
  const { user, fetchUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const loadTeam = () => {
    api.get('/teams/my')
      .then(r => setTeam(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTeam(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Team name required'); return; }
    setCreating(true);
    try {
      await api.post('/teams', form);
      await fetchUser();
      toast.success('Team created!');
      loadTeam();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create team');
    } finally {
      setCreating(false);
    }
  };

  const copyInvite = () => {
    if (team?.invite_code) {
      const url = `${window.location.origin}/teams/join/${team.invite_code}`;
      navigator.clipboard.writeText(url);
      toast.success('Invite link copied!');
    }
  };

  const handleLeave = async () => {
    try {
      await api.post('/teams/leave');
      await fetchUser();
      setTeam(null);
      toast.success('Left team');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to leave team');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container-app py-8 md:py-12" data-testid="team-page">
      <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-8">Your Team</h1>

      {!team ? (
        /* Create Team */
        <div className="max-w-lg mx-auto">
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-orange-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-stone-900 mb-2">Create a Team</h2>
              <p className="text-stone-500 mb-6">Walk together and raise more. Create a team and invite friends to join your challenge.</p>
              <form onSubmit={handleCreate} className="space-y-4 text-left">
                <div>
                  <Label className="text-stone-700 text-sm font-medium">Team Name</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(f => ({...f, name: e.target.value}))}
                    placeholder="e.g. KEF Trailblazers"
                    required
                    className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-12"
                    data-testid="team-name-input"
                  />
                </div>
                <div>
                  <Label className="text-stone-700 text-sm font-medium">Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm(f => ({...f, description: e.target.value}))}
                    placeholder="Tell others about your team..."
                    className="mt-1 rounded-xl border-stone-200 bg-stone-50"
                    data-testid="team-desc-input"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-5 h-auto"
                  data-testid="team-create-btn"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {creating ? 'Creating...' : 'Create Team'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Team Header */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">{team.name}</h2>
                  <p className="text-sm text-stone-500 mt-1">{team.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={copyInvite} variant="outline" className="rounded-full border-stone-200 text-stone-700" data-testid="team-copy-invite-btn">
                    <Copy className="w-4 h-4 mr-2" /> Copy Invite Link
                  </Button>
                  <Button onClick={handleLeave} variant="outline" className="rounded-full border-stone-200 text-red-600 hover:text-red-700 hover:border-red-200" data-testid="team-leave-btn">
                    Leave Team
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-5">
                <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center mb-3">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <p className="text-2xl font-bold text-stone-900">{team.total_km} km</p>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-0.5">Total Distance</p>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                  <Heart className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-2xl font-bold text-stone-900">${team.total_raised}</p>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-0.5">Total Raised</p>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-5">
                <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center mb-3">
                  <Users className="w-4 h-4 text-sky-600" />
                </div>
                <p className="text-2xl font-bold text-stone-900">{team.members?.length || 0}</p>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-0.5">Members</p>
              </CardContent>
            </Card>
          </div>

          {/* Members */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Team Members</h3>
              <div className="space-y-3">
                {team.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`team-member-${member.id}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                        <span className="text-sm font-bold text-orange-700">{member.display_name?.[0] || member.first_name?.[0]}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900">{member.display_name || member.first_name}</p>
                        <p className="text-xs text-stone-400">{member.country}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div>
                        <p className="text-sm font-bold text-stone-900">{member.total_km} km</p>
                        <p className="text-xs text-stone-400">distance</p>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-emerald-600">${member.total_raised}</p>
                        <p className="text-xs text-stone-400">raised</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Invite Code */}
          <Card className="bg-stone-900 rounded-2xl border-none">
            <CardContent className="p-6 text-center">
              <p className="text-stone-400 text-sm mb-2">Share this invite code with friends</p>
              <p className="text-2xl font-bold text-white tracking-widest">{team.invite_code}</p>
              <Button onClick={copyInvite} className="mt-4 rounded-full bg-orange-600 hover:bg-orange-700 text-white" data-testid="team-share-code-btn">
                <Copy className="w-4 h-4 mr-2" /> Copy Full Link
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
