import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import PositionManager from './PositionManager';
import CandidateManager from './CandidateManager';
import BoothManager from './BoothManager';
import ElectionResults from './ElectionResults';
import {
    Play, Pause, Square, RotateCcw, BarChart,
    Users, Layers, ArrowLeft, Loader2, AlertCircle, CheckCircle, Monitor
} from 'lucide-react';

// ── Stable Sub-Component: Status Alert ───────────────────────────────────────
const StatusAlert = memo(({ statusMsg, onDismiss }) => {
    if (!statusMsg.text) return null;
    return (
        <div className="card animate-fade-in" style={{
            position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 100,
            borderColor: statusMsg.type === 'error' ? 'var(--danger)' : 'var(--success)',
            borderLeftWidth: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            minWidth: '300px',
            boxShadow: 'var(--shadow-xl)'
        }}>
            <div className="flex-center" style={{ gap: '0.75rem' }}>
                {statusMsg.type === 'error' ? <AlertCircle size={24} color="var(--danger)" /> : <CheckCircle size={24} color="var(--success)" />}
                <span style={{ fontWeight: 600 }}>{statusMsg.text}</span>
            </div>
            <button onClick={onDismiss} className="btn btn-ghost" style={{ marginLeft: '1rem', padding: '0.25rem 0.5rem' }}>Dismiss</button>
        </div>
    );
});

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [election, setElection] = useState(null);
    const [view, setView] = useState('dashboard');
    const [actionLoading, setActionLoading] = useState(false);
    const [dataLoaded, setDataLoaded] = useState(false);
    const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });
    const [booths, setBooths] = useState([]);

    const fetchBooths = useCallback(async () => {
        try {
            const { data } = await api.get('/booth');
            setBooths(prev => {
                if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                return data;
            });
        } catch (err) {
            console.error("Failed to fetch booths in dashboard", err);
        }
    }, []);

    const fetchStatus = useCallback(async (isSilent = false) => {
        try {
            const { data: elections } = await api.get('/election/all');
            if (elections.length > 0) {
                const { data } = await api.get(`/election/${elections[0].id}`);
                // Only update if something actually changed to prevent re-renders
                setElection(prev => {
                    if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                    return data;
                });
                await fetchBooths();
            } else if (!isSilent) {
                const { data: newElection } = await api.post('/election', { name: 'School Election' });
                setElection(newElection);
            }
        } catch (err) {
            console.error("Failed to fetch status:", err);
            if (err.response?.status === 401 || err.response?.status === 403) {
                navigate('/admin/login');
            }
        } finally {
            setDataLoaded(true);
        }
    }, [navigate, fetchBooths]);

    useEffect(() => {
        fetchStatus();
        // Only poll if on dashboard to reduce noise in sub-views
        let interval;
        if (view === 'dashboard') {
            interval = setInterval(() => fetchStatus(true), 5000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [fetchStatus, view]);

    useEffect(() => {
        if (election && election.status === 'NOT_STARTED' && view === 'results') {
            setView('dashboard');
        }
    }, [election?.status, view]);

    const handleToggleBoothLock = async (booth) => {
        const nextStatus = booth.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
        setActionLoading(true);
        try {
            await api.post(`/booth/${booth.id}/status`, { status: nextStatus });
            await fetchBooths();
            setStatusMsg({ type: 'success', text: `Booth "${booth.name}" status updated to ${nextStatus}.` });
        } catch (err) {
            console.error("Failed to toggle booth lock status", err);
            setStatusMsg({ type: 'error', text: 'Failed to update booth lock status' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetBoothSession = async (booth) => {
        setActionLoading(true);
        try {
            await api.post(`/booth/${booth.id}/status`, { status: 'ACTIVE' });
            await fetchBooths();
            setStatusMsg({ type: 'success', text: `Voter session reset successfully for "${booth.name}" (Next Voter active).` });
        } catch (err) {
            console.error("Failed to reset booth session", err);
            setStatusMsg({ type: 'error', text: 'Failed to reset booth session' });
        } finally {
            setActionLoading(false);
        }
    };

    const updateStatus = async (newStatus) => {
        if (actionLoading || !election) return;
        setActionLoading(true);
        setStatusMsg({ type: '', text: '' });

        try {
            if (newStatus === 'RESET') {
                if (!window.confirm("WARNING: This will delete ALL VOTES. Are you sure?")) {
                    setActionLoading(false);
                    return;
                }
                await api.post(`/election/${election.id}/reset`);
                setStatusMsg({ type: 'success', text: 'All votes cleared successfully.' });
            } else {
                await api.put(`/election/${election.id}`, { status: newStatus });
            }
            await fetchStatus(true);
        } catch (err) {
            const errMsg = err.response?.data?.error || err.message;
            setStatusMsg({ type: 'error', text: `Error: ${errMsg}` });
        } finally {
            setActionLoading(false);
        }
    };

    if (!dataLoaded || !election) return (
        <div className="flex-center" style={{ minHeight: '60vh', flexDirection: 'column' }}>
            <Loader2 className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '1rem' }} size={40} />
            <span style={{ color: 'var(--text-muted)' }}>Loading...</span>
        </div>
    );

    // ── Sub-view Headers ──────────────────────────────────────────────────────
    const SubViewHeader = ({ title }) => (
        <div className="section-header">
            <h2>{title}</h2>
            <button onClick={() => setView('dashboard')} className="btn btn-secondary">
                <ArrowLeft size={20} /> Back to Dashboard
            </button>
        </div>
    );

    return (
        <div className="dashboard-layout" style={{ margin: '2rem auto' }}>
            {view === 'positions' && (
                <div className="animate-fade-in">
                    <SubViewHeader title="Manage Positions" />
                    <div className="card"><PositionManager electionId={election.id} /></div>
                </div>
            )}

            {view === 'candidates' && (
                <div className="animate-fade-in">
                    <SubViewHeader title="Manage Candidates" />
                    <div className="card"><CandidateManager electionId={election.id} /></div>
                </div>
            )}

            {view === 'booths' && (
                <div className="animate-fade-in">
                    <SubViewHeader title="Manage Voting Booths" />
                    <div className="card"><BoothManager currentElectionId={election.id} /></div>
                </div>
            )}

            {view === 'results' && (
                <div className="animate-fade-in">
                    <SubViewHeader title="Election Results" />
                    <ElectionResults electionId={election.id} />
                </div>
            )}

            {view === 'dashboard' && (
                <div className="animate-fade-in space-y-8">
                    {/* A. Election Status */}
                    <section className="card">
                        <div className="section-header" style={{ borderBottom: 'none', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem' }}>Live Control</h2>
                            <span className={`badge ${election.status === 'RUNNING' ? 'badge-success pulse' : election.status === 'PAUSED' ? 'badge-warning' : 'badge-neutral'}`}>
                                {election.status}
                            </span>
                        </div>

                        <div className="flex-between" style={{ flexWrap: 'wrap', gap: '1.5rem' }}>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '600px' }}>
                                {election.status === 'RUNNING' ? 'Voting is active. Booths are currently processing ballots.' :
                                    election.status === 'PAUSED' ? 'Voting is paused. Booths are temporarily locked.' :
                                        election.status === 'STOPPED' ? 'Election has ended. Results are finalized.' :
                                            'System is idle. Configure infrastructure to begin.'}
                            </p>

                            <div className="action-bar">
                                {election.status !== 'RUNNING' && (
                                    <button onClick={() => updateStatus('RUNNING')} disabled={actionLoading} className="btn btn-primary">
                                        {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />}
                                        {election.status === 'PAUSED' ? 'Resume' : 'Start Voting'}
                                    </button>
                                )}
                                {election.status === 'RUNNING' && (
                                    <button onClick={() => updateStatus('PAUSED')} disabled={actionLoading} className="btn" style={{ background: 'var(--warning)', color: 'white' }}>
                                        {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Pause size={18} />} Pause
                                    </button>
                                )}
                                {election.status !== 'STOPPED' && election.status !== 'NOT_STARTED' && (
                                    <button onClick={() => updateStatus('STOPPED')} disabled={actionLoading} className="btn btn-danger">
                                        {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <Square size={18} />} Stop
                                    </button>
                                )}
                                {(election.status === 'RUNNING' || election.status === 'PAUSED' || election.status === 'STOPPED') && (
                                    <button onClick={() => setView('results')} disabled={actionLoading} className="btn btn-secondary">
                                        <BarChart size={18} /> Results
                                    </button>
                                )}
                                <button onClick={() => updateStatus('RESET')} disabled={actionLoading} className="btn btn-ghost" title="Reset All Data"><RotateCcw size={18} /></button>
                            </div>
                        </div>
                    </section>

                    {/* Live Booth Monitoring & Voter Control */}
                    <section className="card animate-fade-in">
                        <div className="section-header" style={{ borderBottom: 'none', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.25rem' }}>Voter Control & Booth Monitoring</h2>
                            <span className="badge badge-neutral">{booths.filter(b => b.isActive).length} / {booths.length} Active</span>
                        </div>
                        {booths.length === 0 ? (
                            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem 0' }}>
                                No voting booths registered yet. Use "Booth Config" below to set up voting stations.
                            </p>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                {booths.map(booth => {
                                    const isLocked = booth.status === 'LOCKED';
                                    const isOffline = !booth.isActive;
                                    const isOnline = booth.isActive && booth.status === 'ACTIVE';
                                    
                                    return (
                                        <div key={booth.id} className="p-4 border rounded-lg bg-white shadow-sm flex flex-col justify-between animate-fade-in" style={{
                                            borderColor: isOffline ? 'var(--neutral-200)' : isLocked ? 'var(--danger)' : isOnline ? 'var(--success)' : 'var(--neutral-300)',
                                            borderLeftWidth: '5px'
                                        }}>
                                            <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                                <div>
                                                    <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{booth.name}</h4>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                        Last active: {new Date(booth.lastActivity).toLocaleTimeString()}
                                                    </p>
                                                </div>
                                                <span className={`badge ${
                                                    isOffline ? 'badge-neutral' :
                                                    isLocked ? 'badge-danger' :
                                                    isOnline ? 'badge-success pulse' : 'badge-warning'
                                                }`} style={{ fontSize: '0.75rem' }}>
                                                    {isOffline ? 'Offline' : isLocked ? 'Locked' : 'Ready'}
                                                </span>
                                            </div>

                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                                                    <span>Session:</span>
                                                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                                                        {booth.currentSessionId ? booth.currentSessionId.split('-')[0] : 'None'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-2" style={{ marginTop: 'auto' }}>
                                                <button
                                                    onClick={() => handleToggleBoothLock(booth)}
                                                    disabled={isOffline || actionLoading}
                                                    className={`btn ${isLocked ? 'btn-primary' : 'btn-secondary'}`}
                                                    style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                                                >
                                                    {isLocked ? 'Unlock Booth' : 'Lock Booth'}
                                                </button>
                                                <button
                                                    onClick={() => handleResetBoothSession(booth)}
                                                    disabled={isOffline || actionLoading}
                                                    className="btn btn-secondary"
                                                    style={{ flex: 1, padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'var(--primary)' }}
                                                    title="Force next voter reset"
                                                >
                                                    Next Voter
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* B. Infrastructure Grid */}
                    <section>
                        <h2 style={{ marginBottom: '1.5rem', marginLeft: '0.5rem', fontSize: '1.5rem' }}>Infrastructure</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                            <button onClick={() => setView('positions')} className="card card-hover flex-center" style={{ flexDirection: 'column', padding: '3rem 1.5rem', gap: '1.5rem', textAlign: 'center' }}>
                                <Layers size={48} color="var(--primary)" />
                                <div className="space-y-1">
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Positions</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Define ballot items</div>
                                </div>
                            </button>
                            <button onClick={() => setView('candidates')} className="card card-hover flex-center" style={{ flexDirection: 'column', padding: '3rem 1.5rem', gap: '1.5rem', textAlign: 'center' }}>
                                <Users size={48} color="var(--primary)" />
                                <div className="space-y-1">
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Candidates</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Manage participants</div>
                                </div>
                            </button>
                            <button onClick={() => setView('booths')} className="card card-hover flex-center" style={{ flexDirection: 'column', padding: '3rem 1.5rem', gap: '1.5rem', textAlign: 'center' }}>
                                <Monitor size={48} color="var(--primary)" />
                                <div className="space-y-1">
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>Booth Config</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Station assignments</div>
                                </div>
                            </button>
                        </div>
                    </section>
                </div>
            )}

            <StatusAlert statusMsg={statusMsg} onDismiss={() => setStatusMsg({ type: '', text: '' })} />
        </div>
    );
};

export default AdminDashboard;
