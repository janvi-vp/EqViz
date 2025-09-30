'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Eye, EyeOff, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react';
import * as math from 'mathjs';

const MathVisualizer: React.FC = () => {
    type Equation = {
        id: number;
        expr: string;
        visible: boolean;
        color: string;
        error: string | null;
    };
    const [equations, setEquations] = useState<Equation[]>([
        { id: 1, expr: 'sin(x)', visible: true, color: '#3b82f6', error: null }
    ]);
    const [nextId, setNextId] = useState<number>(2);
    const [activeInput, setActiveInput] = useState<number | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [xMin, setXMin] = useState<number>(-10);
    const [xMax, setXMax] = useState<number>(10);
    const [yMin, setYMin] = useState<number>(-10);
    const [yMax, setYMax] = useState<number>(10);
    const [showHelp, setShowHelp] = useState<boolean>(false);

    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

    const validateAndParse = (expr: string) => {
        if (!expr.trim()) return { valid: false, compiled: null, error: null };
        try {
            const compiled = math.compile(expr);
            compiled.evaluate({ x: 0, y: 0 });
            return { valid: true, compiled, error: null };
        } catch (e: unknown) {
            let errorMsg = 'Unknown error';
            if (e instanceof Error) {
                errorMsg = e.message;
            } else if (typeof e === 'object' && e !== null && 'message' in e) {
                errorMsg = String((e as { message?: string }).message);
            }
            return { valid: false, compiled: null, error: errorMsg };
        }
    };

    const addEquation = (): void => {
        const newEq = {
            id: nextId,
            expr: '',
            visible: true,
            color: colors[nextId % colors.length],
            error: null
        };
        setEquations([...equations, newEq]);
        setNextId(nextId + 1);
        setTimeout(() => {
            setActiveInput(nextId);
            document.getElementById(`eq-input-${nextId}`)?.focus();
        }, 100);
    };

    const removeEquation = (id: number): void => {
        setEquations(equations.filter(eq => eq.id !== id));
    };

    const updateEquation = (id: number, newExpr: string): void => {
        setEquations(equations.map(eq => {
            if (eq.id === id) {
                const validation = validateAndParse(newExpr);
                return { ...eq, expr: newExpr, error: validation.error };
            }
            return eq;
        }));
    };

    const toggleVisibility = (id: number): void => {
        setEquations(equations.map(eq =>
            eq.id === id ? { ...eq, visible: !eq.visible } : eq
        ));
    };

    const insertSymbol = (symbol: string): void => {
        if (activeInput === null) return;

    const input = document.getElementById(`eq-input-${activeInput}`) as HTMLInputElement | null;
    if (!input) return;

    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;
        const eq = equations.find(e => e.id === activeInput);

        if (eq) {
            const newExpr = eq.expr.substring(0, start) + symbol + eq.expr.substring(end);
            updateEquation(activeInput, newExpr);
            setTimeout(() => {
                input.focus();
                const newPos = start + symbol.length;
                input.setSelectionRange(newPos, newPos);
            }, 0);
        }
    };

    const resetView = (): void => {
        setXMin(-10);
        setXMax(10);
        setYMin(-10);
        setYMax(10);
    };

    const zoomIn = (): void => {
        const xRange = (xMax - xMin) * 0.25;
        const yRange = (yMax - yMin) * 0.25;
        setXMin(xMin + xRange);
        setXMax(xMax - xRange);
        setYMin(yMin + yRange);
        setYMax(yMax - yRange);
    };

    const zoomOut = (): void => {
        const xRange = (xMax - xMin) * 0.25;
        const yRange = (yMax - yMin) * 0.25;
        setXMin(xMin - xRange);
        setXMax(xMax + xRange);
        setYMin(yMin - yRange);
        setYMax(yMax + yRange);
    };

    const loadExample = (expr: string): void => {
        if (equations.length === 1 && !equations[0].expr) {
            updateEquation(equations[0].id, expr);
        } else {
            const newEq = {
                id: nextId,
                expr,
                visible: true,
                color: colors[nextId % colors.length],
                error: null
            };
            setEquations([...equations, newEq]);
            setNextId(nextId + 1);
        }
    };

    useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        const xRange = xMax - xMin;
        const yRange = yMax - yMin;

    const toCanvasX = (x: number) => ((x - xMin) / xRange) * width;
    const toCanvasY = (y: number) => height - ((y - yMin) / yRange) * height;

        // Draw grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;

        const xStep = Math.pow(10, Math.floor(Math.log10(xRange / 10)));
        const yStep = Math.pow(10, Math.floor(Math.log10(yRange / 10)));

        for (let i = Math.ceil(xMin / xStep) * xStep; i <= xMax; i += xStep) {
            const x = toCanvasX(i);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        for (let i = Math.ceil(yMin / yStep) * yStep; i <= yMax; i += yStep) {
            const y = toCanvasY(i);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 2;

        if (xMin <= 0 && xMax >= 0) {
            const x = toCanvasX(0);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }

        if (yMin <= 0 && yMax >= 0) {
            const y = toCanvasY(0);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw axis labels
        ctx.fillStyle = '#374151';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = Math.ceil(xMin / xStep) * xStep; i <= xMax; i += xStep) {
            if (Math.abs(i) < xStep / 10) continue;
            const x = toCanvasX(i);
            const y = toCanvasY(0);
            ctx.fillText(i.toFixed(1), x, Math.min(y + 5, height - 15));
        }

        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = Math.ceil(yMin / yStep) * yStep; i <= yMax; i += yStep) {
            if (Math.abs(i) < yStep / 10) continue;
            const x = toCanvasX(0);
            const y = toCanvasY(i);
            ctx.fillText(i.toFixed(1), Math.max(x - 5, 35), y);
        }

        // Plot equations
        equations.forEach(eq => {
            if (!eq.visible || !eq.expr || eq.error) return;

            const validation = validateAndParse(eq.expr);
            if (!validation.valid) return;

            ctx.strokeStyle = eq.color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();

            let firstPoint = true;
            const step = xRange / (width * 2);

            for (let x = xMin; x <= xMax; x += step) {
                try {
                    const y = validation.compiled ? validation.compiled.evaluate({ x, y: 0 }) : undefined;
                    if (typeof y === 'number' && isFinite(y)) {
                        const cx = toCanvasX(x);
                        const cy = toCanvasY(y);

                        if (cy >= -10 && cy <= height + 10) {
                            if (firstPoint) {
                                ctx.moveTo(cx, cy);
                                firstPoint = false;
                            } else {
                                ctx.lineTo(cx, cy);
                            }
                        } else {
                            firstPoint = true;
                        }
                    } else {
                        firstPoint = true;
                    }
                } catch {
                    firstPoint = true;
                }
            }

            ctx.stroke();
        });
    }, [equations, xMin, xMax, yMin, yMax]);

    const utilityButtons = [
        { label: '+', value: '+', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
        { label: '−', value: '-', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
        { label: '×', value: '*', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
        { label: '÷', value: '/', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
        { label: 'xⁿ', value: '^', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
        { label: '=', value: '=', color: 'bg-blue-50 hover:bg-blue-100 text-blue-700' },
        { label: '(', value: '(', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
        { label: ')', value: ')', color: 'bg-purple-50 hover:bg-purple-100 text-purple-700' },
        { label: 'sin', value: 'sin()', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
        { label: 'cos', value: 'cos()', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
        { label: 'tan', value: 'tan()', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
        { label: 'log', value: 'log()', color: 'bg-green-50 hover:bg-green-100 text-green-700' },
        { label: '√', value: 'sqrt()', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
        { label: '|x|', value: 'abs()', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
        { label: 'eˣ', value: 'e^', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
        { label: 'π', value: 'pi', color: 'bg-amber-50 hover:bg-amber-100 text-amber-700' },
        { label: 'x', value: 'x', color: 'bg-slate-50 hover:bg-slate-100 text-slate-700' },
        { label: 'y', value: 'y', color: 'bg-slate-50 hover:bg-slate-100 text-slate-700' },
    ];

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-indigo-50 via-blue-100 to-cyan-50 p-2 sm:p-4 lg:p-6 relative overflow-hidden">
            {/* Accent Bar */}
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 opacity-70 z-10 rounded-b-xl animate-pulse" />
            {/* Project Header */}
            <header className="max-w-7xl mx-auto mb-8">
                <h1 className="text-5xl font-extrabold text-cyan-700 drop-shadow-2xl text-center mb-2 tracking-tight font-[Poppins,Segoe UI,sans-serif] animate-fade-in">EqViz</h1>
                <p className="text-lg text-blue-500 text-center font-semibold animate-fade-in">Redefining how we see math</p>
            </header>
            <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-6">
                {/* Left Panel */}
                <div className="w-full lg:w-96 bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 max-h-[90vh] overflow-y-auto border border-blue-100 transition-all duration-500 animate-fade-in">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-2xl font-bold text-indigo-700">Equations</h1>
                        <button
                            onClick={() => setShowHelp(!showHelp)}
                            className="text-sm text-cyan-700 hover:text-cyan-800 font-semibold bg-cyan-50 px-3 py-1 rounded shadow-sm border border-cyan-200 transition-all duration-200 hover:scale-105"
                        >
                            {showHelp ? 'Hide' : 'Show'} Help
                        </button>
                    </div>

                    {showHelp && (
                        <div className="mb-4 p-4 bg-white/60 backdrop-blur-md rounded-xl text-sm space-y-2 border border-blue-100 shadow-md animate-fade-in">
                            <p className="font-semibold text-cyan-900">Quick Tips:</p>
                            <ul className="list-disc list-inside text-blue-700 space-y-1">
                                <li>Click an input to activate it, then use buttons below</li>
                                <li>Use ^ for powers: x^2, sin(x)^3</li>
                                <li>Functions auto-add parentheses</li>
                                <li>Try the examples to get started!</li>
                            </ul>
                        </div>
                    )}

                    {/* Utility Buttons */}
                    <div className="mb-6 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-blue-100 shadow-md animate-fade-in">
                        <p className="text-xs font-semibold text-indigo-700 mb-2">INSERT SYMBOLS</p>
                        <div className="grid grid-cols-6 gap-1.5">
                            {utilityButtons.map(btn => (
                                <button
                                    key={btn.value}
                                    onClick={() => insertSymbol(btn.value)}
                                    disabled={activeInput === null}
                                    className={`px-2 py-2 rounded font-medium text-sm transition-all ${btn.color} ${activeInput === null ? 'opacity-40 cursor-not-allowed' : 'hover:scale-105'
                                        }`}
                                    title={btn.value}
                                >
                                    {btn.label}
                                </button>
                            ))}
                        </div>
                        {activeInput === null && (
                            <p className="text-xs text-gray-500 mt-2 text-center">Click an equation input to use buttons</p>
                        )}
                    </div>

                    {/* Equations List */}
                    <div className="space-y-3 mb-4">
                        {equations.map(eq => (
                            <div key={eq.id} className="border-2 rounded-2xl p-3 bg-white/70 backdrop-blur-lg hover:shadow-2xl transition-shadow border-blue-100 animate-fade-in">
                                <div className="flex items-center gap-2 mb-2">
                                    <div
                                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm shrink-0"
                                        style={{ backgroundColor: eq.color }}
                                    />
                                    <input
                                        id={`eq-input-${eq.id}`}
                                        type="text"
                                        value={eq.expr}
                                        onChange={(e) => updateEquation(eq.id, e.target.value)}
                                        onFocus={() => setActiveInput(eq.id)}
                                        placeholder="Enter equation (e.g., x^2)"
                                        className="flex-1 min-w-0 px-3 py-2 border-2 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white/80 text-indigo-900 placeholder-blue-400 shadow-sm transition-all duration-200"
                                    />
                                    <button
                                        onClick={() => toggleVisibility(eq.id)}
                                        className="p-2 hover:bg-cyan-200 rounded-xl transition-all duration-200 hover:scale-110 shrink-0 flex items-center justify-center"
                                        title={eq.visible ? 'Hide' : 'Show'}
                                    >
                                        {eq.visible ? <Eye size={18} className="text-cyan-700" /> : <EyeOff size={18} className="text-cyan-400" />}
                                    </button>
                                    <button
                                        onClick={() => removeEquation(eq.id)}
                                        className="p-2 hover:bg-red-200 rounded-xl text-red-600 transition-all duration-200 border border-red-200 hover:scale-110 shrink-0 flex items-center justify-center"
                                        title="Delete"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>

                                {eq.error && (
                                    <div className="text-red-700 text-xs mt-2 px-2 py-1 bg-white/70 backdrop-blur-md rounded-xl border border-red-200 shadow-sm">
                                        ⚠️ {eq.error}
                                    </div>
                                )}
                                {eq.expr && !eq.error && (
                                    <div className="text-green-700 text-xs mt-2 px-2 py-1 bg-white/70 backdrop-blur-md rounded-xl border border-green-200 shadow-sm">
                                        ✓ Valid equation
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={addEquation}
                        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-2xl flex items-center justify-center gap-2 font-semibold shadow-xl hover:shadow-2xl transition-all duration-200 border border-cyan-200 hover:scale-105"
                    >
                        <Plus size={20} />
                        Add New Equation
                    </button>

                    {/* Examples */}
                    <div className="mt-6 pt-6 border-t border-blue-200">
                        <h3 className="font-semibold mb-3 text-cyan-700">Examples - Click to Add</h3>
                        <div className="space-y-2">
                            {[
                                { expr: 'x^2', desc: 'Parabola' },
                                { expr: 'sin(x)', desc: 'Sine wave' },
                                { expr: 'cos(x)', desc: 'Cosine wave' },
                                { expr: 'log(x)', desc: 'Logarithm' },
                                { expr: 'e^x', desc: 'Exponential' },
                                { expr: 'sqrt(abs(x))', desc: 'Square root' },
                                { expr: '1/x', desc: 'Hyperbola' },
                                { expr: 'sin(x)^2 + cos(x)^2', desc: 'Trig identity' },
                            ].map(ex => (
                                <button
                                    key={ex.expr}
                                    onClick={() => loadExample(ex.expr)}
                                    className="w-full text-left px-3 py-2 bg-white/70 backdrop-blur-md hover:bg-cyan-100 rounded-xl text-sm transition-all duration-200 group border border-blue-100 hover:scale-105 shadow-sm"
                                >
                                    <span className="font-mono text-cyan-700 group-hover:text-blue-700">{ex.expr}</span>
                                    <span className="text-blue-500 ml-2">- {ex.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel - Canvas */}
                <div className="flex-1 bg-white/70 backdrop-blur-lg rounded-2xl shadow-2xl p-4 sm:p-6 border border-cyan-100 transition-all duration-500 animate-fade-in">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                        <h2 className="text-xl font-bold text-cyan-700 drop-shadow-md">Graph Visualization</h2>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={zoomIn}
                                className="px-3 py-2 bg-cyan-100 hover:bg-cyan-200 rounded-xl flex items-center gap-1 text-sm font-semibold transition-all duration-200 text-cyan-700 border border-cyan-200 hover:scale-105 shadow-sm"
                                title="Zoom In"
                            >
                                <ZoomIn size={16} />
                                Zoom In
                            </button>
                            <button
                                onClick={zoomOut}
                                className="px-3 py-2 bg-blue-100 hover:bg-blue-200 rounded-xl flex items-center gap-1 text-sm font-semibold transition-all duration-200 text-blue-700 border border-blue-200 hover:scale-105 shadow-sm"
                                title="Zoom Out"
                            >
                                <ZoomOut size={16} />
                                Zoom Out
                            </button>
                            <button
                                onClick={resetView}
                                className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 rounded-xl flex items-center gap-1 text-sm font-semibold transition-all duration-200 text-indigo-700 border border-indigo-200 hover:scale-105 shadow-sm"
                                title="Reset View"
                            >
                                <RefreshCw size={16} />
                                Reset
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-center min-h-[400px]">
                        <canvas
                            ref={canvasRef}
                            width={900}
                            height={650}
                            className="border-2 border-cyan-200 rounded-2xl shadow-inner max-w-full h-auto bg-white/80 backdrop-blur-md"
                        />
                    </div>

                    {/* View Controls */}
                    <div className="mt-4 p-4 bg-white/60 backdrop-blur-md rounded-xl border border-blue-100 shadow-md animate-fade-in">
                        <h3 className="font-semibold mb-3 text-sm text-cyan-700">View Range</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs text-cyan-700 font-semibold">X Min</label>
                                <input
                                    type="number"
                                    value={xMin}
                                    onChange={(e) => setXMin(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1 bg-white/80 text-cyan-900 placeholder-cyan-400 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-cyan-700 font-semibold">X Max</label>
                                <input
                                    type="number"
                                    value={xMax}
                                    onChange={(e) => setXMax(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1 bg-white/80 text-cyan-900 placeholder-cyan-400 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-cyan-700 font-semibold">Y Min</label>
                                <input
                                    type="number"
                                    value={yMin}
                                    onChange={(e) => setYMin(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1 bg-white/80 text-cyan-900 placeholder-cyan-400 shadow-sm"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-cyan-700 font-semibold">Y Max</label>
                                <input
                                    type="number"
                                    value={yMax}
                                    onChange={(e) => setYMax(Number(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mt-1 bg-white/80 text-cyan-900 placeholder-cyan-400 shadow-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MathVisualizer;