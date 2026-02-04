import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Trophy, Sparkles } from 'lucide-react';

interface ProgressTrackerProps {
    itemId: string;
    compact?: boolean;
}

// Hook to get/set progress state
export const useProgressTracker = () => {
    const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        // Load from localStorage on mount
        const saved = localStorage.getItem('fukuoka_trip_progress');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setCompletedItems(new Set(parsed));
            } catch (e) {
                console.error('Failed to parse progress data');
            }
        }
    }, []);

    const toggleItem = (itemId: string) => {
        setCompletedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            // Save to localStorage
            localStorage.setItem('fukuoka_trip_progress', JSON.stringify([...newSet]));
            return newSet;
        });
    };

    const isCompleted = (itemId: string) => completedItems.has(itemId);

    const getProgress = (itemIds: string[]) => {
        const completed = itemIds.filter(id => completedItems.has(id)).length;
        return {
            completed,
            total: itemIds.length,
            percentage: Math.round((completed / itemIds.length) * 100)
        };
    };

    const resetProgress = () => {
        setCompletedItems(new Set());
        localStorage.removeItem('fukuoka_trip_progress');
    };

    return { toggleItem, isCompleted, getProgress, resetProgress, completedItems };
};

// Checkbox component for individual items
export const ProgressCheckbox: React.FC<ProgressTrackerProps & {
    isCompleted: boolean;
    onToggle: () => void;
}> = ({ isCompleted, onToggle, compact }) => {
    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                onToggle();
            }}
            className={`
                flex items-center justify-center transition-all duration-300 
                ${compact ? 'w-6 h-6' : 'w-8 h-8'} 
                rounded-full border-2 
                ${isCompleted
                    ? 'bg-green-500 border-green-500 text-white scale-110'
                    : 'bg-white border-gray-200 text-gray-300 hover:border-green-300 hover:text-green-400'
                }
            `}
            title={isCompleted ? '標記為未完成' : '標記為已完成'}
        >
            {isCompleted ? (
                <CheckCircle2 size={compact ? 16 : 20} className="fill-current" />
            ) : (
                <Circle size={compact ? 16 : 20} />
            )}
        </button>
    );
};

// Progress bar for day summary
export const DayProgressBar: React.FC<{
    completed: number;
    total: number;
    showLabel?: boolean;
}> = ({ completed, total, showLabel = true }) => {
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    const isComplete = completed === total && total > 0;

    return (
        <div className="w-full">
            {showLabel && (
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-gray-500">
                        行程進度
                    </span>
                    <div className="flex items-center gap-1.5">
                        {isComplete && (
                            <Trophy size={14} className="text-yellow-500 animate-bounce" />
                        )}
                        <span className={`text-xs font-bold ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
                            {completed}/{total}
                        </span>
                    </div>
                </div>
            )}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${isComplete
                            ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                            : 'bg-gradient-to-r from-primary-400 to-primary-500'
                        }`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {isComplete && (
                <div className="mt-2 flex items-center justify-center gap-1 text-xs text-green-600 font-medium animate-in fade-in">
                    <Sparkles size={12} className="text-yellow-500" />
                    今日行程完成！
                    <Sparkles size={12} className="text-yellow-500" />
                </div>
            )}
        </div>
    );
};
