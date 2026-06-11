/**
 * Schema roundtrip tests for generated TypeScript types.
 *
 * These tests validate that:
 * 1. TypeScript types can deserialize JSON fixtures
 * 2. The fixtures are compatible with both Go and TS generated types
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import type {
  Tick,
  TickStatus,
  TickType,
  TickRequires,
  TickAwaiting,
} from './tick.js';
import type {
  InfoResponse,
  ListTicksResponse,
  TickResponse,
  GetTickResponse,
  EpicInfo,
  Note,
  BlockerDetail,
} from './api/responses.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Path: src/types/generated -> ../../.. -> src -> ../.. -> internal/tickboard/ui -> ../../../schemas
const FIXTURES_DIR = join(__dirname, '..', '..', '..', '..', '..', '..', 'schemas', 'fixtures');

function readFixture(name: string): unknown {
  const content = readFileSync(join(FIXTURES_DIR, name), 'utf-8');
  return JSON.parse(content);
}

describe('Schema Roundtrip Tests', () => {
  describe('Tick', () => {
    it('deserializes tick.json fixture correctly', () => {
      const tick = readFixture('tick.json') as Tick;

      // Verify required fields
      expect(tick.id).toBe('abc123');
      expect(tick.title).toBe('Test tick for schema validation');
      expect(tick.status).toBe('in_progress');
      expect(tick.priority).toBe(2);
      expect(tick.type).toBe('task');
      expect(tick.owner).toBe('agent');
      expect(tick.created_by).toBe('test-user');
      expect(tick.created_at).toBe('2024-01-25T10:00:00Z');
      expect(tick.updated_at).toBe('2024-01-25T10:30:00Z');
    });

    it('deserializes enum values correctly', () => {
      const tick = readFixture('tick.json') as Tick;

      const status: TickStatus = tick.status;
      expect(status).toBe('in_progress');

      const type: TickType = tick.type;
      expect(type).toBe('task');

      const requires: TickRequires | undefined = tick.requires;
      expect(requires).toBe('approval');

      const awaiting: TickAwaiting | undefined = tick.awaiting;
      expect(awaiting).toBe('review');
    });

    it('deserializes optional fields correctly', () => {
      const tick = readFixture('tick.json') as Tick;

      expect(tick.description).toBe('This is a comprehensive test tick that includes all fields');
      expect(tick.notes).toContain('Initial note');
      expect(tick.labels).toEqual(['test', 'schema']);
      expect(tick.blocked_by).toEqual(['xyz789']);
      expect(tick.parent).toBe('epic-001');
      expect(tick.discovered_from).toBe('def456');
      expect(tick.acceptance_criteria).toBe('All tests pass');
      expect(tick.defer_until).toBe('2024-02-01T00:00:00Z');
      expect(tick.external_ref).toBe('https://github.com/org/repo/issues/1');
      expect(tick.manual).toBe(false);
      expect(tick.verdict).toBe('approved');
      expect(tick.closed_at).toBe('2024-01-25T11:00:00Z');
      expect(tick.closed_reason).toBe('completed');
    });

    it('can re-serialize without data loss', () => {
      const original = readFixture('tick.json') as Tick;
      const serialized = JSON.stringify(original);
      const deserialized = JSON.parse(serialized) as Tick;

      expect(deserialized.id).toBe(original.id);
      expect(deserialized.title).toBe(original.title);
      expect(deserialized.status).toBe(original.status);
      expect(deserialized.labels).toEqual(original.labels);
    });
  });

  describe('API Responses', () => {
    interface ApiFixtures {
      infoResponse: InfoResponse;
      listTicksResponse: ListTicksResponse;
      tickResponse: TickResponse;
      getTickResponse: GetTickResponse;
    }

    const fixtures = readFixture('api-responses.json') as ApiFixtures;

    it('deserializes InfoResponse correctly', () => {
      const info = fixtures.infoResponse;

      expect(info.repoName).toBe('owner/repo');
      expect(info.epics).toHaveLength(2);

      const epic: EpicInfo = info.epics[0];
      expect(epic.id).toBe('epic-001');
      expect(epic.title).toBe('Feature Epic');
    });

    it('deserializes ListTicksResponse correctly', () => {
      const list = fixtures.listTicksResponse;

      expect(list.ticks).toHaveLength(2);

      // First tick - not blocked
      expect(list.ticks[0].id).toBe('tick-001');
      expect(list.ticks[0].isBlocked).toBe(false);
      expect(list.ticks[0].column).toBe('ready');

      // Second tick - blocked
      expect(list.ticks[1].id).toBe('tick-002');
      expect(list.ticks[1].isBlocked).toBe(true);
      expect(list.ticks[1].column).toBe('blocked');
      expect(list.ticks[1].blocked_by).toEqual(['tick-001']);
    });

    it('deserializes TickResponse with computed fields', () => {
      const tick = fixtures.tickResponse;

      // Base tick fields
      expect(tick.id).toBe('tick-001');
      expect(tick.status).toBe('in_progress');
      expect(tick.awaiting).toBe('review');

      // Computed fields
      expect(tick.isBlocked).toBe(false);
      expect(tick.column).toBe('human');
    });

    it('deserializes GetTickResponse with notesList and blockerDetails', () => {
      const tick = fixtures.getTickResponse;

      // Base fields
      expect(tick.id).toBe('tick-001');
      expect(tick.isBlocked).toBe(true);
      expect(tick.column).toBe('blocked');

      // Notes list
      expect(tick.notesList).toHaveLength(1);
      const note: Note = tick.notesList[0];
      expect(note.timestamp).toBe('2024-01-25 10:30');
      expect(note.author).toBe('human');
      expect(note.text).toBe('Note text');

      // Blocker details
      expect(tick.blockerDetails).toHaveLength(1);
      const blocker: BlockerDetail = tick.blockerDetails[0];
      expect(blocker.id).toBe('tick-002');
      expect(blocker.title).toBe('Blocking task');
      expect(blocker.status).toBe('open');
    });
  });
});
