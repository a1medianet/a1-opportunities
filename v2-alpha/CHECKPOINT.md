# A1 Opportunities V2 — checkpoint 2026-11-25
## Verified scope
- V1 remains at opps.a1net.tech; independent Alpha published at ref.a1net.tech.
- Local V2 source: a1-opportunities-v2-lab; this directory contains a sanitized source snapshot, not production data.
- 18 unit tests (5 commission, 7 provisioning, 6 foundation), 6 HTTP smoke checks and 1 backup/restore scenario passed in prior execution. Re-run locally with Node 24: node --test commission.test.mjs provision.test.mjs foundation.test.mjs; node alpha-smoke.mjs; node backup-smoke.mjs.
- Alpha deployment verified healthy and HTTPS reachable; unauthenticated administration returned 401 as intended. User confirmed access visually. Container image a1-opportunities-v2:alpha-20261125. No V1 migration.
- Alpha is a minimal administrative prototype, not a commercial release. It supports organization, campaign, ambassador records and campaign activation. The provisioning and commission cores are not wired into the UI; provider integrations are simulated. The backup test is not an administrative restore feature.
## Product decisions
- NAWA Way, A1 First, Evidence First, One-Click Stage Gate. Independent input/output service boundaries, future Shikteer integration.
- Multi-organization and multi-campaign; campaign-specific brand, terms acceptance/version, ambassador membership and referral, tenant-scoped RBAC and audit. Preserve first attribution and historical rights when suspended; route suspended referrals to public campaign without new credit.
- Campaign builder: purpose, identity, multilingual content, audience, registration, destination, dates, terms, commercial agreement, media, preview and approval. Campaign clone excludes personal and financial records.
- Ambassador self-service: read campaign, accept terms, register/verify, activate, obtain immutable short link and matching QR, approved static and motion assets, captions, hashtags, marketing advice, channels, activity and statements.
- A1 GO owns links/QR; A1 Content owns creative templates/rendering; A1 Engage supports communication; future A1 Count, Billing, Mail, Recover adapters. Only QR and short URL personalized; no change to approved creative. 1080x1080, 1080x1920, 1080x1350. PNG/JPG, MP4/GIF; verify decoded QR. Share selected channels via native share or download/copy; direct publishing only with official supported permissions. No social passwords or unsupported WhatsApp group membership claims.
- Analytics: distinguish visits, clicks, registrations, verified WhatsApp joins, confirmed paid subscriptions; timestamp each; bar ranking and date filters; export. Confirmed conversion requires organizer/payment evidence. Commission contract version, integer minor units, platform/ambassador split, immutable ledger, approvals, payouts, reversals and reconciliation; no double credit or automatic earnings from clicks. No fixed universal ambassador percentage.
- Commercial UI: independent sections, RTL/English, responsive, role-based dashboard, campaign wizard, ambassador portal, analytics, finance, media, sharing, settings and backup/restore. Competitive review before major feature decisions; reference FirstPromoter, Referral Rock, Viral Loops, Tapfiliate, ArabClicks, impact.com, PartnerStack, Bitly and relevant official publishing platforms. Competitive claims require verification.
## Next gate
- Replace temporary basic auth with proper login, rotate temporary credential, enforce authorization and rate limits.
- Build real administrative and ambassador interfaces, durable idempotency and ledger; implement actual scoped GO/Content interfaces (GO v1 currently health-only, Content rendering contract unverified).
- Add real media generation and sharing, timestamps and analytics, admin backup/restore, tests for production-safe migrations, security and recovery, then separate pilot. Commercial NO-GO.
- V1 suspended-link fallback and CSV production admin test remain separately unverified. Do not touch live campaign while iterating V2.
- Never publish secrets, customer data, databases, private backups, infrastructure credentials or environment files. This source checkpoint is not a database backup.
