# JSON Schemas for Type Synchronization

This directory contains JSON Schema definitions that serve as the single source of truth for types shared between the Go server and TypeScript client.

## Directory Structure

```
schemas/
├── README.md             # This file
├── tick.schema.json      # Core tick type
├── activity.schema.json  # Activity log entry type
├── api/
│   ├── requests.schema.json   # API request types
│   └── responses.schema.json  # API response types
└── websocket/
    └── messages.schema.json   # WebSocket message types
```

## Conventions

### Field Naming

- **snake_case** for all property names (matches Go JSON tags)
- TypeScript generator will convert to camelCase where appropriate

### Required vs Optional

- Use `"required": [...]` array to specify required fields
- All fields not in required array are optional
- In TypeScript, optional fields become `field?: Type`
- In Go, optional fields may use pointers or `omitempty`

### Enums

- Define enums in `$defs` section at schema root
- Reference with `{ "$ref": "#/$defs/EnumName" }`
- Example:
  ```json
  "$defs": {
    "TickStatus": {
      "type": "string",
      "enum": ["open", "in_progress", "closed"]
    }
  }
  ```

### Date/Time Fields

- Use `"type": "string", "format": "date-time"` for ISO 8601 timestamps
- Go uses `time.Time`, TypeScript uses `string`

### References

- Use `$ref` for cross-schema references
- Relative paths: `{ "$ref": "../tick.schema.json" }`
- Same file: `{ "$ref": "#/$defs/TypeName" }`

## Code Generation

### TypeScript

```bash
cd internal/tickboard/ui
pnpm run codegen
```

Output: `src/types/generated/`

### Go

```bash
make codegen-go
```

Output: `internal/types/generated/`

### Full Generation

```bash
./scripts/codegen.sh
```

## Adding New Types

1. Add schema definition to appropriate `.schema.json` file
2. Run code generation: `./scripts/codegen.sh`
3. Import generated types in your code
4. Commit both schema and generated files

## Validation

All schemas follow JSON Schema draft 2020-12. Validate schemas using:

```bash
# Using ajv-cli
npx ajv validate -s schemas/tick.schema.json -d path/to/data.json
```

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Field naming | snake_case | Matches Go JSON tags, TS generator handles conversion |
| Schema draft | 2020-12 | Latest stable version with good tooling support |
| Single source | Schemas | Maximum consistency between server and client |
| Computed fields | In response schemas | TickResponse extends Tick with is_blocked, column |
