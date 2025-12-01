
'use server';

const TENOR_KEY = 'AIzaSyAoyZMwefCifKHMYynWslQAjx6uAj6UcaI';
const TENOR_BASE = 'https://tenor.googleapis.com/v2';

export async function searchGifs(query?: string, limit = 20, pos?: string) {
    const url = new URL(`${TENOR_BASE}/search`);
    url.searchParams.set('q', query || 'trending');
    url.searchParams.set('key', TENOR_KEY);
    url.searchParams.set('limit', String(limit));
    if (pos) url.searchParams.set('pos', pos);

    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Tenor API error: ${res.status}`);
    }
    const json = await res.json();
    return { results: json.results, next: json.next };
}
