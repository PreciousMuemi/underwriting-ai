import React, { useEffect, useState } from 'react';

interface Quote {
  id: number;
  date: string;
  amount: number;
  status: string;
}

const QuotesHistory: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    // Fetch quotes history from API or local storage
    // For now, using dummy data
    setQuotes([
      { id: 1, date: '2023-06-01', amount: 250, status: 'Approved' },
      { id: 2, date: '2023-06-10', amount: 300, status: 'Pending' },
    ]);
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-4 bg-white rounded shadow">
      <h2 className="text-2xl mb-4">Quotes History</h2>
      {quotes.length === 0 ? (
        <p>No quotes found.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr>
              <th className="border border-gray-300 px-4 py-2">ID</th>
              <th className="border border-gray-300 px-4 py-2">Date</th>
              <th className="border border-gray-300 px-4 py-2">Amount</th>
              <th className="border border-gray-300 px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr key={quote.id}>
                <td className="border border-gray-300 px-4 py-2">{quote.id}</td>
                <td className="border border-gray-300 px-4 py-2">{quote.date}</td>
                <td className="border border-gray-300 px-4 py-2">${quote.amount}</td>
                <td className="border border-gray-300 px-4 py-2">{quote.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default QuotesHistory;
