/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './ui/App.tsx'
import { assert } from './core/Utils'

const root = document.getElementById('root')
assert(root, 'Root element with id="root" not found in HTML')
render(() => <App />, root)
