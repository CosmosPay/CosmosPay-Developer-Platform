import {
  OpenApiGeneratorV3,
  type OpenAPIObjectConfig,
} from '@asteasolutions/zod-to-openapi';
import { loadOpenApiRoutes } from './auto-load';
import { openApiRegistry } from './registry';

const openApiConfig: OpenAPIObjectConfig = {
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
  tags: [
    {
      name: 'API Keys',
      description: 'Manage APISIX API keys for authenticated users',
    },
    {
      name: 'System',
      description: 'API metadata and documentation',
    },
  ],
};

export function generateOpenApiDocument() {
  loadOpenApiRoutes();

  const generator = new OpenApiGeneratorV3(openApiRegistry.definitions);

  return generator.generateDocument(openApiConfig);
}
