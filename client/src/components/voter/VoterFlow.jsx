import { useState, useEffect, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axios';
import VoteContext from '../../context/VoteContext';
import WaitingScreen from './WaitingScreen';
import VotingWizard from './VotingWizard';
import { CheckCircle, Lock } from 'lucide-react';

const VoterFlow = () => {
    const { endSession, clearBooth } = useContext(VoteContext);

    // ── UI state ──────────────────────────────────────────────────────────────
    // Statuses: LOADING | READY | VOTING | SUCCESS | LOCKED | ELECTION_CLOSED
    const [status, setStatus] = useState('LOADING'); 
    const [electionStatus, setElectionStatus] = useState('NOT_STARTED');
    const [electionName, setElectionName] = useState('');
    const [positions, setPositions] = useState([]);
    const [boothName, setBoothName] = useState('');
    const [currentSessionId, setCurrentSessionId] = useState(null);

    // ── Refs for stable polling ───────────────────────────────────────────────
    const location = useLocation();
    const [boothId, setBoothId] = useState(() => localStorage.getItem('boothId'));
    
    const electionIdRef = useRef(null);
    const boothPositionIdsRef = useRef([]);
    const statusRef = useRef('LOADING');

    useEffect(() => {
        statusRef.current = status;
    }, [status]);

    // ── Auto-transition when Admin starts election ────────────────────────────
    useEffect(() => {
        if (electionStatus === 'RUNNING' && status === 'ELECTION_CLOSED') {
            setStatus('VOTING');
        }
    }, [electionStatus, status]);

    // ── Initial setup ─────────────────────────────────────────────────────────
    useEffect(() => {
        const activeBoothId = localStorage.getItem('boothId');
        const activeBoothName = localStorage.getItem('boothName');
        setBoothId(activeBoothId);
        setBoothName(activeBoothName || 'Booth');

        if (!activeBoothId) {
            window.location.href = '/booth/setup';
        }
    }, [location]);

    // ── Polling Logic ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!boothId) return;

        const checkStatus = async () => {
            try {
                // 1. Poll Booth State
                const boothRes = await api.get(`/booth/${boothId}/poll`);
                const booth = boothRes.data;
                
                setCurrentSessionId(booth.currentSessionId);

                // 2. Manage Election Metadata
                if (booth.electionId && booth.electionId !== electionIdRef.current) {
                    electionIdRef.current = booth.electionId;
                    const eleRes = await api.get(`/election/${booth.electionId}`);
                    setElectionStatus(eleRes.data.status);
                    setElectionName(eleRes.data.name || '');
                    
                    boothPositionIdsRef.current = booth.positionIds || [];
                    await fetchPositionsForBooth(booth.electionId, boothPositionIdsRef.current);
                } else if (booth.electionId) {
                    const eleRes = await api.get(`/election/${booth.electionId}`);
                    const newEleStatus = eleRes.data.status;
                    setElectionStatus(newEleStatus);

                    // ── Main State Machine ───────────────────────────────────
                    // Success state is persistent for its timeout duration
                    if (statusRef.current === 'SUCCESS') return;

                    // If election is not running, always show closed/waiting
                    if (newEleStatus !== 'RUNNING') {
                        setStatus('ELECTION_CLOSED');
                        return;
                    }

                    // If booth is manually locked or deactivated by admin
                    if (booth.status === 'LOCKED' || booth.isActive === false) {
                        setStatus('LOCKED');
                        return;
                    }

                    // If we reach here, election is RUNNING.
                    // If we are currently LOADING or ELECTION_CLOSED, move to READY.
                    if (statusRef.current === 'LOADING' || statusRef.current === 'ELECTION_CLOSED' || statusRef.current === 'LOCKED') {
                        setStatus('READY');
                    }
                } else {
                    setStatus('LOADING');
                }
            } catch (err) {
                console.error("Polling error", err);
                if (err.response?.status === 404) {
                    clearBooth();
                    window.location.href = '/';
                }
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 3000);
        return () => clearInterval(interval);
    }, [boothId]);

    const fetchPositionsForBooth = async (electionId, assignedPositionIds) => {
        try {
            const { data } = await api.get(`/positions?electionId=${electionId}`);
            let filtered = data;
            if (assignedPositionIds && assignedPositionIds.length > 0) {
                filtered = data.filter(p => assignedPositionIds.includes(p.id));
            }
            const valid = filtered.filter(p => p.candidates && p.candidates.length >= 2);
            setPositions(valid);
        } catch (err) {
            console.error("Failed to fetch positions", err);
        }
    };

    const handleStartVoting = () => {
        if (electionStatus === 'RUNNING') {
            setStatus('VOTING');
        }
    };

    const handleFinish = () => {
        setStatus('SUCCESS');
        setTimeout(() => {
            endSession();
            setStatus('READY');
        }, 4000); // 4 seconds of success screen then reset to ready
    };

    if (!boothId) return null;

    // ── SUCCESS SCREEN ───────────────────────────────────────────────────────
    if (status === 'SUCCESS') {
        return (
            <div className="voter-layout animate-fade-in" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem', color: 'var(--success)' }}>
                    <CheckCircle size={120} className="animate-bounce" />
                </div>
                <h1 style={{ fontSize: '3rem', color: 'var(--success)', fontWeight: 800 }}>Vote Recorded!</h1>
                <p style={{ fontSize: '1.5rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                    Thank you for participating in the election.
                </p>
                <div style={{ marginTop: '3rem' }}>
                    <div className="loader-bar" style={{ width: '200px', margin: '0 auto' }}></div>
                    <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        Resetting for next voter...
                    </p>
                </div>
            </div>
        );
    }

    // ── LOCKED SCREEN ────────────────────────────────────────────────────────
    if (status === 'LOCKED') {
        return (
            <div className="voter-layout animate-fade-in" style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: '2rem', color: 'var(--danger)' }}>
                    <Lock size={100} />
                </div>
                <h1 style={{ fontSize: '2.5rem', color: 'var(--danger)' }}>Station Locked</h1>
                <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}>
                    This station has been disabled by the administrator.
                </p>
            </div>
        );
    }

    // ── VOTING WIZARD ────────────────────────────────────────────────────────
    if (status === 'VOTING') {
        if (!currentSessionId) {
            // Guard: don't open voting without a session
            return <div className="loader" style={{ margin: '5rem auto' }}></div>;
        }
        return (
            <VotingWizard
                positions={positions}
                boothId={boothId}
                sessionId={currentSessionId}
                onComplete={handleFinish}
                onCancel={() => {
                    endSession();
                    setStatus('READY');
                }}
                onChangeBooth={() => {
                    clearBooth();
                    window.location.href = '/';
                }}
            />
        );
    }

    // ── WAITING / READY SCREEN ───────────────────────────────────────────────
    return (
        <WaitingScreen
            status={electionStatus}
            boothName={boothName}
            electionName={electionName}
            isBoothMode={true}
            onStart={handleStartVoting}
            onChangeBooth={() => {
                clearBooth();
                window.location.href = '/';
            }}
        />
    );
};

export default VoterFlow;
