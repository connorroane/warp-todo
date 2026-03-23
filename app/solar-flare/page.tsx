"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types & color definitions                                          */
/* ------------------------------------------------------------------ */

type ColorScheme = "green" | "red" | "blue";
interface RGB { r: number; g: number; b: number }

const ACCENT: Record<ColorScheme, RGB> = {
  green: { r: 28,  g: 160, b: 45  },
  red:   { r: 210, g: 20,  b: 20  },
  blue:  { r: 40,  g: 85,  b: 220 },
};
const SWATCH: Record<ColorScheme, string> = {
  green: "#197a22",
  red:   "#8b0606",
  blue:  "#1a3ea8",
};

interface Params {
  glowReach:       number; // 0.1–1.5  how far off-screen the centers are
  glowSpread:      number; // 0.5–3.0  radius as fraction of canvas width
  glowBrightness:  number; // 50–255   peak channel value
  glowCount:       number; // 2–20     total blobs across 400vh
  glowHeight:      number; // 0.1–1.5  vertical extent per blob as fraction of 1 viewport height
  grainDensity:    number; // 0–0.7    fraction of pixels with a grain dot
  grainBrightness: number; // 0–255    brightness of grain pixels
  grainOpacity:    number; // 0–255    alpha of grain pixels
}

const DEFAULTS: Params = {
  glowReach:       0.50,
  glowSpread:      1.50,
  glowBrightness:  180,
  glowCount:       9,
  glowHeight:      0.55,
  grainDensity:    0.18,
  grainBrightness: 110,
  grainOpacity:    32,
};

/* ------------------------------------------------------------------ */
/*  Glow seeds — normalized random factors, re-generated only when     */
/*  count changes or user hits Randomize                               */
/* ------------------------------------------------------------------ */

interface GlowSeed {
  side:        "left" | "right";
  cy:          number; // 0–1, normalized y across full canvas
  cxFactor:   number; // 0.6–1.0, multiplied by glowReach
  radFactor:  number; // 0.8–1.2, multiplied by glowSpread
  peakFactor: number; // 0.65–1.0, multiplied by glowBrightness
}

interface Glow {
  cx:     number;
  cy:     number;
  radius: number;
  peak:   number;
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function makeSeeds(count: number): GlowSeed[] {
  const sliceH = 1 / count;
  return Array.from({ length: count }, (_, i) => ({
    side:       (i % 2 === 0 ? "left" : "right") as "left" | "right",
    cy:         sliceH * i + rand(sliceH * 0.15, sliceH * 0.85),
    cxFactor:   rand(0.6, 1.0),
    radFactor:  rand(0.8, 1.2),
    peakFactor: rand(0.65, 1.0),
  }));
}

function seedsToGlows(seeds: GlowSeed[], p: Params): Glow[] {
  return seeds.map((s) => ({
    cx:     s.side === "left" ? -(s.cxFactor * p.glowReach) : 1 + s.cxFactor * p.glowReach,
    cy:     s.cy,
    radius: s.radFactor * p.glowSpread,
    peak:   (s.peakFactor * p.glowBrightness) | 0,
  }));
}

/* ------------------------------------------------------------------ */
/*  Renderer                                                           */
/* ------------------------------------------------------------------ */

function render(canvas: HTMLCanvasElement, glows: Glow[], accent: RGB, p: Params) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext("2d")!;

  // 1 — Black base
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);

  // 2 — Glow blobs, each vertically soft-masked so only its canvas section
  //     is lit. This creates clearly different content as you scroll.
  //
  //     Each blob is drawn to a reused temp canvas, then a vertical linear
  //     gradient is applied as a destination-in mask (fades top and bottom).
  //     The result is additively composited onto the main canvas.
  const viewportH = H / 4;                       // 400vh → 4 viewports
  const yHalf = viewportH * p.glowHeight;         // half-height of flat zone
  const yFade = viewportH * p.glowHeight * 0.55;  // fade distance on each edge

  // One reusable temp canvas for the per-blob mask step
  const tmp = document.createElement("canvas");
  tmp.width  = W;
  tmp.height = H;
  const tCtx = tmp.getContext("2d")!;

  ctx.globalCompositeOperation = "lighter";

  for (const g of glows) {
    tCtx.clearRect(0, 0, W, H);

    const x = g.cx * W;
    const y = g.cy * H;
    const r = g.radius * W;
    const c = g.peak;
    const ar = (accent.r * c / 255) | 0;
    const ag = (accent.g * c / 255) | 0;
    const ab = (accent.b * c / 255) | 0;

    // Radial gradient (horizontal glow from off-screen)
    const grad = tCtx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0.00, `rgba(${ar},${ag},${ab},1)`);
    grad.addColorStop(0.30, `rgba(${ar},${ag},${ab},0.6)`);
    grad.addColorStop(0.50, `rgba(${(ar * 0.7) | 0},${(ag * 0.7) | 0},${(ab * 0.7) | 0},0.25)`);
    grad.addColorStop(0.70, `rgba(${(ar * 0.4) | 0},${(ag * 0.4) | 0},${(ab * 0.4) | 0},0.08)`);
    grad.addColorStop(0.85, `rgba(${(ar * 0.2) | 0},${(ag * 0.2) | 0},${(ab * 0.2) | 0},0.02)`);
    grad.addColorStop(1.00, "rgba(0,0,0,0)");
    tCtx.fillStyle = grad;
    tCtx.fillRect(0, 0, W, H);

    // Vertical soft mask — fades the blob in/out above and below its zone
    const top    = y - yHalf - yFade;
    const inner1 = y - yHalf;
    const inner2 = y + yHalf;
    const bottom = y + yHalf + yFade;
    const span   = bottom - top;

    const vMask = tCtx.createLinearGradient(0, top, 0, bottom);
    vMask.addColorStop(0,                        "rgba(0,0,0,0)");
    vMask.addColorStop((inner1 - top) / span,    "rgba(0,0,0,1)");
    vMask.addColorStop((inner2 - top) / span,    "rgba(0,0,0,1)");
    vMask.addColorStop(1,                        "rgba(0,0,0,0)");

    tCtx.globalCompositeOperation = "destination-in";
    tCtx.fillStyle = vMask;
    tCtx.fillRect(0, 0, W, H);
    tCtx.globalCompositeOperation = "source-over";

    ctx.drawImage(tmp, 0, 0);
  }

  ctx.globalCompositeOperation = "source-over";

  // 3 — Grain (screen-composited so it brightens without washing out color)
  const grain   = document.createElement("canvas");
  grain.width   = W;
  grain.height  = H;
  const gCtx    = grain.getContext("2d")!;
  const imgData = gCtx.createImageData(W, H);
  const d       = imgData.data;

  for (let i = 0; i < d.length; i += 4) {
    if (Math.random() < p.grainDensity) {
      const v = Math.min((p.grainBrightness * 0.5 + Math.random() * p.grainBrightness * 0.9) | 0, 255);
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = Math.min((p.grainOpacity * 0.45 + Math.random() * p.grainOpacity * 1.1) | 0, 255);
    }
  }

  gCtx.putImageData(imgData, 0, 0);
  ctx.globalCompositeOperation = "screen";
  ctx.drawImage(grain, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}

/* ------------------------------------------------------------------ */
/*  Slider component                                                   */
/* ------------------------------------------------------------------ */

function Slider({
  label, value, min, max, step, decimals = 0, onChange,
}: {
  label: string; value: number; min: number; max: number;
  step: number; decimals?: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 10 }}>{label}</span>
        <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 10, fontFamily: "monospace" }}>
          {value.toFixed(decimals)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: "rgba(255,255,255,0.5)", cursor: "pointer" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function SolarFlarePage() {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [scheme, setScheme] = useState<ColorScheme>("red");
  const [params, setParams] = useState<Params>(DEFAULTS);
  const [seeds, setSeeds]   = useState<GlowSeed[]>(() => makeSeeds(DEFAULTS.glowCount));

  const glows = useMemo(() => seedsToGlows(seeds, params), [seeds, params]);

  const scheduleRender = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const canvas  = canvasRef.current;
      const wrapper = wrapperRef.current;
      if (!canvas || !wrapper) return;
      canvas.width  = wrapper.offsetWidth;
      canvas.height = wrapper.offsetHeight;
      render(canvas, glows, ACCENT[scheme], params);
    }, 150);
  }, [glows, scheme, params]);

  useEffect(() => {
    scheduleRender();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [scheduleRender]);

  const set = (key: keyof Params) => (v: number) =>
    setParams((p) => ({ ...p, [key]: v }));

  const handleCountChange = (v: number) => {
    setParams((p) => ({ ...p, glowCount: v }));
    setSeeds(makeSeeds(Math.round(v)));
  };

  const panelStyle: React.CSSProperties = {
    position: "fixed", display: "flex", flexDirection: "column", gap: 10,
    padding: "14px 12px", backgroundColor: "rgba(0,0,0,0.6)",
    backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, zIndex: 100,
  };
  const sectionLabel: React.CSSProperties = {
    color: "rgba(255,255,255,0.3)", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase",
  };
  const divider: React.CSSProperties = { height: 1, backgroundColor: "rgba(255,255,255,0.08)" };

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative", width: "100vw", height: "400vh",
        marginLeft: "calc(-50vw + 50%)", backgroundColor: "#000", overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />

      {/* ── Left panel: glow + grain sliders ── */}
      <div style={{ ...panelStyle, top: 24, left: 24, width: 190 }}>
        <span style={sectionLabel}>Glow</span>
        <Slider label="Reach"      value={params.glowReach}      min={0.1} max={1.5} step={0.05} decimals={2} onChange={set("glowReach")} />
        <Slider label="Spread"     value={params.glowSpread}     min={0.5} max={3.0} step={0.1}  decimals={1} onChange={set("glowSpread")} />
        <Slider label="Brightness" value={params.glowBrightness} min={50}  max={255} step={5}               onChange={set("glowBrightness")} />
        <Slider label="Height"     value={params.glowHeight}     min={0.1} max={1.5} step={0.05} decimals={2} onChange={set("glowHeight")} />
        <Slider label="Count"      value={params.glowCount}      min={2}   max={20}  step={1}               onChange={handleCountChange} />
        <button
          onClick={() => setSeeds(makeSeeds(Math.round(params.glowCount)))}
          style={{
            marginTop: 2, padding: "5px 0", backgroundColor: "rgba(255,255,255,0.07)",
            border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7,
            color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: "0.08em", cursor: "pointer",
          }}
        >
          Randomize positions
        </button>

        <div style={divider} />

        <span style={sectionLabel}>Grain</span>
        <Slider label="Density"    value={params.grainDensity}    min={0}  max={0.7} step={0.01} decimals={2} onChange={set("grainDensity")} />
        <Slider label="Brightness" value={params.grainBrightness} min={0}  max={255} step={5}               onChange={set("grainBrightness")} />
        <Slider label="Opacity"    value={params.grainOpacity}    min={0}  max={255} step={5}               onChange={set("grainOpacity")} />
      </div>

      {/* ── Right panel: color switcher ── */}
      <div style={{ ...panelStyle, top: 24, right: 24, alignItems: "center" }}>
        <span style={sectionLabel}>Color</span>
        {(["green", "red", "blue"] as ColorScheme[]).map((s) => (
          <button
            key={s} onClick={() => setScheme(s)} aria-label={s}
            style={{
              width: 28, height: 28, borderRadius: 7,
              border: `2px solid ${scheme === s ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.1)"}`,
              backgroundColor: SWATCH[s], cursor: "pointer", outline: "none",
              transition: "border-color 0.15s, transform 0.15s",
              transform: scheme === s ? "scale(1.18)" : "scale(1)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
