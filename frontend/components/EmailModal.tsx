"use client";

import { useState, useEffect, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EmailModalProps {
  sessionId: string;
  labId: string;
  professor: string;
  onClose: () => void;
}

type ModalState = "loading" | "done" | "error" | "rate_limited";

export default function EmailModal({ sessionId, labId, professor, onClose }: EmailModalProps) {
  const [state, setState] = useState<ModalState>("loading");
  const [opening, setOpening] = useState("");
  const [subjectLine, setSubjectLine] = useState("");
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const generate = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch(`${API_URL}/api/v1/email/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, lab_id: labId }),
      });
      if (res.status === 429) {
        setState("rate_limited");
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to generate email.");
      }
      const data = await res.json();
      setOpening(data.opening);
      setSubjectLine(data.subject_line);
      setState("done");
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setState("error");
    }
  }, [sessionId, labId]);

  useEffect(() => {
    generate();
  }, [generate]);

  const copyAll = () => {
    const text = `Subject: ${subjectLine}\n\n${opening}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Close on backdrop click
  const onBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      onClick={onBackdropClick}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "1.5rem",
      }}
    >
      <div style={{
        backgroundColor: "var(--card)",
        borderRadius: "var(--radius)",
        border: "1px solid var(--border)",
        width: "100%",
        maxWidth: "560px",
        overflow: "hidden",
        animation: "modalIn 0.2s ease",
      }}>
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--border)",
        }}>
          <div>
            <p style={{
              fontSize: "0.7rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--gold)",
              fontWeight: 500,
              marginBottom: "0.2rem",
            }}>
              AI-Generated Outreach
            </p>
            <p style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1rem",
              color: "var(--foreground)",
            }}>
              Email to {professor}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--muted-foreground)",
              padding: "0.25rem",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem" }}>
          {state === "loading" && (
            <div style={{ textAlign: "center", padding: "2rem 0" }}>
              <div style={{
                width: "100%",
                height: "3px",
                backgroundColor: "var(--muted)",
                borderRadius: "999px",
                overflow: "hidden",
                marginBottom: "1rem",
              }}>
                <div className="progress-bar-indeterminate" style={{
                  width: "30%",
                  height: "100%",
                  backgroundColor: "var(--gold)",
                  borderRadius: "999px",
                }} />
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                Drafting your email with GPT-4o...
              </p>
            </div>
          )}

          {state === "rate_limited" && (
            <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
              <p style={{ fontWeight: 500, marginBottom: "0.4rem" }}>Daily email limit reached</p>
              <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
                You&apos;ve used all 3 email generations for today. Come back tomorrow.
              </p>
            </div>
          )}

          {state === "error" && (
            <div style={{ color: "#dc2626", fontSize: "0.9rem", padding: "1rem 0" }}>
              {errorMsg}
            </div>
          )}

          {state === "done" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {/* Subject */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                  fontWeight: 500,
                  marginBottom: "0.4rem",
                }}>
                  Subject line
                </p>
                <div style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "var(--muted)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "var(--foreground)",
                }}>
                  {subjectLine}
                </div>
              </div>

              {/* Opening */}
              <div>
                <p style={{
                  fontSize: "0.7rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--muted-foreground)",
                  fontWeight: 500,
                  marginBottom: "0.4rem",
                }}>
                  Email opening
                </p>
                <div style={{
                  padding: "1rem",
                  backgroundColor: "var(--muted)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "0.85rem",
                  lineHeight: 1.7,
                  color: "var(--foreground)",
                  whiteSpace: "pre-wrap",
                }}>
                  {opening}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", paddingTop: "0.5rem" }}>
                <button
                  onClick={onClose}
                  style={{
                    height: "34px",
                    padding: "0 1rem",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                    backgroundColor: "var(--muted)",
                    color: "var(--muted-foreground)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
                <button
                  onClick={copyAll}
                  style={{
                    height: "34px",
                    padding: "0 1rem",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                    backgroundColor: copied ? "#16a34a" : "var(--foreground)",
                    color: "#fff",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                >
                  {copied ? "Copied!" : "Copy all"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97) translateY(8px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}
