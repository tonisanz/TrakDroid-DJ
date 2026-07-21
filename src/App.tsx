/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Disc,
  Upload,
  FolderOpen,
  Music,
  Sliders,
  Activity,
  AlertCircle
} from "lucide-react";
import { Track, DeckState, DeckId } from "./types";
import { audio } from "./utils/audio";
import { Turntable } from "./components/Turntable";
import { Mixer } from "./components/Mixer";

// 5 high-fidelity procedural algorithmic preset tracks
const PRESET_LOOPS: Track[] = [
  {
    id: "loop-synthwave",
    title: "Retro Neon Drive",
    artist: "Procedural Synthwave",
    bpm: 110,
    genre: "Synthwave",
    color: "cyan",
    isProcedural: true,
  },
  {
    id: "loop-techno",
    title: "Resonant Squelch",
    artist: "Procedural Acid",
    bpm: 135,
    genre: "Acid Techno",
    color: "purple",
    isProcedural: true,
  },
  {
    id: "loop-house",
    title: "Deep Chord Bounce",
    artist: "Procedural House",
    bpm: 124,
    genre: "Club House",
    color: "pink",
    isProcedural: true,
  },
  {
    id: "loop-dnb",
    title: "Cyber Breakbeats",
    artist: "Procedural DnB",
    bpm: 172,
    genre: "Drum & Bass",
    color: "emerald",
    isProcedural: true,
  },
  {
    id: "loop-ambient",
    title: "Dream Ocean Pad",
    artist: "Procedural Ambient",
    bpm: 90,
    genre: "Dreamy Ambient",
    color: "amber",
    isProcedural: true,
  }
];

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  
  // Custom Loading Dialog Modal
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [targetDeck, setTargetDeck] = useState<DeckId | null>(null);

  // 4 Deck States Management (A, B, C, D)
  const [deckA, setDeckA] = useState<DeckState>({
    track: PRESET_LOOPS[0],
    isPlaying: false,
    volume: 0.8,
    playbackRate: 1.0,
    bpm: PRESET_LOOPS[0].bpm,
    pitchPercent: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterCutoff: 0,
    currentTime: 0,
    duration: 16,
    scratchPosition: 0,
    cuePoint: null,
  });

  const [deckB, setDeckB] = useState<DeckState>({
    track: PRESET_LOOPS[1],
    isPlaying: false,
    volume: 0.8,
    playbackRate: 1.0,
    bpm: PRESET_LOOPS[1].bpm,
    pitchPercent: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterCutoff: 0,
    currentTime: 0,
    duration: 16,
    scratchPosition: 0,
    cuePoint: null,
  });

  const [deckC, setDeckC] = useState<DeckState>({
    track: PRESET_LOOPS[2],
    isPlaying: false,
    volume: 0.6,
    playbackRate: 1.0,
    bpm: PRESET_LOOPS[2].bpm,
    pitchPercent: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterCutoff: 0,
    currentTime: 0,
    duration: 16,
    scratchPosition: 0,
    cuePoint: null,
  });

  const [deckD, setDeckD] = useState<DeckState>({
    track: PRESET_LOOPS[3],
    isPlaying: false,
    volume: 0.6,
    playbackRate: 1.0,
    bpm: PRESET_LOOPS[3].bpm,
    pitchPercent: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterCutoff: 0,
    currentTime: 0,
    duration: 16,
    scratchPosition: 0,
    cuePoint: null,
  });

  const [crossfader, setCrossfader] = useState(0); // Center -1 to 1
  const [tracksList, setTracksList] = useState<Track[]>(PRESET_LOOPS);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Web Audio pipeline on interaction
  const handleStartAudio = () => {
    audio.init();
    // Warm up decks with the default preloaded tracks in the audio engine
    audio.setVolume("A", deckA.volume);
    audio.setVolume("B", deckB.volume);
    audio.setVolume("C", deckC.volume);
    audio.setVolume("D", deckD.volume);
    audio.setCrossfader(crossfader);
    setHasStarted(true);
  };

  // Time progress ticker
  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      // Helper to update progress second values safely
      const updateTime = (deckId: DeckId, setDeck: React.Dispatch<React.SetStateAction<DeckState>>) => {
        setDeck(prev => {
          if (!prev.isPlaying || !prev.track) return prev;
          const prog = audio.getPlaybackProgress(deckId, prev.duration);
          return { ...prev, currentTime: prog * prev.duration };
        });
      };
      updateTime("A", setDeckA);
      updateTime("B", setDeckB);
      updateTime("C", setDeckC);
      updateTime("D", setDeckD);
    }, 250);
    return () => clearInterval(interval);
  }, [hasStarted]);

  // --- Deck Triggers and Syncs ---

  const handlePlayToggle = (deckId: DeckId) => {
    audio.init();
    const getDeckState = (id: DeckId) => {
      if (id === "A") return deckA;
      if (id === "B") return deckB;
      if (id === "C") return deckC;
      return deckD;
    };
    const getDeckSetter = (id: DeckId) => {
      if (id === "A") return setDeckA;
      if (id === "B") return setDeckB;
      if (id === "C") return setDeckC;
      return setDeckD;
    };

    const state = getDeckState(deckId);
    const setDeck = getDeckSetter(deckId);

    if (state.isPlaying) {
      audio.stopTrack(deckId);
      setDeck(prev => ({ ...prev, isPlaying: false }));
    } else {
      if (state.track) {
        audio.playTrack(deckId, state.track, state.currentTime);
        setDeck(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const handleVolumeChange = (deckId: DeckId, value: number) => {
    audio.setVolume(deckId, value);
    const getDeckSetter = (id: DeckId) => {
      if (id === "A") return setDeckA;
      if (id === "B") return setDeckB;
      if (id === "C") return setDeckC;
      return setDeckD;
    };
    getDeckSetter(deckId)(prev => ({ ...prev, volume: value }));
  };

  const handleEQChange = (deckId: DeckId, type: "low" | "mid" | "high", db: number) => {
    audio.setEQ(deckId, type, db);
    const getDeckSetter = (id: DeckId) => {
      if (id === "A") return setDeckA;
      if (id === "B") return setDeckB;
      if (id === "C") return setDeckC;
      return setDeckD;
    };
    getDeckSetter(deckId)((prev: any) => ({ ...prev, [`eq${type.charAt(0).toUpperCase() + type.slice(1)}`]: db }));
  };

  const handleFilterChange = (deckId: DeckId, value: number) => {
    audio.setFilter(deckId, value);
    const getDeckSetter = (id: DeckId) => {
      if (id === "A") return setDeckA;
      if (id === "B") return setDeckB;
      if (id === "C") return setDeckC;
      return setDeckD;
    };
    getDeckSetter(deckId)(prev => ({ ...prev, filterCutoff: value }));
  };

  const handlePitchChange = (deckId: DeckId, value: number) => {
    audio.setPitch(deckId, value);
    const getDeckState = (id: DeckId) => {
      if (id === "A") return deckA;
      if (id === "B") return deckB;
      if (id === "C") return deckC;
      return deckD;
    };
    const getDeckSetter = (id: DeckId) => {
      if (id === "A") return setDeckA;
      if (id === "B") return setDeckB;
      if (id === "C") return setDeckC;
      return setDeckD;
    };

    const state = getDeckState(deckId);
    const setDeck = getDeckSetter(deckId);

    if (state.track) {
      const activeBpm = state.track.bpm * (1.0 + value / 100);
      setDeck(prev => ({ ...prev, pitchPercent: value, playbackRate: 1.0 + value / 100, bpm: activeBpm }));
    }
  };

  const handleSync = (fromDeck: DeckId, toDeck: DeckId) => {
    const getDeckState = (id: DeckId) => {
      if (id === "A") return deckA;
      if (id === "B") return deckB;
      if (id === "C") return deckC;
      return deckD;
    };

    const fromState = getDeckState(fromDeck);
    const toState = getDeckState(toDeck);

    const targetBpm = toState.bpm;
    const fromTrackBpm = fromState.track?.bpm;
    
    if (!fromTrackBpm) return;

    // Calculate required pitch percent shift
    const pitchPercent = ((targetBpm / fromTrackBpm) - 1.0) * 100;
    handlePitchChange(fromDeck, pitchPercent);

    // Briefly re-trigger track to phase align beat markers
    if (fromState.isPlaying && fromState.track) {
      audio.playTrack(fromDeck, fromState.track, 0);
    }
  };

  const handleCrossfaderChange = (value: number) => {
    audio.setCrossfader(value);
    setCrossfader(value);
  };

  // --- Track Selection Popup Loader ---

  const openLoadModal = (deck: DeckId) => {
    setTargetDeck(deck);
    setIsLoadModalOpen(true);
  };

  const selectTrack = (track: Track) => {
    if (!targetDeck) return;
    audio.init();

    const getDeckSetter = (id: DeckId) => {
      if (id === "A") return setDeckA;
      if (id === "B") return setDeckB;
      if (id === "C") return setDeckC;
      return setDeckD;
    };
    const getDeckState = (id: DeckId) => {
      if (id === "A") return deckA;
      if (id === "B") return deckB;
      if (id === "C") return deckC;
      return deckD;
    };

    const setDeck = getDeckSetter(targetDeck);
    const currentState = getDeckState(targetDeck);

    // Stop previous track on target deck
    audio.stopTrack(targetDeck);

    setDeck({
      track,
      isPlaying: false,
      volume: currentState.volume,
      playbackRate: 1.0,
      bpm: track.bpm,
      pitchPercent: 0,
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      filterCutoff: 0,
      currentTime: 0,
      duration: track.isProcedural ? 16 : 120, // estimated duration
      scratchPosition: 0,
      cuePoint: null,
    });

    setIsLoadModalOpen(false);
    setTargetDeck(null);
  };

  // Device File Upload Decoder
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetDeck) return;

    const trackId = `user-track-${Date.now()}`;
    const newTrack: Track = {
      id: trackId,
      title: file.name.replace(/\.[^/.]+$/, ""), // Strip extension
      artist: "Archivo Local",
      bpm: 125, // default
      genre: "Custom Audio",
      color: targetDeck === "A" ? "cyan" : targetDeck === "B" ? "purple" : targetDeck === "C" ? "emerald" : "amber",
      isProcedural: false,
      file: file,
    };

    const estimatedBpm = await audio.loadUserFile(targetDeck, file, trackId);
    newTrack.bpm = estimatedBpm;

    setTracksList((prev) => [...prev, newTrack]);
    selectTrack(newTrack);
  };

  return (
    <div id="trakdroid-app" className="min-h-screen bg-black text-slate-300 flex flex-col font-sans select-none antialiased selection:bg-cyan-500/30">
      {/* Background glowing atmospheres */}
      <div className="absolute top-0 left-1/4 w-[50%] h-[350px] bg-cyan-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[50%] h-[350px] bg-fuchsia-500/5 blur-[120px] pointer-events-none" />

      {/* BEFORE START: Touch interaction splash screens required by browser Audio policies */}
      {!hasStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 max-w-md mx-auto">
          {/* Neon Logo Disc */}
          <div className="w-24 h-24 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.15)] mb-8 relative group">
            <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/20 animate-spin-slow" />
            <Disc className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          
          <h1 className="text-4xl font-black tracking-tighter text-white mb-3">
            TrakDroid PRO
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8 leading-relaxed max-w-sm">
            Professional 4-Deck DJ Mixing Suite & Live Performance Studio
          </p>
          <p className="text-slate-500 text-xs font-medium mb-8 leading-relaxed">
            Un estudio de DJ profesional y adaptativo con 4 cubiertas independientes, mezclador analógico completo, visualización de formas de onda completas y compatibilidad total con loops procedimentales y tus propios archivos de audio locales.
          </p>

          <button
            id="start-studio-btn"
            onClick={handleStartAudio}
            className="w-full h-16 rounded-xl bg-cyan-500 text-black font-black text-lg tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] active:scale-95 transition"
          >
            ENTRAR A TRAKDROID PRO
          </button>

          <div className="flex items-center gap-3.5 mt-8 bg-slate-900/40 border border-white/5 rounded-xl p-4 text-left">
            <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
              Este paso activa el motor de audio web. Para una experiencia real, asegúrate de desactivar el modo silencio de tu teléfono o tablet.
            </span>
          </div>
        </div>
      ) : (
        /* ACTIVE DJ DESK AND PLATFORM */
        <>
          {/* Header */}
          <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-6">
              <div className="text-cyan-400 font-black text-xl tracking-tighter">TrakDroid•PRO</div>
              
              {/* Digital rack BPM display for all 4 decks */}
              <div className="hidden xl:flex gap-3">
                <div className="px-2.5 py-1 rounded bg-slate-950 border border-white/5 flex flex-col items-center">
                  <span className="text-[7.5px] uppercase font-bold text-slate-500 tracking-wider">A BPM</span>
                  <span className="text-xs font-mono leading-none text-cyan-400 font-black">{deckA.bpm.toFixed(1)}</span>
                </div>
                <div className="px-2.5 py-1 rounded bg-slate-950 border border-white/5 flex flex-col items-center">
                  <span className="text-[7.5px] uppercase font-bold text-slate-500 tracking-wider">C BPM</span>
                  <span className="text-xs font-mono leading-none text-emerald-400 font-black">{deckC.bpm.toFixed(1)}</span>
                </div>
                <div className="px-2.5 py-1 rounded bg-slate-950 border border-white/5 flex flex-col items-center">
                  <span className="text-[7.5px] uppercase font-bold text-slate-500 tracking-wider">D BPM</span>
                  <span className="text-xs font-mono leading-none text-amber-400 font-black">{deckD.bpm.toFixed(1)}</span>
                </div>
                <div className="px-2.5 py-1 rounded bg-slate-950 border border-white/5 flex flex-col items-center">
                  <span className="text-[7.5px] uppercase font-bold text-slate-500 tracking-wider">B BPM</span>
                  <span className="text-xs font-mono leading-none text-fuchsia-400 font-black">{deckB.bpm.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-300">4-DECK AUDIO ACTIVE</span>
              </div>
              <div className="h-6 w-[1px] bg-white/10"></div>
              <button
                onClick={() => setHasStarted(false)}
                className="text-[9px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-400 hover:text-white px-3 py-1 rounded transition active:scale-95"
              >
                APAGAR
              </button>
            </div>
          </header>

          {/* HORIZONTAL FULL-SCREEN LAYOUT: DECK ROW + MIXER ROW */}
          <main className="flex-1 p-4 md:p-6 w-full mx-auto flex flex-col gap-6 z-10">
            {/* Row 1: The 4 Decks horizontally */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
              <Turntable
                deckId="A"
                state={deckA}
                onPlayToggle={() => handlePlayToggle("A")}
                onLoadTrackClick={() => openLoadModal("A")}
                onPitchChange={handlePitchChange}
                onSync={handleSync}
              />
              <Turntable
                deckId="C"
                state={deckC}
                onPlayToggle={() => handlePlayToggle("C")}
                onLoadTrackClick={() => openLoadModal("C")}
                onPitchChange={handlePitchChange}
                onSync={handleSync}
              />
              <Turntable
                deckId="D"
                state={deckD}
                onPlayToggle={() => handlePlayToggle("D")}
                onLoadTrackClick={() => openLoadModal("D")}
                onPitchChange={handlePitchChange}
                onSync={handleSync}
              />
              <Turntable
                deckId="B"
                state={deckB}
                onPlayToggle={() => handlePlayToggle("B")}
                onLoadTrackClick={() => openLoadModal("B")}
                onPitchChange={handlePitchChange}
                onSync={handleSync}
              />
            </div>

            {/* Row 2: Mixer Spanning Full Width underneath */}
            <div className="w-full">
              <Mixer
                stateA={deckA}
                stateB={deckB}
                stateC={deckC}
                stateD={deckD}
                crossfader={crossfader}
                onVolumeChange={handleVolumeChange}
                onEQChange={handleEQChange}
                onFilterChange={handleFilterChange}
                onCrossfaderChange={handleCrossfaderChange}
                onSync={handleSync}
              />
            </div>
          </main>
        </>
      )}

      {/* TRACK LOADER DIALOG DIALOG MODAL */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-950 border border-white/5 rounded-xl w-full max-w-md p-5 flex flex-col gap-4 shadow-2xl relative">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-1.5">
                <FolderOpen className="w-4 h-4 text-cyan-400" /> Cargar en Cubierta {targetDeck}
              </h3>
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="text-slate-400 hover:text-white font-black text-lg px-2 transition"
              >
                ×
              </button>
            </div>

            {/* List of High-Fidelity Synthesized loops */}
            <div className="flex flex-col gap-2">
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Procedural Sets (In-App)</span>
              <div className="flex flex-col gap-1.5 overflow-y-auto max-h-48 pr-1">
                {PRESET_LOOPS.map((track) => (
                  <button
                    key={track.id}
                    id={`select-track-${track.id}`}
                    onClick={() => selectTrack(track)}
                    className="flex justify-between items-center p-2.5 rounded bg-slate-900/40 hover:bg-slate-900 border border-white/5 hover:border-cyan-500/20 text-left transition-all"
                  >
                    <div>
                      <div className="text-white text-xs font-black leading-tight">{track.title}</div>
                      <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{track.genre}</div>
                    </div>
                    <div className="font-mono text-xs text-slate-400 font-bold">
                      {track.bpm} BPM
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Device File Upload */}
            <div className="border-t border-white/5 pt-3 flex flex-col gap-2">
              <span className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Cargar tu propia música (MP3/WAV/etc)</span>
              
              <button
                id="file-upload-trigger"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-3 bg-slate-900/40 hover:bg-slate-900 border border-dashed border-white/10 hover:border-fuchsia-500/20 rounded text-[10px] font-black uppercase tracking-wider text-slate-300 transition-all"
              >
                <Upload className="w-3.5 h-3.5 text-fuchsia-400" /> Seleccionar Archivo local
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
