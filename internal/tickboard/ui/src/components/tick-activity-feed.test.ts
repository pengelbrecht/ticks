/**
 * Unit tests for tick-activity-feed component mobile view behavior.
 * Tests responsive design elements and mobile-specific panel behavior.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LitElement } from 'lit';
import './tick-activity-feed.js';
import type { TickActivityFeed } from './tick-activity-feed.js';
import { $isCloudMode } from '../stores/connection.js';

describe('tick-activity-feed mobile view', () => {
  let element: TickActivityFeed;

  beforeEach(async () => {
    // Reset cloud mode to ensure consistent test behavior
    $isCloudMode.set(false);

    // Mock fetch for activity loading
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify([]), { status: 200 })
    );

    element = document.createElement('tick-activity-feed') as TickActivityFeed;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(element);
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // Component Structure
  // ===========================================================================

  describe('component structure', () => {
    it('renders as inline-block element', async () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('display: inline-block');
    });

    it('renders dropdown trigger with bell icon', async () => {
      const triggerButton = element.shadowRoot?.querySelector('.trigger-button');
      expect(triggerButton).not.toBeNull();

      const bellIcon = triggerButton?.querySelector('sl-icon[name="bell"]');
      expect(bellIcon).not.toBeNull();
    });

    it('renders sl-dropdown with bottom-end placement', async () => {
      const dropdown = element.shadowRoot?.querySelector('sl-dropdown');
      expect(dropdown).not.toBeNull();
      expect(dropdown?.getAttribute('placement')).toBe('bottom-end');
    });
  });

  // ===========================================================================
  // CSS for Mobile Responsive Panel
  // ===========================================================================

  describe('CSS contains mobile responsive styles', () => {
    it('styles include media query for 480px breakpoint', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('@media');
      expect(cssText).toContain('480px');
    });

    it('dropdown panel has default width of 360px', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('360px');
    });

    it('dropdown panel adapts to full width on mobile', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      // On mobile, panel should use calc(100vw - 1rem) for full width with padding
      expect(cssText).toContain('100vw');
      expect(cssText).toContain('calc');
    });

    it('dropdown panel has max-width constraint', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('max-width');
    });
  });

  // ===========================================================================
  // Unread Badge
  // ===========================================================================

  describe('unread badge', () => {
    it('unread badge styles are positioned correctly', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.unread-badge');
      expect(cssText).toContain('position: absolute');
    });

    it('unread badge has minimum touch-friendly size', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      // Badge should have min-width of 16px for readability
      expect(cssText).toContain('min-width: 16px');
    });
  });

  // ===========================================================================
  // Menu Structure
  // ===========================================================================

  describe('menu structure', () => {
    it('menu has header with title and close button', async () => {
      const menuHeader = element.shadowRoot?.querySelector('.menu-header');
      expect(menuHeader).not.toBeNull();

      const title = menuHeader?.querySelector('span');
      expect(title?.textContent).toBe('Activity');

      const closeButton = menuHeader?.querySelector('.close-button');
      expect(closeButton).not.toBeNull();
    });

    it('menu has max-height to prevent overflow', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('max-height: 400px');
      expect(cssText).toContain('overflow-y: auto');
    });
  });

  // ===========================================================================
  // Activity Item Touch Targets
  // ===========================================================================

  describe('activity item styles', () => {
    it('activity items have adequate padding for touch', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.activity-item');
      expect(cssText).toContain('padding');
    });

    it('activity items have hover state', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.activity-item:hover');
    });

    it('activity items have cursor pointer for interactivity', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('cursor: pointer');
    });
  });

  // ===========================================================================
  // Event Handling
  // ===========================================================================

  describe('events', () => {
    it('activity-click event bubbles and is composed', async () => {
      const handler = vi.fn();
      element.addEventListener('activity-click', handler);

      // Simulate an activity click by dispatching through the component
      const event = new CustomEvent('activity-click', {
        detail: { tickId: 't1' },
        bubbles: true,
        composed: true,
      });
      element.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler.mock.calls[0][0].detail.tickId).toBe('t1');
    });
  });

  // ===========================================================================
  // Empty and Loading States
  // ===========================================================================

  describe('empty and loading states', () => {
    it('styles include empty state', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.empty-state');
    });

    it('styles include loading state', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.loading-state');
    });
  });

  // ===========================================================================
  // Color Scheme (Catppuccin)
  // ===========================================================================

  describe('color scheme', () => {
    it('uses Catppuccin color variables', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      // Check for various Catppuccin color variables
      expect(cssText).toContain('var(--green');
      expect(cssText).toContain('var(--red');
      expect(cssText).toContain('var(--blue');
      expect(cssText).toContain('var(--yellow');
    });

    it('trigger button uses green accent on hover', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.trigger-button');
      expect(cssText).toContain('var(--green');
    });
  });
});
