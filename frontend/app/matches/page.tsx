"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
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

interface MatchResponse {
  session_id: string;
  matches: LabMatch[];
}

async function fetchMatches(sessionId: string, massApply: boolean): Promise<MatchResponse> {
  const res = await fetch(`${API_URL}/api/v1/match/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId, mass_apply: massApply }),
  });
  if (res.status === 429) {
    throw new Error("__rate_limited__");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to fetch matches.");
  }
  return res.json();
}

function MatchesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session") || "";

  const [massApply, setMassApply] = useState(false);
  const [emailModal, setEmailModal] = useState<{ labId: string; professor: string } | null>(null);

  if (!sessionId) {
    router.push("/");
    return null;
  }

  // Each mode gets its own cache entry — switching tabs uses cached data for 5 min
  const { data, isLoading, error } = useQuery<MatchResponse, Error>({
    queryKey: ["matches", sessionId, massApply],
    queryFn: () => fetchMatches(sessionId, massApply),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const rateLimited = error?.message === "__rate_limited__";
  const fetchError = error && !rateLimited ? error.message : "";
  const matches = data?.matches ?? [];

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
          Opiral
        </button>
        <span style={{ fontSize: "0.78rem", color: "var(--muted-foreground)" }}>
          {matches.length > 0 ? `${matches.length} matches found` : ""}
        </span>
      </nav>

      <div style={{ maxWidth: "820px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Header */}
        <div style={{ marginBottom: "2.5rem" }}>
          <p className="fade-up" style={{
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--gold)",
            fontWeight: 500,
            marginBottom: "0.6rem",
          }}>
            Your Results
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
            <div className="fade-up">
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
            {/* Mode toggle — always visible, no fade-up */}
            <div style={{
              display: "flex",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              flexShrink: 0,
            }}>
              {[
                { label: "Top 5", value: false },
                { label: "Mass Apply (50)", value: true },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  onClick={() => setMassApply(value)}
                  style={{
                    padding: "0.4rem 0.9rem",
                    fontSize: "0.75rem",
                    fontWeight: 500,
                    fontFamily: "var(--font-sans)",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: massApply === value ? "var(--foreground)" : "var(--card)",
                    color: massApply === value ? "#fff" : "var(--muted-foreground)",
                    transition: "background-color 0.15s, color 0.15s",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {isLoading && (
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

        {fetchError && (
          <div style={{
            border: "1px solid #fca5a5",
            borderRadius: "var(--radius)",
            backgroundColor: "#fff5f5",
            padding: "1.5rem",
            color: "#dc2626",
            fontSize: "0.9rem",
          }}>
            {fetchError}
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
            <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Session limit reached</p>
            <p style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>
              You&apos;ve used all match requests for this session. Upload a new resume to continue.
            </p>
          </div>
        )}

        {!isLoading && !fetchError && !rateLimited && matches.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {matches.map((lab, i) => (
              <div
                key={lab.lab_id}
                className="fade-up"
                style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}
              >
                <LabCard
                  lab={lab}
                  isBest={i === 0}
                  onGenerateEmail={() => setEmailModal({ labId: lab.lab_id, professor: lab.professor })}
                />
              </div>
            ))}
          </div>
        )}

        {!isLoading && !fetchError && !rateLimited && matches.length === 0 && (
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

function LabCard({ lab, isBest, onGenerateEmail }: { lab: LabMatch; isBest: boolean; onGenerateEmail: () => void }) {
  const scorePercent = Math.round(lab.similarity_score * 100);

  return (
    <div style={{
      backgroundColor: "var(--card)",
      border: isBest ? "1.5px solid var(--gold)" : "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "1.75rem 2rem",
      display: "flex",
      flexDirection: "column",
      gap: "1rem",
    }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem" }}>
            <p style={{
              fontFamily: "var(--font-serif)",
              fontSize: "1.1rem",
              fontWeight: 400,
              color: "var(--foreground)",
            }}>
              {lab.professor}
            </p>
            {isBest && (
              <span style={{
                fontSize: "0.65rem",
                fontWeight: 600,
                color: "var(--gold)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
              }}>
                ★ Best Match
              </span>
            )}
          </div>
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

      {/* Research areas */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
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

      {/* About */}
      <p style={{
        fontSize: "0.78rem",
        color: "var(--muted-foreground)",
        lineHeight: 1.65,
        display: "-webkit-box",
        WebkitLineClamp: 3,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }}>
        {lab.professor_about || lab.description || "No additional information available."}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {lab.contact_email && (
          <a
            href={`mailto:${lab.contact_email}`}
            style={{
              fontSize: "0.75rem",
              color: "var(--muted-foreground)",
              textDecoration: "none",
            }}
          >
            {lab.contact_email}
          </a>
        )}
        <button
          onClick={onGenerateEmail}
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
            backgroundColor: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            cursor: "pointer",
            marginLeft: "auto",
          }}
        >
          Generate Email
        </button>
      </div>
    </div>
  );
}
