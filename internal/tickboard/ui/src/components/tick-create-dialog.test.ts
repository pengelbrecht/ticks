/**
 * Unit tests for tick-create-dialog component.
 * Tests form rendering, validation, submission, and event dispatching.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LitElement } from 'lit';
import './tick-create-dialog.js';
import type { TickCreateDialog } from './tick-create-dialog.js';

// Mock the createTick function from stores/comms
vi.mock('../stores/comms.js', () => ({
  createTick: vi.fn(),
}));

// Import after mock setup
import { createTick } from '../stores/comms.js';
const mockCreateTick = createTick as ReturnType<typeof vi.fn>;

describe('tick-create-dialog', () => {
  let element: TickCreateDialog;

  beforeEach(async () => {
    // Reset mocks before each test
    vi.clearAllMocks();

    element = document.createElement('tick-create-dialog') as TickCreateDialog;
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
  // Dialog Structure
  // ===========================================================================

  describe('dialog structure', () => {
    it('renders sl-dialog component', async () => {
      const dialog = element.shadowRoot?.querySelector('sl-dialog');
      expect(dialog).not.toBeNull();
    });

    it('dialog has correct label', async () => {
      const dialog = element.shadowRoot?.querySelector('sl-dialog');
      expect(dialog?.getAttribute('label')).toBe('Create New Tick');
    });

    it('dialog is closed by default', async () => {
      expect(element.open).toBe(false);
    });

    it('dialog opens when open property is true', async () => {
      element.open = true;
      await element.updateComplete;

      const dialog = element.shadowRoot?.querySelector('sl-dialog');
      expect(dialog?.hasAttribute('open')).toBe(true);
    });
  });

  // ===========================================================================
  // Form Fields
  // ===========================================================================

  describe('form fields', () => {
    it('renders title input field', async () => {
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]');
      expect(input).not.toBeNull();
    });

    it('title input has placeholder', async () => {
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]');
      expect(input?.getAttribute('placeholder')).toBe('Enter tick title');
    });

    it('title input has autofocus', async () => {
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]');
      expect(input?.hasAttribute('autofocus')).toBe(true);
    });

    it('title field is marked as required with asterisk', async () => {
      const required = element.shadowRoot?.querySelector('.required');
      expect(required).not.toBeNull();
      expect(required?.textContent).toBe('*');
    });

    it('renders description textarea', async () => {
      const textarea = element.shadowRoot?.querySelector('sl-textarea');
      expect(textarea).not.toBeNull();
      expect(textarea?.getAttribute('placeholder')).toBe('Enter description (optional)');
    });

    it('renders type select dropdown', async () => {
      const selects = element.shadowRoot?.querySelectorAll('.form-row sl-select');
      expect(selects?.length).toBeGreaterThanOrEqual(1);
    });

    it('type select has all type options', async () => {
      const options = element.shadowRoot?.querySelectorAll('.form-row sl-select sl-option');
      const optionValues = Array.from(options || []).map(o => o.getAttribute('value'));
      expect(optionValues).toContain('task');
      expect(optionValues).toContain('epic');
      expect(optionValues).toContain('bug');
      expect(optionValues).toContain('feature');
      expect(optionValues).toContain('chore');
    });

    it('renders priority select dropdown', async () => {
      const selects = element.shadowRoot?.querySelectorAll('.form-row sl-select');
      expect(selects?.length).toBe(2); // type and priority
    });

    it('priority select has all priority options', async () => {
      // Get all sl-selects in form-row, the second one should be priority
      const selects = element.shadowRoot?.querySelectorAll('.form-row sl-select');
      const prioritySelect = selects?.[1];
      const options = prioritySelect?.querySelectorAll('sl-option');
      expect(options?.length).toBe(5); // 0-4 priorities
    });

    it('renders parent epic select dropdown', async () => {
      const label = element.shadowRoot?.querySelector('label');
      const labels = Array.from(element.shadowRoot?.querySelectorAll('label') || []);
      const parentLabel = labels.find(l => l.textContent?.includes('Parent Epic'));
      expect(parentLabel).not.toBeNull();
    });

    it('parent epic select is clearable', async () => {
      // Find the epic select by checking for clearable attribute
      const selects = element.shadowRoot?.querySelectorAll('sl-select[clearable]');
      expect(selects?.length).toBeGreaterThan(0);
    });

    it('parent epic select has placeholder "None"', async () => {
      const selects = element.shadowRoot?.querySelectorAll('sl-select');
      const epicSelect = Array.from(selects || []).find(s => s.getAttribute('placeholder') === 'None');
      expect(epicSelect).not.toBeNull();
    });

    it('renders labels input field', async () => {
      const inputs = element.shadowRoot?.querySelectorAll('sl-input');
      const labelsInput = Array.from(inputs || []).find(i =>
        i.getAttribute('placeholder')?.includes('comma-separated')
      );
      expect(labelsInput).not.toBeNull();
    });

    it('renders manual task checkbox', async () => {
      const checkbox = element.shadowRoot?.querySelector('sl-checkbox');
      expect(checkbox).not.toBeNull();
      expect(checkbox?.textContent).toContain('Manual task');
    });

    it('manual checkbox has help text', async () => {
      const helpText = element.shadowRoot?.querySelector('.checkbox-help');
      expect(helpText).not.toBeNull();
      expect(helpText?.textContent).toContain('Manual tasks require human intervention');
    });
  });

  // ===========================================================================
  // Epic Dropdown
  // ===========================================================================

  describe('epic dropdown', () => {
    it('renders options for each epic', async () => {
      const selects = element.shadowRoot?.querySelectorAll('sl-select');
      const epicSelect = Array.from(selects || []).find(s => s.getAttribute('placeholder') === 'None');
      const options = epicSelect?.querySelectorAll('sl-option');
      expect(options?.length).toBe(2);
    });

    it('epic options have correct values', async () => {
      const selects = element.shadowRoot?.querySelectorAll('sl-select');
      const epicSelect = Array.from(selects || []).find(s => s.getAttribute('placeholder') === 'None');
      const options = epicSelect?.querySelectorAll('sl-option');
      expect(options?.[0]?.getAttribute('value')).toBe('e1');
      expect(options?.[1]?.getAttribute('value')).toBe('e2');
    });

    it('epic options display ID as badge', async () => {
      const epicIds = element.shadowRoot?.querySelectorAll('sl-select[clearable] .epic-id');
      expect(epicIds?.length).toBe(2);
      expect(epicIds?.[0]?.textContent).toBe('e1');
      expect(epicIds?.[1]?.textContent).toBe('e2');
    });

    it('epic options display title', async () => {
      const selects = element.shadowRoot?.querySelectorAll('sl-select');
      const epicSelect = Array.from(selects || []).find(s => s.getAttribute('placeholder') === 'None');
      const options = epicSelect?.querySelectorAll('sl-option');
      expect(options?.[0]?.textContent).toContain('Epic One');
      expect(options?.[1]?.textContent).toContain('Epic Two');
    });

    it('updates options when epics property changes', async () => {
      element.epics = [
        { id: 'new1', title: 'New Epic' },
      ];
      await element.updateComplete;

      const selects = element.shadowRoot?.querySelectorAll('sl-select');
      const epicSelect = Array.from(selects || []).find(s => s.getAttribute('placeholder') === 'None');
      const options = epicSelect?.querySelectorAll('sl-option');
      expect(options?.length).toBe(1);
      expect(options?.[0]?.getAttribute('value')).toBe('new1');
    });
  });

  // ===========================================================================
  // Footer Buttons
  // ===========================================================================

  describe('footer buttons', () => {
    it('renders cancel button', async () => {
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const cancelButton = Array.from(buttons || []).find(b => b.textContent?.includes('Cancel'));
      expect(cancelButton).not.toBeNull();
    });

    it('cancel button has secondary variant', async () => {
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const cancelButton = Array.from(buttons || []).find(b => b.textContent?.includes('Cancel'));
      expect(cancelButton?.getAttribute('variant')).toBe('secondary');
    });

    it('renders create button', async () => {
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      expect(createButton).not.toBeNull();
    });

    it('create button has primary variant', async () => {
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b =>
        b.textContent?.includes('Create') && !b.textContent?.includes('Creating')
      );
      expect(createButton?.getAttribute('variant')).toBe('primary');
    });
  });

  // ===========================================================================
  // Form Validation
  // ===========================================================================

  describe('form validation', () => {
    it('shows error when submitting without title', async () => {
      // Mock createTick to verify it was not called
      mockCreateTick.mockResolvedValue({});

      // Trigger submit
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await element.updateComplete;

      // Check error message is shown
      const error = element.shadowRoot?.querySelector('.error-message');
      expect(error).not.toBeNull();
      expect(error?.textContent).toContain('Title is required');
    });

    it('does not call createTick when title is empty', async () => {
      mockCreateTick.mockResolvedValue({});

      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await element.updateComplete;

      expect(mockCreateTick).not.toHaveBeenCalled();
    });

    it('trims whitespace from title for validation', async () => {
      // Set title to only whitespace
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = '   ';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
      await element.updateComplete;

      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await element.updateComplete;

      const error = element.shadowRoot?.querySelector('.error-message');
      expect(error).not.toBeNull();
      expect(error?.textContent).toContain('Title is required');
    });
  });

  // ===========================================================================
  // Form Submission
  // ===========================================================================

  describe('form submission', () => {
    it('calls createTick with correct data on submit', async () => {
      const mockTick = { id: 'abc', title: 'Test Title' };
      mockCreateTick.mockResolvedValue(mockTick);

      // Set title
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test Title';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
      await element.updateComplete;

      // Submit
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await element.updateComplete;
      await vi.waitFor(() => {
        expect(mockCreateTick).toHaveBeenCalled();
      });

      expect(mockCreateTick).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
          type: 'task',
          priority: 2,
        })
      );
    });

    it('includes description when provided', async () => {
      const mockTick = { id: 'abc', title: 'Test' };
      mockCreateTick.mockResolvedValue(mockTick);

      // Set title
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      // Set description
      const textarea = element.shadowRoot?.querySelector('sl-textarea') as any;
      textarea.value = 'Test description';
      textarea.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      // Submit
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await vi.waitFor(() => {
        expect(mockCreateTick).toHaveBeenCalled();
      });

      expect(mockCreateTick).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Test description',
        })
      );
    });

    it('includes parent when epic is selected', async () => {
      const mockTick = { id: 'abc', title: 'Test' };
      mockCreateTick.mockResolvedValue(mockTick);

      // Set title
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      // Select parent epic
      const selects = element.shadowRoot?.querySelectorAll('sl-select');
      const epicSelect = Array.from(selects || []).find(s => s.getAttribute('placeholder') === 'None') as any;
      epicSelect.value = 'e1';
      epicSelect.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));

      await element.updateComplete;

      // Submit
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await vi.waitFor(() => {
        expect(mockCreateTick).toHaveBeenCalled();
      });

      expect(mockCreateTick).toHaveBeenCalledWith(
        expect.objectContaining({
          parent: 'e1',
        })
      );
    });

    it('trims title before sending', async () => {
      const mockTick = { id: 'abc', title: 'Test' };
      mockCreateTick.mockResolvedValue(mockTick);

      // Set title with extra whitespace
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = '  Test Title  ';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      // Submit
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await vi.waitFor(() => {
        expect(mockCreateTick).toHaveBeenCalled();
      });

      expect(mockCreateTick).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Title',
        })
      );
    });
  });

  // ===========================================================================
  // Loading State
  // ===========================================================================

  describe('loading state', () => {
    it('shows "Creating..." text while loading', async () => {
      // Make createTick hang
      mockCreateTick.mockImplementation(() => new Promise(() => {}));

      // Set title and submit
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await element.updateComplete;

      // Check for loading text
      const loadingButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Creating'));
      expect(loadingButton).not.toBeNull();
    });

    it('disables form fields while loading', async () => {
      mockCreateTick.mockImplementation(() => new Promise(() => {}));

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const createButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      (createButton as HTMLElement)?.click();

      await element.updateComplete;

      // Check that title input is disabled
      const titleInput = element.shadowRoot?.querySelector('sl-input[name="title"]');
      expect(titleInput?.hasAttribute('disabled')).toBe(true);
    });

    it('disables buttons while loading', async () => {
      mockCreateTick.mockImplementation(() => new Promise(() => {}));

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      await element.updateComplete;

      const allButtons = element.shadowRoot?.querySelectorAll('ticks-button');
      for (const button of allButtons || []) {
        expect(button.hasAttribute('disabled')).toBe(true);
      }
    });

    it('prevents dialog close while loading', async () => {
      mockCreateTick.mockImplementation(() => new Promise(() => {}));

      element.open = true;
      await element.updateComplete;

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      await element.updateComplete;

      // Try to close dialog
      const dialog = element.shadowRoot?.querySelector('sl-dialog');
      const closeEvent = new CustomEvent('sl-request-close', {
        bubbles: true,
        cancelable: true
      });
      dialog?.dispatchEvent(closeEvent);

      // Event should be prevented
      expect(closeEvent.defaultPrevented).toBe(true);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('error handling', () => {
    it('displays API error message', async () => {
      // Import ApiError dynamically to avoid module issues
      const { ApiError } = await import('../api/ticks.js');
      mockCreateTick.mockRejectedValue(new ApiError('Bad request', 400, 'Invalid title'));

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      // Wait for async error handling and re-render
      await vi.waitFor(async () => {
        await element.updateComplete;
        const error = element.shadowRoot?.querySelector('.error-message');
        expect(error).not.toBeNull();
      }, { timeout: 1000 });

      const error = element.shadowRoot?.querySelector('.error-message');
      expect(error?.textContent).toContain('Invalid title');
    });

    it('displays generic error message for Error instances', async () => {
      mockCreateTick.mockRejectedValue(new Error('Network error'));

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      // Wait for async error handling and re-render
      await vi.waitFor(async () => {
        await element.updateComplete;
        const error = element.shadowRoot?.querySelector('.error-message');
        expect(error).not.toBeNull();
      }, { timeout: 1000 });

      const error = element.shadowRoot?.querySelector('.error-message');
      expect(error?.textContent).toContain('Network error');
    });

    it('displays fallback message for unknown errors', async () => {
      mockCreateTick.mockRejectedValue('Something weird');

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      // Wait for async error handling and re-render
      await vi.waitFor(async () => {
        await element.updateComplete;
        const error = element.shadowRoot?.querySelector('.error-message');
        expect(error).not.toBeNull();
      }, { timeout: 1000 });

      const error = element.shadowRoot?.querySelector('.error-message');
      expect(error?.textContent).toContain('Failed to create tick');
    });

    it('error message has correct styling', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.error-message');
      expect(cssText).toContain('var(--red)');
    });

    it('resets loading state after error', async () => {
      mockCreateTick.mockRejectedValue(new Error('Error'));

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      // Wait for async error handling and re-render
      await vi.waitFor(async () => {
        await element.updateComplete;
        const error = element.shadowRoot?.querySelector('.error-message');
        expect(error).not.toBeNull();
      }, { timeout: 1000 });

      // Check that button is no longer disabled
      const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
      const finalCreateButton = Array.from(buttons || []).find(b => b.textContent?.includes('Create'));
      expect(finalCreateButton?.hasAttribute('disabled')).toBe(false);
    });
  });

  // ===========================================================================
  // Event Dispatching
  // ===========================================================================

  describe('event dispatching', () => {
    describe('dialog-close event', () => {
      it('fires dialog-close when cancel button clicked', async () => {
        const handler = vi.fn();
        element.addEventListener('dialog-close', handler);

        const buttons = element.shadowRoot?.querySelectorAll('ticks-button');
        const cancelButton = Array.from(buttons || []).find(b => b.textContent?.includes('Cancel'));
        (cancelButton as HTMLElement)?.click();

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('dialog-close event bubbles', async () => {
        const handler = vi.fn();
        element.addEventListener('dialog-close', handler);

        const cancelButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
        cancelButton?.click();

        expect(handler.mock.calls[0][0].bubbles).toBe(true);
      });

      it('dialog-close event is composed', async () => {
        const handler = vi.fn();
        element.addEventListener('dialog-close', handler);

        const cancelButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
        cancelButton?.click();

        expect(handler.mock.calls[0][0].composed).toBe(true);
      });

      it('resets form on dialog close', async () => {
        // Set some form values
        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test Title';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
        await element.updateComplete;

        // Close dialog
        const cancelButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Cancel')) as HTMLElement;
        cancelButton?.click();

        await element.updateComplete;

        // Re-check input value (internal state should reset)
        // After close, the form is reset, so new render will show empty
        element.open = true;
        await element.updateComplete;

        const newInput = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        expect(newInput?.value).toBe('');
      });
    });

    describe('tick-created event', () => {
      it('fires tick-created on successful submission', async () => {
        const mockTick = { id: 'abc', title: 'Test' };
        mockCreateTick.mockResolvedValue(mockTick);

        const handler = vi.fn();
        element.addEventListener('tick-created', handler);

        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        await element.updateComplete;

        const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Create')) as HTMLElement;
        createButton?.click();

        await vi.waitFor(() => {
          expect(handler).toHaveBeenCalled();
        });

        expect(handler).toHaveBeenCalledTimes(1);
      });

      it('tick-created event bubbles', async () => {
        const mockTick = { id: 'abc', title: 'Test' };
        mockCreateTick.mockResolvedValue(mockTick);

        const handler = vi.fn();
        element.addEventListener('tick-created', handler);

        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        await element.updateComplete;

        const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Create')) as HTMLElement;
        createButton?.click();

        await vi.waitFor(() => {
          expect(handler).toHaveBeenCalled();
        });

        expect(handler.mock.calls[0][0].bubbles).toBe(true);
      });

      it('tick-created event is composed', async () => {
        const mockTick = { id: 'abc', title: 'Test' };
        mockCreateTick.mockResolvedValue(mockTick);

        const handler = vi.fn();
        element.addEventListener('tick-created', handler);

        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        await element.updateComplete;

        const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Create')) as HTMLElement;
        createButton?.click();

        await vi.waitFor(() => {
          expect(handler).toHaveBeenCalled();
        });

        expect(handler.mock.calls[0][0].composed).toBe(true);
      });

      it('tick-created event includes created tick in detail', async () => {
        const mockTick = { id: 'abc', title: 'Test' };
        mockCreateTick.mockResolvedValue(mockTick);

        const handler = vi.fn();
        element.addEventListener('tick-created', handler);

        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        await element.updateComplete;

        const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Create')) as HTMLElement;
        createButton?.click();

        await vi.waitFor(() => {
          expect(handler).toHaveBeenCalled();
        });

        expect(handler.mock.calls[0][0].detail.tick).toEqual(mockTick);
      });

      it('tick-created event includes labels array', async () => {
        const mockTick = { id: 'abc', title: 'Test' };
        mockCreateTick.mockResolvedValue(mockTick);

        const handler = vi.fn();
        element.addEventListener('tick-created', handler);

        // Set title
        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        // Set labels
        const inputs = element.shadowRoot?.querySelectorAll('sl-input');
        const labelsInput = Array.from(inputs || []).find(i =>
          i.getAttribute('placeholder')?.includes('comma-separated')
        ) as any;
        labelsInput.value = 'bug, urgent, frontend';
        labelsInput.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        await element.updateComplete;

        const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Create')) as HTMLElement;
        createButton?.click();

        await vi.waitFor(() => {
          expect(handler).toHaveBeenCalled();
        });

        expect(handler.mock.calls[0][0].detail.labels).toEqual(['bug', 'urgent', 'frontend']);
      });

      it('tick-created event includes manual flag', async () => {
        const mockTick = { id: 'abc', title: 'Test' };
        mockCreateTick.mockResolvedValue(mockTick);

        const handler = vi.fn();
        element.addEventListener('tick-created', handler);

        // Set title
        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        // Check manual checkbox
        const checkbox = element.shadowRoot?.querySelector('sl-checkbox') as any;
        checkbox.checked = true;
        checkbox.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));

        await element.updateComplete;

        const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Create')) as HTMLElement;
        createButton?.click();

        await vi.waitFor(() => {
          expect(handler).toHaveBeenCalled();
        });

        expect(handler.mock.calls[0][0].detail.manual).toBe(true);
      });

      it('closes dialog after successful creation', async () => {
        const mockTick = { id: 'abc', title: 'Test' };
        mockCreateTick.mockResolvedValue(mockTick);

        const closeHandler = vi.fn();
        element.addEventListener('dialog-close', closeHandler);

        const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
        input.value = 'Test';
        input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));

        await element.updateComplete;

        const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
          .find(b => b.textContent?.includes('Create')) as HTMLElement;
        createButton?.click();

        await vi.waitFor(() => {
          expect(closeHandler).toHaveBeenCalled();
        });
      });
    });
  });

  // ===========================================================================
  // CSS Styling
  // ===========================================================================

  describe('CSS styling', () => {
    it('dialog panel has correct width', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('width: 480px');
      expect(cssText).toContain('max-width: 95vw');
    });

    it('dialog uses Catppuccin theme colors', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('var(--base)');
      expect(cssText).toContain('var(--surface0)');
      expect(cssText).toContain('var(--surface1)');
    });

    it('form fields have proper spacing', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.form-field');
      expect(cssText).toContain('margin-bottom: 1rem');
    });

    it('form row uses flex layout', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.form-row');
      expect(cssText).toContain('display: flex');
      expect(cssText).toContain('gap: 1rem');
    });

    it('required asterisk uses red color', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.required');
      expect(cssText).toContain('var(--red)');
    });

    it('epic-id badge has monospace font', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.epic-id');
      expect(cssText).toContain('--sl-font-mono');
    });

    it('footer buttons are right-aligned', () => {
      const styles = (element.constructor as typeof LitElement).styles;
      const cssText = Array.isArray(styles)
        ? styles.map(s => s.cssText || s.toString()).join('')
        : styles?.cssText || styles?.toString() || '';

      expect(cssText).toContain('.footer-buttons');
      expect(cssText).toContain('justify-content: flex-end');
    });
  });

  // ===========================================================================
  // Form Input Handlers
  // ===========================================================================

  describe('form input handlers', () => {
    it('updates title state on input', async () => {
      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'New Title';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
      await element.updateComplete;

      // Verify internal state by attempting submit
      mockCreateTick.mockResolvedValue({ id: 'test', title: 'New Title' });

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      await vi.waitFor(() => {
        expect(mockCreateTick).toHaveBeenCalled();
      });

      expect(mockCreateTick).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'New Title' })
      );
    });

    it('updates type state on change', async () => {
      const selects = element.shadowRoot?.querySelectorAll('.form-row sl-select');
      const typeSelect = selects?.[0] as any;
      typeSelect.value = 'bug';
      typeSelect.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));
      await element.updateComplete;

      mockCreateTick.mockResolvedValue({ id: 'test', title: 'Test' });

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      await vi.waitFor(() => {
        expect(mockCreateTick).toHaveBeenCalled();
      });

      expect(mockCreateTick).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'bug' })
      );
    });

    it('updates priority state on change', async () => {
      const selects = element.shadowRoot?.querySelectorAll('.form-row sl-select');
      const prioritySelect = selects?.[1] as any;
      prioritySelect.value = '1';
      prioritySelect.dispatchEvent(new CustomEvent('sl-change', { bubbles: true }));
      await element.updateComplete;

      mockCreateTick.mockResolvedValue({ id: 'test', title: 'Test' });

      const input = element.shadowRoot?.querySelector('sl-input[name="title"]') as any;
      input.value = 'Test';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
      await element.updateComplete;

      const createButton = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || [])
        .find(b => b.textContent?.includes('Create')) as HTMLElement;
      createButton?.click();

      await vi.waitFor(() => {
        expect(mockCreateTick).toHaveBeenCalled();
      });

      expect(mockCreateTick).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 1 })
      );
    });
  });
});
