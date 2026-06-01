import type { LoginOptions } from './types';

const RESERVED_AUTHORIZATION_PARAMETER_NAMES = new Set([
  'client_id',
  'code_challenge',
  'code_challenge_method',
  'kc_action',
  'nonce',
  'prompt',
  'redirect_uri',
  'response_mode',
  'response_type',
  'scope',
  'state',
]);

const DEFAULT_EXTRA_AUTHORIZATION_PARAMETER_NAMES = new Set([
  'acr_values',
  'kc_idp_hint',
  'login_hint',
  'ui_locales',
]);

function isAllowedExtraAuthorizationParameter(
  key: string,
  allowedNames: Set<string>,
  allowedPrefixes: string[]
): boolean {
  const normalized = key.toLowerCase();
  return allowedNames.has(normalized) || allowedPrefixes.some((prefix) => normalized.startsWith(prefix));
}

export function sanitizeExtraAuthorizationParameters(
  params: LoginOptions['extraAuthParams'] | undefined,
  options: Pick<LoginOptions, 'extraAuthParamNames' | 'extraAuthParamPrefixes'> = {}
): Record<string, string> {
  if (!params) {
    return {};
  }

  const allowedNames = new Set([
    ...DEFAULT_EXTRA_AUTHORIZATION_PARAMETER_NAMES,
    ...(options.extraAuthParamNames ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean),
  ]);
  const allowedPrefixes = (options.extraAuthParamPrefixes ?? [])
    .map((prefix) => prefix.trim().toLowerCase())
    .filter(Boolean);
  const sanitized: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    const normalizedKey = key.trim();
    if (
      normalizedKey.length === 0 ||
      RESERVED_AUTHORIZATION_PARAMETER_NAMES.has(normalizedKey.toLowerCase()) ||
      !isAllowedExtraAuthorizationParameter(normalizedKey, allowedNames, allowedPrefixes) ||
      value === null ||
      value === undefined
    ) {
      continue;
    }

    const normalizedValue = String(value).trim();
    if (normalizedValue.length === 0) {
      continue;
    }

    sanitized[normalizedKey] = normalizedValue;
  }

  return sanitized;
}

export function normalizePublicAuthorizationStateContext(
  context: LoginOptions['publicStateContext']
): Record<string, string> | null {
  if (!context) {
    return null;
  }

  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(context)) {
    const normalizedKey = key.trim();
    if (
      normalizedKey.length === 0 ||
      RESERVED_AUTHORIZATION_PARAMETER_NAMES.has(normalizedKey.toLowerCase()) ||
      value === null ||
      value === undefined
    ) {
      continue;
    }

    const normalizedValue = String(value).trim();
    if (normalizedValue.length === 0) {
      continue;
    }

    normalized[normalizedKey] = normalizedValue;
  }

  return Object.keys(normalized).length > 0 ? normalized : null;
}

export function buildAuthorizationState(
  baseState: string,
  publicStateContext: LoginOptions['publicStateContext']
): string {
  const normalizedContext = normalizePublicAuthorizationStateContext(publicStateContext);
  if (!normalizedContext) {
    return baseState;
  }

  return `${baseState}.${Buffer.from(JSON.stringify(normalizedContext), 'utf8').toString('base64url')}`;
}
