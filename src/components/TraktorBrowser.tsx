/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from "react";
import {
  Folder,
  Disc,
  Upload,
  Search,
  Music,
  Star,
  Radio,
  History,
  Plus,
  Trash2,
  Edit2,
  ListPlus,
  X,
  Check,
  Usb,
  FolderPlus,
} from "lucide-react";
import { Track, DeckId, Playlist } from "../types";

interface TraktorBrowserProps {
  tracks: Track[];
  playlists: Playlist[];
  activePlaylistId: string | null;
  loadedDecks: Record<DeckId, string | null>; // DeckId -> track.id or null
  onSelectPlaylist: (id: string | null) => void;
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (id: string, name: string) => void;
  onDeletePlaylist: (id: string) => void;
  onAddTrackToPlaylist: (trackId: string, playlistId: string) => void;
  onRemoveTrackFromPlaylist: (trackId: string, playlistId: string) => void;
  onLoadTrackToDeck: (track: Track, deck: DeckId) => void;
  onImportUserFile: (file: File, targetPlaylistId?: string | null) => void;
  onOpenHardwareSetup: () => void;
}

export const TraktorBrowser: React.FC<TraktorBrowserProps> = ({
  tracks,
  playlists,
  activePlaylistId,
  loadedDecks,
  onSelectPlaylist,
  onCreatePlaylist,
  onRenamePlaylist,
  onDeletePlaylist,
  onAddTrackToPlaylist,
  onRemoveTrackFromPlaylist,
  onLoadTrackToDeck,
  onImportUserFile,
  onOpenHardwareSetup,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistName, setEditingPlaylistName] = useState("");

  const [openPlaylistDropdownForTrack, setOpenPlaylistDropdownForTrack] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Active playlist object if selected
  const currentPlaylist = playlists.find((p) => p.id === activePlaylistId);

  // Filter tracks by active playlist and search query
  const filteredTracks = tracks.filter((track) => {
    // Playlist filter
    if (activePlaylistId && activePlaylistId !== "all") {
      if (!currentPlaylist || !currentPlaylist.trackIds.includes(track.id)) {
        return false;
      }
    }

    // Search query filter
    const q = searchQuery.toLowerCase();
    if (!q) return true;
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
      onImportUserFile(file, activePlaylistId);
    }
  };

  const handleSaveNewPlaylist = () => {
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim());
      setNewPlaylistName("");
      setIsCreatingPlaylist(false);
    }
  };

  const handleSaveRenamePlaylist = (id: string) => {
    if (editingPlaylistName.trim()) {
      onRenamePlaylist(id, editingPlaylistName.trim());
      setEditingPlaylistId(null);
    }
  };

  return (
    <div
      id="traktor-browser"
      className="bg-slate-950 border border-white/10 rounded-lg flex flex-col text-[10px] shadow-2xl overflow-hidden min-h-[280px]"
    >
      {/* Top Category / Playlist Header Toolbar */}
      <div className="bg-slate-900/90 border-b border-white/10 px-3 py-1.5 flex items-center justify-between overflow-x-auto gap-2 select-none">
        {/* Quick Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => onSelectPlaylist(null)}
            className={`px-2.5 py-1 rounded text-[8.5px] font-black uppercase tracking-wider transition shrink-0 ${
              activePlaylistId === null
                ? "bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.4)]"
                : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Tracks ({tracks.length})
          </button>

          {playlists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => onSelectPlaylist(pl.id)}
              className={`px-2.5 py-1 rounded text-[8.5px] font-black uppercase tracking-wider transition shrink-0 flex items-center gap-1 ${
                activePlaylistId === pl.id
                  ? "bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Folder className="w-3 h-3" />
              <span>{pl.name}</span>
              <span className="opacity-60 text-[7.5px]">({pl.trackIds.length})</span>
            </button>
          ))}
        </div>

        {/* Action Buttons: Hardware Setup, Search & Import */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onOpenHardwareSetup}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded font-black text-[8.5px] uppercase tracking-wider transition active:scale-95"
          >
            <Usb className="w-3 h-3 text-amber-400" /> Hardware & Audio Setup
          </button>

          <div className="relative flex items-center bg-black border border-white/10 rounded px-2 py-1">
            <Search className="w-3 h-3 text-slate-500 mr-1" />
            <input
              type="text"
              placeholder="Search Title, Key, Artist..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-[9px] outline-none w-36 placeholder:text-slate-600"
            />
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-black text-[8.5px] uppercase tracking-wider px-2.5 py-1 rounded transition active:scale-95 shrink-0"
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

      {/* Main Browser Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Folder Tree & Custom Playlists Manager */}
        <div className="w-52 bg-slate-900/50 border-r border-white/10 p-2 flex flex-col justify-between select-none shrink-0 overflow-y-auto">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[7.5px] font-black text-slate-500 uppercase tracking-widest">
                PLAYLIST COLLECTION
              </span>
              <button
                onClick={() => setIsCreatingPlaylist(true)}
                className="text-cyan-400 hover:text-cyan-300 font-bold text-[8px] flex items-center gap-0.5 bg-cyan-950/60 border border-cyan-500/30 px-1.5 py-0.5 rounded"
              >
                <Plus className="w-2.5 h-2.5" /> New Playlist
              </button>
            </div>

            {/* Inline Playlist Creator */}
            {isCreatingPlaylist && (
              <div className="bg-slate-950 border border-cyan-500/40 p-1.5 rounded flex items-center gap-1 mb-1">
                <input
                  type="text"
                  placeholder="Playlist Name..."
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveNewPlaylist()}
                  autoFocus
                  className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded outline-none border border-white/10 w-full"
                />
                <button
                  onClick={handleSaveNewPlaylist}
                  className="bg-cyan-500 text-black p-1 rounded font-bold hover:bg-cyan-400"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setIsCreatingPlaylist(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* All Tracks Item */}
            <button
              onClick={() => onSelectPlaylist(null)}
              className={`flex items-center justify-between px-2 py-1.5 rounded text-[9px] font-bold transition ${
                activePlaylistId === null
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Disc className="w-3.5 h-3.5 shrink-0" />
                <span>All Tracks</span>
              </div>
              <span className="text-[8px] opacity-60 font-mono">{tracks.length}</span>
            </button>

            {/* User Custom Playlists List */}
            {playlists.map((pl) => {
              const isSelected = activePlaylistId === pl.id;
              const isEditing = editingPlaylistId === pl.id;

              return (
                <div
                  key={pl.id}
                  className={`group flex items-center justify-between px-2 py-1.5 rounded text-[9px] font-bold transition ${
                    isSelected
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                  }`}
                >
                  {isEditing ? (
                    <div className="flex items-center gap-1 w-full">
                      <input
                        type="text"
                        value={editingPlaylistName}
                        onChange={(e) => setEditingPlaylistName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveRenamePlaylist(pl.id)}
                        autoFocus
                        className="bg-black text-white text-[9px] px-1 py-0.5 rounded outline-none border border-white/20 w-full"
                      />
                      <button
                        onClick={() => handleSaveRenamePlaylist(pl.id)}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => onSelectPlaylist(pl.id)}
                        className="flex items-center gap-2 truncate flex-1 text-left"
                      >
                        <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span className="truncate">{pl.name}</span>
                        <span className="text-[8px] opacity-50 font-mono">({pl.trackIds.length})</span>
                      </button>

                      {/* Playlist Edit & Delete Controls */}
                      <div className="hidden group-hover:flex items-center gap-1 ml-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingPlaylistId(pl.id);
                            setEditingPlaylistName(pl.name);
                          }}
                          className="text-slate-400 hover:text-amber-400 p-0.5"
                          title="Rename Playlist"
                        >
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeletePlaylist(pl.id);
                          }}
                          className="text-slate-400 hover:text-red-400 p-0.5"
                          title="Delete Playlist"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-black/60 border border-white/5 rounded p-1.5 text-[8px] text-slate-500 font-mono">
            {currentPlaylist
              ? `PLAYLIST: ${currentPlaylist.name.toUpperCase()}`
              : "VIEWING MASTER COLLECTION"}
          </div>
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
                <th className="p-1.5 w-14">BPM</th>
                <th className="p-1.5 w-10">KEY</th>
                <th className="p-1.5 w-14">RATING</th>
                <th className="p-1.5 w-24 text-center">PLAYLISTS</th>
                <th className="p-1.5 w-36 text-center">LOAD TO DECK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[9px]">
              {filteredTracks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 italic font-sans text-[11px]">
                    No tracks in this playlist yet. Click "Import Track" or add tracks from All Tracks.
                  </td>
                </tr>
              ) : (
                filteredTracks.map((track, idx) => {
                  const deckLoadedA = loadedDecks.A === track.id;
                  const deckLoadedB = loadedDecks.B === track.id;
                  const deckLoadedC = loadedDecks.C === track.id;
                  const deckLoadedD = loadedDecks.D === track.id;

                  const isDropdownOpen = openPlaylistDropdownForTrack === track.id;

                  return (
                    <tr
                      key={track.id}
                      className="hover:bg-slate-800/60 transition group text-slate-300"
                    >
                      <td className="p-1.5 text-center text-slate-500 font-bold">{idx + 1}</td>

                      {/* Deck Loaded Indicator Badge */}
                      <td className="p-1.5 text-center">
                        <div className="flex gap-0.5 justify-center">
                          {deckLoadedA && <span className="bg-cyan-500 text-black px-1 rounded font-black text-[7.5px]">A✓</span>}
                          {deckLoadedB && <span className="bg-amber-500 text-black px-1 rounded font-black text-[7.5px]">B✓</span>}
                          {deckLoadedC && <span className="bg-blue-500 text-black px-1 rounded font-black text-[7.5px]">C✓</span>}
                          {deckLoadedD && <span className="bg-emerald-500 text-black px-1 rounded font-black text-[7.5px]">D✓</span>}
                        </div>
                      </td>

                      {/* Cover Art Icon */}
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

                      {/* Playlist Actions Column */}
                      <td className="p-1.5 text-center relative">
                        <div className="flex items-center justify-center gap-1">
                          {/* Add to Playlist Dropdown Trigger */}
                          <div className="relative">
                            <button
                              onClick={() => setOpenPlaylistDropdownForTrack(isDropdownOpen ? null : track.id)}
                              className="text-[8px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 px-1.5 py-0.5 rounded flex items-center gap-1"
                              title="Add to Playlist"
                            >
                              <ListPlus className="w-2.5 h-2.5 text-amber-400" />
                              <span>+ List</span>
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                              <div className="absolute right-0 top-6 w-36 bg-slate-900 border border-white/20 rounded shadow-xl p-1 z-30 font-sans text-left">
                                <div className="text-[7.5px] font-black text-slate-500 uppercase px-1 pb-1 border-b border-white/10 mb-1">
                                  Add To Playlist:
                                </div>
                                {playlists.length === 0 ? (
                                  <div className="text-[8px] text-slate-500 p-1 italic">
                                    No playlists created.
                                  </div>
                                ) : (
                                  playlists.map((pl) => {
                                    const inList = pl.trackIds.includes(track.id);
                                    return (
                                      <button
                                        key={pl.id}
                                        onClick={() => {
                                          if (inList) {
                                            onRemoveTrackFromPlaylist(track.id, pl.id);
                                          } else {
                                            onAddTrackToPlaylist(track.id, pl.id);
                                          }
                                          setOpenPlaylistDropdownForTrack(null);
                                        }}
                                        className={`w-full text-left px-1.5 py-1 rounded text-[8.5px] flex items-center justify-between ${
                                          inList
                                            ? "bg-amber-500/20 text-amber-400 font-bold"
                                            : "hover:bg-slate-800 text-slate-300"
                                        }`}
                                      >
                                        <span className="truncate">{pl.name}</span>
                                        {inList && <Check className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            )}
                          </div>

                          {/* Remove from current playlist if viewing a specific playlist */}
                          {activePlaylistId && activePlaylistId !== "all" && (
                            <button
                              onClick={() => onRemoveTrackFromPlaylist(track.id, activePlaylistId)}
                              className="text-[8px] text-red-400 hover:text-red-300 bg-red-950/40 border border-red-500/30 px-1 py-0.5 rounded"
                              title="Remove from this playlist"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
