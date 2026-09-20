import { useEffect, useRef } from "react"
import { useTheme } from "@/dark-mode-context"
import { useTab } from "@/tab-provider"
import { Editor, useMonaco } from "@monaco-editor/react"

import { cn, isTest } from "@/lib/utils"
import { CopyButton } from "@/components/common/copy-button"

import { useCompactLayout } from "../../../hooks/use-compact-layout"

type CustomEditorProps = {
  language: string
  value: string
  onChange: (value: string) => void
  height?: number
  showCopyButton?: boolean
  readOnly?: boolean
}

export const CustomEditor = (props: CustomEditorProps) => {
  const compact = useCompactLayout()
  if (compact) return <MobileEditor {...props} />

  // Avoid mounting Monaco at all during Playwright runs
  if (isTest) {
    return <TestEditor {...props} />
  }

  return <MonacoEditor {...props} />
}

const MonacoEditor = ({
  language,
  value,
  onChange,
  height,
  showCopyButton,
  readOnly,
}: CustomEditorProps) => {
  const { active } = useTab()
  const monaco = useMonaco()
  const editorRef = useRef()
  const theme = useTheme()

  useEffect(() => {
    if (!active || !monaco || !editorRef.current) {
      return
    }

    // @ts-expect-error not typing the editor type
    monaco?.editor.setModelLanguage(editorRef.current.getModel(), language)
  }, [monaco, language, active])

  const editor = (
    <Editor
      theme={theme === "dark" ? "vs-dark" : "light"}
      loading={undefined}
      onMount={(editor) => {
        // @ts-expect-error not typing the editor type
        editorRef.current = editor
      }}
      value={value}
      onChange={(value) => {
        onChange(value ?? "")
      }}
      defaultLanguage={language}
      options={{
        readOnly: readOnly,
        wordWrap: "on",
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        formatOnPaste: true,
        formatOnType: true,
        renderWhitespace: "none",
        smoothScrolling: true,
        autoIndent: "full",
        guides: { indentation: false },
        fontSize: 13,
        cursorBlinking: "smooth",
        minimap: { enabled: false },
        folding: false,
        glyphMargin: false,
        lineNumbers: "off",
        parameterHints: { enabled: false },
        lineDecorationsWidth: 0,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderLineHighlight: "line",
        renderLineHighlightOnlyWhenFocus: true,
        // @ts-expect-error "off" does not work
        occurrencesHighlight: false,
        hover: { enabled: true },
        unusualLineTerminators: "auto",
        padding: { top: 0, bottom: 0 },
      }}
      className="[&_.monaco-editor-background]:!bg-transparent [&_.monaco-editor]:!bg-transparent"
    />
  )

  return (
    <div
      className={cn("group/editor relative", height === undefined && "h-full")}
      style={{ height: height }}
    >
      {editor}
      {showCopyButton && (
        <CopyButton
          value={value}
          className="absolute right-0 top-0 hidden group-hover/editor:flex"
        />
      )}
    </div>
  )
}

const TestEditor = ({ value, onChange, height, showCopyButton }: CustomEditorProps) => {
  return (
    <div
      className={cn("group/editor relative", height === undefined && "h-full")}
      style={{ height: height }}
    >
      <input aria-label="editor" value={value} onChange={(e) => onChange(e.target.value)} />
      {showCopyButton && (
        <CopyButton
          value={value}
          className="absolute right-0 top-0 hidden group-hover/editor:flex"
        />
      )}
    </div>
  )
}

// Native editing supports phone selection, keyboards, and scrolling without
// Monaco intercepting touch gestures.
const MobileEditor = ({ value, onChange, height, showCopyButton, readOnly }: CustomEditorProps) => (
  <div className={cn("relative min-h-0", height === undefined && "h-full")} style={{ height }}>
    <textarea
      aria-label="editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      readOnly={readOnly}
      spellCheck={false}
      autoCapitalize="off"
      autoCorrect="off"
      className={cn(
        "h-full min-h-0 w-full resize-none rounded-md bg-transparent font-mono text-base outline-none",
        showCopyButton && "pr-11"
      )}
    />
    {showCopyButton && <CopyButton value={value} className="absolute right-0 top-0" />}
  </div>
)
