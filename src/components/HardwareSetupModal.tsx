/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import {
  Sliders,
  Cpu,
  Volume2,
  Usb,
  Check,
  AlertCircle,
  RefreshCw,
  X,
  Radio,
  Settings,
  Zap,
  Disc,
  ListFilter,
  Layers,
} from "lucide-react";
import { audio } from "../utils/audio";
import { DeckId, MixerMode, MidiMapItem } from "../types";

interface HardwareSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mixerMode: MixerMode;
  onMixerModeChange: (mode: MixerMode) => void;
  midiMappings: MidiMapItem[];
  onUpdateMidiMapping: (id: string, status: number, ccOrNote: number) => void;
  onResetMidiMappings: () => void;
}

export const HardwareSetupModal: React.FC<HardwareSetupModalProps> = ({
  isOpen,
  onClose,
  mixerMode,
  onMixerModeChange,
  midiMappings,
  onUpdateMidiMapping,
  onResetMidiMappings,
}) => {
  const [activeTab, setActiveTab] = useState<"routing" | "midi" | "monitor">("routing");

  const [midiDevices, setMidiDevices] = useState<{ id: string; name: string; manufacturer?: string }[]>([]);
  const [midiSupported, setMidiSupported] = useState<boolean>(true);
  const [midiActive, setMidiActive] = useState<boolean>(false);
  const [midiLogs, setMidiLogs] = useState<string[]>([]);

  const [audioOutputs, setAudioOutputs] = useState<{ deviceId: string; label: string }[]>([]);
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>("default");
  const [soundcardStatus, setSoundcardStatus] = useState<string>("Ready (Internal / System)");

  // MIDI Learn State
  const [learningMapId, setLearningMapId] = useState<string | null>(null);

  // External Channel Routing State (Audio 8 DJ Channels 1/2, 3/4, 5/6, 7/8)
  const [externalRouting, setExternalRouting] = useState<Record<DeckId, string>>({
    A: "Ch 1/2 (Out 1/2)",
    B: "Ch 3/4 (Out 3/4)",
    C: "Ch 5/6 (Out 5/6)",
    D: "Ch 7/8 (Out 7/8)",
  });

  // Scan Audio Output Devices
  const scanAudioOutputs = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const outputs = devices
          .filter((d) => d.kind === "audiooutput")
          .map((d, idx) => ({
            deviceId: d.deviceId,
            label: d.label || `Audio 8 DJ / External Soundcard ${idx + 1}`,
          }));
        setAudioOutputs(outputs);
      }
    } catch (e) {
      console.warn("Could not enumerate audio output devices", e);
    }
  };

  // Initialize Web MIDI Access
  const requestMidiAccess = async () => {
    if (!("requestMIDIAccess" in navigator)) {
      setMidiSupported(false);
      return;
    }

    try {
      const midiAccess = await (navigator as any).requestMIDIAccess();
      setMidiActive(true);

      const updateInputs = () => {
        const inputs: { id: string; name: string; manufacturer?: string }[] = [];
        midiAccess.inputs.forEach((input: any) => {
          inputs.push({
            id: input.id,
            name: input.name || "Traktor Kontrol X1 / MIDI Controller",
            manufacturer: input.manufacturer || "Native Instruments",
          });

          // Attach listener for MIDI Messages
          input.onmidimessage = (event: any) => {
            const [status, data1, data2] = event.data;
            const logStr = `[MIDI IN] ${input.name}: Status 0x${status.toString(16).toUpperCase()} | CC/Note ${data1} | Val ${data2}`;
            setMidiLogs((prev) => [logStr, ...prev.slice(0, 20)]);

            // If learning mode is active for a specific map item, auto-bind it!
            if (learningMapId) {
              onUpdateMidiMapping(learningMapId, status, data1);
              setLearningMapId(null);
            }
          };
        });

        setMidiDevices(inputs);
      };

      updateInputs();
      midiAccess.onstatechange = updateInputs;
    } catch (err) {
      console.error("MIDI Access Error:", err);
      setMidiSupported(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      scanAudioOutputs();
      if ("requestMIDIAccess" in navigator) {
        requestMidiAccess();
      }
    }
  }, [isOpen, learningMapId]);

  const handleAudioOutputChange = async (deviceId: string) => {
    setSelectedAudioOutput(deviceId);
    const success = await audio.setAudioOutputDevice(deviceId);
    if (success) {
      const label = audioOutputs.find((o) => o.deviceId === deviceId)?.label || "Audio 8 DJ Interface";
      setSoundcardStatus(`Active Multi-channel Interface: ${label}`);
    } else {
      setSoundcardStatus("Using Web Audio Multi-Channel Output Nodes");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-950 border border-white/10 w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col font-sans text-slate-300">
        {/* Modal Header Bar */}
        <div className="bg-slate-900 border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Usb className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-black text-white tracking-wider uppercase flex items-center gap-2">
                TRAKTOR HARDWARE & AUDIO ROUTING SETUP
                <span className="bg-amber-500 text-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                  PRO 4
                </span>
              </h2>
              <p className="text-[10px] text-slate-400 font-mono">
                EXTERNAL MIXER MODE (AUDIO 8 DJ) & TRAKTOR KONTROL X1 / F1 / Z1 MIDI MAPPING
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900/80 border-b border-white/10 px-4 pt-2 gap-2 text-[10px] font-black uppercase tracking-wider">
          <button
            onClick={() => setActiveTab("routing")}
            className={`px-3 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === "routing"
                ? "bg-slate-950 text-cyan-400 border-t-2 border-cyan-400 font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" /> Output Routing (Audio 8 DJ)
          </button>
          <button
            onClick={() => setActiveTab("midi")}
            className={`px-3 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === "midi"
                ? "bg-slate-950 text-amber-400 border-t-2 border-amber-400 font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Usb className="w-3.5 h-3.5" /> MIDI Mapper (Traktor X1)
          </button>
          <button
            onClick={() => setActiveTab("monitor")}
            className={`px-3 py-1.5 rounded-t-lg transition flex items-center gap-1.5 ${
              activeTab === "monitor"
                ? "bg-slate-950 text-emerald-400 border-t-2 border-emerald-400 font-black"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Zap className="w-3.5 h-3.5" /> Signal Monitor
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: EXTERNAL MIXER & AUDIO 8 DJ ROUTING */}
          {activeTab === "routing" && (
            <div className="flex flex-col gap-4">
              {/* Mixer Mode Toggle Card */}
              <div className="bg-slate-900/80 border border-white/10 rounded-lg p-3">
                <div className="text-[11px] font-black text-white uppercase mb-2 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  1. Select Traktor Mixer Architecture:
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Internal Mixer Mode */}
                  <button
                    onClick={() => onMixerModeChange("internal")}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      mixerMode === "internal"
                        ? "bg-cyan-950/40 border-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-[11px] uppercase text-cyan-400">
                        Internal Mixer Mode
                      </span>
                      {mixerMode === "internal" && (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[9.5px] leading-normal text-slate-300 font-normal">
                      Mix decks A, B, C, D inside the application using TrakDroid's central 4-channel matrix mixer, crossfader, EQs, and master output bus.
                    </p>
                  </button>

                  {/* External Mixer Mode */}
                  <button
                    onClick={() => onMixerModeChange("external")}
                    className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                      mixerMode === "external"
                        ? "bg-amber-950/40 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "bg-slate-950 border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-[11px] uppercase text-amber-400">
                        External Mixer Mode (Audio 8 DJ)
                      </span>
                      {mixerMode === "external" && (
                        <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[9.5px] leading-normal text-slate-300 font-normal">
                      Route each deck (A, B, C, D) directly to independent physical outputs on your multi-channel soundcard (e.g. Pioneer DJM, Allen & Heath, Audio 8 DJ).
                    </p>
                  </button>
                </div>
              </div>

              {/* Soundcard Selection */}
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-white uppercase flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    2. Multi-Channel External Audio Interface
                  </span>
                  <button
                    onClick={scanAudioOutputs}
                    className="flex items-center gap-1 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded border border-white/10 font-mono"
                  >
                    <RefreshCw className="w-3 h-3" /> Rescan Interfaces
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-[10px]">
                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">
                      Audio Interface Hardware:
                    </label>
                    <select
                      value={selectedAudioOutput}
                      onChange={(e) => handleAudioOutputChange(e.target.value)}
                      className="w-full bg-black text-emerald-400 font-mono text-[10px] border border-white/10 rounded p-1.5 outline-none cursor-pointer"
                    >
                      <option value="default">Audio 8 DJ / Multi-Channel Interface</option>
                      {audioOutputs.map((out) => (
                        <option key={out.deviceId} value={out.deviceId}>
                          {out.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] text-slate-400 font-bold uppercase mb-1">
                      Status & Routing State:
                    </label>
                    <div className="bg-black/80 border border-white/10 rounded p-1.5 font-mono text-emerald-400 text-[10px] flex items-center gap-1.5 truncate">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{soundcardStatus}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Output Channel Routing Matrix (Audio 8 DJ Channels) */}
              <div className="bg-slate-900/60 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
                <span className="text-[11px] font-black text-white uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-400" />
                  3. External Channel Output Routing Matrix (Audio 8 DJ / Audio 10)
                </span>

                <div className="grid grid-cols-2 gap-3 mt-1">
                  {(["A", "B", "C", "D"] as DeckId[]).map((deckId) => (
                    <div
                      key={deckId}
                      className="bg-black border border-white/10 p-2.5 rounded flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded font-black text-[10px] ${
                            deckId === "A"
                              ? "bg-cyan-500 text-black"
                              : deckId === "B"
                              ? "bg-amber-500 text-black"
                              : deckId === "C"
                              ? "bg-blue-500 text-black"
                              : "bg-emerald-500 text-black"
                          }`}
                        >
                          DECK {deckId}
                        </span>
                        <span className="text-[10px] font-mono text-slate-300">
                          {deckId === "A"
                            ? "Out 1/2"
                            : deckId === "B"
                            ? "Out 3/4"
                            : deckId === "C"
                            ? "Out 5/6"
                            : "Out 7/8"}
                        </span>
                      </div>

                      <select
                        value={externalRouting[deckId]}
                        onChange={(e) =>
                          setExternalRouting((prev) => ({
                            ...prev,
                            [deckId]: e.target.value,
                          }))
                        }
                        className="bg-slate-900 text-amber-400 border border-white/20 text-[9.5px] font-mono rounded px-2 py-1 outline-none cursor-pointer"
                      >
                        <option value="Ch 1/2 (Out 1/2)">Audio 8 DJ: Ch 1/2 (Out 1/2)</option>
                        <option value="Ch 3/4 (Out 3/4)">Audio 8 DJ: Ch 3/4 (Out 3/4)</option>
                        <option value="Ch 5/6 (Out 5/6)">Audio 8 DJ: Ch 5/6 (Out 5/6)</option>
                        <option value="Ch 7/8 (Out 7/8)">Audio 8 DJ: Ch 7/8 (Out 7/8)</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INTERACTIVE MIDI MAPPER (TRAKTOR X1 / USB MIDI) */}
          {activeTab === "midi" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between bg-slate-900/80 border border-white/10 p-3 rounded-lg">
                <div>
                  <span className="text-[11px] font-black text-white uppercase block">
                    Traktor Kontrol X1 / MIDI Controller Mapping Table
                  </span>
                  <span className="text-[9.5px] text-slate-400 font-mono">
                    Click 'LEARN' on any parameter, then turn a knob or press a button on your hardware to bind.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onResetMidiMappings}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-mono px-2.5 py-1 rounded border border-white/10"
                  >
                    Reset Traktor X1 Defaults
                  </button>
                  <button
                    onClick={requestMidiAccess}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-black text-[9px] uppercase px-2.5 py-1 rounded shadow"
                  >
                    Rescan MIDI Devices
                  </button>
                </div>
              </div>

              {/* Mappings Table */}
              <div className="bg-black rounded border border-white/10 overflow-hidden">
                <table className="w-full text-left font-mono text-[10px]">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400 font-black text-[8.5px] uppercase border-b border-white/10">
                      <th className="p-2">DECK</th>
                      <th className="p-2">PARAMETER</th>
                      <th className="p-2">TRAKTOR X1 CONTROL</th>
                      <th className="p-2">MIDI CC / NOTE</th>
                      <th className="p-2 text-center">LEARN MAPPING</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {midiMappings.map((map) => {
                      const isLearning = learningMapId === map.id;
                      return (
                        <tr key={map.id} className="hover:bg-slate-900/60 transition">
                          <td className="p-2 font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                map.deckId === "A"
                                  ? "bg-cyan-500 text-black"
                                  : map.deckId === "B"
                                  ? "bg-amber-500 text-black"
                                  : map.deckId === "C"
                                  ? "bg-blue-500 text-black"
                                  : "bg-emerald-500 text-black"
                              }`}
                            >
                              DECK {map.deckId}
                            </span>
                          </td>

                          <td className="p-2 font-bold text-white">{map.label}</td>

                          <td className="p-2 text-slate-400">{map.id}</td>

                          <td className="p-2 text-amber-400 font-bold">
                            {map.ccOrNote !== null ? `CC / Note ${map.ccOrNote}` : "Unmapped"}
                          </td>

                          <td className="p-2 text-center">
                            <button
                              onClick={() => setLearningMapId(isLearning ? null : map.id)}
                              className={`px-2 py-0.5 rounded text-[8.5px] font-black uppercase tracking-wider transition ${
                                isLearning
                                  ? "bg-red-500 text-white animate-pulse shadow-[0_0_10px_#ef4444]"
                                  : "bg-cyan-500 hover:bg-cyan-400 text-black"
                              }`}
                            >
                              {isLearning ? "PRESS KEY / TURN KNOB..." : "LEARN"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: SIGNAL MONITOR */}
          {activeTab === "monitor" && (
            <div className="flex flex-col gap-3">
              <div className="bg-slate-900/80 border border-white/10 p-3 rounded-lg">
                <span className="text-[11px] font-black text-white uppercase block mb-1">
                  Connected USB MIDI Hardware Devices:
                </span>
                {midiDevices.length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic">
                    No USB MIDI hardware detected. Connect a Traktor Kontrol X1 / MIDI controller and click Rescan.
                  </div>
                ) : (
                  midiDevices.map((dev) => (
                    <div
                      key={dev.id}
                      className="bg-black border border-amber-500/30 rounded p-2 flex items-center justify-between text-[10px]"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
                        <span className="font-bold text-white">{dev.name}</span>
                        <span className="text-slate-500 font-mono text-[9px]">({dev.manufacturer})</span>
                      </div>
                      <span className="bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                        ONLINE & ACTIVE
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div>
                <span className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider block mb-1">
                  Real-time MIDI Input Signal Activity Stream:
                </span>
                <div className="bg-black rounded border border-white/10 p-2 h-36 overflow-y-auto font-mono text-[9px] text-amber-400 space-y-0.5 shadow-inner">
                  {midiLogs.length === 0 ? (
                    <span className="text-slate-600 italic">
                      Waiting for incoming MIDI messages... (Turn any knob or press buttons on your hardware)
                    </span>
                  ) : (
                    midiLogs.map((log, idx) => <div key={idx}>{log}</div>)
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-900 border-t border-white/10 px-4 py-2.5 flex justify-between items-center">
          <span className="text-[9px] font-mono text-slate-500">
            {mixerMode === "external"
              ? "EXTERNAL MIXER: Audio 8 DJ Multi-channel Mode Active"
              : "INTERNAL MIXER: Processing Matrix Active"}
          </span>
          <button
            onClick={onClose}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[10px] uppercase tracking-wider px-4 py-1.5 rounded transition"
          >
            CLOSE SETUP
          </button>
        </div>
      </div>
    </div>
  );
};
