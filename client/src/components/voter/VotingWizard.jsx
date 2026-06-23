import { useState, useContext } from 'react';
import VoteContext from '../../context/VoteContext';
import { ArrowRight, Check, ArrowLeft } from 'lucide-react';
import { BASE_URL, getImageUrl } from '../../api/axios';

const VotingWizard = ({ positions, onComplete, onCancel, onChangeBooth, boothId, sessionId }) => {
    const { selectCandidate, votes, submitVotes } = useContext(VoteContext);
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const currentPosition = positions[currentStep];
    const isLastStep = currentStep === positions.length - 1;
    const selectedCandidateId = votes[currentPosition?.id];

    // If no positions, handled gracefully
    if (!positions || positions.length === 0) {
        return (
            <div className="voter-layout">
                <div className="card text-center">
                    <p>No positions configured.</p>
                    <button onClick={onCancel} className="btn btn-ghost">Exit</button>
                </div>
            </div>
        );
    }

    const handleNext = () => {
        setCurrentStep(prev => prev + 1);
    };

    const handleFinalSubmit = async () => {
        setIsSubmitting(true);
        const success = await submitVotes(boothId, sessionId);
        setIsSubmitting(false);
        if (success) {
            onComplete();
        } else {
            alert("Submission failed. Please try again.");
        }
    };

    // Summary View
    if (currentStep === positions.length) {
        return (
            <div className="voter-layout" style={{ position: 'relative' }}>
                <div style={{ 
                    position: 'absolute', 
                    top: '1.5rem', 
                    right: '2rem', 
                    background: 'white', 
                    borderRadius: '10px', 
                    boxShadow: 'var(--shadow-md)',
                    height: '4.5rem',
                    width: '9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.2rem 0.4rem'
                }}>
                    <img 
                        src="/school_logo.png" 
                        alt="School Logo" 
                        style={{ height: '100%', width: '100%', objectFit: 'contain' }}
                    />
                </div>
                <div className="wizard-card animate-fade-in">
                    <h2 style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                        Confirm Your Votes
                    </h2>

                    <div style={{ maxHeight: '60vh', overflowY: 'auto', marginBottom: '2rem' }}>
                        {positions.map(pos => {
                            const candidateId = votes[pos.id];
                            const candidate = pos.candidates.find(c => c.id === candidateId);
                            return (
                                <div key={pos.id} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '1rem', background: 'var(--neutral-50)', borderRadius: 'var(--radius-md)', marginBottom: '0.5rem'
                                }}>
                                    <span style={{ fontWeight: 500, color: 'var(--text-muted)' }}>{pos.title}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{candidate ? candidate.name : "Skipped"}</span>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid-cols-2">
                        <button
                            onClick={() => setCurrentStep(0)}
                            disabled={isSubmitting}
                            className="btn btn-secondary"
                            style={{ width: '100%' }}
                        >
                            Change Votes
                        </button>
                        <button
                            onClick={handleFinalSubmit}
                            disabled={isSubmitting}
                            className="btn btn-primary"
                            style={{ width: '100%', fontSize: '1.1rem' }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Normal Voting View
    return (
        <div className="voter-layout" style={{ justifyContent: 'flex-start', paddingTop: '2rem', position: 'relative' }}>
            
            {/* School Logo */}
            <div style={{ 
                position: 'absolute', 
                top: '1rem', 
                right: '2rem', 
                background: 'white', 
                borderRadius: '10px', 
                boxShadow: 'var(--shadow-md)',
                height: '4.5rem',
                width: '9rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.2rem 0.4rem'
            }}>
                <img 
                    src="/school_logo.png" 
                    alt="School Logo" 
                    style={{ height: '100%', width: '100%', objectFit: 'contain' }}
                />
            </div>

            {/* Top Bar for Booth Controls */}
            {onChangeBooth && (
                <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
                    <button 
                        onClick={onChangeBooth}
                        className="btn btn-outline"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.9rem' }}
                    >
                        <ArrowLeft size={16} /> Change Booth
                    </button>
                </div>
            )}

            {/* Header / Progress */}
            <div className="wizard-card" style={{ padding: '1rem 2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Position {currentStep + 1} of {positions.length}
                </div>
                <div style={{ width: '200px', height: '8px', background: 'var(--neutral-200)', borderRadius: '99px', overflow: 'hidden' }}>
                    <div
                        style={{
                            height: '100%', background: 'var(--primary)',
                            width: `${((currentStep + 1) / positions.length) * 100}%`,
                            transition: 'width 0.5s ease'
                        }}
                    />
                </div>
            </div>

            {/* Voting Area */}
            <div className="wizard-card animate-fade-in" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>{currentPosition.title}</h1>
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2.5rem' }}>Select one candidate</p>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '1.25rem',
                    marginBottom: '3rem'
                }}>
                    {currentPosition.candidates.map(candidate => {
                        const isSelected = selectedCandidateId === candidate.id;
                        return (
                            <button
                                key={candidate.id}
                                onClick={() => {
                                    selectCandidate(currentPosition.id, candidate.id);
                                    handleNext();
                                }}
                                className="card"
                                style={{
                                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                                    border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
                                    background: isSelected ? 'var(--neutral-50)' : 'white',
                                    transform: isSelected ? 'scale(1.02)' : 'none',
                                    boxShadow: isSelected ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    padding: '1.25rem 1rem'
                                }}
                            >
                                {isSelected && (
                                    <div style={{
                                        position: 'absolute', top: '0.75rem', right: '0.75rem',
                                        color: 'white', background: 'var(--primary)',
                                        borderRadius: '50%', padding: '0.25rem'
                                    }}>
                                        <Check size={14} />
                                    </div>
                                )}

                                <div style={{
                                    width: '7rem', height: '7rem', borderRadius: '50%',
                                    overflow: 'hidden', background: 'var(--neutral-200)',
                                    marginBottom: '0.75rem', border: '3px solid white', boxShadow: 'var(--shadow-md)'
                                }}>
                                    {candidate.photoUrl ? (
                                        <img
                                            src={getImageUrl(candidate.photoUrl)}
                                            alt={candidate.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                    ) : (
                                        <div className="flex-center" style={{ width: '100%', height: '100%', fontSize: '2.5rem', fontWeight: 700, color: 'var(--neutral-400)' }}>
                                            {candidate.name.charAt(0)}
                                        </div>
                                    )}
                                </div>

                                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem', textAlign: 'center' }}>{candidate.name}</h3>

                                {candidate.symbolUrl && (
                                    <div style={{ height: '4rem', width: '4rem', marginTop: '0.5rem' }}>
                                        <img src={getImageUrl(candidate.symbolUrl)} alt="Symbol" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default VotingWizard;
