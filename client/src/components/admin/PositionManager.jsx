import { useState, useEffect } from 'react';
import api from '../../api/axios';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, Pencil, Check, X } from 'lucide-react';

const SortableItem = ({ id, position, onDelete, onEditStart, isEditing, editTitle, onEditChange, onSave, onCancel }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm mb-3">
            <div {...attributes} {...listeners} className="cursor-grab text-gray-400 hover:text-gray-600">
                <GripVertical size={20} />
            </div>
            <div className="flex-1">
                {isEditing ? (
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => onEditChange(e.target.value)}
                        className="input-field w-full py-1 text-sm"
                        autoFocus
                    />
                ) : (
                    <>
                        <h3 className="font-semibold text-gray-800">{position.title}</h3>
                        <p className="text-xs text-gray-500">Order: {position.order}</p>
                    </>
                )}
            </div>

            {isEditing ? (
                <>
                    <button onClick={onSave} className="p-2 text-green-600 hover:bg-green-50 rounded">
                        <Check size={18} />
                    </button>
                    <button onClick={onCancel} className="p-2 text-gray-500 hover:bg-gray-50 rounded">
                        <X size={18} />
                    </button>
                </>
            ) : (
                <>
                    <button onClick={() => onEditStart(position)} className="action-icon edit-icon p-1.5 text-blue-500 hover:text-blue-600 rounded transition-colors" style={{ border: 'none', background: 'transparent' }} title="Edit">
                        <Pencil size={18} />
                    </button>
                    <button onClick={() => onDelete(id)} className="action-icon delete-icon p-1.5 text-red-500 hover:text-red-600 rounded transition-colors" style={{ border: 'none', background: 'transparent' }} title="Delete">
                        <Trash2 size={18} />
                    </button>
                </>
            )}
        </div>
    );
};

const PositionManager = ({ electionId }) => {
    const [positions, setPositions] = useState([]);
    const [newTitle, setNewTitle] = useState('');

    // Edit State
    const [editId, setEditId] = useState(null);
    const [editTitle, setEditTitle] = useState('');

    const fetchPositions = async () => {
        if (!electionId) return;
        try {
            const { data } = await api.get(`/positions?electionId=${electionId}`);
            setPositions(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchPositions();
    }, [electionId]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = positions.findIndex(i => i.id === active.id);
            const newIndex = positions.findIndex(i => i.id === over.id);

            const newItems = arrayMove(positions, oldIndex, newIndex);
            setPositions(newItems);

            // Optimistic update
            const orderedIds = newItems.map(i => i.id);
            api.put('/positions/reorder', { orderedIds }).catch(err => {
                console.error(err);
                fetchPositions(); // Revert on error
            });
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newTitle.trim()) return;
        try {
            await api.post('/positions', { title: newTitle, electionId });
            setNewTitle('');
            fetchPositions();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this position? It will remove all candidates in it.")) return;
        try {
            await api.delete(`/positions/${id}`);
            fetchPositions();
        } catch (err) {
            console.error(err);
        }
    };

    // Edit Handlers
    const handleEditStart = (position) => {
        setEditId(position.id);
        setEditTitle(position.title);
    };

    const handleEditCancel = () => {
        setEditId(null);
        setEditTitle('');
    };

    const handleEditSave = async () => {
        if (!editTitle.trim()) return;
        try {
            await api.put(`/positions/${editId}`, { title: editTitle });
            setEditId(null);
            setEditTitle('');
            fetchPositions();
        } catch (err) {
            console.error(err);
            alert('Failed to update position');
        }
    };

    return (
        <div className="max-w-2xl">
            <form onSubmit={handleAdd} className="flex gap-3 mb-6">
                <input
                    type="text"
                    placeholder="New Position Title (e.g. Head Boy)"
                    className="input-field flex-1"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">
                    <Plus size={18} /> Add Position
                </button>
            </form>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                <SortableContext
                    items={positions.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                >
                    {positions.map(position => (
                        <SortableItem
                            key={position.id}
                            id={position.id}
                            position={position}
                            onDelete={handleDelete}

                            // Edit props
                            isEditing={editId === position.id}
                            editTitle={editTitle}
                            onEditChange={setEditTitle}
                            onEditStart={handleEditStart}
                            onSave={handleEditSave}
                            onCancel={handleEditCancel}
                        />
                    ))}
                </SortableContext>
            </DndContext>
        </div>
    );
};

export default PositionManager;
