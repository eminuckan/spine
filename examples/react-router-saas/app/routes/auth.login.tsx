import { login } from '@eminuckan/spine/react-router/server';

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const returnUrl = url.searchParams.get('returnTo') ?? '/dashboard';

  throw await login(request, {
    returnUrl,
    extraAuthParams: {
      login_hint: url.searchParams.get('login_hint') ?? undefined,
    },
  });
}

export default function LoginRedirect() {
  return null;
}
