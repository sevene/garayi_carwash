'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { TrashIcon, PlusIcon, TableCellsIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

interface ColumnInfo {
    cid: number;
    name: string;
    type: string;
    notnull: number;
    dflt_value: any;
    pk: number;
}

// Helper function to format cell values
function formatCellValue(val: any): React.ReactNode {
    if (val === null || val === undefined || val === '') {
        return <span className="text-gray-400 italic">-</span>;
    }
    if (typeof val === 'boolean') {
        return val ? 'True' : 'False';
    }
    if (typeof val === 'number') {
        return String(val);
    }
    if (typeof val === 'string') {
        // Try to parse as JSON for display (for non-flattened tables)
        if (val.startsWith('{') || val.startsWith('[')) {
            try {
                const parsed = JSON.parse(val);
                if (typeof parsed === 'object' && parsed !== null) {
                    const entries = Object.entries(parsed);
                    if (entries.length === 0) {
                        return <span className="text-gray-400 italic">empty</span>;
                    }
                    return (
                        <div className="flex flex-wrap gap-1">
                            {entries.map(([key, value]) => (
                                <span key={key} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs">
                                    <span className="text-gray-500">{key}:</span>
                                    <span className="text-gray-700">{String(value)}</span>
                                </span>
                            ))}
                        </div>
                    );
                }
            } catch {
                // Not valid JSON, return as is
            }
        }
        return val;
    }
    return String(val);
}

// Helper function to flatten a row's nested JSON columns for specific tables
function flattenRow(tableName: string | null, row: Record<string, any>): Record<string, any> {
    if (tableName !== 'employees') {
        return row;
    }

    const flattened: Record<string, any> = {};

    for (const [key, value] of Object.entries(row)) {
        if (key.toLowerCase() === 'contactinfo') {
            // Flatten contactInfo into email and phone
            let parsed = value;
            if (typeof value === 'string') {
                try { parsed = JSON.parse(value); } catch { parsed = {}; }
            }
            flattened['email'] = parsed?.email || '';
            flattened['phone'] = parsed?.phone || '';
        } else if (key.toLowerCase() === 'compensation') {
            // Flatten compensation into payType, rate, commission
            let parsed = value;
            if (typeof value === 'string') {
                try { parsed = JSON.parse(value); } catch { parsed = {}; }
            }
            flattened['payType'] = parsed?.payType || '';
            flattened['rate'] = parsed?.rate ?? '';
            flattened['commission'] = parsed?.commission ?? '';
        } else {
            flattened[key] = value;
        }
    }

    return flattened;
}

// Helper function to get ordered column keys for specific tables
function getOrderedKeys(tableName: string | null, row: Record<string, any>): string[] {
    // First flatten the row to get the actual keys we'll be displaying
    const flattenedRow = flattenRow(tableName, row);
    const keys = Object.keys(flattenedRow);

    if (tableName === 'employees') {
        // Preferred order for employees table with flattened columns
        const preferredOrder = [
            'id', 'name', 'username', 'role', 'pin',
            'email', 'phone', 'address', 'status',
            'payType', 'rate', 'commission',
            'createdAt', 'password_hash'
        ];

        // Sort keys based on preferred order, unknown keys go to the end
        return keys.sort((a, b) => {
            const aLower = a.toLowerCase();
            const bLower = b.toLowerCase();
            const aIndex = preferredOrder.findIndex(p => p.toLowerCase() === aLower);
            const bIndex = preferredOrder.findIndex(p => p.toLowerCase() === bLower);

            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return 0;
        });
    }

    return keys;
}

export default function DatabaseManagerPage() {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any>(null);
    const [columns, setColumns] = useState<ColumnInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // UI State
    const [showQueryEditor, setShowQueryEditor] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newRecord, setNewRecord] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const res = await fetch('/api/db/tables');
            if (res.ok) {
                const data = (await res.json()) as string[];
                setTables(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load tables");
        }
    };

    const fetchTableSchema = async (tableName: string) => {
        try {
            const res = await fetch('/api/db/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `PRAGMA table_info(${tableName})` })
            });
            const data = (await res.json()) as any;
            if (res.ok && data.type === 'SELECT') {
                setColumns(data.data);
            }
        } catch (e) {
            console.error("Schema fetch error", e);
        }
    }

    const runQuery = async (sql?: string) => {
        const sqlToRun = sql || query;
        if (!sqlToRun.trim()) return;

        setIsLoading(true);
        try {
            const res = await fetch('/api/db/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sqlToRun })
            });
            const data = (await res.json()) as any;

            if (res.ok) {
                setResults(data);
                if (!sql) setQuery(sqlToRun);
            } else {
                toast.error(data.error || "Query failed");
                setResults({ error: data.error });
            }
        } catch (error) {
            console.error(error);
            toast.error("Execution error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleTableClick = async (tableName: string) => {
        setSelectedTable(tableName);
        await fetchTableSchema(tableName);
        const sql = `SELECT * FROM ${tableName} LIMIT 100`;
        // Don't necessarily show editor, visual mode is primary
        setQuery(sql);
        runQuery(sql);
    };

    const handleDeleteRow = async (id: any) => {
        if (!confirm('Delete this record?')) return;
        if (!selectedTable) return;

        const sql = `DELETE FROM ${selectedTable} WHERE id = ${id}`;
        // Optimistic UI or just re-run query? Re-run is safer.
        await runQuery(sql);
        toast.success("Record deleted");

        // Refresh table
        runQuery(`SELECT * FROM ${selectedTable} LIMIT 100`);
    };

    const handleAddRecord = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTable) return;

        // Filter out empty keys
        const keys = Object.keys(newRecord).filter(k => newRecord[k] !== undefined && newRecord[k] !== '');
        const values = keys.map(k => {
            const val = newRecord[k];
            // Simple quoting logic (unsafe for prod but ok for internal tool mostly if inputs properly handled)
            return typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val;
        });

        const sql = `INSERT INTO ${selectedTable} (${keys.join(', ')}) VALUES (${values.join(', ')})`;

        await runQuery(sql);
        toast.success("Record added");
        setShowAddModal(false);
        setNewRecord({});

        // Refresh table
        runQuery(`SELECT * FROM ${selectedTable} LIMIT 100`);
    };

    return (
        <div className="flex h-screen bg-gray-50 text-gray-800">
            {/* Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 font-bold text-lg flex items-center gap-2">
                    <TableCellsIcon className="w-5 h-5 text-lime-600" /> Database
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {tables.map(table => (
                        <button
                            key={table}
                            onClick={() => handleTableClick(table)}
                            className={`w-full text-left px-3 py-2 rounded text-sm transition flex justify-between items-center
                                ${selectedTable === table ? 'bg-lime-50 text-lime-700 font-medium' : 'hover:bg-gray-100'}`}
                        >
                            {table}
                        </button>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-200">
                    <button
                        onClick={() => setShowQueryEditor(!showQueryEditor)}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:text-lime-600"
                    >
                        <CodeBracketIcon className="w-4 h-4" />
                        {showQueryEditor ? 'Hide SQL Editor' : 'Show SQL Editor'}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden relative">

                {/* Header / Actions */}
                {selectedTable && (
                    <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
                        <h2 className="text-xl font-bold text-gray-800 capitalize">{selectedTable}</h2>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="bg-lime-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-lime-700 shadow-sm text-sm"
                        >
                            <PlusIcon className="w-4 h-4" /> Add Record
                        </button>
                    </div>
                )}

                {/* Query Editor (Collapsible) */}
                {showQueryEditor && (
                    <div className="bg-gray-100 border-b border-gray-200 p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                            <label className="font-semibold text-xs text-gray-500 uppercase tracking-wider">Custom SQL</label>
                            <button
                                onClick={() => runQuery()}
                                disabled={isLoading}
                                className="px-3 py-1 bg-gray-800 text-white rounded hover:bg-black disabled:opacity-50 text-xs"
                            >
                                Run
                            </button>
                        </div>
                        <textarea
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full p-2 font-mono text-sm border border-gray-300 rounded focus:border-lime-500 focus:outline-none resize-none h-24"
                            placeholder="SELECT * FROM products..."
                        />
                    </div>
                )}

                {/* Results View */}
                <div className="flex-1 overflow-auto bg-gray-50 p-6">
                    {results ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {results.error ? (
                                <div className="p-4 text-red-600 font-mono text-sm bg-red-50">
                                    Error: {results.error}
                                </div>
                            ) : results.type === 'SELECT' ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left text-sm">
                                        <thead className="bg-gray-50 border-b border-gray-100">
                                            <tr>
                                                <th className="w-10 px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider">Action</th>
                                                {results.data.length > 0 ? getOrderedKeys(selectedTable, results.data[0]).map(key => (
                                                    <th key={key} className="px-4 py-3 font-semibold text-gray-500 text-xs uppercase tracking-wider whitespace-nowrap">
                                                        {key}
                                                    </th>
                                                )) : <th className="px-4 py-3">No Data</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {results.data.map((row: any, i: number) => {
                                                const flattenedRow = flattenRow(selectedTable, row);
                                                const orderedKeys = getOrderedKeys(selectedTable, row);
                                                return (
                                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-center">
                                                            {/* Only show delete if there is an ID */}
                                                            {row.id && (
                                                                <button
                                                                    onClick={() => handleDeleteRow(row.id)}
                                                                    className="text-gray-400 hover:text-red-600 transition"
                                                                    title="Delete Row"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </td>
                                                        {orderedKeys.map((key) => (
                                                            <td key={key} className="px-4 py-3 text-gray-700">
                                                                {formatCellValue(flattenedRow[key])}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                            {results.data.length === 0 && (
                                                <tr><td colSpan={100} className="p-8 text-center text-gray-400">No records found in this table.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-4 text-green-700 bg-green-50 flex flex-col gap-2">
                                    <h3 className="font-bold">Command Executed Successfully</h3>
                                    <div className="text-xs text-gray-600 bg-white p-2 rounded border border-green-100 font-mono">
                                        {JSON.stringify(results.meta, null, 2)}
                                    </div>
                                    <div className="text-xs text-gray-500">Query: {query}</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                            <TableCellsIcon className="w-12 h-12 opacity-20" />
                            <p>Select a table from the sidebar to view data.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Record Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Add New Record to {selectedTable}</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleAddRecord} className="flex-1 overflow-y-auto p-4 space-y-4">
                            {columns.filter(c => c.name !== 'id' && c.name !== 'created_at').map(col => (
                                <div key={col.name}>
                                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">{col.name}</label>
                                    {/* Simple type mapping */}
                                    {col.type === 'INTEGER' || col.type === 'REAL' ? (
                                        <input
                                            type="number"
                                            step="any"
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-lime-500 focus:outline-none"
                                            placeholder={`Enter ${col.name}`}
                                            onChange={e => setNewRecord({ ...newRecord, [col.name]: e.target.value })}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-lime-500 focus:outline-none"
                                            placeholder={`Enter ${col.name}`}
                                            onChange={e => setNewRecord({ ...newRecord, [col.name]: e.target.value })}
                                        />
                                    )}
                                </div>
                            ))}
                        </form>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddRecord}
                                className="px-4 py-2 bg-lime-600 text-white rounded-lg hover:bg-lime-700 text-sm font-medium"
                            >
                                Add Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
