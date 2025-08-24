import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api/client';

const KycPage: React.FC = () => {
  const navigate = useNavigate();
  const [nationalId, setNationalId] = useState('');
  const [dob, setDob] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await api.post('/api/users/kyc/submit', {
        national_id: nationalId,
        dob,
        kra_pin: kraPin || undefined,
        address: address || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
      setMessage('Thanks! We have your KYC details. Verification usually takes a few minutes. You will be notified once completed.');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to submit KYC. Please try again.';
      setMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white shadow rounded-lg p-6">
      <h1 className="text-xl font-semibold mb-2">Complete KYC</h1>
      <p className="text-sm text-gray-600 mb-4">
        To issue your policy, we need to verify your identity. Enter the details below. You can keep chatting while we verify.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">National ID / Passport</label>
          <input
            type="text"
            value={nationalId}
            onChange={(e) => setNationalId(e.target.value)}
            required
            placeholder="e.g., 12345678"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={dob}
            onChange={(e) => setDob(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">KRA PIN (optional)</label>
          <input
            type="text"
            value={kraPin}
            onChange={(e) => setKraPin(e.target.value.toUpperCase())}
            placeholder="e.g., A123456789B"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g., 07xx xxx xxx"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Address (optional)</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="e.g., P.O. Box 12345-00100, Nairobi"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Future: file uploads for ID and selfie */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload ID (front)</label>
          <input type="file" accept="image/*,.pdf" />
        </div> */}

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Submit for Verification'}
          </button>
          <button
            type="button"
            onClick={() => {
              // Signal the floating chatbot to auto-open on return
              try { localStorage.setItem('openChatOnReturn', '1'); } catch {}
              try { window.dispatchEvent(new Event('open-floating-chat')); } catch {}
              navigate('/');
            }}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
          >
            Back to App
          </button>
        </div>
      </form>

      {message && (
        <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-sm">
          {message}
        </div>
      )}

      <div className="mt-6 text-xs text-gray-500">
        We only use these details to verify your identity for insurance compliance. Your information is kept private and secure.
      </div>
    </div>
  );
};

export default KycPage;
