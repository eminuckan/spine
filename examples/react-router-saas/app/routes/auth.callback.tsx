import { handleCallback } from '@eminuckan/spine/react-router/server';

export async function loader({ request }: { request: Request }) {
  return handleCallback(request);
}

export default function CallbackRedirect() {
  return null;
}
