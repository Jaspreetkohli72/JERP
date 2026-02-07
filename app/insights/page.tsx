"use client";
import React, { useState } from "react";
import Analytics from "../../components/Dashboard/Analytics";
import DetailedAnalytics from "../../components/Insights/DetailedAnalytics";
import BudgetCard from "../../components/Dashboard/BudgetCard";

export default function InsightsPage() {
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

    return (
        <div className="flex flex-col gap-4 pb-24">
            <header className="flex items-center justify-between px-3 pt-0 pb-2">
                <div className="flex flex-col gap-0.5">
                    <span className="text-[1.2rem] font-semibold text-text">Financial Insights</span>
                </div>
            </header>

            <div className="px-1">
                <BudgetCard month={selectedMonth} onMonthChange={setSelectedMonth} />
            </div>

            <Analytics />
            <DetailedAnalytics />
        </div>
    );
}
