import { useEffect, useRef, useMemo } from "react"
import { useTheme } from "@/dark-mode-context"
import { Editor, useMonaco, type Monaco, type BeforeMount } from "@monaco-editor/react"

import { cn, isTest } from "@/lib/utils"
import { generateTypeDefinitions } from "./generateTypeDefinitions"

// Schema field types as returned by index.describe()
type SchemaFieldType = "TEXT" | "U64" | "I64" | "F64" | "BOOL" | "DATE"

type SchemaField = {
  type: SchemaFieldType | string
  fast?: boolean
}

// Flexible type that accepts any schema structure from the SDK
export type IndexSchema = Record<string, SchemaField | { type: string }>

type QueryEditorProps = {
  value: string
  onChange: (value: string) => void
  height?: number
  schema?: IndexSchema
}

export const QueryEditor = (props: QueryEditorProps) => {
  // Avoid mounting Monaco at all during Playwright runs
  if (isTest) {
    return <TestQueryEditor {...props} />
  }

  return <MonacoQueryEditor {...props} />
}

const MonacoQueryEditor = ({ value, onChange, height, schema }: QueryEditorProps) => {
  const monaco = useMonaco()
  const editorRef = useRef<unknown>(null)
  const theme = useTheme()
  const libDisposableRef = useRef<{ dispose: () => void } | null>(null)

  // Generate type definitions based on schema
  const typeDefinitions = useMemo(() => generateTypeDefinitions(schema), [schema])

  // Update type definitions when schema changes
  useEffect(() => {
    if (!monaco) return

    // Dispose previous lib if exists
    if (libDisposableRef.current) {
      libDisposableRef.current.dispose()
    }

    // Add new type definitions
    libDisposableRef.current = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      typeDefinitions,
      "file:///query-types.d.ts"
    )

    return () => {
      if (libDisposableRef.current) {
        libDisposableRef.current.dispose()
      }
    }
  }, [monaco, typeDefinitions])

  const handleBeforeMount: BeforeMount = (monaco: Monaco) => {
    // Configure TypeScript compiler options
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

    // Add initial type definitions
    libDisposableRef.current = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      typeDefinitions,
      "file:///query-types.d.ts"
    )

    // Configure diagnostics
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    })

    // Enable eager model sync for better performance
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true)
  }

  useEffect(() => {
    const match = value.startsWith("const query: Query = {")
    const ending = value.endsWith("}")
    if (!match || !ending) {
      onChange("const query: Query = {}")
    }
  }, [value, editorRef.current, onChange])

  // Wrap the value to make it a valid TypeScript expression
  const handleChange = (newValue: string | undefined) => {
    if (!newValue) {
      onChange("")
      return
    }

    // Check if the value contains the required prefix
    const match = newValue.startsWith("const query: Query = {")
    if (match) {
      onChange(newValue)
    } else {
      // Revert the editor content to prevent removing the required prefix
      const editor = editorRef.current
      if (editor) {
        // Use setValue to restore the previous valid value
        // @ts-expect-error not typing the editor type
        editor.setValue(value)
      }
    }
  }

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
            verticalScrollbarSize: 12,
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
