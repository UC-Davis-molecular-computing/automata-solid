import { oneDark } from '@codemirror/theme-one-dark'
import { solarizedLight, solarizedDark } from '@uiw/codemirror-theme-solarized'
import { abcdef } from '@uiw/codemirror-theme-abcdef'
import { abyss } from '@uiw/codemirror-theme-abyss'
import { androidstudio } from '@uiw/codemirror-theme-androidstudio'
import { andromeda } from '@uiw/codemirror-theme-andromeda'
import { atomone } from '@uiw/codemirror-theme-atomone'
import { aura } from '@uiw/codemirror-theme-aura'
import { bbedit } from '@uiw/codemirror-theme-bbedit'
import { bespin } from '@uiw/codemirror-theme-bespin'
import { copilot } from '@uiw/codemirror-theme-copilot'
import { darcula } from '@uiw/codemirror-theme-darcula'
import { dracula } from '@uiw/codemirror-theme-dracula'
import { duotoneLight, duotoneDark } from '@uiw/codemirror-theme-duotone'
import { eclipse } from '@uiw/codemirror-theme-eclipse'
import { githubLight, githubDark } from '@uiw/codemirror-theme-github'
import { gruvboxDark } from '@uiw/codemirror-theme-gruvbox-dark'
import { kimbie } from '@uiw/codemirror-theme-kimbie'
import { materialLight, materialDark } from '@uiw/codemirror-theme-material'
import { monokai } from '@uiw/codemirror-theme-monokai'
import { noctisLilac } from '@uiw/codemirror-theme-noctis-lilac'
import { nord } from '@uiw/codemirror-theme-nord'
import { okaidia } from '@uiw/codemirror-theme-okaidia'
import { red } from '@uiw/codemirror-theme-red'
import { sublime } from '@uiw/codemirror-theme-sublime'
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night'
import { tokyoNightDay } from '@uiw/codemirror-theme-tokyo-night-day'
import { tokyoNightStorm } from '@uiw/codemirror-theme-tokyo-night-storm'
import { vscodeDark } from '@uiw/codemirror-theme-vscode'
import { whiteLight, whiteDark } from '@uiw/codemirror-theme-white'
import { xcodeLight, xcodeDark } from '@uiw/codemirror-theme-xcode'
import { tomorrow, cobalt, espresso } from 'thememirror'

import type { Extension } from '@codemirror/state'

export interface EditorTheme {
  name: string
  displayName: string
  extension: Extension
  isDark: boolean
}

export interface ThemeSection {
  title: string
  themes: EditorTheme[]
}

// All themes with dark/light classification
const darkThemes: EditorTheme[] = [
  // Dark themes
  { name: 'monokai', displayName: 'Monokai', extension: monokai, isDark: true },
  { name: 'one-dark', displayName: 'One Dark', extension: oneDark, isDark: true },
  { name: 'github-dark', displayName: 'GitHub Dark', extension: githubDark, isDark: true },
  { name: 'solarized-dark', displayName: 'Solarized Dark', extension: solarizedDark, isDark: true },
  { name: 'material-dark', displayName: 'Material Dark', extension: materialDark, isDark: true },
  { name: 'xcode-dark', displayName: 'Xcode Dark', extension: xcodeDark, isDark: true },
  { name: 'white-dark', displayName: 'White Dark', extension: whiteDark, isDark: true },
  { name: 'duotone-dark', displayName: 'Duotone Dark', extension: duotoneDark, isDark: true },
  { name: 'tokyo-night', displayName: 'Tokyo Night', extension: tokyoNight, isDark: true },
  { name: 'tokyo-night-storm', displayName: 'Tokyo Night Storm', extension: tokyoNightStorm, isDark: true },
  { name: 'dracula', displayName: 'Dracula', extension: dracula, isDark: true },
  { name: 'darcula', displayName: 'Darcula', extension: darcula, isDark: true },
  { name: 'vscode-dark', displayName: 'VS Code Dark', extension: vscodeDark, isDark: true },
  { name: 'gruvbox-dark', displayName: 'Gruvbox Dark', extension: gruvboxDark, isDark: true },
  { name: 'nord', displayName: 'Nord', extension: nord, isDark: true },
  { name: 'abyss', displayName: 'Abyss', extension: abyss, isDark: true },
  { name: 'andromeda', displayName: 'Andromeda', extension: andromeda, isDark: true },
  { name: 'abcdef', displayName: 'ABCDEF', extension: abcdef, isDark: true },
  { name: 'androidstudio', displayName: 'Android Studio', extension: androidstudio, isDark: true },
  { name: 'atomone', displayName: 'Atom One', extension: atomone, isDark: true },
  { name: 'aura', displayName: 'Aura', extension: aura, isDark: true },
  { name: 'bespin', displayName: 'Bespin', extension: bespin, isDark: true },
  { name: 'copilot', displayName: 'Copilot', extension: copilot, isDark: true },
  { name: 'kimbie', displayName: 'Kimbie', extension: kimbie, isDark: true },
  { name: 'okaidia', displayName: 'Okaidia', extension: okaidia, isDark: true },
  { name: 'red', displayName: 'Red', extension: red, isDark: true },
  { name: 'sublime', displayName: 'Sublime', extension: sublime, isDark: true },
  { name: 'cobalt', displayName: 'Cobalt', extension: cobalt, isDark: true },
]

const lightThemes: EditorTheme[] = [
  // Light themes
  { name: 'default', displayName: 'Default Light', extension: [], isDark: false },
  { name: 'noctis-lilac', displayName: 'Noctis Lilac', extension: noctisLilac, isDark: false },
  { name: 'github-light', displayName: 'GitHub Light', extension: githubLight, isDark: false },
  { name: 'solarized-light', displayName: 'Solarized Light', extension: solarizedLight, isDark: false },
  { name: 'material-light', displayName: 'Material Light', extension: materialLight, isDark: false },
  { name: 'xcode-light', displayName: 'Xcode Light', extension: xcodeLight, isDark: false },
  { name: 'white-light', displayName: 'White Light', extension: whiteLight, isDark: false },
  { name: 'duotone-light', displayName: 'Duotone Light', extension: duotoneLight, isDark: false },
  { name: 'tokyo-night-day', displayName: 'Tokyo Night Day', extension: tokyoNightDay, isDark: false },
  { name: 'bbedit', displayName: 'BBEdit', extension: bbedit, isDark: false },
  { name: 'eclipse', displayName: 'Eclipse', extension: eclipse, isDark: false },
  { name: 'tomorrow', displayName: 'Tomorrow', extension: tomorrow, isDark: false },
  { name: 'espresso', displayName: 'Espresso', extension: espresso, isDark: false },
]

// Sort alphabetically, but keep monokai first in dark themes
const sortedDarkThemes = [
  darkThemes.find(theme => theme.name === 'monokai')!,
  ...darkThemes.filter(theme => theme.name !== 'monokai').sort((a, b) => a.displayName.localeCompare(b.displayName))
]

const sortedLightThemes = lightThemes.sort((a, b) => a.displayName.localeCompare(b.displayName))

// Organized theme sections for menu display
export const THEME_SECTIONS: ThemeSection[] = [
  { title: 'Dark Themes', themes: sortedDarkThemes },
  { title: 'Light Themes', themes: sortedLightThemes }
]

// Flat array for backward compatibility
export const EDITOR_THEMES: EditorTheme[] = [...sortedDarkThemes, ...sortedLightThemes]

// Auto-generated theme lookup map
export const THEME_MAP = new Map<string, Extension>(
  EDITOR_THEMES.map(theme => [theme.name, theme.extension])
)

// Auto-generated theme names array
export const THEME_NAMES = EDITOR_THEMES.map(theme => theme.name)

// Auto-generated theme display names array  
export const THEME_DISPLAY_NAMES = EDITOR_THEMES.map(theme => theme.displayName)

// Helper function to get theme extension by name
export const getThemeExtension = (themeName: string) => {
  return THEME_MAP.get(themeName) || [] // Default to empty array (default light theme)
}