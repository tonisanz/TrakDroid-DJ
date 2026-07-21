/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sliders, RefreshCw, AudioLines } from "lucide-react";
import { DeckState, DeckId } from "../types";
import { audio } from "../utils/audio";

interface MixerProps {
  stateA: DeckState;
  stateB: DeckState;
  stateC: DeckState;
  stateD: DeckState;
  crossfader: number;
  onVolumeChange: (deck: DeckId, val: number) => void;
  onEQChange: (deck: DeckId, type: "low" | "mid" | "high", db: number) => void;
  onFilterChange: (deck: DeckId, value: number) => void;
  onCrossfaderChange: (value: number) => void;
  onSync: (fromDeck: DeckId, toDeck: DeckId) => void;
}

export const Mixer: React.FC<MixerProps> = ({
  stateA,
  stateB,
  stateC,
  stateD,
  crossfader,
  onVolumeChange,
  onEQChange,
  onFilterChange,
  onCrossfaderChange,
  onSync,
}) => {
  // Stereo peak VU levels for all 4 channels
  const [peakA, setPeakA] = useState(0);
  const [peakB, setPeakB] = useState(0);
  const [peakC, setPeakC] = useState(0);
  const [peakD, setPeakD] = useState(0);

  useEffect(() => {
    let animId: number;
    const updateLevels = () => {
      setPeakA(audio.getPeakLevel("A"));
      setPeakB(audio.getPeakLevel("B"));
      setPeakC(audio.getPeakLevel("C"));
      setPeakD(audio.getPeakLevel("D"));
      animId = requestAnimationFrame(updateLevels);
    };
    animId = requestAnimationFrame(updateLevels);
    return () => cancelAnimationFrame(animId);
  }, []);

  const renderVUMeter = (level: number) => {
    const segments = 10;
    return (
      <div className="flex flex-col-reverse gap-[1px] h-28 w-2 bg-black/90 rounded border border-white/5 p-[1px] shadow-inner shrink-0">
        {Array.from({ length: segments }).map((_, i) => {
          const threshold = (i + 1) / segments;
          const isActive = level >= threshold;
          let colorClass = "bg-slate-900/45";
          if (isActive) {
            if (i < 6) {
              colorClass = "bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.7)]";
            } else if (i < 8) {
              colorClass = "bg-amber-400 shadow-[0_0_5px_rgba(245,158,11,0.7)]";
            } else {
              colorClass = "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]";
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
    deck: DeckId,
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

    let barColor = "bg-cyan-400";
    if (isFilter) {
      barColor = "bg-amber-400";
    } else if (isGain) {
      barColor = "bg-emerald-400";
    } else if (deck === "B") {
      barColor = "bg-fuchsia-400";
    } else if (deck === "C") {
      barColor = "bg-emerald-400";
    } else if (deck === "D") {
      barColor = "bg-amber-400";
    }

    return (
      <div className="flex flex-col items-center gap-0.5 shrink-0">
        <span className="text-[7.5px] text-slate-500 font-black uppercase tracking-wider leading-none mb-0.5">{label}</span>
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/5 bg-slate-950 shadow-inner" />
          
          <div className="absolute w-[1px] h-0.5 bg-slate-800 -top-px rounded-full origin-bottom" style={{ transform: "rotate(0deg)" }} />
          <div className="absolute w-[1px] h-px bg-slate-800 -top-px rounded-full origin-bottom" style={{ transform: "rotate(-135deg)" }} />
          <div className="absolute w-[1px] h-px bg-slate-800 -top-px rounded-full origin-bottom" style={{ transform: "rotate(135deg)" }} />

          <div
            style={{ transform: `rotate(${rotation}deg)` }}
            className="w-6 h-6 rounded-full bg-slate-900 border border-white/10 shadow flex items-center justify-center cursor-pointer transition-transform duration-75 relative"
          >
            <div className={`absolute w-[1px] h-2 ${barColor} top-px rounded-full`} />
            <div className="w-2 h-2 bg-slate-950 rounded-full border border-white/5 shadow-inner" />
          </div>
        </div>

        <span className="text-[7px] font-mono font-bold text-slate-400 mt-0.5 leading-none">
          {isFilter 
            ? value === 0 ? "OFF" : value < 0 ? "LPF" : "HPF" 
            : isGain 
              ? `${Math.round(value * 100)}%`
              : `${value > 0 ? "+" : ""}${value.toFixed(0)}`}
        </span>

        <input
          type="range"
          min={min}
          max={max}
          step={isFilter ? 0.05 : isGain ? 0.05 : 1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-10 h-1 opacity-20 accent-slate-500 cursor-pointer mt-0.5"
        />
      </div>
    );
  };

  const renderChannelColumn = (deckId: DeckId, state: DeckState, themeColor: string) => {
    return (
      <div className="flex flex-col items-center gap-3 bg-slate-900/20 border border-white/5 p-2 rounded-xl relative">
        <div className="flex justify-between items-center w-full px-1">
          <span className={`text-[9px] font-black uppercase tracking-wider ${themeColor}`}>CH {deckId}</span>
          <span className="text-[7.5px] font-mono text-slate-500">{state.track ? `${state.bpm.toFixed(0)} BPM` : "---"}</span>
        </div>

        {/* EQs */}
        <div className="flex flex-col gap-2.5">
          {renderRotaryKnob(deckId, "gain", state.volume, 0, 1, (val) => onVolumeChange(deckId, val))}
          {renderRotaryKnob(deckId, "high", state.eqHigh, -12, 12, (val) => onEQChange(deckId, "high", val))}
          {renderRotaryKnob(deckId, "mid", state.eqMid, -12, 12, (val) => onEQChange(deckId, "mid", val))}
          {renderRotaryKnob(deckId, "low", state.eqLow, -12, 12, (val) => onEQChange(deckId, "low", val))}
          {renderRotaryKnob(deckId, "filter", state.filterCutoff, -1, 1, (val) => onFilterChange(deckId, val))}
        </div>

        {/* Vertical volume fader & VU meter side-by-side */}
        <div className="flex items-center gap-2 mt-1">
          {renderVUMeter(deckId === "A" ? peakA : deckId === "B" ? peakB : deckId === "C" ? peakC : peakD)}
          
          <div className="relative w-6 h-28 flex items-center justify-center bg-black rounded border border-white/5 shadow-inner">
            <input
              type="range"
              orient="vertical"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={(e) => onVolumeChange(deckId, parseFloat(e.target.value))}
              className="vertical-slider h-24 w-full opacity-90 cursor-row-resize accent-white"
              style={{ WebkitAppearance: "slider-vertical" } as any}
            />
          </div>
        </div>

        <span className="text-[8px] font-mono font-black text-slate-400">
          {Math.round(state.volume * 100)}%
        </span>
      </div>
    );
  };

  return (
    <div
      id="dj-mixer"
      className="bg-slate-950/95 border border-white/5 rounded-xl p-3 flex flex-col gap-4 shadow-xl relative"
    >
      {/* Header Panel */}
      <div className="flex justify-between items-center border-b border-white/5 pb-1.5 relative z-10">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-slate-400" />
          <h2 className="text-[10px] font-black uppercase text-white tracking-wider">TRAKDROID PRO 4-CHANNEL MIXER</h2>
        </div>
        <span className="text-[8px] text-slate-500 font-black uppercase tracking-wider flex items-center gap-1">
          <AudioLines className="w-3 h-3 text-cyan-400" /> 4-CH VU MONITORS
        </span>
      </div>

      {/* 4-Channel Grid */}
      <div className="grid grid-cols-4 gap-2 relative z-10">
        {renderChannelColumn("A", stateA, "text-cyan-400")}
        {renderChannelColumn("C", stateC, "text-emerald-400")}
        {renderChannelColumn("D", stateD, "text-amber-400")}
        {renderChannelColumn("B", stateB, "text-fuchsia-400")}
      </div>

      {/* Horizontal Crossfader */}
      <div className="flex flex-col gap-1.5 bg-slate-900/40 border border-white/5 p-2 rounded-lg relative z-10">
        <div className="flex justify-between items-center text-[7.5px] font-black text-slate-500 uppercase tracking-wider px-1">
          <span>LEFT (CH A & C)</span>
          <span className="text-white font-mono font-black tracking-wider">
            X-FADER: {crossfader === 0 ? "CENTER" : crossfader < 0 ? `L ${Math.round(Math.abs(crossfader) * 100)}%` : `R ${Math.round(crossfader * 100)}%`}
          </span>
          <span>RIGHT (CH B & D)</span>
        </div>
        <div className="relative w-full h-6 flex items-center px-3 bg-slate-950 rounded border border-white/5 shadow-inner">
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[1.5px] bg-white/10 pointer-events-none" />
          <input
            id="crossfader"
            type="range"
            min="-1"
            max="1"
            step="0.02"
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full h-3 accent-cyan-500 cursor-col-resize opacity-95"
          />
        </div>
      </div>
    </div>
  );
};
