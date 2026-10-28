# 13 — Architectural Design Decisions & Technical Trade-offs

This document records the foundational architectural decisions, alternatives evaluated, technical trade-offs, and rationales governing MessMate's implementation.

---

## Decision 1: Next.js 16 App Router Monolith vs. Decoupled Architecture

| Dimension | Monolith (Next.js 16 App Router) | Decoupled (React SPA + Express / FastAPI) |
| :--- | :--- | :--- |
| **Type Safety** | End-to-end TypeScript sharing between DB types & UI | Manual OpenAPI code generation or duplicated types |
| **Deployment** | Single deploy artifact (Vercel / Node server) | Two distinct deployment targets, CORS configuration |
| **Build Guardrails** | Built-in `import "server-only"` secret isolation | Requires lint rules or network security boundaries |
| **Cold Starts** | Unified serverless / edge runtime execution | Independent service scaling |

- **Choice:** **Unified Next.js 16 App Router Monolith**.
- **Rationale:** For campus hackathons, placements, and rapid iteration, a single repository with unified TypeScript types eliminates API drift, simplifies deployment, and accelerates feature delivery.
- **Trade-off:** Server-side route handlers share runtime memory with SSR processes; under extreme load, separating heavy computation to independent workers might become necessary.

---

## Decision 2: Web Crypto HMAC-SHA256 vs. Asymmetric RSA / ECDSA Signatures

| Dimension | Symmetric HMAC-SHA256 | Asymmetric ECDSA (e.g. secp256k1) |
| :--- | :--- | :--- |
| **Computation Speed** | Sub-millisecond ($<0.05\text{ms}$) | $1.5\text{ms} - 5\text{ms}$ per signature verify |
| **Key Management** | Single shared server secret (`HMAC_SECRET`) | Public/private key pair (Public key distributable) |
| **Payload Size** | Compact 64-hex char signature | Larger ASN.1 / DER signature encoding |
| **Offline Verification** | Requires secret on terminal (security risk if untrusted) | Can verify offline using public key only |

- **Choice:** **HMAC-SHA256 via Web Crypto API**.
- **Rationale:** High throughput in dining queues is paramount. HMAC-SHA256 executes orders of magnitude faster with minimal CPU overhead on budget Android counter tablets.
- **Trade-off:** In a distributed offline architecture with untrusted staff devices, sharing `HMAC_SECRET` is unsafe. For production multi-campus deployments, migrating to ECDSA (where terminals store only the public key) would be preferred.

---

## Decision 3: IndexedDB (`idb`) vs. `localStorage` vs. Service Worker Cache

| Dimension | IndexedDB (`idb`) | `localStorage` | Cache Storage API |
| :--- | :--- | :--- | :--- |
| **Execution** | Asynchronous, non-blocking | Synchronous, blocks main thread | Asynchronous |
| **Capacity** | $50\text{MB} - 1\text{GB}+$ | Strict 5MB ceiling | High |
| **Data Types** | Structured JSON, objects, blobs | String-only serialization | HTTP Request/Response pairs |
| **Concurrency** | Transactional, durable | Prone to corruption across tabs | Request cache only |

- **Choice:** **IndexedDB via `idb` library**.
- **Rationale:** Counter scanning requires rapid camera frame processing (60fps). `localStorage` string serialization blocks the UI thread, causing camera stutter. IndexedDB provides transactional, non-blocking storage capable of buffering thousands of scans.

---

## Decision 4: PostgreSQL Atomic Compare-And-Swap (CAS) vs. Redis Distributed Lock

| Dimension | SQL Atomic CAS (`UPDATE ... WHERE`) | Redis Redlock |
| :--- | :--- | :--- |
| **Infrastructure** | Zero extra dependencies (Native PostgreSQL) | Requires separate Redis cluster / Upstash |
| **Round Trips** | Single atomic SQL query (`RETURNING id`) | Acquire lock $\to$ DB Query $\to$ Release lock |
| **Failure Modes** | Transaction aborts cleanly on DB crash | Stale locks, clock drift issues in Redlock |
| **Scale Limit** | High (tens of thousands of tx/sec on RDS) | Ultra-high ($100,000+\text{ locks/sec}$) |

- **Choice:** **PostgreSQL Atomic CAS Query**.
- **Rationale:** Since the `meal_bookings` record already resides in PostgreSQL, executing `UPDATE ... WHERE status IN ('LOCKED', 'OPTED_IN') RETURNING id` guarantees absolute serialization without the latency or operational cost of managing a secondary Redis cluster.

---

## Decision 5: Pure Functional Domain Calculations vs. Database Stored Procedures

| Dimension | Pure TypeScript Functions (`lib/rebates.ts`) | PostgreSQL PL/pgSQL Stored Procedures |
| :--- | :--- | :--- |
| **Testability** | Unit testable in Node.js in 5ms (`npm test`) | Requires running database engine & test harness |
| **Maintainability** | Standard Git version control & linting | SQL migration versioning overhead |
| **Portability** | Usable on client, server, and edge | Vendor-locked to PostgreSQL |

- **Choice:** **Pure Domain Functions in `lib/rebates.ts` and `lib/menus.ts`**.
- **Rationale:** Decoupling business logic from the database engine enables 67 automated assertions to execute in under a second without spinning up local PostgreSQL instances.

---

## Decision 6: In-Memory Virtual Clock (`lib/server-clock.ts`) vs. External NTP Mocking

- **Context:** Verifying time-sensitive cutoffs (e.g. 08:30 AM lock) and 30s token rotations requires manipulating current time during evaluations and automated testing.
- **Choice:** **In-Memory Virtual Server Clock with configurable time offsets**.
- **Trade-off:** In a distributed multi-node cluster, in-memory clock offsets would not synchronize across independent instances. However, for demonstrations, single-node evaluation, and local testing, it provides instant, zero-risk time travel without altering host system clocks.

---

## Decision 7: Client-Side Demo Profiles vs. Production OAuth2 SSO

- **Context:** Hackathon judges and academic evaluators need to switch between Student, Staff, and Admin roles in under two seconds without creating Google accounts or navigating institutional SSO portals.
- **Choice:** **Demo Profile Switcher in `/login` backed by signed session tokens**.
- **Trade-off:** Lacks multi-factor authentication and enterprise password policies, but delivers an optimal, zero-friction demonstration UX. The architecture isolates this via `lib/server-auth.ts`, allowing OAuth/SAML to be plugged in seamlessly.

---

## Decision 8: Tailwind CSS v4 Utility Architecture vs. CSS-in-JS

- **Choice:** **Tailwind CSS v4 with custom theme tokens**.
- **Rationale:** Zero runtime JavaScript overhead, instant style compilation, and consistency across responsive breakpoints.
- **Trade-off:** HTML classes can become lengthy, but this is mitigated by extracting reusable component primitives (`MealStatusBadge`, `KitchenMetricCards`).

---

## Decision 9: Native Node.js Test Runner vs. Jest / Vitest

- **Choice:** **Native Node.js Test Execution (`tests/full-lifecycle.test.mjs`)**.
- **Rationale:** Jest frequently clashes with Next.js ESM module resolution and TypeScript path aliases (`@/`). Native Node.js execution runs with zero external packages, zero config files, and executes in $<200\text{ms}$.

---

## Decision 10: 30-Second Rolling Windows vs. One-Time Scannable Tokens

- **Context:** How to prevent students from sharing meal passes over messaging apps.
- **Choice:** **30-Second Rolling Cryptographic QR Passes**.
- **Rationale:** One-time static codes can still be used if a friend immediately scans the screenshot before the legitimate student enters. A 30-second rolling window drastically tightens the interception window, making remote forwarding virtually unusable in practice.
