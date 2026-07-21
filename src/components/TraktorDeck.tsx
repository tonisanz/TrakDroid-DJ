/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, RefreshCw, Layers, Volume2, Mic, Disc, Zap } from "lucide-react";
import { DeckState, DeckId, Track } from "../types";
import { audio } from "../utils/audio";

interface TraktorDeckProps {
  deckId: DeckId;
  state: DeckState;
  masterBpm: number;
  onPlayToggle: () => void;
  onSync: () => void;
  onMasterToggle: () => void;
  onCueClick: () => void;
  onCupClick: () => void;
  onFluxToggle: () => void;
  onReverseToggle: () => void;
  onLoopSizeChange: (size: number) => void;
  onLoopToggle: () => void;
  onSeek: (time: number) => void;
  onLoadClick: () => void;
  onStemChange: (stem: "drums" | "bass" | "other" | "vocals", value: number) => void;
}

export const TraktorDeck: React.FC<TraktorDeckProps> = ({
  deckId,
  state,
  masterBpm,
  onPlayToggle,
  onSync,
  onMasterToggle,
  onCueClick,
  onCupClick,
  onFluxToggle,
  onReverseToggle,
  onLoopSizeChange,
  onLoopToggle,
  onSeek,
  onLoadClick,
  onStemChange,
}) => {
  const zoomedWaveformRef = useRef<HTMLCanvasElement | null>(null);
  const overviewWaveformRef = useRef<HTMLCanvasElement | null>(null);

  // Smooth local playback progress
  const [progress, setProgress] = useState(0);

  // Theme colors per deck matching Traktor Pro 4
  const deckColors: Record<DeckId, { border: string; bg: string; text: string; glow: string; waveGradient: string[] }> = {
    A: {
      border: "border-cyan-500/30",
      bg: "bg-cyan-950/30",
      text: "text-cyan-400",
      glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]",
      waveGradient: ["#06b6d4", "#3b82f6", "#f97316", "#ffffff"]
    },
    B: {
      border: "border-amber-500/30",
      bg: "bg-amber-950/30",
      text: "text-amber-400",
      glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]",
      waveGradient: ["#f59e0b", "#ef4444", "#3b82f6", "#ffffff"]
    },
    C: {
      border: "border-blue-500/30",
      bg: "bg-blue-950/30",
      text: "text-blue-400",
      glow: "shadow-[0_0_15px_rgba(59,130,246,0.2)]",
      waveGradient: ["#3b82f6", "#06b6d4", "#ec4899", "#ffffff"]
    },
    D: {
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/30",
      text: "text-emerald-400",
      glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]",
      waveGradient: ["#10b981", "#8b5cf6", "#f43f5e", "#ffffff"]
    },
  };

  const theme = deckColors[deckId];

  // Continuous progress update
  useEffect(() => {
    let animId: number;
    const updateProgress = () => {
      if (state.isPlaying && state.track) {
        const p = audio.getPlaybackProgress(deckId, state.duration);
        setProgress(p);
      }
      animId = requestAnimationFrame(updateProgress);
    };
    animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, [deckId, state.isPlaying, state.track, state.duration]);

  // 1. Render Upper Zoomed Scrolling Spectrum Waveform
  useEffect(() => {
    const canvas = zoomedWaveformRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.track) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`DECK ${deckId} - NO TRACK LOADED`, canvas.width / 2, canvas.height / 2 + 3);
      return;
    }

    const peaks = audio.getWaveformData(state.track);
    const numBars = 120;
    const centerOffset = Math.floor(progress * peaks.length);

    // Render zooming moving spectrum waveform bars
    for (let i = -60; i < 60; i++) {
      const idx = (centerOffset + i + peaks.length * 1000) % peaks.length;
      const peak = peaks[idx] || 0.1;
      const x = canvas.width / 2 + i * 4;
      const h = Math.max(3, peak * (canvas.height - 8));

      // Traktor Multi-Color Spectrum: Bass (Orange/Red), Mid (Cyan/Blue), High (White)
      let color = theme.waveGradient[0];
      if (i % 3 === 0) color = theme.waveGradient[1];
      else if (i % 5 === 0) color = theme.waveGradient[2];
      else if (peak > 0.7) color = theme.waveGradient[3];

      ctx.fillStyle = color;
      ctx.fillRect(x, (canvas.height - h) / 2, 3, h);
    }

    // Draw center Playhead line
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Hotcue flag indicators
    if (state.cuePoint !== null) {
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(canvas.width / 2, 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [state.track, progress, deckId, theme]);

  // 2. Render Lower Overview Track Waveform
  useEffect(() => {
    const canvas = overviewWaveformRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!state.track) return;

    const peaks = audio.getWaveformData(state.track);
    const barWidth = canvas.width / peaks.length;

    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const h = Math.max(2, peak * (canvas.height - 4));
      const x = i * barWidth;
      const y = (canvas.height - h) / 2;

      const isPlayed = (i / peaks.length) <= progress;
      ctx.fillStyle = isPlayed ? theme.waveGradient[0] : "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(x, y, Math.max(1, barWidth - 1), h);
    }

    // Active Loop Region Highlight
    if (state.isLoopActive && state.duration > 0) {
      const loopWidthPercent = (state.loopSize * (60 / state.bpm)) / state.duration;
      const loopStart = progress * canvas.width;
      const loopW = Math.max(8, loopWidthPercent * canvas.width);

      ctx.fillStyle = "rgba(16, 185, 129, 0.35)";
      ctx.fillRect(loopStart, 0, loopW, canvas.height);
      ctx.strokeStyle = "#10b981";
      ctx.lineWidth = 1;
      ctx.strokeRect(loopStart, 0, loopW, canvas.height);
    }

    // Overview Playhead Vertical Bar
    const playheadX = progress * canvas.width;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvas.height);
    ctx.stroke();
  }, [state.track, progress, state.isLoopActive, state.loopSize, state.bpm, state.duration, theme]);

  // Click on overview waveform to seek
  const handleOverviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.track || !state.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percent * state.duration);
  };

  // Format time display (-01:06)
  const formatRemainingTime = () => {
    if (!state.duration) return "-00:00";
    const current = progress * state.duration;
    const remaining = Math.max(0, state.duration - current);
    const mins = Math.floor(remaining / 60);
    const secs = Math.floor(remaining % 60);
    return `-${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div
      id={`traktor-deck-${deckId}`}
      className={`bg-slate-950/90 border border-white/10 rounded-lg p-2.5 flex flex-col gap-2 relative shadow-xl ${theme.border}`}
    >
      {/* Top Deck Header Info Bar */}
      <div className="flex justify-between items-center bg-black/80 rounded px-2 py-1 border border-white/5">
        <div className="flex items-center gap-2 overflow-hidden">
          <button
            onClick={onLoadClick}
            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${theme.text} bg-slate-900 border border-white/10 hover:border-white/30 transition shrink-0`}
          >
            DECK {deckId}
          </button>
          
          <div className="overflow-hidden leading-tight">
            <div className="text-white font-black text-[11px] truncate">
              {state.track ? state.track.title : "No Track Loaded"}
            </div>
            <div className="text-slate-500 text-[8px] font-bold uppercase truncate">
              {state.track ? state.track.artist : "Click Deck A/B/C/D to load music"}
            </div>
          </div>
        </div>

        {/* Sync, Master, Time and BPM */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={onSync}
              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition ${
                state.isSync
                  ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                  : "bg-slate-900 text-slate-500 hover:text-slate-300"
              }`}
            >
              SYNC
            </button>
            <button
              onClick={onMasterToggle}
              className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase transition ${
                state.isMaster
                  ? "bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]"
                  : "bg-slate-900 text-slate-500 hover:text-slate-300"
              }`}
            >
              MASTER
            </button>
          </div>

          <div className="text-right font-mono leading-none">
            <div className="text-white text-[10px] font-black">{formatRemainingTime()}</div>
            <div className={`${theme.text} text-[9px] font-bold`}>{state.bpm.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Traktor Dual Waveform Displays */}
      <div className="flex flex-col gap-1 bg-black rounded border border-white/10 p-1 relative overflow-hidden">
        {/* 1. Zoomed Spectrum Moving Waveform */}
        <div className="relative h-12 w-full bg-slate-950 rounded overflow-hidden">
          <canvas
            ref={zoomedWaveformRef}
            width={400}
            height={48}
            className="w-full h-full block"
          />
        </div>

        {/* 2. Full Track Overview Waveform (Click to Seek) */}
        <div
          onClick={handleOverviewClick}
          className="relative h-6 w-full bg-slate-950 rounded overflow-hidden cursor-pointer hover:opacity-90 transition"
        >
          <canvas
            ref={overviewWaveformRef}
            width={400}
            height={24}
            className="w-full h-full block"
          />
        </div>
      </div>

      {/* STEM CONTROLS VIEW (Specially rendered if Stem Deck or Deck D) */}
      {deckId === "D" && (
        <div className="bg-slate-900/60 border border-white/10 rounded p-1.5 flex flex-col gap-1">
          <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-wider text-slate-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3 h-3 text-emerald-400" /> STEM CHANNELS
            </span>
            <span className="text-[7px] text-emerald-400 font-mono">LIVE STEM ISOLATION</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { key: "drums", label: "DRUMS", color: "text-cyan-400", accent: "accent-cyan-400" },
              { key: "bass", label: "BASS", color: "text-amber-400", accent: "accent-amber-400" },
              { key: "other", label: "OTHER", color: "text-fuchsia-400", accent: "accent-fuchsia-400" },
              { key: "vocals", label: "VOCALS", color: "text-emerald-400", accent: "accent-emerald-400" },
            ].map((stem) => (
              <div key={stem.key} className="bg-black/80 border border-white/5 p-1 rounded flex flex-col items-center">
                <span className={`text-[7px] font-black uppercase ${stem.color}`}>{stem.label}</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={state.stems[stem.key as keyof typeof state.stems]}
                  onChange={(e) => onStemChange(stem.key as any, parseFloat(e.target.value))}
                  className={`w-full h-1 mt-1 cursor-pointer ${stem.accent}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traktor Transport Controls Bar */}
      <div className="grid grid-cols-6 gap-1 items-center">
        {/* Play Button */}
        <button
          onClick={onPlayToggle}
          disabled={!state.track}
          className={`h-8 rounded font-black text-[10px] flex items-center justify-center gap-1 uppercase transition active:scale-95 border ${
            state.isPlaying
              ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
              : "bg-slate-900 hover:bg-slate-800 text-emerald-400 border-white/10"
          } disabled:opacity-30`}
        >
          {state.isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
          <span>PLAY</span>
        </button>

        {/* CUE */}
        <button
          onClick={onCueClick}
          disabled={!state.track}
          className="h-8 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-white/10 rounded font-black text-[9px] uppercase active:scale-95 disabled:opacity-30"
        >
          CUE
        </button>

        {/* CUP (Cue Play) */}
        <button
          onClick={onCupClick}
          disabled={!state.track}
          className="h-8 bg-slate-900 hover:bg-slate-800 text-amber-300 border border-white/10 rounded font-black text-[9px] uppercase active:scale-95 disabled:opacity-30"
        >
          CUP
        </button>

        {/* FLX (Flux Mode) */}
        <button
          onClick={onFluxToggle}
          className={`h-8 rounded font-black text-[9px] uppercase transition active:scale-95 border ${
            state.isFlux
              ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]"
              : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-white/10"
          }`}
        >
          FLX
        </button>

        {/* REV (Reverse) */}
        <button
          onClick={onReverseToggle}
          className={`h-8 rounded font-black text-[9px] uppercase transition active:scale-95 border ${
            state.isReverse
              ? "bg-fuchsia-500 text-black border-fuchsia-400 shadow-[0_0_8px_rgba(217,70,239,0.4)]"
              : "bg-slate-900 hover:bg-slate-800 text-slate-400 border-white/10"
          }`}
        >
          REV
        </button>

        {/* Loop Beat Size Jump selector */}
        <div className="flex items-center bg-slate-900 border border-white/10 rounded h-8 px-1 justify-between">
          <button
            onClick={() => onLoopSizeChange(Math.max(0.25, state.loopSize / 2))}
            className="text-[10px] font-black text-slate-400 hover:text-white px-1"
          >
            ‹
          </button>

          <button
            onClick={onLoopToggle}
            className={`text-[9px] font-mono font-black uppercase px-1 rounded ${
              state.isLoopActive ? "bg-emerald-500 text-black" : "text-emerald-400"
            }`}
          >
            {state.loopSize}B
          </button>

          <button
            onClick={() => onLoopSizeChange(Math.min(32, state.loopSize * 2))}
            className="text-[10px] font-black text-slate-400 hover:text-white px-1"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
};
