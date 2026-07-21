/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Disc } from "lucide-react";
import { Track, DeckState, DeckId, Playlist, MixerMode, MidiMapItem } from "./types";
import { audio } from "./utils/audio";
import { TraktorHeader } from "./components/TraktorHeader";
import { TraktorDeck } from "./components/TraktorDeck";
import { TraktorMixer } from "./components/TraktorMixer";
import { TraktorBrowser } from "./components/TraktorBrowser";
import { HardwareSetupModal } from "./components/HardwareSetupModal";

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
  },
];

const INITIAL_MIDI_MAPPINGS: MidiMapItem[] = [
  // Deck A Traktor X1
  { id: "play_A", label: "Play / Pause", deckId: "A", parameter: "play", status: 0x90, ccOrNote: 60, channel: 1 },
  { id: "cue_A", label: "Cue Point", deckId: "A", parameter: "cue", status: 0x90, ccOrNote: 61, channel: 1 },
  { id: "sync_A", label: "Sync BPM", deckId: "A", parameter: "sync", status: 0x90, ccOrNote: 62, channel: 1 },
  { id: "volume_A", label: "Fader Volume", deckId: "A", parameter: "volume", status: 0xb0, ccOrNote: 1, channel: 1 },
  { id: "eq_low_A", label: "EQ Low Knob", deckId: "A", parameter: "eqLow", status: 0xb0, ccOrNote: 2, channel: 1 },
  { id: "filter_A", label: "Filter Knob", deckId: "A", parameter: "filter", status: 0xb0, ccOrNote: 3, channel: 1 },

  // Deck B Traktor X1
  { id: "play_B", label: "Play / Pause", deckId: "B", parameter: "play", status: 0x90, ccOrNote: 64, channel: 1 },
  { id: "cue_B", label: "Cue Point", deckId: "B", parameter: "cue", status: 0x90, ccOrNote: 65, channel: 1 },
  { id: "sync_B", label: "Sync BPM", deckId: "B", parameter: "sync", status: 0x90, ccOrNote: 66, channel: 1 },
  { id: "volume_B", label: "Fader Volume", deckId: "B", parameter: "volume", status: 0xb0, ccOrNote: 4, channel: 1 },
  { id: "eq_low_B", label: "EQ Low Knob", deckId: "B", parameter: "eqLow", status: 0xb0, ccOrNote: 5, channel: 1 },
  { id: "filter_B", label: "Filter Knob", deckId: "B", parameter: "filter", status: 0xb0, ccOrNote: 6, channel: 1 },

  // Deck C Traktor X1
  { id: "play_C", label: "Play / Pause", deckId: "C", parameter: "play", status: 0x90, ccOrNote: 68, channel: 1 },
  { id: "cue_C", label: "Cue Point", deckId: "C", parameter: "cue", status: 0x90, ccOrNote: 69, channel: 1 },

  // Deck D Traktor X1
  { id: "play_D", label: "Play / Pause", deckId: "D", parameter: "play", status: 0x90, ccOrNote: 72, channel: 1 },
  { id: "cue_D", label: "Cue Point", deckId: "D", parameter: "cue", status: 0x90, ccOrNote: 73, channel: 1 },
];

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [masterBpm, setMasterBpm] = useState(128.0);
  const [masterVolume, setMasterVolume] = useState(1.0);
  const [quantize, setQuantize] = useState(true);
  const [snap, setSnap] = useState(true);
  const [crossfader, setCrossfader] = useState(0);

  // External Mixer Mode ("internal" vs "external")
  const [mixerMode, setMixerMode] = useState<MixerMode>("internal");

  // Interactive MIDI Mappings
  const [midiMappings, setMidiMappings] = useState<MidiMapItem[]>(INITIAL_MIDI_MAPPINGS);

  const [tracksList, setTracksList] = useState<Track[]>(PRESET_TRACKS);

  // Playlists State
  const [playlists, setPlaylists] = useState<Playlist[]>([
    { id: "pl-techno", name: "Peak Time Techno", trackIds: ["tr-in-dub", "tr-bumpy"] },
    { id: "pl-house", name: "Deep House Stems", trackIds: ["tr-cooking-swings", "tr-fade-away"] },
    { id: "pl-dnb", name: "Drum & Bass", trackIds: ["tr-born-under"] },
  ]);
  const [activePlaylistId, setActivePlaylistId] = useState<string | null>(null);

  // Hardware & Soundcard Setup Modal State
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);

  // Initial Deck States
  const createDefaultDeck = (track: Track, id: DeckId): DeckState => ({
    track,
    isPlaying: false,
    isSync: false,
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
    hotcues: [0, 16, 32, 48, 64, 80, 96, 112],
    loopSize: 4,
    isLoopActive: false,
    fx1Send: false,
    fx2Send: false,
    keyLock: true,
    headphoneCue: id === "A",
    stems: { drums: 1.0, bass: 1.0, other: 1.0, vocals: 1.0 },
    isStemDeck: id === "D",
  });

  const [deckA, setDeckA] = useState<DeckState>(() => createDefaultDeck(PRESET_TRACKS[0], "A"));
  const [deckB, setDeckB] = useState<DeckState>(() => createDefaultDeck(PRESET_TRACKS[1], "B"));
  const [deckC, setDeckC] = useState<DeckState>(() => createDefaultDeck(PRESET_TRACKS[2], "C"));
  const [deckD, setDeckD] = useState<DeckState>(() => createDefaultDeck(PRESET_TRACKS[3], "D"));

  const getDeckState = (id: DeckId) => {
    switch (id) {
      case "A": return deckA;
      case "B": return deckB;
      case "C": return deckC;
      case "D": return deckD;
    }
  };

  const getDeckSetter = (id: DeckId) => {
    switch (id) {
      case "A": return setDeckA;
      case "B": return setDeckB;
      case "C": return setDeckC;
      case "D": return setDeckD;
    }
  };

  const handleStartAudio = () => {
    audio.init();
    setHasStarted(true);
  };

  // Attach Web MIDI Access Message Dispatcher
  useEffect(() => {
    if ("requestMIDIAccess" in navigator) {
      (navigator as any).requestMIDIAccess().then((midiAccess: any) => {
        midiAccess.inputs.forEach((input: any) => {
          input.onmidimessage = (event: any) => {
            const [status, data1, data2] = event.data;

            // Find matching MIDI mapping parameter
            const matchedMap = midiMappings.find((m) => m.ccOrNote === data1);
            if (matchedMap) {
              const { deckId, parameter } = matchedMap;

              if (parameter === "play") {
                if (status === 0x90 || data2 > 0) handlePlayToggle(deckId);
              } else if (parameter === "cue") {
                handleSeek(deckId, getDeckState(deckId).cuePoint || 0);
              } else if (parameter === "sync") {
                handleSync(deckId);
              } else if (parameter === "volume") {
                const normVal = data2 / 127;
                handleVolumeChange(deckId, normVal);
              } else if (parameter === "eqLow") {
                const dbVal = ((data2 / 127) - 0.5) * 24; // -12 to +12 dB
                handleEQChange(deckId, "low", dbVal);
              } else if (parameter === "filter") {
                const normCut = ((data2 / 127) - 0.5) * 2; // -1 to +1
                handleFilterChange(deckId, normCut);
              }
            }
          };
        });
      }).catch((e: any) => console.warn("MIDI attach error:", e));
    }
  }, [midiMappings, deckA, deckB, deckC, deckD]);

  // Play / Pause Toggle
  const handlePlayToggle = (deckId: DeckId) => {
    const state = getDeckState(deckId);
    const setDeck = getDeckSetter(deckId);

    if (!state.track) return;

    if (state.isPlaying) {
      audio.pauseTrack(deckId);
      setDeck((prev) => ({ ...prev, isPlaying: false }));
    } else {
      audio.playTrack(deckId, state.track, state.currentTime);
      setDeck((prev) => ({ ...prev, isPlaying: true }));
    }
  };

  // Track Loading
  const handleLoadTrackToDeck = (track: Track, deckId: DeckId) => {
    audio.pauseTrack(deckId);
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
  const handleImportUserFile = async (file: File, targetPlaylistId?: string | null) => {
    audio.init();
    const trackId = `user-${Date.now()}`;
    const newTrack: Track = {
      id: trackId,
      title: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Import",
      bpm: masterBpm,
      key: "8m",
      rating: 5,
      genre: "User Track",
      color: "cyan",
      isProcedural: false,
      file,
      fileName: file.name,
    };

    const detectedBpm = await audio.loadUserFile("A", file, trackId);
    newTrack.bpm = detectedBpm || masterBpm;

    setTracksList((prev) => [newTrack, ...prev]);

    if (targetPlaylistId && targetPlaylistId !== "all") {
      handleAddTrackToPlaylist(trackId, targetPlaylistId);
    }

    handleLoadTrackToDeck(newTrack, "A");
  };

  // Playlist Operations
  const handleCreatePlaylist = (name: string) => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name,
      trackIds: [],
    };
    setPlaylists((prev) => [...prev, newPl]);
    setActivePlaylistId(newPl.id);
  };

  const handleRenamePlaylist = (id: string, name: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => (pl.id === id ? { ...pl, name } : pl))
    );
  };

  const handleDeletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((pl) => pl.id !== id));
    if (activePlaylistId === id) {
      setActivePlaylistId(null);
    }
  };

  const handleAddTrackToPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId && !pl.trackIds.includes(trackId)) {
          return { ...pl, trackIds: [...pl.trackIds, trackId] };
        }
        return pl;
      })
    );
  };

  const handleRemoveTrackFromPlaylist = (trackId: string, playlistId: string) => {
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id === playlistId) {
          return { ...pl, trackIds: pl.trackIds.filter((id) => id !== trackId) };
        }
        return pl;
      })
    );
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

  const handleUpdateMidiMapping = (id: string, status: number, ccOrNote: number) => {
    setMidiMappings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, status, ccOrNote } : m))
    );
  };

  const handleResetMidiMappings = () => {
    setMidiMappings(INITIAL_MIDI_MAPPINGS);
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
            TRAKDROID PRO 4
          </h1>
          <p className="text-cyan-400 text-[10px] font-black uppercase tracking-widest mb-6">
            Professional Performance DJ Setup
          </p>

          <button
            id="start-traktor-btn"
            onClick={handleStartAudio}
            className="w-full h-14 rounded-lg bg-cyan-500 text-black font-black text-sm tracking-widest shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:bg-cyan-400 active:scale-95 transition"
          >
            LAUNCH TRAKDROID PRO 4 STUDIO
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
            mixerMode={mixerMode}
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

              {/* Center Column: 4-Channel Central Mixer */}
              <div className="col-span-4 flex flex-col">
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
                playlists={playlists}
                activePlaylistId={activePlaylistId}
                loadedDecks={{
                  A: deckA.track?.id || null,
                  B: deckB.track?.id || null,
                  C: deckC.track?.id || null,
                  D: deckD.track?.id || null,
                }}
                onSelectPlaylist={(id) => setActivePlaylistId(id)}
                onCreatePlaylist={handleCreatePlaylist}
                onRenamePlaylist={handleRenamePlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                onAddTrackToPlaylist={handleAddTrackToPlaylist}
                onRemoveTrackFromPlaylist={handleRemoveTrackFromPlaylist}
                onLoadTrackToDeck={handleLoadTrackToDeck}
                onImportUserFile={handleImportUserFile}
                onOpenHardwareSetup={() => setIsHardwareModalOpen(true)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Hardware, External Mixer & Interactive MIDI Setup Modal */}
      <HardwareSetupModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
        mixerMode={mixerMode}
        onMixerModeChange={(mode) => setMixerMode(mode)}
        midiMappings={midiMappings}
        onUpdateMidiMapping={handleUpdateMidiMapping}
        onResetMidiMappings={handleResetMidiMappings}
      />
    </div>
  );
}
