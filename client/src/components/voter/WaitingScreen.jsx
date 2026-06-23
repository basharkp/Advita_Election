import { Vote, Lock, Monitor, ArrowRight, ArrowLeft } from 'lucide-react';

const WaitingScreen = ({ status, onStart, boothName, isBoothMode, electionName, onChangeBooth }) => {
    const isRunning = status === 'RUNNING';
    const isPaused = status === 'PAUSED';
    const isStopped = status === 'STOPPED';
    const isNotStarted = status === 'NOT_STARTED';
    
    const displayElectionName = electionName || 'Student Council Election';

    const getStatusText = () => {
        if (isNotStarted) return { title: 'Voting is Closed', text: 'Voting is currently closed. Please wait for the administrator to start the election.' };
        if (isPaused) return { title: 'Voting Paused', text: 'Voting has been paused temporarily. Please wait.' };
        if (isStopped) return { title: 'Election Ended', text: 'Election has ended. Voting is no longer available.' };
        if (isRunning) return { title: 'Welcome, Voter', text: 'Ready to cast your vote? Press Start Voting when enabled.' };
        return { title: 'System Inactive', text: 'Please wait for the election administrator to start the session.' };
    };

    const statusContent = getStatusText();

    return (
        <div className="voter-layout text-center animate-fade-in" style={{ padding: '2rem', position: 'relative' }}>
            {/* Top Bar for Booth Controls */}
            {onChangeBooth && (
                <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
                    <button 
                        onClick={onChangeBooth}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem' }}
                    >
                        <ArrowLeft size={18} /> Change Booth
                    </button>
                </div>
            )}

            {/* Header / Context */}
            <div className="flex-center" style={{ flexDirection: 'column', marginBottom: '3rem', marginTop: onChangeBooth ? '2rem' : '0' }}>
                <div style={{ 
                    marginBottom: '1.5rem',
                    background: 'white', 
                    borderRadius: '12px', 
                    boxShadow: 'var(--shadow-sm)',
                    height: '6rem',
                    width: '12rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.2rem 0.5rem'
                }}>
                    <img 
                        src="/school_logo.png" 
                        alt="Advita International School Logo" 
                        style={{ height: '100%', width: '100%', objectFit: 'contain' }} 
                    />
                </div>
                
                <h1 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: 1.1 }}>
                    {isRunning ? displayElectionName : statusContent.title}
                </h1>
                
                <div className="flex-center" style={{ gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--neutral-100)', padding: '0.4rem 1rem', borderRadius: 'var(--radius-full)', border: '1px solid var(--neutral-200)' }}>
                        <Monitor size={16} />
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{boothName || 'Voting Station'}</span>
                    </div>
                    <span className={`badge ${isRunning ? 'badge-success' : 'badge-neutral'}`} style={{ padding: '0.4rem 1rem' }}>
                        {isRunning ? 'Online & Ready' : status}
                    </span>
                </div>
            </div>

            {/* Main Action Area */}
            <div className="card" style={{ maxWidth: '600px', margin: '0 auto', padding: '3rem', border: 'none', background: 'white', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' }}>
                {isRunning ? (
                    <>
                        <h2 style={{ fontSize: '1.75rem', marginBottom: '1.5rem', fontWeight: 700 }}>{statusContent.title}</h2>
                        <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.6 }}>
                            {statusContent.text}
                        </p>
                        <button
                            onClick={onStart}
                            className="btn btn-primary"
                            style={{
                                padding: '1.25rem 4rem',
                                fontSize: '1.5rem',
                                fontWeight: 700,
                                borderRadius: 'var(--radius-lg)',
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '1rem',
                                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)'
                            }}
                        >
                            Start Voting <ArrowRight size={24} />
                        </button>
                    </>
                ) : (
                    <>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--neutral-500)', fontWeight: 600 }}>{statusContent.title}</h2>
                        <p style={{ fontSize: '1rem', color: 'var(--neutral-400)', marginTop: '1rem' }}>
                            {statusContent.text}
                        </p>
                        <div style={{ marginTop: '2rem' }}>
                            {isPaused || isNotStarted ? (
                                <div className="loader" style={{ margin: '0 auto', opacity: 0.5 }}></div>
                            ) : null}
                        </div>
                    </>
                )}
            </div>

            {/* Footer Tip */}
            <p style={{ marginTop: '3rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                Tip: Your vote is anonymous and secure.
            </p>
        </div>
    );
};

export default WaitingScreen;
