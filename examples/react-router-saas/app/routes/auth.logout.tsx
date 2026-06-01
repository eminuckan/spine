import { logout } from '@eminuckan/spine/react-router/server';

export async function loader({ request }: { request: Request }) {
  return logout(request);
}

export default function LogoutRedirect() {
  return null;
}
