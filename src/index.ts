#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { base58 } from "@scure/base";

const API_BASE_URL = (
  process.env.DOMAIN_TRUST_API_URL || "https://x402-domain-trust.onrender.com"
).replace(/\/+$/, "");

const MAX_PAYMENT_USD = Number(process.env.MAX_PAYMENT_USD || "0.10");
const MAX_PAYMENT_BASE_UNITS = BigInt(Math.round(MAX_PAYMENT_USD * 1_000_000));

async function buildPaymentClient() {
  const evmKey = process.env.EVM_PRIVATE_KEY?.trim();
  const svmKey = process.env.SOLANA_PRIVATE_KEY?.trim();

  if (!evmKey && !svmKey) {
    return {
      fetchFn: fetch,
      httpClient: null as x402HTTPClient | null,
      walletConfigured: false,
    };
  }

  const client = new x402Client();

  client.registerPolicy((_version, requirements) =>
    requirements.filter((req) => BigInt(req.amount) <= MAX_PAYMENT_BASE_UNITS)
  );

  if (evmKey) {
    const normalizedEvmKey = (
      evmKey.startsWith("0x") ? evmKey : `0x${evmKey}`
    ) as `0x${string}`;
    const evmSigner = privateKeyToAccount(normalizedEvmKey);
    client.register("eip155:*", new ExactEvmScheme(evmSigner));
  }

  if (svmKey) {
    const svmSigner = await createKeyPairSignerFromBytes(base58.decode(svmKey));
    client.register("solana:*", new ExactSvmScheme(svmSigner));
  }

  return {
    fetchFn: wrapFetchWithPayment(fetch, client),
    httpClient: new x402HTTPClient(client),
    walletConfigured: true,
  };
}

function formatApiResponse(
  res: Response,
  bodyText: string,
  httpClient: x402HTTPClient | null,
  walletConfigured: boolean
) {
  let parsed: unknown = bodyText;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    // Keep raw text if response is non-JSON
  }

  let settlement: unknown = null;
  if (httpClient) {
    try {
      settlement = httpClient.getPaymentSettleResponse((name) =>
        res.headers.get(name)
      );
    } catch {
      // No settlement header present (free trial tier call)
    }
  }

  if (res.status === 402 && !walletConfigured) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: "Payment Required (HTTP 402)",
              message:
                "Free daily trial quota exhausted or endpoint requires x402 USDC payment ($0.01-$0.05). Set EVM_PRIVATE_KEY (Base USDC) or SOLANA_PRIVATE_KEY (Solana USDC) in your MCP server environment to enable automatic micropayments.",
              paymentRequirements: parsed,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  if (!res.ok) {
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              error: `Upstream API returned HTTP ${res.status}`,
              details: parsed,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  const output = settlement ? { data: parsed, x402Settlement: settlement } : parsed;

  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(output, null, 2),
      },
    ],
  };
}

async function main() {
  const { fetchFn, httpClient, walletConfigured } = await buildPaymentClient();

  const server = new McpServer({
    name: "x402-domain-trust-mcp",
    version: "1.0.0",
  });

  server.tool(
    "check_domain_trust",
    "Evaluate a domain's trustworthiness, phishing/typosquatting risk, DNS security posture (SPF, DMARC, MX, CAA, DNSSEC), and TLS status. Includes 3 free daily calls per IP, then $0.01 USDC via x402 (Base or Solana).",
    {
      domain: z
        .string()
        .min(1)
        .describe("Root domain or hostname to audit (e.g., 'stripe.com')."),
    },
    async ({ domain }) => {
      const url = `${API_BASE_URL}/api/v1/domain-trust?domain=${encodeURIComponent(
        domain.trim()
      )}`;
      const res = await fetchFn(url, { method: "GET" });
      const text = await res.text();
      return formatApiResponse(res, text, httpClient, walletConfigured);
    }
  );

  server.tool(
    "batch_check_domain_trust",
    "Evaluate up to 10 domains in parallel for DNS security (SPF, DMARC, MX, CAA, DNSSEC), typosquatting, and phishing risk in a single request ($0.05 USDC via x402 on Base or Solana).",
    {
      domains: z
        .array(z.string().min(1))
        .min(1)
        .max(10)
        .describe("List of 1 to 10 domains to evaluate in parallel."),
    },
    async ({ domains }) => {
      const url = `${API_BASE_URL}/api/v1/domain-trust/batch`;
      const res = await fetchFn(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains }),
      });
      const text = await res.text();
      return formatApiResponse(res, text, httpClient, walletConfigured);
    }
  );

  server.tool(
    "inspect_url_redirects",
    "Safely unshorten and trace HTTP redirect chains (up to 10 hops) without executing JavaScript, scoring each intermediate and final domain for phishing/SSRF risk ($0.01 USDC via x402 on Base or Solana).",
    {
      url: z
        .string()
        .url()
        .describe("Full HTTP/HTTPS URL to trace (e.g., 'https://bit.ly/example')."),
    },
    async ({ url: targetUrl }) => {
      const endpoint = `${API_BASE_URL}/api/v1/url-inspect?url=${encodeURIComponent(
        targetUrl.trim()
      )}`;
      const res = await fetchFn(endpoint, { method: "GET" });
      const text = await res.text();
      return formatApiResponse(res, text, httpClient, walletConfigured);
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `x402-domain-trust-mcp running on stdio (target: ${API_BASE_URL}, x402 wallet: ${
      walletConfigured ? "enabled" : "free-trial-only"
    })`
  );
}

main().catch((err) => {
  console.error("Fatal error starting x402-domain-trust-mcp:", err);
  process.exit(1);
});