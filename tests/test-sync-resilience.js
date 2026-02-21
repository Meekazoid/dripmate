/**
 * Test suite for frontend sync resilience helpers
 * - normalization defaults (feedback / feedbackHistory)
 * - deduplication behavior
 * - feedback history rendering guard for missing history
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const stateCode = fs.readFileSync(path.join(rootDir, 'js/state.js'), 'utf8');

function extractFunction(code, functionName) {
  const rgx = new RegExp(`export function ${functionName}\\([^)]*\\) \\{[\\s\\S]*?\\n\\}`, 'm');
  const match = code.match(rgx);
  if (!match) {
    throw new Error(`Could not find function ${functionName}`);
  }
  return match[0].replace('export ', '');
}

const needed = ['createStableCoffeeId', 'normalizeCoffeeRecord', 'dedupeCoffees'];
const bundledFunctions = needed.map(name => extractFunction(stateCode, name)).join('\n\n');
eval(bundledFunctions);

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run() {
  console.log('=== Sync Resilience Tests ===\n');

  let passed = 0;

  // normalize defaults
  const normalized = normalizeCoffeeRecord({ name: 'Test Coffee', feedback: null, feedbackHistory: null });
  assert(typeof normalized.id === 'string' && normalized.id.startsWith('coffee-'), 'normalizeCoffeeRecord should create stable id');
  assert(typeof normalized.feedback === 'object' && !Array.isArray(normalized.feedback), 'feedback should default to object');
  assert(Array.isArray(normalized.feedbackHistory), 'feedbackHistory should default to array');
  console.log(`${GREEN}✓${RESET} normalizeCoffeeRecord adds defaults and id`);
  passed++;

  // dedupe by id
  const byId = dedupeCoffees([
    { id: 'coffee-1', name: 'A' },
    { id: 'coffee-1', name: 'A duplicate' },
    { id: 'coffee-2', name: 'B' }
  ], 'test');
  assert(byId.length === 2, 'dedupeCoffees should remove duplicates by id');
  console.log(`${GREEN}✓${RESET} dedupeCoffees removes duplicates by id`);
  passed++;

  // fallback-key dedupe if id missing
  const byFallback = dedupeCoffees([
    { name: 'A', roaster: 'R', origin: 'O', addedDate: '2024-01-01T00:00:00.000Z' },
    { name: 'A', roaster: 'R', origin: 'O', addedDate: '2024-01-01T00:00:00.000Z' },
    { name: 'B', roaster: 'R2', origin: 'O2', addedDate: '2024-01-02T00:00:00.000Z' }
  ], 'test');
  assert(byFallback.length === 2, 'dedupeCoffees should remove duplicates by fallback key');
  console.log(`${GREEN}✓${RESET} dedupeCoffees removes duplicates by fallback key`);
  passed++;

  // history rendering guard (code-level behavior)
  const feedbackCode = fs.readFileSync(path.join(rootDir, 'js/feedback.js'), 'utf8');
  assert(
    /const history = Array\.isArray\(coffee\.feedbackHistory\) \? coffee\.feedbackHistory : \[\];/.test(feedbackCode),
    'openFeedbackHistory should guard against missing feedbackHistory'
  );
  console.log(`${GREEN}✓${RESET} feedback history rendering guards missing/empty history`);
  passed++;

  console.log(`\n${GREEN}All ${passed} sync resilience tests passed!${RESET}`);
}

try {
  run();
} catch (error) {
  console.error(`${RED}✗ Test failure:${RESET}`, error.message);
  process.exit(1);
}
