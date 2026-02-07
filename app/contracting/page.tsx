import Link from 'next/link';
import { FileText, Ruler, Receipt } from 'lucide-react';

export default function ContractingPage() {
    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 text-white max-w-[1200px] mx-auto mb-20">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-[var(--accent)] to-[var(--accent-3)] bg-clip-text text-transparent">Contracting</h1>
                <p className="text-muted text-sm mt-1">Manage Estimates, Measurements, and Billing.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Estimates Card */}
                <Link href="/contracting/estimates" className="glass p-6 rounded-xl flex flex-col gap-4 group hover:bg-white/5 transition-colors border border-white/5 hover:border-[var(--accent)]/50">
                    <div className="p-3 bg-blue-500/20 w-fit rounded-lg text-blue-400 group-hover:scale-110 transition-transform">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-200">Estimates</h2>
                        <p className="text-muted text-sm mt-1">Create quotations, track status, and print PDFs.</p>
                    </div>
                </Link>

                {/* Measurements Card */}
                <Link href="/contracting/measurements" className="glass p-6 rounded-xl flex flex-col gap-4 group hover:bg-white/5 transition-colors border border-white/5 hover:border-[var(--accent)]/50">
                    <div className="p-3 bg-yellow-500/20 w-fit rounded-lg text-yellow-400 group-hover:scale-110 transition-transform">
                        <Ruler size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-200">Measurements</h2>
                        <p className="text-muted text-sm mt-1">Record on-site measurements (M-Book).</p>
                    </div>
                </Link>

                {/* Bills Card */}
                <Link href="/contracting/bills" className="glass p-6 rounded-xl flex flex-col gap-4 group hover:bg-white/5 transition-colors border border-white/5 hover:border-[var(--accent)]/50">
                    <div className="p-3 bg-red-500/20 w-fit rounded-lg text-red-500 group-hover:scale-110 transition-transform">
                        <FileText size={32} />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-gray-200">Bills</h2>
                        <p className="text-muted text-sm mt-1">Generate invoices and track payments.</p>
                    </div>
                </Link>


            </div>
        </div>
    );
}
