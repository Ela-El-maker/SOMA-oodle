import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { MarketPoint } from '../types';

interface PulseViewProps {
  data: MarketPoint[];
  width: number;
  height: number;
}

interface PulsePoint {
  time: number;
  vol: number;
  price: number;
  mean: number;
}

const PulseView: React.FC<PulseViewProps> = ({ data, width, height }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    // Need enough data for a rolling window
    if (!svgRef.current || data.length < 25) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 20, bottom: 40, left: 20 };
    const chartWidth = Math.max(0, width - margin.left - margin.right);
    const chartHeight = Math.max(0, height - margin.top - margin.bottom);
    const centerY = chartHeight / 2;

    // --- ROBUST DATA CALCULATION ---
    const period = 20;
    const volatilityData: PulsePoint[] = [];

    // Explicit loop starting after the first period to ensure full context
    for (let i = period; i < data.length; i++) {
        const slice = data.slice(i - period, i);
        // Calculate standard deviation of price (volatility proxy)
        const dev = d3.deviation(slice, d => d.close);
        const mean = d3.mean(slice, d => d.close);
        
        if (dev !== undefined && mean !== undefined) {
            volatilityData.push({
                time: data[i].time,
                vol: dev,
                price: data[i].close,
                mean: mean
            });
        }
    }

    if (volatilityData.length < 2) return;

    // --- SCALES ---
    const x = d3.scaleLinear()
      .domain([0, volatilityData.length - 1])
      .range([0, chartWidth]);

    // Volatility Amplitude Scale
    // We enforce a minimum maxVol to prevent flatline on perfect stability
    const maxVol = Math.max(d3.max(volatilityData, d => d.vol) || 0, 0.5); 
    const yVol = d3.scaleLinear()
      .domain([0, maxVol])
      .range([0, chartHeight * 0.4]); // Max expansion is 40% of height up/down

    // Price Trend Scale (for overlay)
    const minP = d3.min(volatilityData, d => d.price) || 0;
    const maxP = d3.max(volatilityData, d => d.price) || 100;
    const yTrend = d3.scaleLinear()
        .domain([minP, maxP])
        .range([chartHeight, 0]);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    // --- DEFS ---
    const defs = svg.append("defs");
    const heatGrad = defs.append("linearGradient")
        .attr("id", "pulse-heat-grad")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%"); // Horizontal gradient along time
    
    heatGrad.append("stop").attr("offset", "0%").attr("stop-color", "#312e81"); // Indigo (Low energy)
    heatGrad.append("stop").attr("offset", "50%").attr("stop-color", "#d946ef"); // Magenta (Active)
    heatGrad.append("stop").attr("offset", "100%").attr("stop-color", "#facc15"); // Yellow (High energy/Recent)

    // Mask/Clip
    g.append("clipPath")
        .attr("id", "chart-area-clip")
        .append("rect")
        .attr("width", chartWidth)
        .attr("height", chartHeight);

    // --- DRAW VOLATILITY STREAM ---
    const area = d3.area<PulsePoint>()
        .curve(d3.curveMonotoneX) // Smoother than Basis for time series
        .x((_, i) => x(i))
        .y0(d => centerY - yVol(d.vol))
        .y1(d => centerY + yVol(d.vol));

    g.append("path")
        .datum(volatilityData)
        .attr("d", area)
        .attr("fill", "url(#pulse-heat-grad)")
        .attr("opacity", 0.9)
        .style("filter", "drop-shadow(0 0 8px rgba(217, 70, 239, 0.5))");

    // Center Baseline
    g.append("line")
        .attr("x1", 0).attr("x2", chartWidth)
        .attr("y1", centerY).attr("y2", centerY)
        .attr("stroke", "#ffffff")
        .attr("stroke-opacity", 0.1)
        .attr("stroke-dasharray", "4,4");

    // --- TREND LINE OVERLAY ---
    const trendLine = d3.line<PulsePoint>()
        .curve(d3.curveMonotoneX)
        .x((_, i) => x(i))
        .y(d => yTrend(d.price));

    g.append("path")
        .datum(volatilityData)
        .attr("fill", "none")
        .attr("stroke", "#e2e8f0")
        .attr("stroke-width", 1.5)
        .attr("stroke-opacity", 0.4)
        .attr("d", trendLine)
        .style("mix-blend-mode", "overlay");

    // --- REGIME INDICATOR ---
    const currentVol = volatilityData[volatilityData.length - 1]?.vol || 0;
    const volRatio = currentVol / maxVol;
    
    let regimeText = "STAGNATION";
    let regimeColor = "#64748b"; // Slate
    
    if (volRatio > 0.66) {
        regimeText = "TURBULENCE // CRITICAL";
        regimeColor = "#facc15"; // Yellow
    } else if (volRatio > 0.33) {
        regimeText = "EXPANSION // ACTIVE";
        regimeColor = "#d946ef"; // Pink
    } else {
        regimeText = "CONTRACTION // QUIET";
        regimeColor = "#22d3ee"; // Cyan
    }

    // Dynamic Text
    const textGroup = svg.append("g")
        .attr("transform", `translate(${width/2}, 30)`);

    textGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("font-family", "monospace")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", regimeColor)
        .attr("letter-spacing", "0.2em")
        .style("filter", `drop-shadow(0 0 8px ${regimeColor})`)
        .text(regimeText);
        
    // Volatility Value
    textGroup.append("text")
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .attr("font-family", "monospace")
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .text(`VOLATILITY INDEX: ${currentVol.toFixed(2)}`);

  }, [data, width, height]);

  return (
    <div className="w-full h-full relative">
       <svg ref={svgRef} width={width} height={height} className="overflow-visible block" />
       
       <div className="absolute bottom-4 left-4 flex flex-col gap-1 pointer-events-none">
          <div className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">
              REGIME View // Market Breath
          </div>
          <div className="text-[9px] text-slate-600 font-mono">
              Stream Amplitude = Realized Volatility (20p)
          </div>
       </div>
    </div>
  );
};

export default PulseView;