/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import { Folder, Disc, Upload, Search, Music, Star, Radio, History, Bookmark, Check } from "lucide-react";
import { Track, DeckId } from "../types";

interface TraktorBrowserProps {
  tracks: Track[];
  loadedDecks: Record<DeckId, string | null>; // DeckId -> track.id or null
  onLoadTrackToDeck: (track: Track, deck: DeckId) => void;
  onImportUserFile: (file: File) => void;
}

export const TraktorBrowser: React.FC<TraktorBrowserProps> = ({
  tracks,
  loadedDecks,
  onLoadTrackToDeck,
  onImportUserFile,
}) => {
  const [activeTab, setActiveTab] = useState("Track Collection");
  const [selectedFolder, setSelectedFolder] = useState("Track Collection");
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const playlistTabs = [
    "Preparation",
    "Track Collection",
    "Native Instruments",
    "Night Vibes",
    "Groove",
    "Festival",
    "Best New Drum & Bass",
    "Offline Library",
  ];

  const sidebarFolders = [
    { name: "Track Collection", icon: Disc },
    { name: "Playlists", icon: Folder },
    { name: "Beatport Streaming", icon: Radio },
    { name: "Beatsource Streaming", icon: Radio },
    { name: "Explorer", icon: Folder },
    { name: "Audio Recordings", icon: Music },
    { name: "History", icon: History },
  ];

  const filteredTracks = tracks.filter((track) => {
    const q = searchQuery.toLowerCase();
    return (
      track.title.toLowerCase().includes(q) ||
      track.artist.toLowerCase().includes(q) ||
      track.genre.toLowerCase().includes(q) ||
      track.key.toLowerCase().includes(q)
    );
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportUserFile(file);
    }
  };

  return (
    <div
      id="traktor-browser"
      className="bg-slate-950 border border-white/10 rounded-lg flex flex-col text-[10px] shadow-2xl overflow-hidden min-h-[260px]"
    >
      {/* Top Category / Playlist Tabs */}
      <div className="bg-slate-900/80 border-b border-white/10 px-2 py-1 flex items-center justify-between overflow-x-auto gap-2 select-none">
        <div className="flex items-center gap-1">
          {playlistTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider transition shrink-0 ${
                activeTab === tab
                  ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input & Import Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex items-center bg-black border border-white/10 rounded px-2 py-0.5">
            <Search className="w-3 h-3 text-slate-500 mr-1" />
            <input
              type="text"
              placeholder="Search Title, Artist, Key..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-[9px] outline-none w-36 placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-[8.5px] uppercase tracking-wider px-2 py-1 rounded transition active:scale-95 shrink-0"
          >
            <Upload className="w-3 h-3" /> Import Track
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Main Browser Body: Left Sidebar + Right Track Collection Table */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Folder Tree Sidebar */}
        <div className="w-48 bg-slate-900/40 border-r border-white/10 p-2 flex flex-col gap-1 select-none shrink-0">
          <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest px-1 mb-0.5">
            BROWSER TREE
          </span>

          {sidebarFolders.map((folder) => {
            const Icon = folder.icon;
            const isSelected = selectedFolder === folder.name;
            return (
              <button
                key={folder.name}
                onClick={() => setSelectedFolder(folder.name)}
                className={`flex items-center gap-2 px-2 py-1 rounded text-[9px] font-bold text-left transition ${
                  isSelected
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{folder.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right Track Collection Table */}
        <div className="flex-1 overflow-y-auto max-h-[220px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 border-b border-white/10 text-slate-400 font-black text-[8px] uppercase tracking-widest sticky top-0 z-10 select-none">
                <th className="p-1.5 w-6 text-center">#</th>
                <th className="p-1.5 w-12 text-center">DECK</th>
                <th className="p-1.5 w-8">ART</th>
                <th className="p-1.5">TITLE</th>
                <th className="p-1.5">ARTIST</th>
                <th className="p-1.5 w-16">BPM</th>
                <th className="p-1.5 w-12">KEY</th>
                <th className="p-1.5 w-16">RATING</th>
                <th className="p-1.5">FILE NAME</th>
                <th className="p-1.5 w-36 text-center">LOAD TO DECK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[9px]">
              {filteredTracks.map((track, idx) => {
                // Check if track is currently loaded on any deck
                const deckLoadedA = loadedDecks.A === track.id;
                const deckLoadedB = loadedDecks.B === track.id;
                const deckLoadedC = loadedDecks.C === track.id;
                const deckLoadedD = loadedDecks.D === track.id;

                return (
                  <tr
                    key={track.id}
                    className="hover:bg-slate-800/60 transition group text-slate-300"
                  >
                    <td className="p-1.5 text-center text-slate-500 font-bold">{idx + 1}</td>

                    {/* Deck Status Badge */}
                    <td className="p-1.5 text-center">
                      <div className="flex gap-0.5 justify-center">
                        {deckLoadedA && <span className="bg-cyan-500 text-black px-1 rounded font-black text-[7.5px]">A✓</span>}
                        {deckLoadedB && <span className="bg-amber-500 text-black px-1 rounded font-black text-[7.5px]">B✓</span>}
                        {deckLoadedC && <span className="bg-blue-500 text-black px-1 rounded font-black text-[7.5px]">C✓</span>}
                        {deckLoadedD && <span className="bg-emerald-500 text-black px-1 rounded font-black text-[7.5px]">D✓</span>}
                      </div>
                    </td>

                    {/* Cover Art Swatch */}
                    <td className="p-1.5">
                      <div className={`w-5 h-5 rounded flex items-center justify-center font-black text-[8px] text-black ${
                        track.color === "cyan" ? "bg-cyan-400" : track.color === "purple" ? "bg-fuchsia-400" : track.color === "emerald" ? "bg-emerald-400" : "bg-amber-400"
                      }`}>
                        <Music className="w-3 h-3 text-black/80" />
                      </div>
                    </td>

                    <td className="p-1.5 font-bold text-white font-sans">{track.title}</td>
                    <td className="p-1.5 text-slate-400 font-sans">{track.artist}</td>
                    <td className="p-1.5 text-cyan-400 font-bold">{track.bpm.toFixed(1)}</td>
                    <td className="p-1.5 text-amber-400 font-bold">{track.key}</td>

                    {/* Star Rating */}
                    <td className="p-1.5">
                      <div className="flex gap-0.5 text-amber-400">
                        {Array.from({ length: track.rating }).map((_, i) => (
                          <Star key={i} className="w-2.5 h-2.5 fill-current" />
                        ))}
                      </div>
                    </td>

                    <td className="p-1.5 text-slate-500 text-[8px] truncate max-w-[120px]">
                      {track.fileName || `${track.title.toLowerCase().replace(/\s+/g, "_")}.mp3`}
                    </td>

                    {/* Quick Load Buttons to Decks A, B, C, D */}
                    <td className="p-1.5 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          id={`load-a-${track.id}`}
                          onClick={() => onLoadTrackToDeck(track, "A")}
                          className="bg-cyan-950 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500/40 px-1.5 py-0.5 rounded font-black text-[8px] uppercase transition active:scale-95"
                        >
                          A
                        </button>
                        <button
                          id={`load-b-${track.id}`}
                          onClick={() => onLoadTrackToDeck(track, "B")}
                          className="bg-amber-950 hover:bg-amber-500 text-amber-400 hover:text-black border border-amber-500/40 px-1.5 py-0.5 rounded font-black text-[8px] uppercase transition active:scale-95"
                        >
                          B
                        </button>
                        <button
                          id={`load-c-${track.id}`}
                          onClick={() => onLoadTrackToDeck(track, "C")}
                          className="bg-blue-950 hover:bg-blue-500 text-blue-400 hover:text-black border border-blue-500/40 px-1.5 py-0.5 rounded font-black text-[8px] uppercase transition active:scale-95"
                        >
                          C
                        </button>
                        <button
                          id={`load-d-${track.id}`}
                          onClick={() => onLoadTrackToDeck(track, "D")}
                          className="bg-emerald-950 hover:bg-emerald-500 text-emerald-400 hover:text-black border border-emerald-500/40 px-1.5 py-0.5 rounded font-black text-[8px] uppercase transition active:scale-95"
                        >
                          D
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
