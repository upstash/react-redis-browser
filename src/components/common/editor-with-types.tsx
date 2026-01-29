import { useEffect, useRef } from "react"
import { useTheme } from "@/dark-mode-context"
import { Editor, useMonaco, type BeforeMount, type Monaco } from "@monaco-editor/react"

import { cn, isTest } from "@/lib/utils"

type EditorWithTypesProps = {
  value: string
  onChange: (value: string) => void
  height?: number
  typeDefinitions: string
  validateValue: (value: string) => boolean
  defaultValue: string
  filePath: string
  testLabel: string
  showFunctions?: boolean
}

export const EditorWithTypes = (props: EditorWithTypesProps) => {
  return isTest ? <TestEditor {...props} /> : <MonacoEditorWithTypes {...props} />
}

const LoadingSpinner = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
  </div>
)

const MonacoEditorWithTypes = ({
  value,
  onChange,
  height,
  typeDefinitions,
  validateValue,
  defaultValue,
  filePath,
  showFunctions,
}: EditorWithTypesProps) => {
  const monaco = useMonaco()
  const editorRef = useRef<unknown>(null)
  const extraLibRef = useRef<{ dispose: () => void } | null>(null)
  const theme = useTheme()

  // Update type definitions when they change
  useEffect(() => {
    if (!monaco) return

    // Dispose previous extraLib if it exists
    extraLibRef.current?.dispose()

    extraLibRef.current = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      typeDefinitions,
      `file:///${filePath.replace(".ts", "-types.d.ts")}`
    )

    // Force Monaco to re-validate by triggering a no-op edit on the model
    // This is a workaround for Monaco not auto-refreshing after addExtraLib
    // See: https://github.com/microsoft/monaco-editor/issues/208
    requestAnimationFrame(() => {
      // @ts-expect-error editor type not fully typed
      const model = editorRef.current?.getModel?.()
      if (model) {
        const currentValue = model.getValue()
        model.setValue(currentValue)
      }
    })
  }, [monaco, typeDefinitions, filePath])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      extraLibRef.current?.dispose()
      if (monaco) {
        const model = monaco.editor.getModel(monaco.Uri.parse(filePath))
        model?.dispose()
      }
    }
  }, [monaco, filePath])

  // Prevent deleting the required prefix/suffix
  const handleChange = (newValue: string = "") => {
    if (validateValue(newValue)) {
      onChange(newValue)
    } else if (newValue.trim() === "") {
      onChange(defaultValue)
    } else {
      // @ts-expect-error not typing the editor type
      editorRef.current?.setValue?.(value)
    }
  }

  // If the value is somehow invalid, restore it
  useEffect(() => {
    if (!validateValue(value)) onChange(defaultValue)
  }, [value, editorRef.current, onChange, validateValue, defaultValue])

  return (
    <div
      className={cn("group/editor relative", height === undefined && "h-full")}
      style={{ height }}
    >
      <Editor
        theme={theme === "dark" ? "vs-dark" : "light"}
        loading={<LoadingSpinner />}
        beforeMount={handleBeforeMount}
        onMount={(editor) => {
          editorRef.current = editor
        }}
        value={value}
        onChange={handleChange}
        defaultLanguage="typescript"
        path={filePath}
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
          renderLineHighlightOnlyWhenFocus: true,
          selectionHighlight: false,
          // @ts-expect-error "off" does not work
          occurrencesHighlight: false,
          hover: { enabled: true },
          unusualLineTerminators: "auto",
          padding: { top: 8, bottom: 8 },
          quickSuggestions: true,
          suggest: {
            showFunctions: showFunctions ?? false,
            showVariables: false,
            showConstants: false,
            showClasses: false,
            showInterfaces: false,
            showModules: false,
            showKeywords: false,
          },
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",
          tabSize: 2,
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
const TestEditor = ({ value, onChange, height, testLabel }: EditorWithTypesProps) => {
  return (
    <div
      className={cn("group/editor relative", height === undefined && "h-full")}
      style={{ height }}
    >
      <textarea
        aria-label={testLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-full w-full resize-none bg-transparent p-2 font-mono text-sm"
      />
    </div>
  )
}
