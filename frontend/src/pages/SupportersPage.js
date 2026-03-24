import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import api from '../lib/api';
import { toast } from 'sonner';
import { Heart, Copy, UserPlus, X, Send, DollarSign } from 'lucide-react';

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

export default function SupportersPage() {
  const { user } = useAuth();
  const [sponsors, setSponsors] = useState([]);
  const [invites, setInvites] = useState([]);
  const [newInvites, setNewInvites] = useState([{ name: '', email: '' }]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = () => {
    Promise.all([
      api.get(`/sponsors/${user.id}`),
      api.get('/supporter-invites'),
    ]).then(([s, i]) => {
      setSponsors(s.data);
      setInvites(i.data);
    }).catch(() => {})
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, []);

  const handleInvite = async () => {
    const valid = newInvites.filter(i => i.name.trim() && i.email.trim());
    if (valid.length === 0) {
      toast.error('Please add at least one supporter name and email');
      return;
    }
    setSubmitting(true);
    try {
      for (const inv of valid) {
        await api.post('/supporter-invites', { name: inv.name, email: inv.email });
      }
      toast.success(`${valid.length} supporter${valid.length > 1 ? 's' : ''} invited!`);
      setNewInvites([{ name: '', email: '' }]);
      loadData();
    } catch (err) {
      toast.error('Failed to send invites');
    } finally {
      setSubmitting(false);
    }
  };

  const fundraiseUrl = `${window.location.origin}/fundraise/${user?.id}`;
  const totalRaised = sponsors.reduce((sum, s) => sum + (s.amount || 0), 0);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="container-app py-8 md:py-12" data-testid="supporters-page">
      <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-2">Your Supporters</h1>
      <p className="text-stone-500 mb-8">Invite friends and family to support your challenge with pledges.</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Invite + Link */}
        <div className="space-y-6">
          {/* Fundraising Link */}
          <Card className="bg-stone-900 rounded-2xl border-none">
            <CardContent className="p-5">
              <Heart className="w-8 h-8 text-orange-400 mx-auto mb-2" />
              <p className="text-white text-sm font-bold text-center mb-1">Your Fundraising Page</p>
              <p className="text-stone-400 text-xs text-center mb-3">Share this link with supporters</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={fundraiseUrl}
                  className="rounded-xl bg-stone-800 border-stone-700 text-stone-300 text-xs h-10 flex-1"
                  data-testid="supporters-fundraise-link"
                />
                <Button
                  onClick={() => copyToClipboard(fundraiseUrl)}
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                  data-testid="supporters-copy-link-btn"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Invite Form */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-5">
              <h3 className="text-base font-bold text-stone-900 mb-3">Invite Supporters</h3>
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
                      data-testid={`invite-name-${i}`}
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
                      data-testid={`invite-email-${i}`}
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
                  className="rounded-xl border-stone-200 text-stone-600 flex-1"
                  data-testid="add-invite-row-btn"
                >
                  <UserPlus className="w-4 h-4 mr-1" /> Add More
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={submitting}
                  className="rounded-xl bg-orange-600 hover:bg-orange-700 text-white flex-1"
                  data-testid="send-invites-btn"
                >
                  <Send className="w-4 h-4 mr-1" /> {submitting ? 'Sending...' : 'Invite'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-white rounded-2xl border border-stone-100">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-stone-900">{sponsors.length}</p>
                <p className="text-xs text-stone-400">Supporters</p>
              </CardContent>
            </Card>
            <Card className="bg-white rounded-2xl border border-stone-100">
              <CardContent className="p-4 text-center">
                <p className="text-xl font-bold text-emerald-600">${totalRaised}</p>
                <p className="text-xs text-stone-400">Raised</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supporters who donated */}
          <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-stone-900 mb-4">
                Supporters ({sponsors.length})
              </h3>
              {sponsors.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="w-10 h-10 text-stone-200 mx-auto mb-3" />
                  <p className="text-stone-400">No supporters yet. Share your fundraising link!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sponsors.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`supporter-${s.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
                          <Heart className="w-4 h-4 text-rose-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{s.name}</p>
                          {s.message && <p className="text-xs text-stone-400 italic">"{s.message}"</p>}
                        </div>
                      </div>
                      <Badge className="bg-emerald-50 text-emerald-700 rounded-full font-bold">${s.amount}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invited supporters */}
          {invites.length > 0 && (
            <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
              <CardContent className="p-6">
                <h3 className="text-lg font-bold text-stone-900 mb-4">
                  Invited ({invites.length})
                </h3>
                <div className="space-y-2">
                  {invites.map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-stone-50" data-testid={`invited-${inv.id}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-50 flex items-center justify-center">
                          <UserPlus className="w-4 h-4 text-amber-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-900">{inv.name}</p>
                          <p className="text-xs text-stone-400">{inv.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="rounded-full text-xs border-stone-200 text-stone-400">Invited</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
