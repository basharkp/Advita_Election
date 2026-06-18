import { useNavigate } from 'react-router-dom';
import { Vote, ArrowRight } from 'lucide-react';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="flex-center" style={{ minHeight: '100vh', background: 'var(--background)', padding: '2rem' }}>
            <div className="card text-center animate-fade-in" style={{ maxWidth: '600px', width: '100%', padding: '4rem 2rem' }}>
                <div className="flex-center" style={{ marginBottom: '2rem', color: 'var(--primary)' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '1.5rem', borderRadius: '50%' }}>
                        <Vote size={80} />
                    </div>
                </div>
                
                <h1 style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-main)' }}>
                    School Election System
                </h1>
                
                <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '3rem', lineHeight: 1.6 }}>
                    Welcome to the secure digital voting platform. 
                    Please proceed to your designated voting booth to cast your vote.
                </p>

                <button 
                    onClick={() => navigate('/vote')}
                    className="btn btn-primary"
                    style={{
                        padding: '1.25rem 3rem',
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-lg)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    Enter Voting Booth <ArrowRight size={24} />
                </button>
            </div>

            {/* Subtle Admin Access */}
            <div 
                style={{
                    position: 'absolute',
                    bottom: '1.5rem',
                    right: '2rem',
                    opacity: 0.4,
                    transition: 'opacity 0.2s ease-in-out',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    color: 'var(--text-muted)',
                    fontWeight: 500
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

export default LandingPage;
