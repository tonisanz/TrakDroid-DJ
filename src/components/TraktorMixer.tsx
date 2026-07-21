/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Sliders, Headphones, Volume2, Key, Radio } from "lucide-react";
import { DeckState, DeckId } from "../types";
import { audio } from "../utils/audio";

interface TraktorMixerProps {
  stateA: DeckState;
  stateB: DeckState;
  stateC: DeckState;
  stateD: DeckState;
  crossfader: number;
  onVolumeChange: (deck: DeckId, val: number) => void;
  onEQChange: (deck: DeckId, type: "low" | "mid" | "high", db: number) => void;
  onFilterChange: (deck: DeckId, value: number) => void;
  onCrossfaderChange: (value: number) => void;
  onKeyLockToggle: (deck: DeckId) => void;
  onHeadphoneCueToggle: (deck: DeckId) => void;
  onFxSendToggle: (deck: DeckId, fxUnit: 1 | 2) => void;
}

export const TraktorMixer: React.FC<TraktorMixerProps> = ({
  stateA,
  stateB,
  stateC,
  stateD,
  crossfader,
  onVolumeChange,
  onEQChange,
  onFilterChange,
  onCrossfaderChange,
  onKeyLockToggle,
  onHeadphoneCueToggle,
  onFxSendToggle,
}) => {
  // Stereo Peak VU level monitoring for each channel
  const [peakA, setPeakA] = useState(0);
  const [peakB, setPeakB] = useState(0);
  const [peakC, setPeakC] = useState(0);
  const [peakD, setPeakD] = useState(0);

  useEffect(() => {
    let animId: number;
    const updateVUs = () => {
      setPeakA(audio.getPeakLevel("A"));
      setPeakB(audio.getPeakLevel("B"));
      setPeakC(audio.getPeakLevel("C"));
      setPeakD(audio.getPeakLevel("D"));
      animId = requestAnimationFrame(updateVUs);
    };
    animId = requestAnimationFrame(updateVUs);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Multi-color LED Peak VU Meter
  const renderVUMeter = (level: number) => {
    const totalLEDs = 12;
    return (
      <div className="flex flex-col-reverse gap-[1px] h-28 w-2 bg-black border border-white/10 rounded p-[1px] shadow-inner shrink-0">
        {Array.from({ length: totalLEDs }).map((_, i) => {
          const threshold = (i + 1) / totalLEDs;
          const isActive = level >= threshold;
          let ledColor = "bg-slate-900";

          if (isActive) {
            if (i < 7) ledColor = "bg-emerald-500 shadow-[0_0_4px_#10b981]";
            else if (i < 10) ledColor = "bg-amber-400 shadow-[0_0_4px_#f59e0b]";
            else ledColor = "bg-red-500 shadow-[0_0_6px_#ef4444]";
          }

          return (
            <div
              key={i}
              className={`h-1.5 w-full rounded-[0.5px] transition-all duration-75 ${ledColor}`}
            />
          );
        })}
      </div>
    );
  };

  // Traktor Metallic Rotary Knob
  const renderRotaryKnob = (
    deck: DeckId,
    label: string,
    value: number,
    min: number,
    max: number,
    onChange: (val: number) => void,
    colorClass = "bg-cyan-400"
  ) => {
    const pct = (value - min) / (max - min);
    const rotation = -135 + pct * 270;

    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[7px] text-slate-400 font-black uppercase tracking-wider leading-none">
          {label}
        </span>
        <div className="relative w-6 h-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-white/10 bg-slate-950 shadow-inner" />
          <div
            style={{ transform: `rotate(${rotation}deg)` }}
            className="w-5 h-5 rounded-full bg-slate-900 border border-white/20 shadow flex items-center justify-center cursor-pointer transition-transform duration-75 relative"
          >
            <div className={`absolute w-[1.5px] h-2 ${colorClass} top-0.5 rounded-full`} />
          </div>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={label === "FLTR" ? 0.05 : 1}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-8 h-1 opacity-20 cursor-pointer accent-slate-400"
        />
      </div>
    );
  };

  // Render a Single Traktor Mixer Channel Strip
  const renderChannelStrip = (deckId: DeckId, state: DeckState, themeTextColor: string) => {
    const peakLevel = deckId === "A" ? peakA : deckId === "B" ? peakB : deckId === "C" ? peakC : peakD;

    return (
      <div className="flex flex-col items-center gap-2 bg-slate-950/80 border border-white/10 p-1.5 rounded-lg relative shadow-inner">
        {/* Channel Label */}
        <div className="flex justify-between items-center w-full px-0.5">
          <span className={`text-[9px] font-black uppercase tracking-wider ${themeTextColor}`}>
            CH {deckId}
          </span>
          <span className="text-[7.5px] font-mono font-bold text-slate-500">
            {state.track ? `${state.bpm.toFixed(0)}` : "--"}
          </span>
        </div>

        {/* Rotary Knobs: GAIN, HI, MID, LO, FLTR */}
        <div className="flex flex-col gap-1.5">
          {renderRotaryKnob(deckId, "GAIN", state.volume, 0, 1, (val) => onVolumeChange(deckId, val), "bg-emerald-400")}
          {renderRotaryKnob(deckId, "HI", state.eqHigh, -12, 12, (val) => onEQChange(deckId, "high", val), "bg-cyan-400")}
          {renderRotaryKnob(deckId, "MID", state.eqMid, -12, 12, (val) => onEQChange(deckId, "mid", val), "bg-cyan-400")}
          {renderRotaryKnob(deckId, "LOW", state.eqLow, -12, 12, (val) => onEQChange(deckId, "low", val), "bg-cyan-400")}
          {renderRotaryKnob(deckId, "FLTR", state.filterCutoff, -1, 1, (val) => onFilterChange(deckId, val), "bg-amber-400")}
        </div>

        {/* FX Send Buttons 1 & 2 */}
        <div className="flex gap-1 my-0.5">
          <button
            onClick={() => onFxSendToggle(deckId, 1)}
            className={`w-3.5 h-3.5 text-[7px] font-black rounded border ${
              state.fx1Send ? "bg-amber-500 text-black border-amber-400" : "bg-slate-900 text-slate-500 border-white/5"
            }`}
          >
            1
          </button>
          <button
            onClick={() => onFxSendToggle(deckId, 2)}
            className={`w-3.5 h-3.5 text-[7px] font-black rounded border ${
              state.fx2Send ? "bg-fuchsia-500 text-black border-fuchsia-400" : "bg-slate-900 text-slate-500 border-white/5"
            }`}
          >
            2
          </button>
        </div>

        {/* Key Lock & Headphone Cue Buttons */}
        <div className="flex gap-1 mb-1">
          <button
            onClick={() => onKeyLockToggle(deckId)}
            className={`px-1 py-0.5 text-[7px] font-black rounded uppercase border ${
              state.keyLock ? "bg-cyan-500 text-black border-cyan-400" : "bg-slate-900 text-slate-500 border-white/5"
            }`}
          >
            KEY
          </button>

          <button
            onClick={() => onHeadphoneCueToggle(deckId)}
            className={`p-1 rounded border transition ${
              state.headphoneCue ? "bg-amber-500 text-black border-amber-400" : "bg-slate-900 text-slate-500 border-white/5"
            }`}
          >
            <Headphones className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Channel Volume Fader and LED VU Meter Side-by-Side */}
        <div className="flex items-center gap-1.5">
          {renderVUMeter(peakLevel)}

          <div className="relative w-5 h-28 flex items-center justify-center bg-black rounded border border-white/10 shadow-inner">
            <input
              type="range"
              orient="vertical"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={(e) => onVolumeChange(deckId, parseFloat(e.target.value))}
              className="vertical-slider h-24 w-full cursor-row-resize accent-white opacity-90"
              style={{ WebkitAppearance: "slider-vertical" } as any}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      id="traktor-mixer-center"
      className="bg-slate-950 border border-white/10 rounded-lg p-2 flex flex-col gap-2 shadow-2xl relative"
    >
      {/* Mixer Title */}
      <div className="flex justify-between items-center border-b border-white/10 pb-1 text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">
        <span className="flex items-center gap-1">
          <Sliders className="w-3 h-3 text-cyan-400" /> CENTRAL MIXER
        </span>
        <span className="text-[8px] text-slate-500 font-mono">4 CHANNEL MATRIX</span>
      </div>

      {/* 4 Mixer Channels Grid in Traktor Order: A, C, D, B */}
      <div className="grid grid-cols-4 gap-1.5">
        {renderChannelStrip("A", stateA, "text-cyan-400")}
        {renderChannelStrip("C", stateC, "text-blue-400")}
        {renderChannelStrip("D", stateD, "text-emerald-400")}
        {renderChannelStrip("B", stateB, "text-amber-400")}
      </div>

      {/* Crossfader Section */}
      <div className="bg-slate-900/60 border border-white/10 p-1.5 rounded flex flex-col gap-1">
        <div className="flex justify-between items-center text-[7.5px] font-black text-slate-400 uppercase tracking-wider px-1">
          <span>LEFT (A/C)</span>
          <span className="text-white font-mono">
            X-FADER: {crossfader === 0 ? "CENTER" : crossfader < 0 ? `L ${Math.round(Math.abs(crossfader) * 100)}%` : `R ${Math.round(crossfader * 100)}%`}
          </span>
          <span>RIGHT (B/D)</span>
        </div>

        <div className="relative w-full h-5 flex items-center px-2 bg-black rounded border border-white/10 shadow-inner">
          <div className="absolute left-1/2 -translate-x-1/2 h-full w-[1.5px] bg-white/20 pointer-events-none" />
          <input
            id="crossfader"
            type="range"
            min="-1"
            max="1"
            step="0.02"
            value={crossfader}
            onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
            className="w-full h-2 accent-cyan-400 cursor-col-resize opacity-95"
          />
        </div>
      </div>
    </div>
  );
};
