import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import TodoForm from './TodoForm';

const TodoInput = ({ onAdd, categories = {}, onAddCategory, onRemoveCategory }) => {
    const { t } = useLanguage();
    const [isExpanded, setIsExpanded] = useState(false);

    const handleAdd = (taskData) => {
        onAdd({
            ...taskData,
            subtasks: []
        });
        setIsExpanded(false);
    };

    return (
        <div className="relative z-20 mb-8">
            <div
                className={`relative z-20 bg-white dark:bg-dark-surface border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden transition-all duration-300 ${isExpanded ? 'p-6 ring-2 ring-primary-500/20' : 'p-2'}`}
            >
                {!isExpanded ? (
                    <div
                        onClick={() => setIsExpanded(true)}
                        className="flex items-center cursor-text"
                    >
                        <div className="w-full bg-transparent text-lg text-gray-500 dark:text-gray-400 pl-4 py-3 select-none flex items-center justify-between">
                            <span>{t('addTask') || "Add a new task..."}</span>
                            <button
                                className="mr-2 p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors shadow-md shadow-primary-500/30"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <AnimatePresence>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <TodoForm
                                onSubmit={handleAdd}
                                onCancel={() => setIsExpanded(false)}
                                categories={categories}
                                onAddCategory={onAddCategory}
                                onRemoveCategory={onRemoveCategory}
                                submitLabel="Add Task"
                            />
                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

export default TodoInput;
