/* auth-md.ts: /auth.md on every domain, the file that tells an AI agent how to authenticate with
   Cosmos Pay (the auth.md convention, https://github.com/workos/auth.md: Markdown at the service
   root whose H1 names auth.md). Cosmos Pay publishes no OAuth metadata and has no agent
   registration, so the file is self-contained, as the convention asks then: who it is for, where
   credentials come from, the methods and how each credential is used. It says plainly that there
   is no OAuth flow for agents.

   Every statement is what the code does, checked against this repository and the community
   server (the Payments API): the gateway's key-auth takes `Authorization: Bearer <key>`
   (src/utils/apisix.ts); keys are minted by the platform for a signed-in member allowed to create
   them (src/pages/api/api-keys/index.ts), `dv_` for the test environment and `prod_` for
   production (generateApiKey), each with its `resource:action` scopes or the admin role
   (src/schemas/api-keys/request.ts); sign-in is Authentik's (src/lib/auth.ts); the shared public
   key comes from the keyless `GET /v1/public-key` and reaches only the operations the server marks
   `x-cosmos-public-key` (its PublicKeyGuard answers 403 elsewhere), a swap, cross-chain swap or
   USDT0 transfer it creates answers a `publicToken` read back through `X-Record-Token` (404
   without it), and its swap rate is the community plan's (src/lib/public-key.ts, plans.ts); a
   webhook is signed `t=<seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">` in `X-Cosmos-Signature`
   (the server's webhook-signature.ts). The docs pages linked exist. No em dashes. Pure, so
   tests/unit/seoAuthMd.test.ts covers it. */
import { swapFeePct } from "@/lib/plans";
import { pageUrl } from "@/lib/seo/lang-urls";
import { docsLink, docsRoot, normalizeOrigin } from "@/lib/urls";
import { AGENT_SKILLS_INDEX_PATH, COSMOS_PAY_SKILL_REPO } from "@/lib/seo/agent-skills";

export interface AuthMdInput {
  site: string;
  dev: string;
  payments: string;
  /** The Payments API's gateway entry, without the version: https://api.cosmospay.lat/cosmos-api */
  apiBase: string;
  /** The company's public address. */
  contact: string;
}

/** The file every domain serves at /auth.md. */
export function authMd({ site, dev, payments, apiBase, contact }: AuthMdInput): string {
  const api = `${normalizeOrigin(apiBase)}/v1`;
  const docs = docsRoot(dev);
  const doc = (path: string) => docsLink(docs, path);
  return `# Cosmos Pay auth.md

How an AI agent authenticates with Cosmos Pay. For agents, and the developers who run them, that call the Cosmos Pay Payments API (${api}) for a business with a Cosmos Pay account, or with no account at all for public operations such as swaps.

Cosmos Pay has no OAuth or OpenID Connect flow for agents today: no agent registration, no authorization server or protected resource metadata, no client registration and no token exchange. An agent authenticates with an API key that a person created for it, or with the shared public key for the operations open to everyone. Both go in the same header:

\`\`\`http
Authorization: Bearer <API key>
\`\`\`

## Method 1: an API key from the dashboard

1. A person creates the key. They sign in to the developer platform at ${dev} (sign-in goes through Authentik, Cosmos Pay's identity provider), open the organization the key will act for and create it under API keys; that takes the organization's permission to create keys. Nothing issues a key to an agent on its own.
2. Never ask a person for their password, a sign-in code or their session, and never sign in for them. Ask them to create a key with the scopes your task needs and to hand it to you through a secret store or an environment variable.
3. The prefix names the network: \`dv_\` keys are test keys (Stellar testnet, Solana devnet, Monad testnet) and \`prod_\` keys are live keys (mainnet). The key decides the network, not the request.
4. Each key carries its own scopes, \`resource:action\` (for example \`payments:read\` and \`payments:write\`), or the admin role, which skips the scope check. Ask for the fewest scopes the task needs.
5. The full key is shown once, when it is created (and again when it is rotated). Keep it on a server: never in a browser, a URL, a log or a reply.

A request without a valid key is refused at the gateway with 401. A key without the scope an operation requires gets 403 \`insufficient_scope\`.

## Method 2: the shared public key (no account)

\`\`\`http
GET ${api}/public-key?env=prod
\`\`\`

needs no key and answers \`{ "env": "prod", "apiKey": "<key>" }\`; \`env=dev\`, the default, gives the testnet key. Every caller without an account shares this key: it is not a secret and identifies no one. Send it as \`Authorization: Bearer <key>\`.

- It reaches only the operations the OpenAPI document marks \`x-cosmos-public-key: true\`, such as quoting and creating a swap (on one network or between networks) or a USDT0 transfer out of Stellar. Any other operation answers 403.
- A swap, a cross-chain swap or a USDT0 transfer created with it answers a \`publicToken\` that only its creator holds. Send it as \`X-Record-Token\` to read that record or act on it: a read without it, or with another record's token, answers 404. The key lists no records.
- Its swaps pay the public commission, ${swapFeePct("community")} per swap ([plans and rates](${pageUrl(site, "/pricing")})).
- It signs nothing: Cosmos Pay builds an unsigned transaction and the wallet that holds the funds signs it.

## Webhooks: Cosmos Pay calling you

Every delivery to a webhook endpoint carries \`X-Cosmos-Signature: t=<unix seconds>,v1=<hex>\`, the hex being the HMAC-SHA256 of \`<t>.<raw body>\` keyed with the endpoint's secret (\`whsec_...\`, shown once, when the endpoint is registered or its secret rotated). Recompute it over the raw body and compare it in constant time before trusting an event, or let the SDK's \`Webhooks.verify\` check it.

## Other tokens in the OpenAPI document

Stellar SEP-10 web authentication and SEP-30 account recovery (\`/v1/sep10/*\`, \`/v1/sep30/*\`) issue their own bearer tokens to Stellar wallets, as those standards define. They do not open the rest of the Payments API.

## References

- [Get an API key](${doc("/api-keys")})
- [Authentication](${doc("/sdk/server/authentication")})
- [The shared public key](${doc("/api/public-key")})
- [Webhooks and their signatures](${doc("/sdk/server/webhooks")})
- [OpenAPI document](${doc("/openapi.json")})
- [API catalog](${site}/.well-known/api-catalog)
- llms.txt: [company](${site}/llms.txt), [payments](${payments}/llms.txt), [documentation](${doc("/llms.txt")})
- [Cosmos Pay agent skill](${COSMOS_PAY_SKILL_REPO}), listed in [the skills index](${site}${AGENT_SKILLS_INDEX_PATH})
- Contact: ${contact}
`;
}
