"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import EmailModal from "@/components/EmailModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LabMatch {
  lab_id: string;
  professor: string;
  department: string;
  research_areas: string[];
  similarity_score: number;
  contact_email?: string;
  description?: string;
  professor_about?: string;
}

function MatchesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";

  const [matches, setMatches] = useState<LabMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rateLimited, setRateLimited] = useState(false);
  const [emailModal, setEmailModal] = useState<{ labId: string; professor: string } | null>(null);

  const fetchMatches = useCallback(async () => {
    if (!sessionId) {
      router.push("/");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/match/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (res.status === 429) {
        setRateLimited(true);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to fetch matches.");
      }
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, router]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "var(--background)" }}>
      {/* Nav */}
      <nav style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2.5rem",
        height: "60px",
        borderBottom: "1px solid var(--border)",
        backgroundColor: "var(--background)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => router.push("/")}
          style={{
            fontFamily: "var(--font-serif)",
            fontSize: "1.2rem",
            letterSpacing: "-0.01em",
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--foreground)",
          }}
        >
          Semora
        </button>
        <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
          {matches.length > 0 ? `${matches.length} matches found` : ""}
        </span>
      </nav>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Header */}
        <div className="fade-up" style={{ marginBottom: "2.5rem" }}>
          <p style={{
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold)",
            fontWeight: 500,
            marginBottom: "0.6rem",
          }}>
            Your Results
          </p>
          <h1 style={{
            fontFamily: "var(--font-serif)",
            fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
            color: "var(--foreground)",
          }}>
            Research Lab Matches
          </h1>
          <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)", marginTop: "0.5rem" }}>
            Hover each card to learn more. Click <em>Generate Email</em> to draft a personalized outreach.
          </p>
        </div>

        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{
                height: "200px",
                borderRadius: "var(--radius)",
                backgroundColor: "var(--muted)",
                animation: "pulse 1.5s ease infinite",
              }} />
            ))}
          </div>
        )}

        {error && (
          <div style={{
            border: "1px solid #fca5a5",
            borderRadius: "var(--radius)",
            backgroundColor: "#fff5f5",
            padding: "1.5rem",
            color: "#dc2626",
            fontSize: "0.9rem",
          }}>
            {error}
          </div>
        )}

        {rateLimited && (
          <div style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            backgroundColor: "var(--card)",
            padding: "2rem",
            textAlign: "center",
          }}>
            <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Daily limit reached</p>
            <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              You&apos;ve used all 5 match requests for today. Come back tomorrow.
            </p>
          </div>
        )}

        {!loading && !error && !rateLimited && matches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {matches.map((lab, i) => (
              <div
                key={lab.lab_id}
                className="fade-up"
                style={{ animationDelay: `${i * 0.08}s`, opacity: 0 }}
              >
                <LabCard
                  lab={lab}
                  onGenerateEmail={() => setEmailModal({ labId: lab.lab_id, professor: lab.professor })}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && !rateLimited && matches.length === 0 && (
          <div style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "2rem",
            textAlign: "center",
            color: "var(--muted-foreground)",
            fontSize: "0.9rem",
          }}>
            No matches found. Try uploading a more detailed resume.
          </div>
        )}
      </div>

      {emailModal && (
        <EmailModal
          sessionId={sessionId}
          labId={emailModal.labId}
          professor={emailModal.professor}
          onClose={() => setEmailModal(null)}
        />
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </main>
  );
}

export default function MatchesPage() {
  return (
    <Suspense>
      <MatchesContent />
    </Suspense>
  );
}

function LabCard({ lab, onGenerateEmail }: { lab: LabMatch; onGenerateEmail: () => void }) {
  const scorePercent = Math.round(lab.similarity_score * 100);

  return (
    <div className="flip-card" style={{ height: "220px" }}>
      <div className="flip-card-inner">
        {/* Front */}
        <div className="flip-card-front" style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          padding: "1.75rem 2rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
              <div>
                <p style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: "1.1rem",
                  fontWeight: 400,
                  color: "var(--foreground)",
                  marginBottom: "0.2rem",
                }}>
                  {lab.professor}
                </p>
                <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
                  {lab.department}
                </p>
              </div>
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "4px",
              }}>
                <span style={{
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  color: scorePercent >= 70 ? "var(--gold)" : "var(--foreground)",
                  letterSpacing: "-0.02em",
                }}>
                  {scorePercent}%
                </span>
                <span style={{ fontSize: "0.65rem", color: "var(--muted-foreground)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  match
                </span>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "1rem" }}>
              {lab.research_areas.slice(0, 4).map((area) => (
                <span key={area} style={{
                  fontSize: "0.7rem",
                  padding: "0.2rem 0.6rem",
                  backgroundColor: "var(--muted)",
                  borderRadius: "999px",
                  color: "var(--muted-foreground)",
                  fontWeight: 500,
                }}>
                  {area}
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{
              fontSize: "0.72rem",
              color: "var(--muted-foreground)",
              fontStyle: "italic",
            }}>
              Hover to read more
            </span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 6h8M6 2l4 4-4 4" stroke="var(--muted-foreground)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        {/* Back */}
        <div className="flip-card-back" style={{
          backgroundColor: "var(--foreground)",
          padding: "1.75rem 2rem",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-serif)",
              fontSize: "0.95rem",
              fontWeight: 400,
              color: "#fff",
              marginBottom: "0.75rem",
            }}>
              {lab.professor}
            </p>
            <p style={{
              fontSize: "0.78rem",
              color: "rgba(255,255,255,0.65)",
              lineHeight: 1.65,
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {lab.professor_about || lab.description || "No additional information available."}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {lab.contact_email && (
              <a
                href={`mailto:${lab.contact_email}`}
                style={{
                  fontSize: "0.75rem",
                  color: "rgba(255,255,255,0.5)",
                  textDecoration: "none",
                }}
              >
                {lab.contact_email}
              </a>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onGenerateEmail(); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                height: "32px",
                padding: "0 1rem",
                fontSize: "0.75rem",
                fontWeight: 500,
                fontFamily: "var(--font-sans)",
                color: "var(--foreground)",
                backgroundColor: "#fff",
                border: "none",
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                marginLeft: "auto",
              }}
            >
              Generate Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
