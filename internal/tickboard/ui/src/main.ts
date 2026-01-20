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
import '@shoelace-style/shoelace/dist/components/tab-group/tab-group.js';
import '@shoelace-style/shoelace/dist/components/tab/tab.js';
import '@shoelace-style/shoelace/dist/components/tab-panel/tab-panel.js';
import '@shoelace-style/shoelace/dist/components/spinner/spinner.js';
import '@shoelace-style/shoelace/dist/components/icon-button/icon-button.js';
import '@shoelace-style/shoelace/dist/components/details/details.js';

// Set base path for Shoelace assets (relative for cloud proxy compatibility)
import { setBasePath } from '@shoelace-style/shoelace/dist/utilities/base-path.js';
setBasePath('./shoelace');

// Register custom components
import './components/tick-board.js';
import './components/tick-card.js';
import './components/tick-column.js';
import './components/tick-header.js';
import './components/tick-detail-drawer.js';
import './components/tick-create-dialog.js';
import './components/tick-toast-stack.js';
import './components/tick-activity-feed.js';
import './components/run-output-pane.js';
import './components/tool-activity.js';
import './components/run-metrics.js';
import './components/run-record.js';
import './components/context-pane.js';

// Register service worker for PWA support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('./sw.js');
      console.log('[PWA] Service worker registered:', registration.scope);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available - show update toast
            if (window.showToast) {
              window.showToast({
                message: 'A new version is available. Refresh to update.',
                variant: 'primary',
                duration: 10000,
              });
            }
          }
        });
      });

      // Listen for SW activation messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_ACTIVATED') {
          console.log('[PWA] Service worker activated:', event.data.version);
        }
      });
    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  });
}
