/* export-wallet-data.mjs — dump the RETIRED wallet sign-in and recovery tables to JSON, so the
   community server can import them before those tables are dropped here.

   WHY IT EXISTS. The wallet's own sign-in and SEP-30 account recovery moved to the community
   server (its src/wallet-auth/ and src/recovery/), and the code that served them from this
   platform was deleted. The data was not: `wallet_backup` holds the encrypted seeds people
   restore their wallets from — this platform can never open them, and for some wallets a
   row there is the ONLY copy — and `recovery_account` / `recovery_auth_method` record which
   inbox may ask each recovery server to co-sign a new key onto an account. Dropping either
   before the import lands loses wallets and recoverability with no way back. So the Prisma
   models stay (marked RETIRED in prisma/schema.prisma) until this has been run and its output
   imported; only then does a later migration drop them.

   WHAT IT WRITES. One JSON file, shaped exactly as the community server's importer reads it:

     { "exportedAt": ISO,
       "walletBackups":    [{ email, name, stellarAddress, box, updatedAt }],
       "recoveryAccounts": [{ role, address, network, createdAt,
                              methods: [{ identityRole, type: "email", value }] }] }

   `walletBackups` joins each backup to its User for the email the sign-in looks it up by
   (lowercased, since that is how the other side compares it). `box` is copied byte for byte:
   it is the wallet's own sealed JSON and nothing here can check it opens.
   `wallet_auth_handshake` and `wallet_login_code` are NOT exported — both are short-lived
   (minutes), so every row in them has already expired and there is nothing to carry over.
   Only `email` recovery methods are exported, because email is the only method the community
   server registers; any other method is counted and reported, not silently dropped, so an
   operator can see what the import will not restore.

   WHAT IT DOES NOT DO. It writes nothing to the database and deletes nothing. Run it as often
   as you like; the output is a snapshot. The file holds encrypted seeds and email addresses:
   treat it as a secret, move it over a private channel, and delete it after the import.

   Run:  npm run export:wallet-data [-- <output.json>]   (default: wallet-data-export.json)
   Needs DATABASE_URL (read from .env) and a generated client (`npm run db:generate`). */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
// The same client and driver adapter src/lib/prisma.ts builds, minus astro:env: this runs
// under plain Node, so the connection string comes from .env via dotenv instead.
import { PrismaClient } from "../generated/prisma/client.ts";

const out = resolve(process.argv[2] || "wallet-data-export.json");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (checked the environment and .env).");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

/* The values the stored rows use, plus the one bucket the export format allows for anything
   else — reported, because an account on an unrecognised network is one the importer may not
   be able to serve. */
const NETWORKS = new Set(["public", "testnet"]);

try {
  const backups = await prisma.walletBackup.findMany({
    include: { user: { select: { email: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  let backupsWithoutEmail = 0;
  const walletBackups = [];
  for (const b of backups) {
    const email = b.user?.email?.trim().toLowerCase();
    // A backup is found by its owner's email; one with none could never be restored anyway.
    if (!email) {
      backupsWithoutEmail++;
      continue;
    }
    walletBackups.push({
      email,
      name: b.user.name ?? null,
      stellarAddress: b.stellarAddress,
      box: b.box,
      updatedAt: b.updatedAt.toISOString(),
    });
  }

  const accounts = await prisma.recoveryAccount.findMany({
    include: { methods: { orderBy: { createdAt: "asc" } } },
    orderBy: { createdAt: "asc" },
  });

  let skippedMethods = 0;
  let otherNetworks = 0;
  const recoveryAccounts = accounts.map((a) => {
    const methods = [];
    for (const m of a.methods) {
      if (m.type !== "email") {
        skippedMethods++;
        continue;
      }
      methods.push({ identityRole: m.identityRole, type: "email", value: m.value.trim().toLowerCase() });
    }
    const network = NETWORKS.has(a.network) ? a.network : "other";
    if (network === "other") otherNetworks++;
    return { role: a.role, address: a.address, network, createdAt: a.createdAt.toISOString(), methods };
  });

  const payload = { exportedAt: new Date().toISOString(), walletBackups, recoveryAccounts };
  writeFileSync(out, `${JSON.stringify(payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });

  console.log(`Wrote ${out}`);
  console.log(`  wallet backups:     ${walletBackups.length}`);
  console.log(`  recovery accounts:  ${recoveryAccounts.length}`);
  console.log(`  email methods:      ${recoveryAccounts.reduce((n, a) => n + a.methods.length, 0)}`);
  console.log(`  skipped non-email recovery methods: ${skippedMethods}`);
  if (backupsWithoutEmail) console.warn(`  ! skipped ${backupsWithoutEmail} backup(s) whose user has no email`);
  if (otherNetworks) console.warn(`  ! ${otherNetworks} recovery account(s) on an unrecognised network, exported as "other"`);
  const noMethods = recoveryAccounts.filter((a) => a.methods.length === 0).length;
  if (noMethods) console.warn(`  ! ${noMethods} recovery account(s) with no email method left after filtering`);
} catch (err) {
  console.error(`Export failed: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
