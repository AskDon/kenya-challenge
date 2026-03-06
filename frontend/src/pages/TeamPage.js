import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import api from '../lib/api';
import { toast } from 'sonner';
import { Users, MapPin, Heart, Copy, Plus, Footprints, Crown, Trash2, UserPlus, X, Send, Mountain, Percent } from 'lucide-react';

function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Link copied!');
    }).catch(() => fallbackCopy(text));
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
    toast.error('Copy manually: ' + text);
  }
  document.body.removeChild(textarea);
}

export default function TeamPage() {
  const { user, fetchUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newInvites, setNewInvites] = useState([{ name: '', email: '' }]);
  const [sendingInvites, setSendingInvites] = useState(false);
  const [removingMember, setRemovingMember] = useState(null);

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
      copyToClipboard(url);
    }
  };

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this team?')) return;
    try {
      await api.post('/teams/leave');
      await fetchUser();
      setTeam(null);
      toast.success('Left team');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to leave team');
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from the team?`)) return;
    setRemovingMember(memberId);
    try {
      await api.delete(`/teams/members/${memberId}`);
      toast.success(`${memberName} has been removed from the team`);
      loadTeam();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove member');
    } finally {
      setRemovingMember(null);
    }
  };

  const handleSendInvites = async () => {
    const valid = newInvites.filter(i => i.name.trim() && i.email.trim());
    if (valid.length === 0) {
      toast.error('Please add at least one name and email');
      return;
    }
    setSendingInvites(true);
    try {
      for (const inv of valid) {
        await api.post('/supporter-invites', { name: inv.name, email: inv.email });
      }
      toast.success(`${valid.length} invite${valid.length > 1 ? 's' : ''} sent!`);
      setNewInvites([{ name: '', email: '' }]);
      setShowInviteForm(false);
    } catch (err) {
      toast.error('Failed to send invites');
    } finally {
      setSendingInvites(false);
    }
  };

  const isLeader = team && user && team.creator_id === user.id;

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
          {/* Team Header with Leader */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-xl font-bold text-stone-900">{team.name}</h2>
                    {isLeader && (
                      <Badge className="bg-amber-100 text-amber-700 rounded-full text-xs">
                        <Crown className="w-3 h-3 mr-1" /> Team Leader
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-stone-500">{team.description}</p>
                  {team.leader && (
                    <p className="text-xs text-stone-400 mt-2">
                      Led by <span className="font-medium text-stone-600">{team.leader.display_name || team.leader.full_name}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {isLeader && (
                    <Button
                      onClick={() => setShowInviteForm(!showInviteForm)}
                      variant="outline"
                      className="rounded-full border-orange-200 text-orange-600 hover:bg-orange-50"
                      data-testid="team-invite-members-btn"
                    >
                      <UserPlus className="w-4 h-4 mr-2" /> Invite Members
                    </Button>
                  )}
                  <Button onClick={copyInvite} variant="outline" className="rounded-full border-stone-200 text-stone-700" data-testid="team-copy-invite-btn">
                    <Copy className="w-4 h-4 mr-2" /> Copy Invite Link
                  </Button>
                  <Button onClick={handleLeave} variant="outline" className="rounded-full border-stone-200 text-red-600 hover:text-red-700 hover:border-red-200" data-testid="team-leave-btn">
                    Leave Team
                  </Button>
                </div>
              </div>

              {/* Invite Form */}
              {showInviteForm && isLeader && (
                <div className="mt-6 pt-6 border-t border-stone-100">
                  <h3 className="text-sm font-bold text-stone-900 mb-3">Invite New Team Members</h3>
                  <div className="space-y-2 mb-4">
                    {newInvites.map((inv, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <Input
                          value={inv.name}
                          onChange={(e) => {
                            const copy = [...newInvites];
                            copy[i].name = e.target.value;
                            setNewInvites(copy);
                          }}
                          placeholder="Name"
                          className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1"
                          data-testid={`team-invite-name-${i}`}
                        />
                        <Input
                          type="email"
                          value={inv.email}
                          onChange={(e) => {
                            const copy = [...newInvites];
                            copy[i].email = e.target.value;
                            setNewInvites(copy);
                          }}
                          placeholder="Email"
                          className="rounded-xl border-stone-200 bg-stone-50 h-10 flex-1"
                          data-testid={`team-invite-email-${i}`}
                        />
                        {newInvites.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setNewInvites(newInvites.filter((_, j) => j !== i))}
                            className="text-stone-300 hover:text-red-500 shrink-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setNewInvites([...newInvites, { name: '', email: '' }])}
                      className="rounded-xl border-stone-200 text-stone-600"
                      data-testid="team-add-invite-row"
                    >
                      <Plus className="w-4 h-4 mr-1" /> Add More
                    </Button>
                    <Button
                      onClick={handleSendInvites}
                      disabled={sendingInvites}
                      className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white"
                      data-testid="team-send-invites"
                    >
                      <Send className="w-4 h-4 mr-1" /> {sendingInvites ? 'Sending...' : 'Send Invites'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
                  <Percent className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-stone-900">{team.avg_progress_pct || 0}%</p>
                <p className="text-xs text-stone-400 uppercase tracking-wider font-medium mt-0.5">Avg Completion</p>
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

          {/* Members Table */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">Team Members</h3>
              <div className="space-y-3">
                {team.members?.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-4 rounded-xl bg-stone-50" data-testid={`team-member-${member.id}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center relative">
                        <span className="text-sm font-bold text-orange-700">{member.display_name?.[0] || member.full_name?.[0]}</span>
                        {member.is_leader && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center border-2 border-white">
                            <Crown className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-stone-900">{member.display_name || member.full_name}</p>
                          {member.is_leader && (
                            <Badge className="bg-amber-100 text-amber-700 text-[10px] rounded-full">Leader</Badge>
                          )}
                        </div>
                        {member.challenge && (
                          <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                            <Mountain className="w-3 h-3" /> {member.challenge.name}
                          </p>
                        )}
                        <div className="mt-2 max-w-xs">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-stone-500">{member.total_km} km</span>
                            <span className="font-medium text-stone-700">{member.progress_pct}%</span>
                          </div>
                          <Progress value={member.progress_pct} className="h-1.5" />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600">${member.total_raised}</p>
                        <p className="text-xs text-stone-400">raised</p>
                      </div>
                      {isLeader && !member.is_leader && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveMember(member.id, member.display_name || member.full_name)}
                          disabled={removingMember === member.id}
                          className="text-stone-300 hover:text-red-500 hover:bg-red-50"
                          data-testid={`remove-member-${member.id}`}
                        >
                          {removingMember === member.id ? (
                            <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      )}
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
