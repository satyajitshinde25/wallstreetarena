/* ── Login Page — The Wall Street Arena (premium split-screen entry) ── */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/client';
import './LoginPage.css';

export default function LoginPage() {
  const [teamId, setTeamId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(teamId, password);
      localStorage.setItem('ms_token', data.token);
      localStorage.setItem('ms_team_code', data.team_code);
      localStorage.setItem('ms_display_name', data.display_name);
      localStorage.setItem('ms_role', data.role);

      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arena-login">
      {/* ── Left: cinematic Wall Street visual ── */}
      <div className="arena-visual">
        <img
          src="/login-arena.jpg"
          alt="Wall Street executive in a corner office at sunset overlooking the city skyline, golden bull statue in the foreground"
        />
      </div>

      {/* ── Right: premium near-black login panel ── */}
      <main className="arena-panel">
        <div className="arena-panel-inner">
          <header className="arena-brand">
            {/* Gold line-chart / market icon */}
            <svg
              className="arena-mark"
              viewBox="0 0 64 52"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 48 H60" opacity="0.5" />
              <path d="M13 48 V37" />
              <path d="M25 48 V29" />
              <path d="M37 48 V21" />
              <path d="M49 48 V13" />
              <path d="M9 33 L23 23 L35 29 L53 8" />
              <path d="M43 7 H54 V18" />
            </svg>

            <h1 className="arena-wordmark">
              <span className="arena-the">The</span>
              <span className="arena-name">Wall Street</span>
              <span className="arena-arena">Arena</span>
            </h1>

            <hr className="arena-rule" />

            <p className="arena-tagline">
              <span>Trade</span>
              <i aria-hidden="true">/</i>
              <span>Analyze</span>
              <i aria-hidden="true">/</i>
              <span>Grow</span>
            </p>
          </header>

          <form className="arena-form" onSubmit={handleLogin}>
            <div className="arena-field">
              <label className="arena-sr-only" htmlFor="team-id">
                Username
              </label>
              <span className="arena-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="3.6" />
                  <path d="M5 20c0-3.6 3.1-5.6 7-5.6s7 2 7 5.6" />
                </svg>
              </span>
              <input
                id="team-id"
                className="arena-input"
                type="text"
                placeholder="Username"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                autoComplete="off"
                autoFocus
                required
              />
            </div>

            <div className="arena-field">
              <label className="arena-sr-only" htmlFor="password">
                Password
              </label>
              <span className="arena-field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
                  <path d="M8.2 10.5V7.8a3.8 3.8 0 0 1 7.6 0v2.7" />
                </svg>
              </span>
              <input
                id="password"
                className="arena-input"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="arena-error" role="alert">
                <span aria-hidden="true">⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              className="arena-submit"
              disabled={loading || !teamId || !password}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: 18, height: 18 }} />
                  SIGNING IN
                </>
              ) : (
                <>
                  LOGIN
                  <svg
                    className="arena-arrow"
                    viewBox="0 0 30 14"
                    width="30"
                    height="14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M1 7 H27" />
                    <path d="M21 1.5 L27 7 L21 12.5" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
