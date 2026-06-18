import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { Vote, Monitor, Lock, AlertCircle, ArrowRight, X } from 'lucide-react';

const BoothSelectionPage = () => {
    const navigate = useNavigate();
    const [booths, setBooths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooth, setSelectedBooth] = useState(null);
    const [passkey, setPasskey] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        // Redirect if already in a booth
        if (localStorage.getItem('boothId')) {
            navigate('/vote');
            return;
        }

        api.get('/booth/list-public')
            .then(res => {
                setBooths(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to load booths", err);
                setLoading(false);
            });
    }, [navigate]);

    const handleSelectBooth = (booth) => {
        setError('');
        setPasskey('');
        setSelectedBooth(booth);
        
        // If no passkey required (not indicated by the API directly, so we try logging in empty)
        // Wait, the new prompt says: "Passkey indicator (if protected)".
        // Our backend doesn't explicitly return 'hasPasskey' in list-public right now,
        // but let's assume it does, or we just always show the passkey modal if the user clicks it,
        // OR we attempt login without passkey and if it fails with 401, we prompt.
        // Let's just show the modal, but if they enter nothing, we submit nothing.
        // Actually, backend `list-public` returns: id, name, status, electionId.
        // We will just always show the modal, but make passkey optional, or check if it fails.
    };

    const handleEnterBooth = async (e) => {
        if (e) e.preventDefault();
        if (!selectedBooth) return;

        setSubmitting(true);
        setError('');

        try {
            await api.post('/booth/login', { boothId: selectedBooth.id, passkey });
            
            // Save to localStorage
            localStorage.setItem('boothId', selectedBooth.id);
            localStorage.setItem('boothName', selectedBooth.name);

            navigate('/vote');
        } catch (err) {
            setError(err.response?.data?.error || "Failed to enter booth. Incorrect passkey?");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--background)' }}>
                <div className="loader"></div>
            </div>
        );
    }

    return (
        <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem' }}>
            <div className="card animate-fade-in" style={{ maxWidth: '800px', width: '100%', padding: '3rem 2rem' }}>
                <div className="flex-center" style={{ marginBottom: '2rem', color: 'var(--primary)', flexDirection: 'column' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1rem', borderRadius: '50%', marginBottom: '1rem' }}>
                        <Vote size={48} />
                    </div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        Select Voting Booth
                    </h1>
                    <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        Choose an available booth to begin your voting session.
                    </p>
                </div>

                {booths.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--neutral-100)', borderRadius: 'var(--radius-lg)' }}>
                        <Monitor size={48} color="var(--neutral-400)" style={{ margin: '0 auto 1rem' }} />
                        <h3 style={{ color: 'var(--text-main)' }}>No Booths Available</h3>
                        <p style={{ color: 'var(--text-muted)' }}>There are currently no active voting booths.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                        {booths.map(b => (
                            <div 
                                key={b.id}
                                className="card"
                                style={{ 
                                    padding: '1.5rem', 
                                    cursor: 'pointer', 
                                    transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
                                    border: '2px solid transparent',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}
                                onClick={() => handleSelectBooth(b)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.borderColor = 'var(--primary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.borderColor = 'transparent';
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Monitor size={20} color="var(--primary)" />
                                        {b.name}
                                    </h3>
                                    {/* We don't have hasPasskey from API yet, but we'll show a lock just to indicate it might be protected */}
                                    <Lock size={16} color="var(--neutral-400)" title="May require passkey" />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem' }}>
                                    <span className="badge badge-success">Active</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Passkey Modal */}
            {selectedBooth && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div className="card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '2rem', position: 'relative' }}>
                        <button 
                            onClick={() => setSelectedBooth(null)}
                            style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                        >
                            <X size={24} />
                        </button>
                        
                        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ background: 'var(--neutral-100)', padding: '1rem', borderRadius: '50%', display: 'inline-block', marginBottom: '1rem' }}>
                                <Lock size={32} color="var(--primary)" />
                            </div>
                            <h2 style={{ fontWeight: 700 }}>Enter {selectedBooth.name}</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                                If this booth is protected, please enter the passkey provided by the administrator. Otherwise, leave blank.
                            </p>
                        </div>

                        {error && (
                            <div style={{ padding: '0.75rem', background: 'var(--danger-light)', color: 'var(--danger)', borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        <form onSubmit={handleEnterBooth}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <input
                                    type="password"
                                    className="input-field"
                                    placeholder="Enter Passkey (Optional)"
                                    value={passkey}
                                    onChange={(e) => setPasskey(e.target.value)}
                                    autoFocus
                                    style={{ textAlign: 'center', letterSpacing: '0.1em', fontSize: '1.2rem' }}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="btn btn-primary" 
                                style={{ width: '100%', padding: '1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                                disabled={submitting}
                            >
                                {submitting ? <div className="loader" style={{ width: '20px', height: '20px', borderWidth: '2px' }}></div> : (
                                    <>Enter Booth <ArrowRight size={20} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Subtle Admin Access */}
            <div 
                style={{
                    position: 'absolute', bottom: '1.5rem', right: '2rem',
                    opacity: 0.4, transition: 'opacity 0.2s ease-in-out',
                    cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
                onClick={() => navigate('/admin/login')}
            >
                Admin Access
            </div>
        </div>
    );
};

export default BoothSelectionPage;
