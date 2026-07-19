"use client";
"use no memo";

import { useState, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import EditableCell from "@/components/EditableCell"; 
import { Transaction, CellCoordinate } from "@/lib/types";

interface TransactionTableProps {
    initialTransactions: Transaction[];
}

export default function TransactionTable({ initialTransactions }: TransactionTableProps) {
    const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
    const [focusedCell, setFocusedCell] = useState<CellCoordinate | null>(null);
    const [isEditing, setIsEditing] = useState<boolean>(false);
    
    const parentRef = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line react-hooks/incompatible-library
    const rowVirtualizer = useVirtualizer({
        count: transactions.length,
        getScrollElement: () => {
            return parentRef.current;
        },
        estimateSize: () => {
            return 48; // Estimate row height
        },
        overscan: 10, 
    });

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!focusedCell) {
            return;
        }

        if (e.key === "Enter") {
            e.preventDefault();
            setIsEditing(true);
            return;
        }

        if (e.key === "Escape") {
            setIsEditing(false);
            return;
        }

        if (isEditing === false) {
            const fields: (keyof Transaction)[] = ["date", "merchant", "category", "amount"];
            const currentFieldIndex = fields.indexOf(focusedCell.field);
            const currentRowIndex = transactions.findIndex((t) => {
                return t.id === focusedCell.rowId;
            });

            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (currentRowIndex < transactions.length - 1) {
                    setFocusedCell({ 
                        rowId: transactions[currentRowIndex + 1].id, 
                        field: focusedCell.field 
                    });
                }
            }
            if (e.key === "ArrowUp") {
                e.preventDefault();
                if (currentRowIndex > 0) {
                    setFocusedCell({ 
                        rowId: transactions[currentRowIndex - 1].id, 
                        field: focusedCell.field 
                    });
                }
            }
            if (e.key === "ArrowRight") {
                e.preventDefault();
                if (currentFieldIndex < fields.length - 1) {
                    setFocusedCell({ 
                        rowId: focusedCell.rowId, 
                        field: fields[currentFieldIndex + 1] 
                    });
                }
            }
            if (e.key === "ArrowLeft") {
                e.preventDefault();
                if (currentFieldIndex > 0) {
                    setFocusedCell({ 
                        rowId: focusedCell.rowId, 
                        field: fields[currentFieldIndex - 1] 
                    });
                }
            }
        }
    };

    const handleUpdate = (id: string, field: keyof Transaction, newValue: string) => {
        setTransactions((prev) => {
            return prev.map((t) => {
                if (t.id === id) {
                    return { ...t, [field]: newValue };
                }
                return t;
            });
        });
    };

    return (
        <div 
            ref={parentRef} 
            className="h-150 min-h-37.5 overflow-auto border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500/50"
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            <div 
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: "100%",
                    position: "relative",
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const transaction = transactions[virtualRow.index];
                    const fields: (keyof Transaction)[] = ["date", "merchant", "category", "amount"];
                    
                    return (
                        <div 
                            key={transaction.id}
                            className="absolute top-0 left-0 w-full grid grid-cols-4"
                            style={{
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {fields.map((field) => {
                                const isFocused = focusedCell?.rowId === transaction.id && focusedCell?.field === field;
                                
                                return (
                                    <div 
                                        key={`${transaction.id}-${field}`}
                                        onClick={() => {
                                            setFocusedCell({ rowId: transaction.id, field });
                                            setIsEditing(false);
                                        }}
                                        onDoubleClick={() => {
                                            setFocusedCell({ rowId: transaction.id, field });
                                            setIsEditing(true);
                                        }}
                                    >
                                        <EditableCell
                                            value={transaction[field]}
                                            isFocused={isFocused}
                                            isEditing={isEditing}
                                            onUpdate={(val) => {
                                                handleUpdate(transaction.id, field, val);
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}