"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

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
          Purdue University
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
                padding: "3.5rem 2rem",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: "var(--card)",
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
              <div style={{ marginBottom: "1.25rem" }}>
                <UploadIcon />
              </div>
              <p style={{ fontSize: "0.95rem", fontWeight: 500, marginBottom: "0.4rem", color: "var(--foreground)" }}>
                Drop your resume here
              </p>
              <p style={{ fontSize: "0.8rem", color: "var(--muted-foreground)", marginBottom: "1.5rem" }}>
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
            { label: "Parse", desc: "GPT-4o extracts your skills and experience" },
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
          Purdue University
        </span>
      </footer>
    </main>
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

function UploadIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="var(--muted)" />
      <path d="M18 22V14M18 14L14.5 17.5M18 14L21.5 17.5" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 25h12" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
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
