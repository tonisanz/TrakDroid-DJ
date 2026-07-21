/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Activity, Power, Volume2, Clock, Zap, Cpu } from "lucide-react";

interface TraktorHeaderProps {
  masterBpm: number;
  onMasterBpmChange: (bpm: number) => void;
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  quantize: boolean;
  onQuantizeToggle: () => void;
  snap: boolean;
  onSnapToggle: () => void;
}

export const TraktorHeader: React.FC<TraktorHeaderProps> = ({
  masterBpm,
  onMasterBpmChange,
  masterVolume,
  onMasterVolumeChange,
  quantize,
  onQuantizeToggle,
  snap,
  onSnapToggle,
}) => {
  const [timeStr, setTimeStr] = useState("13:14");
  const [fx1Preset, setFx1Preset] = useState("909 Kit");
  const [fx2Preset, setFx2Preset] = useState("Delay");
  const [fx1Active, setFx1Active] = useState(true);
  const [fx2Active, setFx2Active] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      setTimeStr(`${hrs}:${mins}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-950 border-b border-white/10 text-slate-300 px-3 py-1.5 flex items-center justify-between text-[10px] select-none shadow-md">
      {/* Left FX Unit 1 Panel */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 rounded px-2 py-1">
        <button
          onClick={() => setFx1Active(!fx1Active)}
          className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider transition ${
            fx1Active
              ? "bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]"
              : "bg-slate-800 text-slate-500"
          }`}
        >
          FX 1
        </button>

        <select
          value={fx1Preset}
          onChange={(e) => setFx1Preset(e.target.value)}
          className="bg-black text-amber-400 font-mono font-bold text-[9px] border border-white/10 rounded px-1 py-0.5 outline-none cursor-pointer"
        >
          <option value="909 Kit">909 Kit</option>
          <option value="Beatmasher">Beatmasher</option>
          <option value="Flanger">Flanger</option>
          <option value="Filter LFO">Filter LFO</option>
        </select>

        <div className="flex items-center gap-2 text-[8px] text-slate-400 font-bold">
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[7px]">VOL</span>
            <input type="range" min="0" max="1" step="0.05" defaultValue="0.8" className="w-8 h-1 accent-amber-400" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[7px]">PITCH</span>
            <input type="range" min="0" max="1" step="0.05" defaultValue="0.5" className="w-8 h-1 accent-amber-400" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[7px]">DECAY</span>
            <input type="range" min="0" max="1" step="0.05" defaultValue="0.6" className="w-8 h-1 accent-amber-400" />
          </div>
        </div>
      </div>

      {/* Traktor Center Master Clock & BPM Panel */}
      <div className="flex items-center gap-3 bg-slate-900/90 border border-white/10 rounded-lg px-3 py-1 shadow-inner">
        {/* Brand Logo */}
        <div className="flex items-center gap-1">
          <span className="font-black text-xs text-white tracking-tighter">TRAKTOR</span>
          <span className="bg-cyan-500 text-black px-1 rounded text-[8px] font-black uppercase">PRO 4</span>
        </div>

        <div className="w-px h-5 bg-white/10" />

        {/* Snap & Quant Toggles */}
        <div className="flex items-center gap-1">
          <button
            onClick={onSnapToggle}
            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition ${
              snap ? "bg-cyan-500 text-black shadow-[0_0_6px_rgba(6,182,212,0.6)]" : "bg-slate-800 text-slate-500"
            }`}
          >
            SNAP
          </button>
          <button
            onClick={onQuantizeToggle}
            className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition ${
              quantize ? "bg-cyan-500 text-black shadow-[0_0_6px_rgba(6,182,212,0.6)]" : "bg-slate-800 text-slate-500"
            }`}
          >
            QUANT
          </button>
        </div>

        {/* Master Clock BPM Screen */}
        <div className="bg-black border border-cyan-500/30 rounded px-2.5 py-0.5 flex items-center gap-2 shadow-[0_0_10px_rgba(6,182,212,0.15)]">
          <div className="flex flex-col items-end">
            <span className="text-cyan-400 font-mono font-black text-sm tracking-widest leading-none">
              {masterBpm.toFixed(2)}
            </span>
            <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">MASTER CLOCK</span>
          </div>

          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => onMasterBpmChange(masterBpm + 1)}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[8px] px-1 font-black rounded leading-none"
            >
              ▲
            </button>
            <button
              onClick={() => onMasterBpmChange(masterBpm - 1)}
              className="bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[8px] px-1 font-black rounded leading-none"
            >
              ▼
            </button>
          </div>
        </div>

        {/* CPU Level & System Time */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[8px] text-slate-400 font-mono">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <div className="w-8 h-2 bg-slate-950 rounded overflow-hidden border border-white/5 flex p-[1px]">
              <div className="w-3/4 h-full bg-emerald-500 rounded-sm" />
            </div>
          </div>
          <div className="flex items-center gap-1 font-mono text-[9px] text-white font-bold bg-black/60 px-1.5 py-0.5 rounded border border-white/5">
            <Clock className="w-3 h-3 text-amber-400" />
            {timeStr}
          </div>
        </div>
      </div>

      {/* Right FX Unit 2 Panel */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-white/10 rounded px-2 py-1">
        <select
          value={fx2Preset}
          onChange={(e) => setFx2Preset(e.target.value)}
          className="bg-black text-fuchsia-400 font-mono font-bold text-[9px] border border-white/10 rounded px-1 py-0.5 outline-none cursor-pointer"
        >
          <option value="Delay">Delay</option>
          <option value="Reverb">Reverb</option>
          <option value="Gater">Gater</option>
          <option value="Filter Drama">Filter Drama</option>
        </select>

        <div className="flex items-center gap-2 text-[8px] text-slate-400 font-bold">
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[7px]">D/W</span>
            <input type="range" min="0" max="1" step="0.05" defaultValue="0.4" className="w-8 h-1 accent-fuchsia-400" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-slate-500 text-[7px]">RATE</span>
            <input type="range" min="0" max="1" step="0.05" defaultValue="0.5" className="w-8 h-1 accent-fuchsia-400" />
          </div>
        </div>

        <button
          onClick={() => setFx2Active(!fx2Active)}
          className={`px-1.5 py-0.5 rounded font-black text-[9px] uppercase tracking-wider transition ${
            fx2Active
              ? "bg-fuchsia-500 text-black shadow-[0_0_8px_rgba(217,70,239,0.5)]"
              : "bg-slate-800 text-slate-500"
          }`}
        >
          FX 2
        </button>
      </div>
    </header>
  );
};
