import { useState, useEffect } from 'react';
import api, { BASE_URL, getImageUrl } from '../../api/axios';
import { Trash2, Plus, Upload, Pencil, Crop as CropIcon, X, Check, ChevronRight, GripVertical, AlertTriangle, ImageIcon } from 'lucide-react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import './CandidateManager.css';

// Sortable Item Component
function SortableCandidateRow({ candidate, activeId, onEdit, onDelete, isEditable }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: candidate.id, disabled: !isEditable });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 1000 : 'auto',
        position: 'relative',
        opacity: isDragging ? 0.8 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`
                flex items-center gap-4 p-3 mb-2 rounded-lg border transition-all duration-200 bg-white
                ${activeId === candidate.id ? 'border-primary ring-1 ring-primary-light shadow-md' : 'border-neutral-200 hover:border-neutral-300 shadow-sm'}
                ${isDragging ? 'shadow-xl scale-[1.02]' : ''}
            `}
        >
            {/* Drag Handle */}
            {isEditable && (
                <div {...attributes} {...listeners} className="cursor-grab text-neutral-400 hover:text-primary transition-colors p-1">
                    <GripVertical size={20} />
                </div>
            )}

            {/* Photo */}
            <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-neutral-200 bg-neutral-100 relative">
                {candidate.photoUrl ? (
                    <img src={getImageUrl(candidate.photoUrl)} alt={candidate.name} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400">
                        <span className="text-[10px] font-bold">N/A</span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-medium bg-neutral-100 text-neutral-600 px-1.5 py-0.5 rounded border border-neutral-200">
                        #{candidate.order}
                    </span>
                    <h4 className="font-semibold text-neutral-900 truncate">{candidate.name}</h4>
                </div>
            </div>

            {/* Symbol */}
            {candidate.symbolUrl && (
                <div className="w-8 h-8 flex-shrink-0 border border-neutral-100 rounded-sm p-0.5 bg-white" title="Party Symbol">
                    <img src={getImageUrl(candidate.symbolUrl)} alt="Symbol" className="w-full h-full object-contain" />
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-4" onPointerDown={e => e.stopPropagation()}>
                <button
                    onClick={() => isEditable ? onEdit(candidate) : alert("Cannot edit during active election")}
                    className={`p-1.5 rounded transition-colors ${isEditable ? 'action-icon edit-icon text-blue-500 hover:text-blue-600' : 'text-neutral-200 cursor-not-allowed'}`}
                    style={{ border: 'none', background: 'transparent' }}
                    title="Edit"
                >
                    <Pencil size={18} />
                </button>
                <button
                    onClick={() => isEditable ? onDelete(candidate.id) : alert("Cannot delete during active election")}
                    className={`p-1.5 rounded transition-colors ${isEditable ? 'action-icon delete-icon text-red-500 hover:text-red-600' : 'text-neutral-200 cursor-not-allowed'}`}
                    style={{ border: 'none', background: 'transparent' }}
                    title="Delete"
                >
                    <Trash2 size={18} />
                </button>
            </div>
        </div>
    );
}

const CandidateManager = ({ electionId }) => {
    const [candidates, setCandidates] = useState([]);
    const [positions, setPositions] = useState([]);
    const [electionStatus, setElectionStatus] = useState('NOT_STARTED');

    // Form State
    const [name, setName] = useState('');
    const [posId, setPosId] = useState('');
    const [photo, setPhoto] = useState(null);
    const [photoPreview, setPhotoPreview] = useState(null);
    const [symbol, setSymbol] = useState(null);
    const [symbolPreview, setSymbolPreview] = useState(null);
    const [editingId, setEditingId] = useState(null);

    // Grouping State
    const [expandedGroups, setExpandedGroups] = useState({});

    // Cropper State
    const [isCropping, setIsCropping] = useState(false);
    const [imageSrc, setImageSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchData = async () => {
        if (!electionId) return;
        try {
            const [cRes, pRes, eRes] = await Promise.all([
                api.get(`/candidates?electionId=${electionId}`),
                api.get(`/positions?electionId=${electionId}`),
                api.get(`/election/${electionId}`)
            ]);
            setCandidates(cRes.data);
            setPositions(pRes.data);
            setElectionStatus(eRes.data.status);

            const initialExpanded = pRes.data.reduce((acc, p) => ({ ...acc, [p.id]: true }), {});
            setExpandedGroups(prev => Object.keys(prev).length === 0 ? initialExpanded : prev);

            setPosId(currentPosId => {
                if (pRes.data.length > 0) {
                    const isValidPos = pRes.data.some(p => p.id === currentPosId);
                    return isValidPos ? currentPosId : pRes.data[0].id;
                }
                return currentPosId;
            });
        } catch (err) {
            console.error("Error fetching data:", err);
        }
    };

    useEffect(() => {
        fetchData();
    }, [electionId]);

    const isEditable = ['NOT_STARTED', 'STOPPED'].includes(electionStatus);

    const onCropComplete = (croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    };

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
            e.target.value = '';
        }
    };

    const handleSaveCrop = async () => {
        try {
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            const file = new File([croppedImageBlob], "photo.jpg", { type: "image/jpeg" });

            setPhoto(file);
            setPhotoPreview(URL.createObjectURL(croppedImageBlob));

            setIsCropping(false);
            setImageSrc(null);
            setZoom(1);
            setRotation(0);
        } catch (e) {
            console.error(e);
            alert("Failed to crop image.");
        }
    };

    const handleCancelCrop = () => {
        setIsCropping(false);
        setImageSrc(null);
        setZoom(1);
        setRotation(0);
    };

    const handleSymbolSelect = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setSymbol(e.target.files[0]);
            setSymbolPreview(URL.createObjectURL(e.target.files[0]));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEditable) {
            alert("Cannot add/edit candidates while election is running/paused.");
            return;
        }

        const formData = new FormData();
        formData.append('name', name);
        formData.append('positionId', posId);
        if (photo) formData.append('photo', photo);
        if (symbol) formData.append('symbol', symbol);

        try {
            if (editingId) {
                await api.put(`/candidates/${editingId}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                await api.post('/candidates', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            resetForm();
            fetchData();
        } catch (err) {
            console.error(err);
            alert(`Failed to ${editingId ? 'update' : 'add'} candidate`);
        }
    };

    const resetForm = () => {
        setName('');
        setPhoto(null);
        setPhotoPreview(null);
        setSymbol(null);
        setSymbolPreview(null);
        setEditingId(null);

        const photoInput = document.getElementById('photo-input');
        if (photoInput) photoInput.value = '';
        const symbolInput = document.getElementById('symbol-input');
        if (symbolInput) symbolInput.value = '';
    };

    const handleDelete = async (id) => {
        if (!isEditable) return alert("Cannot delete during active election");
        if (!window.confirm("Delete candidate?")) return;
        try {
            await api.delete(`/candidates/${id}`);
            fetchData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleEdit = (candidate) => {
        if (!isEditable) return alert("Cannot edit during active election");
        setEditingId(candidate.id);
        setName(candidate.name);
        setPosId(candidate.positionId);

        setPhoto(null);
        setPhotoPreview(getImageUrl(candidate.photoUrl));

        setSymbol(null);
        setSymbolPreview(getImageUrl(candidate.symbolUrl));
    };

    const toggleGroup = (pid) => {
        setExpandedGroups(prev => ({ ...prev, [pid]: !prev[pid] }));
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const positionId = active.data.current?.sortable.containerId || candidates.find(c => c.id === active.id)?.positionId;
        const activeCandidate = candidates.find(c => c.id === active.id);
        const overCandidate = candidates.find(c => c.id === over.id);

        if (!activeCandidate || !overCandidate || activeCandidate.positionId !== overCandidate.positionId) {
            return;
        }

        const posCandidates = candidates
            .filter(c => c.positionId === activeCandidate.positionId)
            .sort((a, b) => a.order - b.order);

        const oldIndex = posCandidates.findIndex(c => c.id === active.id);
        const newIndex = posCandidates.findIndex(c => c.id === over.id);

        if (oldIndex === newIndex) return;

        const reordered = arrayMove(posCandidates, oldIndex, newIndex);
        const otherCandidates = candidates.filter(c => c.positionId !== activeCandidate.positionId);
        const reorderedWithOrders = reordered.map((c, idx) => ({ ...c, order: idx + 1 }));

        setCandidates([...otherCandidates, ...reorderedWithOrders]);

        try {
            await api.put('/candidates/reorder', {
                positionId: activeCandidate.positionId,
                candidateIds: reorderedWithOrders.map(c => c.id)
            });
        } catch (err) {
            console.error("Reorder failed", err);
            const errorMessage = err.response?.data?.details || err.response?.data?.error || err.message || "Failed to reorder candidates. Changes reverted.";
            alert(`Error: ${errorMessage}`);
            fetchData();
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative max-w-7xl mx-auto">
            {/* Form Section */}
            <div className="lg:col-span-1">
                <div className="card sticky top-24 border-t-4 border-t-primary">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold text-neutral-800 font-display">
                            {editingId ? 'Edit Candidate' : 'Add Candidate'}
                        </h3>
                        {editingId && (
                            <button onClick={resetForm} className="text-sm text-neutral-500 hover:text-neutral-800 underline">
                                Cancel
                            </button>
                        )}
                    </div>

                    {!isEditable && (
                        <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 flex items-start gap-2 shadow-sm">
                            <AlertTriangle size={18} className="mt-0.5 text-amber-600 flex-shrink-0" />
                            <span>
                                <strong>Election Active.</strong><br />
                                Changes are disabled while election is running.
                            </span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={`space-y-5 ${!isEditable ? 'opacity-60 pointer-events-none' : ''}`}>
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Full Name</label>
                            <input
                                className="input-field"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                                placeholder="e.g. Jane Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Position</label>
                            <div className="relative">
                                <select
                                    className="input-field"
                                    value={posId}
                                    onChange={e => setPosId(e.target.value)}
                                >
                                    {positions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Photo & Symbol Side-by-Side */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* Photo Upload */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Candidate Photo</label>
                                <div className="flex flex-col gap-2">
                                    <div className="aspect-square bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-lg overflow-hidden flex items-center justify-center relative group">
                                        {photoPreview ? (
                                            <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                                        ) : (
                                            <ImageIcon className="text-neutral-300" size={32} />
                                        )}
                                    </div>
                                    <label className="btn btn-secondary w-full text-xs py-2 cursor-pointer border-dashed border-2 hover:border-primary hover:text-primary transition-all justify-center">
                                        <Upload size={14} />
                                        <span>{photoPreview ? 'Change' : 'Upload'}</span>
                                        <input
                                            id="photo-input"
                                            type="file"
                                            className="hidden"
                                            onChange={handleFileSelect}
                                            accept="image/*"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Symbol Upload */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Candidate Symbol</label>
                                <div className="flex flex-col gap-2">
                                    <div className="aspect-square bg-neutral-50/50 border-2 border-dashed border-neutral-200 rounded-lg flex items-center justify-center overflow-hidden">
                                        {symbolPreview ? (
                                            <div className="w-3/4 h-3/4 flex items-center justify-center">
                                                <img src={symbolPreview} alt="Symbol" className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-neutral-300 font-bold">NONE</div>
                                        )}
                                    </div>
                                    <label className="btn btn-secondary w-full text-xs py-2 cursor-pointer border-dashed border-2 hover:border-primary hover:text-primary transition-all justify-center">
                                        <Upload size={14} />
                                        <span>{symbolPreview ? 'Change' : 'Upload'}</span>
                                        <input
                                            id="symbol-input"
                                            type="file"
                                            className="hidden"
                                            onChange={handleSymbolSelect}
                                            accept="image/*"
                                        />
                                    </label>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`btn btn-primary w-full justify-center ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                        >
                            {editingId ? <Check size={18} /> : <Plus size={18} />}
                            {editingId ? 'Save Changes' : 'Add Candidate'}
                        </button>
                    </form>
                </div>
            </div>

            {/* List Section */}
            <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold font-display text-neutral-800">Candidates</h2>
                        <span className="badge badge-neutral text-xs">{candidates.length} Total</span>
                    </div>
                </div>

                {candidates.length === 0 && (
                    <div className="text-center py-12 px-4 rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50">
                        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 text-neutral-400">
                            <Plus size={32} />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-700">No candidates yet</h3>
                        <p className="text-neutral-500 mb-6 max-w-xs mx-auto">Get started by filling out the form on the left to add your first candidate.</p>
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <div className="space-y-6">
                        {positions.map(position => {
                            const posCandidates = candidates
                                .filter(c => c.positionId === position.id)
                                .sort((a, b) => a.order - b.order);

                            // if (posCandidates.length === 0) return null; 

                            const isExpanded = expandedGroups[position.id];

                            return (
                                <div key={position.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <div
                                        className="flex items-center justify-between p-4 bg-neutral-50/50 cursor-pointer hover:bg-neutral-100 transition-colors border-b border-neutral-100"
                                        onClick={() => toggleGroup(position.id)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`p-1 rounded-md transition-transform duration-200 ${isExpanded ? 'rotate-90 bg-neutral-200 text-neutral-700' : 'text-neutral-400'}`}>
                                                <ChevronRight size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-neutral-800 text-lg">{position.title}</h4>
                                                <p className="text-xs text-neutral-500">
                                                    {posCandidates.length === 0 ? 'No candidates' : `${posCandidates.length} candidate${posCandidates.length !== 1 ? 's' : ''}`}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="p-4 bg-white min-h-[50px]">
                                            {posCandidates.length > 0 ? (
                                                <SortableContext
                                                    items={posCandidates.map(c => c.id)}
                                                    strategy={verticalListSortingStrategy}
                                                    id={position.id}
                                                >
                                                    <div className="flex flex-col">
                                                        {posCandidates.map(candidate => (
                                                            <SortableCandidateRow
                                                                key={candidate.id}
                                                                candidate={candidate}
                                                                activeId={editingId}
                                                                onEdit={handleEdit}
                                                                onDelete={handleDelete}
                                                                isEditable={isEditable}
                                                            />
                                                        ))}
                                                    </div>
                                                </SortableContext>
                                            ) : (
                                                <div className="flex items-center justify-center py-6 text-sm text-neutral-400 italic">
                                                    No candidates for this position yet.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </DndContext>
            </div>

            {/* Image Cropper Modal */}
            {isCropping && (
                <div className="modal-overlay animate-fade-in">
                    <div className="modal-content">
                        <div className="flex justify-between items-center mb-4 border-b pb-3">
                            <h3 className="text-lg font-bold font-display text-neutral-800">Adjust Photo</h3>
                            <button onClick={handleCancelCrop} className="text-neutral-400 hover:text-neutral-600 transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="cropper-container bg-neutral-900 rounded-lg shadow-inner">
                            <Cropper
                                image={imageSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1}
                                onCropChange={setCrop}
                                onCropComplete={onCropComplete}
                                onZoomChange={setZoom}
                                rotation={rotation}
                                onRotationChange={setRotation}
                            />
                        </div>

                        <div className="space-y-4 py-4">
                            <div className="slider-container">
                                <span className="slider-label text-sm font-medium text-neutral-600 w-20">Zoom</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="zoom-slider w-full accent-primary h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                            <div className="slider-container">
                                <span className="slider-label text-sm font-medium text-neutral-600 w-20">Rotation</span>
                                <input
                                    type="range"
                                    value={rotation}
                                    min={0}
                                    max={360}
                                    step={1}
                                    onChange={(e) => setRotation(Number(e.target.value))}
                                    className="zoom-slider w-full accent-primary h-1.5 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="modal-actions pt-2 border-t mt-2">
                            <button onClick={handleCancelCrop} className="btn bg-white border border-neutral-300 text-neutral-700 hover:bg-neutral-50">
                                Cancel
                            </button>
                            <button onClick={handleSaveCrop} className="btn btn-primary shadow-lg shadow-indigo-200">
                                <Check size={18} />
                                Save Photo
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CandidateManager;
