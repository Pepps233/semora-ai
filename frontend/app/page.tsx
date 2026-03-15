"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const POLL_INTERVAL = 2000;
const MAX_POLLS = 60;

type UploadState = "idle" | "uploading" | "parsing" | "done" | "error";

export default function Home() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      setErrorMsg("Please upload a PDF file.");
      setState("error");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("File must be under 2 MB.");
      setState("error");
      return;
    }

    setFileName(file.name);
    setState("uploading");
    setErrorMsg("");

    const form = new FormData();
    form.append("file", file);

    let sessionId: string;
    try {
      const res = await fetch(`${API_URL}/api/v1/resume/upload`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Upload failed.");
      }
      const data = await res.json();
      sessionId = data.session_id;
    } catch (e: unknown) {
      setState("error");
      setErrorMsg(e instanceof Error ? e.message : "Upload failed. Try again.");
      return;
    }

    setState("parsing");

    let polls = 0;
    const poll = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/resume/${sessionId}`);
        const data = await res.json();
        if (data.status === "done") {
          setState("done");
          router.push(`/matches?session=${sessionId}`);
          return;
        }
      } catch {
        // continue polling
      }
      polls++;
      if (polls < MAX_POLLS) {
        setTimeout(poll, POLL_INTERVAL);
      } else {
        setState("error");
        setErrorMsg("Parsing timed out. Please try again.");
      }
    };
    setTimeout(poll, POLL_INTERVAL);
  }, [router]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const reset = () => {
    setState("idle");
    setErrorMsg("");
    setFileName("");
    if (inputRef.current) inputRef.current.value = "";
  };

  const isActive = state !== "idle" && state !== "error";

  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Nav */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2.5rem",
        height: "60px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--background)",
      }}>
        <span style={{
          fontFamily: "var(--font-serif)",
          fontSize: "1.2rem",
          letterSpacing: "-0.01em",
          color: "var(--foreground)",
        }}>
          Semora
        </span>
        <span style={{
          fontSize: "0.75rem",
          color: "var(--muted-foreground)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}>
          find your next lab
        </span>
      </nav>

      {/* Hero */}
      <section style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "4rem 1.5rem",
        maxWidth: "680px",
        margin: "0 auto",
        width: "100%",
      }}>
        <div className="fade-up" style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <p className="fade-up fade-up-delay-1" style={{
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold)",
            fontWeight: 500,
            marginBottom: "1rem",
          }}>
            AI-Powered Research Matching
          </p>
          <h1 className="fade-up fade-up-delay-2" style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(2.2rem, 5vw, 3.2rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "var(--foreground)",
            marginBottom: "1.25rem",
          }}>
            Find your research lab<br />
            <em style={{ fontStyle: "italic", color: "var(--muted-foreground)" }}>in seconds</em>
          </h1>
          <p className="fade-up fade-up-delay-3" style={{
            fontSize: "0.95rem",
            color: "var(--muted-foreground)",
            lineHeight: 1.7,
            maxWidth: "440px",
            margin: "0 auto",
          }}>
            Upload your resume. We parse it, match it against Purdue&apos;s research labs,
            and generate a personalized outreach email — no account required.
          </p>
        </div>

        {/* Match counter */}
        <MatchCounter />

        {/* Upload card */}
        <div className="fade-up fade-up-delay-4" style={{ width: "100%" }}>
          {state === "error" ? (
            <div style={{
              border: "1px solid #fca5a5",
              borderRadius: "var(--radius)",
              backgroundColor: "#fff5f5",
              padding: "2rem",
              textAlign: "center",
            }}>
              <p style={{ color: "#dc2626", marginBottom: "1rem", fontSize: "0.9rem" }}>{errorMsg}</p>
              <button onClick={reset} style={buttonStyle}>Try again</button>
            </div>
          ) : state === "uploading" ? (
            <div style={cardStyle}>
              <p style={labelStyle}>Uploading {fileName}...</p>
              <ProgressBar />
            </div>
          ) : state === "parsing" ? (
            <div style={cardStyle}>
              <p style={labelStyle}>Parsing your resume with AI...</p>
              <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "1rem" }}>
                This usually takes 10–20 seconds.
              </p>
              <ProgressBar />
            </div>
          ) : (
            <div
              className={`upload-zone${dragOver ? " drag-over" : ""}`}
              style={{
                borderRadius: "var(--radius)",
                padding: "2.5rem 2rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "var(--card)",
                overflow: "hidden",
                position: "relative",
              }}
              onClick={() => !isActive && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                style={{ display: "none" }}
                onChange={onInputChange}
              />
              <DachshundPixel />
              <p style={{ fontSize: "0.95rem", fontWeight: 500, marginBottom: "0.3rem", color: "var(--foreground)", marginTop: "1.25rem" }}>
                Drop your resume here
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "1.25rem" }}>
                PDF only · max 2 MB
              </p>
              <button style={buttonStyle} onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                Browse files
              </button>
            </div>
          )}
        </div>

        {/* Feature row */}
        <div style={{
          display: "flex",
          gap: "2rem",
          marginTop: "3rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}>
          {[
            { label: "Parse", desc: "AI extracts your skills and experience" },
            { label: "Match", desc: "Vector search across 35+ Purdue labs" },
            { label: "Email", desc: "Personalized outreach drafted instantly" },
          ].map((item, i) => (
            <div key={i} style={{ textAlign: "center", flex: "1 1 140px", minWidth: "120px" }}>
              <p style={{ fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold)", fontWeight: 600, marginBottom: "0.3rem" }}>
                {item.label}
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", lineHeight: 1.5 }}>
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "1.25rem 2.5rem",
        display: "flex",
        justifyContent: "center",
        gap: "2rem",
      }}>
        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
          No login required
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--border)" }}>·</span>
        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
          5 matches/day · 3 emails/day
        </span>
        <span style={{ fontSize: "0.75rem", color: "var(--border)" }}>·</span>
        <span style={{ fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
          Labs @ Purdue
        </span>
      </footer>
    </main>
  );
}

function MatchCounter() {
  const { data } = useQuery<{ total_matches: number }>({
    queryKey: ["match-stats"],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/v1/match/stats`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const count = data?.total_matches;

  return (
    <div
      className="fade-up fade-up-delay-3"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.6rem",
        marginBottom: "2rem",
      }}
    >
      <span style={{
        display: "inline-block",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        backgroundColor: "var(--gold)",
        flexShrink: 0,
      }} />
      <span style={{
        fontSize: "0.75rem",
        color: "var(--muted-foreground)",
        letterSpacing: "0.04em",
      }}>
        {count !== undefined ? (
          <>
            <span style={{
              fontFamily: "var(--font-serif)",
              fontSize: "0.85rem",
              color: "var(--foreground)",
              fontStyle: "italic",
            }}>
              {count.toLocaleString()}
            </span>
            {" "}research matches made
          </>
        ) : (
          <span style={{ opacity: 0.4 }}>loading...</span>
        )}
      </span>
    </div>
  );
}

function ProgressBar() {
  return (
    <div style={{
      width: "100%",
      height: "3px",
      backgroundColor: "var(--muted)",
      borderRadius: "999px",
      overflow: "hidden",
    }}>
      <div
        className="progress-bar-indeterminate"
        style={{
          width: "30%",
          height: "100%",
          backgroundColor: "var(--gold)",
          borderRadius: "999px",
        }}
      />
    </div>
  );
}

// ─── Pixel Dachshund Canvas Animation ───────────────────────────────────────
// P = 4px per pixel. Sprite coordinates in pixel-grid units.
// Colors based on reference images
const B  = "#2b1f14"; // dark body (near-black brown)
const BM = "#1a1209"; // darker body shadow
const T  = "#c8813a"; // tan markings
const TL = "#d9a060"; // lighter tan highlight
const EY = "#1a0f08"; // eye dark
const NS = "#0f0905"; // nose
const G  = "#6ab830"; // tennis ball green stripe
const Y  = "#e8d820"; // tennis ball yellow

// draw a P×P pixel at grid coords (gx, gy) with canvas origin (ox, oy)
function px(ctx: CanvasRenderingContext2D, gx: number, gy: number, ox: number, oy: number, P: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(ox + gx * P), Math.round(oy + gy * P), P, P);
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE: Side-view standing dachshund (Image 3)
// Grid origin = left edge of tail tip, at leg-bottom row (gy=0 = ground)
// Total width ~18 grid units, height ~10 grid units above ground
// ─────────────────────────────────────────────────────────────────────────────
function drawSideBody(ctx: CanvasRenderingContext2D, ox: number, oy: number, P: number,
  legConfig: Array<{x: number; gy: number}>) {
  const p = (gx: number, gy: number, c: string) => px(ctx, gx, gy, ox, oy, P, c);

  // ── tail: two diagonal pixels pointing down-left from body ──
  p(0, -4, BM); p(1, -5, BM); p(1, -4, BM);

  // ── long body: 3 rows tall, 10 units wide (gx 2..11) ──
  for (let x = 2; x <= 11; x++) { p(x, -3, BM); } // top row
  for (let x = 2; x <= 12; x++) { p(x, -4, B);  } // mid row
  for (let x = 2; x <= 12; x++) { p(x, -5, B);  } // upper mid
  for (let x = 2; x <= 11; x++) { p(x, -6, BM); } // upper top

  // ── neck: rises from right end of body ──
  p(11, -7, B); p(12, -7, B);
  p(12, -8, B); p(13, -8, B);

  // ── head block ──
  p(12, -9, BM); p(13, -9, BM); p(14, -9, BM);
  p(12,-10, BM); p(13,-10, BM); p(14,-10, BM); p(15,-10, BM);
  p(13,-11, BM); p(14,-11, BM); p(15,-11, BM);
  p(14,-12, BM); p(15,-12, BM);

  // ── ear: drooping down from head ──
  p(13, -8, BM); p(14, -8, BM); p(14, -7, BM); p(13, -7, BM);

  // ── tan snout ──
  p(15, -9, T); p(16, -9, T);
  p(15, -8, T); p(16, -8, T);
  p(16, -7, T);

  // ── tan chest/neck ──
  p(11, -5, T); p(11, -6, T); p(12, -6, T);

  // ── eye ──
  p(14,-10, EY);

  // ── nose ──
  p(16, -9, NS);

  // ── legs ──
  for (const leg of legConfig) {
    p(leg.x,  -1, T);   // tan paw
    p(leg.x,  -2, BM);  // upper leg dark
    p(leg.x, leg.gy, BM); // extra segment if extended
  }
}

// Standing pose — legs straight down
function drawDogStanding(ctx: CanvasRenderingContext2D, ox: number, oy: number, P: number) {
  drawSideBody(ctx, ox, oy, P, [
    { x: 4,  gy: -3 },
    { x: 6,  gy: -3 },
    { x: 9,  gy: -3 },
    { x: 11, gy: -3 },
  ]);
}

// Run frame A — legs spread wide (back pair behind, front pair ahead)
function drawDogRunA(ctx: CanvasRenderingContext2D, ox: number, oy: number, P: number) {
  const p = (gx: number, gy: number, c: string) => px(ctx, gx, gy, ox, oy, P, c);
  drawSideBody(ctx, ox, oy, P, [
    { x: 2,  gy: -3 }, // far back leg
    { x: 5,  gy: -3 }, // back leg
    { x: 9,  gy: -3 }, // front leg
    { x: 13, gy: -3 }, // far front leg
  ]);
  // tail up in run
  p(0, -6, BM); p(1, -7, BM); p(1, -6, BM);
}

// Run frame B — legs tucked (mid-stride, all close together)
function drawDogRunB(ctx: CanvasRenderingContext2D, ox: number, oy: number, P: number) {
  const p = (gx: number, gy: number, c: string) => px(ctx, gx, gy, ox, oy, P, c);
  drawSideBody(ctx, ox, oy, P, [
    { x: 4,  gy: -2 },
    { x: 6,  gy: -2 },
    { x: 8,  gy: -2 },
    { x: 10, gy: -2 },
  ]);
  // tail curves up
  p(0, -5, BM); p(1, -6, BM);
}

// ─────────────────────────────────────────────────────────────────────────────
// SPRITE: Front-facing sitting dachshund (Image 4)
// Wider, squarish — brown dog with tan oval face, dot eyes, sitting
// Grid origin = center-bottom (gy=0 = ground under paws)
// ─────────────────────────────────────────────────────────────────────────────
function drawDogSitting(ctx: CanvasRenderingContext2D, ox: number, oy: number, P: number) {
  const p = (gx: number, gy: number, c: string) => px(ctx, gx, gy, ox, oy, P, c);

  // ── body: wide rounded block ──
  p(-3,-3, B); p(-2,-3, B); p(-1,-3, B); p(0,-3, B); p(1,-3, B); p(2,-3, B); p(3,-3, B);
  p(-3,-4, B); p(-2,-4, B); p(-1,-4, B); p(0,-4, B); p(1,-4, B); p(2,-4, B); p(3,-4, B);
  p(-2,-5, B); p(-1,-5, B); p(0,-5, B); p(1,-5, B); p(2,-5, B);

  // ── tan belly ──
  p(-1,-3, TL); p(0,-3, TL); p(1,-3, TL);
  p(-1,-4, T);  p(0,-4, T);  p(1,-4, T);

  // ── front paws ──
  p(-2,-1, B); p(-1,-1, B); p(-1,-2, B); p(-2,-2, B);
  p(1,-1, B);  p(2,-1, B);  p(1,-2, B);  p(2,-2, B);
  p(-1, 0, T); p(0, 0, T); p(1, 0, T); // tan paw tips

  // ── neck ──
  p(-1,-5, B); p(0,-5, B); p(1,-5, B);
  p(-1,-6, B); p(0,-6, B); p(1,-6, B);

  // ── head: round block ──
  p(-3,-7, B); p(-2,-7, B); p(-1,-7, B); p(0,-7, B); p(1,-7, B); p(2,-7, B); p(3,-7, B);
  p(-3,-8, B); p(-2,-8, B); p(-1,-8, B); p(0,-8, B); p(1,-8, B); p(2,-8, B); p(3,-8, B);
  p(-3,-9, B); p(-2,-9, B); p(-1,-9, B); p(0,-9, B); p(1,-9, B); p(2,-9, B); p(3,-9, B);
  p(-2,-10,B); p(-1,-10,B); p(0,-10,B); p(1,-10,B); p(2,-10,B);

  // ── tan face oval ──
  p(-1,-7, T); p(0,-7, T); p(1,-7, T);
  p(-2,-8, T); p(-1,-8, T); p(0,-8, T); p(1,-8, T); p(2,-8, T);
  p(-1,-9, T); p(0,-9, T); p(1,-9, T);

  // ── eyes ──
  p(-1,-9, EY); p(1,-9, EY);

  // ── nose ──
  p(0,-7, NS);

  // ── ears: drooping on each side ──
  p(-3,-9, BM); p(-4,-8, BM); p(-4,-7, BM); p(-3,-7, BM);
  p(3,-9, BM);  p(4,-8, BM);  p(4,-7, BM);  p(3,-7, BM);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tennis ball
// ─────────────────────────────────────────────────────────────────────────────
function drawTennisBall(ctx: CanvasRenderingContext2D, ox: number, oy: number, P: number) {
  const p = (gx: number, gy: number, c: string) => px(ctx, gx, gy, ox, oy, P, c);
  p(1, 0, Y); p(2, 0, Y); p(3, 0, Y);
  p(0, 1, Y); p(1, 1, G); p(2, 1, Y); p(3, 1, G); p(4, 1, Y);
  p(0, 2, Y); p(1, 2, Y); p(2, 2, Y); p(3, 2, Y); p(4, 2, Y);
  p(0, 3, Y); p(1, 3, G); p(2, 3, Y); p(3, 3, G); p(4, 3, Y);
  p(1, 4, Y); p(2, 4, Y); p(3, 4, Y);
}

function DachshundPixel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    if (!ctx) return;

    const P = 4; // pixels per grid unit
    const W = canvas.width;
    const H = canvas.height;
    const GROUND = H - 14; // y baseline for feet

    // Animation phases (all times in ms)
    // 0–1200  : sitting (dog at center-left, ball off-right hidden)
    // 1200–1600: stand up (dog rises, ball appears right)
    // 1600–1800: lunge (dog starts moving right fast)
    // 1800–3400: run across screen (dog exits right, ball exits right)
    // 3400–3600: dog reappears from left, still running
    // 3600–4200: dog slows, reaches sit position at center-left
    // 4200–5400: sit again → loop (total = 5400ms)
    const LOOP = 5400;

    let startTime: number | null = null;
    let rafId: number;

    function lerp(a: number, b: number, t: number) { return a + (b - a) * Math.min(1, Math.max(0, t)); }
    function easeOut(t: number) { return 1 - (1 - t) * (1 - t); }
    function easeIn(t: number) { return t * t; }

    function draw(ts: number) {
      if (!startTime) startTime = ts;
      const elapsed = (ts - startTime) % LOOP;

      ctx.clearRect(0, 0, W, H);

      // ── ground dots ──
      ctx.fillStyle = "#e4e2dd";
      for (let x = 0; x < W; x += 8) {
        ctx.fillRect(x, GROUND + 6, 4, 2);
      }

      // ── determine phase ──
      let dogX: number;
      let dogPose: "sit" | "stand" | "runA" | "runB";
      const legFrame = Math.floor(elapsed / 140) % 2; // run leg toggle
      let ballX: number = -100;
      let ballVisible = false;
      const sitX = 80;      // dog sits here
      const ballRestX = W - 60; // ball rests here

      if (elapsed < 1200) {
        // sitting still
        dogX = sitX;
        dogPose = "sit";
        ballVisible = false;
      } else if (elapsed < 1600) {
        // stand up + ball appears
        const t = (elapsed - 1200) / 400;
        dogX = sitX;
        dogPose = easeOut(t) > 0.5 ? "stand" : "sit";
        ballVisible = t > 0.3;
        ballX = ballRestX;
      } else if (elapsed < 1800) {
        // lunge start
        const t = (elapsed - 1600) / 200;
        dogX = lerp(sitX, sitX + 30, easeIn(t));
        dogPose = legFrame === 0 ? "runA" : "runB";
        ballVisible = true;
        ballX = ballRestX;
      } else if (elapsed < 3400) {
        // full run — dog chases ball across screen
        const t = (elapsed - 1800) / 1600;
        dogX = lerp(sitX + 30, W + 80, t);
        ballX = lerp(ballRestX, W + 120, t * 0.85);
        dogPose = legFrame === 0 ? "runA" : "runB";
        ballVisible = ballX < W + 60;
      } else if (elapsed < 3600) {
        // dog wraps from right to left (invisible during transition)
        dogX = -80;
        dogPose = legFrame === 0 ? "runA" : "runB";
        ballVisible = false;
        ballX = -100;
      } else if (elapsed < 4600) {
        // dog runs in from left, decelerates toward sit position
        const t = (elapsed - 3600) / 1000;
        dogX = lerp(-60, sitX, easeOut(t));
        dogPose = t > 0.75 ? "stand" : (legFrame === 0 ? "runA" : "runB");
        ballVisible = false;
        ballX = -100;
      } else {
        // settle back into sit
        const t = (elapsed - 4600) / 800;
        dogX = sitX;
        dogPose = easeOut(t) > 0.5 ? "sit" : "stand";
        ballVisible = false;
        ballX = -100;
      }

      // ── draw tennis ball ──
      if (ballVisible) {
        drawTennisBall(ctx, ballX, GROUND - 5 * P, P);
      }

      // ── draw dog ──
      const dogOY = GROUND - 7 * P;
      if (dogPose === "sit") {
        drawDogSitting(ctx, dogX, GROUND - 7 * P, P);
      } else if (dogPose === "stand") {
        drawDogStanding(ctx, dogX, dogOY, P);
      } else if (dogPose === "runA") {
        drawDogRunA(ctx, dogX, dogOY, P);
      } else {
        drawDogRunB(ctx, dogX, dogOY, P);
      }

      rafId = requestAnimationFrame(draw);
    }

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "80px" }}>
      <canvas
        ref={canvasRef}
        width={520}
        height={80}
        style={{ imageRendering: "pixelated", maxWidth: "100%" }}
      />
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  backgroundColor: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "2.5rem 2rem",
  textAlign: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  alignItems: "center",
};

const labelStyle: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 500,
  color: "var(--foreground)",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: "36px",
  padding: "0 1.25rem",
  fontSize: "0.82rem",
  fontWeight: 500,
  fontFamily: "var(--font-sans)",
  color: "#fff",
  backgroundColor: "var(--foreground)",
  border: "none",
  borderRadius: "var(--radius-md)",
  cursor: "pointer",
  letterSpacing: "0.01em",
  transition: "opacity 0.15s ease",
};
