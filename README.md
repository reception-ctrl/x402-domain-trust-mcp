# x402-domain-trust-mcp

Model Context Protocol (MCP) server for **Domain & DNS Trust** auditing and **SSRF-safe HTTP Redirect Chain Inspection**, backed by [x402](https://www.x402.org/) USDC micropayments on Base and Solana.

## Tools Included

| Tool Name | Endpoint | Price | Description |
| :--- | :--- | :--- | :--- |
| `check_domain_trust` | `GET /api/v1/domain-trust` | Free (3/day per IP), then **$0.01** USDC | Audits SPF, DMARC, MX, CAA, DNSSEC, TLS, and phishing/typosquatting signals for a single domain. |
| `batch_check_domain_trust` | `POST /api/v1/domain-trust/batch` | **$0.05** USDC | Evaluates up to 10 root domains in parallel in a single request. |
| `inspect_url_redirects` | `GET /api/v1/url-inspect` | **$0.01** USDC | Safely unshortens and traces HTTP redirect chains (up to 10 hops) without executing JavaScript, scoring each hop. |

## Quickstart (Claude Desktop / Cursor / Cline)

Add the following to your MCP client configuration (`claude_desktop_config.json` or `.cursor/mcp.json`).

### Free Trial Mode (No Wallet Required — 3 Domain Checks/Day)
```json
{
## Jurisdiction & Compliance
This service is operated from the United States and is not available to persons or entities located in, or organized under the laws of, U.S.-sanctioned jurisdictions (including Cuba, Iran, North Korea, Syria, and the Crimea, Donetsk, and Luhansk regions) or individuals/wallets listed on the U.S. Treasury OFAC Specially Designated Nationals (SDN) list.
  "mcpServers": {
    "domain-trust": {
      "command": "npx",
      "args": ["-y", "x402-domain-trust-mcp"]
    }
  }
}
