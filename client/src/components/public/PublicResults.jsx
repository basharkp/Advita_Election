import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/axios';
import { RefreshCw, Trophy, LayoutGrid, Monitor, Lock, ShieldAlert, FileSearch } from 'lucide-react';

const PublicResults = () => {
    const { electionId } = useParams();
    const [aggregatedResults, setAggregatedResults] = useState([]);
    const [boothWiseResults, setBoothWiseResults] = useState([]);
    const [positions, setPositions] = useState([]);
    const [electionName, setElectionName] = useState('Election');
    const [electionStatus, setElectionStatus] = useState('NOT_STARTED');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [activeTab, setActiveTab] = useState('position'); // 'position' or 'booth'

    const fetchData = async () => {
        try {
            const url = electionId 
                ? `/vote/public-results?electionId=${electionId}`
                : `/vote/public-results`;

            const posUrl = electionId
                ? `/positions?electionId=${electionId}`
                : `/positions`;

            const [res, positionsRes] = await Promise.all([
                api.get(url),
                api.get(posUrl)
            ]);
            
            setAggregatedResults(res.data.aggregated || []);
            setBoothWiseResults(res.data.boothWise || []);
            setElectionName(res.data.electionName || 'Election');
            setElectionStatus(res.data.electionStatus || 'NOT_STARTED');
            setPositions(positionsRes.data || []);
            setLastUpdated(new Date());
            setError(null);
            setLoading(false);
        } catch (err) {
            console.error("Error fetching public results:", err);
            if (err.response?.status === 403) {
                setError({
                    type: 'private',
                    message: err.response.data.error || 'Results are not public yet.'
                });
            } else if (err.response?.status === 404) {
                setError({
                    type: 'not_found',
                    message: err.response.data.error || 'The requested election results could not be found.'
                });
            } else {
                setError({
                    type: 'error',
                    message: 'Failed to connect to the server. Please try again later.'
                });
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, [electionId]);

    if (loading) {
        return (
            <div className="flex-center" style={{ minHeight: '80vh', flexDirection: 'column', gap: '1rem' }}>
                <div className="loader" style={{ width: '3rem', height: '3rem' }}></div>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', fontWeight: 500 }} className="animate-pulse">
                    Retrieving public election results...
                </p>
            </div>
        );
    }

    if (error && error.type === 'not_found') {
        return (
            <div className="flex-center" style={{ minHeight: '80vh', padding: '2rem' }}>
                <div className="card text-center animate-fade-in" style={{ maxWidth: '500px', padding: '3.5rem 2rem', boxShadow: 'var(--shadow-xl)', borderLeft: '4px solid var(--warning)' }}>
                    <div style={{
                        background: 'var(--neutral-100)',
                        width: '4.5rem',
                        height: '4.5rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: 'var(--warning)'
                    }}>
                        <FileSearch size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 800 }}>Election Not Found</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                        {error.message}
                    </p>
                </div>
            </div>
        );
    }

    if (error && error.type === 'private') {
        return (
            <div className="flex-center" style={{ minHeight: '80vh', padding: '2rem' }}>
                <div className="card text-center animate-fade-in" style={{ maxWidth: '500px', padding: '3.5rem 2rem', boxShadow: 'var(--shadow-xl)' }}>
                    <div style={{
                        background: 'var(--neutral-100)',
                        width: '4.5rem',
                        height: '4.5rem',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.5rem',
                        color: 'var(--neutral-600)'
                    }}>
                        <Lock size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', fontWeight: 800 }}>Results Sealed</h2>
                    <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '2rem' }}>
                        {error.message}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button onClick={fetchData} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <RefreshCw size={16} /> Check Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex-center" style={{ minHeight: '80vh', padding: '2rem' }}>
                <div className="card text-center animate-fade-in" style={{ maxWidth: '500px', padding: '3.5rem 2rem', borderLeft: '4px solid var(--danger)' }}>
                    <ShieldAlert size={48} className="text-danger" style={{ margin: '0 auto 1.5rem' }} />
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Connection Error</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error.message}</p>
                    <button onClick={fetchData} className="btn btn-outline" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}>
                        <RefreshCw size={16} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    const isLive = electionStatus === 'RUNNING';
    const isStopped = electionStatus === 'STOPPED';

    return (
        <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem' }} className="space-y-6">
            {/* Header Card */}
            <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <span className={`badge ${isLive ? 'badge-success pulse' : isStopped ? 'badge-neutral' : 'badge-warning'}`} style={{ marginBottom: '0.5rem' }}>
                        {isLive ? 'Live Results' : isStopped ? 'Final Results' : 'Inactive'}
                    </span>
                    <h1 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Trophy className={isLive ? "text-green-500 animate-pulse" : "text-yellow-500"} />
                        {electionName}
                    </h1>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                        Last Updated: {lastUpdated.toLocaleTimeString()}
                    </p>
                </div>
                <button onClick={fetchData} className="btn btn-ghost" title="Refresh Now">
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Combined Results View */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem' }}>
                {positions.map(pos => {
                    const candidates = (pos.candidates || []).map(c => {
                        const resCand = aggregatedResults.find(r => r.id === c.id);
                        return { ...c, votes: resCand ? resCand.votes : 0 };
                    });

                    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

                    // Group candidates by votes
                    const grouped = candidates.reduce((acc, candidate) => {
                        if (!acc[candidate.votes]) {
                            acc[candidate.votes] = [];
                        }
                        acc[candidate.votes].push(candidate);
                        return acc;
                    }, {});

                    const groupedArray = Object.entries(grouped)
                        .map(([votes, list]) => ({
                            votes: Number(votes),
                            list,
                            names: list.map(c => c.name).join(", ")
                        }))
                        .sort((a, b) => b.votes - a.votes);

                    return (
                        <div key={pos.id} className="card">
                            <div className="section-header" style={{ borderBottomColor: 'var(--neutral-100)' }}>
                                <h3 style={{ fontSize: '1.1rem' }}>{pos.title}</h3>
                                <span className="badge badge-neutral">{totalVotes} Votes</span>
                            </div>
                            <div className="space-y-4" style={{ marginTop: '1rem' }}>
                                {groupedArray.map((group, idx) => {
                                    const isUnopposed = candidates.length === 1;
                                    const percentage = isUnopposed ? 100 : (totalVotes > 0 ? ((group.votes / totalVotes) * 100).toFixed(1) : 0);
                                    const isWinner = (idx === 0 && group.votes > 0) || isUnopposed;
                                    
                                    return (
                                        <div key={group.votes}>
                                            <div className="flex-between" style={{ marginBottom: '0.5rem' }}>
                                                <span style={{ fontWeight: isWinner ? 700 : 500 }}>
                                                    {isWinner && <Trophy size={14} style={{ color: '#fbbf24', display: 'inline', marginRight: '4px' }} />}
                                                    {group.names}
                                                </span>
                                                <span style={{ fontWeight: 600 }}>
                                                    {isUnopposed ? 'Declared Winner (Unopposed)' : `${group.votes} (${percentage}%)`}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', background: 'var(--neutral-100)', borderRadius: '4px', overflow: 'hidden' }}>
                                                <div style={{ 
                                                    width: `${percentage}%`, 
                                                    height: '100%', 
                                                    background: isWinner ? 'var(--primary)' : 'var(--neutral-300)',
                                                    transition: 'width 0.5s ease-out'
                                                }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {pos.candidates.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No candidates</p>}
                            </div>
                        </div>
                    );
                })}
                {positions.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic', padding: '3rem', gridColumn: 'span 2' }}>
                        No results found.
                    </p>
                )}
            </div>
        </div>
    );
};

export default PublicResults;
