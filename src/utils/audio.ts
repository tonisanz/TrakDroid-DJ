/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track, DeckId } from "../types";

class AudioEngine {
  public ctx: AudioContext | null = null;

  // Deck Audio Nodes Maps
  private deckGains: Map<DeckId, GainNode> = new Map();
  private deckEqLows: Map<DeckId, BiquadFilterNode> = new Map();
  private deckEqMids: Map<DeckId, BiquadFilterNode> = new Map();
  private deckEqHighs: Map<DeckId, BiquadFilterNode> = new Map();
  private deckFilters: Map<DeckId, BiquadFilterNode> = new Map();
  private deckAnalyzers: Map<DeckId, AnalyserNode> = new Map();

  // Crossfader and Master Nodes
  private crossfaderGainLeft: GainNode | null = null;
  private crossfaderGainRight: GainNode | null = null;
  private masterGain: GainNode | null = null;
  public masterAnalyzer: AnalyserNode | null = null;

  // User uploaded tracks buffers
  private trackBuffers: Map<string, AudioBuffer> = new Map();
  private deckSources: Map<DeckId, AudioBufferSourceNode> = new Map();
  
  // Track start times for progress calculation
  private deckStartTimes: Map<DeckId, number> = new Map();
  private deckPauseTimes: Map<DeckId, number> = new Map();

  // Procedural Sequencer States
  private seqIntervals: Map<DeckId, any> = new Map();
  private nextNoteTimes: Map<DeckId, number> = new Map();
  private stepIndices: Map<DeckId, number> = new Map();

  // Active track settings
  private activeTracks: Map<DeckId, Track> = new Map();
  private rates: Map<DeckId, number> = new Map();

  constructor() {
    // Initialized lazily on first user gesture
  }

  public init() {
    if (this.ctx) return;
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContextClass();

    // Master Analyzer & Gain
    this.masterAnalyzer = this.ctx.createAnalyser();
    this.masterAnalyzer.fftSize = 256;
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    // Crossfader node channels (Left matches A & C, Right matches B & D)
    this.crossfaderGainLeft = this.ctx.createGain();
    this.crossfaderGainRight = this.ctx.createGain();
    this.crossfaderGainLeft.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.crossfaderGainRight.gain.setValueAtTime(0.5, this.ctx.currentTime);

    // Connect crossfader and master
    this.crossfaderGainLeft.connect(this.masterGain);
    this.crossfaderGainRight.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyzer);
    this.masterAnalyzer.connect(this.ctx.destination);

    // Build pipelines for all 4 decks
    this.buildDeckPipeline("A");
    this.buildDeckPipeline("B");
    this.buildDeckPipeline("C");
    this.buildDeckPipeline("D");
  }

  private buildDeckPipeline(deck: DeckId) {
    if (!this.ctx) return;

    // 1. Gain (volume)
    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(0.8, this.ctx.currentTime);

    // 2. EQ Cascade (Low shelf, Peaking mid, High shelf)
    const eqLow = this.ctx.createBiquadFilter();
    eqLow.type = "lowshelf";
    eqLow.frequency.setValueAtTime(220, this.ctx.currentTime);
    eqLow.gain.setValueAtTime(0, this.ctx.currentTime);

    const eqMid = this.ctx.createBiquadFilter();
    eqMid.type = "peaking";
    eqMid.frequency.setValueAtTime(1500, this.ctx.currentTime);
    eqMid.Q.setValueAtTime(1.0, this.ctx.currentTime);
    eqMid.gain.setValueAtTime(0, this.ctx.currentTime);

    const eqHigh = this.ctx.createBiquadFilter();
    eqHigh.type = "highshelf";
    eqHigh.frequency.setValueAtTime(6000, this.ctx.currentTime);
    eqHigh.gain.setValueAtTime(0, this.ctx.currentTime);

    // 3. Bi-directional Filter (Starts as Lowpass, neutral at 20000Hz)
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(20000, this.ctx.currentTime);

    // 4. Individual deck analyser for deck wave
    const analyzer = this.ctx.createAnalyser();
    analyzer.fftSize = 64;

    // Wire: Input -> EQ Low -> EQ Mid -> EQ High -> HPF/LPF Filter -> Volume Gain -> Deck Analyser -> Crossfader Gain
    eqLow.connect(eqMid);
    eqMid.connect(eqHigh);
    eqHigh.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(analyzer);

    // Route Left decks (A, C) to Left Crossfader channel, Right decks (B, D) to Right
    const crossfaderDest = (deck === "A" || deck === "C") ? this.crossfaderGainLeft! : this.crossfaderGainRight!;
    analyzer.connect(crossfaderDest);

    this.deckGains.set(deck, gainNode);
    this.deckEqLows.set(deck, eqLow);
    this.deckEqMids.set(deck, eqMid);
    this.deckEqHighs.set(deck, eqHigh);
    this.deckFilters.set(deck, filter);
    this.deckAnalyzers.set(deck, analyzer);
    this.rates.set(deck, 1.0);
  }

  // --- Dynamic Audio Parameter Controls ---

  public setVolume(deck: DeckId, value: number) {
    this.init();
    const node = this.deckGains.get(deck);
    if (node && this.ctx) {
      node.gain.linearRampToValueAtTime(value, this.ctx.currentTime + 0.05);
    }
  }

  public setCrossfader(value: number) {
    // value ranges from -1.0 (fully left: Deck A & C) to +1.0 (fully right: Deck B & D)
    this.init();
    if (!this.ctx || !this.crossfaderGainLeft || !this.crossfaderGainRight) return;

    // Equal-power crossfade curve
    const x = (value + 1) / 2; // Normalize to 0 to 1
    const gainLeft = Math.cos(x * 0.5 * Math.PI);
    const gainRight = Math.sin(x * 0.5 * Math.PI);

    this.crossfaderGainLeft.gain.setValueAtTime(gainLeft, this.ctx.currentTime);
    this.crossfaderGainRight.gain.setValueAtTime(gainRight, this.ctx.currentTime);
  }

  public setEQ(deck: DeckId, type: "low" | "mid" | "high", db: number) {
    this.init();
    let node: BiquadFilterNode | undefined;
    if (type === "low") node = this.deckEqLows.get(deck);
    else if (type === "mid") node = this.deckEqMids.get(deck);
    else if (type === "high") node = this.deckEqHighs.get(deck);

    if (node && this.ctx) {
      node.gain.setValueAtTime(db, this.ctx.currentTime);
    }
  }

  public setFilter(deck: DeckId, value: number) {
    // value goes from -1 (fully lowpass) to 0 (neutral) to +1 (fully highpass)
    this.init();
    const filterNode = this.deckFilters.get(deck);
    if (!filterNode || !this.ctx) return;

    if (value < -0.05) {
      filterNode.type = "lowpass";
      const hz = Math.max(80, 20000 * Math.pow(value + 1, 2.5));
      filterNode.frequency.setValueAtTime(hz, this.ctx.currentTime);
    } else if (value > 0.05) {
      filterNode.type = "highpass";
      const hz = Math.min(6000, 10 + 6000 * Math.pow(value, 2.0));
      filterNode.frequency.setValueAtTime(hz, this.ctx.currentTime);
    } else {
      filterNode.type = "lowpass";
      filterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);
    }
  }

  public setPitch(deck: DeckId, pitchPercent: number) {
    this.init();
    const rate = 1.0 + (pitchPercent / 100);
    this.rates.set(deck, rate);
    const source = this.deckSources.get(deck);
    if (source && this.ctx) {
      source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);
    }
  }

  // --- Deck Loading & Playback ---

  public async loadUserFile(deck: DeckId, file: File, trackId: string): Promise<number> {
    this.init();
    if (!this.ctx) return 125;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.trackBuffers.set(trackId, audioBuffer);
    
    return 125; // default bpm
  }

  public playTrack(deck: DeckId, track: Track, startTimeOffset = 0) {
    this.init();
    if (!this.ctx) return;

    this.stopTrack(deck);

    if (track.isProcedural) {
      this.startSequencer(deck, track);
    } else {
      const buffer = this.trackBuffers.get(track.id);
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const pipelineInput = this.deckEqLows.get(deck);
      if (pipelineInput) {
        source.connect(pipelineInput);
      }

      const rate = this.rates.get(deck) || 1.0;
      source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);

      const startOffset = startTimeOffset % buffer.duration;
      source.start(0, startOffset);

      this.deckSources.set(deck, source);
      this.activeTracks.set(deck, track);
      this.deckStartTimes.set(deck, this.ctx.currentTime - startOffset / rate);
    }
  }

  public stopTrack(deck: DeckId) {
    const source = this.deckSources.get(deck);
    if (source) {
      try { sourceStopSilently(source); } catch(e){}
      this.deckSources.delete(deck);
    }
    this.stopSequencer(deck);
  }

  public getPlaybackProgress(deck: DeckId, duration: number): number {
    if (!this.ctx) return 0;
    const activeTrack = this.activeTracks.get(deck);
    if (activeTrack?.isProcedural) {
      return (this.ctx.currentTime % 16) / 16;
    }
    const source = this.deckSources.get(deck);
    if (!source) return 0;
    const rate = this.rates.get(deck) || 1.0;
    const startTime = this.deckStartTimes.get(deck) || 0;
    const elapsed = (this.ctx.currentTime - startTime) * rate;
    return duration > 0 ? (elapsed % duration) / duration : 0;
  }

  // --- Real-time and Full Track Waveform Rendering Helpers ---

  public getAnalyserData(deck: DeckId | "master", array: Uint8Array) {
    if (deck === "master") {
      if (this.masterAnalyzer) {
        this.masterAnalyzer.getByteTimeDomainData(array);
      }
    } else {
      const node = this.deckAnalyzers.get(deck);
      if (node) {
        node.getByteFrequencyData(array);
      }
    }
  }

  public getPeakLevel(deck: DeckId): number {
    const node = this.deckAnalyzers.get(deck);
    if (!node || !this.ctx) return 0;
    const source = this.deckSources.get(deck);
    const seqActive = this.seqIntervals.get(deck);
    const isPlaying = !!source || !!seqActive;
    if (!isPlaying) return 0;

    const dataArray = new Uint8Array(node.frequencyBinCount);
    node.getByteFrequencyData(dataArray);
    
    let peak = 0;
    for (let i = 0; i < dataArray.length; i++) {
      if (dataArray[i] > peak) {
        peak = dataArray[i];
      }
    }
    return peak / 255;
  }

  /**
   * Generates or retrieves the high-resolution full track waveform array (100 values)
   */
  public getWaveformData(track: Track): number[] {
    const buffer = this.trackBuffers.get(track.id);
    if (buffer) {
      const numPoints = 120;
      const data = buffer.getChannelData(0);
      const step = Math.floor(data.length / numPoints);
      const points: number[] = [];

      for (let i = 0; i < numPoints; i++) {
        let max = 0.05;
        const start = i * step;
        const end = Math.min(start + step, data.length);
        for (let j = start; j < end; j += Math.max(1, Math.floor(step / 10))) {
          const val = Math.abs(data[j]);
          if (val > max) max = val;
        }
        points.push(Math.min(1.0, max * 1.5)); // boost visual amplitude slightly
      }
      return points;
    }

    // Otherwise generate premium procedural waveforms to match the genre
    const points: number[] = [];
    const genre = track.genre.toLowerCase();
    
    for (let i = 0; i < 120; i++) {
      let val = 0.15 + Math.random() * 0.08; // visual baseline
      
      if (genre.includes("techno") || genre.includes("house")) {
        const beatIndex = i % 15;
        if (beatIndex < 3) {
          val += 0.7 * (1 - beatIndex / 3); // Kick spikes
        } else if (beatIndex === 7 || beatIndex === 8) {
          val += 0.45; // Snare/Clap beats
        }
      } else if (genre.includes("synthwave")) {
        const beatIndex = i % 30;
        if (beatIndex < 4) {
          val += 0.8 * (1 - beatIndex / 4);
        } else if (beatIndex === 14 || beatIndex === 15) {
          val += 0.55;
        }
      } else if (genre.includes("drum")) {
        const beatIndex = i % 20;
        if (beatIndex === 0 || beatIndex === 6 || beatIndex === 11) {
          val += 0.85; // Snappy DnB breaks
        }
      } else {
        // Ambient swells
        val = 0.25 + 0.55 * Math.sin((i / 120) * Math.PI * 4);
      }
      points.push(Math.min(1.0, val));
    }
    return points;
  }

  // --- Procedural Sequencer Implementation ---

  private startSequencer(deck: DeckId, track: Track) {
    if (!this.ctx) return;
    this.stopSequencer(deck);

    this.activeTracks.set(deck, track);
    this.nextNoteTimes.set(deck, this.ctx.currentTime);
    this.stepIndices.set(deck, 0);

    const scheduleAheadTime = 0.15;
    const tickRate = 40;

    const triggerSequencerTick = () => {
      if (!this.ctx) return;
      const activeTrack = this.activeTracks.get(deck);
      if (!activeTrack) return;

      const currentRate = this.rates.get(deck) || 1.0;
      const activeBpm = activeTrack.bpm * currentRate;
      const stepDuration = 60 / activeBpm / 4; // 16th note step duration

      let nextTime = this.nextNoteTimes.get(deck) || this.ctx.currentTime;
      let stepIndex = this.stepIndices.get(deck) || 0;

      while (nextTime < this.ctx.currentTime + scheduleAheadTime) {
        this.scheduleProceduralNote(deck, activeTrack.genre, stepIndex, nextTime);
        nextTime += stepDuration;
        stepIndex = (stepIndex + 1) % 16;
      }

      this.nextNoteTimes.set(deck, nextTime);
      this.stepIndices.set(deck, stepIndex);
    };

    const intervalId = setInterval(triggerSequencerTick, tickRate);
    this.seqIntervals.set(deck, intervalId);
  }

  private stopSequencer(deck: DeckId) {
    const intervalId = this.seqIntervals.get(deck);
    if (intervalId) {
      clearInterval(intervalId);
      this.seqIntervals.delete(deck);
    }
    this.activeTracks.delete(deck);
  }

  private scheduleProceduralNote(deck: DeckId, genre: string, step: number, time: number) {
    if (!this.ctx) return;
    const dest = this.deckEqLows.get(deck);
    if (!dest) return;

    const normalizedGenre = genre.toLowerCase();

    // 1. Kick Drum Synthesizer
    let isKick = false;
    if (normalizedGenre.includes("techno") || normalizedGenre.includes("house")) {
      isKick = step === 0 || step === 4 || step === 8 || step === 12;
    } else if (normalizedGenre.includes("synthwave")) {
      isKick = step === 0 || step === 8;
    } else if (normalizedGenre.includes("drum")) {
      isKick = step === 0 || step === 6 || step === 10;
    } else if (normalizedGenre.includes("ambient")) {
      isKick = step === 0;
    }

    if (isKick) {
      this.synthesizeProceduralKick(time, dest, normalizedGenre.includes("ambient") ? 0.4 : 0.85);
    }

    // 2. Snare
    let isSnare = false;
    if (normalizedGenre.includes("synthwave") || normalizedGenre.includes("house") || normalizedGenre.includes("techno")) {
      isSnare = step === 4 || step === 12;
    } else if (normalizedGenre.includes("drum")) {
      isSnare = step === 4 || step === 12 || step === 15;
    }

    if (isSnare) {
      this.synthesizeProceduralSnare(time, dest, normalizedGenre.includes("synthwave") ? 0.7 : 0.5);
    }

    // 3. Hi-Hat
    let isHat = false;
    let volume = 0.15;
    if (normalizedGenre.includes("techno")) {
      isHat = step % 4 === 2 || step % 2 === 0;
      volume = step % 4 === 2 ? 0.25 : 0.08;
    } else if (normalizedGenre.includes("drum")) {
      isHat = step % 2 === 0;
      volume = 0.15;
    } else if (normalizedGenre.includes("synthwave") || normalizedGenre.includes("house")) {
      isHat = step % 4 === 2;
      volume = 0.2;
    }

    if (isHat) {
      this.synthesizeProceduralHat(time, dest, volume);
    }

    // 4. Bassline / Chords Synthesizer
    this.synthesizeProceduralSynth(deck, genre, step, time, dest);
  }

  private synthesizeProceduralKick(time: number, dest: AudioNode, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(dest);

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private synthesizeProceduralSnare(time: number, dest: AudioNode, volume: number) {
    if (!this.ctx) return;
    
    const bufferSize = this.ctx.sampleRate * 0.25;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    const pop = this.ctx.createOscillator();
    const popGain = this.ctx.createGain();
    pop.frequency.setValueAtTime(180, time);
    popGain.gain.setValueAtTime(volume * 0.5, time);
    popGain.gain.exponentialRampToValueAtTime(0.01, time + 0.08);

    pop.connect(popGain);
    popGain.connect(dest);

    noiseSource.start(time);
    noiseSource.stop(time + 0.25);
    pop.start(time);
    pop.stop(time + 0.1);
  }

  private synthesizeProceduralHat(time: number, dest: AudioNode, volume: number) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 0.05;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    source.start(time);
    source.stop(time + 0.06);
  }

  private synthesizeProceduralSynth(deck: DeckId, genre: string, step: number, time: number, dest: AudioNode) {
    if (!this.ctx) return;
    const g = genre.toLowerCase();

    const synthwaveNotes = [110, 110, 110, 110, 130, 130, 98, 98, 87, 87, 87, 87, 98, 98, 110, 130];
    const acidTechnoNotes = [55, 55, 110, 55, 73, 55, 147, 55, 65, 65, 130, 65, 87, 98, 110, 130];
    const houseNotes = [110, 0, 110, 0, 147, 0, 147, 165, 130, 0, 130, 0, 98, 0, 110, 0];
    const dnbNotes = [55, 0, 0, 55, 0, 73, 0, 0, 65, 0, 0, 65, 87, 87, 0, 0];
    const ambientChords = [220, 0, 0, 0, 261, 0, 0, 0, 196, 0, 0, 0, 174, 0, 0, 0];

    let playSynth = false;
    let type: OscillatorType = "sawtooth";
    let filterCutoff = 800;
    let q = 1;
    let noteHz = 0;

    if (g.includes("synthwave")) {
      noteHz = synthwaveNotes[step];
      playSynth = step % 2 === 0;
      type = "sawtooth";
      filterCutoff = 600;
    } else if (g.includes("techno")) {
      noteHz = acidTechnoNotes[step];
      playSynth = step % 4 !== 1;
      type = "sawtooth";
      filterCutoff = 350 + Math.sin(step * 0.5) * 300;
      q = 12;
    } else if (g.includes("house")) {
      noteHz = houseNotes[step];
      playSynth = noteHz > 0;
      type = "triangle";
      filterCutoff = 800;
    } else if (g.includes("drum")) {
      noteHz = dnbNotes[step];
      playSynth = noteHz > 0;
      type = "sine";
      filterCutoff = 150;
    } else if (g.includes("ambient")) {
      noteHz = ambientChords[step];
      playSynth = step === 0 || step === 8;
      type = "triangle";
      filterCutoff = 400;
    }

    if (playSynth && noteHz > 0) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(filterCutoff, time);
      filter.Q.setValueAtTime(q, time);

      osc.type = type;
      osc.frequency.setValueAtTime(noteHz, time);

      if (g.includes("techno") && step % 4 === 3) {
        osc.frequency.exponentialRampToValueAtTime(noteHz * 1.5, time + 0.15);
      }

      const isAmbient = g.includes("ambient");
      const attack = isAmbient ? 0.8 : 0.01;
      const decay = isAmbient ? 1.8 : 0.12;
      const volume = isAmbient ? 0.25 : 0.2;

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(volume, time + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, time + attack + decay);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(time);
      osc.stop(time + attack + decay + 0.1);
    }
  }
}

function sourceStopSilently(source: AudioBufferSourceNode) {
  try {
    source.stop();
  } catch (err) {}
}

export const audio = new AudioEngine();
