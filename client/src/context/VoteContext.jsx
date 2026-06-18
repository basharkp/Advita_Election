import { createContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api/axios';

const VoteContext = createContext();

export const VoteProvider = ({ children }) => {
    const location = useLocation();
    const [boothId, setBoothId] = useState(() => localStorage.getItem('boothId'));
    const [sessionToken, setSessionToken] = useState(sessionStorage.getItem('voteSessionToken'));
    const [sessionId, setSessionId] = useState(sessionStorage.getItem('voteSessionId'));

    // Voting state: { [positionId]: candidateId }
    const [votes, setVotes] = useState({});

    useEffect(() => {
        const activeBoothId = localStorage.getItem('boothId');
        if (activeBoothId !== boothId) {
            setBoothId(activeBoothId);
            setVotes({});
            setSessionToken(null);
            setSessionId(null);
            sessionStorage.removeItem('voteSessionToken');
            sessionStorage.removeItem('voteSessionId');
        }
    }, [location, boothId]);

    const startSession = async () => {
        try {
            const { data } = await api.post('/vote/start');
            setSessionToken(data.token);
            setSessionId(data.sessionId);
            sessionStorage.setItem('voteSessionToken', data.token);
            sessionStorage.setItem('voteSessionId', data.sessionId);

            // Clear previous votes just in case
            setVotes({});
            return true;
        } catch (error) {
            console.error("Failed to start session", error);
            return false;
        }
    };

    const selectCandidate = (positionId, candidateId) => {
        setVotes(prev => ({ ...prev, [positionId]: candidateId }));
    };

    const submitVotes = async (boothId = null, sessionId = null) => {
        try {
            // Transform map to array
            const votePayload = Object.keys(votes).map(posId => ({
                positionId: posId,
                candidateId: votes[posId]
            }));

            await api.post('/vote/submit', { votes: votePayload, boothId, sessionId });

            // Cleanup
            endSession();
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    };

    const endSession = () => {
        setSessionToken(null);
        setSessionId(null);
        setVotes({});
        sessionStorage.removeItem('voteSessionToken');
        sessionStorage.removeItem('voteSessionId');
    };

    const clearBooth = () => {
        localStorage.removeItem('boothId');
        localStorage.removeItem('boothName');
        setBoothId(null);
        endSession();
    };

    return (
        <VoteContext.Provider value={{ sessionToken, votes, startSession, selectCandidate, submitVotes, endSession, clearBooth }}>
            {children}
        </VoteContext.Provider>
    );
};

export default VoteContext;
