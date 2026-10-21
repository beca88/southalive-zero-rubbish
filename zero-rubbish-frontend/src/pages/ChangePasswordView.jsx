import { useState } from 'react';
import { changePassword } from '../services/api';
import usePageTitle from '../hooks/usePageTitle';

const MIN_PASSWORD_LENGTH = 12;

const INPUT_CLASS =
    'rounded-sm border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-adopted/40';

export default function ChangePasswordView() {
    usePageTitle('Change Password | Zero Rubbish Admin');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword.length < MIN_PASSWORD_LENGTH) {
            setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }

        setLoading(true);
        try {
            const data = await changePassword(currentPassword, newPassword);
            setSuccess(data.message ?? 'Password changed successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.response?.data?.message ?? 'Failed to change password. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="p-6">
            <h1 className="text-2xl font-display font-semibold mb-6 text-ink">Change password</h1>

            <div className="w-full max-w-sm bg-white border border-line rounded-md p-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="currentPassword" className="text-sm font-medium text-ink">
                            Current password
                        </label>
                        <input
                            id="currentPassword"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className={INPUT_CLASS}
                            required
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="newPassword" className="text-sm font-medium text-ink">
                            New password
                        </label>
                        <input
                            id="newPassword"
                            type="password"
                            autoComplete="new-password"
                            minLength={MIN_PASSWORD_LENGTH}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className={INPUT_CLASS}
                            required
                        />
                        <p className="text-xs text-ink/50">At least {MIN_PASSWORD_LENGTH} characters.</p>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="confirmPassword" className="text-sm font-medium text-ink">
                            Confirm new password
                        </label>
                        <input
                            id="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={INPUT_CLASS}
                            required
                        />
                    </div>

                    {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
                    {success && <p className="text-sm text-adopted" role="status">{success}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 rounded-sm bg-brand text-ink font-medium py-2 text-sm hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Saving...' : 'Change password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
