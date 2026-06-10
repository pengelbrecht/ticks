/**
 * Unit tests for tick-header component mobile view behavior.
 * Tests responsive design elements and mobile-specific interactions.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LitElement } from 'lit';
import { styleText } from '../test-utils/styles.js';
import './tick-header.js';
import type { TickHeader } from './tick-header.js';

describe('tick-header mobile view', () => {
  let element: TickHeader;

  beforeEach(async () => {
    element = document.createElement('tick-header') as TickHeader;
    element.repoName = 'test-repo';
    element.epics = [
      { id: 'e1', title: 'Epic One' },
      { id: 'e2', title: 'Epic Two' },
    ];
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  // ===========================================================================
  // Mobile Menu Toggle
  // ===========================================================================

  describe('mobile menu toggle', () => {
    it('renders menu toggle button', async () => {
      const menuToggle = element.shadowRoot?.querySelector('.menu-toggle');
      expect(menuToggle).not.toBeNull();
      expect(menuToggle?.tagName).toBe('BUTTON');
    });

    it('menu toggle has correct aria-label', async () => {
      const menuToggle = element.shadowRoot?.querySelector('.menu-toggle');
      expect(menuToggle?.getAttribute('aria-label')).toBe('Menu');
    });

    it('menu toggle displays hamburger icon', async () => {
      const menuToggle = element.shadowRoot?.querySelector('.menu-toggle');
      expect(menuToggle?.textContent?.trim()).toBe('☰');
    });

    it('menu toggle fires menu-toggle event on click', async () => {
      const handler = vi.fn();
      element.addEventListener('menu-toggle', handler);

      const menuToggle = element.shadowRoot?.querySelector('.menu-toggle') as HTMLButtonElement;
      menuToggle?.click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].bubbles).toBe(true);
      expect(handler.mock.calls[0][0].composed).toBe(true);
    });
  });

  // ===========================================================================
  // Header Structure for Responsive Layout
  // ===========================================================================

  describe('header structure for responsive layout', () => {
    it('has header-left section with logo and connection status', async () => {
      const headerLeft = element.shadowRoot?.querySelector('.header-left');
      expect(headerLeft).not.toBeNull();

      const logo = headerLeft?.querySelector('ticks-logo');
      expect(logo).not.toBeNull();

      const connectionStatus = headerLeft?.querySelector('.connection-status');
      expect(connectionStatus).not.toBeNull();
    });

    it('has header-center section with search and epic filter', async () => {
      const headerCenter = element.shadowRoot?.querySelector('.header-center');
      expect(headerCenter).not.toBeNull();

      const searchInput = headerCenter?.querySelector('sl-input');
      expect(searchInput).not.toBeNull();

      const epicSelect = headerCenter?.querySelector('sl-select');
      expect(epicSelect).not.toBeNull();
    });

    it('has header-right section with action buttons', async () => {
      const headerRight = element.shadowRoot?.querySelector('.header-right');
      expect(headerRight).not.toBeNull();

      // Run panel button
      const runPanelButton = headerRight?.querySelector('sl-button');
      expect(runPanelButton).not.toBeNull();

      // Activity feed
      const activityFeed = headerRight?.querySelector('tick-activity-feed');
      expect(activityFeed).not.toBeNull();

      // Create button
      const createButton = headerRight?.querySelector('ticks-button');
      expect(createButton).not.toBeNull();
    });

    it('repo badge is in header-left', async () => {
      const headerLeft = element.shadowRoot?.querySelector('.header-left');
      const repoBadge = headerLeft?.querySelector('.repo-badge');
      expect(repoBadge).not.toBeNull();
      expect(repoBadge?.textContent).toBe('test-repo');
    });
  });

  // ===========================================================================
  // CSS Variables for Mobile Breakpoints
  // ===========================================================================

  describe('CSS contains mobile breakpoint rules', () => {
    it('component has styles defined', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      expect(styles).toBeDefined();
    });

    it('styles include media query for 768px breakpoint', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('@media');
      expect(cssText).toContain('768px');
    });

    it('styles include media query for 480px breakpoint', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('480px');
    });

    it('styles hide header-center on mobile', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      // header-center is hidden at 768px breakpoint
      expect(cssText).toContain('.header-center');
      expect(cssText).toContain('display: none');
    });

    it('styles show menu toggle on mobile', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      // menu-toggle is shown at 768px breakpoint
      expect(cssText).toContain('.menu-toggle');
      expect(cssText).toContain('display: block');
    });

    it('styles hide repo badge on small screens', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      // repo-badge is hidden at 480px breakpoint
      expect(cssText).toContain('.repo-badge');
    });

    it('styles set 44px touch targets on small screens', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      // 44px min touch targets for accessibility
      expect(cssText).toContain('44px');
    });
  });

  // ===========================================================================
  // Connection Status (all screen sizes)
  // ===========================================================================

  describe('connection status', () => {
    // -------------------------------------------------------------------------
    // State Display
    // -------------------------------------------------------------------------

    it('displays disconnected state by default', async () => {
      const dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.classList.contains('disconnected')).toBe(true);
    });

    it('displays connected state', async () => {
      element.connectionStatus = 'connected';
      await element.updateComplete;

      const dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.classList.contains('connected')).toBe(true);
    });

    it('displays connecting state', async () => {
      element.connectionStatus = 'connecting';
      await element.updateComplete;

      const dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.classList.contains('connecting')).toBe(true);
    });

    it('removes previous state class when state changes', async () => {
      // Start disconnected (default)
      let dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.classList.contains('disconnected')).toBe(true);

      // Change to connected
      element.connectionStatus = 'connected';
      await element.updateComplete;
      dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.classList.contains('connected')).toBe(true);
      expect(dot?.classList.contains('disconnected')).toBe(false);

      // Change to connecting
      element.connectionStatus = 'connecting';
      await element.updateComplete;
      dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.classList.contains('connecting')).toBe(true);
      expect(dot?.classList.contains('connected')).toBe(false);

      // Change back to disconnected
      element.connectionStatus = 'disconnected';
      await element.updateComplete;
      dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.classList.contains('disconnected')).toBe(true);
      expect(dot?.classList.contains('connecting')).toBe(false);
    });

    // -------------------------------------------------------------------------
    // Tooltip Content
    // -------------------------------------------------------------------------

    it('connection status has tooltip', async () => {
      const tooltip = element.shadowRoot?.querySelector('sl-tooltip');
      expect(tooltip).not.toBeNull();
    });

    it('tooltip shows "Disconnected from server" for disconnected state', async () => {
      element.connectionStatus = 'disconnected';
      await element.updateComplete;

      const tooltip = element.shadowRoot?.querySelector('sl-tooltip');
      expect(tooltip?.getAttribute('content')).toBe('Disconnected from server');
    });

    it('tooltip shows "Connected to server" for connected state', async () => {
      element.connectionStatus = 'connected';
      await element.updateComplete;

      const tooltip = element.shadowRoot?.querySelector('sl-tooltip');
      expect(tooltip?.getAttribute('content')).toBe('Connected to server');
    });

    it('tooltip shows "Connecting..." for connecting state', async () => {
      element.connectionStatus = 'connecting';
      await element.updateComplete;

      const tooltip = element.shadowRoot?.querySelector('sl-tooltip');
      expect(tooltip?.getAttribute('content')).toBe('Connecting...');
    });

    it('tooltip updates when connection state changes', async () => {
      const tooltip = element.shadowRoot?.querySelector('sl-tooltip');

      element.connectionStatus = 'disconnected';
      await element.updateComplete;
      expect(tooltip?.getAttribute('content')).toBe('Disconnected from server');

      element.connectionStatus = 'connecting';
      await element.updateComplete;
      expect(tooltip?.getAttribute('content')).toBe('Connecting...');

      element.connectionStatus = 'connected';
      await element.updateComplete;
      expect(tooltip?.getAttribute('content')).toBe('Connected to server');
    });

    // -------------------------------------------------------------------------
    // CSS Styles
    // -------------------------------------------------------------------------

    it('dot is circular (border-radius: 50%)', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('.connection-status');
      expect(cssText).toContain('border-radius: 50%');
    });

    it('dot has 8x8px dimensions', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('width: 8px');
      expect(cssText).toContain('height: 8px');
    });

    it('connected state uses green color from Catppuccin palette', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('.connection-status.connected');
      expect(cssText).toContain('var(--green, #a6e3a1)');
    });

    it('connected state has glow effect (box-shadow)', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('.connection-status.connected');
      expect(cssText).toContain('box-shadow');
    });

    it('connecting state uses yellow color from Catppuccin palette', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('.connection-status.connecting');
      expect(cssText).toContain('var(--yellow, #f9e2af)');
    });

    it('connecting state has pulse animation', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('.connection-status.connecting');
      expect(cssText).toContain('animation');
      expect(cssText).toContain('pulse-status');
    });

    it('disconnected state uses red color from Catppuccin palette', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('.connection-status.disconnected');
      expect(cssText).toContain('var(--red, #f38ba8)');
    });

    it('pulse animation keyframes are defined', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = styleText(styles);

      expect(cssText).toContain('@keyframes pulse-status');
    });

    // -------------------------------------------------------------------------
    // DOM Structure
    // -------------------------------------------------------------------------

    it('connection dot is inside header-left section', async () => {
      const headerLeft = element.shadowRoot?.querySelector('.header-left');
      const connectionStatus = headerLeft?.querySelector('.connection-status');
      expect(connectionStatus).not.toBeNull();
    });

    it('connection dot is wrapped in sl-tooltip', async () => {
      const tooltip = element.shadowRoot?.querySelector('sl-tooltip');
      const dot = tooltip?.querySelector('.connection-status');
      expect(dot).not.toBeNull();
    });

    it('connection dot is a span element', async () => {
      const dot = element.shadowRoot?.querySelector('.connection-status');
      expect(dot?.tagName).toBe('SPAN');
    });
  });

  // ===========================================================================
  // Read-only Mode Badge
  // ===========================================================================

  describe('readonly mode', () => {
    it('does not show readonly badge by default', async () => {
      const badge = element.shadowRoot?.querySelector('.readonly-badge');
      expect(badge).toBeNull();
    });

    it('shows readonly badge when readonlyMode is true', async () => {
      element.readonlyMode = true;
      await element.updateComplete;

      const badge = element.shadowRoot?.querySelector('.readonly-badge');
      expect(badge).not.toBeNull();
      expect(badge?.textContent?.trim()).toContain('Read-only');
    });

    it('logo links to /app in readonly mode', async () => {
      element.readonlyMode = true;
      await element.updateComplete;

      const link = element.shadowRoot?.querySelector('.header-left a');
      expect(link).not.toBeNull();
      expect(link?.getAttribute('href')).toBe('/app');
    });
  });

  // ===========================================================================
  // Events
  // ===========================================================================

  describe('events', () => {
    it('create-click event bubbles and is composed', async () => {
      const handler = vi.fn();
      element.addEventListener('create-click', handler);

      const createButton = element.shadowRoot?.querySelector('ticks-button') as HTMLElement;
      createButton?.click();

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].bubbles).toBe(true);
      expect(handler.mock.calls[0][0].composed).toBe(true);
    });
  });

  // ===========================================================================
  // Epic Filter
  // ===========================================================================

  describe('epic filter', () => {
    // -------------------------------------------------------------------------
    // Dropdown Rendering
    // -------------------------------------------------------------------------

    describe('dropdown rendering', () => {
      it('renders sl-select for epic filter', async () => {
        const select = element.shadowRoot?.querySelector('.header-center sl-select');
        expect(select).not.toBeNull();
      });

      it('epic select has placeholder "All Ticks"', async () => {
        const select = element.shadowRoot?.querySelector('.header-center sl-select');
        expect(select?.getAttribute('placeholder')).toBe('All Ticks');
      });

      it('epic select is clearable', async () => {
        const select = element.shadowRoot?.querySelector('.header-center sl-select');
        expect(select?.hasAttribute('clearable')).toBe(true);
      });

      it('epic select has size small', async () => {
        const select = element.shadowRoot?.querySelector('.header-center sl-select');
        expect(select?.getAttribute('size')).toBe('small');
      });

      it('renders options for each epic', async () => {
        const options = element.shadowRoot?.querySelectorAll('.header-center sl-option');
        expect(options?.length).toBe(2);
      });

      it('renders epic options with correct values', async () => {
        const options = element.shadowRoot?.querySelectorAll('.header-center sl-option');
        expect(options?.[0]?.getAttribute('value')).toBe('e1');
        expect(options?.[1]?.getAttribute('value')).toBe('e2');
      });

      it('renders epic options with ID and title', async () => {
        const options = element.shadowRoot?.querySelectorAll('.header-center sl-option');
        expect(options?.[0]?.textContent).toContain('e1');
        expect(options?.[0]?.textContent).toContain('Epic One');
        expect(options?.[1]?.textContent).toContain('e2');
        expect(options?.[1]?.textContent).toContain('Epic Two');
      });

      it('displays epic ID as badge before title', async () => {
        const epicIds = element.shadowRoot?.querySelectorAll('.header-center sl-option .epic-id');
        expect(epicIds?.length).toBe(2);
        expect(epicIds?.[0]?.textContent).toBe('e1');
        expect(epicIds?.[1]?.textContent).toBe('e2');
      });

      it('updates options when epics property changes', async () => {
        element.epics = [
          { id: 'new1', title: 'New Epic One' },
          { id: 'new2', title: 'New Epic Two' },
          { id: 'new3', title: 'New Epic Three' },
        ];
        await element.updateComplete;

        const options = element.shadowRoot?.querySelectorAll('.header-center sl-option');
        expect(options?.length).toBe(3);
        expect(options?.[0]?.getAttribute('value')).toBe('new1');
        expect(options?.[2]?.getAttribute('value')).toBe('new3');
      });

      it('renders empty select when no epics provided', async () => {
        element.epics = [];
        await element.updateComplete;

        const options = element.shadowRoot?.querySelectorAll('.header-center sl-option');
        expect(options?.length).toBe(0);
      });
    });

    // -------------------------------------------------------------------------
    // Selected Epic State
    // -------------------------------------------------------------------------

    describe('selected epic state', () => {
      it('has empty selectedEpic by default', async () => {
        expect(element.selectedEpic).toBe('');
      });

      it('can set selectedEpic property', async () => {
        element.selectedEpic = 'e1';
        await element.updateComplete;

        const select = element.shadowRoot?.querySelector('.header-center sl-select') as any;
        expect(select?.value).toBe('e1');
      });

      it('selectedEpic can be set via attribute', async () => {
        const newElement = document.createElement('tick-header') as TickHeader;
        newElement.setAttribute('selected-epic', 'e2');
        newElement.epics = [{ id: 'e2', title: 'Epic Two' }];
        document.body.appendChild(newElement);
        await newElement.updateComplete;

        expect(newElement.selectedEpic).toBe('e2');
        document.body.removeChild(newElement);
      });
    });

    // -------------------------------------------------------------------------
    // Epic Filter Change Event
    // -------------------------------------------------------------------------

    describe('epic-filter-change event', () => {
      it('fires epic-filter-change when selection changes', async () => {
        const handler = vi.fn();
        element.addEventListener('epic-filter-change', handler);

        const select = element.shadowRoot?.querySelector('.header-center sl-select') as any;
        select.value = 'e1';
        select.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('epic-filter-change event includes selected value in detail', async () => {
        const handler = vi.fn();
        element.addEventListener('epic-filter-change', handler);

        const select = element.shadowRoot?.querySelector('.header-center sl-select') as any;
        select.value = 'e2';
        select.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));

        expect(handler.mock.calls[0][0].detail.value).toBe('e2');
      });

      it('epic-filter-change event bubbles', async () => {
        const handler = vi.fn();
        element.addEventListener('epic-filter-change', handler);

        const select = element.shadowRoot?.querySelector('.header-center sl-select') as any;
        select.value = 'e1';
        select.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));

        expect(handler.mock.calls[0][0].bubbles).toBe(true);
      });

      it('epic-filter-change event is composed', async () => {
        const handler = vi.fn();
        element.addEventListener('epic-filter-change', handler);

        const select = element.shadowRoot?.querySelector('.header-center sl-select') as any;
        select.value = 'e1';
        select.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));

        expect(handler.mock.calls[0][0].composed).toBe(true);
      });

      it('fires epic-filter-change with empty value when cleared', async () => {
        element.selectedEpic = 'e1';
        await element.updateComplete;

        const handler = vi.fn();
        element.addEventListener('epic-filter-change', handler);

        const select = element.shadowRoot?.querySelector('.header-center sl-select') as any;
        select.value = '';
        select.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));

        expect(handler.mock.calls[0][0].detail.value).toBe('');
      });
    });

    // -------------------------------------------------------------------------
    // Epic ID Badge Styling
    // -------------------------------------------------------------------------

    describe('epic ID badge styling', () => {
      it('epic ID badges have .epic-id class', async () => {
        const epicIds = element.shadowRoot?.querySelectorAll('.epic-id');
        expect(epicIds?.length).toBeGreaterThan(0);
      });

      it('styles define epic-id class', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
      });

      it('epic-id uses monospace font', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
        expect(cssText).toContain('font-family');
        expect(cssText).toContain('--sl-font-mono');
      });

      it('epic-id has smaller font size', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
        expect(cssText).toContain('font-size: 0.75em');
      });

      it('epic-id has background styling', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
        expect(cssText).toContain('background: var(--surface1)');
      });

      it('epic-id has border-radius for badge appearance', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
        expect(cssText).toContain('border-radius');
      });

      it('epic-id has padding', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
        expect(cssText).toContain('padding');
      });

      it('epic-id has muted text color', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
        expect(cssText).toContain('color: var(--subtext0)');
      });

      it('epic-id has right margin to separate from title', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.epic-id');
        expect(cssText).toContain('margin-right');
      });
    });

    // -------------------------------------------------------------------------
    // Select Dropdown CSS Styling
    // -------------------------------------------------------------------------

    describe('select dropdown CSS styling', () => {
      it('epic select has minimum width', () => {
        const styles = (element.constructor as typeof LitElement).styles;
        const cssText = styleText(styles);

        expect(cssText).toContain('.header-center sl-select');
        expect(cssText).toContain('min-width: 220px');
      });
    });
  });
});
