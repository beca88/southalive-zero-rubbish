import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Define the navigation items for the admin layout sidebar
const NAV_ITEMS = [
    { to: '/admin/dashboard', label: 'Dashboard' },
    { to: '/admin/volunteers', label: 'Volunteers Registrations' },
    { to: '/admin/streets', label: 'Streets Adoptions' },
];

export default function AdminLayout() {
    const { logout, administrator } = useAuth();

    return (
        <div className="min-h-screen flex">
            {/* Sidebar */}
            <aside className="w-60 shrink-0 border-r border-line bg-white flex flex-col">
                <div className="px-5 py-5 border-b border-line">
                    <p className="font-display font-semibold text-ink">South Alive_Zero Rubbish Street Adoption System</p>
                    <p className="text-xs text-ink/50">Administrator Dashboard</p>
                </div>

                <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
                    {NAV_ITEMS.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={({ isActive }) =>
                                `rounded-sm px-3 py-2 text-sm font-medium ${isActive
                                    ? 'bg-adopted/10 text-adopted'
                                    : 'text-ink hover:bg-paper'
                                }`
                            }
                        >
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="px-3 py-4 border-t border-line">
                    <p className="px-3 text-xs text-ink/50 mb-2">

                        {/* // Display the administrator's name if available, otherwise show 'Administrator' */}
                        {administrator?.name ?? 'Administrator'}
                    </p>
                    <button
                        onClick={logout}
                        className="w-full text-left rounded-sm px-3 py-2 text-sm text-ink hover:bg-paper"
                    >
                        Log out
                    </button>
                </div>
            </aside>

            {/* Main content area */}
            <main className="flex-1 bg-paper">
                <Outlet />
            </main>
        </div>
    );
}