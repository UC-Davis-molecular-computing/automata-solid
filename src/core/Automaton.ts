/**
 * Common interface for all automaton types
 */
export interface Automaton {
  /**
   * Test if the automaton accepts the given input string
   */
  accepts(input: string): boolean
}