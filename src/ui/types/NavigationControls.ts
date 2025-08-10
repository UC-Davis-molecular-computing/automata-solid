export interface NavigationControls {
  goForward: () => void
  goBackward: () => void
  goToBeginning: () => void
  goToEnd: () => void
  canGoForward: () => boolean
  canGoBackward: () => boolean
}