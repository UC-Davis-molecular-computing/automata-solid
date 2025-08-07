import type { Component } from 'solid-js'
import { Menubar } from '@kobalte/core/menubar'
import { AutomatonType } from '../types/AppState'
import { appState, dispatch, setAppState } from '../store/AppStore'
import { LoadDefault, SaveFile, MinimizeDfa, OpenFile, SetAutomatonType } from '../types/Messages'
import './MenuBar.css'

const themes = [
  'monokai', 'github', 'tomorrow', 'kuroir', 'twilight', 'xcode', 
  'textmate', 'solarized_dark', 'solarized_light', 'terminal'
]

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
                onSelect={() => dispatch(new SetAutomatonType(AutomatonType.Dfa))}
              >
                <span class={appState.automatonType === AutomatonType.Dfa ? "selected-item" : ""}>
                  DFA
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem 
                class="menu-item"
                value={AutomatonType.Nfa} 
                onSelect={() => dispatch(new SetAutomatonType(AutomatonType.Nfa))}
              >
                <span class={appState.automatonType === AutomatonType.Nfa ? "selected-item" : ""}>
                  NFA
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem 
                class="menu-item"
                value={AutomatonType.Regex} 
                onSelect={() => dispatch(new SetAutomatonType(AutomatonType.Regex))}
              >
                <span class={appState.automatonType === AutomatonType.Regex ? "selected-item" : ""}>
                  Regex
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem 
                class="menu-item"
                value={AutomatonType.Cfg} 
                onSelect={() => dispatch(new SetAutomatonType(AutomatonType.Cfg))}
              >
                <span class={appState.automatonType === AutomatonType.Cfg ? "selected-item" : ""}>
                  CFG
                </span>
              </Menubar.RadioItem>
              <Menubar.RadioItem 
                class="menu-item"
                value={AutomatonType.Tm} 
                onSelect={() => dispatch(new SetAutomatonType(AutomatonType.Tm))}
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
                Theme ▶
              </Menubar.SubTrigger>
              <Menubar.Portal>
                <Menubar.SubContent class="menu-content">
                  <Menubar.RadioGroup value={appState.theme}>
                    {themes.map(theme => (
                      <Menubar.RadioItem 
                        class="menu-item"
                        value={theme} 
                        onSelect={() => setAppState('theme', theme)}
                      >
                        <span class={appState.theme === theme ? "selected-item" : ""}>
                          {theme}
                        </span>
                      </Menubar.RadioItem>
                    ))}
                  </Menubar.RadioGroup>
                </Menubar.SubContent>
              </Menubar.Portal>
            </Menubar.Sub>
            <Menubar.Separator class="menu-separator" />
            <Menubar.RadioGroup value="table">
              <Menubar.RadioItem 
                class="menu-item"
                value="table" 
                disabled={false}
              >
                <Menubar.ItemIndicator class="menu-indicator">
                  ◉
                </Menubar.ItemIndicator>
                Table View
              </Menubar.RadioItem>
              <Menubar.RadioItem 
                class="menu-item"
                value="graph" 
                disabled={true}
              >
                <Menubar.ItemIndicator class="menu-indicator">
                  ○
                </Menubar.ItemIndicator>
                Graph View
              </Menubar.RadioItem>
            </Menubar.RadioGroup>
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