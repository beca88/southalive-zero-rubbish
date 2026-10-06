import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { login as loginApi } from '../services/api';
import usePageTitle from '../hooks/usePageTitle';

export default function AdminLogin() {
    usePageTitle('Administrator Login | Zero Rubbish');

    const { login } = useAuth();

    const navigate = useNavigate();
    const location = useLocation();

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const from = location.state?.from?.pathname ?? '/admin/dashboard';

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (!username || !password) throw new Error('Please enter your username and password.');

            const data = await loginApi(username, password);
            // data: { token, username, role }
            login(data.token, { name: data.username, role: data.role });

            navigate(from, { replace: true });
        } catch (err) {
            const message =
                err.response?.status === 401
                    ? 'Invalid username or password, please try again.'
                    : err.message || 'Login failed. Please try again.';
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-paper flex items-center justify-center px-4">
            <div className="w-full max-w-sm bg-white border border-line rounded-md p-8">

                <div className="mb-6">
                    <p className="text-xs text-ink/50 uppercase tracking-widest mb-1">South Alive - Zero Rubbish Street Adoption System</p>
                    <h1 className="text-xl font-display font-semibold text-ink">Administrator login</h1>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4" autoComplete="on">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="username" className="text-sm font-medium text-ink">
                            Username
                        </label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="username"
                            className="rounded-sm border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-adopted/40"
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="password" className="text-sm font-medium text-ink">
                            Password
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="rounded-sm border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-adopted/40"
                            required
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 rounded-sm bg-brand text-ink font-medium py-2 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Logging in...' : 'Log in'}
                    </button>
                </form>

            </div>
        </div>
    );
}