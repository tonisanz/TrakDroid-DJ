/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import { Disc, Play, Square, Music, Activity, RefreshCw } from "lucide-react";
import { Track, DeckState, DeckId } from "../types";
import { audio } from "../utils/audio";

interface TurntableProps {
  deckId: DeckId;
  state: DeckState;
  onPlayToggle: () => void;
  onLoadTrackClick: () => void;
  onPitchChange: (deckId: DeckId, value: number) => void;
  onSync: (fromDeck: DeckId, toDeck: DeckId) => void;
}

export const Turntable: React.FC<TurntableProps> = ({
  deckId,
  state,
  onPlayToggle,
  onLoadTrackClick,
  onPitchChange,
  onSync,
}) => {
  const platterRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isScratching, setIsScratching] = useState(false);
  const scratchStartAngle = useRef(0);
  const currentScratchAngle = useRef(0);

  // Traktor Loop State
  const [loopSize, setLoopSize] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);

  // Smooth playhead progress tracker for entire track waveform
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animId: number;
    const updateProgress = () => {
      if (state.isPlaying && state.track) {
        const currentProg = audio.getPlaybackProgress(deckId, state.duration);
        setProgress(currentProg);
      }
      animId = requestAnimationFrame(updateProgress);
    };
    animId = requestAnimationFrame(updateProgress);
    return () => cancelAnimationFrame(animId);
  }, [deckId, state.isPlaying, state.track, state.duration]);

  // Rotation animation of the virtual platter disc
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

  // Real-time audio spectrum visualizer (glowing sound pillars)
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
        const multiplier = isLoopActive ? 1.3 : 1.0;
        barHeight = (dataArray[i] / 2.5) * multiplier;

        if (deckId === "A") {
          ctx.fillStyle = `rgb(6, ${Math.min(255, 140 + i * 3)}, ${Math.min(255, 230 + i * 0.8)})`;
        } else if (deckId === "B") {
          ctx.fillStyle = `rgb(${Math.min(255, 220 + i * 0.8)}, 40, ${Math.min(255, 140 + i * 3)})`;
        } else if (deckId === "C") {
          ctx.fillStyle = `rgb(16, ${Math.min(255, 160 + i * 2)}, ${Math.min(255, 100 + i * 4)})`;
        } else {
          ctx.fillStyle = `rgb(${Math.min(255, 240 + i * 0.5)}, ${Math.min(255, 140 + i * 2.5)}, 20)`;
        }
        
        ctx.fillRect(x, canvas.height / 2 - barHeight / 2, barWidth - 1, barHeight);
        x += barWidth;
      }
      visualId = requestAnimationFrame(renderWave);
    };

    renderWave();
    return () => cancelAnimationFrame(visualId);
  }, [deckId, state.isPlaying, isLoopActive]);

  // Entire track static waveform renderer with real-time sweep playhead
  useEffect(() => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!state.track) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
      ctx.font = "9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("LOAD TRACK FOR WAVEFORM", canvas.width / 2, canvas.height / 2 + 3);
      return;
    }

    const peaks = audio.getWaveformData(state.track);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const barWidth = canvas.width / peaks.length;

    for (let i = 0; i < peaks.length; i++) {
      const peak = peaks[i];
      const height = Math.max(2, peak * canvas.height * 0.85);
      const x = i * barWidth;
      const y = (canvas.height - height) / 2;

      // Color based on playhead position
      const isPlayed = (i / peaks.length) <= progress;

      if (deckId === "A") {
        ctx.fillStyle = isPlayed ? "rgba(34, 211, 238, 0.9)" : "rgba(34, 211, 238, 0.2)";
      } else if (deckId === "B") {
        ctx.fillStyle = isPlayed ? "rgba(217, 70, 239, 0.9)" : "rgba(217, 70, 239, 0.2)";
      } else if (deckId === "C") {
        ctx.fillStyle = isPlayed ? "rgba(16, 185, 129, 0.9)" : "rgba(16, 185, 129, 0.2)";
      } else {
        ctx.fillStyle = isPlayed ? "rgba(245, 158, 11, 0.9)" : "rgba(245, 158, 11, 0.2)";
      }

      ctx.fillRect(x, y, barWidth - 1, height);
    }

    // Draw the glowing playhead vertical slider line
    const playheadX = progress * canvas.width;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, canvas.height);
    ctx.stroke();

    // Draw a small playhead dot on top
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(playheadX, 3, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }, [state.track, progress, deckId]);

  // Click on the full-track waveform to seek (interactive navigation)
  const handleWaveformClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!state.track || !state.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    const seekTime = percent * state.duration;

    audio.playTrack(deckId, state.track, seekTime);
    setProgress(percent);
  };

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

  // Nudge adjustment simulation (Pitch bend)
  const handleNudge = (direction: "up" | "down") => {
    const amount = direction === "up" ? 1.5 : -1.5;
    onPitchChange(deckId, state.pitchPercent + amount);
    setTimeout(() => {
      onPitchChange(deckId, state.pitchPercent);
    }, 150);
  };

  // Traktor Loop beat size toggler
  const handleSetLoop = (size: number) => {
    if (loopSize === size && isLoopActive) {
      setIsLoopActive(false);
      setLoopSize(null);
    } else {
      setLoopSize(size);
      setIsLoopActive(true);
    }
  };

  const handleModifyLoop = (action: "halve" | "double") => {
    if (!loopSize) return;
    let nextSize = action === "halve" ? loopSize / 2 : loopSize * 2;
    nextSize = Math.max(0.5, Math.min(32, nextSize));
    setLoopSize(nextSize);
    setIsLoopActive(true);
  };

  const beatsPerSecond = state.bpm / 60;
  const currentBeat = Math.floor((state.currentTime * beatsPerSecond)) % 4;

  const deckColors: Record<DeckId, { border: string; glow: string; text: string; bg: string }> = {
    A: { border: "border-cyan-500/20", glow: "shadow-[0_0_15px_rgba(6,182,212,0.2)]", text: "text-cyan-400", bg: "bg-cyan-500/10" },
    B: { border: "border-fuchsia-500/20", glow: "shadow-[0_0_15px_rgba(217,70,239,0.2)]", text: "text-fuchsia-400", bg: "bg-fuchsia-500/10" },
    C: { border: "border-emerald-500/20", glow: "shadow-[0_0_15px_rgba(16,185,129,0.2)]", text: "text-emerald-400", bg: "bg-emerald-500/10" },
    D: { border: "border-amber-500/20", glow: "shadow-[0_0_15px_rgba(245,158,11,0.2)]", text: "text-amber-400", bg: "bg-amber-500/10" },
  };

  const currentTheme = deckColors[deckId];
  const platterGlow = state.isPlaying ? `0 0 25px ${deckId === "A" ? "rgba(6,182,212,0.15)" : deckId === "B" ? "rgba(217,70,239,0.15)" : deckId === "C" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)"}` : "none";

  return (
    <div
      id={`deck-${deckId}`}
      className="bg-slate-950/90 border border-white/5 rounded-xl p-3 flex flex-col gap-3.5 relative overflow-hidden shadow-xl"
    >
      {/* Symmetrical Top Header */}
      <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${currentTheme.bg} ${currentTheme.text} border ${currentTheme.border}`}>
            DECK {deckId}
          </span>
          <div className="flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full ${state.isPlaying ? "bg-emerald-500 animate-pulse" : "bg-slate-700"}`} />
            <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">
              {state.track?.isProcedural ? "ALG" : state.track ? "FILE" : "EMPTY"}
            </span>
          </div>
        </div>

        {/* Digital display screen */}
        <div className="bg-black/90 border border-white/5 rounded px-2 py-0.5 flex items-center gap-2.5">
          <div className="text-right">
            <span className="text-white font-mono text-[10px] font-black">
              {state.track ? `${state.bpm.toFixed(1)}` : "0.0"}
            </span>
            <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider block leading-none">BPM</span>
          </div>
          <div className="w-px h-4 bg-white/5" />
          <div className="text-right">
            <span className={`text-[10px] font-black font-mono leading-none ${state.pitchPercent === 0 ? "text-slate-500" : state.pitchPercent > 0 ? "text-cyan-400" : "text-fuchsia-400"}`}>
              {state.pitchPercent > 0 ? "+" : ""}{state.pitchPercent.toFixed(1)}%
            </span>
            <span className="text-[7px] text-slate-500 font-bold uppercase tracking-wider block leading-none">PITCH</span>
          </div>
        </div>
      </div>

      {/* Track info bar */}
      <div className="bg-slate-900/40 border border-white/5 rounded-lg px-2.5 py-1.5 flex items-center justify-between min-h-[44px] relative z-10">
        {state.track ? (
          <div className="flex items-center gap-2 overflow-hidden w-full">
            <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${currentTheme.bg} ${currentTheme.text}`}>
              <Music className="w-3.5 h-3.5" />
            </div>
            <div className="overflow-hidden leading-tight">
              <div className="text-white font-black text-[11px] truncate">{state.track.title}</div>
              <div className="text-slate-500 text-[8px] font-bold uppercase tracking-wider truncate mt-0.5">{state.track.artist}</div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            <Music className="w-3 h-3" /> No Track Loaded
          </div>
        )}

        <button
          id={`load-btn-${deckId}`}
          onClick={onLoadTrackClick}
          className="text-[9px] font-black uppercase tracking-widest bg-slate-800 hover:bg-slate-750 text-white px-2 py-1 rounded border border-white/10 transition active:scale-95 shrink-0 ml-2"
        >
          LOAD
        </button>
      </div>

      {/* Main hardware visual: Platter disc and Pitch slider side-by-side */}
      <div className="flex gap-3 items-center justify-between relative z-10">
        {/* Virtual Rotating Platter */}
        <div className="flex-1 flex flex-col items-center justify-center relative">
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
              boxShadow: platterGlow,
              touchAction: "none",
            }}
            className={`w-28 h-28 rounded-full bg-slate-950 border-2 ${deckId === "A" ? "border-cyan-500/10" : deckId === "B" ? "border-fuchsia-500/10" : deckId === "C" ? "border-emerald-500/10" : "border-amber-500/10"} flex items-center justify-center relative cursor-grab active:cursor-grabbing transition-shadow duration-300 shadow-[inset_0_0_10px_rgba(0,0,0,0.9)]`}
          >
            {/* position line */}
            <div className={`absolute w-1 h-1/2 ${currentTheme.text} bg-current top-0 origin-bottom`} style={{ opacity: state.isPlaying ? 0.75 : 0.15 }} />
            {/* center Label */}
            <div className={`w-8 h-8 rounded-full bg-slate-900 border ${currentTheme.text} border-current flex items-center justify-center shadow-inner relative overflow-hidden`}>
              <Disc className="w-4 h-4 opacity-80" />
            </div>
          </div>

          {isScratching && (
            <div className="absolute bottom-1 bg-cyan-400 text-black text-[8px] font-black px-1.5 py-0.5 rounded shadow">
              SCRATCH
            </div>
          )}
        </div>

        {/* Pitch Slider */}
        <div className="w-9 bg-slate-900/20 border border-white/5 rounded-lg p-1.5 flex flex-col items-center justify-between h-28">
          <button
            onClick={() => handleNudge("up")}
            disabled={!state.track}
            className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center font-black text-[9px] text-slate-300 transition active:scale-95 disabled:opacity-30"
          >
            +
          </button>
          <div className="flex-1 flex justify-center items-center py-1 relative">
            <input
              type="range"
              min="-12"
              max="12"
              step="0.1"
              value={state.pitchPercent}
              onChange={(e) => onPitchChange(deckId, parseFloat(e.target.value))}
              disabled={!state.track}
              style={{
                writingMode: "bt-lr",
                WebkitAppearance: "slider-vertical",
              }}
              className="h-14 w-2 bg-slate-950 rounded cursor-pointer accent-cyan-400 appearance-none disabled:opacity-30"
            />
          </div>
          <button
            onClick={() => handleNudge("down")}
            disabled={!state.track}
            className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded flex items-center justify-center font-black text-[9px] text-slate-300 transition active:scale-95 disabled:opacity-30"
          >
            -
          </button>
        </div>
      </div>

      {/* FULL TRACK INTERACTIVE WAVEFORM (Click to Seek) */}
      <div className="bg-slate-950 border border-white/5 rounded-lg p-2 flex flex-col gap-1 relative z-10">
        <div className="flex justify-between items-center text-[8px] text-slate-500 font-black uppercase tracking-wider px-0.5">
          <span className="flex items-center gap-1">
            <Activity className={`w-3 h-3 ${currentTheme.text}`} /> FULL TRACK WAVEFORM (CLICK TO SEEK)
          </span>
          {isLoopActive && (
            <span className="text-amber-500 font-bold animate-pulse">LOOP: {loopSize}B</span>
          )}
        </div>
        <div 
          onClick={handleWaveformClick}
          className="cursor-pointer relative overflow-hidden bg-black rounded"
        >
          <canvas
            ref={waveformCanvasRef}
            width={260}
            height={30}
            className="w-full h-8 block"
          />
        </div>
      </div>

      {/* Mini real-time spectrum and Loop section */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="bg-slate-950 border border-white/5 rounded-lg p-1.5 flex flex-col justify-center gap-1">
          <div className="text-[7px] text-slate-500 font-bold uppercase tracking-wider">Live Spectrum</div>
          <canvas
            ref={canvasRef}
            width={120}
            height={16}
            className="w-full h-4 rounded bg-black/80"
          />
        </div>

        <div className="bg-slate-900/30 border border-white/5 rounded-lg p-1.5 flex flex-col justify-between">
          <div className="flex justify-between items-center text-[7px] text-slate-500 font-bold uppercase tracking-wider">
            <span>Traktor Loop</span>
            <div className="flex gap-1">
              <button
                onClick={() => handleModifyLoop("halve")}
                disabled={!isLoopActive}
                className="text-[7px] bg-slate-800 text-slate-300 px-1 rounded hover:bg-slate-700 transition disabled:opacity-30"
              >
                /2
              </button>
              <button
                onClick={() => handleModifyLoop("double")}
                disabled={!isLoopActive}
                className="text-[7px] bg-slate-800 text-slate-300 px-1 rounded hover:bg-slate-700 transition disabled:opacity-30"
              >
                x2
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1">
            {[2, 4, 8, 16].map((size) => {
              const isActive = loopSize === size && isLoopActive;
              return (
                <button
                  key={size}
                  onClick={() => handleSetLoop(size)}
                  disabled={!state.track}
                  className={`py-0.5 text-[8px] font-black rounded transition-all border ${
                    isActive
                      ? "bg-amber-500 text-black border-amber-400"
                      : "bg-slate-950 text-slate-400 border-white/5"
                  } disabled:opacity-30`}
                >
                  {size}B
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Action buttons: PLAY, SET CUE, SYNC */}
      <div className="grid grid-cols-3 gap-1.5 mt-0.5 relative z-10">
        <button
          id={`play-toggle-${deckId}`}
          onClick={onPlayToggle}
          disabled={!state.track}
          className={`flex flex-col items-center justify-center h-10 rounded-lg font-black text-[9px] uppercase tracking-wider transition-all border ${
            state.isPlaying
              ? "bg-emerald-500 text-black border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
              : "bg-slate-800 hover:bg-slate-750 text-emerald-400 border-white/5"
          } disabled:opacity-30 active:scale-95`}
        >
          <Play className="w-3 h-3 fill-current mb-0.5" />
          <span>PLAY</span>
        </button>

        {state.cuePoint !== null ? (
          <button
            disabled={!state.track}
            onClick={() => {
              if (state.track) {
                audio.playTrack(deckId, state.track, state.cuePoint || 0);
              }
            }}
            className="flex flex-col items-center justify-center h-10 rounded-lg font-black text-[9px] uppercase tracking-wider bg-amber-500 text-black border border-amber-400 active:scale-95"
          >
            <RefreshCw className="w-3 h-3 mb-0.5" />
            <span>CUE GO</span>
          </button>
        ) : (
          <button
            disabled={!state.track || !state.isPlaying}
            onClick={() => {
              state.cuePoint = audio.getPlaybackProgress(deckId, state.duration) * state.duration;
            }}
            className="flex flex-col items-center justify-center h-10 bg-slate-800 text-amber-500 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-wider active:scale-95 disabled:opacity-30"
          >
            <Square className="w-3 h-3 mb-0.5" />
            <span>SET CUE</span>
          </button>
        )}

        <button
          onClick={() => {
            const oppositeDeck: DeckId = deckId === "A" ? "B" : deckId === "B" ? "A" : deckId === "C" ? "D" : "C";
            onSync(deckId, oppositeDeck);
          }}
          disabled={!state.track}
          className="flex flex-col items-center justify-center h-10 rounded-lg font-black text-[9px] uppercase tracking-wider bg-slate-800 text-cyan-400 border border-white/5 active:scale-95 disabled:opacity-30"
        >
          <RefreshCw className="w-3 h-3 mb-0.5" />
          <span>SYNC</span>
        </button>
      </div>
    </div>
  );
};
