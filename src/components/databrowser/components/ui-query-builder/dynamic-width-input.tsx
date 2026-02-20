import { useLayoutEffect, useRef, useState } from "react"

// Global canvas context for measuring text width without DOM manipulation
let measureContext: CanvasRenderingContext2D | null = null

const getTextWidth = (text: string, font: string): number => {
  if (!measureContext) {
    const canvas = document.createElement("canvas")
    measureContext = canvas.getContext("2d")
  }
  if (measureContext) {
    measureContext.font = font
    return measureContext.measureText(text).width
  }
  return 0
}

export const DynamicWidthInput = ({
  value,
  onChange,
  onFocus,
  onBlur,
  className = "",
  minWidth = 20,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onBlur?: () => void
  className?: string
  minWidth?: number
  placeholder?: string
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [width, setWidth] = useState(minWidth)

  useLayoutEffect(() => {
    if (inputRef.current) {
      const computedStyle = window.getComputedStyle(inputRef.current)
      const font = `${computedStyle.fontWeight} ${computedStyle.fontSize} ${computedStyle.fontFamily}`
      const textWidth = getTextWidth(value || placeholder || "", font)
      setWidth(Math.max(Math.ceil(textWidth), minWidth))
    }
  }, [value, minWidth, placeholder])

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder}
      style={{ width }}
      className={`border-none bg-transparent text-center focus:outline-none ${className}`}
    />
  )
}
