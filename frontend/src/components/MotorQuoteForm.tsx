import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import LoadingSpinner from './ui/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';

interface MotorRef {
  vehicle_categories: string[];
  cover_types: string[];
  terms: number[];
  addons: Record<string, {
    label: string;
    allowed_cover_types?: string[];
    requires_amount?: boolean;
    limits?: {
      type: string;
      min_pct?: number;
      max_pct?: number;
    };
    rating_impact?: {
      type: string;
      value_pct?: number;
    }
  }>;
  validation?: Record<string, any>;
  issuance_rules?: Record<string, any>;
  kyc?: { checklist: string[] };
}

const MotorQuoteForm: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [refData, setRefData] = useState<MotorRef | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const [vehicleCategory, setVehicleCategory] = useState('');
  const [coverType, setCoverType] = useState('');
  const [termMonths, setTermMonths] = useState<number>(12);
  const [vehicleValue, setVehicleValue] = useState<number | ''>('');
  const [yom, setYom] = useState<number | ''>('');
  const [addons, setAddons] = useState<Record<string, number | boolean>>({});

  useEffect(() => {
    const loadRef = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get('/api/reference/motor');
        setRefData(data);
      } catch (e: any) {
        setError(e?.response?.data?.error || 'Failed to load reference');
      } finally {
        setLoading(false);
      }
    };
    loadRef();
  }, []);

  const addonList = useMemo(() => {
    if (!refData) return [] as Array<{ key: string; label: string; requires_amount?: boolean; allowed_cover_types?: string[]; limits?: any }>;
    return Object.entries(refData.addons || {}).map(([key, meta]) => ({ key, label: meta.label, requires_amount: meta.requires_amount, allowed_cover_types: meta.allowed_cover_types, limits: meta.limits }));
  }, [refData]);

  const allowedAddons = useMemo(() => {
    return addonList.filter(a => !a.allowed_cover_types || a.allowed_cover_types.includes(coverType));
  }, [addonList, coverType]);

  const onToggleAddon = (key: string, checked: boolean) => {
    setAddons(prev => {
      const next = { ...prev } as Record<string, number | boolean>;
      if (checked) {
        // default amount if required
        const meta = refData?.addons?.[key];
        if (meta?.requires_amount) {
          next[key] = 0; // user to input
        } else {
          next[key] = true;
        }
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const onAddonAmountChange = (key: string, amount: number) => {
    setAddons(prev => ({ ...prev, [key]: amount }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const add_ons: Array<{ code: string; amount?: number }> = Object.entries(addons).map(([k, v]) => typeof v === 'number' ? { code: k, amount: v } : { code: k });

    const payload: any = {
      vehicle_category: vehicleCategory,
      cover_type: coverType,
      term_months: termMonths,
      add_ons,
      coverage: {
        vehicle_value: vehicleValue === '' ? undefined : Number(vehicleValue),
        vehicle_year: yom === '' ? undefined : Number(yom)
      },
      // minimal baseline model feature placeholders - adjust as needed for your feature mapping
      age: 35,
      driving_history: 0,
      driver_experience: 5
    };

    try {
      setSubmitting(true);
      const { data } = await axios.post('/api/predict', payload);
      setResult(data);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to get quote');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return <div className="text-center text-red-600">Please log in to get a quote.</div>;
  }

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!refData) return <div className="text-red-600">Reference not available.</div>;

  return (
    <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Motor Quote</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Vehicle Category</label>
          <select className="mt-1 w-full border rounded p-2" value={vehicleCategory} onChange={e => setVehicleCategory(e.target.value)} required>
            <option value="">Select category</option>
            {refData.vehicle_categories.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Cover Type</label>
          <select className="mt-1 w-full border rounded p-2" value={coverType} onChange={e => setCoverType(e.target.value)} required>
            <option value="">Select cover</option>
            {refData.cover_types.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Term (months)</label>
          <select className="mt-1 w-full border rounded p-2" value={termMonths} onChange={e => setTermMonths(Number(e.target.value))} required>
            {refData.terms.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Vehicle Value (KES)</label>
            <input type="number" min={0} className="mt-1 w-full border rounded p-2" value={vehicleValue} onChange={e => setVehicleValue(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 1500000" />
          </div>
          <div>
            <label className="block text-sm font-medium">Year of Manufacture</label>
            <input type="number" min={1970} max={new Date().getFullYear()} className="mt-1 w-full border rounded p-2" value={yom} onChange={e => setYom(e.target.value === '' ? '' : Number(e.target.value))} placeholder="e.g. 2014" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Add-ons</label>
          <div className="mt-2 space-y-2">
            {allowedAddons.map(a => {
              const selected = addons[a.key] !== undefined;
              const requiresAmount = !!a.requires_amount;
              return (
                <div key={a.key} className="flex items-center gap-2">
                  <input id={`addon_${a.key}`} type="checkbox" checked={selected} onChange={e => onToggleAddon(a.key, e.target.checked)} />
                  <label htmlFor={`addon_${a.key}`}>{a.label}</label>
                  {selected && requiresAmount && (
                    <input type="number" className="ml-2 w-40 border rounded p-1" placeholder="Amount" value={typeof addons[a.key] === 'number' ? (addons[a.key] as number) : 0} onChange={e => onAddonAmountChange(a.key, Number(e.target.value))} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-60" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Get Quote'}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-4 border rounded bg-gray-50">
          <div className="font-medium">Quote Result</div>
          <pre className="text-sm mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default MotorQuoteForm;
