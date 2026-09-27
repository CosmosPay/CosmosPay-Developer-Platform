/* OpenAPI registration for the workspace routes (src/pages/api/organizations/**):
   organizations, their members and their pending invitations.

   Two things the reference has to get right because they are what callers trip on:
   a caller who is not a member is answered 404, not 403 — an org they cannot see does
   not exist for them — and the permission list is imported from lib/org-permissions.ts
   rather than retyped, so a new resource shows up here the day it is added there. */
import {
  errors,
  jsonCreated,
  jsonOk,
  registerRoutes,
  sessionSecurity,
} from '@/lib/openapi/route-helpers';
import { z } from '@/lib/openapi/zod';
import { ORG_PERMISSIONS } from '@/lib/org-permissions';
import { idParam, jsonBody, pathParam } from '@/schemas/shared/openapi-params';

const TAG = 'Organizations';

const orgRole = z.enum(['owner', 'admin', 'member']).openapi({ example: 'member' });

const orgPermission = z
  .enum(ORG_PERMISSIONS as unknown as [string, ...string[]])
  .openapi('OrgPermission', {
    description:
      'A `resource:action` grant. Owners and admins implicitly hold every permission; members hold exactly what is listed.',
    example: 'webhooks:create',
  });

const orgSummarySchema = z
  .object({
    id: z.string().openapi({ example: 'org_123' }),
    name: z.string().openapi({ example: 'Acme Payments' }),
    role: orgRole,
    ownerId: z.string().openapi({ example: 'usr_abc' }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
    permissions: z.array(orgPermission).openapi({ example: [] }),
    plan: z.string().openapi({
      example: 'community',
      description: "The OWNER's plan — it governs the org's seat and resource limits.",
    }),
  })
  .openapi('OrganizationSummary', { description: 'An organization as the caller sees it.' });

const memberSchema = z
  .object({
    userId: z.string().openapi({ example: 'usr_abc' }),
    role: orgRole,
    permissions: z.array(orgPermission).openapi({ example: ['products:create'] }),
    name: z.string().nullable().openapi({ example: 'Ada Lovelace' }),
    email: z.string().nullable().openapi({ example: 'ada@example.com' }),
    image: z.string().nullable().openapi({ example: null }),
  })
  .openapi('OrganizationMember', { description: 'A collaborator in an organization.' });

const invitationSchema = z
  .object({
    id: z.string().openapi({ example: 'inv_clx9z8a1b0000' }),
    email: z.string().openapi({ example: 'teammate@example.com' }),
    role: z.enum(['admin', 'member']).openapi({ example: 'member' }),
    permissions: z.array(orgPermission).openapi({ example: ['payments:create'] }),
    expiresAt: z.string().openapi({
      example: '2026-09-20T12:34:56.000Z',
      description: 'Invitations are valid for three days.',
    }),
    createdAt: z.string().openapi({ example: '2026-09-17T12:34:56.000Z' }),
  })
  .openapi('OrganizationInvitation', { description: 'A pending invitation.' });

const createOrgBody = z
  .object({
    name: z.string().max(60).openapi({ example: 'Acme Payments' }),
    industry: z.string().max(40).optional().openapi({ example: 'marketplace' }),
    goals: z.array(z.string().max(40)).max(12).optional().openapi({ example: ['accept-crypto'] }),
    volume: z.string().max(40).optional().openapi({ example: '10k-50k' }),
  })
  .openapi('CreateOrganizationBody', {
    description: 'Onboarding metadata is optional and stored as-is on the organization.',
  });

const renameOrgBody = z
  .object({ name: z.string().max(60).openapi({ example: 'Acme Payments EU' }) })
  .openapi('RenameOrganizationBody');

const updateMemberBody = z
  .object({
    role: z.enum(['admin', 'member']).optional().openapi({ example: 'member' }),
    permissions: z.array(orgPermission).optional().openapi({
      example: ['products:create', 'products:edit'],
      description: 'Unknown keys are dropped server-side rather than rejected.',
    }),
  })
  .openapi('UpdateOrganizationMemberBody');

const inviteBody = z
  .object({
    email: z.string().openapi({ example: 'teammate@example.com' }),
    role: z.enum(['admin', 'member']).optional().openapi({ example: 'member' }),
    permissions: z.array(orgPermission).optional().openapi({ example: [] }),
  })
  .openapi('CreateOrganizationInvitationBody');

const memberParams = idParam.extend(pathParam('userId', 'usr_abc').shape);
const invitationParams = idParam.extend(pathParam('invId', 'inv_clx9z8a1b0000').shape);
const orgIdParam = pathParam('id', 'org_123', 'Organization id.');

registerRoutes([
  {
    method: 'get',
    path: '/api/organizations',
    tags: [TAG],
    summary: 'List my organizations',
    description:
      'Every organization the signed-in account is a member of, oldest first. No organization is created implicitly — the first one is made during onboarding.',
    security: sessionSecurity,
    responses: {
      200: jsonOk(z.array(orgSummarySchema), 'ListOrganizationsResponse', 'Organizations loaded'),
      401: errors.unauthorized,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/organizations',
    tags: [TAG],
    summary: 'Create an organization',
    description:
      "Creates an organization owned by the caller. Refused with 403 when the account's plan organization limit is reached.",
    security: sessionSecurity,
    request: jsonBody(createOrgBody),
    responses: {
      201: jsonCreated(orgSummarySchema, 'CreateOrganizationResponse', 'Organization created'),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/organizations/{id}',
    tags: [TAG],
    summary: 'Get an organization',
    description:
      "Returns the organization id and the caller's role in it. A non-member is answered 404.",
    security: sessionSecurity,
    request: { params: orgIdParam },
    responses: {
      200: jsonOk(
        z.object({ id: z.string().openapi({ example: 'org_123' }), role: orgRole }),
        'GetOrganizationResponse',
        'Organization loaded',
      ),
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/organizations/{id}',
    tags: [TAG],
    summary: 'Rename an organization',
    description: 'Owner or admin only.',
    security: sessionSecurity,
    request: { params: orgIdParam, ...jsonBody(renameOrgBody) },
    responses: {
      200: jsonOk(
        z.object({
          id: z.string().openapi({ example: 'org_123' }),
          name: z.string().openapi({ example: 'Acme Payments EU' }),
        }),
        'RenameOrganizationResponse',
        'Organization updated',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/organizations/{id}',
    tags: [TAG],
    summary: 'Delete an organization',
    description:
      'Owner only, and refused with 403 when it is the last organization the account has — everyone keeps at least one.',
    security: sessionSecurity,
    request: { params: orgIdParam },
    responses: {
      200: jsonOk(z.null(), 'DeleteOrganizationResponse', 'Organization deleted'),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/organizations/{id}/members',
    tags: [TAG],
    summary: 'List members',
    description:
      'Any member may read the roster. Members are not added directly — invite by email instead.',
    security: sessionSecurity,
    request: { params: orgIdParam },
    responses: {
      200: jsonOk(z.array(memberSchema), 'ListOrganizationMembersResponse', 'Members loaded'),
      401: errors.unauthorized,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'patch',
    path: '/api/organizations/{id}/members/{userId}',
    tags: [TAG],
    summary: "Update a member's role and permissions",
    description:
      "Owner or admin only. The owner's own row can never be changed (403). Promoting to admin grants every permission implicitly.",
    security: sessionSecurity,
    request: { params: memberParams, ...jsonBody(updateMemberBody) },
    responses: {
      200: jsonOk(
        z.object({
          userId: z.string().openapi({ example: 'usr_abc' }),
          role: orgRole,
          permissions: z.array(orgPermission),
        }),
        'UpdateOrganizationMemberResponse',
        'Member updated',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'delete',
    path: '/api/organizations/{id}/members/{userId}',
    tags: [TAG],
    summary: 'Remove a member',
    description: 'Owner or admin only. The owner can never be removed (403).',
    security: sessionSecurity,
    request: { params: memberParams },
    responses: {
      200: jsonOk(z.null(), 'RemoveOrganizationMemberResponse', 'Member removed'),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'get',
    path: '/api/organizations/{id}/invitations',
    tags: [TAG],
    summary: 'List pending invitations',
    description: 'Owner or admin only. Expired and accepted invitations are not listed.',
    security: sessionSecurity,
    request: { params: orgIdParam },
    responses: {
      200: jsonOk(
        z.array(invitationSchema),
        'ListOrganizationInvitationsResponse',
        'Invitations loaded',
      ),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
  {
    method: 'post',
    path: '/api/organizations/{id}/invitations',
    tags: [TAG],
    summary: 'Invite someone by email',
    description:
      'Owner or admin only. Creates a three-day magic-link token and emails it; no member is added until the invitation is accepted. 409 covers "already a member", "invitation already pending" and "seat limit reached".',
    security: sessionSecurity,
    request: { params: orgIdParam, ...jsonBody(inviteBody) },
    responses: {
      201: jsonCreated(
        invitationSchema,
        'CreateOrganizationInvitationResponse',
        'Invitation sent',
      ),
      400: errors.badRequest,
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      409: {
        description: 'Already a member, an invitation is already pending, or the seat limit is reached',
        content: errors.badRequest.content,
      },
      500: errors.internalError,
      502: {
        description: 'The invitation email could not be sent',
        content: errors.internalError.content,
      },
      503: {
        description: 'Email is not configured on the server',
        content: errors.internalError.content,
      },
    },
  },
  {
    method: 'delete',
    path: '/api/organizations/{id}/invitations/{invId}',
    tags: [TAG],
    summary: 'Revoke an invitation',
    description: 'Owner or admin only. The magic link stops working immediately.',
    security: sessionSecurity,
    request: { params: invitationParams },
    responses: {
      200: jsonOk(
        z.object({ id: z.string().openapi({ example: 'inv_clx9z8a1b0000' }) }),
        'RevokeOrganizationInvitationResponse',
        'Invitation revoked',
      ),
      401: errors.unauthorized,
      403: errors.forbidden,
      404: errors.notFound,
      500: errors.internalError,
    },
  },
]);

export { invitationSchema, orgPermission, orgRole };
