import { describe, expect, it } from 'vitest';
import {
  buildAuthorizationState,
  normalizePublicAuthorizationStateContext,
  sanitizeExtraAuthorizationParameters,
} from '../../src/auth/authorization-parameters';

describe('authorization parameter helpers', () => {
  it('keeps only safe default authorization parameters', () => {
    expect(
      sanitizeExtraAuthorizationParameters({
        login_hint: ' user@example.com ',
        kc_idp_hint: 'google',
        state: 'attacker-state',
        redirect_uri: 'https://attacker.example/callback',
        unknown: 'drop-me',
        empty: '',
      })
    ).toEqual({
      login_hint: 'user@example.com',
      kc_idp_hint: 'google',
    });
  });

  it('supports product-defined names and prefixes without allowing reserved names', () => {
    expect(
      sanitizeExtraAuthorizationParameters(
        {
          tenant_invite: 'abc',
          app_context: 'leasing',
          custom_prompt: 'welcome',
          prompt: 'login',
        },
        {
          extraAuthParamNames: ['custom_prompt'],
          extraAuthParamPrefixes: ['tenant_'],
        }
      )
    ).toEqual({
      tenant_invite: 'abc',
      custom_prompt: 'welcome',
    });
  });

  it('normalizes public state context and drops reserved keys', () => {
    expect(
      normalizePublicAuthorizationStateContext({
        ' invite ': ' 123 ',
        state: 'reserved',
        nullable: null,
        empty: ' ',
      })
    ).toEqual({
      invite: '123',
    });
  });

  it('appends non-secret public state context to the generated state', () => {
    const state = buildAuthorizationState('base-state', { invite: 'abc' });
    const [, encodedContext] = state.split('.');

    expect(state.startsWith('base-state.')).toBe(true);
    expect(JSON.parse(Buffer.from(encodedContext, 'base64url').toString('utf8'))).toEqual({
      invite: 'abc',
    });
  });
});
