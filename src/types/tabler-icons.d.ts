// Icons are imported one file at a time (`@tabler/icons-react/dist/esm/icons/IconX.mjs`)
// rather than from the package root. The root is a barrel over ~6k modules, and a
// bundler that does not tree-shake in dev — Turbopack, for one — pulls every one of
// them into the graph for any consumer of this package.
//
// @tabler/icons-react ships its types as a single barrel `.d.ts` with no per-icon
// declarations, so those deep imports resolve to `any` without this shim.
declare module "@tabler/icons-react/dist/esm/icons/*.mjs" {
  import type { TablerIcon } from "@tabler/icons-react"

  const icon: TablerIcon
  export default icon
}
