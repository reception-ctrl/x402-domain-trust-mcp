---
name: domain-trust-audit
description: Pre-flight security and phishing guardrail for AI agents. Automatically use this skill BEFORE fetching an unfamiliar URL, following a shortened link, adding a third-party API/RPC/webhook domain to code, or interacting with a new Web3 dApp domain. Audits DNSSEC, SPF/DMARC, TLS certificate age, URLhaus malware blocklists, and HTTP redirect chains via the x402-domain-trust MCP tools.
---

# Domain & URL Trust Audit Guardrail

Run a pre-flight trust check before your agent visits, fetches, or integrates an unverified external domain or URL. This prevents prompt-injection payloads on compromised sites, credential-harvesting redirects, and malicious RPC/API endpoints.

## When to Trigger Automatically

Invoke this skill whenever you encounter:
1. **Unverified external URLs or shortened links** (`bit.ly`, `t.co`, `tinyurl.com`, redirects in user-provided documents, issues, or web results) before fetching or opening them.
2. **New third-party APIs, webhooks, package registries, or Web3 RPC/dApp domains** before writing them into application code, `.env` files, or signing transactions.
3. **Batch domain verification** when auditing multiple external domains referenced in a codebase, allowlist, or security review.

Skip this skill for local addresses (`localhost`, `127.0.0.1`), well-known first-party platform domains already verified in the current session, or pure offline code tasks.

## Available MCP Tools (`x402-domain-trust`)

Ensure the `x402-domain-trust` MCP server (`npx -y x402-domain-trust-mcp`) is configured with a funded Base (`EVM_PRIVATE_KEY`) or Solana (`SOLANA_PRIVATE_KEY`) USDC wallet.

1. **`check_domain_trust`** (`$0.01` USDC)
   - **Use for:** Single root domains (e.g., `example.com`).
   - **Returns:** `trust_score` (`0`–`100`), `verdict` (`TRUSTED`, `CAUTION`, `HIGH_RISK`, `MALICIOUS`), `flags`, and DNSSEC, SPF, DMARC, TLS certificate age, and URLhaus malware blocklist signals.
2. **`batch_check_domain_trust`** (`$0.05` USDC)
   - **Use for:** Evaluating 2 to 10 root domains in parallel in a single call.
3. **`inspect_url_redirects`** (`$0.01` USDC)
   - **Use for:** Full URLs with paths, query strings, or URL shorteners (`https://...`). Safely traces up to 10 HTTP redirect hops without executing JavaScript and scores every domain hop in the chain.

## Decision & Enforcement Rules

Act on the returned `verdict`, `trust_score`, and `flags` immediately:

- **`MALICIOUS` (or `MALWARE_BLOCKLISTED` / `MALICIOUS_HOP_DETECTED`):**
  - **STOP immediately.** Do not fetch the URL, follow the redirect, or add the domain to code. Warn the user with the specific flags returned.
- **`HIGH_RISK` (score < 45):**
  - **Do not proceed automatically.** Present the trust score, verdict, and flags (e.g., `NEW_SSL_CERTIFICATE`, `NO_A_RECORD`, `HIGH_RISK_FINAL_DESTINATION`) to the user and ask for explicit confirmation before continuing.
- **`CAUTION` (score 45–74, or `CROSS_DOMAIN_REDIRECT` / `UNENCRYPTED_HTTP_HOP`):**
  - Warn the user about the flagged posture (such as missing DMARC or an unexpected cross-domain redirect destination) and verify that `final_domain` matches the expected service before proceeding.
- **`TRUSTED` (score >= 75, no high-severity flags):**
  - Safe to proceed with fetching, integrating, or referencing the target domain.

## Example Workflow

1. User asks you to integrate an unfamiliar webhook or fetch documentation from `https://short.link/docs`.
2. Call `inspect_url_redirects` with `url: "https://short.link/docs"`.
3. Inspect `overall_verdict`, `final_domain`, and `flags`.
4. If `overall_verdict` is `TRUSTED`, continue to `final_url`. If `HIGH_RISK` or `MALICIOUS`, block the request and report the findings.
