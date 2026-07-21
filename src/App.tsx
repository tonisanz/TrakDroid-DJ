/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Disc, AlertCircle, Play } from "lucide-react";
import { Track, DeckState, DeckId } from "./types";
import { audio } from "./utils/audio";
import { TraktorHeader } from "./components/TraktorHeader";
import { TraktorDeck } from "./components/TraktorDeck";
import { TraktorMixer } from "./components/TraktorMixer";
import { TraktorBrowser } from "./components/TraktorBrowser";

// Traktor Pro 4 Preset Track Collection
const PRESET_TRACKS: Track[] = [
  {
    id: "tr-in-dub",
    title: "In Dub",
    artist: "Bumpin Flava",
    bpm: 128.0,
    key: "7m",
    rating: 5,
    genre: "Acid Techno",
    color: "cyan",
    isProcedural: true,
  },
  {
    id: "tr-cooking-swings",
    title: "Cooking Swings",
    artist: "Drum State",
    bpm: 128.0,
    key: "10m",
    rating: 5,
    genre: "Club House",
    color: "amber",
    isProcedural: true,
  },
  {
    id: "tr-internal-logic",
    title: "Internal Logic",
    artist: "Mother Board",
    bpm: 128.0,
    key: "6m",
    rating: 4,
    genre: "Synthwave",
    color: "purple",
    isProcedural: true,
  },
  {
    id: "tr-fade-away",
    title: "Fade Away (Cory G Remix)",
    artist: "Gabriel Montufar ft. Nicole Torres",
    bpm: 128.0,
    key: "9d",
    rating: 5,
    genre: "Deep House Stems",
    color: "emerald",
    isProcedural: true,
  },
  {
    id: "tr-bumpy",
    title: "Bumpy",
    artist: "Bumpin Flava",
    bpm: 136.0,
    key: "7m",
    rating: 5,
    genre: "Tech House",
    color: "cyan",
    isProcedural: true,
  },
  {
    id: "tr-a-wee-dub",
    title: "A Wee Dub",
    artist: "Bumpin Flava",
    bpm: 135.0,
    key: "10m",
    rating: 4,
    genre: "Dub Techno",
    color: "amber",
    isProcedural: true,
  },
  {
    id: "tr-diafonie",
    title: "Diafonie",
    artist: "Higher Place",
    bpm: 126.0,
    key: "6m",
    rating: 5,
    genre: "Progressive",
    color: "purple",
    isProcedural: true,
  },
  {
    id: "tr-born-under",
    title: "Born Under",
    artist: "Lunar Echoes",
    bpm: 127.0,
    key: "8m",
    rating: 4,
    genre: "Drum & Bass",
    color: "emerald",
    isProcedural: true,
  }
];

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [masterBpm, setMasterBpm] = useState(128.0);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [quantize, setQuantize] = useState(true);
  const [snap, setSnap] = useState(true);
  const [crossfader, setCrossfader] = useState(0);

  const [tracksList, setTracksList] = useState<Track[]>(PRESET_TRACKS);

  // Initial Deck States
  const createDefaultDeck = (track: Track, id: DeckId): DeckState => ({
    track,
    isPlaying: false,
    isSync: true,
    isMaster: id === "A",
    isFlux: false,
    isReverse: false,
    volume: 0.8,
    playbackRate: 1.0,
    bpm: track.bpm,
    pitchPercent: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterCutoff: 0,
    currentTime: 0,
    duration: 120,
    cuePoint: 0,
    hotcues: [0, 16, 32, 64],
    loopSize: 4,
    isLoopActive: false,
    fx1Send: false,
    fx2Send: false,
    keyLock: true,
    headphoneCue: false,
    stems: { drums: 0.9, bass: 0.9, other: 0.8, vocals: 0.85 },
    isStemDeck: id === "D",
  });

  const [deckA, setDeckA] = useState<DeckState>(createDefaultDeck(PRESET_TRACKS[0], "A"));
  const [deckB, setDeckB] = useState<DeckState>(createDefaultDeck(PRESET_TRACKS[1], "B"));
  const [deckC, setDeckC] = useState<DeckState>(createDefaultDeck(PRESET_TRACKS[2], "C"));
  const [deckD, setDeckD] = useState<DeckState>(createDefaultDeck(PRESET_TRACKS[3], "D"));

  // Start Audio Engine
  const handleStartAudio = () => {
    audio.init();
    audio.setVolume("A", deckA.volume);
    audio.setVolume("B", deckB.volume);
    audio.setVolume("C", deckC.volume);
    audio.setVolume("D", deckD.volume);
    audio.setCrossfader(crossfader);
    setHasStarted(true);
  };

  // Deck State Setter Helper
  const getDeckSetter = (deckId: DeckId) => {
    if (deckId === "A") return setDeckA;
    if (deckId === "B") return setDeckB;
    if (deckId === "C") return setDeckC;
    return setDeckD;
  };

  const getDeckState = (deckId: DeckId) => {
    if (deckId === "A") return deckA;
    if (deckId === "B") return deckB;
    if (deckId === "C") return deckC;
    return deckD;
  };

  // Play / Pause Toggle
  const handlePlayToggle = (deckId: DeckId) => {
    audio.init();
    const state = getDeckState(deckId);
    const setDeck = getDeckSetter(deckId);

    if (state.isPlaying) {
      audio.stopTrack(deckId);
      setDeck((prev) => ({ ...prev, isPlaying: false }));
    } else {
      if (state.track) {
        audio.playTrack(deckId, state.track, state.currentTime);
        setDeck((prev) => ({ ...prev, isPlaying: true }));
      }
    }
  };

  // Load Track into Deck
  const handleLoadTrackToDeck = (track: Track, deckId: DeckId) => {
    audio.init();
    audio.stopTrack(deckId);
    const setDeck = getDeckSetter(deckId);

    setDeck((prev) => ({
      ...prev,
      track,
      isPlaying: false,
      bpm: track.bpm,
      duration: 120,
      currentTime: 0,
      cuePoint: 0,
    }));
  };

  // Import User Audio File
  const handleImportUserFile = async (file: File) => {
    audio.init();
    const trackId = `user-${Date.now()}`;
    const newTrack: Track = {
      id: trackId,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Track",
      bpm: masterBpm,
      key: "8m",
      rating: 5,
      genre: "User Import",
      color: "cyan",
      isProcedural: false,
      file,
      fileName: file.name,
    };

    const detectedBpm = await audio.loadUserFile("A", file, trackId);
    newTrack.bpm = detectedBpm || masterBpm;

    setTracksList((prev) => [newTrack, ...prev]);
    handleLoadTrackToDeck(newTrack, "A");
  };

  // Audio Controls
  const handleVolumeChange = (deckId: DeckId, val: number) => {
    audio.setVolume(deckId, val);
    getDeckSetter(deckId)((prev) => ({ ...prev, volume: val }));
  };

  const handleEQChange = (deckId: DeckId, type: "low" | "mid" | "high", db: number) => {
    audio.setEQ(deckId, type, db);
    const key = `eq${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof DeckState;
    getDeckSetter(deckId)((prev: any) => ({ ...prev, [key]: db }));
  };

  const handleFilterChange = (deckId: DeckId, val: number) => {
    audio.setFilter(deckId, val);
    getDeckSetter(deckId)((prev) => ({ ...prev, filterCutoff: val }));
  };

  const handleCrossfaderChange = (val: number) => {
    audio.setCrossfader(val);
    setCrossfader(val);
  };

  const handleSync = (deckId: DeckId) => {
    const setDeck = getDeckSetter(deckId);
    setDeck((prev) => {
      audio.setPitch(deckId, ((masterBpm / (prev.track?.bpm || masterBpm)) - 1) * 100);
      return { ...prev, bpm: masterBpm, isSync: true };
    });
  };

  const handleSeek = (deckId: DeckId, seekTime: number) => {
    const state = getDeckState(deckId);
    if (state.track) {
      audio.playTrack(deckId, state.track, seekTime);
      getDeckSetter(deckId)((prev) => ({ ...prev, currentTime: seekTime, isPlaying: true }));
    }
  };

  return (
    <div id="traktor-app" className="min-h-screen bg-black text-slate-300 flex flex-col font-sans select-none antialiased">
      {!hasStarted ? (
        /* Traktor Audio Engine Splash Screen */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto my-auto">
          <div className="w-20 h-20 rounded-full bg-slate-950 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.2)] mb-6">
            <Disc className="w-10 h-10 text-cyan-400 animate-spin-slow" />
          </div>

          <h1 className="text-3xl font-black tracking-tighter text-white mb-2">
            TRAKTOR PRO 4
          </h1>
          <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-6">
            Native Instruments Professional Performance DJ Setup
          </p>

          <button
            id="start-traktor-btn"
            onClick={handleStartAudio}
            className="w-full h-14 rounded-lg bg-cyan-500 text-black font-black text-sm tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:bg-cyan-400 active:scale-95 transition"
          >
            LAUNCH TRAKTOR PRO 4 STUDIO
          </button>
        </div>
      ) : (
        /* TRAKTOR PRO 4 EXACT DESKTOP INTERFACE */
        <div className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-950">
          {/* Top Control Header Bar */}
          <TraktorHeader
            masterBpm={masterBpm}
            onMasterBpmChange={(bpm) => setMasterBpm(bpm)}
            masterVolume={masterVolume}
            onMasterVolumeChange={(vol) => setMasterVolume(vol)}
            quantize={quantize}
            onQuantizeToggle={() => setQuantize(!quantize)}
            snap={snap}
            onSnapToggle={() => setSnap(!snap)}
          />

          {/* Main Workspace Layout */}
          <div className="flex-1 p-2 flex flex-col gap-2 overflow-hidden">
            {/* Upper Decks + Central Mixer Layout */}
            <div className="grid grid-cols-12 gap-2 flex-1 min-h-[360px] overflow-hidden">
              {/* Left Column: Deck A & Deck C */}
              <div className="col-span-4 flex flex-col gap-2 overflow-hidden">
                <TraktorDeck
                  deckId="A"
                  state={deckA}
                  masterBpm={masterBpm}
                  onPlayToggle={() => handlePlayToggle("A")}
                  onSync={() => handleSync("A")}
                  onMasterToggle={() => setDeckA((p) => ({ ...p, isMaster: !p.isMaster }))}
                  onCueClick={() => handleSeek("A", deckA.cuePoint || 0)}
                  onCupClick={() => handleSeek("A", deckA.cuePoint || 0)}
                  onFluxToggle={() => setDeckA((p) => ({ ...p, isFlux: !p.isFlux }))}
                  onReverseToggle={() => setDeckA((p) => ({ ...p, isReverse: !p.isReverse }))}
                  onLoopSizeChange={(sz) => setDeckA((p) => ({ ...p, loopSize: sz }))}
                  onLoopToggle={() => setDeckA((p) => ({ ...p, isLoopActive: !p.isLoopActive }))}
                  onSeek={(t) => handleSeek("A", t)}
                  onLoadClick={() => {}}
                  onStemChange={(stem, val) => setDeckA((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }))}
                />

                <TraktorDeck
                  deckId="C"
                  state={deckC}
                  masterBpm={masterBpm}
                  onPlayToggle={() => handlePlayToggle("C")}
                  onSync={() => handleSync("C")}
                  onMasterToggle={() => setDeckC((p) => ({ ...p, isMaster: !p.isMaster }))}
                  onCueClick={() => handleSeek("C", deckC.cuePoint || 0)}
                  onCupClick={() => handleSeek("C", deckC.cuePoint || 0)}
                  onFluxToggle={() => setDeckC((p) => ({ ...p, isFlux: !p.isFlux }))}
                  onReverseToggle={() => setDeckC((p) => ({ ...p, isReverse: !p.isReverse }))}
                  onLoopSizeChange={(sz) => setDeckC((p) => ({ ...p, loopSize: sz }))}
                  onLoopToggle={() => setDeckC((p) => ({ ...p, isLoopActive: !p.isLoopActive }))}
                  onSeek={(t) => handleSeek("C", t)}
                  onLoadClick={() => {}}
                  onStemChange={(stem, val) => setDeckC((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }))}
                />
              </div>

              {/* Center Column: 4-Channel Central Traktor Mixer */}
              <div className="col-span-4 flex flex-col justify-center">
                <TraktorMixer
                  stateA={deckA}
                  stateB={deckB}
                  stateC={deckC}
                  stateD={deckD}
                  crossfader={crossfader}
                  onVolumeChange={handleVolumeChange}
                  onEQChange={handleEQChange}
                  onFilterChange={handleFilterChange}
                  onCrossfaderChange={handleCrossfaderChange}
                  onKeyLockToggle={(id) => getDeckSetter(id)((p) => ({ ...p, keyLock: !p.keyLock }))}
                  onHeadphoneCueToggle={(id) => getDeckSetter(id)((p) => ({ ...p, headphoneCue: !p.headphoneCue }))}
                  onFxSendToggle={(id, unit) => getDeckSetter(id)((p) => ({ ...p, [`fx${unit}Send`]: !(p as any)[`fx${unit}Send`] }))}
                />
              </div>

              {/* Right Column: Deck B & Deck D (Stem Deck) */}
              <div className="col-span-4 flex flex-col gap-2 overflow-hidden">
                <TraktorDeck
                  deckId="B"
                  state={deckB}
                  masterBpm={masterBpm}
                  onPlayToggle={() => handlePlayToggle("B")}
                  onSync={() => handleSync("B")}
                  onMasterToggle={() => setDeckB((p) => ({ ...p, isMaster: !p.isMaster }))}
                  onCueClick={() => handleSeek("B", deckB.cuePoint || 0)}
                  onCupClick={() => handleSeek("B", deckB.cuePoint || 0)}
                  onFluxToggle={() => setDeckB((p) => ({ ...p, isFlux: !p.isFlux }))}
                  onReverseToggle={() => setDeckB((p) => ({ ...p, isReverse: !p.isReverse }))}
                  onLoopSizeChange={(sz) => setDeckB((p) => ({ ...p, loopSize: sz }))}
                  onLoopToggle={() => setDeckB((p) => ({ ...p, isLoopActive: !p.isLoopActive }))}
                  onSeek={(t) => handleSeek("B", t)}
                  onLoadClick={() => {}}
                  onStemChange={(stem, val) => setDeckB((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }))}
                />

                <TraktorDeck
                  deckId="D"
                  state={deckD}
                  masterBpm={masterBpm}
                  onPlayToggle={() => handlePlayToggle("D")}
                  onSync={() => handleSync("D")}
                  onMasterToggle={() => setDeckD((p) => ({ ...p, isMaster: !p.isMaster }))}
                  onCueClick={() => handleSeek("D", deckD.cuePoint || 0)}
                  onCupClick={() => handleSeek("D", deckD.cuePoint || 0)}
                  onFluxToggle={() => setDeckD((p) => ({ ...p, isFlux: !p.isFlux }))}
                  onReverseToggle={() => setDeckD((p) => ({ ...p, isReverse: !p.isReverse }))}
                  onLoopSizeChange={(sz) => setDeckD((p) => ({ ...p, loopSize: sz }))}
                  onLoopToggle={() => setDeckD((p) => ({ ...p, isLoopActive: !p.isLoopActive }))}
                  onSeek={(t) => handleSeek("D", t)}
                  onLoadClick={() => {}}
                  onStemChange={(stem, val) => setDeckD((p) => ({ ...p, stems: { ...p.stems, [stem]: val } }))}
                />
              </div>
            </div>

            {/* Bottom Half: Traktor Track Collection & Browser */}
            <div className="shrink-0">
              <TraktorBrowser
                tracks={tracksList}
                loadedDecks={{
                  A: deckA.track?.id || null,
                  B: deckB.track?.id || null,
                  C: deckC.track?.id || null,
                  D: deckD.track?.id || null,
                }}
                onLoadTrackToDeck={handleLoadTrackToDeck}
                onImportUserFile={handleImportUserFile}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
