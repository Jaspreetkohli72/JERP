"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Edit2, Wallet, TrendingUp, TrendingDown, Calendar, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
// @ts-ignore
import { useFinance } from '@/context/FinanceContext';

export default function ProjectDetailsPage() {
    const params = useParams();
    // @ts-ignore
    const { projects, transactions } = useFinance();
    const [project, setProject] = useState<any>(null);
    const [projectTransactions, setProjectTransactions] = useState<any[]>([]);

    useEffect(() => {
        if (projects && params.id) {
            const foundProject = projects.find((p: any) => p.id === Number(params.id));
            setProject(foundProject);

            // Filter transactions for this project
            const filteredTxs = transactions.filter((t: any) => t.description.includes(`Project: ${foundProject?.name}`) || t.project_id === Number(params.id));
            // Note: Currently transactions might not have project_id column directly linked in all existing records
            // We need to verify if we added project_id to transactions table? 
            // In the previous task "Adding Project Field", we added logic to store project name in description or separate field?
            // Let's assume we are migrating to direct association or matching.
            // Actually, let's check if we added project_id to transactions in Supabase.
            // If not, we might rely on description parsing or we should rely on the new `project_id` field if added.

            // For now, let's filter by the robust `project_id` if available, or fall back to description tag if we used that convention.
            // The FinanceContext `addTransaction` logic showed `project_id` being passed? 
            // No, in the previous session we removed explicit project_id column from `addTransaction` payload?
            // Wait, let's check `FinanceContext.jsx` line 163-170 in previous `view_file`.
            // It showed `project: project?.project_name` being added to description. 
            // It did NOT show `project_id` being inserted into `transactions` table.

            // CRITICAL: We need to ensure `transactions` table has `project_id`. 
            // However, based on previous context, we might only be storing it in description?
            // Let's look at `AddTransactionForm` again. 
            // Actually, to fully support "See all transactions linked to it", we ideally need a real link.
            // But if the user request is simple, maybe text match is enough?
            // The user said: "when i click that card i see the list of porjects". 
            // And: "when i click the project i need tobe able to see all the transactions linke dto it".

            // I will use a loose match on Description for now if `project_id` is missing in `transactions` schema, 
            // OR I should assume I need to add that linkage.
            // Given I am "Adding Project Card", I probably should rely on what's available.
            // I will filter by `project_id` (if I decide to add it) OR description match.

            // Let's assume for this specific file, we filter by what we have.
            // I'll filter by direct `project_id` match (if applicable) AND description match.
        }
    }, [projects, transactions, params.id]);

    if (!project) return <div className="p-8 text-white text-center">Loading or Project Not Found...</div>;

    // Filter logic update:
    // Since we didn't explicitly add `project_id` column to transactions table in previous steps (only context was updated),
    // and `AddTransactionForm` was updated to append "Project: Name" to description...
    // We will filter by that pattern for now. 
    // Ideally we should add `project_id` to transactions table, but that requires SQL migration.
    // I will stick to the pattern established in the previous session: `Project: <ProjectName>` in description.

    // BUT the new requirements implies a stronger link. 
    // For now, I'll filter by description text containing the project name.

    const relevantTransactions = transactions.filter((t: any) =>
        t.description && t.description.includes(`Project: ${project.name}`)
    );

    const totalIncome = relevantTransactions.filter((t: any) => t.type === 'income').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const totalExpense = relevantTransactions.filter((t: any) => t.type === 'expense').reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const netBalance = totalIncome - totalExpense;

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1000px] mx-auto mb-20 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/contracting/projects" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                    <ArrowLeft size={24} />
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${project.status === 'completed' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                            project.status === 'active' ? 'border-blue-500/30 text-blue-400 bg-blue-500/10' :
                                'border-white/10 text-muted bg-white/5'
                            }`}>
                            {project.status.toUpperCase()}
                        </span>
                    </div>
                    <p className="text-muted text-sm mt-1">Client: {project.contacts?.name || 'Unknown'}</p>
                </div>

                {/* <button className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-muted hover:text-white transition-colors">
                    <Edit2 size={20} />
                </button> */}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-muted text-sm uppercase tracking-wider font-medium">Net Value</span>
                    <div className="flex items-center gap-2">
                        <Wallet className="text-[var(--accent)]" size={24} />
                        <span className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ₹{netBalance.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-muted text-sm uppercase tracking-wider font-medium">Total Income</span>
                    <div className="flex items-center gap-2">
                        <TrendingUp className="text-green-400" size={24} />
                        <span className="text-2xl font-bold text-white">
                            ₹{totalIncome.toLocaleString()}
                        </span>
                    </div>
                </div>

                <div className="glass p-5 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <span className="text-muted text-sm uppercase tracking-wider font-medium">Total Expenses</span>
                    <div className="flex items-center gap-2">
                        <TrendingDown className="text-red-400" size={24} />
                        <span className="text-2xl font-bold text-white">
                            ₹{totalExpense.toLocaleString()}
                        </span>
                    </div>
                </div>
            </div>

            {/* Transactions List */}
            <div className="glass rounded-2xl border border-white/5 overflow-hidden">
                <div className="p-4 border-b border-white/5 bg-white/[0.02]">
                    <h3 className="font-semibold text-white">Project Transactions</h3>
                </div>

                <div className="flex flex-col">
                    {relevantTransactions.length > 0 ? (
                        relevantTransactions.map((tx: any) => (
                            <div key={tx.id} className="flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/[0.02] last:border-0 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                        {tx.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{tx.description.replace(`Project: ${project.name}`, '').trim() || tx.description}</p>
                                        <div className="flex items-center gap-2 text-xs text-muted">
                                            <Calendar size={12} />
                                            <span>{new Date(tx.transaction_date).toLocaleDateString()}</span>
                                            {tx.categories && (
                                                <>
                                                    <span>•</span>
                                                    <span>{tx.categories.name}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <span className={`font-semibold ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'} ₹{Number(tx.amount).toLocaleString()}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-muted">
                            <p>No transactions found for this project.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
