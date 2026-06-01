import { Link } from 'react-router';

export function meta() {
  return [
    { title: 'Spine React Router Example' },
    {
      name: 'description',
      content: 'A small SaaS frontend shell powered by Spine and React Router.',
    },
  ];
}

export default function Home() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">Spine + React Router</p>
        <h1>Reusable SaaS frontend infrastructure</h1>
        <p>
          This example keeps auth, tenant state, permissions, query setup, and session handling in
          Spine while product policy stays in the application.
        </p>
        <div className="actions">
          <Link className="button" to="/auth/login?returnTo=/dashboard">
            Sign in
          </Link>
          <Link className="button secondary" to="/dashboard">
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  );
}
