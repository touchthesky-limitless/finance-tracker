"use client";

import { useState } from "react";

interface EditableCellProps {
    value: string | number;
    isFocused: boolean;
    isEditing: boolean;
    onUpdate: (newValue: string) => void;
}

export default function EditableCell({ value, isFocused, isEditing, onUpdate }: EditableCellProps) {
    const [localValue, setLocalValue] = useState(value);
    const [prevValue, setPrevValue] = useState(value);

    if (value !== prevValue) {
        setPrevValue(value);
        setLocalValue(value);
    }

    const handleBlur = () => {
        onUpdate(String(localValue));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalValue(e.target.value);
    };

    let containerClass = "h-full w-full px-3 flex items-center overflow-hidden transition-colors ";

    if (isFocused) {
        containerClass = containerClass + "ring-2 ring-inset ring-orange-500 bg-orange-50 dark:bg-orange-500/10 z-100 relative";
    }

    if (isFocused) {
        if (isEditing) {
            return (
                <div className={containerClass}>
                    <input
                        autoFocus
                        value={localValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className="w-full bg-transparent outline-none truncate"
                    />
                </div>
            );
        }
    }

    return (
        <div className={containerClass}>
            <span className="truncate w-full block text-left">{value}</span>
        </div>
    );
}