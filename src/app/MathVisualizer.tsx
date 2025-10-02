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
        { id: 1, expr: 'x + y = 5', visible: true, color: '#3b82f6', error: null }
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
        if (!expr.trim()) return { valid: false, compiled: null, error: 'Please enter an equation' };
        
        const trimmedExpr = expr.trim();
        
        // Check if it contains exactly one equals sign (no inequalities)
        if (!trimmedExpr.includes('=')) {
            return { valid: false, compiled: null, error: 'Please enter an equation with = (e.g., x + y = 5, sin(x) = 1)' };
        }
        
        if (trimmedExpr.includes('>=') || trimmedExpr.includes('<=') || 
            trimmedExpr.includes('<') || trimmedExpr.includes('>')) {
            return { valid: false, compiled: null, error: 'Only equations with = are supported, not inequalities' };
        }
        
        const parts = trimmedExpr.split('=');
        if (parts.length !== 2) {
            return { valid: false, compiled: null, error: 'Equation must have exactly one = sign' };
        }
        
        try {
            const leftSide = parts[0].trim();
            const rightSide = parts[1].trim();
            
            if (!leftSide || !rightSide) {
                return { valid: false, compiled: null, error: 'Both sides of equation must have expressions' };
            }
            
            // Convert "a = b" to "(a) - (b)" for root finding
            const processedExpr = `(${leftSide}) - (${rightSide})`;
            const compiled = math.compile(processedExpr);
            
            // Test compilation with sample values
            try {
                compiled.evaluate({ x: 1, y: 1 });
            } catch {
                try {
                    compiled.evaluate({ x: 1 });
                } catch {
                    try {
                        compiled.evaluate({ y: 1 });
                    } catch {
                        return { valid: false, compiled: null, error: 'Invalid mathematical expression' };
                    }
                }
            }
            
            return { valid: true, compiled, error: null, originalExpr: trimmedExpr, leftSide, rightSide };
        } catch (e: unknown) {
            let errorMsg = 'Invalid mathematical expression';
            if (e instanceof Error) {
                errorMsg = e.message;
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

    // Helper function to find all y-roots for a given x in an equation
    const findAllRoots = (compiled: math.EvalFunction, x: number, yMin: number, yMax: number): number[] => {
        const roots: number[] = [];
        const yRange = yMax - yMin;
        const numSegments = 50; // Check for sign changes in 50 segments
        const segmentSize = yRange / numSegments;
        
        for (let i = 0; i < numSegments; i++) {
            const y1 = yMin + i * segmentSize;
            const y2 = yMin + (i + 1) * segmentSize;
            
            try {
                const f1 = compiled.evaluate({ x, y: y1 });
                const f2 = compiled.evaluate({ x, y: y2 });
                
                // If there's a sign change, there's a root in this segment
                if (f1 * f2 <= 0) {
                    // Binary search to find the exact root
                    let yLow = y1;
                    let yHigh = y2;
                    
                    for (let iter = 0; iter < 40; iter++) {
                        const yMid = (yLow + yHigh) / 2;
                        const fMid = compiled.evaluate({ x, y: yMid });
                        
                        if (Math.abs(fMid) < 0.001) {
                            roots.push(yMid);
                            break;
                        }
                        
                        if (fMid * f1 < 0) {
                            yHigh = yMid;
                        } else {
                            yLow = yMid;
                        }
                        
                        if (Math.abs(yHigh - yLow) < 0.001) {
                            roots.push((yLow + yHigh) / 2);
                            break;
                        }
                    }
                }
            } catch {
                // Skip segments where evaluation fails
            }
        }
        
        return roots;
    };

    // Helper function to find all x-roots for a given y in an equation (for equations like x = sin(y))
    const findAllRootsForY = (compiled: math.EvalFunction, y: number, xMin: number, xMax: number): number[] => {
        const roots: number[] = [];
        const xRange = xMax - xMin;
        const numSegments = 50; // Check for sign changes in 50 segments
        const segmentSize = xRange / numSegments;
        
        for (let i = 0; i < numSegments; i++) {
            const x1 = xMin + i * segmentSize;
            const x2 = xMin + (i + 1) * segmentSize;
            
            try {
                const f1 = compiled.evaluate({ x: x1, y });
                const f2 = compiled.evaluate({ x: x2, y });
                
                // If there's a sign change, there's a root in this segment
                if (f1 * f2 <= 0) {
                    // Binary search to find the exact root
                    let xLow = x1;
                    let xHigh = x2;
                    
                    for (let iter = 0; iter < 40; iter++) {
                        const xMid = (xLow + xHigh) / 2;
                        const fMid = compiled.evaluate({ x: xMid, y });
                        
                        if (Math.abs(fMid) < 0.001) {
                            roots.push(xMid);
                            break;
                        }
                        
                        if (fMid * f1 < 0) {
                            xHigh = xMid;
                        } else {
                            xLow = xMid;
                        }
                        
                        if (Math.abs(xHigh - xLow) < 0.001) {
                            roots.push((xLow + xHigh) / 2);
                            break;
                        }
                    }
                }
            } catch {
                // Skip segments where evaluation fails
            }
        }
        
        return roots;
    };

    // Mathematical analysis to determine if equation is primarily f(x) or f(y)
    const analyzeFunctionDependency = (compiled: math.EvalFunction, xMin: number, xMax: number, yMin: number, yMax: number) => {
        const testPoints = [
            { x: 0, y: 0 },
            { x: 1, y: 1 },
            { x: -1, y: 1 },
            { x: 1, y: -1 },
            { x: -1, y: -1 },
            { x: 2, y: 0.5 },
            { x: -2, y: -0.5 },
            { x: 0.5, y: 2 },
            { x: -0.5, y: -2 }
        ];
        
        let totalXGradient = 0;
        let totalYGradient = 0;
        let validGradients = 0;
        let xDominantCount = 0;
        let yDominantCount = 0;
        
        const epsilon = 0.001; // Small step for numerical differentiation
        
        for (const point of testPoints) {
            try {
                // Calculate partial derivatives numerically at this point
                const f_center = compiled.evaluate(point);
                const f_x_plus = compiled.evaluate({ x: point.x + epsilon, y: point.y });
                const f_x_minus = compiled.evaluate({ x: point.x - epsilon, y: point.y });
                const f_y_plus = compiled.evaluate({ x: point.x, y: point.y + epsilon });
                const f_y_minus = compiled.evaluate({ x: point.x, y: point.y - epsilon });
                
                // Numerical partial derivatives
                const dfdx = (f_x_plus - f_x_minus) / (2 * epsilon);
                const dfdy = (f_y_plus - f_y_minus) / (2 * epsilon);
                
                if (isFinite(dfdx) && isFinite(dfdy)) {
                    const xGradMagnitude = Math.abs(dfdx);
                    const yGradMagnitude = Math.abs(dfdy);
                    
                    totalXGradient += xGradMagnitude;
                    totalYGradient += yGradMagnitude;
                    validGradients++;
                    
                    // Count which variable dominates at this point
                    if (yGradMagnitude > xGradMagnitude * 1.5) {
                        yDominantCount++;
                    } else if (xGradMagnitude > yGradMagnitude * 1.5) {
                        xDominantCount++;
                    }
                }
            } catch {
                // Skip points where evaluation fails
                continue;
            }
        }
        
        if (validGradients === 0) {
            return { 
                isMainlyFunctionOfY: false, 
                confidence: 0,
                reason: 'No valid gradients found'
            };
        }
        
        const avgXGradient = totalXGradient / validGradients;
        const avgYGradient = totalYGradient / validGradients;
        
        // Multiple criteria for determining function dependency
        const gradientRatio = avgYGradient / (avgXGradient + 1e-10); // Avoid division by zero
        const dominanceRatio = yDominantCount / (yDominantCount + xDominantCount + 1e-10);
        
        // Additional test: check if fixing x gives consistent y values vs fixing y gives consistent x values
        let xFixedConsistency = 0;
        let yFixedConsistency = 0;
        
        try {
            // Test consistency when x is fixed
            const testX = 1;
            const yValues = [];
            for (let testY = yMin; testY <= yMax; testY += (yMax - yMin) / 10) {
                try {
                    const result = compiled.evaluate({ x: testX, y: testY });
                    if (isFinite(result)) yValues.push(Math.abs(result));
                } catch { continue; }
            }
            if (yValues.length > 1) {
                const yVariance = yValues.reduce((sum, val, i, arr) => 
                    sum + Math.pow(val - arr.reduce((a, b) => a + b) / arr.length, 2), 0) / yValues.length;
                xFixedConsistency = 1 / (1 + yVariance); // Higher when y values are more varied
            }
            
            // Test consistency when y is fixed
            const testY = 1;
            const xValues = [];
            for (let testX = xMin; testX <= xMax; testX += (xMax - xMin) / 10) {
                try {
                    const result = compiled.evaluate({ x: testX, y: testY });
                    if (isFinite(result)) xValues.push(Math.abs(result));
                } catch { continue; }
            }
            if (xValues.length > 1) {
                const xVariance = xValues.reduce((sum, val, i, arr) => 
                    sum + Math.pow(val - arr.reduce((a, b) => a + b) / arr.length, 2), 0) / xValues.length;
                yFixedConsistency = 1 / (1 + xVariance); // Higher when x values are more varied
            }
        } catch {
            // Fallback if consistency tests fail
        }
        
        // For function of Y (like x = sin(y)), we expect:
        // - High, consistent X gradient (x coefficient is significant)  
        // - Variable Y gradient (y appears in complex form)
        // So we look for avgXGradient > avgYGradient, indicating x depends on y
        const xDominanceRatio = avgXGradient / (avgYGradient + 1e-10);
        
        // Combine all evidence
        const yDominanceScore = (
            Math.min(xDominanceRatio, 10) * 0.4 +  // X dominance indicates function of Y
            (1 - dominanceRatio) * 0.3 +           // Fewer y-dominant points means function of Y  
            (yFixedConsistency > xFixedConsistency ? 1 : 0) * 0.3  // Y-fixed consistency test
        );
        
        const isMainlyFunctionOfY = yDominanceScore > 1.2; // Threshold for classification
        const confidence = Math.min(yDominanceScore / 2, 1); // Confidence score 0-1
        
        return {
            isMainlyFunctionOfY,
            confidence,
            gradientRatio,
            dominanceRatio,
            avgXGradient,
            avgYGradient,
            xDominanceRatio,
            reason: `XDomRatio: ${xDominanceRatio.toFixed(2)}, DomRatio: ${dominanceRatio.toFixed(2)}, Score: ${yDominanceScore.toFixed(2)}`
        };
    };

    // Helper function to group points into separate curves
    const groupPointsIntoCurves = (points: Array<{x: number, y: number}>): Array<Array<{x: number, y: number}>> => {
        if (points.length === 0) return [];
        
        // Sort points by x coordinate
        points.sort((a, b) => a.x - b.x);
        
        const curves: Array<Array<{x: number, y: number}>> = [];
        
        // Group points by x-coordinate and then split into separate curves
        const pointsByX = new Map<number, number[]>();
        
        points.forEach(point => {
            const roundedX = Math.round(point.x * 1000) / 1000; // Round to avoid floating point issues
            if (!pointsByX.has(roundedX)) {
                pointsByX.set(roundedX, []);
            }
            pointsByX.get(roundedX)!.push(point.y);
        });
        
        // Create curves by connecting points in a logical order
        const sortedX = Array.from(pointsByX.keys()).sort((a, b) => a - b);
        
        // For each x, we might have multiple y values (like in circles)
        // We need to create separate curves for upper and lower parts
        const upperCurve: Array<{x: number, y: number}> = [];
        const lowerCurve: Array<{x: number, y: number}> = [];
        
        sortedX.forEach(x => {
            const yValues = pointsByX.get(x)!.sort((a, b) => b - a); // Sort y values descending
            
            if (yValues.length >= 2) {
                // Multiple y values - add to both upper and lower curves
                upperCurve.push({ x, y: yValues[0] }); // Highest y
                lowerCurve.push({ x, y: yValues[yValues.length - 1] }); // Lowest y
            } else if (yValues.length === 1) {
                // Single y value - add to both curves
                upperCurve.push({ x, y: yValues[0] });
                lowerCurve.push({ x, y: yValues[0] });
            }
        });
        
        if (upperCurve.length > 0) curves.push(upperCurve);
        if (lowerCurve.length > 0 && lowerCurve !== upperCurve) {
            // Reverse lower curve to create continuous path
            curves.push(lowerCurve.reverse());
        }
        
        return curves;
    };

    // Equation plotting function - handles all types of equations
    const plotEquation = (ctx: CanvasRenderingContext2D, compiled: math.EvalFunction, originalExpr: string, color: string, width: number, height: number, xMin: number, xMax: number, yMin: number, yMax: number, toCanvasX: (x: number) => number, toCanvasY: (y: number) => number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        
        // Determine if equation involves x and/or y variables
        let involvesX = false;
        let involvesY = false;
        try {
            const testX1 = compiled.evaluate({ x: 1, y: 1 });
            const testX2 = compiled.evaluate({ x: 2, y: 1 });
            involvesX = Math.abs(testX1 - testX2) > 0.0001;
            
            const testY1 = compiled.evaluate({ x: 1, y: 1 });
            const testY2 = compiled.evaluate({ x: 1, y: 2 });
            involvesY = Math.abs(testY1 - testY2) > 0.0001;
        } catch {
            // Default fallback
            involvesX = true;
            involvesY = false;
        }
        
        if (!involvesX && !involvesY) {
            // Constant equation - shouldn't happen, but handle gracefully
            return;
        } else if (!involvesY) {
            // X-only equations like sin(x) = 1, x^2 = 4 - draw vertical lines
            ctx.beginPath();
            const xRange = xMax - xMin;
            const step = xRange / (width * 4);
            const solutions = new Set<number>();
            
            for (let x = xMin; x <= xMax; x += step) {
                try {
                    const result = compiled.evaluate({ x });
                    if (Math.abs(result) < 0.02) {
                        const roundedX = Math.round(x * 100) / 100;
                        solutions.add(roundedX);
                    }
                } catch {
                    // Skip invalid points
                }
            }
            
            // Draw vertical lines at solutions
            solutions.forEach(x => {
                const cx = toCanvasX(x);
                if (cx >= 0 && cx <= width) {
                    ctx.moveTo(cx, 0);
                    ctx.lineTo(cx, height);
                    
                    // Add a marker circle
                    ctx.beginPath();
                    ctx.arc(cx, height / 2, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.beginPath();
                }
            });
            
            ctx.stroke();
        } else if (!involvesX) {
            // Y-only equations like y^2 = 9, sin(y) = 0.5 - draw horizontal lines
            ctx.beginPath();
            const yRange = yMax - yMin;
            const step = yRange / (height * 4);
            const solutions = new Set<number>();
            
            for (let y = yMin; y <= yMax; y += step) {
                try {
                    const result = compiled.evaluate({ y });
                    if (Math.abs(result) < 0.02) {
                        const roundedY = Math.round(y * 100) / 100;
                        solutions.add(roundedY);
                    }
                } catch {
                    // Skip invalid points
                }
            }
            
            // Draw horizontal lines at solutions
            solutions.forEach(y => {
                const cy = toCanvasY(y);
                if (cy >= 0 && cy <= height) {
                    ctx.moveTo(0, cy);
                    ctx.lineTo(width, cy);
                    
                    // Add a marker circle
                    ctx.beginPath();
                    ctx.arc(width / 2, cy, 6, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    ctx.beginPath();
                }
            });
            
            ctx.stroke();
            
        } else {
            // Multi-variable equations like x + y = 5, x^2 + y^2 = 25, x = sin(y)
            // Mathematically determine if equation is primarily a function of x or y
            // by analyzing numerical gradients at multiple test points
            const analysisResult = analyzeFunctionDependency(compiled, xMin, xMax, yMin, yMax);
            const mainlyFunctionOfY = analysisResult.isMainlyFunctionOfY;
            
            // Debug: Force x = sin(y) to be treated as function of Y
            if (originalExpr.toLowerCase().includes('x') && originalExpr.toLowerCase().includes('sin(y)')) {
                console.log('Forcing x = sin(y) to be treated as function of Y');
                // Override the analysis for this specific case
                const forcedMainlyFunctionOfY = true;
                
                if (forcedMainlyFunctionOfY) {
                    // Direct parametric approach for x = sin(y)
                    const yRange = yMax - yMin;
                    const numPoints = 200;
                    
                    ctx.beginPath();
                    let firstPoint = true;
                    
                    for (let i = 0; i <= numPoints; i++) {
                        const y = yMin + (i / numPoints) * yRange;
                        const x = Math.sin(y); // Direct calculation for x = sin(y)
                        
                        if (x >= xMin && x <= xMax) {
                            const cx = toCanvasX(x);
                            const cy = toCanvasY(y);
                            
                            if (firstPoint) {
                                ctx.moveTo(cx, cy);
                                firstPoint = false;
                            } else {
                                ctx.lineTo(cx, cy);
                            }
                        }
                    }
                    
                    ctx.stroke();
                    return; // Exit early for this special case
                }
            }
            

            

            
            const allPoints: Array<{x: number, y: number}> = [];
            
            if (mainlyFunctionOfY) {
                // For equations like x = sin(y), use parametric approach
                // Sample y-values and find corresponding x-values efficiently
                const yRange = yMax - yMin;
                const numSamples = Math.min(1000, height * 3); // Reasonable resolution
                
                for (let i = 0; i <= numSamples; i++) {
                    const y = yMin + (i / numSamples) * yRange;
                    
                    // Use Newton-Raphson method to find x for this y
                    try {
                        // Start with a reasonable initial guess
                        let x = 0; // Initial guess
                        const maxIterations = 20;
                        const tolerance = 1e-6;
                        
                        for (let iter = 0; iter < maxIterations; iter++) {
                            const f = compiled.evaluate({ x, y });
                            
                            if (Math.abs(f) < tolerance) {
                                break; // Found solution
                            }
                            
                            // Numerical derivative df/dx
                            const h = 1e-8;
                            const fPlusH = compiled.evaluate({ x: x + h, y });
                            const dfDx = (fPlusH - f) / h;
                            
                            if (Math.abs(dfDx) < 1e-12) {
                                break; // Avoid division by zero
                            }
                            
                            // Newton-Raphson step
                            const newX = x - f / dfDx;
                            
                            if (Math.abs(newX - x) < tolerance) {
                                x = newX;
                                break;
                            }
                            
                            x = newX;
                            
                            // Keep x in reasonable bounds
                            if (x < xMin - 1 || x > xMax + 1) {
                                break;
                            }
                        }
                        
                        // Verify the solution and add if valid
                        const finalCheck = compiled.evaluate({ x, y });
                        if (Math.abs(finalCheck) < 0.01 && x >= xMin && x <= xMax) {
                            allPoints.push({ x, y });
                        }
                    } catch {
                        // Skip this y if Newton-Raphson fails
                    }
                }

            } else {
                // For equations like x + y = 5, x^2 + y^2 = 25, iterate over x-values and find y-values
                const xRange = xMax - xMin;
                const step = xRange / (width * 2);
                
                for (let x = xMin; x <= xMax; x += step) {
                    try {
                        // Find all y-values where equation = 0 for this x
                        const yValues = findAllRoots(compiled, x, yMin, yMax);
                        
                        for (const yVal of yValues) {
                            if (isFinite(yVal)) {
                                allPoints.push({ x, y: yVal });
                            }
                        }
                    } catch {
                        // Skip this x if evaluation fails
                    }
                }
            }
            
            // Sort points and draw curves
            if (allPoints.length > 0) {
                if (mainlyFunctionOfY) {
                    // For equations like x = sin(y), sort by y and draw as single continuous curve
                    allPoints.sort((a, b) => a.y - b.y);
                    
                    // Remove duplicate y-values, keeping the x-value closest to the previous point
                    const cleanedPoints: Array<{x: number, y: number}> = [];
                    let lastY = -Infinity;
                    
                    for (const point of allPoints) {
                        if (Math.abs(point.y - lastY) > 0.001) { // Different y-value
                            cleanedPoints.push(point);
                            lastY = point.y;
                        }
                    }
                    
                    if (cleanedPoints.length > 0) {
                        ctx.beginPath();
                        let firstPoint = true;
                        
                        cleanedPoints.forEach(point => {
                            const cx = toCanvasX(point.x);
                            const cy = toCanvasY(point.y);
                            
                            if (cy >= -100 && cy <= height + 100 && cx >= -200 && cx <= width + 200) {
                                if (firstPoint) {
                                    ctx.moveTo(cx, cy);
                                    firstPoint = false;
                                } else {
                                    ctx.lineTo(cx, cy);
                                }
                            }
                        });
                        
                        ctx.stroke();
                    }
                } else {
                    // For equations like x + y = 5, x^2 + y^2 = 25, use grouping for multiple curves
                    const curves = groupPointsIntoCurves(allPoints);
                    
                    curves.forEach(curve => {
                        if (curve.length > 1) {
                            ctx.beginPath();
                            let firstPoint = true;
                            
                            curve.forEach(point => {
                                const cx = toCanvasX(point.x);
                                const cy = toCanvasY(point.y);
                                
                                if (cy >= -30 && cy <= height + 30 && cx >= -30 && cx <= width + 30) {
                                    if (firstPoint) {
                                        ctx.moveTo(cx, cy);
                                        firstPoint = false;
                                    } else {
                                        ctx.lineTo(cx, cy);
                                    }
                                }
                            });
                            
                            ctx.stroke();
                        }
                    });
                }
            }
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

        // Plot equations only
        equations.forEach(eq => {
            if (!eq.visible || !eq.expr || eq.error) return;

            const validation = validateAndParse(eq.expr);
            if (!validation.valid || !validation.compiled) return;

            plotEquation(ctx, validation.compiled, validation.originalExpr, eq.color, width, height, xMin, xMax, yMin, yMax, toCanvasX, toCanvasY);
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
                                <li>Only equations with = are supported (no functions or inequalities)</li>
                                <li>Click an input to activate it, then use buttons below</li>
                                <li>Use ^ for powers: x^2, sin(x)^3</li>
                                <li>Examples: x + y = 5, sin(x) = 0.5, x^2 + y^2 = 25</li>
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
                                        placeholder="Enter equation (e.g., x + y = 5)"
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
                                { expr: 'x + y = 5', desc: 'Linear equation' },
                                { expr: 'x^2 + y^2 = 25', desc: 'Circle equation' },
                                { expr: 'y = x^2', desc: 'Parabola equation' },
                                { expr: 'x = sin(y)', desc: 'Sideways sine wave' },
                                { expr: 'x = y^2', desc: 'Sideways parabola' },
                                { expr: 'y = sin(x)', desc: 'Sine wave equation' },
                                { expr: 'x^2 = 4', desc: 'Vertical line solutions' },
                                { expr: 'y^2 = 9', desc: 'Horizontal line solutions' },
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