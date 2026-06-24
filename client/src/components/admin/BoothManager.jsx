import { useState, useEffect, useCallback, memo } from 'react';
import api from '../../api/axios';
import {
    Monitor, Plus, Trash2, Loader2, X, Check, Eye, EyeOff
} from 'lucide-react';

// ── Memoized Stable Sub-Component: Booth Form ────────────────────────────────
// Removed animate-fade-in to prevent re-triggering animation on every keystroke
const BoothForm = memo(({ 
    isEdit, 
    onSave, 
    onCancel, 
    positions, 
    initialData 
}) => {
    const [name, setName] = useState(initialData?.name || '');
    const [passkey, setPasskey] = useState(initialData?.passkey || '');
    const [isActive, setIsActive] = useState(initialData?.isActive !== undefined ? initialData.isActive : true);
    const [selectedPositionIds, setSelectedPositionIds] = useState(initialData?.positionIds || []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name, passkey, isActive, positionIds: selectedPositionIds });
    };

    const togglePosition = (posId) => {
        setSelectedPositionIds(prev =>
            prev.includes(posId) ? prev.filter(id => id !== posId) : [...prev, posId]
        );
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="card shadow-lg"
            style={{ marginBottom: '2rem', borderColor: 'var(--primary)', borderWidth: '2px' }}
        >
            <div className="flex-between" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                    {isEdit ? `Edit Station: ${initialData.name}` : 'Setup New Voting Station'}
                </h3>
                <button type="button" onClick={onCancel} className="btn btn-ghost" style={{ padding: '0.25rem' }}>
                    <X size={20} />
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                {/* Left Column: Basic Info */}
                <div className="space-y-4">
                    <div>
                        <label className="label" style={{ fontWeight: 600 }}>Station Name / Location *</label>
                        <input
                            type="text"
                            placeholder="e.g. Lab 1, PC-04"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="label" style={{ fontWeight: 600 }}>Access Passkey (Optional)</label>
                        <input
                            type="password"
                            placeholder="Password for station setup"
                            value={passkey}
                            onChange={e => setPasskey(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '1rem', marginTop: '1.5rem' }}>
                        <button 
                            type="button" 
                            onClick={() => setIsActive(!isActive)}
                            className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ gap: '0.5rem' }}
                        >
                            {isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                            {isActive ? 'Visible to Voters' : 'Hidden from Voters'}
                        </button>
                    </div>
                </div>

                {/* Right Column: Position Assignment */}
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label className="label" style={{ fontWeight: 600, marginBottom: 0 }}>Assigned Ballot Positions</label>
                        {positions.length > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const allSelected = selectedPositionIds.length === positions.length;
                                    if (allSelected) {
                                        setSelectedPositionIds([]);
                                    } else {
                                        setSelectedPositionIds(positions.map(p => p.id));
                                    }
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--primary)',
                                    cursor: 'pointer',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    padding: 0,
                                }}
                            >
                                {selectedPositionIds.length === positions.length ? 'Deselect All' : 'Select All'}
                            </button>
                        )}
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                        Only selected positions will appear at this station. Leave empty for all.
                    </p>
                    <div style={{
                        border: '1px solid var(--neutral-300)',
                        borderRadius: 'var(--radius-md)',
                        maxHeight: '200px',
                        overflowY: 'auto'
                    }}>
                        {positions.length === 0 ? (
                            <p style={{ padding: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>No positions found.</p>
                        ) : (
                            positions.map((pos, idx) => {
                                const isSelected = selectedPositionIds.includes(pos.id);
                                return (
                                    <div
                                        key={pos.id}
                                        onClick={() => togglePosition(pos.id)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '0.75rem',
                                            padding: '0.75rem 1rem', cursor: 'pointer',
                                            background: isSelected ? 'var(--primary-light)' : 'white',
                                            borderBottom: idx < positions.length - 1 ? '1px solid var(--neutral-200)' : 'none'
                                        }}
                                    >
                                        <div style={{
                                            width: '18px', height: '18px', borderRadius: '4px',
                                            border: '2px solid ' + (isSelected ? 'var(--primary)' : 'var(--neutral-300)'),
                                            background: isSelected ? 'var(--primary)' : 'white',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {isSelected && <Check size={12} color="white" />}
                                        </div>
                                        <span style={{ fontSize: '0.9rem', fontWeight: isSelected ? 600 : 400 }}>{pos.title}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-center" style={{ gap: '1rem', justifyContent: 'flex-end', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--neutral-200)' }}>
                <button type="button" onClick={onCancel} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    {isEdit ? 'Update Station' : 'Create Station'}
                </button>
            </div>
        </form>
    );
});

const BoothManager = ({ currentElectionId }) => {
    const [booths, setBooths] = useState([]);
    const [positions, setPositions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [editingBooth, setEditingBooth] = useState(null);

    const fetchBooths = useCallback(async () => {
        try {
            const { data } = await api.get('/booth');
            // Only update if data changed
            setBooths(prev => {
                if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                return data;
            });
        } catch (err) {
            console.error("Failed to fetch booths", err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPositions = useCallback(async () => {
        if (!currentElectionId) return;
        try {
            const { data } = await api.get(`/positions?electionId=${currentElectionId}`);
            setPositions(prev => {
                if (JSON.stringify(prev) === JSON.stringify(data)) return prev;
                return data;
            });
        } catch (err) {
            console.error("Failed to fetch positions", err);
        }
    }, [currentElectionId]);

    useEffect(() => {
        fetchBooths();
        fetchPositions();
        
        // Polling logic: Pauses background updates when form is open to prevent UI noise
        let interval;
        if (!showCreate && !editingBooth) {
            interval = setInterval(fetchBooths, 5000);
        }
        
        return () => { if (interval) clearInterval(interval); };
    }, [fetchBooths, fetchPositions, showCreate, editingBooth]);

    const handleCreate = useCallback(async (formData) => {
        setActionLoading('creating');
        try {
            await api.post('/booth/create', { ...formData, electionId: currentElectionId });
            setShowCreate(false);
            fetchBooths();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to create booth");
        } finally {
            setActionLoading(null);
        }
    }, [currentElectionId, fetchBooths]);

    const handleUpdate = useCallback(async (formData, boothToUpdate = editingBooth) => {
        if (!boothToUpdate) return;
        setActionLoading(boothToUpdate.id);
        try {
            await api.put(`/booth/${boothToUpdate.id}`, formData);
            setEditingBooth(null);
            fetchBooths();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update booth");
        } finally {
            setActionLoading(null);
        }
    }, [editingBooth, fetchBooths]);

    const deleteBooth = useCallback(async (id) => {
        if (!window.confirm("Are you sure you want to delete this station?")) return;
        setActionLoading(id);
        try {
            await api.delete(`/booth/${id}`);
            fetchBooths();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete booth");
        } finally {
            setActionLoading(null);
        }
    }, [fetchBooths]);

    if (loading && booths.length === 0) return (
        <div className="flex-center" style={{ height: '300px', flexDirection: 'column', gap: '1rem' }}>
            <Loader2 className="animate-spin" size={40} color="var(--primary)" />
            <p style={{ color: 'var(--text-muted)' }}>Syncing infrastructure...</p>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex-between">
                <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Infrastructure Management</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        Configure voting stations and assign positions.
                    </p>
                </div>
                {!showCreate && !editingBooth && (
                    <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                        <Plus size={20} /> Add Station
                    </button>
                )}
            </div>

            {/* Form Section: Using stable keys to prevent remounts */}
            {showCreate && (
                <BoothForm 
                    key="static-create-form"
                    isEdit={false} 
                    onSave={handleCreate} 
                    onCancel={() => setShowCreate(false)} 
                    positions={positions} 
                />
            )}
            {editingBooth && (
                <BoothForm 
                    key={`edit-form-${editingBooth.id}`}
                    isEdit={true} 
                    initialData={editingBooth}
                    onSave={handleUpdate} 
                    onCancel={() => setEditingBooth(null)} 
                    positions={positions} 
                />
            )}

            {/* List Section */}
            <div className="grid-cols-2" style={{ gap: '1.5rem' }}>
                {booths.map(booth => {
                    const assignedPositionNames = (booth.positionIds || [])
                        .map(id => positions.find(p => p.id === id)?.title)
                        .filter(Boolean);

                    return (
                        <div key={booth.id} className="card" style={{
                            borderLeft: `6px solid ${booth.isActive ? 'var(--primary)' : 'var(--neutral-400)'}`,
                            opacity: actionLoading === booth.id ? 0.6 : 1,
                            display: 'flex', flexDirection: 'column'
                        }}>
                            <div className="flex-between" style={{ marginBottom: '1rem' }}>
                                <div className="flex-center" style={{ gap: '1rem' }}>
                                    <div style={{ 
                                        padding: '0.75rem', 
                                        background: booth.isActive ? 'var(--primary-light)' : 'var(--neutral-100)',
                                        borderRadius: '12px',
                                        color: booth.isActive ? 'var(--primary)' : 'var(--neutral-500)'
                                    }}>
                                        <Monitor size={24} />
                                    </div>
                                    <div>
                                        <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>{booth.name}</h4>
                                        <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem', marginTop: '0.25rem' }}>
                                            <span className={`badge ${booth.isActive ? 'badge-success' : 'badge-neutral'}`} style={{ fontSize: '0.7rem' }}>
                                                {booth.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                            {booth.passkey && <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>🔑 Protected</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-center" style={{ gap: '0.5rem' }}>
                                    <button 
                                        onClick={() => handleUpdate({ isActive: !booth.isActive }, booth)} 
                                        className="btn btn-ghost" 
                                        style={{ padding: '0.5rem', color: booth.isActive ? 'var(--primary)' : 'var(--neutral-400)' }}
                                    >
                                        {booth.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                                    </button>
                                    <button onClick={() => setEditingBooth(booth)} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                                        ✏️
                                    </button>
                                    <button onClick={() => deleteBooth(booth.id)} className="btn btn-ghost" style={{ color: 'var(--danger)', padding: '0.5rem' }}>
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Assigned Positions:
                                </p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                    {assignedPositionNames.length > 0 ? assignedPositionNames.map(name => (
                                        <span key={name} style={{ 
                                            background: 'var(--neutral-100)', 
                                            padding: '0.2rem 0.6rem', 
                                            borderRadius: '6px', 
                                            fontSize: '0.75rem',
                                            border: '1px solid var(--neutral-200)'
                                        }}>{name}</span>
                                    )) : (
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>All positions available</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default BoothManager;
