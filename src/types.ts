/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  genre: string;
  color: string; // Theme color for this track
  isProcedural: boolean; // True if generated via Web Audio, False if uploaded file
  file?: File; // Present if user loaded a custom MP3/WAV
}

export type DeckId = "A" | "B" | "C" | "D";

export interface DeckState {
  track: Track | null;
  isPlaying: boolean;
  volume: number;      // 0.0 to 1.0
  playbackRate: number; // 0.5 to 1.5 (pitch)
  bpm: number;          // Current active BPM (track.bpm * playbackRate)
  pitchPercent: number; // -50% to +50% range
  eqLow: number;       // Gain in dB (-12 to +12)
  eqMid: number;       // Gain in dB (-12 to +12)
  eqHigh: number;      // Gain in dB (-12 to +12)
  filterCutoff: number; // -1 to +1 (0 is center/neutral, -1 is lowpass, +1 is highpass)
  currentTime: number; // seconds
  duration: number;    // seconds
  scratchPosition: number; // Rotation degree of the vinyl
  cuePoint: number | null; // Set hotcue point (seconds)
}
