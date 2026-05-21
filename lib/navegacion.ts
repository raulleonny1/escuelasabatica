export const IR_MENU_PRINCIPAL_EVENT = "ir-menu-principal"

export function irAMenuPrincipal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(IR_MENU_PRINCIPAL_EVENT))
  }
}
