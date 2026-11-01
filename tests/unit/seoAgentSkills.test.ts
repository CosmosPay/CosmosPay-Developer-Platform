import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_SKILLS_INDEX_PATH,
  AGENT_SKILLS_SCHEMA,
  COSMOS_PAY_SKILL,
  COSMOS_PAY_SKILL_COMMIT,
  agentSkillsIndex,
} from '@/lib/seo/agent-skills';

test('the index is an Agent Skills Discovery v0.2.0 document at its well-known path', () => {
  assert.equal(AGENT_SKILLS_INDEX_PATH, '/.well-known/agent-skills/index.json');
  const index = agentSkillsIndex();
  assert.equal(index.$schema, 'https://schemas.agentskills.io/discovery/0.2.0/schema.json');
  assert.equal(index.$schema, AGENT_SKILLS_SCHEMA);
  assert.deepEqual(Object.keys(index), ['$schema', 'skills']);
  assert.deepEqual(index.skills, [COSMOS_PAY_SKILL]);
  // It survives JSON as it is served.
  assert.deepEqual(JSON.parse(JSON.stringify(index)), index);
});

test('every entry has the fields the draft requires, in their shapes', () => {
  for (const skill of agentSkillsIndex().skills) {
    assert.deepEqual(Object.keys(skill).sort(), ['description', 'digest', 'name', 'type', 'url']);
    assert.match(skill.name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
    assert.ok(skill.name.length >= 1 && skill.name.length <= 64);
    assert.ok(skill.type === 'skill-md' || skill.type === 'archive');
    assert.ok(skill.description.length > 0 && skill.description.length <= 1024);
    assert.match(skill.digest, /^sha256:[0-9a-f]{64}$/);
    assert.doesNotThrow(() => new URL(skill.url, 'https://cosmospay.lat/.well-known/agent-skills/index.json'));
    assert.doesNotMatch(JSON.stringify(skill), /\u2014/);
  }
});

test('the Cosmos Pay skill is the public repository SKILL.md at a pinned commit, named as its frontmatter names it', () => {
  assert.match(COSMOS_PAY_SKILL_COMMIT, /^[0-9a-f]{40}$/);
  assert.equal(COSMOS_PAY_SKILL.url, `https://raw.githubusercontent.com/CosmosPay/CosmosPay-Skill/${COSMOS_PAY_SKILL_COMMIT}/SKILL.md`);
  assert.equal(COSMOS_PAY_SKILL.type, 'skill-md');
  // The frontmatter of SKILL.md at that commit, word for word.
  assert.equal(COSMOS_PAY_SKILL.name, 'cosmospay');
  assert.ok(COSMOS_PAY_SKILL.description.startsWith('Integrate Cosmos Pay, a stablecoin payments API with hosted checkout'));
  assert.ok(COSMOS_PAY_SKILL.description.endsWith('Covers the @cosmosapp/pay_sdk SDK and the Payments REST API.'));
});
