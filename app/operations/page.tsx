"use client";
import React, { useState } from "react";
import { CheckSquare, StickyNote, MessageSquare, Plus, Trash2, CheckCircle, Clock, AlertCircle, Pencil } from "lucide-react";
import { useFinance } from "../../context/FinanceContext";

export default function OperationsPage() {
    // Work Log State
    const [newLogDesc, setNewLogDesc] = useState("");
    const [newLogPriority, setNewLogPriority] = useState("normal");
    const [newLogDate, setNewLogDate] = useState(new Date().toISOString().split('T')[0]);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");

    // @ts-ignore
    const { workLogs, stickyNotes, clientQueries, addWorkLog, toggleWorkLog, addStickyNote, deleteStickyNote, addClientQuery, updateClientQueryStatus, deleteWorkLog, updateWorkLog, deleteClientQuery } = useFinance();

    // Sticky Note State
    const [newNoteContent, setNewNoteContent] = useState("");
    const [newNoteColor, setNewNoteColor] = useState("yellow");

    // Client Query State
    const [newQueryName, setNewQueryName] = useState("");
    const [newQueryPhone, setNewQueryPhone] = useState("");
    const [newQueryText, setNewQueryText] = useState("");

    // --- Handlers ---

    const startEditingLog = (log: any) => {
        setEditingLogId(log.id);
        setEditingText(log.description);
    };

    const saveEditWorkLog = async (id: string) => {
        if (editingText.trim()) {
            await updateWorkLog(id, { description: editingText });
        }
        setEditingLogId(null);
    };

    const handleAddWorkLog = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLogDesc) return;
        await addWorkLog({ description: newLogDesc, priority: newLogPriority, date: newLogDate });
        setNewLogDesc("");
    };

    const handleAddStickyNote = async () => {
        if (!newNoteContent) return;
        await addStickyNote({ content: newNoteContent, color: newNoteColor });
        setNewNoteContent("");
    };

    const handleAddClientQuery = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newQueryName || !newQueryText) return;
        await addClientQuery({ customer_name: newQueryName, phone: newQueryPhone, query_text: newQueryText });
        setNewQueryName("");
        setNewQueryPhone("");
        setNewQueryText("");
    };

    const handleDeleteWorkLog = async (logId: string) => {
        await deleteWorkLog(logId);
    };


    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1400px] mx-auto mb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">
                    Operations Center
                </h1>
                <p className="text-muted text-sm mt-1">Daily tasks, rough notes, and client inquiries.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* 1. Work Logs (Today's Focus) */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-200">
                        <CheckSquare className="text-green-400" /> Today's Focus
                    </div>

                    {/* Add Log Form */}
                    <form onSubmit={handleAddWorkLog} className="glass p-4 rounded-xl flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="Add a new task..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-green-400 focus:outline-none transition-colors"
                            value={newLogDesc}
                            onChange={(e) => setNewLogDesc(e.target.value)}
                        />

                        <input
                            type="date"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-green-400 text-gray-300 [color-scheme:dark]"
                            value={newLogDate}
                            onChange={(e) => setNewLogDate(e.target.value)}
                        />

                        <div className="relative w-full">
                            <select
                                value={newLogPriority}
                                onChange={(e) => setNewLogPriority(e.target.value)}
                                className="w-full appearance-none bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:outline-none cursor-pointer hover:bg-white/5 transition-colors text-white"
                            >
                                <option value="normal" className="bg-gray-900 text-white">Normal</option>
                                <option value="high" className="bg-gray-900 text-white">High</option>
                                <option value="low" className="bg-gray-900 text-white">Low</option>
                            </select>
                            <svg className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="m6 9 6 6 6-6" />
                            </svg>
                        </div>

                        <button type="submit" className="w-full bg-green-500/20 text-green-400 px-4 py-3 rounded-lg hover:bg-green-500/30 transition-colors font-semibold text-sm flex items-center justify-center gap-2">
                            <Plus size={18} /> Add Task
                        </button>
                    </form>

                    {/* Log List */}
                    <div className="flex flex-col gap-2 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {workLogs && workLogs.length > 0 ? (
                            workLogs.map((log: any) => (
                                <div key={log.id} className={`glass-soft p-3 rounded-lg flex items-center justify-between group border border-white/5 transition-all hover:bg-white/5 ${log.status === 'completed' ? 'opacity-50' : ''}`}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <button
                                            onClick={() => toggleWorkLog(log.id, log.status)}
                                            className={`transition-colors p-1 rounded-full hover:bg-white/10 ${log.status === 'completed' ? 'text-green-400' : 'text-gray-500 hover:text-green-400'}`}
                                        >
                                            <CheckCircle size={18} className={log.status === 'completed' ? 'fill-current' : ''} />
                                        </button>

                                        {editingLogId === log.id ? (
                                            <input
                                                type="text"
                                                autoFocus
                                                value={editingText}
                                                onChange={(e) => setEditingText(e.target.value)}
                                                onBlur={() => saveEditWorkLog(log.id)}
                                                onKeyDown={(e) => e.key === 'Enter' && saveEditWorkLog(log.id)}
                                                className="bg-black/50 border border-white/20 rounded px-2 py-1 text-sm flex-1 text-white focus:outline-none"
                                            />
                                        ) : (
                                            <span
                                                className={`text-sm text-gray-200 cursor-pointer ${log.status === 'completed' ? 'line-through text-muted' : ''}`}
                                                onClick={() => startEditingLog(log)}
                                            >
                                                {log.description}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {/* Actions (Visible on Hover) */}
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                                            {editingLogId !== log.id && (
                                                <button
                                                    onClick={() => startEditingLog(log)}
                                                    className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteWorkLog(log.id)}
                                                className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>

                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${log.priority === 'high' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                            log.priority === 'low' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                                            }`}>
                                            {log.priority}
                                        </span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted text-sm italic py-10">No tasks for today.</div>
                        )}
                    </div>
                </div>

                {/* 2. Sticky Notes (Rough Work) */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-200">
                        <StickyNote className="text-[#FFD700]" /> Rough Work
                    </div>

                    {/* Add Note Area */}
                    <div className="glass p-4 rounded-xl flex flex-col gap-4">
                        <textarea
                            placeholder="Write a quick note..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none resize-none h-28"
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                        />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex gap-3">
                                {['yellow', 'blue', 'green', 'red'].map(color => (
                                    <button
                                        key={color}
                                        onClick={() => setNewNoteColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${newNoteColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'}`}
                                        style={{ backgroundColor: color === 'yellow' ? '#FFD700' : color === 'red' ? '#EF4444' : color === 'green' ? '#22C55E' : '#3B82F6' }}
                                    />
                                ))}
                            </div>
                            <button onClick={handleAddStickyNote} className="bg-[var(--accent)] text-black px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity whitespace-nowrap">
                                Post Note
                            </button>
                        </div>
                    </div>

                    {/* Notes Grid */}
                    <div className="grid grid-cols-2 gap-3 h-[420px] overflow-y-auto pr-2 custom-scrollbar content-start">
                        {stickyNotes && stickyNotes.length > 0 ? (
                            stickyNotes.map((note: any) => (
                                <div key={note.id}
                                    className="p-3 rounded-xl relative group flex flex-col justify-between min-h-[120px]"
                                    style={{
                                        backgroundColor:
                                            note.color === 'yellow' ? 'rgba(255, 215, 0, 0.1)' :
                                                note.color === 'red' ? 'rgba(239, 68, 68, 0.1)' :
                                                    note.color === 'green' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                        border: `1px solid ${note.color === 'yellow' ? 'rgba(255, 215, 0, 0.2)' :
                                            note.color === 'red' ? 'rgba(239, 68, 68, 0.2)' :
                                                note.color === 'green' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)'
                                            }`
                                    }}
                                >
                                    <p className="text-sm text-gray-200 whitespace-pre-wrap">{note.content}</p>
                                    <button
                                        onClick={() => deleteStickyNote(note.id)}
                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="col-span-2 text-center text-muted text-sm italic py-10">No active notes.</div>
                        )}
                    </div>
                </div>

                {/* 3. Client Queries */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-2 text-xl font-semibold text-gray-200">
                        <MessageSquare className="text-purple-400" /> Queries
                    </div>

                    {/* Add Query Form */}
                    <form onSubmit={handleAddClientQuery} className="glass p-4 rounded-xl flex flex-col gap-3">
                        <input
                            type="text"
                            placeholder="Client Name"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-purple-400 focus:outline-none transition-colors"
                            value={newQueryName}
                            onChange={(e) => setNewQueryName(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Phone (Optional)"
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-purple-400 focus:outline-none transition-colors"
                            value={newQueryPhone}
                            onChange={(e) => setNewQueryPhone(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="Query Details..."
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-purple-400 focus:outline-none transition-colors"
                            value={newQueryText}
                            onChange={(e) => setNewQueryText(e.target.value)}
                        />
                        <button type="submit" className="w-full bg-purple-500/20 text-purple-400 px-4 py-3 rounded-lg hover:bg-purple-500/30 transition-colors font-semibold text-sm flex items-center justify-center gap-2">
                            <Plus size={18} /> Add Query
                        </button>
                    </form>

                    {/* Query List */}
                    <div className="flex flex-col gap-3 h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        {clientQueries && clientQueries.length > 0 ? (
                            clientQueries.map((query: any) => (
                                <div key={query.id} className="glass p-4 rounded-xl flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <div className="font-semibold text-gray-200">{query.customer_name}</div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={query.status}
                                                onChange={(e) => updateClientQueryStatus(query.id, e.target.value)}
                                                className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full border-none focus:outline-none cursor-pointer ${query.status === 'new' ? 'bg-blue-500/20 text-blue-400' :
                                                    query.status === 'in-progress' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                                                    }`}
                                            >
                                                <option value="new">New</option>
                                                <option value="in-progress">Working</option>
                                                <option value="resolved">Done</option>
                                            </select>
                                            <button
                                                onClick={() => deleteClientQuery(query.id)}
                                                className="text-gray-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-300">{query.query_text}</p>
                                    {query.phone && (
                                        <div className="text-xs text-muted flex items-center gap-1 mt-1">
                                            <span>📞 {query.phone}</span>
                                        </div>
                                    )}
                                    <div className="text-[10px] text-muted text-right mt-1">
                                        {new Date(query.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-muted text-sm italic py-10">No pending queries.</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
