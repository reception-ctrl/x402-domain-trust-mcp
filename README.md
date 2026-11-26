# x402-domain-trust-mcp

Model Context Protocol (MCP) server for **Domain & DNS Trust** auditing and **SSRF-safe HTTP Redirect Chain Inspection**, backed by [x402](https://www.x402.org/) USDC micropayments on Base and Solana.

- **npm Package:** [`x402-domain-trust-mcp`](https://www.npmjs.com/package/x402-domain-trust-mcp)
- **Official MCP Registry:** `io.github.reception-ctrl/x402-domain-trust`
- **Live x402 Backend API:** `https://x402-domain-trust.onrender.com`

## Tools Included

| Tool Name | Endpoint | Price | Description |
| :--- | :--- | :--- | :--- |
| `check_domain_trust` | `GET /api/v1/domain-trust` | **$0.01** USDC | Audits SPF, DMARC, MX, CAA, DNSSEC, TLS, and phishing/typosquatting signals for a single domain. |
| `batch_check_domain_trust` | `POST /api/v1/domain-trust/batch` | **$0.05** USDC | Evaluates up to 10 root domains in parallel in a single request. |
| `inspect_url_redirects` | `GET /api/v1/url-inspect` | **$0.01** USDC | Safely unshortens and traces HTTP redirect chains (up to 10 hops) without executing JavaScript, scoring each hop. |

## Quickstart (Claude Desktop / Cursor / Cline)

Add the following to your MCP client configuration (`claude_desktop_config.json` or `.cursor/mcp.json`) using a dedicated hot wallet funded with USDC on **Base Mainnet** (`EVM_PRIVATE_KEY`) or **Solana Mainnet** (`SOLANA_PRIVATE_KEY`):

```json
{
  "mcpServers": {
    "domain-trust": {
      "command": "npx",
      "args": ["-y", "x402-domain-trust-mcp"],
      "env": {
        "EVM_PRIVATE_KEY": "0xYOUR_BASE_MAINNET_PRIVATE_KEY",
        "MAX_PAYMENT_USD": "0.10"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `EVM_PRIVATE_KEY` | Optional* | — | Hex private key (`0x...`) for a Base Mainnet (`eip155:8453`) wallet holding USDC. |
| `SOLANA_PRIVATE_KEY` | Optional* | — | Base58 private key for a Solana Mainnet wallet holding SPL USDC. |
| `MAX_PAYMENT_USD` | Optional | `0.10` | Safety cap on the maximum USDC amount paid per single request. |
| `DOMAIN_TRUST_API_URL` | Optional | `https://x402-domain-trust.onrender.com` | Base URL for the Domain & DNS Trust x402 API. |

*\*At least one wallet key (`EVM_PRIVATE_KEY` or `SOLANA_PRIVATE_KEY`) is required to authorize x402 USDC micropayments.*

## Jurisdiction & Compliance

This service is operated from the United States and is not available to persons or entities located in, or organized under the laws of, U.S.-sanctioned jurisdictions (including Cuba, Iran, North Korea, Syria, and the Crimea, Donetsk, and Luhansk regions) or individuals/wallets listed on the U.S. Treasury OFAC Specially Designated Nationals (SDN) list.
