/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Sparkles, Send, Play, CheckCircle, ArrowRight, Music, Disc } from "lucide-react";
import { DeckState, AiResponse, Track } from "../types";

interface AiCoachProps {
  stateA: DeckState;
  stateB: DeckState;
  crossfader: number;
  activeSamples: string[];
  onLoadSuggestedTrack: (track: Track, targetDeck: "A" | "B") => void;
}

export const AiCoach: React.FC<AiCoachProps> = ({
  stateA,
  stateB,
  crossfader,
  activeSamples,
  onLoadSuggestedTrack,
}) => {
  const [userPrompt, setUserPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<AiResponse | null>({
    hypeComment: "¡Ey! Bienvenido a TRAKTOR DJ Studio. Soy tu AI Co-host. Carga un loop procedimental en la Cubierta A y B, ajusta el crossfader, o toca los soundpads de abajo, ¡y haz clic en 'Analizar Mezcla' para que te dé consejos técnicos de transición profesionales!",
    transitionTips: [
      "Carga un track en la Cubierta A y otro de tempo similar en la Cubierta B.",
      "Ajusta los faders de volumen y el crossfader para mezclar los canales.",
      "¡Hazme cualquier pregunta o haz clic en 'Analizar Mezcla' para sincronizar tu ritmo!"
    ],
    musicRecommendations: [
      { title: "Acid Hard Techno", genre: "Acid Techno", suggestedBpm: 135, transitionStyle: "Sudden Drop Slam" },
      { title: "80s Retro Ride", genre: "Synthwave", suggestedBpm: 110, transitionStyle: "Filter Fade Blend" }
    ]
  });

  const [checkedTips, setCheckedTips] = useState<Record<number, boolean>>({});

  const handleAnalyzeMix = async (customPrompt?: string) => {
    setIsLoading(true);
    setError(null);
    setCheckedTips({});

    try {
      // Build full mixer state schema
      const payload = {
        deckA: {
          trackName: stateA.track ? `${stateA.track.title} - ${stateA.track.artist}` : null,
          bpm: stateA.bpm,
          pitch: stateA.pitchPercent,
          volume: stateA.volume,
          eqLow: stateA.eqLow,
          eqMid: stateA.eqMid,
          eqHigh: stateA.eqHigh,
          filter: stateA.filterCutoff,
          isPlaying: stateA.isPlaying,
        },
        deckB: {
          trackName: stateB.track ? `${stateB.track.title} - ${stateB.track.artist}` : null,
          bpm: stateB.bpm,
          pitch: stateB.pitchPercent,
          volume: stateB.volume,
          eqLow: stateB.eqLow,
          eqMid: stateB.eqMid,
          eqHigh: stateB.eqHigh,
          filter: stateB.filterCutoff,
          isPlaying: stateB.isPlaying,
        },
        mixer: {
          crossfader,
          activeSamples,
        },
        userPrompt: customPrompt || userPrompt || "Dame un consejo de transición profesional sobre mi estado de mezcla actual y un comentario animado.",
      };

      const res = await fetch("/api/dj/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("No se pudo obtener respuesta del Servidor Gemini. Verifica tu clave de API.");
      }

      const data = await res.json();
      setAiResponse(data);
      setUserPrompt("");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al contactar al AI Coach.");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTip = (index: number) => {
    setCheckedTips((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleRecommendLoad = (rec: any, deck: "A" | "B") => {
    const proceduralTrack: Track = {
      id: `rec-${Date.now()}`,
      title: rec.title,
      artist: "AI Suggestion",
      bpm: rec.suggestedBpm,
      genre: rec.genre,
      color: deck === "A" ? "cyan" : "purple",
      isProcedural: true,
    };
    onLoadSuggestedTrack(proceduralTrack, deck);
  };

  return (
    <div
      id="ai-dj-coach"
      className="bg-gradient-to-b from-slate-900 to-black border border-white/5 rounded-2xl p-5 flex flex-col gap-5 h-full justify-between"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-fuchsia-400 animate-pulse" />
          <h2 className="text-xs font-black uppercase text-white tracking-widest">AI Co-Host & DJ Coach</h2>
        </div>
        <button
          id="analyze-mix-btn"
          disabled={isLoading}
          onClick={() => handleAnalyzeMix()}
          className="text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-fuchsia-600 hover:from-cyan-600 hover:to-fuchsia-700 text-white px-3.5 py-1.5 rounded border border-white/10 shadow transition active:scale-95 disabled:opacity-50"
        >
          {isLoading ? "Analizando..." : "Analizar Mezcla"}
        </button>
      </div>

      {/* Main Body */}
      <div className="flex flex-col gap-4 overflow-y-auto max-h-[460px] pr-1">
        {error && (
          <div className="bg-rose-950/40 border border-rose-900/30 text-rose-300 text-[11px] font-medium p-3 rounded leading-snug">
            {error}
          </div>
        )}

        {/* AI Commentary Bubble */}
        {aiResponse && (
          <div className="flex gap-2.5 items-start">
            {/* Animated Avatar */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-400 to-fuchsia-500 p-0.5 shrink-0 shadow flex items-center justify-center relative">
              <Disc className="w-6 h-6 text-black animate-spin" />
              <div className="absolute -bottom-1 -right-1 bg-slate-950 rounded-full p-0.5 border border-fuchsia-500">
                <Sparkles className="w-3 h-3 text-fuchsia-400" />
              </div>
            </div>
            {/* Speech Bubble */}
            <div className="bg-slate-950/60 border border-white/5 p-4 rounded-xl rounded-tl-none relative flex flex-col gap-1.5">
              <span className="text-[9px] text-slate-500 font-black uppercase tracking-widest">TRAKTOR DJ Assistant</span>
              <p className="text-slate-200 text-xs md:text-sm leading-relaxed font-medium">
                {aiResponse.hypeComment}
              </p>
            </div>
          </div>
        )}

        {/* Step-by-Step Transition Guidance Checklist */}
        {aiResponse && aiResponse.transitionTips.length > 0 && (
          <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4 flex flex-col gap-2">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5 border-b border-white/5 pb-2 mb-1">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" /> Guía de Transición Sincronizada
            </span>
            <div className="flex flex-col gap-2.5">
              {aiResponse.transitionTips.map((tip, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleTip(idx)}
                  className={`flex gap-3.5 items-start cursor-pointer p-2 rounded transition-all duration-100 ${checkedTips[idx] ? "bg-emerald-950/10 border border-emerald-500/20" : "hover:bg-slate-800/30"}`}
                >
                  <input
                    type="checkbox"
                    checked={!!checkedTips[idx]}
                    readOnly
                    className="mt-0.5 w-4 h-4 rounded border-white/10 text-fuchsia-500 accent-fuchsia-500 cursor-pointer"
                  />
                  <span className={`text-xs ${checkedTips[idx] ? "line-through text-slate-500 font-medium" : "text-slate-300 font-medium leading-relaxed"}`}>
                    {tip}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Music Suggestions Grid */}
        {aiResponse && aiResponse.musicRecommendations.length > 0 && (
          <div className="flex flex-col gap-2 bg-slate-950/40 border border-white/5 rounded-xl p-4">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-fuchsia-400" /> Cargar Siguiente Loop Recomendado
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
              {aiResponse.musicRecommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/80 border border-white/5 rounded-lg p-3 flex flex-col gap-2 hover:border-white/10 transition"
                >
                  <div>
                    <div className="text-white text-xs font-black truncate">{rec.title}</div>
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold mt-0.5">
                      <span>{rec.genre}</span>
                      <span>{rec.suggestedBpm} BPM</span>
                    </div>
                    <div className="text-[9px] text-amber-400 font-black mt-1 bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10 truncate">
                      TRANSICIÓN: {rec.transitionStyle}
                    </div>
                  </div>
                  {/* Load buttons for recommendations */}
                  <div className="grid grid-cols-2 gap-1.5 shrink-0 mt-1">
                    <button
                      onClick={() => handleRecommendLoad(rec, "A")}
                      className="text-[9px] font-black bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 py-1.5 rounded uppercase active:scale-95 transition"
                    >
                      Deck A
                    </button>
                    <button
                      onClick={() => handleRecommendLoad(rec, "B")}
                      className="text-[9px] font-black bg-fuchsia-500/10 hover:bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/20 py-1.5 rounded uppercase active:scale-95 transition"
                    >
                      Deck B
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Input Box */}
      <div className="border-t border-white/5 pt-3 flex gap-2 shrink-0">
        <input
          type="text"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
          placeholder="Pregúntale al Coach o di qué transiciones quieres..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isLoading) handleAnalyzeMix();
          }}
          className="flex-1 bg-slate-950/80 border border-white/5 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500/20"
        />
        <button
          id="send-prompt-btn"
          disabled={isLoading || !userPrompt.trim()}
          onClick={() => handleAnalyzeMix()}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-2.5 rounded-xl border border-white/10 transition active:scale-95 disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
