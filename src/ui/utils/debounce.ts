/**
 * Simple debounce function to limit how often a function can be called
 * @param func Function to debounce
 * @param delay Delay in milliseconds
 * @returns Debounced function
 */
// Using any here is acceptable for utility function - the constraint ensures type safety
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}