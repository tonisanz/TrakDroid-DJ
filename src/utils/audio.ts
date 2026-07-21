/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Track } from "../types";

class AudioEngine {
  public ctx: AudioContext | null = null;

  // Audio Nodes for Deck A (Left)
  private deckAGain: GainNode | null = null;
  private deckAEqLow: BiquadFilterNode | null = null;
  private deckAEqMid: BiquadFilterNode | null = null;
  private deckAEqHigh: BiquadFilterNode | null = null;
  private deckAFilter: BiquadFilterNode | null = null;
  private deckAAnalyzer: AnalyserNode | null = null;

  // Audio Nodes for Deck B (Right)
  private deckBGain: GainNode | null = null;
  private deckBEqLow: BiquadFilterNode | null = null;
  private deckBEqMid: BiquadFilterNode | null = null;
  private deckBEqHigh: BiquadFilterNode | null = null;
  private deckBFilter: BiquadFilterNode | null = null;
  private deckBAnalyzer: AnalyserNode | null = null;

  // Crossfader and Master Nodes
  private crossfaderGainA: GainNode | null = null;
  private crossfaderGainB: GainNode | null = null;
  private masterGain: GainNode | null = null;
  public masterAnalyzer: AnalyserNode | null = null;

  // User uploaded tracks buffers
  private trackBuffers: Map<string, AudioBuffer> = new Map();
  private deckASource: AudioBufferSourceNode | null = null;
  private deckBSource: AudioBufferSourceNode | null = null;
  
  // Track start times for progress calculation
  private deckAStartTime = 0;
  private deckAPauseTime = 0;
  private deckBStartTime = 0;
  private deckBPauseTime = 0;

  // Procedural Sequencer States
  private seqIntervalA: any = null;
  private seqIntervalB: any = null;
  private nextNoteTimeA = 0;
  private nextNoteTimeB = 0;
  private stepIndexA = 0;
  private stepIndexB = 0;

  // Active track settings
  private activeTrackA: Track | null = null;
  private activeTrackB: Track | null = null;
  private rateA = 1.0;
  private rateB = 1.0;

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

    // Crossfader node channels
    this.crossfaderGainA = this.ctx.createGain();
    this.crossfaderGainB = this.ctx.createGain();
    this.crossfaderGainA.gain.setValueAtTime(0.5, this.ctx.currentTime);
    this.crossfaderGainB.gain.setValueAtTime(0.5, this.ctx.currentTime);

    // Connect crossfader and master
    this.crossfaderGainA.connect(this.masterGain);
    this.crossfaderGainB.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyzer);
    this.masterAnalyzer.connect(this.ctx.destination);

    // Build pipelines for both decks
    this.buildDeckPipeline("A");
    this.buildDeckPipeline("B");
  }

  private buildDeckPipeline(deck: "A" | "B") {
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

    const crossfaderDest = deck === "A" ? this.crossfaderGainA! : this.crossfaderGainB!;
    analyzer.connect(crossfaderDest);

    if (deck === "A") {
      this.deckAGain = gainNode;
      this.deckAEqLow = eqLow;
      this.deckAEqMid = eqMid;
      this.deckAEqHigh = eqHigh;
      this.deckAFilter = filter;
      this.deckAAnalyzer = analyzer;
    } else {
      this.deckBGain = gainNode;
      this.deckBEqLow = eqLow;
      this.deckBEqMid = eqMid;
      this.deckBEqHigh = eqHigh;
      this.deckBFilter = filter;
      this.deckBAnalyzer = analyzer;
    }
  }

  // --- Dynamic Audio Parameter Controls ---

  public setVolume(deck: "A" | "B", value: number) {
    this.init();
    const node = deck === "A" ? this.deckAGain : this.deckBGain;
    if (node && this.ctx) {
      node.gain.linearRampToValueAtTime(value, this.ctx.currentTime + 0.05);
    }
  }

  public setCrossfader(value: number) {
    // value ranges from -1.0 (fully left Deck A) to +1.0 (fully right Deck B)
    this.init();
    if (!this.ctx || !this.crossfaderGainA || !this.crossfaderGainB) return;

    // Equal-power crossfade curve
    const x = (value + 1) / 2; // Normalize to 0 to 1
    const gainA = Math.cos(x * 0.5 * Math.PI);
    const gainB = Math.sin(x * 0.5 * Math.PI);

    this.crossfaderGainA.gain.setValueAtTime(gainA, this.ctx.currentTime);
    this.crossfaderGainB.gain.setValueAtTime(gainB, this.ctx.currentTime);
  }

  public setEQ(deck: "A" | "B", type: "low" | "mid" | "high", db: number) {
    this.init();
    const nodes = {
      low: deck === "A" ? this.deckAEqLow : this.deckBEqLow,
      mid: deck === "A" ? this.deckAEqMid : this.deckBEqMid,
      high: deck === "A" ? this.deckAEqHigh : this.deckBEqHigh,
    };
    const node = nodes[type];
    if (node && this.ctx) {
      node.gain.setValueAtTime(db, this.ctx.currentTime);
    }
  }

  public setFilter(deck: "A" | "B", value: number) {
    // value goes from -1 (fully lowpass) to 0 (neutral) to +1 (fully highpass)
    this.init();
    const filterNode = deck === "A" ? this.deckAFilter : this.deckBFilter;
    if (!filterNode || !this.ctx) return;

    if (value < -0.05) {
      // Lowpass filter sweep
      filterNode.type = "lowpass";
      // Map -1 to 0 to cutoffs 100Hz to 20000Hz
      const hz = Math.max(80, 20000 * Math.pow(value + 1, 2.5));
      filterNode.frequency.setValueAtTime(hz, this.ctx.currentTime);
    } else if (value > 0.05) {
      // Highpass filter sweep
      filterNode.type = "highpass";
      // Map 0 to 1 to cutoffs 10Hz to 6000Hz
      const hz = Math.min(6000, 10 + 6000 * Math.pow(value, 2.0));
      filterNode.frequency.setValueAtTime(hz, this.ctx.currentTime);
    } else {
      // Neutral - turn filter off/lowpass fully open
      filterNode.type = "lowpass";
      filterNode.frequency.setValueAtTime(20000, this.ctx.currentTime);
    }
  }

  public setPitch(deck: "A" | "B", pitchPercent: number) {
    this.init();
    // Map -50% ... +50% pitch shift to 0.5 ... 1.5 playback speed rate
    const rate = 1.0 + (pitchPercent / 100);
    if (deck === "A") {
      this.rateA = rate;
      if (this.deckASource) {
        this.deckASource.playbackRate.setValueAtTime(rate, this.ctx!.currentTime);
      }
    } else {
      this.rateB = rate;
      if (this.deckBSource) {
        this.deckBSource.playbackRate.setValueAtTime(rate, this.ctx!.currentTime);
      }
    }
  }

  // --- Deck Loading & Playback ---

  public async loadUserFile(deck: "A" | "B", file: File, trackId: string): Promise<number> {
    this.init();
    if (!this.ctx) return 120;

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.trackBuffers.set(trackId, audioBuffer);
    
    // Attempt basic BPM estimation or default to 125
    return 125;
  }

  public playTrack(deck: "A" | "B", track: Track, startTimeOffset = 0) {
    this.init();
    if (!this.ctx) return;

    this.stopTrack(deck);

    if (track.isProcedural) {
      // Run the synthesis loop sequence
      this.startSequencer(deck, track);
    } else {
      // User uploaded file buffer
      const buffer = this.trackBuffers.get(track.id);
      if (!buffer) return;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      // Connect source to EQ cascade input
      const pipelineInput = deck === "A" ? this.deckAEqLow! : this.deckBEqLow!;
      source.connect(pipelineInput);

      const rate = deck === "A" ? this.rateA : this.rateB;
      source.playbackRate.setValueAtTime(rate, this.ctx.currentTime);

      const startOffset = startTimeOffset % buffer.duration;
      source.start(0, startOffset);

      if (deck === "A") {
        this.deckASource = source;
        this.activeTrackA = track;
        this.deckAStartTime = this.ctx.currentTime - startOffset / rate;
      } else {
        this.deckBSource = source;
        this.activeTrackB = track;
        this.deckBStartTime = this.ctx.currentTime - startOffset / rate;
      }
    }
  }

  public stopTrack(deck: "A" | "B") {
    if (deck === "A") {
      if (this.deckASource) {
        try { sourceStopSilently(this.deckASource); } catch(e){}
        this.deckASource = null;
      }
      this.stopSequencer("A");
    } else {
      if (this.deckBSource) {
        try { sourceStopSilently(this.deckBSource); } catch(e){}
        this.deckBSource = null;
      }
      this.stopSequencer("B");
    }
  }

  public getPlaybackProgress(deck: "A" | "B", duration: number): number {
    if (!this.ctx) return 0;
    if (deck === "A") {
      if (this.activeTrackA?.isProcedural) {
        return (this.ctx.currentTime % 16) / 16; // Procedural loops wrap every 16 seconds
      }
      if (!this.deckASource) return 0;
      const rate = this.rateA;
      const elapsed = (this.ctx.currentTime - this.deckAStartTime) * rate;
      return duration > 0 ? (elapsed % duration) / duration : 0;
    } else {
      if (this.activeTrackB?.isProcedural) {
        return (this.ctx.currentTime % 16) / 16;
      }
      if (!this.deckBSource) return 0;
      const rate = this.rateB;
      const elapsed = (this.ctx.currentTime - this.deckBStartTime) * rate;
      return duration > 0 ? (elapsed % duration) / duration : 0;
    }
  }

  // --- Procedural Sequencer Implementation ---

  private startSequencer(deck: "A" | "B", track: Track) {
    if (!this.ctx) return;
    this.stopSequencer(deck);

    const isDeckA = deck === "A";
    if (isDeckA) {
      this.activeTrackA = track;
      this.nextNoteTimeA = this.ctx.currentTime;
      this.stepIndexA = 0;
    } else {
      this.activeTrackB = track;
      this.nextNoteTimeB = this.ctx.currentTime;
      this.stepIndexB = 0;
    }

    const scheduleAheadTime = 0.15; // Schedule 150ms in advance
    const tickRate = 40; // Poll every 40ms

    const triggerSequencerTick = () => {
      if (!this.ctx) return;
      const activeTrack = isDeckA ? this.activeTrackA : this.activeTrackB;
      if (!activeTrack) return;

      const currentRate = isDeckA ? this.rateA : this.rateB;
      const activeBpm = activeTrack.bpm * currentRate;
      const stepDuration = 60 / activeBpm / 4; // 16th note step duration in seconds

      let nextTime = isDeckA ? this.nextNoteTimeA : this.nextNoteTimeB;
      let stepIndex = isDeckA ? this.stepIndexA : this.stepIndexB;

      while (nextTime < this.ctx.currentTime + scheduleAheadTime) {
        this.scheduleProceduralNote(deck, activeTrack.genre, stepIndex, nextTime);
        nextTime += stepDuration;
        stepIndex = (stepIndex + 1) % 16;
      }

      if (isDeckA) {
        this.nextNoteTimeA = nextTime;
        this.stepIndexA = stepIndex;
      } else {
        this.nextNoteTimeB = nextTime;
        this.stepIndexB = stepIndex;
      }
    };

    if (isDeckA) {
      this.seqIntervalA = setInterval(triggerSequencerTick, tickRate);
    } else {
      this.seqIntervalB = setInterval(triggerSequencerTick, tickRate);
    }
  }

  private stopSequencer(deck: "A" | "B") {
    if (deck === "A") {
      if (this.seqIntervalA) {
        clearInterval(this.seqIntervalA);
        this.seqIntervalA = null;
      }
      this.activeTrackA = null;
    } else {
      if (this.seqIntervalB) {
        clearInterval(this.seqIntervalB);
        this.seqIntervalB = null;
      }
      this.activeTrackB = null;
    }
  }

  private scheduleProceduralNote(deck: "A" | "B", genre: string, step: number, time: number) {
    if (!this.ctx) return;
    const dest = deck === "A" ? this.deckAEqLow! : this.deckBEqLow!;

    const normalizedGenre = genre.toLowerCase();

    // 1. Kick Drum Synthesizer (Heavy Bass Drum)
    // Synthwave (1 & 9), Techno/House (1, 5, 9, 13 - four on the floor), DnB (1, 7, 11)
    let isKick = false;
    if (normalizedGenre.includes("techno") || normalizedGenre.includes("house")) {
      isKick = step === 0 || step === 4 || step === 8 || step === 12;
    } else if (normalizedGenre.includes("synthwave")) {
      isKick = step === 0 || step === 8;
    } else if (normalizedGenre.includes("drum")) {
      isKick = step === 0 || step === 6 || step === 10;
    } else if (normalizedGenre.includes("ambient")) {
      isKick = step === 0; // Very sparse kick for ambient
    }

    if (isKick) {
      this.synthesizeProceduralKick(time, dest, normalizedGenre.includes("ambient") ? 0.4 : 0.85);
    }

    // 2. Snare / Gated Snare (Hype drum impact)
    // Synthwave & House (5 & 13), DnB (4 & 12)
    let isSnare = false;
    if (normalizedGenre.includes("synthwave") || normalizedGenre.includes("house") || normalizedGenre.includes("techno")) {
      isSnare = step === 4 || step === 12;
    } else if (normalizedGenre.includes("drum")) {
      isSnare = step === 4 || step === 12 || step === 15;
    }

    if (isSnare) {
      this.synthesizeProceduralSnare(time, dest, normalizedGenre.includes("synthwave") ? 0.7 : 0.5);
    }

    // 3. Hi-Hat Synthesizer
    // Techno (offbeats 2, 6, 10, 14), DnB/Synthwave (running 16ths or 8ths)
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

    // 4. Bassline / Chords Synthesizer (Generates cool sequences)
    this.synthesizeProceduralSynth(deck, genre, step, time, dest);
  }

  // --- Procedural Instruments ---

  private synthesizeProceduralKick(time: number, dest: AudioNode, volume: number) {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(dest);

    osc.frequency.setValueAtTime(150, time);
    // Exponential sweep down for punchy kick drum
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.18);

    osc.start(time);
    osc.stop(time + 0.2);
  }

  private synthesizeProceduralSnare(time: number, dest: AudioNode, volume: number) {
    if (!this.ctx) return;
    
    // Snare white noise burst
    const bufferSize = this.ctx.sampleRate * 0.25; // 250ms
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.ctx.createBufferSource();
    noiseSource.buffer = buffer;

    // Filter noise to sound crisp
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    noiseSource.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    // Add a quick sine pop at 180Hz for body
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
    // Fast short white noise burst with highpass filter
    const bufferSize = this.ctx.sampleRate * 0.05; // 50ms
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

  private synthesizeProceduralSynth(deck: "A" | "B", genre: string, step: number, time: number, dest: AudioNode) {
    if (!this.ctx) return;
    const g = genre.toLowerCase();

    // 16-step bassline patterns
    let noteHz = 0;
    const synthwaveNotes = [110, 110, 110, 110, 130, 130, 98, 98, 87, 87, 87, 87, 98, 98, 110, 130]; // Bass pattern in Hz (A, C, G, F)
    const acidTechnoNotes = [55, 55, 110, 55, 73, 55, 147, 55, 65, 65, 130, 65, 87, 98, 110, 130];
    const houseNotes = [110, 0, 110, 0, 147, 0, 147, 165, 130, 0, 130, 0, 98, 0, 110, 0];
    const dnbNotes = [55, 0, 0, 55, 0, 73, 0, 0, 65, 0, 0, 65, 87, 87, 0, 0];
    const ambientChords = [220, 0, 0, 0, 261, 0, 0, 0, 196, 0, 0, 0, 174, 0, 0, 0];

    let playSynth = false;
    let type: OscillatorType = "sawtooth";
    let filterCutoff = 800;
    let q = 1;

    if (g.includes("synthwave")) {
      noteHz = synthwaveNotes[step];
      playSynth = step % 2 === 0; // Running 8th note bassline
      type = "sawtooth";
      filterCutoff = 600;
    } else if (g.includes("techno")) {
      noteHz = acidTechnoNotes[step];
      playSynth = step % 4 !== 1; // Squelchy 303 groove
      type = "sawtooth";
      filterCutoff = 350 + Math.sin(step * 0.5) * 300; // Sweep filter automatically!
      q = 12; // Resonant squeal
    } else if (g.includes("house")) {
      noteHz = houseNotes[step];
      playSynth = noteHz > 0;
      type = "triangle";
      filterCutoff = 800;
    } else if (g.includes("drum")) {
      noteHz = dnbNotes[step];
      playSynth = noteHz > 0;
      type = "sine"; // Pure sub bass rattle
      filterCutoff = 150;
    } else if (g.includes("ambient")) {
      noteHz = ambientChords[step];
      playSynth = step === 0 || step === 8; // Ultra slow pad trigger
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

      // Pitch bend for slide effects in Techno
      if (g.includes("techno") && step % 4 === 3) {
        osc.frequency.exponentialRampToValueAtTime(noteHz * 1.5, time + 0.15);
      }

      // Gain envelope
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

  // --- Realtime Sound FX Synthesizers (Sample Pads) ---

  public triggerSample(sampleType: string) {
    this.init();
    if (!this.ctx || !this.masterGain) return;

    const dest = this.ctx.destination;

    switch (sampleType) {
      case "airhorn": {
        // Dynamic detuned square waves + fast vibrato frequency modulation = classic Jamaican airhorn
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const biquad = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc1.type = "square";
        osc2.type = "square";
        osc1.frequency.setValueAtTime(660, this.ctx.currentTime);
        osc2.frequency.setValueAtTime(664, this.ctx.currentTime); // Detuned

        // Vibrato modulation
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(14, this.ctx.currentTime); // Fast rattle
        lfoGain.gain.setValueAtTime(25, this.ctx.currentTime); // Pitch depth

        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);

        biquad.type = "bandpass";
        biquad.frequency.setValueAtTime(900, this.ctx.currentTime);
        biquad.Q.setValueAtTime(2, this.ctx.currentTime);

        gain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.35, this.ctx.currentTime + 0.5); // Hold
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.2); // Decay

        osc1.connect(biquad);
        osc2.connect(biquad);
        biquad.connect(gain);
        gain.connect(dest);

        lfo.start();
        osc1.start();
        osc2.start();

        lfo.stop(this.ctx.currentTime + 1.3);
        osc1.stop(this.ctx.currentTime + 1.3);
        osc2.stop(this.ctx.currentTime + 1.3);
        break;
      }
      case "siren": {
        // High frequency triangle wave swept up and down continuously
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const gain = this.ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);

        lfo.type = "sine";
        lfo.frequency.setValueAtTime(2.5, this.ctx.currentTime); // 2.5 oscillations per second
        lfoGain.gain.setValueAtTime(300, this.ctx.currentTime); // Sweeps 500Hz - 1100Hz

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.0); // 2 second fade out

        osc.connect(gain);
        gain.connect(dest);

        lfo.start();
        osc.start();

        lfo.stop(this.ctx.currentTime + 2.1);
        osc.stop(this.ctx.currentTime + 2.1);
        break;
      }
      case "laser": {
        // Lightning fast pitch down-sweep
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(3500, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(dest);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
        break;
      }
      case "bassdrop": {
        // Extreme low frequency bass drop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = "sine";
        osc.frequency.setValueAtTime(100, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 1.5);

        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 1.8);

        osc.connect(gain);
        gain.connect(dest);

        osc.start();
        osc.stop(this.ctx.currentTime + 1.9);
        break;
      }
      case "white_noise_sweep": {
        // Huge atmospheric build sweep
        const bufferSize = this.ctx.sampleRate * 2.5; // 2.5 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const source = this.ctx.createBufferSource();
        source.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(1.5, this.ctx.currentTime);
        filter.frequency.setValueAtTime(150, this.ctx.currentTime);
        // Sweep cutoff frequency up high!
        filter.frequency.exponentialRampToValueAtTime(7000, this.ctx.currentTime + 2.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2.5);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        source.start();
        source.stop(this.ctx.currentTime + 2.6);
        break;
      }
    }
  }

  // --- Real-time Waveform Rendering Helpers ---

  public getAnalyserData(deck: "A" | "B" | "master", array: Uint8Array) {
    if (deck === "master") {
      if (this.masterAnalyzer) {
        this.masterAnalyzer.getByteTimeDomainData(array);
      }
    } else {
      const node = deck === "A" ? this.deckAAnalyzer : this.deckBAnalyzer;
      if (node) {
        node.getByteFrequencyData(array);
      }
    }
  }

  public getPeakLevel(deck: "A" | "B"): number {
    const node = deck === "A" ? this.deckAAnalyzer : this.deckBAnalyzer;
    if (!node || !this.ctx) return 0;
    const isPlaying = deck === "A" ? (!!this.deckASource || !!this.seqIntervalA) : (!!this.deckBSource || !!this.seqIntervalB);
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
}

// Helper to safely stop sources in Safari/Chrome without exceptions
function sourceStopSilently(source: AudioBufferSourceNode) {
  try {
    source.stop();
  } catch (err) {
    // Already stopped or not started
  }
}

export const audio = new AudioEngine();
