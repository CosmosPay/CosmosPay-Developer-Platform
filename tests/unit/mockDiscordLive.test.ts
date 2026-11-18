/* mockDiscordLive.test.ts: when mock mode links Discord for real (src/lib/mock/discord-live.ts).
   Only with every setting and a real key, in that key's environment, and back to localhost on the
   mock's own port. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { mockDiscordLive } from '@/lib/mock/discord-live';

const ENV = {
  DISCORD_CLIENT_ID: '1572555277343916113',
  DISCORD_CLIENT_SECRET: 'client-secret',
  DISCORD_BOT_LINK_SECRET: 'link-secret-shared-with-the-bot-0123456789',
  COSMOS_MOCK_DISCORD_KEY: 'dv_0123456789abcdef',
  PUBLIC_BETTER_AUTH_URL: 'http://dev.cosmospay.localhost:4330',
};

test('a sandbox key links in the sandbox, back to localhost on the mock port', () => {
  const live = mockDiscordLive(ENV);
  assert.ok(live);
  assert.equal(live.environment, 'dev');
  assert.equal(live.apiKey, ENV.COSMOS_MOCK_DISCORD_KEY);
  assert.equal(live.config.redirectUri, 'http://localhost:4330/api/integrations/discord/callback');
  assert.equal(live.config.botUrl, 'http://127.0.0.1:3800');
});

test('a production key links in production', () => {
  assert.equal(mockDiscordLive({ ...ENV, COSMOS_MOCK_DISCORD_KEY: 'prod_0123456789abcdef' })?.environment, 'prod');
});

test('off without a real key or any setting', () => {
  assert.equal(mockDiscordLive({ ...ENV, COSMOS_MOCK_DISCORD_KEY: undefined }), null);
  assert.equal(mockDiscordLive({ ...ENV, COSMOS_MOCK_DISCORD_KEY: 'sk_live_whatever' }), null);
  assert.equal(mockDiscordLive({ ...ENV, DISCORD_CLIENT_SECRET: '' }), null);
  assert.equal(mockDiscordLive({ ...ENV, DISCORD_BOT_LINK_SECRET: 'short' }), null);
  assert.equal(mockDiscordLive({ ...ENV, PUBLIC_BETTER_AUTH_URL: undefined }), null);
});
