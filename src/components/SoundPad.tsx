/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Volume2, Zap, AlertTriangle, Disc3, Waves } from "lucide-react";
import { SamplePad } from "../types";
import { audio } from "../utils/audio";

interface SoundPadProps {
  onSampleTriggered: (name: string) => void;
}

export const SoundPad: React.FC<SoundPadProps> = ({ onSampleTriggered }) => {
  const samplePads: SamplePad[] = [
    {
      id: "airhorn",
      name: "Airhorn Drop",
      icon: "📣",
      color: "from-amber-500/20 to-amber-500/5 hover:from-amber-500/30 hover:to-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)]",
      type: "airhorn",
    },
    {
      id: "siren",
      name: "Siren Sweep",
      icon: "🚨",
      color: "from-rose-500/20 to-rose-500/5 hover:from-rose-500/30 hover:to-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)]",
      type: "siren",
    },
    {
      id: "laser",
      name: "Sci-Fi Laser",
      icon: "⚡",
      color: "from-cyan-500/20 to-cyan-500/5 hover:from-cyan-500/30 hover:to-cyan-500/10 text-cyan-400 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]",
      type: "laser",
    },
    {
      id: "bassdrop",
      name: "Deep Sub Drop",
      icon: "🌀",
      color: "from-fuchsia-500/20 to-fuchsia-500/5 hover:from-fuchsia-500/30 hover:to-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30 shadow-[0_0_15px_rgba(217,70,239,0.15)]",
      type: "bassdrop",
    },
    {
      id: "white_noise_sweep",
      name: "Noise Rise",
      icon: "💨",
      color: "from-emerald-500/20 to-emerald-500/5 hover:from-emerald-500/30 hover:to-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]",
      type: "white_noise_sweep",
    },
  ];

  const handlePadPress = (pad: SamplePad) => {
    // Call direct synthesis from Web Audio Engine
    audio.triggerSample(pad.type);
    onSampleTriggered(pad.name);
  };

  return (
    <div
      id="sound-pad-board"
      className="bg-gradient-to-b from-slate-900 to-black border border-white/5 rounded-2xl p-5 flex flex-col gap-4"
    >
      {/* Title */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-3">
        <Volume2 className="w-4 h-4 text-cyan-400" />
        <h2 className="text-xs font-black uppercase text-white tracking-widest">Hype Sound Effects Board</h2>
      </div>

      <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider -mt-1 leading-snug">
        Tap the silicone pads to trigger real-time synthesized FX overlays directly on top of your mixing tracks.
      </div>

      {/* Grid of silicone trigger buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-1">
        {samplePads.map((pad) => (
          <button
            key={pad.id}
            id={`pad-${pad.id}`}
            onClick={() => handlePadPress(pad)}
            className={`flex flex-col items-center justify-center p-3.5 rounded-xl bg-gradient-to-br ${pad.color} border cursor-pointer transition-all duration-75 active:scale-95 active:brightness-125 select-none`}
          >
            {/* Pad Icon / Text */}
            <span className="text-2xl mb-1.5 filter drop-shadow">{pad.icon}</span>
            <span className="text-[10px] font-black text-center tracking-wider leading-tight uppercase">
              {pad.name}
            </span>

            {/* Glowing silicone grid lines look */}
            <div className="w-full h-0.5 bg-white/5 mt-2 rounded" />
          </button>
        ))}
      </div>
    </div>
  );
};
