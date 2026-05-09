import { useState } from 'react';
import { supabase } from '../storage/supabaseClient';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (mode === 'register') {
      const { error: err } = await supabase.auth.signUp({ email, password });
      if (err) setError(err.message);
      else setError('Check email for confirmation link.');
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', background: 'var(--bg)', color: '#eee',
      fontFamily: 'sans-serif', padding: '1rem'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#1a1a1a', padding: '1.5rem', borderRadius: 12,
        width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 12
      }}>
        <h2 style={{ margin: 0, textAlign: 'center' }}>
          {mode === 'login' ? 'Sign In' : 'Create Account'}
        </h2>

        <input
          type="email" placeholder="Email" required
          value={email} onChange={e => setEmail(e.target.value)}
          style={{
            padding: 10, borderRadius: 8, border: '1px solid #333',
            background: '#222', color: '#eee', fontSize: 14
          }}
        />
        <input
          type="password" placeholder="Password" required minLength={6}
          value={password} onChange={e => setPassword(e.target.value)}
          style={{
            padding: 10, borderRadius: 8, border: '1px solid #333',
            background: '#222', color: '#eee', fontSize: 14
          }}
        />

        {error && <p style={{ color: '#f66', fontSize: 13, margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{
          padding: 10, borderRadius: 8, border: 'none',
          background: '#3b82f6', color: '#fff', fontSize: 14, cursor: 'pointer',
          opacity: loading ? 0.6 : 1
        }}>
          {loading ? '...' : mode === 'login' ? 'Sign In' : 'Register'}
        </button>

        <button type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          style={{
            background: 'none', border: 'none', color: '#3b82f6',
            fontSize: 13, cursor: 'pointer'
          }}>
          {mode === 'login' ? 'Need account? Register' : 'Have account? Sign In'}
        </button>
      </form>
    </div>
  );
}
