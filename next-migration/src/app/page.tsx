import { getApprovedCommunityPosts, getJournalPosts } from '@/lib/strapi';

export const revalidate = 60;

export default async function Home() {
  const [posts, journal] = await Promise.all([
    getApprovedCommunityPosts(6),
    getJournalPosts(3),
  ]);

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>#2Hands2Meals2Lives — Next.js migration scaffold</h1>
      <p>
        This page is the migration foundation only. The production site is still
        served from the root <code>index.html</code> on Vercel; this app is not
        wired to a Vercel project yet. See <code>MIGRATION.md</code> for the
        section-by-section roadmap.
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>Community wall (approved)</h2>
        {posts.length === 0 ? (
          <p>No approved posts yet.</p>
        ) : (
          <ul>
            {posts.map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong> · {p.location}
                {p.caption ? ` — ${p.caption}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Journal posts (published)</h2>
        {journal.length === 0 ? (
          <p>No journal posts yet.</p>
        ) : (
          <ul>
            {journal.map((p) => (
              <li key={p.id}>
                <strong>{p.title}</strong>
                {p.date ? ` — ${p.date}` : ''}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
