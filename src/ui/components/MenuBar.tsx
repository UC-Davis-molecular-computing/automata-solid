import type { Component } from 'solid-js'
import { Menubar } from '@kobalte/core/menubar'
import { AutomatonType, ViewMode } from '../types/AppState'
import { appState, dispatch, setAppState } from '../store/AppStore'
import { LoadDefault, SaveFile, MinimizeDfa, OpenFile } from '../types/Messages'
import { THEME_SECTIONS } from '../utils/EditorThemes'
import './MenuBar.css'

export const MenuBar: Component = () => {
  return (
    <Menubar class="menu-bar">
      {/* File Menu */}
      <Menubar.Menu>
        <Menubar.Trigger class="menu-trigger">File</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content class="menu-content">
            <Menubar.Item
              class="menu-item"
              onSelect={() => dispatch(new LoadDefault())}
            >
              Load Default
              <div class="menu-shortcut">Ctrl+L</div>
            </Menubar.Item>
            <Menubar.Separator class="menu-separator" />
            <Menubar.Item
              class="menu-item"
              onSelect={() => dispatch(new OpenFile())}
            >
              Open...
              <div class="menu-shortcut">Ctrl+O</div>
            </Menubar.Item>
            <Menubar.Item
              class="menu-item"
              onSelect={() => dispatch(new SaveFile())}
            >
              Save
              <div class="menu-shortcut">Ctrl+S</div>
            </Menubar.Item>
            {appState.automatonType === AutomatonType.Dfa && (
              <>
                <Menubar.Separator class="menu-separator" />
                <Menubar.Item
                  class="menu-item"
                  onSelect={() => dispatch(new MinimizeDfa())}
                >
                  Minimize DFA
                </Menubar.Item>
              </>
            )}
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>

      {/* Model Menu */}
      <Menubar.Menu>
        <Menubar.Trigger class="menu-trigger">Model</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content class="menu-content">
            <Menubar.RadioGroup value={appState.automatonType}>
              <Menubar.RadioItem
                class="menu-item"
                value={AutomatonType.Dfa}
                onSelect={() => setAppState('automatonType', AutomatonType.Dfa)}
              >
                <span class={appState.automatonType === AutomatonType.Dfa ? "selected-item" : ""}>
                  DFA
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem
                class="menu-item"
                value={AutomatonType.Nfa}
                onSelect={() => setAppState('automatonType', AutomatonType.Nfa)}
              >
                <span class={appState.automatonType === AutomatonType.Nfa ? "selected-item" : ""}>
                  NFA
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem
                class="menu-item"
                value={AutomatonType.Regex}
                onSelect={() => setAppState('automatonType', AutomatonType.Regex)}
              >
                <span class={appState.automatonType === AutomatonType.Regex ? "selected-item" : ""}>
                  Regex
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem
                class="menu-item"
                value={AutomatonType.Cfg}
                onSelect={() => setAppState('automatonType', AutomatonType.Cfg)}
              >
                <span class={appState.automatonType === AutomatonType.Cfg ? "selected-item" : ""}>
                  CFG
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem
                class="menu-item"
                value={AutomatonType.Tm}
                onSelect={() => setAppState('automatonType', AutomatonType.Tm)}
              >
                <span class={appState.automatonType === AutomatonType.Tm ? "selected-item" : ""}>
                  TM
                </span>
              </Menubar.RadioItem>
            </Menubar.RadioGroup>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>

      {/* View Menu */}
      <Menubar.Menu>
        <Menubar.Trigger class="menu-trigger">View</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content class="menu-content">
            <Menubar.Sub>
              <Menubar.SubTrigger class="menu-item">
                Editor theme ▶
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent class="menu-content theme-submenu">
                  <Menubar.RadioGroup value={appState.theme}>
                    {THEME_SECTIONS.map((section, sectionIndex) => (
                      <>
                        {sectionIndex > 0 && <Menubar.Separator class="menu-separator" />}
                        <div class="theme-section-header">{section.title}</div>
                        {section.themes.map(theme => (
                          <Menubar.RadioItem
                            class="menu-item"
                            value={theme.name}
                            onSelect={() => setAppState('theme', theme.name)}
                          >
                            <span class={appState.theme === theme.name ? "selected-item" : ""}>
                              {theme.displayName}
                            </span>
                          </Menubar.RadioItem>
                        ))}
                      </>
                    ))}
                  </Menubar.RadioGroup>
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>
            <Menubar.Separator class="menu-separator" />
            <Menubar.RadioGroup value={appState.viewMode}>
              <Menubar.RadioItem
                class="menu-item"
                value={ViewMode.Table}
                onSelect={() => setAppState('viewMode', ViewMode.Table)}
                title="Display the automaton as a transition table"
              >
                <span class={appState.viewMode === ViewMode.Table ? "selected-item" : ""}>
                  Table View
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem
                class="menu-item"
                value={ViewMode.Graph}
                onSelect={() => setAppState('viewMode', ViewMode.Graph)}
                title="Display the automaton as a state diagram with nodes and transitions"
              >
                <span class={appState.viewMode === ViewMode.Graph ? "selected-item" : ""}>
                  Graph View
                </span>
              </Menubar.RadioItem>
            </Menubar.RadioGroup>
            {appState.automatonType === AutomatonType.Cfg && appState.viewMode === ViewMode.Graph && (
              <>
                <Menubar.Separator class="menu-separator" />
                <Menubar.CheckboxItem
                  class="menu-item"
                  checked={appState.cfgLeavesAtBottom}
                  onChange={() => setAppState('cfgLeavesAtBottom', !appState.cfgLeavesAtBottom)}
                  title="When enabled, all terminal symbols (leaves) are aligned at the bottom level of the parse tree for easier string reading"
                >
                  <Menubar.ItemIndicator>
                    ☑
                  </Menubar.ItemIndicator>
                  Parse tree leaves on bottom
                </Menubar.CheckboxItem>
              </>
            )}
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>

      {/* Help Menu */}
      <Menubar.Menu>
        <Menubar.Trigger class="menu-trigger">Help</Menubar.Trigger>
        <Menubar.Portal>
          <Menubar.Content class="menu-content">
            <Menubar.Item
              class="menu-item"
              onSelect={() => window.open('help.html', '_blank')}
            >
              Help
            </Menubar.Item>
          </Menubar.Content>
        </Menubar.Portal>
      </Menubar.Menu>
    </Menubar>
  )
}