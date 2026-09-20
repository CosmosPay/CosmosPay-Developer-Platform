import {
  OpenApiGeneratorV3,
  type OpenAPIObjectConfig,
} from '@asteasolutions/zod-to-openapi';
import { loadOpenApiRoutes } from './auto-load';
import { openApiRegistry } from './registry';

/* Exported so scripts/check-openapi-coverage.mjs can generate the same document outside
   Vite, where `import.meta.glob` (loadOpenApiRoutes) does not exist and the script imports
   the registrations itself. One source of truth for info/tags/servers either way. */
export const openApiConfig: OpenAPIObjectConfig = {
  openapi: '3.0.3',
  info: {
    title: 'Paydev API',
    version: '1.0.0',
    description:
      'REST API documented with OpenAPI 3.0. JSON endpoints use the standard envelope: { data, code, status, message }.',
  },
  servers: [
    {
      url: '/',
      description: 'Current host',
    },
  ],
  /* Tag order is the order Swagger UI renders the groups in: what a developer integrates
     first at the top, the internal consoles at the bottom. A route whose tag is missing
     here still renders — ungrouped and undescribed, after everything else — so a new
     module adds its line here. */
  tags: [
    {
      name: 'Payment Intents',
      description: 'Payment links and unsigned transactions (SEP-7), and their validation',
    },
    {
      name: 'Products',
      description: 'Catalog items and price links',
    },
    {
      name: 'Customers',
      description: 'Merchant-managed customers with derived payment stats',
    },
    {
      name: 'Webhooks',
      description: 'Delivery endpoints, their signing secret and delivery history',
    },
    {
      name: 'Swaps',
      description: 'Quote, create and submit Stellar swaps for an organization',
    },
    {
      name: 'Liquidity',
      description: 'AMM pools: browse, deposit, withdraw and submit signed operations',
    },
    {
      name: 'Fiat rails',
      description: 'BlindPay KYC/KYB, on-ramp and off-ramp proxies',
    },
    {
      name: 'API Keys',
      description: 'Manage APISIX API keys for authenticated users',
    },
    {
      name: 'Organizations',
      description: 'Workspaces, their members and invitations',
    },
    {
      name: 'Account',
      description: "The signed-in account's own plan and profile",
    },
    {
      name: 'Activity',
      description: 'Client telemetry from the dashboard and the wallet, and its rollups',
    },
    {
      name: 'Analytics',
      description: 'Read-only dashboard aggregates',
    },
    {
      name: 'Notifications',
      description: 'In-app activity notifications',
    },
    {
      name: 'Support',
      description: 'Support tickets, for customers and for staff',
    },
    {
      name: 'Recovery',
      description:
        'SEP-10 web auth and SEP-30 account recovery: the two servers that co-sign a new key onto an account whose device was lost',
    },
    {
      name: 'Wallet',
      description:
        'Public account-provisioning flows for the Cosmos Pay Wallet (Stellar signature, one-time claim token or PKCE)',
    },
    {
      name: 'Admin',
      description: 'Platform-owner console — every consumer, across organizations',
    },
    {
      name: 'System',
      description: 'API metadata, the public asset catalog and the shared wallet key',
    },
  ],
};

export function generateOpenApiDocument() {
  loadOpenApiRoutes();

  const generator = new OpenApiGeneratorV3(openApiRegistry.definitions);

  return generator.generateDocument(openApiConfig);
}
