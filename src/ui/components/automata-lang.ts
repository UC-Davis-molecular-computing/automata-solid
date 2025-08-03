/**
 * Simple automata YAML language support
 * Uses base YAML highlighting - good enough for now
 */

import { LanguageSupport } from '@codemirror/language'
import { yaml } from '@codemirror/lang-yaml'

/**
 * Create a language support for Automata YAML files
 * Just uses standard YAML highlighting with theme-appropriate colors
 */
export function automataYaml(): LanguageSupport {
  return yaml()
}