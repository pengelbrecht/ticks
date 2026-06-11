#!/usr/bin/env node

/**
 * TypeScript code generation from JSON schemas.
 *
 * Usage:
 *   node scripts/codegen.mjs         # Generate types
 *   node scripts/codegen.mjs --check # Check if types are up to date (for CI)
 */

import { compileFromFile } from 'json-schema-to-typescript';
import { readFile, writeFile, mkdir, readdir } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, relative, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_ROOT = join(__dirname, '..');
const SCHEMAS_DIR = join(UI_ROOT, '..', '..', '..', 'schemas');
const OUTPUT_DIR = join(UI_ROOT, 'src', 'types', 'generated');

// Check mode - compare generated content without writing
const isCheckMode = process.argv.includes('--check');

/**
 * Compile a single schema file to TypeScript.
 */
async function compileSchema(schemaPath, outputPath) {
  // Set cwd to the directory containing the schema file for proper $ref resolution
  const schemaDir = dirname(schemaPath);

  const options = {
    bannerComment: `/* eslint-disable */
/**
 * AUTO-GENERATED FILE - DO NOT EDIT
 * Generated from: ${relative(UI_ROOT, schemaPath)}
 * Run 'pnpm codegen' to regenerate.
 */`,
    style: {
      semi: true,
      singleQuote: true,
    },
    cwd: schemaDir, // For resolving $ref paths relative to schema file
    declareExternallyReferenced: true,
    unreachableDefinitions: true,
  };

  try {
    const ts = await compileFromFile(schemaPath, options);
    return ts;
  } catch (error) {
    console.error(`Error compiling ${schemaPath}:`, error.message);
    throw error;
  }
}

/**
 * Get all schema files from a directory.
 */
async function getSchemaFiles(dir) {
  const files = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await getSchemaFiles(fullPath));
    } else if (entry.name.endsWith('.schema.json')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Determine output path for a schema file.
 */
function getOutputPath(schemaPath) {
  const relPath = relative(SCHEMAS_DIR, schemaPath);
  const tsPath = relPath.replace('.schema.json', '.ts');
  return join(OUTPUT_DIR, tsPath);
}

/**
 * Main generation function.
 */
async function main() {
  console.log(`${isCheckMode ? 'Checking' : 'Generating'} TypeScript types from JSON schemas...`);
  console.log(`  Schemas: ${SCHEMAS_DIR}`);
  console.log(`  Output: ${OUTPUT_DIR}`);

  // Find all schema files
  const schemaFiles = await getSchemaFiles(SCHEMAS_DIR);

  if (schemaFiles.length === 0) {
    console.error('No schema files found!');
    process.exit(1);
  }

  console.log(`  Found ${schemaFiles.length} schema files`);

  let hasChanges = false;
  const results = [];

  // Compile each schema
  for (const schemaPath of schemaFiles) {
    const outputPath = getOutputPath(schemaPath);
    const relSchema = relative(SCHEMAS_DIR, schemaPath);

    try {
      const ts = await compileSchema(schemaPath, outputPath);

      if (isCheckMode) {
        // Check if file exists and matches
        if (existsSync(outputPath)) {
          const existing = await readFile(outputPath, 'utf-8');
          if (existing !== ts) {
            console.log(`  CHANGED: ${relSchema}`);
            hasChanges = true;
          } else {
            console.log(`  OK: ${relSchema}`);
          }
        } else {
          console.log(`  MISSING: ${relSchema}`);
          hasChanges = true;
        }
      } else {
        // Create output directory and write file
        await mkdir(dirname(outputPath), { recursive: true });
        await writeFile(outputPath, ts);
        console.log(`  Generated: ${relative(OUTPUT_DIR, outputPath)}`);
      }

      results.push({ schemaPath, outputPath, success: true });
    } catch (error) {
      results.push({ schemaPath, outputPath, success: false, error });
    }
  }

  // Generate index.ts that re-exports all types
  const indexContent = await generateIndex(results.filter(r => r.success));
  const indexPath = join(OUTPUT_DIR, 'index.ts');
  if (isCheckMode) {
    if (existsSync(indexPath)) {
      const existing = await readFile(indexPath, 'utf-8');
      if (existing !== indexContent) {
        console.log('  CHANGED: index.ts');
        hasChanges = true;
      } else {
        console.log('  OK: index.ts');
      }
    } else {
      console.log('  MISSING: index.ts');
      hasChanges = true;
    }
  } else {
    await writeFile(indexPath, indexContent);
    console.log(`  Generated: index.ts`);
  }

  // Summary
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nSummary: ${successful} succeeded, ${failed} failed`);

  if (failed > 0) {
    console.error('\nFailed schemas:');
    for (const r of results.filter(r => !r.success)) {
      console.error(`  ${relative(SCHEMAS_DIR, r.schemaPath)}: ${r.error.message}`);
    }
    process.exit(1);
  }

  if (isCheckMode && hasChanges) {
    console.error('\nGenerated types are out of date. Run "pnpm codegen" to update.');
    process.exit(1);
  }

  console.log('\nDone!');
}

/**
 * Extract the names exported by a generated TypeScript module.
 * Matches top-level `export interface/type/enum/const/class/function Name`.
 */
function extractExportedNames(source) {
  const names = [];
  const re = /^export\s+(?:declare\s+)?(?:interface|type|enum|const|class|function)\s+([A-Za-z0-9_$]+)/gm;
  let match;
  while ((match = re.exec(source)) !== null) {
    names.push(match[1]);
  }
  return names;
}

/**
 * Generate index.ts content that re-exports all types.
 *
 * Several schemas reference the shared tick.schema.json (and others), so
 * `declareExternallyReferenced` makes the same type name (e.g. `Tick`,
 * `Activity`) appear in multiple generated modules. A naive `export *` barrel
 * then produces TS2308 "already exported a member" ambiguity errors. To keep
 * regeneration deterministic and tsc-clean, the first module (in schema-file
 * order) to export a given name wins via `export *`; later modules re-export
 * only their non-conflicting names explicitly.
 */
async function generateIndex(results) {
  const lines = [
    '/* eslint-disable */',
    '/**',
    ' * AUTO-GENERATED FILE - DO NOT EDIT',
    ' * Re-exports all generated types.',
    ' * Run \'pnpm codegen\' to regenerate.',
    ' */',
    '',
  ];

  const claimed = new Set();

  for (const { outputPath } of results) {
    const relPath = './' + relative(OUTPUT_DIR, outputPath).replace(/\.ts$/, '.js');
    const source = await readFile(outputPath, 'utf-8');
    const names = extractExportedNames(source);

    const conflicts = names.filter((n) => claimed.has(n));

    if (conflicts.length === 0) {
      // No collisions: re-export everything and claim all names.
      lines.push(`export * from '${relPath}';`);
      for (const n of names) claimed.add(n);
    } else {
      // Some names already exported by an earlier module. Re-export only the
      // names this module introduces, so the barrel stays unambiguous.
      const fresh = names.filter((n) => !claimed.has(n));
      if (fresh.length > 0) {
        lines.push(`export { ${fresh.join(', ')} } from '${relPath}';`);
        for (const n of fresh) claimed.add(n);
      } else {
        lines.push(`// (all exports of ${relPath} already re-exported above)`);
      }
    }
  }

  lines.push('');
  return lines.join('\n');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
