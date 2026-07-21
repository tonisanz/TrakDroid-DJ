/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import {
  Disc,
  Upload,
  Volume2,
  Sparkles,
  Sliders,
  HelpCircle,
  FolderOpen,
  Music,
  Activity,
  Plus,
  Compass,
  AlertCircle
} from "lucide-react";
import { Track, DeckState } from "./types";
import { audio } from "./utils/audio";
import { Turntable } from "./components/Turntable";
import { Mixer } from "./components/Mixer";
import { SoundPad } from "./components/SoundPad";
import { AiCoach } from "./components/AiCoach";

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
  const [activeTab, setActiveTab] = useState<"decks" | "mixer" | "ai" | "soundpads">("decks");
  
  // Custom Loading Dialog Modal
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [targetDeck, setTargetDeck] = useState<"A" | "B" | null>(null);

  // Deck State Management
  const [deckA, setDeckA] = useState<DeckState>({
    track: PRESET_LOOPS[0], // Preloaded Default
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
    duration: 16, // Loop duration
    scratchPosition: 0,
    cuePoint: null,
  });

  const [deckB, setDeckB] = useState<DeckState>({
    track: PRESET_LOOPS[1], // Preloaded Default
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

  const [crossfader, setCrossfader] = useState(0); // Center -1 to 1
  const [activeSamples, setActiveSamples] = useState<string[]>([]);
  const [tracksList, setTracksList] = useState<Track[]>(PRESET_LOOPS);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Web Audio pipeline on interaction
  const handleStartAudio = () => {
    audio.init();
    // Warm up decks with the default preloaded tracks in the audio engine
    if (deckA.track) audio.setVolume("A", deckA.volume);
    if (deckB.track) audio.setVolume("B", deckB.volume);
    audio.setCrossfader(crossfader);
    setHasStarted(true);
  };

  // --- Deck Triggers and Syncs ---

  const handlePlayToggle = (deckId: "A" | "B") => {
    audio.init();
    const isA = deckId === "A";
    const state = isA ? deckA : deckB;
    const setState = isA ? setDeckA : setDeckB;

    if (state.isPlaying) {
      audio.stopTrack(deckId);
      setState(prev => ({ ...prev, isPlaying: false }));
    } else {
      if (state.track) {
        audio.playTrack(deckId, state.track, state.currentTime);
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    }
  };

  const handleVolumeChange = (deckId: "A" | "B", value: number) => {
    audio.setVolume(deckId, value);
    if (deckId === "A") {
      setDeckA(prev => ({ ...prev, volume: value }));
    } else {
      setDeckB(prev => ({ ...prev, volume: value }));
    }
  };

  const handleEQChange = (deckId: "A" | "B", type: "low" | "mid" | "high", db: number) => {
    audio.setEQ(deckId, type, db);
    const setState = deckId === "A" ? setDeckA : setDeckB;
    setState((prev: any) => ({ ...prev, [`eq${type.charAt(0).toUpperCase() + type.slice(1)}`]: db }));
  };

  const handleFilterChange = (deckId: "A" | "B", value: number) => {
    audio.setFilter(deckId, value);
    const setState = deckId === "A" ? setDeckA : setDeckB;
    setState(prev => ({ ...prev, filterCutoff: value }));
  };

  const handlePitchChange = (deckId: "A" | "B", value: number) => {
    audio.setPitch(deckId, value);
    const isA = deckId === "A";
    const state = isA ? deckA : deckB;
    const setState = isA ? setDeckA : setDeckB;

    if (state.track) {
      const activeBpm = state.track.bpm * (1.0 + value / 100);
      setState(prev => ({ ...prev, pitchPercent: value, playbackRate: 1.0 + value / 100, bpm: activeBpm }));
    }
  };

  const handleSync = (fromDeck: "A" | "B", toDeck: "A" | "B") => {
    // Aligns 'fromDeck' speed directly to match the 'toDeck' BPM!
    const targetBpm = toDeck === "A" ? deckA.bpm : deckB.bpm;
    const fromTrackBpm = fromDeck === "A" ? deckA.track?.bpm : deckB.track?.bpm;
    
    if (!fromTrackBpm) return;

    // Calculate required pitch percent shift
    const pitchPercent = ((targetBpm / fromTrackBpm) - 1.0) * 100;
    handlePitchChange(fromDeck, pitchPercent);

    // Briefly re-trigger track to phase align beat markers
    const fromState = fromDeck === "A" ? deckA : deckB;
    if (fromState.isPlaying && fromState.track) {
      audio.playTrack(fromDeck, fromState.track, 0);
    }
  };

  const handleCrossfaderChange = (value: number) => {
    audio.setCrossfader(value);
    setCrossfader(value);
  };

  // --- Track Selection Popup Loader ---

  const openLoadModal = (deck: "A" | "B") => {
    setTargetDeck(deck);
    setIsLoadModalOpen(true);
  };

  const selectTrack = (track: Track) => {
    if (!targetDeck) return;
    audio.init();

    const isA = targetDeck === "A";
    const setState = isA ? setDeckA : setDeckB;
    const oppositeState = isA ? deckB : deckA;

    // Stop previous track on target deck
    audio.stopTrack(targetDeck);

    setState({
      track,
      isPlaying: false,
      volume: isA ? deckA.volume : deckB.volume,
      playbackRate: 1.0,
      bpm: track.bpm,
      pitchPercent: 0,
      eqLow: 0,
      eqMid: 0,
      eqHigh: 0,
      filterCutoff: 0,
      currentTime: 0,
      duration: track.isProcedural ? 16 : 120, // estimated duration for files
      scratchPosition: 0,
      cuePoint: null,
    });

    setIsLoadModalOpen(false);
    setTargetDeck(null);
  };

  // Custom File Uploader decoder
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetDeck) return;

    const trackId = `user-track-${Date.now()}`;
    const newTrack: Track = {
      id: trackId,
      title: file.name.replace(/\.[^/.]+$/, ""), // Strip extension
      artist: "Archivo Local",
      bpm: 125, // default starting tempo for custom files
      genre: "Custom Audio",
      color: targetDeck === "A" ? "cyan" : "purple",
      isProcedural: false,
      file: file,
    };

    // Decode file buffer in Web Audio API engine
    const estimatedBpm = await audio.loadUserFile(targetDeck, file, trackId);
    newTrack.bpm = estimatedBpm;

    // Add to lists and select it
    setTracksList((prev) => [...prev, newTrack]);
    selectTrack(newTrack);
  };

  // --- AI Suggested track loaded from AiCoach ---
  const handleLoadSuggestedTrack = (suggestedTrack: Track, deckId: "A" | "B") => {
    setTargetDeck(deckId);
    selectTrack(suggestedTrack);
  };

  return (
    <div id="mobodj-app" className="min-h-screen bg-black text-slate-300 flex flex-col font-sans select-none antialiased selection:bg-cyan-500/30">
      {/* Background glowing atmosphere */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* BEFORE START: Touch interaction splash screens required by browser Audio policies */}
      {!hasStarted ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center relative z-10 max-w-md mx-auto">
          {/* Neon Logo Disc */}
          <div className="w-24 h-24 rounded-full bg-slate-950 border border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.15)] mb-8 relative group">
            <div className="absolute inset-2 rounded-full border border-dashed border-cyan-500/20 animate-spin-slow" />
            <Disc className="w-10 h-10 text-cyan-400 animate-pulse" />
          </div>
          
          <h1 className="text-4xl font-black tracking-tighter text-white mb-3">
            TRAKTOR•DJ
          </h1>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-8 leading-relaxed max-w-sm">
            Interactive AI DJ Studio & Pro Performance Mixing Suite
          </p>
          <p className="text-slate-500 text-xs font-medium mb-8 leading-relaxed">
            Un estudio de DJ profesional y adaptativo con tornamesas, mezcladores analógicos, soundpads con efectos en tiempo real y tu propio AI Co-Host que funciona directo en tu navegador y en Android.
          </p>

          <button
            id="start-studio-btn"
            onClick={handleStartAudio}
            className="w-full h-16 rounded-xl bg-cyan-500 text-black font-black text-lg tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.3)] hover:bg-cyan-400 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] active:scale-95 transition"
          >
            ENTRAR AL ESTUDIO
          </button>

          <div className="flex items-center gap-3.5 mt-8 bg-slate-900/40 border border-white/5 rounded-xl p-4 text-left">
            <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0" />
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-relaxed">
              Este paso activa el motor de audio web. Para una experiencia real, asegúrate de desactivar el modo silencio de tu teléfono.
            </span>
          </div>
        </div>
      ) : (
        /* ACTIVE DJ DESK AND PLATFORM */
        <>
          {/* Header */}
          <header className="border-b border-white/5 bg-slate-900/40 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-6">
              <div className="text-cyan-400 font-black text-xl tracking-tighter">TRAKTOR•DJ</div>
              
              {/* BPM displays styled as mini digital racks */}
              <div className="hidden sm:flex gap-3">
                <div className="px-3 py-1 rounded bg-slate-950 border border-white/5 flex flex-col items-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Deck A BPM</span>
                  <span className="text-sm font-mono leading-none text-cyan-400 font-black">{deckA.bpm.toFixed(1)}</span>
                </div>
                <div className="px-3 py-1 rounded bg-slate-950 border border-white/5 flex flex-col items-center">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Deck B BPM</span>
                  <span className="text-sm font-mono leading-none text-fuchsia-400 font-black">{deckB.bpm.toFixed(1)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]"></div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Live Engine</span>
              </div>
              <div className="h-6 w-[1px] bg-white/10"></div>
              {/* Info / Reset trigger */}
              <button
                onClick={() => setHasStarted(false)}
                className="text-[10px] font-black uppercase tracking-wider bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-400 hover:text-white px-3.5 py-1.5 rounded transition active:scale-95"
              >
                Apagar Motor
              </button>
            </div>
          </header>

          {/* DESKTOP RESPONSIVE LAYOUT (Grid) vs MOBILE LAYOUT (Tab-bar navigation with touch safe zones) */}
          <main className="flex-1 p-3 md:p-6 max-w-7xl w-full mx-auto flex flex-col gap-5 z-10 pb-20 md:pb-6">
            
            {/* Desktop-only view: multi-pane bento dashboard */}
            <div className="hidden lg:grid grid-cols-12 gap-5 items-stretch">
              {/* Left Side: Turntables and Mixer, Soundpads */}
              <div className="col-span-8 flex flex-col gap-5">
                {/* Turntables Left & Right */}
                <div className="grid grid-cols-2 gap-5">
                  <Turntable
                    deckId="A"
                    state={deckA}
                    onPlayToggle={() => handlePlayToggle("A")}
                    onLoadTrackClick={() => openLoadModal("A")}
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

                {/* Mixer Console and Soundpads */}
                <div className="grid grid-cols-1 gap-5">
                  <Mixer
                    stateA={deckA}
                    stateB={deckB}
                    crossfader={crossfader}
                    onVolumeChange={handleVolumeChange}
                    onEQChange={handleEQChange}
                    onFilterChange={handleFilterChange}
                    onPitchChange={handlePitchChange}
                    onCrossfaderChange={handleCrossfaderChange}
                    onSync={handleSync}
                  />
                  <SoundPad
                    onSampleTriggered={(name) => {
                      setActiveSamples((prev) => [...prev, name].slice(-3));
                    }}
                  />
                </div>
              </div>

              {/* Right Side: AI Assistant Panel */}
              <div className="col-span-4 h-full">
                <AiCoach
                  stateA={deckA}
                  stateB={deckB}
                  crossfader={crossfader}
                  activeSamples={activeSamples}
                  onLoadSuggestedTrack={handleLoadSuggestedTrack}
                />
              </div>
            </div>

            {/* Mobile / Android-optimized views: Dynamic tab navigation with huge touch-safe triggers */}
            <div className="block lg:hidden flex-1 flex flex-col justify-between">
              
              {/* Tab 1: Decks panel */}
              {activeTab === "decks" && (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Turntable
                      deckId="A"
                      state={deckA}
                      onPlayToggle={() => handlePlayToggle("A")}
                      onLoadTrackClick={() => openLoadModal("A")}
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
                </div>
              )}

              {/* Tab 2: Mixer panel */}
              {activeTab === "mixer" && (
                <Mixer
                  stateA={deckA}
                  stateB={deckB}
                  crossfader={crossfader}
                  onVolumeChange={handleVolumeChange}
                  onEQChange={handleEQChange}
                  onFilterChange={handleFilterChange}
                  onPitchChange={handlePitchChange}
                  onCrossfaderChange={handleCrossfaderChange}
                  onSync={handleSync}
                />
              )}

              {/* Tab 3: AI Assistant panel */}
              {activeTab === "ai" && (
                <AiCoach
                  stateA={deckA}
                  stateB={deckB}
                  crossfader={crossfader}
                  activeSamples={activeSamples}
                  onLoadSuggestedTrack={handleLoadSuggestedTrack}
                />
              )}

              {/* Tab 4: Soundboard buttons */}
              {activeTab === "soundpads" && (
                <SoundPad
                  onSampleTriggered={(name) => {
                    setActiveSamples((prev) => [...prev, name].slice(-3));
                  }}
                />
              )}

              {/* Bottom Mobile Tab Bar (Height = 64px, safe tap zones) */}
              <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/95 border-t border-white/5 px-2 py-3 flex justify-around items-center z-30 backdrop-blur-md">
                <button
                  onClick={() => setActiveTab("decks")}
                  className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${activeTab === "decks" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-500 border border-transparent hover:text-slate-300"}`}
                >
                  <Disc className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-wider mt-1.5">Cubiertas</span>
                </button>

                <button
                  onClick={() => setActiveTab("mixer")}
                  className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${activeTab === "mixer" ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" : "text-slate-500 border border-transparent hover:text-slate-300"}`}
                >
                  <Sliders className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-wider mt-1.5">Mezclador</span>
                </button>

                <button
                  onClick={() => setActiveTab("ai")}
                  className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${activeTab === "ai" ? "bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20" : "text-slate-500 border border-transparent hover:text-slate-300"}`}
                >
                  <Sparkles className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-wider mt-1.5">AI Coach</span>
                </button>

                <button
                  onClick={() => setActiveTab("soundpads")}
                  className={`flex flex-col items-center justify-center py-2 px-4 rounded-xl transition-all ${activeTab === "soundpads" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "text-slate-500 border border-transparent hover:text-slate-300"}`}
                >
                  <Volume2 className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-wider mt-1.5">Soundpad</span>
                </button>
              </nav>
            </div>
          </main>
        </>
      )}

      {/* TRACK LOADER DIALOG DIALOG MODAL (Saves precious layout space) */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-white/5 rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative z-10 animate-fade-in animate-duration-150">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-white/5 pb-3.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-white flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-cyan-400" /> Cargar Track en Cubierta {targetDeck}
              </h3>
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="text-slate-400 hover:text-white font-black text-lg px-2 transition"
              >
                ×
              </button>
            </div>

            {/* List of High-Fidelity Synthesized loops */}
            <div className="flex flex-col gap-3">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Sets Algorítmicos Incorporados</span>
              <div className="flex flex-col gap-2 overflow-y-auto max-h-56 pr-1">
                {PRESET_LOOPS.map((track) => (
                  <button
                    key={track.id}
                    id={`select-track-${track.id}`}
                    onClick={() => selectTrack(track)}
                    className="flex justify-between items-center p-3 rounded-xl bg-slate-900/60 hover:bg-slate-900 border border-white/5 hover:border-cyan-500/30 text-left transition-all"
                  >
                    <div>
                      <div className="text-white text-xs font-black">{track.title}</div>
                      <div className="text-[10px] text-slate-500 font-extrabold mt-0.5 uppercase tracking-wide">{track.genre}</div>
                    </div>
                    <div className="text-right font-mono text-xs text-slate-400 font-bold shrink-0">
                      {track.bpm} BPM
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Android / Device File Upload */}
            <div className="border-t border-white/5 pt-4 flex flex-col gap-3">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Cargar tu propia música (MP3/WAV)</span>
              
              <button
                id="file-upload-trigger"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3.5 bg-slate-900/40 hover:bg-slate-900 border border-dashed border-white/10 hover:border-fuchsia-500/30 rounded-xl cursor-pointer text-xs font-black uppercase tracking-wider text-slate-300 transition-all"
              >
                <Upload className="w-4 h-4 text-fuchsia-400" /> Seleccionar archivo de tu dispositivo
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
