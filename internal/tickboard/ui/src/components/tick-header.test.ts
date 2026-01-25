/**
 * Unit tests for tick-header component mobile view behavior.
 * Tests responsive design elements and mobile-specific interactions.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LitElement } from 'lit';
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
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('@media');
      expect(cssText).toContain('768px');
    });

    it('styles include media query for 480px breakpoint', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('480px');
    });

    it('styles hide header-center on mobile', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      // header-center is hidden at 768px breakpoint
      expect(cssText).toContain('.header-center');
      expect(cssText).toContain('display: none');
    });

    it('styles show menu toggle on mobile', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      // menu-toggle is shown at 768px breakpoint
      expect(cssText).toContain('.menu-toggle');
      expect(cssText).toContain('display: block');
    });

    it('styles hide repo badge on small screens', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      // repo-badge is hidden at 480px breakpoint
      expect(cssText).toContain('.repo-badge');
    });

    it('styles set 44px touch targets on small screens', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

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
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.connection-status');
      expect(cssText).toContain('border-radius: 50%');
    });

    it('dot has 8x8px dimensions', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('width: 8px');
      expect(cssText).toContain('height: 8px');
    });

    it('connected state uses green color from Catppuccin palette', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.connection-status.connected');
      expect(cssText).toContain('var(--green, #a6e3a1)');
    });

    it('connected state has glow effect (box-shadow)', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.connection-status.connected');
      expect(cssText).toContain('box-shadow');
    });

    it('connecting state uses yellow color from Catppuccin palette', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.connection-status.connecting');
      expect(cssText).toContain('var(--yellow, #f9e2af)');
    });

    it('connecting state has pulse animation', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.connection-status.connecting');
      expect(cssText).toContain('animation');
      expect(cssText).toContain('pulse-status');
    });

    it('disconnected state uses red color from Catppuccin palette', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.connection-status.disconnected');
      expect(cssText).toContain('var(--red, #f38ba8)');
    });

    it('pulse animation keyframes are defined', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

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

    it('run-panel-toggle event fires on run button click', async () => {
      const handler = vi.fn();
      element.addEventListener('run-panel-toggle', handler);

      const runButton = element.shadowRoot?.querySelector('.header-right sl-button') as HTMLElement;
      runButton?.click();

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
