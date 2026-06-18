import { useContext } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AuthContext from '../../context/AuthContext';
import { LogOut, ShieldCheck } from 'lucide-react';

const AdminLayout = () => {
    const { admin, loading, logout } = useContext(AuthContext);

    if (loading) return <div>Loading...</div>;
    if (!admin) return <Navigate to="/admin/login" replace />;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header className="app-header">
                <div className="flex-center" style={{ gap: '0.5rem' }}>
                    <ShieldCheck size={28} color="var(--primary)" />
                    <span className="logo-text">Election Control Center</span>
                </div>

                <div className="flex-center" style={{ gap: '1.5rem' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
                        Admin: <span style={{ color: 'var(--text-main)' }}>{admin.username}</span>
                    </span>
                    <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </header>

            <main style={{ flex: 1, background: 'var(--bg-app)' }}>
                <Outlet />
            </main>
        </div>
    );
};

export default AdminLayout;
