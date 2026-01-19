import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

/**
 * Toast notification variants matching Shoelace's sl-alert variants
 */
export type ToastVariant = 'primary' | 'success' | 'warning' | 'danger';

/**
 * Toast notification interface
 */
export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

/**
 * Options for showing a toast notification
 */
export interface ShowToastOptions {
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

// Default duration for toasts (5 seconds)
const DEFAULT_DURATION = 5000;

// Generate unique ID for each toast
let toastIdCounter = 0;
function generateToastId(): string {
  return `toast-${++toastIdCounter}-${Date.now()}`;
}

/**
 * Toast stack component for displaying notification messages.
 *
 * Toasts stack in the bottom-right corner and auto-dismiss after a duration.
 * Supports success, warning, danger, and primary variants.
 *
 * Usage via global API:
 *   window.showToast({ message: 'Success!', variant: 'success' });
 *
 * Usage via event:
 *   window.dispatchEvent(new CustomEvent('show-toast', {
 *     detail: { message: 'Hello!', variant: 'primary' }
 *   }));
 */
@customElement('tick-toast-stack')
export class TickToastStack extends LitElement {
  static styles = css`
    :host {
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      z-index: 1000;
      display: flex;
      flex-direction: column-reverse;
      gap: 0.5rem;
      pointer-events: none;
      max-width: calc(100vw - 2rem);
    }

    .toast-container {
      pointer-events: auto;
      animation: toast-enter 0.3s ease-out forwards;
    }

    .toast-container.exiting {
      animation: toast-exit 0.3s ease-in forwards;
    }

    @keyframes toast-enter {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes toast-exit {
      from {
        opacity: 1;
        transform: translateX(0);
      }
      to {
        opacity: 0;
        transform: translateX(100%);
      }
    }

    sl-alert {
      min-width: 280px;
      max-width: 400px;
    }

    sl-alert::part(base) {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    sl-alert::part(message) {
      color: var(--text);
      font-size: 0.875rem;
    }

    /* Variant-specific styling */
    sl-alert[variant="success"]::part(base) {
      border-left: 4px solid var(--green);
    }

    sl-alert[variant="warning"]::part(base) {
      border-left: 4px solid var(--yellow);
    }

    sl-alert[variant="danger"]::part(base) {
      border-left: 4px solid var(--red);
    }

    sl-alert[variant="primary"]::part(base) {
      border-left: 4px solid var(--blue);
    }

    /* Icon colors by variant */
    sl-alert[variant="success"]::part(icon) {
      color: var(--green);
    }

    sl-alert[variant="warning"]::part(icon) {
      color: var(--yellow);
    }

    sl-alert[variant="danger"]::part(icon) {
      color: var(--red);
    }

    sl-alert[variant="primary"]::part(icon) {
      color: var(--blue);
    }

    /* Countdown animation for auto-dismiss */
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 2px;
      background: var(--overlay1);
      border-radius: 0 0 0 4px;
    }

    @media (max-width: 480px) {
      :host {
        bottom: 0.5rem;
        right: 0.5rem;
        left: 0.5rem;
        max-width: none;
      }

      sl-alert {
        min-width: unset;
        max-width: none;
        width: 100%;
      }
    }
  `;

  @state() private toasts: Toast[] = [];

  // Track timeouts for cleanup
  private dismissTimeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();
  // Track exiting toasts for animation
  private exitingToasts: Set<string> = new Set();

  connectedCallback() {
    super.connectedCallback();
    // Listen for show-toast events on window
    window.addEventListener('show-toast', this.handleShowToastEvent as EventListener);
    // Expose global API
    this.exposeGlobalApi();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('show-toast', this.handleShowToastEvent as EventListener);
    // Clear all timeouts
    for (const timeout of this.dismissTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.dismissTimeouts.clear();
    // Remove global API
    this.removeGlobalApi();
  }

  private exposeGlobalApi() {
    // Define showToast on window
    (window as unknown as { showToast: (options: ShowToastOptions) => void }).showToast = (options: ShowToastOptions) => {
      this.showToast(options);
    };
  }

  private removeGlobalApi() {
    delete (window as unknown as { showToast?: (options: ShowToastOptions) => void }).showToast;
  }

  private handleShowToastEvent = (event: CustomEvent<ShowToastOptions>) => {
    this.showToast(event.detail);
  };

  /**
   * Show a toast notification
   */
  showToast(options: ShowToastOptions): void {
    const toast: Toast = {
      id: generateToastId(),
      message: options.message,
      variant: options.variant ?? 'primary',
      duration: options.duration ?? DEFAULT_DURATION,
    };

    // Add toast to the stack
    this.toasts = [...this.toasts, toast];

    // Schedule auto-dismiss
    if (toast.duration > 0) {
      const timeout = setTimeout(() => {
        this.dismissToast(toast.id);
      }, toast.duration);
      this.dismissTimeouts.set(toast.id, timeout);
    }
  }

  /**
   * Dismiss a toast by ID with exit animation
   */
  private dismissToast(id: string): void {
    // Clear the timeout if exists
    const timeout = this.dismissTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.dismissTimeouts.delete(id);
    }

    // Mark as exiting for animation
    this.exitingToasts.add(id);
    this.requestUpdate();

    // Remove after animation completes
    setTimeout(() => {
      this.exitingToasts.delete(id);
      this.toasts = this.toasts.filter(t => t.id !== id);
    }, 300); // Match animation duration
  }

  /**
   * Handle manual close via the alert's close button
   */
  private handleCloseRequest(id: string): void {
    this.dismissToast(id);
  }

  /**
   * Get the appropriate icon name for a variant
   */
  private getIconForVariant(variant: ToastVariant): string {
    switch (variant) {
      case 'success':
        return 'check-circle';
      case 'warning':
        return 'exclamation-triangle';
      case 'danger':
        return 'exclamation-octagon';
      case 'primary':
      default:
        return 'info-circle';
    }
  }

  render() {
    return html`
      ${this.toasts.map(toast => html`
        <div class="toast-container ${this.exitingToasts.has(toast.id) ? 'exiting' : ''}">
          <sl-alert
            variant=${toast.variant}
            open
            closable
            @sl-after-hide=${() => this.handleCloseRequest(toast.id)}
          >
            <sl-icon slot="icon" name=${this.getIconForVariant(toast.variant)}></sl-icon>
            ${toast.message}
          </sl-alert>
        </div>
      `)}
    `;
  }
}

// Type declaration for global window interface
declare global {
  interface HTMLElementTagNameMap {
    'tick-toast-stack': TickToastStack;
  }

  interface WindowEventMap {
    'show-toast': CustomEvent<ShowToastOptions>;
  }

  interface Window {
    showToast?: (options: ShowToastOptions) => void;
  }
}
