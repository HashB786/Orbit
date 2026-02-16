import React, { useState } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Circle, Trash2, ChevronDown, Flag, Calendar, AlignLeft, GripVertical, X, Plus, RefreshCw, AlertCircle, Skull, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

const TodoItem = ({ todo, onToggle, onDelete, onUpdate, isTrash, onRestore, onPermanentDelete, onEdit }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [subtaskInput, setSubtaskInput] = useState('');

    const handleAddSubtask = (e) => {
        e.preventDefault();
        if (!subtaskInput.trim()) return;
        const newSubtasks = [...(todo.subtasks || []), { id: Date.now(), text: subtaskInput, completed: false }];
        onUpdate(todo.id, { subtasks: newSubtasks });
        setSubtaskInput('');
    };

    const toggleSubtask = (subId) => {
        const newSubtasks = todo.subtasks?.map(st =>
            st.id === subId ? { ...st, completed: !st.completed } : st
        );
        onUpdate(todo.id, { subtasks: newSubtasks });
    };

    const deleteSubtask = (subId) => {
        const newSubtasks = todo.subtasks?.filter(st => st.id !== subId);
        onUpdate(todo.id, { subtasks: newSubtasks });
    };

    return (
        <Reorder.Item
            value={todo}
            id={todo.id}
            className="relative mb-3"
            whileDrag={{ scale: 1.02 }}
        >
            <motion.div
                layout
                initial="hidden"
                animate="show"
                exit="hidden"
                className={`
                    group relative overflow-hidden bg-white dark:bg-dark-surface rounded-xl border transition-all sm:hover:shadow-md
                    ${todo.completed ? 'opacity-60 border-transparent bg-gray-50/50' : 'border-gray-100 dark:border-gray-800 shadow-sm'}
                `}
            >
                <div className="p-4 flex items-start gap-3">
                    {/* Drag Handle */}
                    <div className="mt-1 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                        <GripVertical size={16} />
                    </div>

                    {/* Checkbox */}
                    {/* Checkbox (Hidden/Disabled in Trash) */}
                    {!isTrash && (
                        <button
                            onClick={() => onToggle(todo.id)}
                            className={`mt-0.5 transition-colors ${todo.completed ? 'text-primary-500' : 'text-gray-300 hover:text-primary-500'}`}
                        >
                            {todo.completed ? <CheckCircle2 size={22} className="fill-current" /> : <Circle size={22} />}
                        </button>
                    )}

                    {/* Main Content */}
                    <div className="flex-1 min-w-0" onClick={() => !todo.completed && setIsExpanded(!isExpanded)}>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            {/* Subject Badge */}
                            {todo.subject && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border border-indigo-100 dark:border-indigo-800">
                                    {todo.subject}
                                </span>
                            )}

                            <span className={`text-base font-medium truncate cursor-pointer select-none ${todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                                {todo.text}
                            </span>

                            {/* Priority Badge (Inline) */}
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${todo.priority === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                                todo.priority === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                    'bg-blue-100 text-blue-700 border-blue-200'
                                }`}>
                                {todo.priority === 'high' ? 'Urgent' : todo.priority}
                            </span>

                            {/* Category Tag */}
                            {todo.category && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-gray-100 dark:bg-gray-700 text-gray-500 tracking-wider">
                                    {todo.category}
                                </span>
                            )}
                        </div>

                        {/* Meta Row */}
                        {!todo.completed && (
                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                {todo.dueDate && (
                                    <span className={`flex items-center gap-1 ${new Date(todo.dueDate) < new Date() ? 'text-red-400 font-bold' : ''}`}>
                                        <Calendar size={12} />
                                        {format(new Date(todo.dueDate), 'MMM d, HH:mm')}
                                    </span>
                                )}
                                {(todo.subtasks?.length > 0) && (
                                    <span className="flex items-center gap-1">
                                        <AlignLeft size={12} />
                                        {todo.subtasks.filter(st => st.completed).length}/{todo.subtasks.length}
                                    </span>
                                )}
                                {todo.notes && (
                                    <span className="flex items-center gap-1">
                                        <AlignLeft size={12} className="rotate-90" /> Notes
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Subtasks Preview & Notes (if expanded) */}
                        <AnimatePresence>
                            {isExpanded && !todo.completed && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-3 pt-3 border-t border-dashed border-gray-100 dark:border-gray-800"
                                    onClick={e => e.stopPropagation()} // Prevent closing
                                >
                                    {/* Notes Display */}
                                    {todo.notes && (
                                        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/10 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/20">
                                            <p className="whitespace-pre-wrap">{todo.notes}</p>
                                        </div>
                                    )}

                                    {/* Subtask Input */}
                                    <form onSubmit={handleAddSubtask} className="flex gap-2 mb-3">
                                        <input
                                            type="text"
                                            value={subtaskInput}
                                            onChange={(e) => setSubtaskInput(e.target.value)}
                                            placeholder="Add subtask..."
                                            className="flex-1 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                        />
                                        <button type="submit" className="text-primary-500 hover:text-primary-600"><Plus size={18} /></button>
                                    </form>

                                    {/* Subtasks List */}
                                    <div className="space-y-1 pl-1">
                                        {todo.subtasks?.map(st => (
                                            <div key={st.id} className="flex items-center gap-2 group/sub">
                                                <button onClick={() => toggleSubtask(st.id)} className={`text-gray-300 hover:text-primary-500 ${st.completed ? 'text-primary-500' : ''}`}>
                                                    <div className={`w-3 h-3 rounded-full border ${st.completed ? 'bg-primary-500 border-primary-500' : 'border-current'}`} />
                                                </button>
                                                <span className={`text-sm flex-1 ${st.completed ? 'line-through text-gray-400' : 'text-gray-600 dark:text-gray-300'}`}>{st.text}</span>
                                                <button onClick={() => deleteSubtask(st.id)} className="opacity-0 group-hover/sub:opacity-100 text-xs text-red-400"><X size={12} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        {isTrash ? (
                            <>
                                <button
                                    onClick={() => onRestore(todo.id)}
                                    className="p-1.5 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                    title="Restore"
                                >
                                    <RefreshCw size={18} />
                                </button>
                                <button
                                    onClick={() => onPermanentDelete(todo.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    title="Delete Forever"
                                >
                                    <Skull size={18} />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => onDelete(todo.id)}
                                className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                        <button
                            onClick={() => onEdit && onEdit(todo)}
                            className="p-1.5 text-gray-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Edit Task"
                        >
                            <Edit2 size={18} />
                        </button>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`p-1.5 text-gray-300 hover:text-gray-600 transition-transform ${isExpanded ? 'rotate-180 text-gray-600' : ''}`}
                        >
                            <ChevronDown size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </Reorder.Item>
    );
};

export default TodoItem;
