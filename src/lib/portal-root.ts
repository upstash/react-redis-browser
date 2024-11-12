let root

// This creates a div element and appends it to the body that will be used as the portal root
// for all the components that need to be rendered outside the normal flow of the DOM.
//
// NOTE: When adding new shadcn components, always add container={portalRoot} to the Portal component
//
// Example:
// const DialogPortal = (props: DialogPrimitive.DialogPortalProps) => (
//   <DialogPrimitive.Portal container={portalRoot} {...props} />
// )
if (typeof document !== "undefined") {
  root = document.createElement("div")

  root.classList.add("ups-db")

  document.body.append(root)
}

export const portalRoot = root as HTMLDivElement
