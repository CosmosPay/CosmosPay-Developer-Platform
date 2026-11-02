/* agent-skills.ts: /.well-known/agent-skills/index.json on every domain, the Agent Skills
   Discovery index (https://github.com/cloudflare/agent-skills-discovery-rfc, draft v0.2.0: the
   version Cloudflare's Agent Readiness check and isitagentready.com read; v0.1.0's
   /.well-known/skills/ path is the legacy one). It lists the public Cosmos Pay agent skill,
   github.com/CosmosPay/CosmosPay-Skill, as one `skill-md` entry.

   The entry points at the skill's SKILL.md on raw.githubusercontent.com at a pinned commit, so the
   bytes behind `url` never change and `digest` (the SHA-256 of exactly those bytes, which clients
   check before using the file) stays true; its relative links (references/*.md) resolve at the
   same commit. `name` and `description` are the SKILL.md frontmatter's, word for word, as the RFC
   asks. When the skill changes, move all four together: the commit, the digest of the SKILL.md at
   that commit, and the frontmatter's name and description:

     sha=$(gh api repos/CosmosPay/CosmosPay-Skill/commits/main --jq .sha)
     curl -s https://raw.githubusercontent.com/CosmosPay/CosmosPay-Skill/$sha/SKILL.md | sha256sum

   Pure, so tests/unit/seoAgentSkills.test.ts covers it. */

/** The `$schema` of a v0.2.0 index: an identifier clients match, not necessarily a fetchable URL. */
export const AGENT_SKILLS_SCHEMA = "https://schemas.agentskills.io/discovery/0.2.0/schema.json";

/** Where the index lives on every domain. */
export const AGENT_SKILLS_INDEX_PATH = "/.well-known/agent-skills/index.json";

export interface AgentSkillEntry {
  /** 1 to 64 characters: lowercase letters, digits and single hyphens. */
  name: string;
  type: "skill-md" | "archive";
  /** What the skill does and when to use it, at most 1024 characters. */
  description: string;
  url: string;
  /** `sha256:` and the 64 lowercase hex digits of the artifact's bytes. */
  digest: string;
}

export interface AgentSkillsIndex {
  $schema: string;
  skills: AgentSkillEntry[];
}

/** The skill's public repository. */
export const COSMOS_PAY_SKILL_REPO = "https://github.com/CosmosPay/CosmosPay-Skill";

/** The commit of CosmosPay/CosmosPay-Skill the index points at (main on 2026-11-02, matching pay_sdk 2.3). */
export const COSMOS_PAY_SKILL_COMMIT = "e9fe2cf80b9e0f8d27287f8afefa6501d49ac2f8";

/** The public Cosmos Pay skill: its SKILL.md frontmatter's name and description, that file's
 *  address at the pinned commit and the SHA-256 of its bytes there. */
export const COSMOS_PAY_SKILL: AgentSkillEntry = {
  name: "cosmospay",
  type: "skill-md",
  description:
    "Integrate Cosmos Pay, a stablecoin payments API with hosted checkout, payment links, webhooks, swaps and a non-custodial wallet, on Stellar, Solana and Monad. Use when a JavaScript/TypeScript or REST integration must accept crypto or stablecoin (USDC) payments, create payment intents or payment links, embed a pay button or checkout, verify signed webhooks, swap assets on one chain or across chains, send USDT0 from Stellar to EVM networks, create private (amount-hidden) payments, or run fiat on/off-ramps. Covers the @cosmosapp/pay_sdk SDK (2.3) and the Payments REST API.",
  url: `https://raw.githubusercontent.com/CosmosPay/CosmosPay-Skill/${COSMOS_PAY_SKILL_COMMIT}/SKILL.md`,
  digest: "sha256:44fb790526c4a55bcac7d9a66fb27a0147db54d0e8713840c8eecb86ff4debbf",
};

/** The index every domain serves. */
export function agentSkillsIndex(skills: AgentSkillEntry[] = [COSMOS_PAY_SKILL]): AgentSkillsIndex {
  return { $schema: AGENT_SKILLS_SCHEMA, skills };
}
