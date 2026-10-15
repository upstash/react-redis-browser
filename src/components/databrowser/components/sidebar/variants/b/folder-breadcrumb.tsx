import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import { IconArrowLeft, IconChevronRight, IconDots, IconHome } from "@tabler/icons-react"
import { flushSync } from "react-dom"

import { collapseCrumbs, getFolderCrumbs, getParentFolder } from "@/lib/folders"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { useKeys } from "../../../../hooks/use-keys"

// Longer paths keep the first and the last crumbs and fold the middle into a menu. Narrow
// sidebars fold more, so that the open folder stays readable.
const MAX_VISIBLE_CRUMBS = 3

const crumbClassName =
  "flex h-6 shrink-0 items-center rounded-md px-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-300"

const CrumbName = ({ name }: { name: string }) =>
  name ? <span className="truncate">{name}</span> : <span className="italic">(empty)</span>

export const FolderBreadcrumb = () => {
  const { folderView } = useKeys()
  const { setFolder } = useTab()
  const { folder, delimiter } = folderView

  const crumbs = getFolderCrumbs(folder, delimiter)
  const current = crumbs.at(-1)
  const parents = crumbs.slice(0, -1)

  const navRef = useRef<HTMLElement>(null)
  const currentRef = useRef<HTMLSpanElement>(null)
  const [width, setWidth] = useState(0)
  // Bumped when web fonts finish loading, since text widths change with them
  const [fontsLoaded, setFontsLoaded] = useState(0)

  useEffect(() => {
    const nav = navRef.current
    if (!nav) return
    // Render the new width right away, so the fold below applies before paint
    const observer = new ResizeObserver(([entry]) => {
      flushSync(() => setWidth(Math.round(entry.contentRect.width)))
    })
    observer.observe(nav)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (typeof document === "undefined" || !("fonts" in document)) return
    let cancelled = false
    const refit = () => {
      if (!cancelled) setFontsLoaded((count) => count + 1)
    }
    void document.fonts.ready.then(refit)
    document.fonts.addEventListener("loadingdone", refit)
    return () => {
      cancelled = true
      document.fonts.removeEventListener("loadingdone", refit)
    }
  }, [])

  // Start from the most crumbs for every folder and width, then fold one more parent
  // before paint while the open folder name is cut off.
  const fitKey = `${folder}|${delimiter}|${width}|${fontsLoaded}`
  const [fit, setFit] = useState({ key: fitKey, max: MAX_VISIBLE_CRUMBS })
  const maxParents = fit.key === fitKey ? fit.max : MAX_VISIBLE_CRUMBS

  useLayoutEffect(() => {
    const element = currentRef.current
    if (!element || maxParents === 0 || parents.length === 0) return
    if (element.scrollWidth > element.clientWidth) {
      setFit({ key: fitKey, max: Math.min(maxParents, parents.length) - 1 })
    }
  })

  const { visible, hidden } = collapseCrumbs(parents, maxParents)

  const separator = <IconChevronRight size={14} className="shrink-0 text-zinc-400" />

  return (
    <nav
      ref={navRef}
      aria-label="Folder path"
      className="browser-folder-path flex h-10 shrink-0 items-center gap-0.5 border-b border-zinc-200 px-1.5 text-[13px] dark:border-zinc-300"
    >
      <SimpleTooltip content={folder ? "Up one folder" : undefined}>
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-zinc-500 shadow-none hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-300"
          disabled={!folder}
          aria-label="Up one folder"
          onClick={() => setFolder(getParentFolder(folder, delimiter))}
        >
          <IconArrowLeft size={16} />
        </Button>
      </SimpleTooltip>

      <div className="flex min-w-0 grow items-center gap-0.5 overflow-hidden">
        <button
          className={cn(crumbClassName, "shrink-0 gap-1", !folder && "font-medium text-zinc-900")}
          onClick={() => setFolder("")}
          aria-current={folder ? undefined : "page"}
        >
          <IconHome size={14} className="shrink-0" />
          {!folder && <span>All keys</span>}
        </button>

        {visible.map((crumb) => (
          <Fragment key={crumb === "hidden" ? "hidden" : crumb.folder}>
            {separator}
            {crumb === "hidden" ? (
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <button className={cn(crumbClassName, "shrink-0")} aria-label="Show hidden path">
                    <IconDots size={14} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {hidden.map((item) => (
                    <DropdownMenuItem key={item.folder} onSelect={() => setFolder(item.folder)}>
                      <CrumbName name={item.name} />
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                className={cn(crumbClassName, "max-w-[120px]")}
                onClick={() => setFolder(crumb.folder)}
                title={crumb.folder}
              >
                <CrumbName name={crumb.name} />
              </button>
            )}
          </Fragment>
        ))}

        {current && (
          <>
            {separator}
            <span
              ref={currentRef}
              className="h-6 min-w-0 shrink truncate px-1.5 font-medium leading-6 text-zinc-900"
              aria-current="page"
              title={current.folder}
            >
              {current.name || <span className="italic">(empty)</span>}
            </span>
          </>
        )}
      </div>
    </nav>
  )
}

/** The delimiter that splits keys into folders, in the view strip above the list */
export const DelimiterSetting = () => {
  const { folderDelimiter, setFolderDelimiter } = useDatabrowserStore()
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(folderDelimiter)

  const save = () => {
    if (value && value !== folderDelimiter) setFolderDelimiter(value)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (isOpen) setValue(folderDelimiter)
      }}
    >
      <SimpleTooltip content={open ? undefined : "Folder delimiter"}>
        <PopoverTrigger asChild>
          <button
            className="flex h-7 shrink-0 items-center gap-1.5 rounded-md pl-2 pr-1 text-[13px] text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-900"
            aria-label="Folder delimiter"
          >
            Split at
            <span className="flex h-5 min-w-5 items-center justify-center rounded border border-zinc-300 bg-white px-1 font-mono text-xs text-zinc-700">
              {folderDelimiter}
            </span>
          </button>
        </PopoverTrigger>
      </SimpleTooltip>
      <PopoverContent align="end" className="w-64 p-3">
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            save()
          }}
        >
          <label htmlFor="folder-delimiter" className="text-sm font-medium text-zinc-900">
            Folder delimiter
          </label>
          <p className="text-xs text-zinc-500">
            Keys are grouped into folders at this character, like <code>:</code> in{" "}
            <code>user:1:profile</code>.
          </p>
          <div className="flex gap-2">
            <Input
              id="folder-delimiter"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={8}
              className="h-8 font-mono"
              autoFocus
            />
            <Button type="submit" size="default" variant="primary" disabled={!value}>
              Save
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  )
}
