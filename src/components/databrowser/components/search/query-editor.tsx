import { useEffect, useMemo, useRef } from "react"
import { useTheme } from "@/dark-mode-context"
import { Editor, useMonaco, type BeforeMount, type Monaco } from "@monaco-editor/react"

import { cn, isTest } from "@/lib/utils"
import type { SearchIndex } from "@/components/databrowser/hooks/use-fetch-search-index"

import { generateTypeDefinitions } from "./generate-type-definitions"

type QueryEditorProps = {
  value: string
  onChange: (value: string) => void
  height?: number
  schema?: SearchIndex
}

export const QueryEditor = (props: QueryEditorProps) => {
  return isTest ? <TestQueryEditor {...props} /> : <MonacoQueryEditor {...props} />
}

const MonacoQueryEditor = ({ value, onChange, height, schema }: QueryEditorProps) => {
  const monaco = useMonaco()
  const editorRef = useRef<unknown>(null)
  const theme = useTheme()
  const typeDefinitions = useMemo(() => generateTypeDefinitions(schema), [schema])

  const extraLibRef = useRef<{ dispose: () => void } | null>(null)

  // Update type definitions
  useEffect(() => {
    if (!monaco) return

    if (extraLibRef.current) extraLibRef.current.dispose()

    extraLibRef.current = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      typeDefinitions,
      "file:///query-types.d.ts"
    )
  }, [monaco, typeDefinitions])

  // Prevent deleting the "const query: Query" prefix
  const handleChange = (newValue: string = "") => {
    const match = isQueryStringValid(newValue)
    if (match) {
      onChange(newValue)
    } else {
      // @ts-expect-error not typing the editor type
      editorRef.current?.setValue?.(value)
    }
  }

  // If the prefix is somehow deleted, restore it
  useEffect(() => {
    if (!isQueryStringValid(value)) onChange("const query: Query = {}")
  }, [value, editorRef.current, onChange])

  return (
    <div className={cn("group/editor relative")} style={{ height }}>
      <Editor
        theme={theme === "dark" ? "vs-dark" : "light"}
        loading={undefined}
        beforeMount={handleBeforeMount}
        onMount={(editor) => {
          editorRef.current = editor
        }}
        value={value}
        onChange={handleChange}
        defaultLanguage="typescript"
        path="query.ts"
        options={{
          wordWrap: "on",
          overviewRulerBorder: false,
          overviewRulerLanes: 0,
          formatOnPaste: true,
          formatOnType: true,
          renderWhitespace: "none",
          smoothScrolling: true,
          scrollbar: {
            verticalScrollbarSize: 6,
          },
          autoIndent: "full",
          guides: { indentation: false },
          fontSize: 13,
          cursorBlinking: "smooth",
          minimap: { enabled: false },
          folding: true,
          glyphMargin: false,
          lineNumbers: "on",
          parameterHints: { enabled: true },
          lineDecorationsWidth: 0,
          automaticLayout: true,
          scrollBeyondLastLine: false,
          renderLineHighlight: "line",
          unusualLineTerminators: "auto",
          padding: { top: 8, bottom: 8 },
          quickSuggestions: true,
          suggest: {
            showVariables: false,
            showConstants: false,
            showFunctions: false,
            showClasses: false,
            showInterfaces: false,
            showModules: false,
            showKeywords: false,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          wordBasedSuggestions: "off",
          // Disable navigation features
          gotoLocation: {
            multiple: "goto",
            multipleDefinitions: "goto",
            multipleTypeDefinitions: "goto",
            multipleDeclarations: "goto",
            multipleImplementations: "goto",
            multipleReferences: "goto",
          },
          definitionLinkOpensInPeek: false,
          contextmenu: false,
        }}
        className="[&_.current-line]:!border-none [&_.current-line]:!bg-emerald-50 [&_.monaco-editor-background]:!bg-transparent [&_.monaco-editor]:!bg-transparent [&_[role='presentation']]:!bg-transparent"
      />
    </div>
  )
}

const isQueryStringValid = (value: string) => {
  return value.startsWith("const query: Query = {") && value.endsWith("}")
}

// Configure Monaco
const handleBeforeMount: BeforeMount = (monaco: Monaco) => {
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    esModuleInterop: true,
    strict: true,
    allowJs: true,
  })

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
  })

  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
}

// Dummy for the tests
const TestQueryEditor = ({ value, onChange, height }: QueryEditorProps) => {
  return (
    <div className={cn("group/editor relative")} style={{ height }}>
      <textarea
        aria-label="query-editor"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full resize-none bg-transparent p-2 font-mono text-sm"
      />
    </div>
  )
}
