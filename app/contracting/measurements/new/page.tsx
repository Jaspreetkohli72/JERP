"use client";
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFinance } from '@/context/FinanceContext';
import { ArrowLeft, Plus, Trash2, Save, Link as LinkIcon, Camera, Upload } from 'lucide-react';
import Link from 'next/link';

export default function CreateMeasurementPage() {
    const router = useRouter();
    // @ts-ignore
    const { createMeasurement, estimates } = useFinance();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: '',
        date: new Date().toISOString().split('T')[0],
        estimate_id: ''
    });

    // Segmented controller mode: 'table' | 'text' | 'picture'
    const [inputMode, setInputMode] = useState<'table' | 'text' | 'picture'>('table');
    const [textNotes, setTextNotes] = useState('');
    const [pictureBase64, setPictureBase64] = useState('');
    const [totalQty, setTotalQty] = useState('');
    const [selectedUnit, setSelectedUnit] = useState('sqft');

    // Camera/Webcam State
    const [isCapturing, setIsCapturing] = useState(false);
    const [stream, setStream] = useState<MediaStream | null>(null);

    // M-Book Items: Description, Length, Width (Breadth), Nos (Depth), Quantity
    // depth is repurposed as 'Nos' (Count) for Steel Fabrication mode
    const [items, setItems] = useState([
        { description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0 }
    ]);

    // Clean up camera stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);

    const startCamera = async () => {
        try {
            setIsCapturing(true);
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, // Prefer back camera on mobile
                audio: false
            });
            setStream(mediaStream);
            setTimeout(() => {
                const video = document.getElementById('webcam') as HTMLVideoElement;
                if (video) {
                    video.srcObject = mediaStream;
                }
            }, 100);
        } catch (err) {
            console.error("Camera access error:", err);
            alert("Could not access camera. Please upload a file instead.");
            setIsCapturing(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setIsCapturing(false);
    };

    const capturePhoto = () => {
        const video = document.getElementById('webcam') as HTMLVideoElement;
        if (video) {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/jpeg');
                setPictureBase64(dataUrl);
            }
            stopCamera();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPictureBase64(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        // @ts-ignore
        newItems[index][field] = value;

        // Auto-calculate quantity
        // Logic: Length * Width * Nos
        if (['length', 'breadth', 'depth'].includes(field)) {
            const l = Number(newItems[index].length) || 0;
            const b = Number(newItems[index].breadth) || 0;
            const nos = Number(newItems[index].depth) || 0; // 'depth' stored as Nos

            let qty = 0;
            // Default calculation: L * W * Nos
            qty = l * b * nos;

            // Round to 2 decimals
            newItems[index].quantity = Math.round((qty + Number.EPSILON) * 100) / 100;
        }

        setItems(newItems);
    };

    const addItem = () => {
        setItems([...items, { description: '', length: 0, breadth: 0, depth: 1, unit: 'sqft', quantity: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateTotalQty = () => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const submitData = {
            ...formData,
            estimate_id: formData.estimate_id === '' ? null : formData.estimate_id
        };

        let submitItems = [];
        if (inputMode === 'table') {
            submitItems = items;
        } else if (inputMode === 'text') {
            if (!textNotes.trim()) {
                alert('Please enter text notes for measurements.');
                setLoading(false);
                return;
            }
            submitItems = [{
                description: textNotes,
                length: 0,
                breadth: 0,
                depth: 0,
                unit: selectedUnit,
                quantity: Number(totalQty) || 0
            }];
        } else {
            if (!pictureBase64) {
                alert('Please upload or take a picture of the measurements.');
                setLoading(false);
                return;
            }
            submitItems = [{
                description: pictureBase64,
                length: 0,
                breadth: 0,
                depth: 0,
                unit: selectedUnit,
                quantity: Number(totalQty) || 0
            }];
        }

        const { success } = await createMeasurement(submitData, submitItems);

        if (success) {
            router.push('/contracting/measurements');
        } else {
            alert('Failed to save measurement');
        }
        setLoading(false);
    };

    return (
        <div className="p-4 md:p-8 text-white max-w-[1000px] mx-auto mb-20">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/contracting/measurements" className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <ArrowLeft size={20} />
                </Link>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold">New Measurement (Steel/Fabrication)</h1>
                    <p className="text-sm text-gray-400">Record dimensions for Grills, Gates, Sheds</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                {/* Info */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <h2 className="text-lg font-semibold text-[var(--accent)] border-b border-white/10 pb-2">Record Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Title / Location *</label>
                            <input required type="text" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none text-white" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Window Grills for Mr. Sharma" />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm text-gray-400">Date</label>
                            <input type="date" className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none [color-scheme:dark] text-white" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm text-gray-400 flex items-center gap-2">
                            <LinkIcon size={14} /> Link to Estimate (Optional)
                        </label>
                        <select
                            className="input-field bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none appearance-none bg-gray-900 text-white"
                            value={formData.estimate_id}
                            onChange={e => setFormData({ ...formData, estimate_id: e.target.value })}
                        >
                            <option value="" className="bg-gray-900 text-gray-400">-- Select Estimate --</option>
                            {estimates && estimates.map((est: any) => (
                                <option key={est.id} value={est.id} className="bg-gray-900 text-white">
                                    {est.client_name} - {est.project_name} (Total: ₹{est.total_amount})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* measurement Items */}
                <div className="glass p-6 rounded-xl flex flex-col gap-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-white/10 pb-3 gap-3">
                        <h2 className="text-lg font-semibold text-[var(--accent)]">Measurements</h2>
                        <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 w-fit">
                            <button
                                type="button"
                                onClick={() => setInputMode('table')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${inputMode === 'table' ? 'bg-[var(--accent)] text-black font-semibold shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Dimensions Table
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMode('text')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${inputMode === 'text' ? 'bg-[var(--accent)] text-black font-semibold shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Text Notes
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMode('picture')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${inputMode === 'picture' ? 'bg-[var(--accent)] text-black font-semibold shadow' : 'text-gray-400 hover:text-white'}`}
                            >
                                Upload / Take Photo
                            </button>
                        </div>
                    </div>

                    {inputMode === 'table' && (
                        <div className="flex flex-col gap-2">
                            {/* Header Row */}
                            <div className="grid grid-cols-[1fr_70px_70px_50px_60px_80px_40px] gap-2 text-xs text-gray-400 font-semibold px-2 mb-1 hidden md:grid text-center">
                                <div className="text-left">DESCRIPTION</div>
                                <div>LENGTH</div>
                                <div>WIDTH</div>
                                <div>NOS</div>
                                <div>UNIT</div>
                                <div>QTY</div>
                                <div></div>
                            </div>

                            {items.map((item, index) => (
                                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_70px_70px_50px_60px_80px_40px] gap-2 items-start bg-white/5 p-3 rounded-lg md:bg-transparent md:p-0">
                                    <input type="text" placeholder="Description (e.g. Window W1)" className="input-field bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none w-full text-white" value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} required />

                                    <div className="flex items-center gap-1 md:hidden">
                                        <span className="text-xs text-gray-500 w-16">Length:</span>
                                        <input type="number" placeholder="L" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm w-full text-center text-white" value={item.length || ''} onChange={e => handleItemChange(index, 'length', e.target.value)} min="0" step="0.01" />
                                    </div>
                                    <input type="number" placeholder="L" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center hidden md:block focus:border-[var(--accent)] focus:outline-none text-white" value={item.length || ''} onChange={e => handleItemChange(index, 'length', e.target.value)} min="0" step="0.01" />

                                    <div className="flex items-center gap-1 md:hidden">
                                        <span className="text-xs text-gray-500 w-16">Width:</span>
                                        <input type="number" placeholder="W" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm w-full text-center text-white" value={item.breadth || ''} onChange={e => handleItemChange(index, 'breadth', e.target.value)} min="0" step="0.01" />
                                    </div>
                                    <input type="number" placeholder="W" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center hidden md:block focus:border-[var(--accent)] focus:outline-none text-white" value={item.breadth || ''} onChange={e => handleItemChange(index, 'breadth', e.target.value)} min="0" step="0.01" />

                                    <div className="flex items-center gap-1 md:hidden">
                                        <span className="text-xs text-gray-500 w-16">Nos:</span>
                                        <input type="number" placeholder="Nos" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm w-full text-center text-white" value={item.depth || ''} onChange={e => handleItemChange(index, 'depth', e.target.value)} min="0" step="1" />
                                    </div>
                                    <input type="number" placeholder="Nos" className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center hidden md:block focus:border-[var(--accent)] focus:outline-none text-white" value={item.depth || ''} onChange={e => handleItemChange(index, 'depth', e.target.value)} min="0" step="1" />

                                    <select className="input-field bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-center focus:border-[var(--accent)] focus:outline-none bg-gray-900 text-white" value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)}>
                                        <option value="sqft">SQFT</option>
                                        <option value="pcs">PCS</option>
                                        <option value="kg">KG</option>
                                    </select>

                                    <div className="flex items-center gap-1 md:hidden">
                                        <span className="text-xs text-gray-500 w-16">Total:</span>
                                        <div className="input-field flex items-center justify-end bg-black/20 text-[var(--accent)] font-bold pointer-events-none rounded-lg px-4 py-2 text-sm w-full">
                                            {Number(item.quantity).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="input-field flex items-center justify-center bg-black/20 text-[var(--accent)] font-bold pointer-events-none rounded-lg px-2 py-2 text-sm hidden md:flex">
                                        {Number(item.quantity).toLocaleString()}
                                    </div>

                                    <button type="button" onClick={() => removeItem(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center h-full">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}

                            <button type="button" onClick={addItem} className="mt-2 text-[var(--accent)] text-sm font-semibold hover:underline flex items-center gap-1 w-fit">
                                <Plus size={16} /> Add Entry
                            </button>
                        </div>
                    )}

                    {inputMode === 'text' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-400">Measurement Notes / Details</label>
                                <textarea
                                    required={inputMode === 'text'}
                                    value={textNotes}
                                    onChange={e => setTextNotes(e.target.value)}
                                    placeholder="Write custom measurements details here..."
                                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 text-sm focus:border-[var(--accent)] focus:outline-none min-h-[150px] text-white"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-400">Total Quantity</label>
                                    <input
                                        type="number"
                                        required={inputMode === 'text'}
                                        value={totalQty}
                                        onChange={e => setTotalQty(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none text-white"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-400">Unit</label>
                                    <select
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none bg-gray-900 text-white"
                                        value={selectedUnit}
                                        onChange={e => setSelectedUnit(e.target.value)}
                                    >
                                        <option value="sqft">SQFT</option>
                                        <option value="pcs">PCS</option>
                                        <option value="kg">KG</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {inputMode === 'picture' && (
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm text-gray-400">Handwritten measurement sheet / layout photo</label>
                                {!pictureBase64 && !isCapturing && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border border-dashed border-white/20 hover:border-[var(--accent)]/50 rounded-xl p-6 flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-all relative cursor-pointer min-h-[150px]">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer"
                                                onChange={handleFileChange}
                                            />
                                            <Upload className="text-gray-400 mb-2" size={24} />
                                            <p className="text-sm font-medium text-gray-300">Upload File</p>
                                            <p className="text-xs text-gray-500 mt-1">PNG, JPG, WEBP</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={startCamera}
                                            className="border border-dashed border-white/20 hover:border-[var(--accent)]/50 rounded-xl p-6 flex flex-col items-center justify-center bg-black/20 hover:bg-black/30 transition-all min-h-[150px] text-gray-300 hover:text-white"
                                        >
                                            <Camera className="text-gray-400 mb-2" size={24} />
                                            <span className="text-sm font-medium">Take Photo</span>
                                            <span className="text-xs text-gray-500 mt-1">Snap with device camera</span>
                                        </button>
                                    </div>
                                )}

                                {isCapturing && (
                                    <div className="flex flex-col items-center gap-3 bg-black/30 border border-white/10 p-4 rounded-xl">
                                        <video id="webcam" autoPlay playsInline className="w-full max-w-md rounded-lg bg-black object-cover aspect-video border border-white/10"></video>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={capturePhoto}
                                                className="bg-[var(--accent)] text-black font-bold px-4 py-2 rounded-lg text-sm transition-all hover:opacity-90 flex items-center gap-1.5"
                                            >
                                                <Camera size={16} /> Capture
                                            </button>
                                            <button
                                                type="button"
                                                onClick={stopCamera}
                                                className="bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2 rounded-lg text-sm transition-all"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {pictureBase64 && (
                                    <div className="relative w-fit max-w-full rounded-xl overflow-hidden border border-white/10 group mx-auto md:mx-0">
                                        <img src={pictureBase64} alt="Uploaded measurements preview" className="max-h-[250px] object-contain rounded-xl" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <button
                                                type="button"
                                                onClick={() => setPictureBase64('')}
                                                className="bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all"
                                            >
                                                Remove Photo
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-400">Total Quantity</label>
                                    <input
                                        type="number"
                                        required={inputMode === 'picture'}
                                        value={totalQty}
                                        onChange={e => setTotalQty(e.target.value)}
                                        placeholder="0.00"
                                        min="0"
                                        step="0.01"
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none text-white"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm text-gray-400">Unit</label>
                                    <select
                                        className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm focus:border-[var(--accent)] focus:outline-none bg-gray-900 text-white"
                                        value={selectedUnit}
                                        onChange={e => setSelectedUnit(e.target.value)}
                                    >
                                        <option value="sqft">SQFT</option>
                                        <option value="pcs">PCS</option>
                                        <option value="kg">KG</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="glass p-6 rounded-xl flex items-center justify-between sticky bottom-4 z-10 border border-white/10 shadow-xl">
                    <div className="text-xl font-bold">
                        Total: <span className="text-[var(--accent)]">
                            {inputMode === 'table' ? calculateTotalQty().toLocaleString() : (Number(totalQty) || 0).toLocaleString()}
                        </span>{' '}
                        {(inputMode === 'table' ? (items[0]?.unit || 'sqft') : selectedUnit).toUpperCase()}
                    </div>
                    <button type="submit" disabled={loading} className="bg-[var(--accent)] text-black px-6 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity flex items-center gap-2">
                        {loading ? 'Saving...' : <><Save size={20} /> Save Measurement</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
