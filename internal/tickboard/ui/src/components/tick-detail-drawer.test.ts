/**
 * Unit tests for tick-detail-drawer component.
 *
 * Focused on the "After (soft order)" edit field (tick 6ii):
 * - input renders prefilled from tick.after
 * - save sends after via updateTickViaComms and emits tick-updated
 * - clearing the input removes the field
 * - the ticks store + roadmap computation reflect the edit
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import './tick-detail-drawer.js';
import type { TickDetailDrawer } from './tick-detail-drawer.js';
import type { Tick, BoardTick } from '../types/tick.js';

// Mock the comms store functions used by the drawer
vi.mock('../stores/comms.js', () => ({
  approveTick: vi.fn(),
  rejectTick: vi.fn(),
  closeTick: vi.fn(),
  reopenTick: vi.fn(),
  addNote: vi.fn(),
  updateTickViaComms: vi.fn(),
}));

// Import after mock setup
import { updateTickViaComms } from '../stores/comms.js';
import { $ticks, setTicks, updateTick as updateTickStore } from '../stores/ticks.js';
import { computeRoadmapFromTicks } from '../stores/roadmap-compute.js';

const mockUpdateTickViaComms = updateTickViaComms as ReturnType<typeof vi.fn>;

function makeTick(overrides: Partial<Tick> = {}): Tick {
  return {
    id: 'ep2',
    title: 'Second Epic',
    description: 'desc',
    status: 'open',
    priority: 2,
    type: 'epic',
    owner: '',
    created_by: 'test@user.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

function getAfterInput(element: TickDetailDrawer): HTMLInputElement {
  return element.shadowRoot?.querySelector('sl-input.after-input') as HTMLInputElement;
}

function getAfterSaveButton(element: TickDetailDrawer): HTMLElement {
  const buttons = Array.from(element.shadowRoot?.querySelectorAll('ticks-button') || []);
  return buttons.find(
    b => b.textContent?.includes('Save') && !b.textContent?.includes('Note')
  ) as HTMLElement;
}

async function setAfterAndSave(element: TickDetailDrawer, value: string): Promise<void> {
  const input = getAfterInput(element);
  input.value = value;
  input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
  await element.updateComplete;

  getAfterSaveButton(element)?.click();
  await vi.waitFor(() => {
    expect(mockUpdateTickViaComms).toHaveBeenCalled();
  });
  await element.updateComplete;
}

describe('tick-detail-drawer after (soft order) editing', () => {
  let element: TickDetailDrawer;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockUpdateTickViaComms.mockImplementation(async (_id: string, updates: { after?: string[] }) =>
      makeTick({ after: updates.after && updates.after.length > 0 ? updates.after : undefined })
    );

    element = document.createElement('tick-detail-drawer') as TickDetailDrawer;
    element.tick = makeTick();
    element.open = true;
    document.body.appendChild(element);
    await element.updateComplete;
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  describe('rendering', () => {
    it('renders the After (soft order) section with an input', () => {
      const titles = Array.from(element.shadowRoot?.querySelectorAll('.section-title') || []);
      const afterTitle = titles.find(t => t.textContent?.includes('After (soft order)'));
      expect(afterTitle).not.toBeNull();
      expect(getAfterInput(element)).not.toBeNull();
    });

    it('renders a hint that after never blocks readiness', () => {
      const hint = element.shadowRoot?.querySelector('.after-hint');
      expect(hint?.textContent).toContain('never blocks readiness');
    });

    it('prefills the input from tick.after', async () => {
      element.tick = makeTick({ after: ['a1', 'b2'] });
      await element.updateComplete;

      expect(getAfterInput(element).value).toBe('a1, b2');
    });

    it('input is empty when tick has no after', () => {
      expect(getAfterInput(element).value).toBe('');
    });

    it('disables input and save button in readonly mode', async () => {
      element.readonlyMode = true;
      await element.updateComplete;

      expect(getAfterInput(element).hasAttribute('disabled')).toBe(true);
      expect(getAfterSaveButton(element).hasAttribute('disabled')).toBe(true);
    });
  });

  describe('saving', () => {
    it('calls updateTickViaComms with the parsed after list', async () => {
      await setAfterAndSave(element, ' a1, b2,, ');

      expect(mockUpdateTickViaComms).toHaveBeenCalledWith(
        'ep2',
        expect.objectContaining({ after: ['a1', 'b2'] })
      );
    });

    it('carries the current field values alongside after (cloud sends a full tick)', async () => {
      await setAfterAndSave(element, 'a1');

      expect(mockUpdateTickViaComms).toHaveBeenCalledWith(
        'ep2',
        expect.objectContaining({
          title: 'Second Epic',
          description: 'desc',
          status: 'open',
          priority: 2,
          after: ['a1'],
        })
      );
    });

    it('emits tick-updated with the new after value', async () => {
      const handler = vi.fn();
      element.addEventListener('tick-updated', handler);

      await setAfterAndSave(element, 'a1');

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0] as CustomEvent<{ tick: BoardTick }>;
      expect(event.detail.tick.after).toEqual(['a1']);
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
    });

    it('clearing the input sends an empty list and emits a tick without after', async () => {
      element.tick = makeTick({ after: ['a1'] });
      await element.updateComplete;
      expect(getAfterInput(element).value).toBe('a1');

      const handler = vi.fn();
      element.addEventListener('tick-updated', handler);

      await setAfterAndSave(element, '');

      // Empty input -> explicit empty list (clears the field server-side)
      expect(mockUpdateTickViaComms).toHaveBeenCalledWith(
        'ep2',
        expect.objectContaining({ after: [] })
      );

      // Emitted tick omits the field entirely
      const event = handler.mock.calls[0][0] as CustomEvent<{ tick: BoardTick }>;
      expect(event.detail.tick.after).toBeUndefined();
    });

    it('shows an error message when the update fails', async () => {
      mockUpdateTickViaComms.mockRejectedValue(new Error('agent offline'));

      const input = getAfterInput(element);
      input.value = 'a1';
      input.dispatchEvent(new CustomEvent('sl-input', { bubbles: true }));
      await element.updateComplete;

      getAfterSaveButton(element)?.click();

      await vi.waitFor(async () => {
        await element.updateComplete;
        const error = element.shadowRoot?.querySelector('.after-error');
        expect(error).not.toBeNull();
      });

      const error = element.shadowRoot?.querySelector('.after-error');
      expect(error?.textContent).toContain('agent offline');
    });
  });

  describe('store + roadmap integration', () => {
    it('edit form set/clear updates the tick store and the roadmap reflects it', async () => {
      // Seed the ticks store with two epics, no after edges yet
      const ep1 = makeTick({ id: 'ep1', title: 'First Epic' });
      const ep2 = makeTick({ id: 'ep2', title: 'Second Epic' });
      setTicks([ep1, ep2]);

      // Set: edit ep2's after to ['ep1'] via the drawer
      const handler = vi.fn();
      element.addEventListener('tick-updated', handler);
      await setAfterAndSave(element, 'ep1');

      // Apply the emitted tick to the store (same as tick-board.handleTickUpdated)
      updateTickStore(handler.mock.calls[0][0].detail.tick);
      expect($ticks.get()['ep2'].after).toEqual(['ep1']);

      // Roadmap computation (cloud-mode roadmap store path) reflects the soft edge:
      // ep2 is layered after ep1 and carries the after chip data
      let roadmap = computeRoadmapFromTicks(Object.values($ticks.get()));
      expect(roadmap.waves).toHaveLength(2);
      expect(roadmap.waves![0][0].id).toBe('ep1');
      expect(roadmap.waves![1][0].id).toBe('ep2');
      expect(roadmap.waves![1][0].after).toEqual(['ep1']);
      // Soft ordering never blocks readiness — ep2 must not be queued
      expect(roadmap.waves![1][0].status).not.toBe('queued');

      // Clear: drawer now shows the updated tick; clear the field
      element.tick = $ticks.get()['ep2'];
      await element.updateComplete;
      handler.mockClear();
      mockUpdateTickViaComms.mockClear();
      await setAfterAndSave(element, '');

      updateTickStore(handler.mock.calls[0][0].detail.tick);
      expect($ticks.get()['ep2'].after).toBeUndefined();

      // Roadmap collapses back to a single wave with no after chips
      roadmap = computeRoadmapFromTicks(Object.values($ticks.get()));
      expect(roadmap.waves).toHaveLength(1);
      expect(roadmap.waves![0].map(e => e.id).sort()).toEqual(['ep1', 'ep2']);
      expect(roadmap.waves![0].find(e => e.id === 'ep2')?.after).toBeUndefined();
    });
  });
});
