import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { DropMark } from '../components/Icons.jsx';

export default function AuthPage({ mode }) {
  const isSignup = mode === 'signup';
  const { login, register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (isSignup) await register(form);
      else await login({ email: form.email, password: form.password });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (name) => (error?.field === name ? error.message : null);

  return (
    <main className="auth">
      <div className="brand"><DropMark size={36} /> <h1>Sweety</h1></div>
      <p className="auth-lede">Four readings a day. A clear picture of the month.</p>
      <form onSubmit={submit} className="auth-card stack" noValidate>
        <h2>{isSignup ? 'Create your account' : 'Log in'}</h2>
        {isSignup && (
          <label>Name
            <input value={form.name} onChange={set('name')} autoComplete="name" required />
            {fieldError('name') && <span className="field-error">{fieldError('name')}</span>}
          </label>
        )}
        <label>Email
          <input type="email" value={form.email} onChange={set('email')} autoComplete="email" required />
          {fieldError('email') && <span className="field-error">{fieldError('email')}</span>}
        </label>
        <label>Password
          <input type="password" value={form.password} onChange={set('password')}
            autoComplete={isSignup ? 'new-password' : 'current-password'} required />
          {isSignup && <span className="hint">At least 8 characters.</span>}
          {fieldError('password') && <span className="field-error">{fieldError('password')}</span>}
        </label>
        {error && !error.field && <p role="alert" className="form-error">{error.message}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}</button>
        <p className="switch">
          {isSignup ? <>Already have an account? <Link to="/login">Log in</Link></>
                    : <>New here? <Link to="/signup">Create an account</Link></>}
        </p>
      </form>
    </main>
  );
}
