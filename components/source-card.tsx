"use client"

import { ExternalLink } from "lucide-react"
import { usePostHog } from "posthog-js/react"
import type { Source, SignalQuality, NoiseLevel, UpdateCadence, SourceType, RemoteSupport } from "@/lib/sources"

interface SourceCardProps {
  source: Source
}

const SIGNAL_LABEL: Record<SignalQuality, { label: string; color: string }> = {
  high: { label: "High signal", color: "text-green-400 border-green-800/50 bg-green-950/20" },
  medium: { label: "Medium signal", color: "text-yellow-500/80 border-yellow-800/50 bg-yellow-950/20" },
  low: { label: "Lower signal", color: "text-zinc-400 border-zinc-700/60 bg-zinc-900/20" },
}

const CADENCE_LABEL: Record<UpdateCadence, string> = {
  daily: "Updated daily",
  weekly: "Updated weekly",
  monthly: "Updated monthly",
  irregular: "Irregular updates",
}

const TYPE_LABEL: Record<SourceType, { label: string; color: string }> = {
  curated: { label: "Curated", color: "text-violet-400 border-violet-800/50 bg-violet-950/20" },
  community: { label: "Community", color: "text-sky-400 border-sky-800/50 bg-sky-950/20" },
  aggregator: { label: "Aggregator", color: "text-zinc-400 border-zinc-700/60 bg-zinc-900/20" },
}

const NOISE_LABEL: Record<NoiseLevel, { label: string; color: string } | null> = {
  low: null, // low noise is the default expectation — don't badge it
  medium: { label: "Medium noise", color: "text-yellow-500/70 border-yellow-800/40 bg-yellow-950/20" },
  high: { label: "High noise", color: "text-orange-500/80 border-orange-800/50 bg-orange-950/20" },
}

const REMOTE_LABEL: Record<RemoteSupport, { label: string; show: boolean }> = {
  "remote-only": { label: "Remote only", show: true },
  "remote-friendly": { label: "Remote friendly", show: true },
  mixed: { label: "Mixed", show: false },
}

export function SourceCard({ source }: SourceCardProps) {
  const ph = usePostHog()

  function handleClick() {
    ph?.capture("source_clicked", {
      source_id: source.id,
      source_name: source.name,
      category: source.category,
    })
  }

  const signal = SIGNAL_LABEL[source.signalQuality]
  const noise = NOISE_LABEL[source.noiseLevel]
  const typeChip = TYPE_LABEL[source.type]
  const remoteInfo = REMOTE_LABEL[source.remote]

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      style={{
        display: "block",
        padding: "14px 16px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--card)",
        textDecoration: "none",
        transition: "border-color 0.1s, background 0.1s",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget
        el.style.borderColor = "color-mix(in oklch, var(--border), white 15%)"
        el.style.background = "color-mix(in oklch, var(--card), white 3%)"
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget
        el.style.borderColor = "var(--border)"
        el.style.background = "var(--card)"
      }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
        <span
          style={{
            fontSize: 13.5,
            fontWeight: 600,
            color: "var(--foreground)",
            lineHeight: 1.3,
          }}
        >
          {source.name}
        </span>
        <ExternalLink
          size={13}
          style={{ color: "var(--muted-foreground)", flexShrink: 0, marginTop: 2 }}
        />
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 12,
          color: "var(--muted-foreground)",
          lineHeight: 1.55,
          margin: "0 0 10px",
        }}
      >
        {source.description}
      </p>

      {/* Tip */}
      {source.tip && (
        <p
          style={{
            fontSize: 11,
            color: "color-mix(in oklch, var(--muted-foreground), transparent 30%)",
            lineHeight: 1.5,
            margin: "0 0 10px",
            paddingLeft: 8,
            borderLeft: "2px solid var(--border)",
            fontStyle: "italic",
          }}
        >
          {source.tip}
        </p>
      )}

      {/* Chips */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        <Chip className={signal.color}>{signal.label}</Chip>
        {noise && <Chip className={noise.color}>{noise.label}</Chip>}
        <Chip className={typeChip.color}>{typeChip.label}</Chip>
        {remoteInfo.show && (
          <Chip className="text-green-400 border-green-800/50 bg-green-950/20">
            {remoteInfo.label}
          </Chip>
        )}
        {source.beginnerFriendly && (
          <Chip className="text-sky-400 border-sky-800/50 bg-sky-950/20">Beginner OK</Chip>
        )}
        <Chip className="text-zinc-500 border-zinc-700/50 bg-zinc-900/20">
          {CADENCE_LABEL[source.cadence]}
        </Chip>
      </div>
    </a>
  )
}

function Chip({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span
      className={`inline-flex items-center border rounded text-[10.5px] font-medium px-1.5 py-0 h-[18px] ${className}`}
      style={{ lineHeight: 1 }}
    >
      {children}
    </span>
  )
}
