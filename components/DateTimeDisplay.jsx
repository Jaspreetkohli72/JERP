"use client";
import React, { useState, useEffect } from "react";

export default function DateTimeDisplay() {
    const [dateTime, setDateTime] = useState(null);
    const [timeZone, setTimeZone] = useState("Asia/Kolkata");
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Common Timezones
    const regions = [
        { name: "India (IST)", zone: "Asia/Kolkata" },
        { name: "USA (New York)", zone: "America/New_York" },
        { name: "USA (Los Angeles)", zone: "America/Los_Angeles" },
        { name: "UK (London)", zone: "Europe/London" },
        { name: "Australia (Sydney)", zone: "Australia/Sydney" },
        { name: "Japan (Tokyo)", zone: "Asia/Tokyo" },
        { name: "Dubai (GST)", zone: "Asia/Dubai" },
    ];

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const options = {
                timeZone: timeZone,
                weekday: "short",
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
            };
            try {
                setDateTime(new Intl.DateTimeFormat("en-IN", options).format(now));
            } catch (e) {
                console.error("Time format error", e);
                setDateTime(now.toLocaleTimeString()); // Fallback
            }
        };

        updateTime(); // Initial
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, [timeZone]);

    if (!dateTime) return <span className="text-[0.78rem] tracking-widest uppercase text-muted">Loading...</span>;

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                className="text-[0.78rem] tracking-widest uppercase text-muted hover:text-white transition-colors text-left"
            >
                {dateTime}
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-xs bg-[#1e1e2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-white/5 flex justify-between items-center">
                            <h3 className="font-medium text-white text-sm">Select Region</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted hover:text-white">✕</button>
                        </div>
                        <div className="max-h-64 overflow-y-auto p-2">
                            {regions.map((region) => (
                                <button
                                    key={region.zone}
                                    onClick={() => {
                                        setTimeZone(region.zone);
                                        setIsModalOpen(false);
                                    }}
                                    className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors mb-1 ${timeZone === region.zone
                                            ? "bg-accent/20 text-accent"
                                            : "hover:bg-white/5 text-gray-300"
                                        }`}
                                >
                                    {region.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
