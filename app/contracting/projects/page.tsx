"use client";

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Search, Filter, Briefcase, Edit2, Trash2, ChevronRight, X } from 'lucide-react';
// @ts-ignore
import { useFinance } from '../../../context/FinanceContext';

export default function ProjectsPage() {
    // @ts-ignore
    const { projects, addProject, updateProject, deleteProject, contacts } = useFinance();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);

    const filteredProjects = projects?.filter((p: any) => {
        const matchesSearch = (p.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
            (p.contacts?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    }) || [];

    const handleEdit = (project: any) => {
        setEditingProject(project);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: any) => {
        if (confirm("Are you sure you want to delete this project?")) {
            await deleteProject(id);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/contracting" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Projects</h1>
                    <p className="text-muted text-sm mt-1">Manage all your contracting projects.</p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-black/20 p-4 rounded-2xl border border-white/5 backdrop-blur-xl">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full md:w-64 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted group-hover:text-[var(--accent)] transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search projects..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-all"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-[var(--accent)]/50 transition-all"
                    >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                        <option value="on-hold">On Hold</option>
                    </select>
                </div>

                <button
                    onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-[var(--accent)]/20 active:scale-95 w-full md:w-auto justify-center font-medium"
                >
                    <Plus size={18} />
                    New Project
                </button>
            </div>

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProjects.map((project: any) => (
                    <div key={project.id} className="glass p-5 rounded-xl border border-white/5 hover:border-[var(--accent)]/30 transition-all hover:bg-white/[0.02] group relative">
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2.5 bg-[var(--accent)]/10 text-[var(--accent)] rounded-lg">
                                <Briefcase size={20} />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(project)} className="p-1.5 hover:bg-white/10 rounded-lg text-muted hover:text-white transition-colors">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(project.id)} className="p-1.5 hover:bg-red-500/20 rounded-lg text-muted hover:text-red-400 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <Link href={`/contracting/projects/${project.id}`} className="block group-hover:translate-x-1 transition-transform duration-300">
                            <h3 className="text-lg font-semibold text-white truncate pr-2 group-hover:text-[var(--accent)] transition-colors">{project.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-muted">{project.contacts?.name || 'No Client'}</span>
                                <span className="text-white/20">•</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${project.status === 'completed' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                                    project.status === 'active' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                        'border-white/10 text-muted bg-white/5'
                                    }`}>
                                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                </span>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-xs text-muted">
                                <span>ID: #{project.id}</span>
                                <span className="flex items-center gap-1 group-hover:text-white transition-colors">
                                    View Details <ChevronRight size={12} />
                                </span>
                            </div>
                        </Link>
                    </div>
                ))}

                {filteredProjects.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-center text-muted">
                        <Briefcase size={48} className="mb-4 opacity-20" />
                        <p>No projects found.</p>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <ProjectModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    project={editingProject}
                    onSubmit={editingProject ? updateProject : addProject}
                    contacts={contacts}
                />
            )}
        </div>
    );
}

function ProjectModal({ isOpen, onClose, project, onSubmit, contacts }: { isOpen: any, onClose: any, project: any, onSubmit: any, contacts: any }) {
    const [formData, setFormData] = useState({
        name: project?.name || '',
        contact_id: project?.contact_id || '',
        status: project?.status || 'active',
        start_date: project?.start_date || new Date().toISOString().split('T')[0],
        description: project?.description || ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        const res = project
            ? await onSubmit(project.id, formData)
            : await onSubmit(formData);

        if (res.success) {
            onClose();
        } else {
            alert("Error saving project");
        }
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
                    <h2 className="text-lg font-semibold text-white">{project ? 'Edit Project' : 'New Project'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={20} className="text-muted hover:text-white" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
                    <div>
                        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Project Name</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                            placeholder="e.g. Villa Renovation"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Client</label>
                        <select
                            value={formData.contact_id}
                            onChange={e => setFormData({ ...formData, contact_id: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                        >
                            <option value="">Select Client</option>
                            {contacts.map((c: any) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Status</label>
                            <select
                                value={formData.status}
                                onChange={e => setFormData({ ...formData, status: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                            >
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="on-hold">On Hold</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Start Date</label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-muted uppercase tracking-wider mb-1.5">Description (Optional)</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-[var(--accent)] transition-colors min-h-[80px]"
                            placeholder="Project details..."
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="mt-2 w-full bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white font-medium py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? 'Saving...' : 'Save Project'}
                    </button>
                </form>
            </div>
        </div>
    );
}
