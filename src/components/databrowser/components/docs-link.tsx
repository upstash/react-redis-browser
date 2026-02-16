import { IconExternalLink } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

export const DocsLink = ({ href, className }: { href: string; className?: string }) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 px-1 text-xs text-zinc-400 transition-colors hover:text-zinc-600",
        className
      )}
    >
      Docs
      <IconExternalLink size={12} />
    </a>
  )
}
