// Thin Strapi client. Server-side reads only; never expose a Strapi admin
// token in the browser bundle. All public reads use the public role's
// permissions configured via the CMS bootstrap script.

const RAW_BASE = process.env.NEXT_PUBLIC_STRAPI_URL || 'https://cms.2meals2lives.org';
export const STRAPI_URL = RAW_BASE.replace(/\/$/, '');

type Json = Record<string, unknown>;

async function strapiFetch<T = Json>(path: string, init?: RequestInit): Promise<T> {
  const url = `${STRAPI_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    next: { revalidate: 60 },
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    throw new Error(`strapi ${init?.method || 'GET'} ${path} -> ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface CommunityPost {
  id: string;
  name: string;
  location: string;
  caption: string;
  imageUrl: string;
}

export async function getApprovedCommunityPosts(limit = 24): Promise<CommunityPost[]> {
  try {
    const body = await strapiFetch<{ data: any[] }>(
      `/api/community-posts?filters[is_approved][$eq]=true&sort=createdAt:desc&pagination[pageSize]=${limit}&populate=image`
    );
    return (body.data || []).map((row) => {
      const a = row.attributes || row;
      const url =
        a.image_url ||
        a.image?.data?.attributes?.url ||
        a.image?.url ||
        '';
      const imageUrl = url && !/^https?:\/\//.test(url) ? `${STRAPI_URL}${url}` : url;
      return {
        id: row.documentId || String(row.id),
        name: a.name || '',
        location: a.location || '',
        caption: a.caption || '',
        imageUrl,
      };
    }).filter((p) => p.imageUrl);
  } catch {
    return [];
  }
}

export interface JournalPost {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  date: string;
  coverUrl: string;
}

export async function getJournalPosts(limit = 24): Promise<JournalPost[]> {
  try {
    const body = await strapiFetch<{ data: any[] }>(
      `/api/journal-posts?filters[is_published][$eq]=true&sort=publishedAt:desc&pagination[pageSize]=${limit}&populate=cover`
    );
    return (body.data || []).map((row) => {
      const a = row.attributes || row;
      const url =
        a.cover_url ||
        a.cover?.data?.attributes?.url ||
        a.cover?.url ||
        '';
      const coverUrl = url && !/^https?:\/\//.test(url) ? `${STRAPI_URL}${url}` : url;
      return {
        id: row.documentId || String(row.id),
        title: a.title || '',
        excerpt: a.excerpt || '',
        body: a.body || '',
        date: (a.publishedAt || a.createdAt || '').slice(0, 10),
        coverUrl,
      };
    });
  } catch {
    return [];
  }
}
