import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm" +
    "ring-offset-white transition-colors " +
    "focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 " +
    "disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white text-black border shadow-sm border-zinc-300 " + "hover:bg-white/70",
        destructive: "bg-red-500 text-zinc-50 hover:bg-red-500/90",
        outline: "border border-zinc-200 bg-white " + "hover:bg-zinc-100 hover:text-zinc-900",
        primary: "bg-emerald-500 text-white shadow-sm " + "hover:bg-emerald-600",
        secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-100/80",
        ghost: "hover:bg-black/10",
        link: "text-zinc-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-4 py-2",
        sm: "px-2 h-7 rounded-md",
        lg: "h-10 px-8 rounded-md",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
        "icon-xs": "h-5 w-5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "sm",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
