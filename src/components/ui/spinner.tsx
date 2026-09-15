// shadcn-side support component for the genuine Kobra toast (@kobra/toast),
// whose sibling @kobra/spinner is part of Kobra's paid library.
import { cn } from "@/lib/utils"

export function StatusBadge({
  state,
  className,
}: {
  state: "loading" | "done"
  className?: string
}) {
  return (
    <span
      role="status"
      aria-label={state === "done" ? "Done" : "Loading"}
      className={cn("inline-grid place-items-center", className)}
      style={{
        width: "var(--check-size, 16px)",
        height: "var(--check-size, 16px)",
      }}
    >
      {state === "done" ? (
        <svg viewBox="0 0 16 16" className="size-full text-success" aria-hidden>
          <path
            d="M3 8.5 6.5 12 13 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          viewBox="0 0 16 16"
          className="size-full animate-spin text-muted-foreground motion-reduce:animate-none"
          aria-hidden
        >
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="2" />
          <path d="M14 8a6 6 0 0 0-6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <StatusBadge state="loading" className={className} />
}
