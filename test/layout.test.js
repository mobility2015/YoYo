import assert from 'node:assert/strict';
import test from 'node:test';
import { organization } from '../src/data/organization.js';
import { layoutOrganization } from '../src/org/layout.js';

const laid = layoutOrganization(organization);

test('every node sits on its ring radius', () => {
  for (const node of laid) {
    const ring = organization.rings.find((item) => item.id === node.ring);
    const distance = Math.hypot(node.x, node.y);
    assert.ok(Math.abs(distance - ring.radius) < 1e-9, node.id);
    assert.ok(node.x >= -1 && node.x <= 1 && node.y >= -1 && node.y <= 1);
  }
});

test('the first outer node is anchored at the top of the circle', () => {
  const chairman = laid.find((node) => node.id === 'chairman');
  assert.ok(Math.abs(chairman.angle - Math.PI / 2) < 1e-9);
  assert.ok(chairman.y > 0.2 && Math.abs(chairman.x) < 1e-9);
});

test('children stay inside the parent wedge and on an outer ring', () => {
  const byId = new Map(laid.map((node) => [node.id, node]));
  for (const node of laid) {
    if (!node.parent) continue;
    const parent = byId.get(node.parent);
    assert.ok(node.radius > parent.radius);
    assert.ok(node.angle >= parent.angleStart - 1e-9);
    assert.ok(node.angle <= parent.angleEnd + 1e-9);
  }
});

test('the board stays at the center', () => {
  const board = laid.find((node) => node.id === 'board');
  assert.ok(Math.abs(board.x) < 1e-9);
  assert.ok(Math.abs(board.y) < 1e-9);
});
