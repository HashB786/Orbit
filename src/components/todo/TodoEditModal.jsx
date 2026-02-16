import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TodoForm from './TodoForm';
import { X } from 'lucide-react';

const TodoEditModal = ({ isOpen, onClose, todo, onSave, categories, onAddCategory, onRemoveCategory }) => {
    if (!isOpen || !todo) return null;

    const handleSave = (updates) => {
        onSave(todo.id, updates);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]"
                    >

                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/30">
                            <h2 className="text-xl font-extrabold text-gray-800 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                                Edit Task
                            </h2>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Form Container */}
                        <div className="p-6 overflow-y-auto custom-scrollbar">
                            <TodoForm
                                initialData={todo}
                                onSubmit={handleSave}
                                onCancel={onClose}
                                submitLabel="Save Changes"
                                categories={categories}
                                onAddCategory={onAddCategory}
                                onRemoveCategory={onRemoveCategory}
                            />
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TodoEditModal;
