"use client";
import React, { useState, useEffect, useRef } from "react";

export default function CustomSelect({
    value,
    onChange,
    options = [],
    placeholder = "Select Option",
    className = "relative w-full",
    triggerClassName = "",
    dropdownClassName = "",
    optionClassName = "",
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Normalize options to [{ value, label }]
    const normalizedOptions = React.useMemo(() => {
        if (!options) return [];
        if (Array.isArray(options)) {
            return options.map(opt => {
                if (typeof opt === "object" && opt !== null) {
                    const val = opt.value !== undefined ? opt.value : opt.id;
                    const lbl = opt.label || opt.name || String(val ?? "");
                    return { value: val, label: lbl };
                }
                return { value: opt, label: String(opt) };
            });
        }
        // If options is an object map: { key: value }
        return Object.entries(options).map(([k, v]) => ({
            value: k,
            label: String(v),
        }));
    }, [options]);

    const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (val) => {
        if (onChange) {
            onChange(val);
        }
        setIsOpen(false);
    };

    // Determine default trigger classes if not fully overridden
    const hasCustomPadding = triggerClassName.includes("p-") || triggerClassName.includes("px-") || triggerClassName.includes("py-");
    const hasCustomText = triggerClassName.includes("text-");
    const defaultTriggerClass = `w-full ${hasCustomPadding ? "" : "px-4 py-3"} bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 ${hasCustomText ? "" : "text-sm"} text-left flex justify-between items-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${triggerClassName}`;

    return (
        <div ref={containerRef} className={className}>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={defaultTriggerClass}
            >
                <span className={!selectedOption && placeholder !== "" ? "text-gray-400" : "text-white"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="text-muted text-[10px] ml-2 select-none">▼</span>
            </button>

            {isOpen && (
                <div className={`absolute top-full left-0 right-0 mt-1 z-50 bg-[#1e1e2e] border border-white/10 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto custom-scrollbar ${dropdownClassName}`}>
                    {normalizedOptions.map((opt, i) => {
                        const isAction = String(opt.value) === "create_new" || String(opt.label).startsWith("+");
                        return (
                            <button
                                key={`${opt.value}-${i}`}
                                type="button"
                                onClick={() => handleSelect(opt.value)}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors ${
                                    isAction 
                                        ? "text-[var(--accent)] font-semibold border-t border-white/5 mt-1" 
                                        : "text-white"
                                } ${optionClassName}`}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
