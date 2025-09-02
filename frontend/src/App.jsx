import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './App.css';

const API_BASE = 'http://localhost:8000';

function App() {
  const [symbol, setSymbol] = useState('');
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [apiStatus, setApiStatus] = useState('Checking...');

  // Check API health on component mount
  React.useEffect(() => {
    checkApiHealth();
  }, []);

  const checkApiHealth = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/health`);
      if (response.data.status === 'ok') {
        setApiStatus('Connected ✅');
      }
    } catch (err) {
      setApiStatus('Disconnected ❌');
      setError('Cannot connect to backend API. Make sure the backend is running on port 8000.');
    }
  };

  const fetchStockData = async () => {
    if (!symbol.trim()) {
      setError('Please enter a stock symbol');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // First, try to fetch fresh data from Yahoo Finance
      console.log('Fetching fresh data for:', symbol);
      await axios.post(`${API_BASE}/api/stocks/fetch/${symbol.toUpperCase()}`);

      // Then get the stored data
      const response = await axios.get(`${API_BASE}/api/stocks/${symbol.toUpperCase()}`);
      setStockData(response.data);

    } catch (err) {
      console.error('Error:', err);
      if (err.response) {
        setError(err.response.data.detail || 'Failed to fetch stock data');
      } else {
        setError('Network error. Make sure the backend is running.');
      }
      setStockData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchStockData();
  };

  const formatChartData = (data) => {
    return data.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      close: item.close,
      open: item.open,
      high: item.high,
      low: item.low,
      volume: item.volume
    })).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatVolume = (value) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  };

  const calculateStats = (data) => {
    if (!data || data.length === 0) return null;

    const prices = data.map(d => d.close);
    const latest = data[data.length - 1];
    const previous = data[data.length - 2];

    const change = latest && previous ? latest.close - previous.close : 0;
    const changePercent = previous ? ((change / previous.close) * 100) : 0;

    return {
      latest: latest.close,
      change,
      changePercent,
      high: Math.max(...prices),
      low: Math.min(...prices),
      avgVolume: Math.round(data.reduce((sum, d) => sum + d.volume, 0) / data.length)
    };
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>📈 Mini-Quant Stock Dashboard</h1>
        <p className="api-status">API Status: {apiStatus}</p>
      </header>

      <main className="main-content">
        <div className="search-section">
          <form onSubmit={handleSubmit} className="search-form">
            <div className="input-group">
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="Enter stock symbol (e.g., AAPL, GOOGL, TSLA)"
                className="symbol-input"
                disabled={loading}
              />
              <button
                type="submit"
                className="fetch-button"
                disabled={loading}
              >
                {loading ? '⏳ Loading...' : '🔍 Get Stock Data'}
              </button>
            </div>
          </form>

          <div className="sample-symbols">
            <span>Try: </span>
            {['AAPL', 'GOOGL', 'TSLA', 'MSFT', 'AMZN'].map(sym => (
              <button
                key={sym}
                onClick={() => setSymbol(sym)}
                className="sample-symbol"
                disabled={loading}
              >
                {sym}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {stockData && (
          <div className="results-section">
            <div className="stock-header">
              <h2>{stockData.symbol} Stock Data</h2>
              <p>{stockData.data.length} trading days</p>
            </div>

            {/* Stats Cards */}
            {(() => {
              const stats = calculateStats(stockData.data);
              return stats && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">Latest Price</div>
                    <div className="stat-value">{formatCurrency(stats.latest)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Daily Change</div>
                    <div className={`stat-value ${stats.change >= 0 ? 'positive' : 'negative'}`}>
                      {stats.change >= 0 ? '+' : ''}{formatCurrency(stats.change)}
                      <span className="change-percent">
                        ({stats.changePercent >= 0 ? '+' : ''}{stats.changePercent.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">30-Day High</div>
                    <div className="stat-value">{formatCurrency(stats.high)}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">30-Day Low</div>
                    <div className="stat-value">{formatCurrency(stats.low)}</div>
                  </div>
                </div>
              );
            })()}

            {/* Price Chart */}
            <div className="chart-container">
              <h3>Price Chart (30 Days)</h3>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={formatChartData(stockData.data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={['auto', 'auto']} tickFormatter={formatCurrency} />
                  <Tooltip
                    formatter={(value, name) => [
                      name === 'volume' ? formatVolume(value) : formatCurrency(value),
                      name === 'volume' ? 'Volume' : name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                    labelStyle={{ color: '#333' }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="close"
                    stroke="#2563eb"
                    strokeWidth={2}
                    name="close"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="open"
                    stroke="#16a34a"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="open"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Volume Chart */}
            <div className="chart-container">
              <h3>Volume Chart</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={formatChartData(stockData.data)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={formatVolume} />
                  <Tooltip formatter={(value) => [formatVolume(value), 'Volume']} />
                  <Line
                    type="monotone"
                    dataKey="volume"
                    stroke="#dc2626"
                    strokeWidth={2}
                    name="volume"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Data Table Preview */}
            <div className="data-table-container">
              <h3>Recent Data (Last 10 days)</h3>
              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Open</th>
                      <th>High</th>
                      <th>Low</th>
                      <th>Close</th>
                      <th>Volume</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockData.data.slice(-10).reverse().map((row, index) => (
                      <tr key={index}>
                        <td>{new Date(row.date).toLocaleDateString()}</td>
                        <td>{formatCurrency(row.open)}</td>
                        <td>{formatCurrency(row.high)}</td>
                        <td>{formatCurrency(row.low)}</td>
                        <td>{formatCurrency(row.close)}</td>
                        <td>{formatVolume(row.volume)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!stockData && !loading && !error && (
          <div className="welcome-message">
            <h3>👋 Welcome to Mini-Quant!</h3>
            <p>Enter a stock symbol above to get started. This dashboard fetches real-time data from Yahoo Finance and displays interactive charts.</p>
            <div className="features">
              <div className="feature">📊 Interactive price charts</div>
              <div className="feature">📈 Real-time stock data</div>
              <div className="feature">💾 Persistent data storage</div>
              <div className="feature">🚀 Fast API backend</div>
            </div>
          </div>
        )}
      </main>

      {/* <footer className="app-footer">
        <p>Built with React + FastAPI | Data from Yahoo Finance</p>
      </footer> */}
    </div>
  );
}

export default App;