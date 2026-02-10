import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import api from '../lib/api';
import { User, Save } from 'lucide-react';

const COUNTRIES = ['US', 'UK', 'KE', 'CA', 'AU', 'DE', 'FR', 'IN', 'NG', 'ZA', 'Other'];

export default function ProfilePage() {
  const { user, fetchUser } = useAuth();
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    display_name: user?.display_name || '',
    country: user?.country || 'US',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/profile', form);
      await fetchUser();
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-app py-8 md:py-12" data-testid="profile-page">
      <h1 className="text-2xl md:text-3xl font-bold text-stone-900 mb-8">Your Profile</h1>

      <div className="max-w-lg">
        <Card className="bg-white rounded-2xl border border-stone-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center">
                <User className="w-7 h-7 text-orange-700" />
              </div>
              <div>
                <CardTitle className="text-lg">{user?.display_name || user?.first_name}</CardTitle>
                <p className="text-sm text-stone-400">{user?.email}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <Label className="text-stone-700 text-sm font-medium">First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm(f => ({...f, first_name: e.target.value}))}
                  className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white h-12"
                  data-testid="profile-first-name-input"
                />
              </div>
              <div>
                <Label className="text-stone-700 text-sm font-medium">Display Name</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) => setForm(f => ({...f, display_name: e.target.value}))}
                  className="mt-1 rounded-xl border-stone-200 bg-stone-50 focus:bg-white h-12"
                  data-testid="profile-display-name-input"
                />
              </div>
              <div>
                <Label className="text-stone-700 text-sm font-medium">Country</Label>
                <Select value={form.country} onValueChange={(v) => setForm(f => ({...f, country: v}))}>
                  <SelectTrigger className="mt-1 rounded-xl border-stone-200 bg-stone-50 h-12" data-testid="profile-country-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="pt-2">
                <p className="text-xs text-stone-400 mb-1">Email</p>
                <p className="text-sm text-stone-600">{user?.email}</p>
                <p className="text-xs text-stone-400 mt-2">Role: <span className="capitalize">{user?.role}</span></p>
              </div>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full bg-orange-600 hover:bg-orange-700 text-white font-medium px-8 py-5 h-auto"
                data-testid="profile-save-btn"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
