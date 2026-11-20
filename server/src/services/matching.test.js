import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateMatch } from './matching.js';

test('similar lost and found items score highly and explain the overlap', () => {
  const result = calculateMatch(
    { title: 'Black scientific calculator', category: 'Electronics', color: 'Black', locationName: 'Engineering Hall', eventDate: '2026-11-18', description: 'Scratched calculator case' },
    { title: 'Scientific calculator', category: 'Electronics', color: 'Black', locationName: 'Engineering Hall', eventDate: '2026-11-18', description: 'Calculator found after class' }
  );
  assert.ok(result.score >= 80);
  assert.ok(result.characteristics.includes('Category'));
  assert.ok(result.characteristics.includes('Location'));
});

test('distant, unrelated reports do not receive a strong score', () => {
  const result = calculateMatch(
    { title: 'Blue notebook', category: 'Books', color: 'Blue', locationName: 'Library', eventDate: '2026-10-01', description: 'Lined pages' },
    { title: 'Silver keychain', category: 'Keys', color: 'Silver', locationName: 'Sports field', eventDate: '2026-11-19', description: 'Three metal keys' }
  );
  assert.ok(result.score < 30);
});
