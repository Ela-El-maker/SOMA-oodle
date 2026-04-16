import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { MarketPoint } from '../types';

interface FluxViewProps {
  data: MarketPoint[];
  width: number;
  height: number;
}

const FluxView: React.FC<FluxViewProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [visibleCount, setVisibleCount] = useState(100);

  useEffect(() => {
    if (!svgRef.current || data.length === 0) return;

    const visibleData = data.slice(-visibleCount);
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Dimensions
    const domWidth = 60; // Right side Depth of Market width
    const chartWidth = width - domWidth - 40;
    const chartHeight = height - 40;
    const margin = { top: 20, left: 10 };

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // --- SCALES ---
    const x = d3.scaleBand()
      .domain(visibleData.map(d => d.time.toString()))
      .range([0, chartWidth])
      .padding(0.2);

    const maxVol = d3.max(visibleData, d => d.volume) || 1000;
    const yVol = d3.scaleLinear()
      .domain([0, maxVol])
      .range([chartHeight, chartHeight * 0.3]); // Top 70% reserved for volume spikes

    // --- DEFS (Gradients) ---
    const defs = svg.append("defs");
    
    // Bullish Volume Gradient
    const bullGrad = defs.append("linearGradient").attr("id", "vol-bull").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
    bullGrad.append("stop").attr("offset", "0%").attr("stop-color", "#ff00ff").attr("stop-opacity", 0.9);
    bullGrad.append("stop").attr("offset", "100%").attr("stop-color", "#ff00ff").attr("stop-opacity", 0.1);

    // Bearish Volume Gradient
    const bearGrad = defs.append("linearGradient").attr("id", "vol-bear").attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", 1);
    bearGrad.append("stop").attr("offset", "0%").attr("stop-color", "#00ffff").attr("stop-opacity", 0.9);
    bearGrad.append("stop").attr("offset", "100%").attr("stop-color", "#00ffff").attr("stop-opacity", 0.1);

    // CVD Line Gradient
    const cvdGrad = defs.append("linearGradient").attr("id", "cvd-grad").attr("x1", 0).attr("x2", 1).attr("y1", 0).attr("y2", 0);
    cvdGrad.append("stop").attr("offset", "0%").attr("stop-color", "#6366f1");
    cvdGrad.append("stop").attr("offset", "100%").attr("stop-color", "#a855f7");

    // --- VOLUME BARS ---
    g.selectAll(".vol-bar")
      .data(visibleData)
      .enter()
      .append("rect")
      .attr("x", d => x(d.time.toString()) || 0)
      .attr("y", d => yVol(d.volume))
      .attr("width", x.bandwidth())
      .attr("height", d => chartHeight - yVol(d.volume))
      .attr("fill", d => d.close >= d.open ? "url(#vol-bull)" : "url(#vol-bear)")
      .style("filter", "drop-shadow(0 0 4px rgba(0,0,0,0.5))");

    // --- CUMULATIVE DELTA (CVD) APPROXIMATION LINE ---
    // Simulating CVD based on price direction * volume
    let cumDelta = 0;
    const cvdData = visibleData.map(d => {
        const delta = d.close >= d.open ? d.volume : -d.volume;
        cumDelta += delta;
        return { time: d.time, val: cumDelta };
    });

    const yCVD = d3.scaleLinear()
        .domain(d3.extent(cvdData, d => d.val) as [number, number])
        .range([chartHeight - 10, 10]);

    const cvdLine = d3.line<{time: number, val: number}>()
        .curve(d3.curveMonotoneX)
        .x(d => (x(d.time.toString()) || 0) + x.bandwidth() / 2)
        .y(d => yCVD(d.val));

    g.append("path")
        .datum(cvdData)
        .attr("fill", "none")
        .attr("stroke", "url(#cvd-grad)")
        .attr("stroke-width", 2)
        .attr("d", cvdLine)
        .style("filter", "drop-shadow(0 0 5px #a855f7)");

    g.append("text")
        .attr("x", 10)
        .attr("y", 20)
        .attr("fill", "#a855f7")
        .attr("font-family", "monospace")
        .attr("font-size", "10px")
        .text("CUMULATIVE VOLUME DELTA (FLOW)");

    // --- DOM (DEPTH OF MARKET) SIMULATION ---
    // Right side panel showing "stacked orders"
    const domG = svg.append("g")
        .attr("transform", `translate(${width - domWidth - 10}, ${margin.top})`);
    
    // Simulate order book buckets based on recent price range
    const minP = d3.min(visibleData, d => d.low) || 0;
    const maxP = d3.max(visibleData, d => d.high) || 100;
    const priceBuckets = 20;
    const bucketHeight = chartHeight / priceBuckets;
    
    // Generate fake depth profile
    const depthProfile = Array.from({length: priceBuckets}, (_, i) => ({
        priceLevel: maxP - (i * (maxP - minP) / priceBuckets),
        volume: Math.random() * 1000 + 200, // Simulated depth
        type: i < priceBuckets / 2 ? 'ask' : 'bid'
    }));

    const maxDepth = d3.max(depthProfile, d => d.volume) || 1200;
    const wDepth = d3.scaleLinear().domain([0, maxDepth]).range([0, domWidth]);

    domG.selectAll(".depth-bar")
        .data(depthProfile)
        .enter()
        .append("rect")
        .attr("x", d => d.type === 'ask' ? domWidth - wDepth(d.volume) : 0) // Asks align right, Bids align left? Or just standard accumulation
        .attr("x", 0) // Align left for simple profile
        .attr("y", (d, i) => i * bucketHeight)
        .attr("width", d => wDepth(d.volume))
        .attr("height", bucketHeight - 1)
        .attr("fill", d => d.type === 'ask' ? "#ff00ff" : "#00ffff")
        .attr("opacity", 0.3)
        .style("filter", "drop-shadow(0 0 2px currentColor)");

    domG.append("line")
        .attr("x1", 0).attr("x2", 0).attr("y1", 0).attr("y2", chartHeight)
        .attr("stroke", "#334155").attr("stroke-width", 1);
        
    domG.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .attr("fill", "#64748b")
        .attr("font-size", "9px")
        .attr("font-family", "monospace")
        .text("LIQUIDITY");

  }, [data, width, height, visibleCount]);

  return (
    <div className="w-full h-full relative">
       <svg ref={svgRef} width={width} height={height} className="overflow-visible block" />
       <div className="absolute bottom-4 left-4 text-[9px] text-slate-600 font-mono tracking-widest pointer-events-none">
          FLOW VIEW // VOLUME INTENSITY & ORDER FLOW ESTIMATION
      </div>
    </div>
  );
};

export default FluxView;