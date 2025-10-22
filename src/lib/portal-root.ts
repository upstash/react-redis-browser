let root
let wrapper

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
  const id = "react-redis-browser-portal-root"

  wrapper = document.querySelector(`#${id}`) ?? document.createElement("div")

  wrapper.classList.add("ups-db")
  wrapper.id = "react-redis-browser-portal-root"

  root = document.createElement("div")
  root.classList.add("text-zinc-700")

  wrapper.append(root)
  document.body.append(wrapper)
}

export const portalRoot = root as HTMLDivElement
export const portalWrapper = wrapper as HTMLDivElement
