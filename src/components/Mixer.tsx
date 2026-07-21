/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sliders, RefreshCw, AudioLines } from "lucide-react";
import { DeckState } from "../types";
import { audio } from "../utils/audio";

interface MixerProps {
  stateA: DeckState;
  stateB: DeckState;
  crossfader: number;
  onVolumeChange: (deck: "A" | "B", val: number) => void;
  onEQChange: (deck: "A" | "B", type: "low" | "mid" | "high", db: number) => void;
  onFilterChange: (deck: "A" | "B", value: number) => void;
  onPitchChange: (deck: "A" | "B", value: number) => void;
  onCrossfaderChange: (value: number) => void;
  onSync: (fromDeck: "A" | "B", toDeck: "A" | "B") => void;
}

export const Mixer: React.FC<MixerProps> = ({
  stateA,
  stateB,
  crossfader,
  onVolumeChange,
  onEQChange,
  onFilterChange,
  onPitchChange,
  onCrossfaderChange,
  onSync,
}) => {
  // Symmetrical live peak volumes for LED VU Meters
  const [peakA, setPeakA] = useState(0);
  const [peakB, setPeakB] = useState(0);

  useEffect(() => {
    let animId: number;
    const updateLevels = () => {
      setPeakA(audio.getPeakLevel("A"));
      setPeakB(audio.getPeakLevel("B"));
      animId = requestAnimationFrame(updateLevels);
    };
    animId = requestAnimationFrame(updateLevels);
    return () => cancelAnimationFrame(animId);
  }, []);

  const renderVUMeter = (level: number) => {
    const segments = 12;
    return (
      <div className="flex flex-col-reverse gap-[1.5px] h-36 w-2.5 bg-black/80 rounded-sm border border-white/5 p-[1.5px] shadow-inner shrink-0">
        {Array.from({ length: segments }).map((_, i) => {
          const threshold = (i + 1) / segments;
          const isActive = level >= threshold;
          let colorClass = "bg-slate-900/40";
          if (isActive) {
            if (i < 7) {
              // Green segments (Safe)
              colorClass = "bg-emerald-500 shadow-[0_0_6px_#10b981]";
            } else if (i < 10) {
              // Amber segments (Caution)
              colorClass = "bg-amber-400 shadow-[0_0_6px_#fbbf24]";
            } else {
              // Red segments (Clipping)
              colorClass = "bg-red-500 shadow-[0_0_8px_#ef4444]";
            }
          }
          return (
            <div
              key={i}
              className={`h-2.5 w-full rounded-[1px] transition-all duration-75 ${colorClass}`}
            />
          );
        })}
      </div>
    );
  };

  const renderRotaryKnob = (
    deck: "A" | "B",
    type: "gain" | "low" | "mid" | "high" | "filter",
    value: number,
    min: number,
    max: number,
    onChange: (val: number) => void
  ) => {
    const percentage = (value - min) / (max - min);
    const rotation = -135 + percentage * 270;

    const label = type.toUpperCase();
    const isFilter = type === "filter";
    const isGain = type === "gain";

    let barColor = "bg-cyan-500";
    if (isFilter) {
      barColor = "bg-amber-500";
    } else if (isGain) {
      barColor = "bg-emerald-500";
    } else if (deck === "B") {
      barColor = "bg-fuchsia-500";
    }

    return (
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">{label}</span>
        <div className="relative w-10 h-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/5 bg-slate-950 shadow-inner" />
          
          <div className="absolute w-[1px] h-1 bg-slate-800 -top-0.5 rounded-full origin-bottom" style={{ transform: "rotate(0deg)" }} />
          <div className="absolute w-[1px] h-0.5 bg-slate-800 -top-0.5 rounded-full origin-bottom" style={{ transform: "rotate(-135deg)" }} />
          <div className="absolute w-[1px] h-0.5 bg-slate-800 -top-0.5 rounded-full origin-bottom" style={{ transform: "rotate(135deg)" }} />

          <div
            style={{ transform: `rotate(${rotation}deg)` }}
            className="w-7.5 h-7.5 rounded-full bg-slate-900 border border-white/10 shadow flex items-center justify-center cursor-pointer transition-transform duration-75 relative"
          >
            <div className={`absolute w-[1.5px] h-2.5 ${barColor} top-0.5 rounded-full`} />
            <div className="w-3 h-3 bg-slate-950 rounded-full border border-white/5 shadow-inner" />
          </div>
        </div>

        <span className="text-[8px] font-mono font-bold text-slate-400 mt-0.5 leading-none">
          {isFilter 
            ? value === 0 ? "OFF" : value < 0 ? `LPF` : `HPF` 
            : isGain 
              ? `${Math.round(value * 100)}%`
              : `${value > 0 ? "+" : ""}${value.toFixed(0)}dB`}
        </span>

        <input
          type="range"
          min={min}
          max={max}
          step={isFilter ? 0.05 : isGain ? 0.05 : 1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-12 h-1 opacity-25 accent-slate-500 cursor-pointer mt-1"
        />
      </div>
    );
  };

  return (
    <div
      id="dj-mixer"
      className="bg-slate-950 border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col gap-5 shadow-2xl relative"
    >
      {/* Carbon fiber hardware background decor */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-[0.03] pointer-events-none" />

      {/* Header Panel */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2.5 relative z-10">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-slate-400" />
          <h2 className="text-xs font-black uppercase text-white tracking-widest">TRAKTOR PRO MIXER</h2>
        </div>
        <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest flex items-center gap-1.5">
          <AudioLines className="w-3.5 h-3.5 text-cyan-400" /> Stereo VU Monitor
        </span>
      </div>

      {/* Three Symmetrical Columns Layout (A Channel, Center Faders/VUs, B Channel) */}
      <div className="grid grid-cols-3 gap-3 relative z-10">
        
        {/* DECK A CHANNEL STRIP */}
        <div className="flex flex-col items-center gap-4 border-r border-white/5 pr-1">
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">CH A</span>

          {/* Symmetrical Vertical Rotary Knobs: Gain, High, Mid, Low, Filter */}
          <div className="flex flex-col gap-3">
            {renderRotaryKnob("A", "gain", stateA.volume, 0, 1, (val) => onVolumeChange("A", val))}
            {renderRotaryKnob("A", "high", stateA.eqHigh, -12, 12, (val) => onEQChange("A", "high", val))}
            {renderRotaryKnob("A", "mid", stateA.eqMid, -12, 12, (val) => onEQChange("A", "mid", val))}
            {renderRotaryKnob("A", "low", stateA.eqLow, -12, 12, (val) => onEQChange("A", "low", val))}
            {renderRotaryKnob("A", "filter", stateA.filterCutoff, -1, 1, (val) => onFilterChange("A", val))}
          </div>

          <button
            id="sync-a"
            disabled={!stateA.track || !stateB.track}
            onClick={() => onSync("A", "B")}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 font-black text-[9px] uppercase tracking-wider transition active:scale-95 disabled:opacity-30 mt-1"
          >
            <RefreshCw className="w-3 h-3" /> Sync to B
          </button>
        </div>

        {/* CENTER VOLUME FADERS AND LED VU METERS (Pure Traktor hardware feel) */}
        <div className="flex justify-around items-stretch py-2.5 gap-3 bg-slate-900/40 border border-white/5 rounded-xl px-2">
          
          {/* Deck A Volume Fader + VU meter */}
          <div className="flex flex-col items-center justify-between">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Vol A</span>
            <div className="flex gap-2.5 items-stretch h-36">
              {/* Dynamic VU Meter */}
              {renderVUMeter(peakA)}
              
              {/* Vertical Slider */}
              <div className="relative w-8 h-36 flex items-center justify-center bg-black rounded border border-white/5 shadow-inner">
                <div className="absolute inset-y-4 w-px bg-white/[0.02] flex flex-col justify-between items-center text-[7px] font-mono text-slate-600">
                  <span>10</span>
                  <span>7</span>
                  <span>4</span>
                  <span>1</span>
                </div>
                <input
                  id="vol-slider-a"
                  type="range"
                  orient="vertical"
                  min="0"
                  max="1"
                  step="0.01"
                  value={stateA.volume}
                  onChange={(e) => onVolumeChange("A", parseFloat(e.target.value))}
                  className="vertical-slider h-28 w-full opacity-90 accent-cyan-400 cursor-row-resize"
                  style={{ WebkitAppearance: "slider-vertical" } as any}
                />
              </div>
            </div>
            <span className="text-[10px] font-mono font-black text-cyan-400 mt-2">
              {Math.round(stateA.volume * 100)}%
            </span>
          </div>

          {/* Deck B Volume Fader + VU meter */}
          <div className="flex flex-col items-center justify-between">
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Vol B</span>
            <div className="flex gap-2.5 items-stretch h-36">
              {/* Vertical Slider */}
              <div className="relative w-8 h-36 flex items-center justify-center bg-black rounded border border-white/5 shadow-inner">
                <div className="absolute inset-y-4 w-px bg-white/[0.02] flex flex-col justify-between items-center text-[7px] font-mono text-slate-600">
                  <span>10</span>
                  <span>7</span>
                  <span>4</span>
                  <span>1</span>
                </div>
                <input
                  id="vol-slider-b"
                  type="range"
                  orient="vertical"
                  min="0"
                  max="1"
                  step="0.01"
                  value={stateB.volume}
                  onChange={(e) => onVolumeChange("B", parseFloat(e.target.value))}
                  className="vertical-slider h-28 w-full opacity-90 accent-fuchsia-400 cursor-row-resize"
                  style={{ WebkitAppearance: "slider-vertical" } as any}
                />
              </div>

              {/* Dynamic VU Meter */}
              {renderVUMeter(peakB)}
            </div>
            <span className="text-[10px] font-mono font-black text-fuchsia-400 mt-2">
              {Math.round(stateB.volume * 100)}%
            </span>
          </div>
        </div>

        {/* DECK B CHANNEL STRIP */}
        <div className="flex flex-col items-center gap-4 border-l border-white/5 pl-1">
          <span className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest">CH B</span>

          {/* Symmetrical Vertical Rotary Knobs: Gain, High, Mid, Low, Filter */}
          <div className="flex flex-col gap-3">
            {renderRotaryKnob("B", "gain", stateB.volume, 0, 1, (val) => onVolumeChange("B", val))}
            {renderRotaryKnob("B", "high", stateB.eqHigh, -12, 12, (val) => onEQChange("B", "high", val))}
            {renderRotaryKnob("B", "mid", stateB.eqMid, -12, 12, (val) => onEQChange("B", "mid", val))}
            {renderRotaryKnob("B", "low", stateB.eqLow, -12, 12, (val) => onEQChange("B", "low", val))}
            {renderRotaryKnob("B", "filter", stateB.filterCutoff, -1, 1, (val) => onFilterChange("B", val))}
          </div>

          <button
            id="sync-b"
            disabled={!stateA.track || !stateB.track}
            onClick={() => onSync("B", "A")}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 font-black text-[9px] uppercase tracking-wider transition active:scale-95 disabled:opacity-30 mt-1"
          >
            <RefreshCw className="w-3 h-3" /> Sync to A
          </button>
        </div>
      </div>

      {/* HORIZONTAL CROSSFADER (With fine curves) */}
      <div className="flex flex-col gap-2 bg-slate-900/50 border border-white/5 p-3.5 rounded-xl relative z-10">
        <div className="flex justify-between items-center text-[9px] font-black text-slate-500 uppercase tracking-widest">
          <span>DECK A</span>
          <span className="text-white font-mono font-black tracking-wider">X-FADER: {crossfader === 0 ? "CENTER" : crossfader < 0 ? `L ${Math.round(Math.abs(crossfader) * 100)}%` : `R ${Math.round(crossfader * 100)}%`}</span>
          <span>DECK B</span>
        </div>
        <div className="relative w-full h-8 flex items-center px-4 bg-slate-950 rounded border border-white/5 shadow-inner">
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[1.5px] bg-slate-800 pointer-events-none" />
          <input
            id="crossfader"
            type="range"
            min="-1"
            max="1"
            step="0.02"
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full h-4 accent-cyan-500 cursor-col-resize opacity-95"
          />
        </div>
      </div>
    </div>
  );
};
