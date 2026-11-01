# Cosmos Pay Privacy Policy: draft for legal review

> **DRAFT. NOT IN EFFECT. DO NOT PUBLISH.**
> This file is a working draft for counsel and the product owner. It is not a page of any Cosmos
> Pay site, it is not in any sitemap and nothing links to it. It must not go live until the
> product owner approves it after legal review.

## How to read this draft

- **Part 1 is the proposed policy text.** Every factual statement in it is drawn from what the
  code does today; Appendix A gives the file for each one, so a reviewer can check it.
- **Square brackets are placeholders** (`[LEGAL ENTITY]`, `[RETENTION: ...]`). The code does not
  answer them; the product owner or counsel must. Appendix C lists all of them.
- **`[VERIFY: ...]`** marks a fact that depends on configuration outside the code (a dashboard
  setting, a server file, a contract). Someone with access must confirm it before publication.
- **"Note for counsel"** blocks are questions, not text for publication. They name topics
  (Argentina's Law 25.326, the GDPR, Brazil's LGPD and others) without drawing legal conclusions.
- **Snapshot.** Inventoried on 2026-11-01 from these commits (branch `dev` of each repository):

| Repository | Commit | Version |
| :--- | :--- | :--- |
| CosmosPay-Developer-Platform (this repository: company site, developer platform, payments site) | `da7aa90` | v0.14.0 |
| CosmosPay-Community-Server (the Payments API, wallet sign-in, account recovery) | `1f64640` | v1.8.3 |
| CosmosPay-Wallet (mobile app, web app, browser extension) | `fc0f558` | v1.15.0 |

A later change to any of them can make a statement here false. Re-run the inventory before
publishing.

---

## Part 1. Proposed policy text

**Cosmos Pay Privacy Policy**

Last updated: [EFFECTIVE DATE]

### 1. Who we are and what this policy covers

This policy explains what personal data [LEGAL ENTITY] ("Cosmos Pay", "we"), [REGISTRATION
NUMBER], with its address at [ADDRESS], collects when you use Cosmos Pay, why, who receives it and
how long it is kept. For questions or requests about your data, write to [DPO/CONTACT].

It covers:

- **The company site**, `cosmospay.lat`.
- **The developer platform**, `dev.cosmospay.lat`: sign-in, the dashboard and the documentation.
- **The payments site**, `payments.cosmospay.lat`: the hosted checkout, the payment pages and the
  contact form.
- **The Payments API**, `api.cosmospay.lat`, including wallet sign-in, encrypted backups and
  account recovery.
- **The Cosmos Pay Wallet**: web app, browser extension, desktop app and mobile apps.

> Note for counsel: when a business uses Cosmos Pay to accept payments, data about its customers
> and payers is entered by that business. Whether Cosmos Pay acts for that data on the business's
> behalf, or on its own account, is [CONTROLLER/PROCESSOR ROLE]. Section 3.3 is written neutrally
> until that is decided.

### 2. The short version

- **The wallet is non-custodial.** Your recovery phrase and keys are created and encrypted on your
  device, and your password never leaves it. If you turn on cloud backup with email recovery,
  read section 3.8.3: it explains exactly who can open that backup.
- **To use the developer platform you sign in** through our own identity service. We keep your
  name, email, sessions (with IP address and browser), and the place you last signed in from.
- **The data you or your business enter** (customers, payments, webhooks) is stored so the service
  can work. Payments themselves are recorded on public blockchains, which nobody can erase.
- **Identity verification for fiat services** is done with our partner BlindPay. We keep a copy
  of what you submit (section 3.7).
- **The company site and some platform pages use Google Analytics.** The payments site, the
  documentation and the wallet do not.
- **The wallet's diagnostics are off unless you turn them on.**

### 3. What we collect and why

#### 3.1 Visiting our websites

- **Every request** to our sites and APIs passes through Cloudflare, which protects and delivers
  them. Cloudflare passes your IP address and country to our servers (and region and city, if
  that Cloudflare setting is on [VERIFY]); our servers can also look up an approximate region and
  city in a geolocation database kept on our own servers. Nothing is sent to an outside
  geolocation service.
- **Your language and theme** are remembered in your browser (section 4).
- **Google Analytics** is loaded on the company site (home, About, Pricing, Swaps, Terms) and on
  these platform pages: dashboard, onboarding, invitations, the identity-verification return page
  and the API reference. It records page views with the information Google's tag collects (such
  as your IP address, browser, device and the address of each page you open) and sets Google's
  cookies. A page's address can contain identifiers: the invitation page's address holds the
  invitation's token, the identity-verification return page's holds organization and record ids,
  and the dashboard writes search terms and filters into its address. We send Google no account
  identifier and no custom events. [VERIFY: Google Analytics property settings:
  data retention, Google signals, enhanced measurement, data sharing]
- **The payments site and the documentation** do not load Google Analytics.
- **Images from other services:** the dashboard's identity-verification form shows country flags
  from `flagcdn.com`, which sees your IP address.

#### 3.2 Your developer platform account

**Signing in.** You sign in through Authentik, an identity service we run ourselves at
`auth.cosmospay.lat`. Authentik keeps the account you create there (your email, name and
password, or the Google or GitHub account you sign in with). [VERIFY: what Authentik stores and
for how long, including its event log] When you sign in, Authentik gives the developer platform
your user identifier, your email, whether that email is verified, your name and your profile
picture.

**What the platform stores about you:**

- **Account:** name, email, whether the email is verified, profile picture, and the sign-in tokens
  Authentik issued.
- **Sessions:** a session token, its expiry, and the IP address and browser (user agent) it was
  opened from. A session lasts 7 days and is extended while you use it.
- **Profile:** display name, bio and avatar if you set them; language, theme, your plan and its
  status, your role; the country and region you first signed in from.
- **Sign-in location:** for each new session, the IP address, country, region and time. A "New
  sign-in" notice in your account also records the city, your browser and the IP address.
- **Last activity:** the time you last used the platform, updated at most every two minutes.
- **Activity notices:** when you create, rotate or delete API keys, create payments, swaps or
  liquidity operations, a notice records what happened, from which IP address, place and browser.
- **Dashboard usage:** the dashboard reports the views you open, the actions you take and errors
  it hits. It does not report what you type, form values, API keys or address parameters. These
  events are linked to your account and stored with the Payments API (section 3.10).

We use this to let you sign in, keep your account secure (you can see where your account was used
from), provide support and fix problems.

**Organizations.** When you create an organization we store its name and, if you answer them, the
onboarding questions (industry, goals, expected volume). For members we store their role and
permissions. To invite someone we store their email, the role offered and who invited them, and
we email them a link that works for 3 days. Wallets an organization connects to receive payments
are stored with their network, address, label and the wallet app that proved them.

**API keys.** We generate your API keys and store them in our API gateway, together with their
name, description, permissions, environment and organization. We show a key's secret once, when
it is created.

**Support.** Your tickets and messages are stored and read by our support staff.

**Staff access.** A small number of Cosmos Pay staff accounts can see the list of accounts (name,
email, plan, last activity) and, to operate the service, the records of every organization on the
Payments API (customers, payments, swaps, identity-verification records, pay-ins and payouts).
Each of those reads is recorded in an audit log.

#### 3.3 Data you or your business enter into the Payments API

To run payments for you, the Payments API stores what you send it, under your account:

- **Customers:** name, alias, email, notes, a reference, and their wallet addresses. When a payment
  succeeds, the payer's wallet address is added as a customer automatically.
- **Products, payment links and payment requests:** amounts, assets, destination and payer
  addresses, memos, messages and references you write, transaction data, and when the payer
  opened the checkout, opened their wallet, closed it or sent the payment.
- **Swaps, cross-chain swaps, liquidity operations, USDT0 transfers, yield operations and private
  payments:** the addresses, amounts and transaction identifiers involved.
- **Payment aliases:** a handle linked to wallet addresses, and an email for recovering the alias.
  Aliases form a public directory: anyone using the API can look up a handle's addresses, or an
  address's handles.
- **Webhooks:** the address you want events sent to and its signing secret. Each delivery stores
  the event as sent; for payments, swaps and liquidity operations the event carries the full
  record. We send these events to the address you choose.

For **private payments**, amounts are hidden on the blockchain, but Cosmos Pay holds the auditor
key of the token it operates and can read the amounts.

#### 3.4 Paying through a Cosmos Pay checkout

When you pay a business through our hosted checkout, your browser reads the payment request from
the Payments API, which records when the checkout was opened. If the business charges a fee on
the payment, your Stellar address is sent to build the transaction (it is not stored at that
step). The page tells the Payments API when you open or close your wallet and when you send the
payment, so the business can follow it. If you
sign with the Freighter extension on the page, the transaction is sent to the Stellar network
through Horizon. Once the payment is made, your address and the transaction are stored with the
business's payment, and your address is added to the business's customers (section 3.3).

#### 3.5 Swaps without an account

The public swap pages use a key shared by every visitor. A swap you create there stores the
addresses, amounts and transactions involved. Only your browser holds the token that lets you
read it again, and only while the page is open.

#### 3.6 The contact form

The form on the payments site asks for your name, email, company (optional), a topic and your
message. We email it to our team, with your email as the address to reply to, and the page and
language you wrote from. It is not saved in our database. To stop abuse we count messages per
network address for 15 minutes, in memory.

#### 3.7 Fiat services and identity verification (BlindPay)

Fiat deposits and withdrawals are provided with BlindPay and need identity verification. [VERIFY:
whether fiat services are live; the dashboard's fiat view is currently switched off.] Depending on
the level of verification, we collect:

- **For a person:** name, email, country, date of birth, tax identification number, phone,
  address, identity document (type, country, photos of the front and back), a selfie, proof of
  address and, at the highest level, occupation, purpose of the account, source of funds and of
  wealth, and the purpose of transactions.
- **For a business:** its legal name and details, formation date, estimated revenue, website,
  address, incorporation and ownership documents, and the same personal details for each owner.
- **For bank transfers:** bank account details (for example account and routing numbers, IBAN,
  CLABE, CBU or CVU, PIX key), tax numbers (CPF, CNPJ, CUIT or CUIL) and the payer's details some
  payment methods require (name, document, email, phone).

Cosmos Pay reviews a submission before sending it to BlindPay, and keeps a copy of it, later
replaced by BlindPay's own record. Document photos are sent to BlindPay's storage and not kept by
us. We also keep the pay-ins and payouts made, with their bank or wallet details. BlindPay
processes this data under its own terms and privacy policy, which you accept before it verifies
you.

#### 3.8 The Cosmos Pay Wallet

##### 3.8.1 What stays on your device

- **Your keys.** The wallet creates your 12-word recovery phrase and your keys on your device, and
  encrypts them there (AES-256-GCM) with a key derived from your app password (PBKDF2, 600,000
  rounds). On a device with a passkey, the passkey unlocks it instead. With biometric unlock
  (Android, iOS) your device's secure key store holds the unlocking key; the wallet never receives
  your fingerprint or face data.
- **Your profile:** the name, email, date of birth, gender and picture you enter. The profile's
  date of birth and gender are not sent to us: the date of birth is only used to check your age.
  (Identity verification asks for your date of birth separately, section 3.7.)
- **Your settings and caches:** network, theme, language, favourite and added tokens, approved
  websites, auto-lock time and prices. Your balances and history are kept in memory only.
- In the Android and iOS apps, the wallet's data is excluded from the device's cloud backups.
  [VERIFY: the iOS exclusion on a real device]

##### 3.8.2 Signing in to Cosmos Pay from the wallet

Signing in lets you restore your wallet on another device and use Cosmos Pay's services. You can
sign in with an emailed code, Google, GitHub or Cosmos Pay's own sign-in. We then store a wallet
account with your email, name, profile picture, sign-in method and wallet address, and create API
keys for it (we store your email with them in our API gateway). While a sign-in is in progress we
keep your email, name, picture and the provider's identifier for up to about a day, and emailed
codes are stored only as a one-way hash. If you use a passkey, its label (your email or name) is
saved by your device's passkey manager.

The wallet also sends your email to send you a code when you set up a profile (you can skip this
step) and when you link an existing wallet to Cosmos Pay.

##### 3.8.3 Encrypted cloud backup and email recovery

When you create or restore a wallet through sign-in, or link an existing wallet to Cosmos Pay,
the wallet uploads an encrypted backup of your secret key and recovery phrase so you can restore
it later. A wallet created with only the 12 words, without signing in, has no cloud backup. The
backup is encrypted on your device with a random key, and that key is locked separately by each
"door" you have:

- **Your password** (Argon2id, deliberately slow to guess). We never receive your password; this
  door opens only with it.
- **Your passkey**, if you set one; this door opens only with it.
- **Email recovery.** When your profile has an email and both recovery servers are available, the
  wallet adds this door automatically. Its key is split into two halves; each half is stored on a
  separate recovery server, together with your email. A person who proves they control your email
  to both recovery servers receives both halves and, with the backup, can restore your wallet,
  recovery phrase included. This is what lets you recover your wallet if you forget your password.

We store the backup encrypted a second time on our server. **What this means:** with the password
and passkey doors only, opening the backup takes your password or your passkey. With the email
recovery door, someone who holds the backup and both halves can also open it: someone who takes
over your email, or the operators of the Payments API and both recovery servers acting together.
[RECOVERY SERVER OPERATORS: the wallet's default recovery servers are `reserv001.cosmospay.lat`
and `reserv002.cosmospay.lat`; state who operates each.]

> Note for counsel: the current Terms (section 2) say "We never receive, store or can recover your
> recovery phrase, secret key or password". See Appendix E, item 1.

**Account recovery (SEP-30).** If you turn it on, the wallet registers your Stellar account with
both recovery servers, with your email as the way to prove it is you, and adds each server as a
signer of your account on the Stellar network. Turning it off removes the registration from both
servers and the signers from your account.

**Moving to a new device.** If you use "easy recovery", your recovery phrase or secret key is
encrypted for your new device and passes through the Payments API for up to 5 minutes, released
only with the code shown on your old device. We cannot read it.

##### 3.8.4 Services the wallet talks to

- **Blockchain services:** to show balances and send transactions, the wallet sends your public
  addresses and signed transactions to public blockchain services: Stellar's Horizon, Solana and
  Monad nodes and, while the wallet is unlocked, about 30 public services for the other networks
  it shows balances for (Appendix A.3). They see your IP address.
- **Prices:** the wallet asks CoinGecko for prices. No personal data is in the request.
- **Swaps, pay links, liquidity and yield** go through the Payments API (section 3.3), which uses
  the partners in section 6.
- **Websites you connect** receive your public address and the signature and payment requests
  you approve.
- **Transaction memo:** if you leave a Stellar memo empty, the wallet writes "Cosmos Wallet" and
  its version as the memo, which is public on the blockchain.

##### 3.8.5 Diagnostics (off unless you turn them on)

If you turn on diagnostics, the wallet sends us reports of how it is used and what fails: screens
opened, unlocks and locks, wallets created, sign-in failures, payments and swaps (asset, amount,
transaction), and errors. Each report carries a random identifier for your installation and one
for the session. If you are signed in, reports are linked to your account and your address; if
not, addresses, amounts and transactions are removed before sending. Turning diagnostics off
deletes the reports not yet sent. The wallet uses no third-party analytics or crash reporting.

The wallet creates the random installation identifier even when diagnostics are off; it is only
sent when they are on.

##### 3.8.6 Permissions the wallet asks for

Camera (QR codes and identity-document photos), photo library (QR images, avatar, documents),
biometrics (unlock), clipboard. The browser extension runs a script on the pages you visit so that
websites can ask to connect to the wallet. The wallet does not use your location, microphone or
contacts.

#### 3.9 Public blockchains

Payments, swaps and other transactions are recorded on public blockchains (Stellar, Solana, Monad
and others). Anyone can read the addresses, amounts and memos recorded there, and nobody, us
included, can change or delete them.

#### 3.10 Logs, security and abuse prevention

- **API access log:** for every call to the Payments API we record the account, the method, the
  address called (without its parameters), the result, the duration, the IP address and the
  browser or client. You can read your own log.
- **Activity reports** from the dashboard and the wallet (sections 3.2 and 3.8.5) are stored with
  the IP address and user agent they arrived from.
- **Rate limits** count requests per account and IP address for a few minutes.
- **Server logs** record requests and errors and can include IP addresses, wallet addresses and,
  for some recovery operations, an email. [VERIFY: where the server, nginx and Cloudflare logs are
  kept and for how long]
- **An audit log** records what staff do on the administrative side.

We use these to run the service, detect abuse, investigate incidents and answer your requests.

### 4. Cookies and similar technologies

| Name | Where | Purpose | Lifetime |
| :--- | :--- | :--- | :--- |
| `__Secure-better-auth.session_token` | dev.cosmospay.lat | keeps you signed in | 7 days, extended while used |
| `__Secure-better-auth.state` | dev.cosmospay.lat | protects the sign-in redirect | 5 minutes |
| `cosmospay-lang` (cookie and browser storage) | our sites | your language | 1 year |
| `cosmospay-env` | dev.cosmospay.lat | sandbox or production view | 1 year |
| `cosmospay-org` | dev.cosmospay.lat | the organization you last chose | 1 year |
| `cosmospay-theme` (browser storage) | our sites | light or dark theme | until you clear it |
| `cosmospay-rows`, `cosmospay-usage:<account>` (browser storage) | dashboard | rows per page; views you open most, for shortcuts | until you clear it |
| `cosmospay-activity-device`, `cosmospay-activity-session` (browser storage) | dashboard | random identifiers that group dashboard usage reports | until you clear it; the tab |
| Google Analytics cookies (for example `_ga`) | company site and the platform pages in 3.1 | analytics | set by Google [VERIFY] |
| Authentik's cookies | auth.cosmospay.lat | sign-in | set by Authentik [VERIFY] |
| Cloudflare's cookies, if any | all our sites | security | set by Cloudflare [VERIFY] |

The wallet keeps its data in your device's app storage, the extension's storage or, for the web
app, your browser's storage (section 3.8.1); it sets no cookies of its own.

> Note for counsel: there is no cookie banner or consent mechanism in the code, and Google
> Analytics loads on every page listed in 3.1. See Appendix D.

### 5. Why we use your data

- To provide the services you ask for: accounts, organizations, API keys, payments, swaps, the
  wallet's sign-in, backup and recovery.
- To keep the services and your account secure: sign-in records, notices, rate limits, logs and
  audit logs.
- To verify identity for fiat services, with BlindPay.
- To answer your messages and support tickets.
- To understand and improve the services: Google Analytics on the pages listed in 3.1, the
  dashboard's usage reports and, if you turn them on, the wallet's diagnostics.
- To meet legal obligations. [LEGAL OBLIGATIONS: counsel]

[LEGAL BASIS FOR EACH PURPOSE: counsel, per jurisdiction]

We do not use your data for advertising and we do not sell it. [CONFIRM: product owner]

The wallet asks whether you want news and offers. The answer stays on your device; we do not send
promotional messages today. [DECISION: promotional communications]

### 6. Who receives your data

| Recipient | What for | What it receives |
| :--- | :--- | :--- |
| Cloudflare | delivery and protection of every Cosmos Pay site and API | all requests, with IP address and headers |
| [HOSTING PROVIDER] | the servers that run Cosmos Pay | all data stored on our servers |
| Google (Analytics) | statistics on the pages listed in 3.1 | page views, IP address, device and browser data, Google's cookies |
| Google, GitHub | sign-in, when you choose them | the sign-in request; they send us your email, name, picture and account identifier |
| [MAIL PROVIDER] (the code supports Resend or any SMTP service) | sending email | the recipient's address and the message: invitations, sign-in and recovery codes, terms emails, contact form messages |
| BlindPay | identity verification and fiat transfers | the data in section 3.7 |
| NEAR Intents (1Click API) | cross-chain swaps | addresses (recipient, refund), amounts, transactions |
| Jupiter, Kuru | swaps on Solana and Monad | your wallet address and the swap |
| DeFindex | yield vaults, when enabled | your address, amounts, signed transactions |
| LayerZero Scan | tracking USDT0 transfers | transaction identifiers |
| Blockchain node providers (Stellar Horizon and RPC, Solana, Monad and others; Appendix A) | reading and sending transactions | addresses, signed transactions, IP address |
| CoinGecko | prices in the wallet | IP address only |
| The business you pay | following its payments | your address, the payment and the checkout events in 3.4 |
| Addresses a business sets for webhooks | its event notifications | the records in section 3.3 |
| Websites you connect to the wallet | signing and payments | your public address and what you approve |
| Authorities | when the law requires it | [LEGAL DISCLOSURES: counsel] |

Authentik, our API gateway (APISIX) and our databases are run by Cosmos Pay on [HOSTING PROVIDER].

### 7. International transfers

Some recipients above process data outside your country. [INTERNATIONAL TRANSFERS: countries,
safeguards; counsel]

### 8. How long we keep data

| Data | How long |
| :--- | :--- |
| Developer platform account, profile and organizations | until deleted on request [RETENTION: platform accounts] |
| Sessions | 7 days of validity; the record stays [RETENTION: expired sessions] |
| Activity notices, support tickets | [RETENTION: notifications, support] |
| Invitations | the link works 3 days; the record stays [RETENTION: invitations] |
| Contact form messages | not stored by the site; kept in our mailbox [RETENTION: contact email] |
| Customers, products, unpaid payment requests, webhooks, aliases | until you delete them [RETENTION: merchant data] |
| Paid payments, swaps and other transactions | [RETENTION: transaction records] |
| Webhook deliveries | the event's content is erased after 30 days (default); the delivery record stays [RETENTION: delivery records] |
| Wallet sign-in in progress, emailed codes | deleted about 24 hours after use or expiry (default) |
| Wallet account, encrypted backups | [RETENTION: wallet accounts and backups] |
| Recovery registrations and key halves | until you turn recovery off [RETENTION: recovery data] |
| Moving to a new device | 5 minutes |
| Identity verification, pay-ins and payouts | [RETENTION: KYC and fiat records, legal minimums] |
| API access log, activity reports | 30 days (default) |
| Staff audit log | [RETENTION: audit log] |
| Server, nginx and Cloudflare logs | [RETENTION: infrastructure logs] |
| Google Analytics | [RETENTION: Google Analytics setting] |
| Wallet diagnostics waiting on your device | up to 6 days |

"(default)" marks a period the code sets but configuration can change. [VERIFY: the production
values of `REQUEST_LOG_RETENTION_DAYS`, `ACTIVITY_RETENTION_DAYS`, `WEBHOOK_PAYLOAD_RETENTION_DAYS`
and `WALLET_AUTH_SWEEP_ENABLED`]

### 9. Security

- The wallet encrypts keys and backups on your device; we never receive your password.
- Backups are encrypted again on our server (AES-256-GCM). Sign-in codes are stored only as
  hashes. Session cookies are HttpOnly and Secure.
- Traffic is encrypted in transit (HTTPS).
- Access to administrative functions is limited to staff roles and recorded.

No system is completely secure. [INCIDENT RESPONSE AND NOTIFICATION: counsel]

### 10. Your choices and rights

**What you can do yourself today:**

- Edit your platform display name, bio and avatar.
- Delete customers, products, unpaid payment requests, webhooks, aliases and bank accounts you
  added.
- Delete an organization you own (you must keep one). This deletes it, its members, invitations
  and connected wallets from the developer platform; the Payments API records of that
  organization are not deleted by it. [DECISION: org deletion scope]
- In the wallet: turn diagnostics on or off, turn account recovery on or off, remove a wallet from
  the device (this does not delete anything on our servers).

**What you can ask us:** to access, correct or delete your data, or [OTHER RIGHTS: counsel, per
jurisdiction]. Write to [DPO/CONTACT]. We will answer within [RESPONSE TIME]. There is no
self-service account deletion yet; we handle these requests by hand. [ACCOUNT DELETION PROCESS]

Some data cannot be deleted: transactions on public blockchains, and records the law requires us
to keep [RETENTION: legal minimums].

You may also complain to [SUPERVISORY AUTHORITY].

### 11. Children

The wallet's setup asks for your date of birth and does not continue for anyone under 13
[VERIFY: on every setup path]. Fiat services need you to be 18 or older. The developer platform
is for businesses and developers. [MINIMUM AGE: counsel]

### 12. Changes to this policy

We will publish changes here with a new date. [NOTICE OF MATERIAL CHANGES: counsel]

### 13. Contact

[LEGAL ENTITY], [ADDRESS]. Privacy questions and requests: [DPO/CONTACT].
[EU/UK REPRESENTATIVE, IF NEEDED] [LGPD ENCARREGADO, IF NEEDED]

Governing law: [GOVERNING LAW].

---

## Appendix A. Data inventory with code references

Each statement in Part 1 rests on one or more lines below. Line numbers are for the commits in the snapshot table.

### A.1 Developer platform, company site and payments site (this repository, `da7aa90`)

Paths are relative to this repository's root.

**Sign-in and accounts**

- Sign-in is OpenID Connect against Authentik (self-hosted identity provider, `AUTHENTIK_DISCOVERY_URL`), provider id `ak`, scopes `openid profile email`; an Authentik sign-in links to an existing user by email only when Authentik reports the address as verified. `src/lib/auth.ts:42-71`
- `user` table: `id`, `name`, `email`, `emailVerified`, `image` (avatar URL from Authentik's `picture`). `prisma/schema.prisma:16-36`
- `account` table: `accountId` (Authentik subject, a UUID since 2026-10-31 per `CLAUDE.md`), `providerId`, `accessToken`, `refreshToken`, `idToken`, token expiry dates, `scope`, `password` (unused by the Authentik flow). `prisma/schema.prisma:53-71`. Better Auth's `account.encryptOAuthTokens` option is not set in `src/lib/auth.ts`, so the OAuth tokens are stored as Better Auth writes them by default (not encrypted by the app).
- `session` table: `token`, `expiresAt`, `ipAddress`, `userAgent`, `userId`. `prisma/schema.prisma:38-51`. Lifetime is Better Auth 1.7.7's default (7 days, extended at most once a day of use); `src/lib/auth.ts` sets neither `expiresIn` nor `updateAge` (defaults in `node_modules/better-auth/dist/context/create-context.mjs`).
- `verification` table: Better Auth's short-lived values (`identifier`, `value`, `expiresAt`). `prisma/schema.prisma:73-82`
- The session cookie is host-only on the platform domain (`crossSubDomainCookies` not enabled). `src/lib/auth.ts:22-27`
- Observed live on 2026-11-01: `GET https://dev.cosmospay.lat/login` sets `__Secure-better-auth.state` (`Max-Age=300; HttpOnly; Secure; SameSite=Lax`) and redirects to `auth.cosmospay.lat`.
- No endpoint deletes a user account: Better Auth's `deleteUser` is not enabled in `src/lib/auth.ts` and no route under `src/pages/api/account/` deletes the user (`plan.ts`, `profile.ts` only).

**Profile, sign-in location and activity**

- `profile` table: `displayName`, `avatarUrl`, `bio` (editable by the user), `locale`, `theme`, `role` (user, support, admin, owner), `plan`, `planStatus`, `region`, `country`, `language`, `lastSessionId`, `lastLoginIp`, `lastLoginCountry`, `lastLoginRegion`, `lastLoginAt`, `lastSeenAt`. `prisma/schema.prisma:86-127`; editable fields `src/lib/profile.ts:62-74`
- Created on the first authenticated request with country and region from the request and language from `Accept-Language`. `src/lib/profile.ts:105-115`
- Once per new session: last sign-in IP, country, region and time are written, and a "New sign-in" notification is created with IP, place, city, public IP and user agent. `src/lib/profile.ts:117-146`, called from `src/middleware.ts:250-258`
- `lastSeenAt` is updated on authenticated requests, at most once every 2 minutes. `src/lib/profile.ts:17-26`
- Location comes from proxy headers (`cf-ipcountry`, `cf-region`, `cf-ipcity` and equivalents; IP from `cf-connecting-ip`, `x-real-ip`, `x-forwarded-for`, `x-client-ip`), completed by a local MaxMind GeoLite2-City database file (`MAXMIND_DB_PATH`, default `data/geoip/GeoLite2-City.mmdb`), so no external geolocation call is made for real visitors. `src/lib/geo.ts:1-8,100-140`; `src/lib/geoip.ts:1-55`
- Only for a request from a private or loopback address (local development) does the server ask `https://ipapi.co/json/` for its own public IP and location; no visitor data is sent. `src/lib/geoip.ts:57-90`; `src/lib/geo.ts` (`geoLocate`)
- `notification` table: `type`, `title`, `message`, `origin`, `country`, `region`, `ipAddress`, `metadata` (city, public IP, user agent), `read`. `prisma/schema.prisma:132-150`; written by `src/lib/notifications.ts:18-32`. Writers: sign-in (`src/lib/profile.ts:135`), API key create, rotate, update, delete (`src/pages/api/api-keys/index.ts:201,277`; `src/pages/api/api-keys/[id]/index.ts:130,204`), payment created or changed (`src/pages/api/payment-intents/index.ts:122`; `[id]/index.ts:76`), swap and cross-chain swap created (`src/pages/api/swaps/index.ts:99`; `src/pages/api/cross-chain-swaps/index.ts:44`), liquidity deposit and withdraw (`src/pages/api/liquidity/deposit.ts:38`; `withdraw.ts:34`). No cleanup job deletes notifications.

**Dashboard telemetry (first-party)**

- The dashboard in the browser buffers events (view opened, actions, uncaught errors with message, source file, line and column) with a random per-tab id (`sessionStorage` `cosmospay-activity-session`) and a random per-browser id (`localStorage` `cosmospay-activity-device`), and posts them to `/api/activity`. It states it collects no keystrokes, form values, API key material or query strings. `src/components/cosmos/lib/track.ts:1-218`; started in `src/components/cosmos/Dashboard.tsx:128-133`
- `/api/activity` attributes the events to the signed-in account and forwards them to the Payments API (`POST /v1/activity/events`) under the consumer `cosmos_<userId>`. `src/pages/api/activity/index.ts:19-35`; `src/lib/activity.ts:1-159`
- The middleware also records each `/api/*` request by a signed-in account that changes something or fails: method, path (never the query string), status, duration. Successful reads are skipped. `src/middleware.ts:95-128`

**Organizations, members, invitations, wallets**

- `organization`: `name`, `ownerId`, `metadata` (onboarding answers: industry, goals, expected volume). `prisma/schema.prisma:199-215`; `src/components/cosmos/Onboarding.tsx:68`
- `organization_member`: `role`, `permissions`. `prisma/schema.prisma:239-255`
- `organization_invitation`: invited `email`, `role`, `permissions`, single-use `token`, `invitedById`, `expiresAt` (3 days), `acceptedAt`. `prisma/schema.prisma:220-237`; `src/lib/invitations.ts:15,101-108`. The invitation is emailed through the mail transport. `src/lib/invitations.ts:189`. Expired or accepted rows are not deleted by any job.
- `organization_wallet`: `chain`, `address`, `label`, `provider` (freighter, phantom, solflare, evm), `addedById`; ownership is proven by a signed message, the signature is not stored. `prisma/schema.prisma:257-278`; `src/lib/org-wallets.ts`; `src/lib/org-wallets-verify.ts`
- Deleting an organization (owner only, at least one must remain) deletes the organization row and, by cascade, its members, invitations and wallets in this database. It does not call the Payments API or the API gateway. `src/pages/api/organizations/[id]/index.ts:45-66`; `src/lib/organizations.ts:131-133`
- The onboarding's terms checkbox (`agreed`) gates the form but is not stored. `src/components/cosmos/Onboarding.tsx:45,60`

**API keys**

- Generated by the platform and stored in the self-hosted APISIX gateway as a `key-auth` credential of the consumer `cosmos_<userId>`, with labels `permissions`, `role`, `env`, `org` and the optional `name` and `desc`. `src/utils/apisix.ts:862-921`. The secret is returned once at creation; listings return id, dates, name, description and labels only. `src/pages/api/api-keys/index.ts:103-117,286-300`. Encryption of the key at rest depends on the gateway's configuration, which is not in this repository.

**Support**

- `support_ticket`: `subject`, `status`, `priority`; `support_message`: `body`, `senderId`, `senderName`, `fromStaff`, read flags and times. `prisma/schema.prisma:152-195`
- Staff (roles owner, admin, support) read and answer tickets. `src/lib/profile.ts:47-50`; `src/lib/support.ts:54-60`

**Staff access**

- Accounts with the owner or admin role list every account (name, email, avatar, created date, role, plan, plan status, last seen). `src/lib/profile.ts:76-94`; `src/pages/api/admin/users/`
- They also reach the Payments API's cross-tenant admin endpoints (summary, consumers, payments, swaps, customers, products, KYC receivers, pay-ins, payouts); the Payments API audits each call under the account. `src/pages/api/admin/[...path].ts:1-12`; `src/lib/cosmos-proxy.ts` (`adminProxy`)

**Contact form (payments.cosmospay.lat)**

- Fields: `name`, `email`, `company` (optional), `topic` (getting started, integration, pricing, other), `message`; hidden `website` (honeypot) and `started` (time the page rendered). `src/lib/payments/contact.ts:9-59`
- Emailed to `CONTACT_EMAIL`, else `organization@cosmospay.lat`, with the visitor as reply-to; the email also carries the page and the language. Not written to the database. `src/pages/payments/contact.ts:57-83`; `src/lib/payments/contact.ts:6-7,139-156`
- Rate limit keyed on `cf-connecting-ip` (else the connection address), held in process memory for 15 minutes; an overall cap of 60 an hour. `src/lib/payments/contact.ts:61-103`; `src/pages/payments/contact.ts:24-26,61-70`

**Email transport**

- Resend's HTTP API (`https://api.resend.com/emails`, `RESEND_API_KEY`) or SMTP through nodemailer (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`), from `SMTP_FROM`. `.env.example` points the SMTP example at `smtp.resend.com`. `src/lib/mailer.ts:1-125`; `.env.example:116-128`
- Messages sent: organization invitations (`src/lib/invitations.ts:189`), fiat receiver terms-of-service emails (`src/lib/emails.ts:40-56`; `src/pages/api/kyc/receivers/[id]/tos.ts:59-71`; `approve.ts:56-61`; the admin copies under `src/pages/api/admin/receivers/`), the contact form.

**Fiat and KYC from the dashboard (BlindPay; view currently switched off)**

- The organization's Fiat view (`blindpay`) and the admin's (`adminFiat`) are in `DISABLED_VIEWS`. `src/components/cosmos/dashboard/data.ts:126`
- When on, its KYC receiver form collects, for an individual: email, country, first and last name, date of birth, tax id, phone, address, city, state, postal code; standard level: ID document country, type, front and back images, selfie, proof of address type and file; enhanced level: occupation, account purpose, source of funds document, source of wealth, purpose of transactions. For a business: legal and alternate name, type, industry, description, formation date, estimated annual revenue, website, address, incorporation and ownership documents, and owners (name, date of birth, tax id, country, ID documents, ownership percentage). Bank accounts: rail type, name, beneficiary name, country, account and routing numbers. `src/components/cosmos/dashboard/views/BlindPayView.tsx:73-86,330-355,620-660`
- All of it is forwarded to the Payments API (`/v1/kyc/*`, `/v1/onramp/*`, `/v1/offramp/*`). `src/pages/api/kyc/[...path].ts`; `src/pages/api/onramp/[...path].ts`; `src/pages/api/offramp/[...path].ts`
- Country flags in that form load from `https://flagcdn.com`. `src/components/cosmos/dashboard/components/CountryFlag.tsx:1-14`

**Payers on the hosted checkout (payments.cosmospay.lat/{id}, `/pay`, `/zk/{id}`)**

- The payer's browser reads the payment link from the Payments API directly (keyless route). `CLAUDE.md` ("The payments domain"); `src/lib/payments/payment-link.ts`
- For a link with a merchant fee, the payer's Stellar account address is sent to `POST /v1/payment-links/{id}/transaction`. `src/lib/payments/payment-link.ts:214-255`
- The page reports wallet events (`walletOpened`, `walletClosed`, `sent`) to `POST /v1/payment-links/{id}/events`. `src/lib/payments/payment-link.ts:257-283`
- A transaction signed with Freighter on the page is submitted to Horizon (`https://horizon.stellar.org`, testnet `https://horizon-testnet.stellar.org`). `src/lib/payments/payment-link.ts:180-206`; `src/scripts/payments/checkout.ts:483-560`
- The ZK pages derive the confidential key from the payer's signature in memory; an older version's keys in `sessionStorage` are removed. `src/lib/zk/wallet.ts:71-120`

**Public swaps (cosmospay.lat/swaps, payments.cosmospay.lat/swaps)**

- The browser calls the Payments API with the shared public key; the record token that lets the creator read the swap is kept in memory only. `CLAUDE.md` ("Public swaps (no account)"); `src/components/cosmos/swaps/PublicSwaps.tsx`

**Cookies and browser storage set by this code**

| Name | Kind | Set by | Content | Lifetime |
| :--- | :--- | :--- | :--- | :--- |
| `__Secure-better-auth.session_token` | cookie, HttpOnly, host-only on dev.cosmospay.lat | Better Auth | session token | 7 days, extended with use (library default) |
| `__Secure-better-auth.state` | cookie, HttpOnly | Better Auth during sign-in | OAuth state | 300 s (observed live) |
| `cosmospay-lang` | cookie and `localStorage` | language switcher; middleware on a page's `?lang=` address | language code | 1 year |
| `cosmospay-env` | cookie | dashboard | `dev` or `prod` (sandbox or production view) | 1 year |
| `cosmospay-org` | cookie | dashboard | selected organization id | 1 year |
| `cosmospay-theme` | `localStorage` | theme toggle | `light` or `dark` | until cleared |
| `cosmospay-rows` | `localStorage` | dashboard tables | rows per page | until cleared |
| `cosmospay-usage:<userId>` | `localStorage` | dashboard | which dashboard views this account opens (quick links) | until cleared |
| `cosmospay-activity-device` | `localStorage` | dashboard telemetry | random id | until cleared |
| `cosmospay-activity-session` | `sessionStorage` | dashboard telemetry | random id | the tab |
| `cosmos.kyc.return` | `sessionStorage` | KYC return page | path to return to | read once and removed |
| Google Analytics cookies | cookie | `gtag.js` (Google) | GA client and session ids | set by Google, not by this code |

Sources: `src/middleware.ts:62,240-242`; `src/lib/i18n/index.tsx:16,97-98`; `src/lib/payments/i18n.ts:18`; `src/components/cosmos/Dashboard.tsx:126,137-150,170-177`; `src/components/cosmos/hooks/useTheme.ts:4-25`; `src/components/cosmos/dashboard/hooks.ts:50-62`; `src/components/cosmos/lib/track.ts:30-31`; `src/components/cosmos/dashboard/KycReturn.tsx:28`.

**Google Analytics**

- GA4 through `gtag.js`; the measurement ID is the build-time variable `PUBLIC_GA_ID` (empty disables it). The code calls only `gtag('js', ...)` and `gtag('config', ID)`: no custom events and no user id. The script loads after the page, when the browser is idle. `src/layouts/CosmosLayout.astro:125,221-228`; `astro.config.mjs:253-255`; `.env.example:152-155`
- It is in every page rendered with `CosmosLayout`: the company site (`src/pages/site/index.astro`, `about.astro`, `pricing.astro`, `swaps.astro`, `tos.astro`) and the platform pages `src/pages/dashboard.astro`, `onboarding.astro`, `invite/[token].astro`, `kyc/return/...`, `swagger.astro`. Not in `PaymentsLayout` (the payments site) and not in the docs export.
- Observed live on 2026-11-01: `G-DP0DSQMKSQ` in the HTML of `https://cosmospay.lat/` and `https://cosmospay.lat/tos`; none in `https://payments.cosmospay.lat/` or `https://dev.cosmospay.lat/docs`.
- No consent banner or Consent Mode call exists in the code (searched `src/` for `consent`).
- The default `config` call sends the page's full address (`page_location`). Pages under GA whose address carries identifiers: `src/pages/invite/[token].astro` (the invitation token, a single-use sign-up link), `src/pages/kyc/return/[org]/[env]/[receiver].astro` (organization and receiver ids), and the dashboard, whose search writes `q` and the views' filters into the address with `history.replaceState` (`src/components/cosmos/dashboard/widgets/DashSearch.tsx:88`; `src/components/cosmos/dashboard/hooks.ts:99,127,154`). Whether GA reports those later address changes depends on the property's enhanced measurement setting for browser history events [VERIFY].

**Cloudflare and other third parties in the browser**

- The code reads Cloudflare's request headers (`cf-connecting-ip`, `cf-ipcountry`, `cf-region`, `cf-ipcity`). `src/lib/geo.ts:5-8`; `src/lib/payments/contact.ts:94-103`. Live responses from `cosmospay.lat`, `dev.cosmospay.lat`, `payments.cosmospay.lat`, `api.cosmospay.lat` and `auth.cosmospay.lat` carry `Server: cloudflare` (2026-11-01). No Cloudflare cookie was observed in those responses.
- `https://www.googletagmanager.com` (Google Analytics), `https://flagcdn.com` (Fiat form only), `https://cdn.jsdelivr.net` (Swagger UI at `/swagger`, which is off in production unless `API_DOCS_ENABLED` is true: `src/pages/swagger.astro:29-34`; `.env.example:145-150`), Horizon (checkout). Fonts and logos are served from this site.

**Logs**

- The app writes to standard output and error only (no request access log of its own). What it logs: gateway sync results, Payments API connection errors (path and error code, no request data: `src/lib/cosmos.ts:123,222`), the contact form's cap and send errors (no visitor data: `src/pages/payments/contact.ts:68-80`), sign-in start failures, and the stack of server errors on the 500 page (`src/pages/500.astro:8`). Production runs it under PM2 (`ecosystem.config.cjs`), behind nginx and Cloudflare, whose logs are configured outside this repository.

**Retired wallet tables still in this database**

- `wallet_backup` (`userId`, `stellarAddress`, `box`: the seed encrypted on the device, which this server cannot open), `wallet_auth_handshake` (`email`, `name`, `avatar`, provider `subject`), `wallet_login_code` (`email`, `name`, `avatar`, code hash), `wallet_registration` (`email`, `name`, `stellarAddress`), `recovery_account` (`address`, `network`), `recovery_auth_method` (`type` email, phone or Stellar address, `value`). Nothing in this repository writes them; they are kept until `npm run export:wallet-data` has been run and imported on the community server. `prisma/schema.prisma:280-485`; `scripts/export-wallet-data.mjs`; `CLAUDE.md` ("Wallet sign-in and account recovery live on the community server")

### A.2 Payments API, wallet sign-in and recovery (CosmosPay-Community-Server, `1f64640`)

Paths are relative to that repository's root. One PostgreSQL database per deployment (`prisma/schema.prisma`); no Redis, queue, object storage, error tracker or analytics SDK in `package.json`. It runs as the main API plus two recovery servers (`RECOVERY_ROLE=a|b`), each with its own database (`CLAUDE.md:437-447`; `prisma/schema.prisma:1877-1879`). It sets no cookies.

**Accounts as the gateway names them**

- `consumer`: `apisixUsername` (`cosmos_<userId>` for platform accounts, `cosmos_wallet_<walletAccountId>` for wallet accounts), `credentialId`. Upserted on the first request; no deletion route. `prisma/schema.prisma:19-61`; `src/common/services/consumer-resolver.service.ts:31-40`
- The caller's identity arrives in headers set by APISIX (`X-Consumer-Username`, `X-Consumer-Org`, `X-Consumer-Email` and others). `src/common/middleware/apisix-context.middleware.ts:36-68`

**Merchant data**

- `customer`: `name`, `alias`, `email` (optional), `note`, `reference`; `customer_wallet`: `chain`, `address`, `label`. Delete routes exist. `prisma/schema.prisma:65-104`; `src/customers/customers.controller.ts:117,153`
- A payer's address is added automatically as a customer when a payment succeeds (`reference: 'auto'`), and logged to the console. `src/customers/customers.service.ts:179-206`; `src/payment-intents/payment-intents.service.ts:1058-1083`
- `product`: name, description, amount, asset. `prisma/schema.prisma:140-160`
- `payment_intent`: payer `source` (filled from the chain at settlement), `destination`, amount, asset, `memo`, `msg`, `callback`, `reference`, transaction data and hash, `merchantFee`, `expiresAt`, and checkout timestamps (`checkoutSeenAt`, `checkoutWalletAt`, `checkoutWalletClosedAt`, `checkoutSentAt`). No IP is stored on the intent. `prisma/schema.prisma:345-466`; `src/payment-intents/payment-links.service.ts:190-226`
- The keyless checkout calls take the payer's `account` and store nothing from it. `src/payment-intents/payment-links.controller.ts:114-184`
- Unpaid intents expire after `PAYMENT_INTENT_TTL_SECONDS` (default 3600) but the row stays; paid intents cannot be deleted. `src/config/configuration.ts:1003-1004`; `src/payment-intents/payment-intents.service.ts:1109-1142`
- Swaps and other on-chain records with addresses, amounts and transaction hashes: `swap`, `chain_swap` (Jupiter, Kuru), `cross_chain_swap` (NEAR Intents: `recipient`, `refundTo`, deposit address), `liquidity_pool_operation`, `usdt0_transfer` (EVM `recipient`), `defindex_transaction` (`caller`), `zk_payment` (`payer`, `recipient`). No retention and no deletion route. `prisma/schema.prisma:911-1282,2083-2140,2158-2295`
- Private (ZK) payments: amounts are hidden on-chain, but the operator holds the auditor key (`ZK_PAYMENTS_<TESTNET|MAINNET>_AUDITOR_SECRET`) and can read every amount on its token; mainnet is off until its variables are set. `CLAUDE.md:535-545`; `src/config/configuration.ts:728-745`
- Payment aliases (`alias`, `alias_address`): a public directory (handle to addresses and back) through the shared key; each alias stores an `email`, and no code sets `emailVerifiedAt`. `prisma/schema.prisma:1458-1587`; `src/aliases/aliases.service.ts:231-305,486-543,651-723`

**Webhooks**

- `webhook_endpoint`: `url`, `secret` (plaintext, needed to sign), event types. `webhook_delivery`: `eventType`, `payload` (the body as sent), status, attempts, response status, error. `prisma/schema.prisma:239-309`; `src/webhooks/webhook-dispatcher.service.ts:103-143`
- Payment, swap and liquidity events carry the full record (addresses, memo, reference, merchant fee); BlindPay events carry an allow-list (receiver id, type, KYC type and status, country, payment ids, amounts, status). `src/payment-intents/payment-intents.service.ts:221-227`; `src/native-plugins/blindpay/blindpay-event-redaction.ts:28-75`
- A finished delivery's body is replaced by `{"redacted":true}` after `WEBHOOK_PAYLOAD_RETENTION_DAYS` (default 30; 0 keeps it); the row stays. `src/common/services/request-log-retention.service.ts:191-234`; `src/config/configuration.ts:982-985`

**Wallet sign-in (`/v1/wallet/auth/*`)**

- Providers: Google (`openid email profile`), GitHub (`read:user user:email`) and Authentik (OpenID Connect; Authentik's flow also offers Google, GitHub and an emailed link). `src/wallet-auth/wallet-auth-core.ts:114-133,206-253`; `src/config/configuration.ts:1115-1129`; `deploy/authentik/wallet-sign-in.yaml`
- `wallet_auth_handshake`: `email`, `name`, `avatar`, provider `subject`, `emailVerified`, encrypted ID token and PKCE values. Valid 10 minutes; unfinished attempts are cleared on expiry; completed ones are deleted 24 hours after their last update (sweeper on by default, `WALLET_AUTH_SWEEP_ENABLED`). `prisma/schema.prisma:1671-1734`; `src/wallet-auth/wallet-auth.constants.ts:16,155`; `src/wallet-auth/wallet-auth-sweeper.service.ts:63-140`
- `wallet_login_code`: `email`, `name`, `avatar`, SHA-256 of the code and of the claim token, attempts. Valid 15 minutes, 5 attempts, one per minute and 10 a day per mailbox; deleted 24 hours after expiry. `prisma/schema.prisma:1742-1778`; `src/wallet-auth/wallet-auth.constants.ts:95-126`; `src/wallet-auth/wallet-auth-sweeper.service.ts:100-152`
- The sign-in session is not stored: an encrypted token (AES-256-GCM) with email, name, avatar, method, valid 30 minutes. `src/wallet-auth/wallet-auth-core.ts:461-489`
- `wallet_account`: `email`, `name`, `avatar`, `method`, `chain`, `address`, `consumerId`. No deletion route, no retention. `prisma/schema.prisma:1595-1634`; `src/wallet-auth/wallet-auth.service.ts:910-1033`
- At sign-in the service creates one API key per environment in APISIX (plaintext `key-auth` credential) and writes the account's email into the consumer's forwarding function. `src/gateway-keys/wallet-keys.service.ts:44-48,143-262`; `src/gateway-keys/consumer-forwarder.ts:57-81`

**Encrypted wallet backup**

- `wallet_backup`: `chain`, `address`, `box`. The box is sealed on the device under one or more "doors": a password (PBKDF2 600,000 to 4,000,000 iterations, or Argon2id), a passkey (PRF) and at most one "recovery" door, never the only one. The server never receives the password and only checks the box's structure. `prisma/schema.prisma:1643-1664`; `src/wallet-auth/wallet-auth-core.ts:640-769`; `src/wallet-auth/wallet-auth.constants.ts:160-208`
- The server seals the box again at rest (AES-256-GCM, `WALLET_BACKUP_ENCRYPTION_KEY`) and removes that layer to return the boxes after a sign-in. `src/wallet-auth/backup-cipher.ts:16-146`
- Anyone who completes the email proof for an account receives every box on it. `src/wallet-auth/wallet-auth.service.ts:848-898`
- The recovery door's key is split in two (XOR), one half on each recovery server (`recovery_backup_share.share`, stored unencrypted, with the `email` that may take it back). Whoever proves that email to both servers gets both halves, which with the box restore the whole wallet, seed included. `prisma/schema.prisma:1927-1957`; `CLAUDE.md:466-470`; `src/recovery/recovery-shares.service.ts:52-151`
- `PUT /v1/wallet/backup` replaces a box (signed by the address); no deletion route. `src/wallet-auth/wallet-auth.service.ts:1042-1097`
- Easy recovery (moving to a new device): `easy_recovery_session` holds the new device's public key and a ciphertext sealed to it (the server cannot open it), valid 5 minutes, deleted on expiry. `prisma/schema.prisma:1835-1863`; `src/easy-recovery/easy-recovery.constants.ts:26,36`; `src/easy-recovery/easy-recovery-sweeper.service.ts:45-88`

**Account recovery (SEP-10, SEP-30; recovery servers A and B)**

- `recovery_account` (`address`, `network`), `recovery_auth_method` (email only is accepted), `recovery_backup_share` (above), `recovery_email_code` (SHA-256 code, 15 minutes, deleted 24 hours after expiry), `recovery_used_id_token` (hash, deleted after its expiry). `prisma/schema.prisma:1880-2012`; `src/recovery/recovery-core.ts:55-64`; `src/recovery/recovery-sweeper.service.ts:50-82`
- The co-signer key per account is derived from `RECOVERY_SIGNER_MASTER`; no key table is kept. `src/recovery/recovery-core.ts:121-130`
- Accounts and key halves stay until `DELETE /v1/sep30/accounts/:address` or `DELETE /v1/sep30/shares/:address`. `src/recovery/recovery.controller.ts:334,458`

**KYC and fiat (BlindPay)**

- Loaded only when `PLUGINS_ENABLED` includes `blindpay`. `src/native-plugins/native-plugins.module.ts:16-37`; `src/config/configuration.ts:54-72,1045-1064`
- Sent to BlindPay: the receiver fields of `src/native-plugins/blindpay/kyc/receivers/dto/create-receiver.dto.ts:55-455` (identity, tax id, date of birth, phone, `ip_address`, address, ID documents, selfie, proof of address, source of funds and wealth, purpose, business data and owners); bank accounts (account and routing numbers, IBAN, BIC, CLABE, PIX key, CPF or CNPJ, beneficiary) `kyc/bank-accounts/dto/create-bank-account.dto.ts:22-361`; pay-in quotes (PSE payer name, document, email, phone) `onramp/dto/create-payin-quote.dto.ts:34-78`; payouts (sender wallet, documents) `offramp/offramp.service.ts:95-128,205-214`.
- Stored locally: `blindpay_receiver.raw` keeps the whole receiver dossier (it is created at BlindPay only after Cosmos Pay's review and the person's acceptance of BlindPay's terms), later replaced by BlindPay's own copy; bank accounts and wallets in `raw`; pay-in instructions (bank details, PIX, CLABE, CBU, PSE name and tax id); payouts with the sender wallet. Not encrypted at rest. `prisma/schema.prisma:582-819`; `src/native-plugins/blindpay/kyc/receivers/receivers.service.ts:40-126`; `src/native-plugins/blindpay/blindpay-sync.service.ts:1118-1256`
- Document files are forwarded to BlindPay's storage, not kept (JPEG, PNG, WebP, HEIC, PDF, 10 MB). `kyc/upload/kyc-meta.service.ts:39-71`
- `DELETE /v1/kyc/receivers/:id` deletes the receiver here and at BlindPay; its pay-ins and payouts stay. `receivers.service.ts:705-734`

**Third parties called by this server**

- BlindPay (`BLINDPAY_BASE_URL`, default `https://api.blindpay.com/v1`). `blindpay.client.ts:124-201`
- NEAR Intents 1Click (`NEAR_INTENTS_BASE_URL`, default `https://1click.chaindefuser.com`): quote with assets, amount, `refundTo` and `recipient` addresses, fee recipients; status by deposit address; deposit submit with transaction hash. `src/near-intents/near-intents.client.ts:77-126`; `src/cross-chain-swaps/cross-chain-swaps.service.ts:601-638`
- DeFindex (when `defindex` is in `PLUGINS_ENABLED`; `DEFINDEX_BASE_URL`, default `https://api.defindex.io`): vault balance by account, deposit and withdraw with the `caller` address. `src/native-plugins/defindex/defindex.client.ts:33-99`
- Jupiter (`JUPITER_BASE_URL`, default `https://lite-api.jup.ag/swap/v1`): `userPublicKey`. `src/jupiter/jupiter.client.ts:74-123`
- Kuru (`KURU_BASE_URL`, default `https://ws.kuru.io`): `userAddress`. `src/kuru/kuru.client.ts:52-143`
- LayerZero Scan (`https://scan.layerzero-api.com/v1`): message id or transaction hash. `src/usdt0/usdt0.constants.ts:131`
- Stellar Horizon (default `https://horizon.stellar.org`), Soroban RPC (default `https://soroban-rpc.mainnet.stellar.gateway.fm`, testnet `https://soroban-testnet.stellar.org`), Solana RPC (default `https://api.mainnet-beta.solana.com`), Monad RPC (default `https://rpc.monad.xyz`): addresses and transactions. `src/config/config.constants.ts:23-64`
- Mail: Resend (`MAIL_RESEND_API_KEY`) or SMTP (`MAIL_SMTP_*`), from `MAIL_FROM`; sends the wallet sign-in code, the alias recovery token and the recovery servers' codes. `src/mailer/mailer.service.ts:58-99`; `src/wallet-auth/wallet-emails.ts:75-214`
- Google and GitHub (OAuth code exchange, profile and email reads), Authentik (OIDC). `src/wallet-auth/wallet-auth.service.ts:1194-1249`; `src/common/oidc/oidc.service.ts:43-117`
- Merchants' webhook URLs (event payloads above); third-party plugins only for slugs in `PLUGINS_ENABLED` (empty by default), limited to hosts in their manifest. `src/plugins/plugin-http.client.ts:37-51`

**Logs and telemetry**

- `request_log`: consumer, method, path (no query string), status, duration, `ip`, `userAgent`; each tenant reads its own. Deleted after `REQUEST_LOG_RETENTION_DAYS` (default 30). `prisma/schema.prisma:109-135`; `src/common/interceptors/logging.interceptor.ts:91-126`; `src/common/services/request-log-retention.service.ts:83-127`; `src/config/configuration.ts:962-975`
- `activity_event` (wallet and dashboard telemetry): type, message, `sessionId`, `distinctId`, app version, platform, network, `props` (up to 8 KB), `ip`, `userAgent`. Deleted after `ACTIVITY_RETENTION_DAYS` (default 30). `prisma/schema.prisma:1353-1418`; `src/activity/activity.service.ts:69-137`; `src/common/services/request-log-retention.service.ts:138-180`
- `admin_audit_log`: actor, role, action, resource, metadata (admin reads record the filters and the admin's IP). Append-only, no retention. `prisma/schema.prisma:1287-1301`; `src/admin/admin-read-audit.interceptor.ts:52-72`
- `rate_limit_counter`: key with the client IP (IPv6 by /64), deleted after its window (1 to 10 minutes) plus 60 s. `prisma/schema.prisma:1318-1331`; `src/common/services/rate-limit.service.ts:62-72`
- Console output: every request's method and full URL with the query string, status, consumer; also IPs refused by the rate limit, payer addresses of auto-created customers, email and address at sponsored recovery setup, addresses at recovery co-signing. No retention in code. `src/common/interceptors/logging.interceptor.ts:81-84`; `src/common/guards/rate-limit.guard.ts:88-90`; `src/wallet-auth/wallet-auth.service.ts:1481-1483`

**Security**

- Encrypted at rest by the app: wallet backups (second layer), ID tokens waiting in sign-in rows, plugin secrets (AES-256-GCM). Not encrypted by the app: KYC dossiers and bank details, customers, webhook secrets, recovery key halves, emails, IPs. Codes and tokens are hashed with SHA-256. `src/wallet-auth/backup-cipher.ts`; `src/common/sealed-box.ts:38-63`
- No data export endpoint. Deletion routes: customers, products, unpaid payment intents, webhooks, KYC receivers, bank accounts and wallets, aliases, plugins, SEP-30 accounts and key halves. None for wallet accounts, wallet backups, consumers, swaps and other on-chain records, pay-ins and payouts, the admin audit log.

### A.3 Cosmos Pay Wallet (CosmosPay-Wallet, `fc0f558`)

Paths are relative to that repository's root. One Astro and React bundle ships as a web app (`https://cosmospay.lat/wallet/`, and a GitHub Pages workflow), a Manifest V3 browser extension (Chrome, Edge, Firefox), a Tauri 2 desktop app and Tauri 2 Android and iOS apps. `README.md:6-8`; `src-tauri/tauri.conf.json:3-5,64-69`; `scripts/build-extension.ts:319-399`; `.github/workflows/deploy-pages.yml`

**Keys and the on-device vault**

- 12-word BIP-39 phrase (`bip39.generateMnemonic(128)`), Stellar key per SEP-5; keys for the other chains from the same phrase. Import of a phrase or an `S...` secret. `src/lib/wallet.ts:9-89`; `src/lib/chainAddresses.ts:38-49,250-253`; `src/lib/chainKeys.ts:13-22`
- Each wallet's `{secret, mnemonic}` is sealed with AES-256-GCM under a key derived from the app password with PBKDF2-HMAC-SHA256 (600,000 iterations, 16-byte salt) and stored at `cosmos.w.<walletId>`. The password must be at least 12 characters. On a passkey device the password is 32 random bytes sealed under the passkey's PRF output (`cosmos.passkey`). The same key seals the account's API keys (`cosmos.pay.<walletId>`). `src/lib/vault.ts:8,46-51,64-67,138-141,338,512-529,579-591`; `src/lib/crypto.ts:204-260`; `src/constants/crypto.ts:25-112`; `src/lib/validate.ts:33`; `src/lib/passkeyUnlock.ts:83-137`
- Store: `tauri-plugin-store` file `cosmos-wallet.json` (desktop and mobile), `storage.local` (extension), `localStorage` (web). The store file is not encrypted as a whole; it holds the sealed boxes and plaintext metadata. `src/lib/storage.ts:4-8,24-35,189-248`
- Excluded from device backups: Android `allowBackup="false"` and `dataExtractionRules`; iOS `NSURLIsExcludedFromBackupKey` (the script notes this is unverified on a real device). `scripts/native-permissions.ts:322-436,536-544`; `src/lib/storage.ts:69-95`
- Biometric unlock (Android, iOS, opt-in): the vault key is wrapped by a key held in Android Keystore or the iOS Keychain behind a biometric check; the app never receives biometric data. `src/lib/deviceAuth.ts:1-30,83-99`
- Unlocked session kept in IndexedDB `cosmos-session` with a non-extractable key until lock or auto-lock (15 minutes, 1 hour, 24 hours by default, or 7 days). `src/lib/sessionKeep.ts:6-62,119-126`; `src/constants/app.ts:67-72`
- Secrets can be shown and copied to the clipboard on the user's tap; the clipboard is not cleared automatically. `src/features/onboarding/Backup.tsx:35`; `src/features/settings/Export.tsx:83-103`; `src/lib/clipboard.ts:13-30`

**Profile and other on-device data**

- `cosmos.wallets` (plaintext): `name`, `birthdate`, `email`, `gender`, `metricsOptIn`, `promoOptIn`, `avatar` (a small image the user picked), public key, `cosmosPayOrgId`, `cosmosPayReceiverId`, `recoveryEmail`, `backupRecoveryEmail`, network addresses. `src/lib/vault.ts:73-131`
- Birthdate and gender are not sent by any request; birthdate drives the 13+ onboarding check and the 18+ check for fiat and Cosmos Pay screens. `src/constants/onboarding.ts:13`; `src/features/fiat/Fiat.tsx:15`; `src/features/cosmospay/CosmosPay.tsx:24`
- `promoOptIn` is stored and never transmitted. (Inventory finding; no sending code found.)
- Preferences and caches: `cosmos.active`, `cosmos.network`, `cosmos.networks`, `cosmos.favs.<id>`, `cosmos.tracked.<id>`, `cosmos.notifySeen`, `cosmos.assets.<network>`, price cache, `cosmos.theme`, `cosmos.lang`, `cosmos.autoLock`, `cosmos.devMode`, `cosmos.devEndpoints`, `cosmos.recoveryOffer.dismissed.<address>`, approved websites `cosmos.dapp.origins`. `src/lib/storage.ts:128-136`; `src/constants/dapp.ts:32,42`; `extension-src/sw.js:26-28`
- Transaction history and balances are in memory only and cleared on lock. `src/state/store.ts:1909-1911`
- No address book. No push notifications. `src/lib/notifications.ts:1-9`

**Sign-in to Cosmos Pay from the wallet**

- Calls go to `{PUBLIC_COSMOS_GATEWAY_URL}{PUBLIC_COSMOS_GATEWAY_ENTRY}/v1/wallet` (defaults `https://api.cosmospay.lat`, `/cosmos-api`) with the shared public key and a random `X-Cosmos-Trace-Id`. `src/lib/endpoints.ts:104-126,228`; `src/constants/backends.ts:24,27`; `src/lib/cosmospay.ts:307,857-859`
- Providers: Authentik (shown as "Cosmos Pay"), Google, GitHub, and an emailed code. `src/constants/signIn.ts:21,51`
- Sent: the email for a code (`/auth/email/start`), OAuth start and claim values, then `/auth/finish` with the Stellar address and a signature over the email and account. Received: email, name, avatar, the account's backups, a session token, the account's API keys. `src/lib/cosmospay.ts:348-502`; `src/lib/signIn.ts:111-172,246-315`
- The email is also sent by the onboarding profile step's code (skippable) and when linking an existing wallet. `src/state/store.ts:2111-2119,2491`; `src/features/onboarding/ProfileSetup.tsx:38-75`
- Kept on the device: name and email in `cosmos.wallets`; the provider's avatar URL is not saved; session and ID tokens in memory only; API keys sealed in `cosmos.pay.<id>`. `src/state/store.ts:1301-1307`; `src/lib/vault.ts:579-611`
- Passkeys: relying party `cosmospay.lat`; the passkey's user name is the email (or the name), saved by the device's passkey manager. `src/constants/passkey.ts:15,28`; `src/lib/passkey.ts:264-275`

**Encrypted cloud backup and email recovery**

- Created when a wallet is created or restored through sign-in, or linked with the password; re-sealed on a password or passkey change. A wallet made with only the 12 words and no sign-in has no cloud backup. `src/state/store.ts:1493-1510,1614-1617,2540-2577`
- Payload: the Stellar secret key, the 12 words (or null), account data. A random data key encrypts it (AES-256-GCM); the data key is sealed per door: password (Argon2id, 64 MiB, 2 passes), passkey (PRF), and a recovery door. `src/lib/cloudBackup.ts:167-190`; `src/lib/crypto.ts:453-465`; `src/constants/crypto.ts:50,67`
- The recovery door: a random 32-byte key split in two (XOR), one half sent with the email to each recovery server (`PUT {sep30Base}/shares/<address>`). It is added whenever the profile has an email and both recovery servers answer; there is no separate switch. `src/lib/backupRecovery.ts:1-76`; `src/state/store.ts:1345-1365,1497-1501,2550`; `src/lib/cosmospay.ts:706-715`
- Default recovery servers: `https://reserv001.cosmospay.lat` and `https://reserv002.cosmospay.lat` (`PUBLIC_COSMOS_RECOVERY_A_URL`, `_B_URL`). `src/constants/backends.ts:38-39`; `src/lib/endpoints.ts:135-172`
- The code states that the two recovery servers together, or someone who controls the inbox and gets both to accept it, can open a backup that has this door. `src/lib/backupRecovery.ts:14-17`
- SEP-30 account recovery (opt-in): registers the account with the email as the only identity on both servers; turning it off deletes the registration on both. `src/lib/recovery.ts:252-325`; `src/lib/cosmospay.ts:604-699,748-759`; `src/state/store.ts:4089-4132,4220-4268`
- Easy recovery (moving to a new device): the phrase or secret is sealed to the new device's key (X25519, HKDF-SHA256, AES-256-GCM) and relayed by the Payments API for 5 minutes behind a 5-digit code. `src/lib/easyRecovery.ts:41-46,141-164`; `src/lib/cosmospay.ts:508-559`; `src/constants/easyRecovery.ts:13,16`

**Network destinations**

- Payments API: swaps (source, recipient and refund addresses, amounts, memo), liquidity (`account`), pay links (destination, amount, asset, memo, message), DeFindex (`account`, `caller`), history. `src/lib/cosmospay.ts:862-1237,1682-1730`; `src/lib/defindex.ts:51-103`
- Horizon (`https://horizon.stellar.org`, testnet, or a custom one the user enters), Friendbot on testnet (`https://friendbot.stellar.org/?addr=<address>`), Solana (`https://api.mainnet-beta.solana.com`), Monad (`https://rpc.monad.xyz`) and testnets. `src/lib/stellar.ts:41-55,404-409`; `src/constants/backends.ts:48-58`
- Balance reads on Home while unlocked send the user's addresses to about 30 public blockchain APIs (for example publicnode.com, mempool.space, api.blockcypher.com, api.blockchair.com, xrplcluster.com, api.trongrid.io, toncenter.com, fullnode.mainnet.aptoslabs.com, api.koios.rest, api.hyperliquid.xyz). `src/constants/networks.ts:186-482`; `src/constants/testnets.ts`; `src/lib/networkBalances.ts:15-17,127-137`; `src/state/store.ts:3091-3127`
- Prices: CoinGecko (`https://api.coingecko.com/api/v3/simple/price`), no user data in the request. `src/lib/stellar.ts:630-657`
- When the user leaves a Stellar memo empty, the wallet writes `Cosmos Wallet v<version>` as the memo, on the public ledger. `src/lib/memo.ts`; `src/constants/app.ts:29,40`
- Websites the user approves receive the public address and the signature and payment requests the user approves. `src/constants/dapp.ts:25`; `public/cosmos-wallet.js:54-142`

**Fiat and KYC (BlindPay, through the Payments API)**

- Form: first and last name, email (prefilled), country (BR, CO, AR, MX, CL, PE, UY), date of birth, tax id, address, city, state, postal code, ID document country and type, front and back photos, selfie. `src/features/fiat/CreateReceiver.tsx:18-52,99-101`; `src/lib/cosmospay.ts:1324-1374`; `src/constants/fiat.ts:11-21`
- Photos taken with the camera or picked from files are uploaded (`/v1/kyc/upload`) and not kept on the device. `src/features/fiat/PhotoStep.tsx:15-46`
- Bank accounts per rail (PIX key and CPF, CLABE, CBU/CVU/alias and CUIT/CUIL, Colombian ACH document and account, Brazil TED, US ACH account and routing), deposit payer details (CUIT; PSE name, document, email, phone), payout data (sender address, signed transaction). `src/features/fiat/BankAccount.tsx:46-60`; `src/constants/fiat.ts:26-74`; `src/lib/cosmospay.ts:1403-1437,1535-1651,1746-1780`

**Diagnostics (first-party, opt-in, off by default)**

- Consent flag `cosmos.telemetry` (`'on'` or absent for off); checkbox `setup.metricsOptIn` unchecked by default; toggle in Settings. `src/constants/telemetry.ts:26-50`; `src/features/onboarding/OptionalConsents.tsx:23-27`; `src/features/settings/Settings.tsx:178-184`
- Sent to `/v1/activity/events`: event type, random event, session and install ids, app version, platform, network, level, category, message, duration, props (screen views, unlock and lock method, wallet created or imported, sign-in failures, payments with asset, amount and transaction hash, swaps, errors with file and line). With the account's API key, events are filed under the organization and a batch carries a signed ownership attestation (address, install id); without an account, address, destination, source, transaction hash, amount and similar props are stripped. `src/lib/telemetry.ts:83-122,295-345,380-464,533-573`; `src/constants/telemetry.ts:85-176`; `src/lib/attestation.ts:24-60`
- The random install id `cosmos.telemetry.device` is created on every launch, also with diagnostics off, and sent only when they are on. The queue holds up to 300 events for at most 6 days; turning diagnostics off drops it. `src/lib/telemetry.ts:228-266,533-544`
- No third-party analytics or crash reporting (no Sentry, Firebase, PostHog or Google Analytics in the code).

**Permissions**

- Android: camera, biometrics. iOS: camera (QR codes, identity documents), Face ID, photo library (QR image, avatar, KYC document), associated domain `webcredentials:cosmospay.lat`. Extension: `storage`, `clipboardRead`, `sidePanel`, host permissions for the services above, a content script on all pages that injects the wallet provider. Web: camera for QR scanning (decoded on the device), clipboard, WebAuthn. No location, microphone, contacts or notifications. `scripts/native-permissions.ts:120-178,278-318,458-490`; `scripts/build-extension.ts:264-267,333-366,387-396`; `src/lib/camera.ts:83-88`

**Consent and legal links**

- `TERMS_URL = 'https://wallet.cosmospay.lat/tos'`, `PRIVACY_URL = 'https://wallet.cosmospay.lat/privacy'`, linked from the Welcome screen ("By continuing, you accept the Terms and Conditions of use and the Privacy Policy"). On 2026-11-01 `wallet.cosmospay.lat` did not resolve. `src/constants/app.ts:43-51`; `src/features/onboarding/Welcome.tsx:61-71`
- The seed-path backup screen's required terms checkbox is not stored or sent. `src/features/onboarding/Backup.tsx:45-53`
- On-screen note `setup.dataNote`: "Your email and date of birth are stored on this device and only used to link your account to Cosmos products when you ask." `src/lib/i18n.ts:462-468`

**Removal**

- Removing a wallet deletes its vault box, biometric envelope, sealed API keys and list entry on the device; some preferences, the telemetry install id and approved websites remain. Nothing is deleted on any server. `src/lib/vault.ts:678-703`; `src/state/store.ts:2029-2040,2261-2290`
- Unlinking Cosmos Pay removes the API keys on the device only. `src/state/store.ts:4968-5000`
- Server-side deletion calls in the wallet: a bank account, and SEP-30 deregistration. `src/lib/cosmospay.ts:748-759,1484-1501`

## Appendix B. Processors and third parties found in the code

"DP" is this repository, "CS" the community server, "W" the wallet; paths are relative to each
repository's root.

| Party | Run by | Receives | Turned on by | Source |
| :--- | :--- | :--- | :--- | :--- |
| Authentik (`auth.cosmospay.lat`) | Cosmos Pay (self-hosted) | sign-up and sign-in data; issues the user's id, email, verified flag, name, picture | `AUTHENTIK_*` (DP), `WALLET_AUTH_OIDC_*`, `RECOVERY_OIDC_*` (CS) | DP `src/lib/auth.ts`; CS `deploy/authentik/wallet-sign-in.yaml` |
| APISIX API gateway | Cosmos Pay (self-hosted) | API keys (stored as given), consumer labels, the wallet account's email, every API request | `APISIX_URL`, `APISIX_ADMIN_KEY` (DP); `APISIX_ADMIN_URL` (CS) | DP `src/utils/apisix.ts`; CS `src/gateway-keys/` |
| Cloudflare | Cloudflare | all traffic to `cosmospay.lat`, `dev.`, `payments.`, `api.`, `auth.` | infrastructure (observed `Server: cloudflare`) | DP `src/lib/geo.ts:5-8`, `src/lib/payments/contact.ts:94-103` |
| Google Analytics 4 | Google | page views, IP, device data, GA cookies | `PUBLIC_GA_ID` (live: `G-DP0DSQMKSQ`) | DP `src/layouts/CosmosLayout.astro:221-228` |
| Google, GitHub (OAuth) | Google, GitHub | sign-in requests; return email, name, avatar, user id | `WALLET_GOOGLE_*`, `WALLET_GITHUB_*`, Authentik sources | CS `src/wallet-auth/wallet-auth-core.ts:114-133` |
| Resend or an SMTP provider | [MAIL PROVIDER] | recipient address and message content | `RESEND_API_KEY` or `SMTP_*` (DP); `MAIL_RESEND_API_KEY` or `MAIL_SMTP_*` (CS) | DP `src/lib/mailer.ts`; CS `src/mailer/mailer.service.ts:58-99` |
| BlindPay | BlindPay | KYC and KYB data, document files, bank details, pay-in and payout data | `blindpay` in `PLUGINS_ENABLED`, `BLINDPAY_*` | CS `src/native-plugins/blindpay/`; DP `src/pages/api/kyc/`; W `src/features/fiat/` |
| NEAR Intents 1Click (`1click.chaindefuser.com`) | NEAR Intents | swap assets and amounts, `recipient`, `refundTo`, deposit address, transaction hash | `NEAR_INTENTS_*` | CS `src/near-intents/near-intents.client.ts:77-126` |
| DeFindex (`api.defindex.io`) | DeFindex | account and `caller` address, amounts, signed transactions | `defindex` in `PLUGINS_ENABLED`, `DEFINDEX_*` | CS `src/native-plugins/defindex/defindex.client.ts:33-99` |
| Jupiter (`lite-api.jup.ag`) | Jupiter | `userPublicKey`, swap parameters | `JUPITER_*` | CS `src/jupiter/jupiter.client.ts:74-123` |
| Kuru (`ws.kuru.io`) | Kuru | `userAddress`, swap parameters | `KURU_*` | CS `src/kuru/kuru.client.ts:52-143` |
| LayerZero Scan | LayerZero | message id or transaction hash | always for USDT0 | CS `src/usdt0/usdt0.constants.ts:131` |
| Stellar Horizon and Soroban RPC | defaults: Stellar Development Foundation (`horizon.stellar.org`, `soroban-testnet.stellar.org`), Gateway.fm (`soroban-rpc.mainnet.stellar.gateway.fm`) | addresses, transactions; IP of the browser or app when called from the client | `STELLAR_*` (CS), user setting (W) | CS `src/config/config.constants.ts:23-58`; DP `src/lib/payments/payment-link.ts:180-206`; W `src/lib/stellar.ts:41-55` |
| Solana and Monad RPC | defaults `api.mainnet-beta.solana.com`, `rpc.monad.xyz` and testnets | addresses, transactions | `SOLANA_RPC_*`, `MONAD_RPC_*` (CS); `PUBLIC_SOLANA_*`, `PUBLIC_MONAD_*` (W) | CS `src/config/config.constants.ts:33-64`; W `src/constants/backends.ts:48-58` |
| About 30 public blockchain APIs for other networks' balances | various (publicnode.com, mempool.space, blockcypher.com, blockchair.com, trongrid.io, toncenter.com and others) | the user's addresses, IP | wallet unlocked on Home | W `src/constants/networks.ts:186-482`; `src/lib/networkBalances.ts` |
| Stellar Friendbot | Stellar Development Foundation | address (testnet funding) | testnet only | W `src/lib/stellar.ts:404-409` |
| CoinGecko | CoinGecko | price request, IP | always in the wallet | W `src/lib/stellar.ts:630-657` |
| flagcdn.com | Flagpedia | IP (flag images) | dashboard Fiat form (switched off) | DP `src/components/cosmos/dashboard/components/CountryFlag.tsx` |
| jsDelivr | jsDelivr | IP (Swagger UI files) | `/swagger` with `API_DOCS_ENABLED` (off in production) | DP `src/pages/swagger.astro:29-34` |
| Merchants' webhook URLs | the merchant | event payloads (full payment, swap and liquidity records) | merchant configuration | CS `src/webhooks/webhook-dispatcher.service.ts` |
| Third-party plugins | plugin authors | what the plugin sends to hosts in its manifest | slugs in `PLUGINS_ENABLED` (empty by default) | CS `src/plugins/plugin-http.client.ts:37-51` |
| MaxMind GeoLite2 | none at runtime (local file) | nothing | `MAXMIND_DB_PATH` | DP `src/lib/geoip.ts` |
| ipapi.co | ipapi | the server's own address, development only | requests from a private address | DP `src/lib/geoip.ts:57-90` |
| GitHub Pages | GitHub | wallet web app visitors' requests | `.github/workflows/deploy-pages.yml` [VERIFY: whether it is a public deployment] | W |
| App and extension stores | Apple, Google, Microsoft, Mozilla | per their own terms | [VERIFY: where the wallet is published] | W `scripts/build-extension.ts`, `src-tauri/` |

## Appendix C. Placeholders the owner must fill

**Identity and contacts**

- `[LEGAL ENTITY]`: legal name and form of the company that operates Cosmos Pay.
- `[REGISTRATION NUMBER]`: for example the CUIT or company registration.
- `[ADDRESS]`: registered address.
- `[DPO/CONTACT]`: the privacy contact (the current Terms use `organization@cosmospay.lat`).
- `[EU/UK REPRESENTATIVE, IF NEEDED]`, `[LGPD ENCARREGADO, IF NEEDED]`: only if counsel says so.
- `[SUPERVISORY AUTHORITY]`: where users can complain.
- `[GOVERNING LAW]`.
- `[EFFECTIVE DATE]`.

**Facts outside the code**

- `[HOSTING PROVIDER]` and the servers' location (a comment in `src/lib/mailer.ts` mentions OVH as an example; confirm).
- `[MAIL PROVIDER]`: which transport production uses, for the developer platform and the community server.
- `[RECOVERY SERVER OPERATORS]`: who runs `reserv001.cosmospay.lat` and `reserv002.cosmospay.lat`.
- Every `[VERIFY: ...]` in Part 1: Google Analytics property settings; Cloudflare location headers and cookies; Authentik's stored data, cookies and event-log retention; whether fiat services are live; server, nginx and Cloudflare log locations and retention; the production values of the retention variables; the iOS backup exclusion; the wallet's minimum-age check on every setup path.

**Decisions**

- `[CONFIRM: product owner]`: that personal data is not used for advertising and not sold.
- `[DECISION: promotional communications]`: the wallet collects a news-and-offers answer that nothing sends today.
- `[DECISION: org deletion scope]`: whether deleting an organization should also delete its Payments API records and API keys.
- `[ACCOUNT DELETION PROCESS]`: how deletion requests are handled while there is no self-service deletion.

**Retention periods the code does not set**

- `[RETENTION: platform accounts]`, `[RETENTION: expired sessions]`, `[RETENTION: notifications, support]`, `[RETENTION: invitations]`
- `[RETENTION: contact email]` (the team's mailbox)
- `[RETENTION: merchant data]`, `[RETENTION: transaction records]`, `[RETENTION: delivery records]`
- `[RETENTION: wallet accounts and backups]`, `[RETENTION: recovery data]`
- `[RETENTION: KYC and fiat records, legal minimums]`, `[RETENTION: legal minimums]`
- `[RETENTION: audit log]`, `[RETENTION: infrastructure logs]`, `[RETENTION: Google Analytics setting]`
- Also without a period in code, not yet in the Part 1 table: `[RETENTION: retired wallet tables]`, the copies of wallet backups, sign-in and recovery records still in this repository's database (`wallet_backup` and the others in Appendix A.1) until their export is imported on the community server and the tables are dropped.

**For counsel**

- `[CONTROLLER/PROCESSOR ROLE]`, `[LEGAL BASIS FOR EACH PURPOSE]`, `[LEGAL OBLIGATIONS]`, `[LEGAL DISCLOSURES]`, `[INTERNATIONAL TRANSFERS]`, `[INCIDENT RESPONSE AND NOTIFICATION]`, `[OTHER RIGHTS]`, `[RESPONSE TIME]`, `[MINIMUM AGE]`, `[NOTICE OF MATERIAL CHANGES]`.

## Appendix D. Topics for counsel

These are questions the inventory raised. They are listed without conclusions.

**Frameworks to assess**

1. **Argentina, Law 25.326** (and its regulations): whether the databases above must be registered
   with the national authority; the information to give at the point of collection; consent and
   its form; international transfers (Cloudflare, Google, the mail provider, BlindPay, NEAR
   Intents and others in Appendix B); response times for access, rectification and deletion
   requests; the treatment of identity documents and selfies.
2. **GDPR (EU) and UK GDPR:** whether they apply (the sites are published in German and French
   among seven languages, and nothing restricts sign-up by country); if so: legal bases,
   representative, processor agreements, transfers, records of processing, a data protection
   impact assessment for identity verification, breach notification.
3. **Brazil, LGPD:** the sites are in Portuguese and the fiat flows support PIX, TED and CPF/CNPJ;
   legal bases, the encarregado, transfers.
4. **Other countries the code reaches:** the wallet's identity-verification form offers Brazil,
   Colombia, Argentina, Mexico, Chile, Peru and Uruguay, with their payment rails (PSE, SPEI,
   transfers).
5. **Cookies and analytics consent:** Google Analytics loads without a banner on the company site
   and on signed-in platform pages; no Consent Mode call exists. On those pages the addresses it
   receives can carry an invitation token, organization and record ids, and dashboard search terms
   (Appendix A.1, "Google Analytics").
6. **Anti-money-laundering record keeping** for identity and fiat records, and how it interacts
   with deletion requests.
7. **Role toward merchants' data** (customers, payers, webhooks): whether merchants need a data
   processing agreement with Cosmos Pay.
8. **Children:** the Terms allow the wallet from 13; whether that age works in each target country.
9. **Blockchain data:** addresses and memos are public and immutable; the wallet writes its own
   name and version as the memo when the user leaves it empty.
10. **Sensitive or special data:** selfies and identity document photos.

**Facts the policy has to reckon with**

1. **The email-recovery door makes the backup openable by Cosmos Pay's servers together** (Part 1,
   3.8.3; Appendix A.2 and A.3). It is added automatically when the profile has an email. The
   current Terms (section 2) say the opposite.
2. **No self-service account deletion** on the platform; deleting an organization does not delete
   its Payments API records or API keys; removing a wallet deletes nothing on the servers; there is
   no deletion route for wallet accounts, wallet backups, consumers, transactions, pay-ins and
   payouts or the audit log; there is no data export.
3. **Many items have no retention period in code** (Appendix C).
4. **Terms acceptance is not recorded:** the platform's onboarding checkbox and the wallet's
   backup checkbox are not stored, and the wallet's Welcome screen accepts the Terms and the
   Privacy Policy "by continuing".
5. **The wallet links `https://wallet.cosmospay.lat/privacy`** (`src/constants/app.ts:43-51`
   there), which did not resolve on 2026-11-01. Wherever this policy is published, the wallet's
   link and the Terms need to point at it.
6. **Security facts a policy should not overstate:** the OAuth tokens in the platform's `account`
   table, the API keys in the gateway, the KYC dossiers and bank details, the webhook secrets and
   the recovery key halves are stored without application-level encryption; codes are hashed with
   unsalted SHA-256; server console logs include full request addresses with their parameters,
   some emails and wallet addresses, with no retention set in code.
7. **Payment alias emails are never verified**, and aliases are a public lookup directory.
8. **Retired wallet tables** in this repository's database still hold encrypted seed backups,
   emails and recovery data until their export is imported elsewhere and the tables are dropped.
9. **Store and app declarations:** the wallet's iOS privacy manifest declares no collected data and
   the Firefox add-on declares no required data collection, while the app sends emails,
   identity-verification data and, if enabled, diagnostics (W `scripts/native-permissions.ts:453-469`;
   `scripts/build-extension.ts:247-251,387-396`). App store privacy labels need the same review.
10. **Incident handling:** the policy has no incident or breach-notification wording; counsel
    should decide what it needs.

## Appendix E. Where the current Terms and other public texts disagree with the code

The Terms (`src/lib/site/terms.ts`, rendered at `cosmospay.lat/tos`) say, in English and Spanish:

1. **Section 2:** "The wallet generates and encrypts your keys locally on your device. We never
   receive, store or can recover your recovery phrase, secret key or password." The wallet uploads
   an encrypted backup of the phrase and secret key after sign-in, and the email-recovery door lets
   the three Cosmos Pay servers together, or whoever controls the email, open it (A.2, A.3).
2. **Section 8:** "The email is sent to us only if you opt in to create/link a Cosmos Pay account."
   Signing in sends it, and so does the onboarding profile step's code (skippable) (A.3).
3. **Section 8:** "Anonymous usage metrics ... are strictly opt-in." The wallet's diagnostics are
   opt-in, but when signed in they are linked to the account and address, and every event is
   stored with the IP address and user agent (A.2, A.3). The dashboard's usage reports are not
   opt-in and are linked to the account (A.1).
4. **Section 8:** "promotional communications are strictly opt-in." The wallet collects the answer;
   nothing sends promotions (A.3).
5. **Section 8:** "KYC data is processed by the fiat partner, not by us." The Payments API stores
   the full submission, Cosmos Pay reviews it before it reaches BlindPay, and staff accounts can
   read identity-verification records (A.1, A.2).
6. **Section 1** lists the contact `organization@cosmospay.lat` and no legal entity.

The About page (`cosmospay.lat/about`, the `about` block of `src/lib/i18n/messages/*.ts`, line
766 in `en.ts`) says "We hold no private keys" and "Cosmos Pay never asks for or stores anyone’s
private keys." The Payments API stores the wallet's encrypted backups of the secret key and
recovery phrase, and with the email-recovery door the Cosmos Pay servers together can open them
(item 1). Whether "stores" covers an encrypted backup is for the owner and counsel to decide.

Other texts in the wallet repository that disagree with its code (reported for completeness; they
are not part of this policy): `STORE_LISTING.md` and `README.md` give PBKDF2 210,000 iterations
(code: 600,000), a 5-minute auto-lock (code: 24 hours by default), `localStorage` for the extension
(code: `storage.local`), "No secrets are stored here" for the extension's storage, email sent only
on opt-in linking, and recovery only with the phrase (the email recovery door exists). The
on-screen note `setup.dataNote` says the email is used only to link an account "when you ask",
while the default profile step sends it for a code.
