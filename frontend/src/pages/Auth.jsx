import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuthError, login, register } from '../store/authSlice';

export default function Auth({ mode = 'login' }) {
  const isLogin = mode === 'login';
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, status, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({ name: '', email: '', password: '' });

  useEffect(() => {
    dispatch(clearAuthError());
  }, [mode, dispatch]);

  useEffect(() => {
    if (user) navigate(location.state?.from || '/', { replace: true });
  }, [user, navigate, location.state]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = (e) => {
    e.preventDefault();
    dispatch(isLogin ? login({ email: form.email, password: form.password }) : register(form));
  };

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-3xl font-bold">{isLogin ? 'Log in' : 'Create your account'}</h1>
      <p className="mt-1 text-mute">One account to buy, bid and sell.</p>

      <form onSubmit={submit} className="panel mt-6 space-y-4 p-5">
        {!isLogin && (
          <div>
            <label className="label" htmlFor="au-name">Name</label>
            <input id="au-name" className="input" value={form.name} onChange={set('name')} autoComplete="name" required />
          </div>
        )}
        <div>
          <label className="label" htmlFor="au-email">Email</label>
          <input id="au-email" type="email" className="input" value={form.email} onChange={set('email')} autoComplete="email" required />
        </div>
        <div>
          <label className="label" htmlFor="au-pass">Password</label>
          <input
            id="au-pass"
            type="password"
            className="input"
            value={form.password}
            onChange={set('password')}
            minLength={6}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
          />
          {!isLogin && <p className="mt-1 text-xs text-mute">At least 6 characters.</p>}
        </div>
        {error && <p role="alert" className="rounded-md bg-alert-soft px-3 py-2 text-sm text-alert">{error}</p>}
        <button className="btn-primary w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Please wait...' : isLogin ? 'Log in' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-mute">
        {isLogin ? 'New to VeriMarket?' : 'Already have an account?'}{' '}
        <Link to={isLogin ? '/register' : '/login'} state={location.state} className="font-semibold text-verify underline">
          {isLogin ? 'Create an account' : 'Log in'}
        </Link>
      </p>
    </div>
  );
}
