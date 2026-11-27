
const SITE = "https://ma-news-24.pages.dev";

const SUPABASE_URL = "https://gmiwiorhkotptgjtyrmp.supabase.co";

const SUPABASE_KEY = "sb_publishable_WURwgOFhWX5dwRvOAD3pEw_jGK7kSHA";

export async function onRequestGet() {
  try {
    const allNews = [];
    let start = 0;
    const limit = 1000;

    while (true) {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/news?select=id,created_at&status=eq.published&order=created_at.desc&limit=${limit}&offset=${start}`,
        {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Supabase request failed");
      }

      const news = await response.json();
      allNews.push(...news);

      if (news.length < limit) break;
      start += limit;
    }

    const urls = [
      { loc: `${SITE}/`, lastmod: null },
      { loc: `${SITE}/about.html`, lastmod: null },
      { loc: `${SITE}/contact.html`, lastmod: null },
      ...allNews.map(item => ({
        loc: `${SITE}/news.html?id=${encodeURIComponent(item.id)}`,
        lastmod: item.created_at
      }))
    ];

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(item => `
  <url>
    <loc>${item.loc}</loc>
    ${item.lastmod ? `<lastmod>${new Date(item.lastmod).toISOString()}</lastmod>` : ""}
  </url>`).join("")}
</urlset>`;

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300"
      }
    });

  } catch (error) {
    return new Response("Sitemap generation failed", {
      status: 500
    });
  }
}
