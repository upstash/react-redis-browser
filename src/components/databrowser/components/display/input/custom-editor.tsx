import { useEffect, useRef } from "react"
import { useTab } from "@/tab-provider"
import { Editor, useMonaco } from "@monaco-editor/react"

import { cn, isTest } from "@/lib/utils"
import { CopyButton } from "@/components/databrowser/copy-button"

export const CustomEditor = ({
  language,
  value,
  onChange,
  height,
  showCopyButton,
  readOnly,
}: {
  language: string
  value: string
  onChange: (value: string) => void
  height?: number
  showCopyButton?: boolean
  readOnly?: boolean
}) => {
  const { active } = useTab()
  const monaco = useMonaco()
  const editorRef = useRef()

  useEffect(() => {
    if (!active || !monaco || !editorRef.current) {
      return
    }

    // @ts-expect-error not typing the editor type
    monaco?.editor.setModelLanguage(editorRef.current.getModel(), language)
  }, [monaco, language, active])

  const editor = (
    <Editor
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
        renderLineHighlight: "none",
      }}
    />
  )

  return (
    <div
      className={cn("group/editor relative", height === undefined && "h-full p-2")}
      style={{ height: height }}
    >
      {isTest ? (
        <input aria-label="editor" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        editor
      )}
      {showCopyButton && (
        <CopyButton
          value={value}
          className="absolute right-0 top-0 hidden group-hover/editor:flex"
        />
      )}
    </div>
  )
}
