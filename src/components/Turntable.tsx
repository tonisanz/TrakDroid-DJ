/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Disc, Play, Square, Music, Activity, RefreshCw } from "lucide-react";
import { Track, DeckState } from "../types";
import { audio } from "../utils/audio";

interface TurntableProps {
  deckId: "A" | "B";
  state: DeckState;
  onPlayToggle: () => void;
  onLoadTrackClick: () => void;
  onPitchChange: (deckId: "A" | "B", value: number) => void;
  onSync: (fromDeck: "A" | "B", toDeck: "A" | "B") => void;
}

export const Turntable: React.FC<TurntableProps> = ({
  deckId,
  state,
  onPlayToggle,
  onLoadTrackClick,
  onPitchChange,
  onSync,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const platterRef = useRef<HTMLDivElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const scratchStartAngle = useRef(0);
  const currentScratchAngle = useRef(0);

  // Traktor Loop State
  const [loopSize, setLoopSize] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);

  // Rotation animation
  useEffect(() => {
    let animationId: number;
    const updateRotation = () => {
      if (state.isPlaying && !isScratching) {
        const speed = (state.bpm / 120) * state.playbackRate * 1.5;
        setRotation((prev) => (prev + speed) % 360);
      }
      animationId = requestAnimationFrame(updateRotation);
    };
    animationId = requestAnimationFrame(updateRotation);
    return () => cancelAnimationFrame(animationId);
  }, [state.isPlaying, state.bpm, state.playbackRate, isScratching]);

  // Audio Analyzer Visualizer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let visualId: number;
    const bufferLength = 32;
    const dataArray = new Uint8Array(bufferLength);

    const renderWave = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      audio.getAnalyserData(deckId, dataArray);

      const barWidth = (canvas.width / bufferLength) * 1.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        // Boost size slightly if loop is active for pulsing feel
        const multiplier = isLoopActive ? 1.4 : 1.1;
        barHeight = (dataArray[i] / 2.2) * multiplier;

        // Custom Traktor colors (Deck A: Icy Blue/Cyan, Deck B: Warm Neon Amber/Orange)
        if (deckId === "A") {
          // Ice Blue & Emerald hints
          const g = Math.min(255, 130 + i * 3.5);
          const b = Math.min(255, 220 + i * 1);
          ctx.fillStyle = isLoopActive && i % 2 === 0
            ? `rgb(249, 115, 22)` // Orange flash for loops
            : `rgb(6, ${g}, ${b})`;
        } else {
          // Warm Amber / Hot Orange & Fuchsia hints
          const r = Math.min(255, 220 + i * 1);
          const b = Math.min(255, 100 + i * 4);
          ctx.fillStyle = isLoopActive && i % 2 === 0
            ? `rgb(6, 182, 212)` // Cyan flash for loops
            : `rgb(${r}, 40, ${b})`;
        }
        
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth - 1, barHeight);
        x += barWidth;
      }
      visualId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(visualId);
  }, [deckId, state.isPlaying, isLoopActive]);

  // Scratch Touch / Drag Logic
  const calculateAngle = (clientX: number, clientY: number): number => {
    if (!platterRef.current) return 0;
    const rect = platterRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    return Math.atan2(clientY - centerY, clientX - centerX);
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (!state.track || !state.isPlaying) return;
    setIsScratching(true);
    const angle = calculateAngle(clientX, clientY);
    scratchStartAngle.current = angle;
    currentScratchAngle.current = rotation;
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isScratching) return;
    const angle = calculateAngle(clientX, clientY);
    const angleDiff = (angle - scratchStartAngle.current) * (180 / Math.PI);
    
    const newRotation = (currentScratchAngle.current + angleDiff) % 360;
    setRotation(newRotation);

    const scratchIntensity = Math.min(2.5, Math.max(-2.5, angleDiff / 10));
    onPitchChange(deckId, state.pitchPercent + scratchIntensity * 30);
  };

  const handleEnd = () => {
    if (isScratching) {
      setIsScratching(false);
      onPitchChange(deckId, state.pitchPercent);
    }
  };

  // Traktor pitch nudge button simulator
  const handleNudge = (direction: "up" | "down") => {
    const amount = direction === "up" ? 1.5 : -1.5;
    onPitchChange(deckId, state.pitchPercent + amount);
    setTimeout(() => {
      onPitchChange(deckId, state.pitchPercent);
    }, 150);
  };

  // Traktor Loop beat size handler
  const handleSetLoop = (size: number) => {
    if (loopSize === size && isLoopActive) {
      // Toggle loop off
      setIsLoopActive(false);
      setLoopSize(null);
    } else {
      setLoopSize(size);
      setIsLoopActive(true);
    }
  };

  // Traktor Loop halving/doubling
  const handleModifyLoop = (action: "halve" | "double") => {
    if (!loopSize) return;
    let nextSize = action === "halve" ? loopSize / 2 : loopSize * 2;
    nextSize = Math.max(0.5, Math.min(32, nextSize));
    setLoopSize(nextSize);
    setIsLoopActive(true);
  };

  // Calculate simulated Beat flash lights (1, 2, 3, 4) synchronous to tempo
  const beatsPerSecond = state.bpm / 60;
  const currentBeat = Math.floor((state.currentTime * beatsPerSecond)) % 4;

  const deckThemeColor = deckId === "A" ? "cyan" : "fuchsia";
  const neonAccentClass = deckId === "A" ? "text-cyan-400" : "text-fuchsia-400";
  const neonGlowClass = deckId === "A" ? "shadow-[0_0_15px_rgba(6,182,212,0.3)]" : "shadow-[0_0_15px_rgba(217,70,239,0.3)]";

  const glowShadow = state.isPlaying
    ? `0 0 35px ${deckId === "A" ? "rgba(6,182,212,0.25)" : "rgba(217,70,239,0.25)"}`
    : "none";

  return (
    <div
      id={`deck-${deckId}`}
      className="bg-slate-950 border border-white/5 rounded-2xl p-4 md:p-5 flex flex-col gap-4 select-none relative overflow-hidden shadow-2xl"
    >
      {/* Dynamic Background Aura */}
      <div className={`absolute top-0 ${deckId === "A" ? "left-0 bg-cyan-500/5" : "right-0 bg-fuchsia-500/5"} w-40 h-40 blur-[80px] pointer-events-none`} />

      {/* Symmetrical Top Header: Title, Grid options, and BPM display */}
      <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-2.5">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${deckId === "A" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20"}`}>
            DECK {deckId}
          </span>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${state.isPlaying ? "bg-emerald-500 animate-pulse" : "bg-slate-700"}`} />
            <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
              {state.track?.isProcedural ? "ALGORITHMIC" : state.track ? "LOCAL FILE" : "EMPTY"}
            </span>
          </div>
        </div>

        {/* Digital display screen for BPM and Key/Pitch */}
        <div className="bg-black/80 border border-white/5 rounded px-2.5 py-1 flex items-center gap-3">
          <div className="text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block leading-none">TEMPO</span>
            <span className="text-white font-mono text-xs font-black">
              {state.track ? `${state.bpm.toFixed(2)}` : "0.00"}
            </span>
          </div>
          <div className="w-px h-5 bg-white/5" />
          <div className="text-right">
            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block leading-none">PITCH</span>
            <span className={`text-[11px] font-black font-mono leading-none ${state.pitchPercent === 0 ? "text-slate-400" : state.pitchPercent > 0 ? "text-cyan-400" : "text-fuchsia-400"}`}>
              {state.pitchPercent > 0 ? "+" : ""}{state.pitchPercent.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Track info bar styled as a professional software panel */}
      <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 flex items-center justify-between min-h-[58px] relative z-10 hover:border-white/10 transition-all">
        {state.track ? (
          <div className="flex items-center gap-3 overflow-hidden w-full">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${deckId === "A" ? "bg-cyan-500/10 text-cyan-400" : "bg-fuchsia-500/10 text-fuchsia-400"}`}>
              <Music className="w-4 h-4" />
            </div>
            <div className="overflow-hidden leading-tight">
              <div className="text-white font-black text-xs md:text-sm truncate">{state.track.title}</div>
              <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider truncate mt-0.5">{state.track.artist}</div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-xs font-bold uppercase tracking-wider flex items-center gap-2 py-1">
            <Music className="w-3.5 h-3.5" /> No Track Loaded
          </div>
        )}

        <button
          id={`load-btn-${deckId}`}
          onClick={onLoadTrackClick}
          className="text-[10px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-750 text-white px-3.5 py-1.5 rounded border border-white/10 shadow transition active:scale-95 shrink-0 ml-3"
        >
          LOAD
        </button>
      </div>

      {/* Main deck hardware split view: Jogwheel (left/center) and Symmetrical Vertical Pitch Slider (right) */}
      <div className="flex gap-4 md:gap-6 items-stretch relative z-10">
        
        {/* Playback Platter (Vinyl Deck) */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
          
          {/* Live Sync Beat Flashing indicators (Traktor hardware style) */}
          <div className="flex gap-1.5 mb-3.5">
            {[0, 1, 2, 3].map((b) => (
              <div
                key={b}
                className={`w-4 h-1.5 rounded-sm transition-all duration-75 ${
                  state.isPlaying && currentBeat === b
                    ? deckId === "A"
                      ? "bg-cyan-400 shadow-[0_0_8px_#22d3ee]"
                      : "bg-fuchsia-500 shadow-[0_0_8px_#d946ef]"
                    : "bg-slate-800/80"
                }`}
              />
            ))}
          </div>

          <div
            ref={platterRef}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => {
              if (e.touches[0]) handleStart(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handleMove(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={handleEnd}
            style={{
              transform: `rotate(${rotation}deg)`,
              boxShadow: glowShadow,
              touchAction: "none",
            }}
            className={`w-44 h-44 md:w-48 md:h-48 rounded-full bg-slate-950 border-4 ${deckId === "A" ? "border-cyan-500/10" : "border-fuchsia-500/10"} flex items-center justify-center relative cursor-grab active:cursor-grabbing transition-shadow duration-300 shadow-[inset_0_0_15px_rgba(0,0,0,0.8)]`}
          >
            {/* Matte Vinyl grooves */}
            <div className="absolute inset-2 border border-white/[0.015] rounded-full" />
            <div className="absolute inset-5 border border-white/[0.02] rounded-full" />
            <div className="absolute inset-8 border border-white/[0.025] rounded-full" />
            <div className="absolute inset-12 border border-white/[0.03] rounded-full" />
            <div className="absolute inset-16 border border-white/[0.035] rounded-full" />

            {/* Position marker line for spin tracking */}
            <div className={`absolute w-1.5 h-1/2 ${deckId === "A" ? "bg-cyan-400" : "bg-fuchsia-400"} top-0 origin-bottom`} style={{ opacity: state.isPlaying ? 0.75 : 0.1 }} />

            {/* Center Hubcap Label */}
            <div className={`w-14 h-14 rounded-full bg-slate-900 border-2 ${deckId === "A" ? "border-cyan-400" : "border-fuchsia-400"} flex items-center justify-center shadow-inner relative overflow-hidden`}>
              <div className={`absolute inset-1 rounded-full ${deckId === "A" ? "bg-cyan-500/5" : "bg-fuchsia-500/5"} animate-pulse`} />
              <Disc className={`w-6 h-6 ${deckId === "A" ? "text-cyan-400" : "text-fuchsia-400"}`} />
              <div className="absolute w-3 h-3 bg-black rounded-full border border-white/10" />
            </div>
          </div>

          {/* Scratching popover tag */}
          {isScratching && (
            <div className="absolute bottom-2 bg-cyan-400 text-black text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow">
              SCRATCH
            </div>
          )}
        </div>

        {/* Traktor Style Symmetrical Vertical Tempo/Pitch Fader Column */}
        <div className="w-12 bg-slate-900/40 border border-white/5 rounded-xl p-2.5 flex flex-col items-center justify-between shadow-inner">
          {/* Nudge Up (+) */}
          <button
            onClick={() => handleNudge("up")}
            disabled={!state.track}
            className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center font-black text-xs text-slate-300 transition active:scale-95 disabled:opacity-30"
            title="Nudge pitch up"
          >
            +
          </button>

          {/* Vertical Fader tracks with center (0%) tick mark */}
          <div className="flex-1 flex justify-center items-center py-3 relative h-28">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-[2px] bg-white/20 z-10" title="Center 0%" />
            <input
              type="range"
              min="-16"
              max="16"
              step="0.1"
              value={state.pitchPercent}
              onChange={(e) => onPitchChange(deckId, parseFloat(e.target.value))}
              disabled={!state.track}
              style={{
                writingMode: "bt-lr",
                WebkitAppearance: "slider-vertical",
              }}
              className="h-full w-2.5 bg-slate-950 rounded cursor-pointer accent-cyan-400 appearance-none disabled:opacity-30"
            />
          </div>

          {/* Nudge Down (-) */}
          <button
            onClick={() => handleNudge("down")}
            disabled={!state.track}
            className="w-7 h-7 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center font-black text-xs text-slate-300 transition active:scale-95 disabled:opacity-30"
            title="Nudge pitch down"
          >
            -
          </button>
        </div>
      </div>

      {/* Traktor Style Waveform and Digital Grid display */}
      <div className="bg-slate-950 border border-white/5 rounded-xl p-2.5 flex flex-col gap-1.5 relative z-10">
        <div className="flex justify-between items-center text-[9px] text-slate-500 font-black uppercase tracking-widest px-1">
          <span className="flex items-center gap-1">
            <Activity className={`w-3.5 h-3.5 ${deckId === "A" ? "text-cyan-400" : "text-fuchsia-400"}`} /> Spectrum Wave
          </span>
          {isLoopActive && (
            <span className="text-amber-500 font-bold animate-pulse tracking-widest">
              LOOP ACTIVE: {loopSize} BEATS
            </span>
          )}
        </div>
        <canvas
          ref={canvasRef}
          width={280}
          height={38}
          className="w-full h-10 rounded bg-black/95 border border-white/[0.02]"
        />
      </div>

      {/* Traktor Style Pro Loop Section (Pulsing Amber Buttons) */}
      <div className="bg-slate-900/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2 relative z-10">
        <div className="flex justify-between items-center">
          <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Traktor Loop Grid</span>
          {/* Halve / Double Loop */}
          <div className="flex gap-1.5">
            <button
              onClick={() => handleModifyLoop("halve")}
              disabled={!isLoopActive}
              className="text-[8px] font-black uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-white/5 transition disabled:opacity-30"
            >
              /2
            </button>
            <button
              onClick={() => handleModifyLoop("double")}
              disabled={!isLoopActive}
              className="text-[8px] font-black uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-white/5 transition disabled:opacity-30"
            >
              x2
            </button>
          </div>
        </div>

        {/* Quick loop length buttons: 1, 2, 4, 8, 16 beats */}
        <div className="grid grid-cols-5 gap-1.5">
          {[1, 2, 4, 8, 16].map((size) => {
            const isActive = loopSize === size && isLoopActive;
            return (
              <button
                key={size}
                onClick={() => handleSetLoop(size)}
                disabled={!state.track}
                className={`py-2 text-[10px] font-black uppercase tracking-wider rounded transition-all duration-100 border ${
                  isActive
                    ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.3)] scale-[1.03]"
                    : "bg-slate-950 hover:bg-slate-900 text-slate-400 border-white/5"
                } disabled:opacity-30`}
              >
                {size}B
              </button>
            );
          })}
        </div>
      </div>

      {/* Traktor Symmetrical Big Action buttons grid: PLAY, CUE, SYNC */}
      <div className="grid grid-cols-3 gap-2.5 mt-1 relative z-10">
        
        {/* Play/Pause Button (Neon Green active) */}
        <button
          id={`play-toggle-${deckId}`}
          onClick={onPlayToggle}
          disabled={!state.track}
          className={`flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-100 border ${
            state.isPlaying
              ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              : "bg-slate-800 hover:bg-slate-750 text-emerald-400 border-white/5"
          } disabled:opacity-30 disabled:pointer-events-none active:scale-95`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>PLAY</span>
        </button>

        {/* CUE Button (Amber/Orange active) */}
        {state.cuePoint !== null ? (
          <button
            id={`cue-btn-${deckId}`}
            disabled={!state.track}
            onClick={() => {
              if (state.track) {
                audio.playTrack(deckId, state.track, state.cuePoint || 0);
              }
            }}
            className={`flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-100 bg-amber-500 text-black border border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] active:scale-95 disabled:opacity-30`}
          >
            <RefreshCw className="w-4 h-4 animate-spin-slow" />
            <span>CUE GO</span>
          </button>
        ) : (
          <button
            id={`cue-set-${deckId}`}
            disabled={!state.track || !state.isPlaying}
            onClick={() => {
              // Set hot cue point
              state.cuePoint = audio.getPlaybackProgress(deckId, 16) * 16;
            }}
            className="flex flex-col items-center justify-center gap-0.5 h-14 bg-slate-800 hover:bg-slate-750 text-amber-500 border border-white/5 rounded-xl text-[11px] font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-30"
          >
            <Square className="w-4 h-4" />
            <span>SET CUE</span>
          </button>
        )}

        {/* SYNC Button (Neon Icy Blue active) */}
        <button
          onClick={() => {
            const oppositeDeck = deckId === "A" ? "B" : "A";
            onSync(deckId, oppositeDeck);
          }}
          disabled={!state.track}
          className={`flex flex-col items-center justify-center gap-0.5 h-14 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-100 border bg-slate-800 hover:bg-slate-750 text-cyan-400 border-white/5 active:scale-95 disabled:opacity-30`}
        >
          <RefreshCw className="w-4 h-4" />
          <span>SYNC</span>
        </button>
      </div>
    </div>
  );
};
