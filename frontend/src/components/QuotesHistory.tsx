import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useToast } from './ui/Toast';

interface QuoteRecord {
  id: number;
  created_at: string;
  quote_amount: number;
  risk_level: 'Low' | 'Medium' | 'High' | string;
  email_sent?: boolean;
}

interface Pagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

const currency = (v: number) => `KES ${v.toLocaleString()}`;
const formatDate = (iso: string) => new Date(iso).toLocaleString();

const QuotesHistory: React.FC = () => {
  const [quotes, setQuotes] = useState<QuoteRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<{ [id: number]: string | undefined }>({});
  const { show } = useToast();

  const fetchQuotes = async (pageNum: number = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get<{ quotes: QuoteRecord[]; pagination: Pagination }>(`/api/user/quotes`, {
        params: { page: pageNum, per_page: 10 },
      });
      setQuotes(res.data?.quotes ?? []);
      setPagination(res.data?.pagination ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const riskBadgeClass = (risk: string) => {
    if (risk === 'High') return 'bg-red-50 text-red-700 border-red-200';
    if (risk === 'Medium') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-green-50 text-green-700 border-green-200';
  };

  const doSendEmail = async (id: number) => {
    setActionLoading((s) => ({ ...s, [id]: 'email' }));
    try {
      await axios.post(`/api/send-quote/${id}`);
      // optimistic mark
      setQuotes((prev) => prev.map(q => q.id === id ? { ...q, email_sent: true } : q));
      show('Quote email is on its way to your inbox.', 'success');
    } catch (e) {
      show('Failed to send email. Please try again.', 'error');
    } finally {
      setActionLoading((s) => ({ ...s, [id]: undefined }));
    }
  };

  const doDownloadPdf = async (id: number) => {
    setActionLoading((s) => ({ ...s, [id]: 'pdf' }));
    try {
      // Try direct download (it will generate if missing)
      const res = await axios.get<Blob>(`/api/download-quote-pdf/${id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `insurance_quote_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      show('Your PDF has been downloaded.', 'success');
    } catch (e) {
      // fallback: trigger generate then download
      try {
        await axios.post(`/api/generate-quote-pdf/${id}`);
        const res2 = await axios.get<Blob>(`/api/download-quote-pdf/${id}`, { responseType: 'blob' });
        const url2 = window.URL.createObjectURL(new Blob([res2.data as BlobPart], { type: 'application/pdf' }));
        const link2 = document.createElement('a');
        link2.href = url2;
        link2.setAttribute('download', `insurance_quote_${id}.pdf`);
        document.body.appendChild(link2);
        link2.click();
        link2.remove();
        window.URL.revokeObjectURL(url2);
        show('Your PDF is ready and downloading now.', 'success');
      } catch (_) {
        show('Failed to prepare PDF. Please try again.', 'error');
      }
    } finally {
      setActionLoading((s) => ({ ...s, [id]: undefined }));
    }
  };

  const header = useMemo(() => (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-2xl font-semibold">My Quotes</h2>
      {pagination && (
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={!pagination.has_prev}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.pages || 1}
          </span>
          <button
            className="px-3 py-1 border rounded disabled:opacity-50"
            disabled={!pagination.has_next}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  ), [pagination]);

  return (
    <div className="max-w-5xl mx-auto p-4">
      {header}
      <div className="bg-white rounded-lg shadow p-4">
        {loading ? (
          <div className="text-gray-500">Loading quotes...</div>
        ) : error ? (
          <div className="text-red-600">{error}</div>
        ) : quotes.length === 0 ? (
          <div className="text-gray-600">No quotes found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quotes.map((q) => (
              <div key={q.id} className="border rounded-lg p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm text-gray-500">Quote ID #{q.id}</div>
                    <div className="text-lg font-medium">{currency(q.quote_amount)}</div>
                  </div>
                  <span className={`px-2 py-1 text-xs border rounded ${riskBadgeClass(q.risk_level)}`}>
                    {q.risk_level}
                  </span>
                </div>
                <div className="text-sm text-gray-600">{formatDate(q.created_at)}</div>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    className="px-3 py-2 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => doSendEmail(q.id)}
                    disabled={!!actionLoading[q.id]}
                    title={q.email_sent ? 'Email already sent' : 'Send to my email'}
                  >
                    {actionLoading[q.id] === 'email' ? 'Sending…' : (q.email_sent ? 'Resend Email' : 'Email Me')}
                  </button>
                  <button
                    className="px-3 py-2 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                    onClick={() => doDownloadPdf(q.id)}
                    disabled={!!actionLoading[q.id]}
                  >
                    {actionLoading[q.id] === 'pdf' ? 'Preparing…' : 'Download PDF'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuotesHistory;
