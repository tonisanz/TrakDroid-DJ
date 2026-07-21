/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  key: string;       // e.g., "7m", "10m", "6m", "9d", "12m"
  rating: number;    // 1 to 5 stars
  genre: string;
  color: string;     // Theme color e.g., "cyan", "fuchsia", "emerald", "amber"
  coverArt?: string; // Optional cover art thumbnail or CSS gradient
  isProcedural: boolean;
  file?: File;
  fileName?: string;
}

export type DeckId = "A" | "B" | "C" | "D";

export interface StemLevels {
  drums: number; // 0.0 to 1.0
  bass: number;
  other: number;
  vocals: number;
}

export interface DeckState {
  track: Track | null;
  isPlaying: boolean;
  isSync: boolean;
  isMaster: boolean;
  isFlux: boolean;
  isReverse: boolean;
  volume: number;       // 0.0 to 1.0
  playbackRate: number; // 0.5 to 1.5
  bpm: number;
  pitchPercent: number; // -50% to +50%
  eqLow: number;        // Gain in dB
  eqMid: number;        // Gain in dB
  eqHigh: number;       // Gain in dB
  filterCutoff: number; // -1 to +1
  currentTime: number;
  duration: number;
  cuePoint: number | null;
  hotcues: (number | null)[];
  loopSize: number;     // e.g. 4, 8, 16, 0.5, 0.25
  isLoopActive: boolean;
  fx1Send: boolean;
  fx2Send: boolean;
  keyLock: boolean;
  headphoneCue: boolean;
  stems: StemLevels;    // Stem channel levels for Stem view (Deck D)
  isStemDeck?: boolean; // True if displaying Stem channels
}
