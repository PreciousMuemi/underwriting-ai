import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useToast } from './ui/Toast';

interface UserProfileApi {
  id: number;
  name: string;
  email: string;
  created_at?: string;
  language_preference?: 'en' | 'sw' | string;
}

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfileApi | null>(null);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState<'en' | 'sw' | string>('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { show } = useToast();

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get<{ user: UserProfileApi }>(`/auth/profile`);
      const u = res.data.user;
      setProfile(u);
      setName(u.name || '');
      setLanguage((u.language_preference as any) || 'en');
    } catch (e: any) {
      show(e?.response?.data?.error || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`/auth/profile`, {
        name: name.trim(),
        language_preference: language,
      });
      if (res.status === 200) {
        show('Profile updated successfully', 'success');
        loadProfile();
      }
    } catch (e: any) {
      show(e?.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-md mx-auto p-4 bg-white rounded shadow">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="max-w-md mx-auto p-4 bg-white rounded shadow">No profile found.</div>;
  }

  return (
    <div className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold mb-4">My Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input className="w-full border rounded px-3 py-2 bg-gray-100" value={profile.email} disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
          <select
            className="w-full border rounded px-3 py-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English</option>
            <option value="sw">Kiswahili</option>
          </select>
        </div>
        {profile.created_at && (
          <div className="text-sm text-gray-500">Joined: {new Date(profile.created_at).toLocaleDateString()}</div>
        )}
      </div>
      <div className="mt-6 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          onClick={loadProfile}
          disabled={saving}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default Profile;
