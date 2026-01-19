// Shoelace dark theme base (must be first)
import '@shoelace-style/shoelace/dist/themes/dark.css';

// Catppuccin Mocha color palette
import './styles/catppuccin.css';

// Shoelace theme overrides using Catppuccin colors
import './styles/shoelace-theme.css';

// Register Shoelace components (cherry-picked for tree-shaking)
import '@shoelace-style/shoelace/dist/components/button/button.js';
import '@shoelace-style/shoelace/dist/components/input/input.js';
import '@shoelace-style/shoelace/dist/components/select/select.js';
import '@shoelace-style/shoelace/dist/components/option/option.js';
import '@shoelace-style/shoelace/dist/components/drawer/drawer.js';
import '@shoelace-style/shoelace/dist/components/dialog/dialog.js';
import '@shoelace-style/shoelace/dist/components/badge/badge.js';
import '@shoelace-style/shoelace/dist/components/alert/alert.js';
import '@shoelace-style/shoelace/dist/components/textarea/textarea.js';
import '@shoelace-style/shoelace/dist/components/dropdown/dropdown.js';
import '@shoelace-style/shoelace/dist/components/menu/menu.js';
import '@shoelace-style/shoelace/dist/components/menu-item/menu-item.js';
import '@shoelace-style/shoelace/dist/components/icon/icon.js';
import '@shoelace-style/shoelace/dist/components/divider/divider.js';
import '@shoelace-style/shoelace/dist/components/tooltip/tooltip.js';
import '@shoelace-style/shoelace/dist/components/checkbox/checkbox.js';

// Set base path for Shoelace assets (local icons in production)
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('/shoelace');

// Register custom components
import './components/tick-board.js';
import './components/tick-card.js';
import './components/tick-column.js';
import './components/tick-header.js';
import './components/tick-detail-drawer.js';
import './components/tick-create-dialog.js';
import './components/tick-toast-stack.js';
