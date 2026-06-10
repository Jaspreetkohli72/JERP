"use client";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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
    const [dropdownStyle, setDropdownStyle] = useState({});
    const [mounted, setMounted] = useState(false);
    const containerRef = useRef(null);
    const dropdownRef = useRef(null);

    useEffect(() => { setMounted(true); }, []);

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
        return Object.entries(options).map(([k, v]) => ({
            value: k,
            label: String(v),
        }));
    }, [options]);

    const selectedOption = normalizedOptions.find(opt => String(opt.value) === String(value));

    const openDropdown = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setDropdownStyle({
                position: "fixed",
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                zIndex: 99999,
            });
        }
        setIsOpen(prev => !prev);
    };

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        function handleClickOutside(event) {
            if (
                containerRef.current && 
                !containerRef.current.contains(event.target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    // Reposition on scroll/resize while open
    useEffect(() => {
        if (!isOpen) return;
        function reposition() {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDropdownStyle(prev => ({
                    ...prev,
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width,
                }));
            }
        }
        window.addEventListener("scroll", reposition, true);
        window.addEventListener("resize", reposition);
        return () => {
            window.removeEventListener("scroll", reposition, true);
            window.removeEventListener("resize", reposition);
        };
    }, [isOpen]);

    const handleSelect = (val) => {
        if (onChange) onChange(val);
        setIsOpen(false);
    };

    const hasCustomPadding = triggerClassName.includes("p-") || triggerClassName.includes("px-") || triggerClassName.includes("py-");
    const hasCustomText = triggerClassName.includes("text-");
    const defaultTriggerClass = `w-full ${hasCustomPadding ? "" : "px-4 py-3"} bg-black/20 border border-white/10 rounded-xl focus:outline-none focus:border-white/20 ${hasCustomText ? "" : "text-sm"} text-left flex justify-between items-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all ${triggerClassName}`;

    const dropdown = isOpen && mounted ? createPortal(
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className={`bg-[#1e1e2e] border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto custom-scrollbar ${dropdownClassName}`}
        >
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
        </div>,
        document.body
    ) : null;

    return (
        <div ref={containerRef} className={className}>
            <button
                type="button"
                disabled={disabled}
                onClick={openDropdown}
                className={defaultTriggerClass}
            >
                <span className={!selectedOption && placeholder !== "" ? "text-gray-400" : "text-white"}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="text-muted text-[10px] ml-2 select-none">▼</span>
            </button>
            {dropdown}
        </div>
    );
}
