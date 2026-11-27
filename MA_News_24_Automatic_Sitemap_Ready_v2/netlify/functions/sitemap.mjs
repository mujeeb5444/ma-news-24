const SITE = "https://ma-news-24.pages.dev";
const SUPABASE_URL = "https://gmiwiorhkotptgjtyrmp.supabase.co";
// Public publishable key only. Never put a service-role or secret key here.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_WURwgOFhWX5dwRvOAD3pEw_jGK7kSHA";

const xmlEscape = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

export default async () => {
  try {
    const stories = [];
    const pageSize = 1000;
    let offset = 0;

    while (true) {
      const url = new URL(`${SUPABASE_URL}/rest/v1/news`);
      url.searchParams.set("select", "id,created_at");
      url.searchParams.set("status", "eq.published");
      url.searchParams.set("order", "created_at.desc");
      url.searchParams.set("limit", String(pageSize));
      url.searchParams.set("offset", String(offset));

      const response = await fetch(url, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          Accept: "application/json"
        }
      });
      if (!response.ok) {
        const details = await response.text();
        throw new Error(`Supabase returned ${response.status}: ${details.slice(0, 300)}`);
      }

      const batch = await response.json();
      stories.push(...batch);
      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    const staticUrls = ["/", "/about.html", "/contact.html"];
    const staticEntries = staticUrls.map((path) =>
      `  <url><loc>${xmlEscape(SITE + path)}</loc></url>`
    );
    const storyEntries = stories.map((story) => {
      const loc = `${SITE}/news.html?id=${encodeURIComponent(story.id)}`;
      const lastmod = story.created_at && !Number.isNaN(Date.parse(story.created_at))
        ? `<lastmod>${new Date(story.created_at).toISOString()}</lastmod>`
        : "";
      return `  <url><loc>${xmlEscape(loc)}</loc>${lastmod}</url>`;
    });

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      [...staticEntries, ...storyEntries].join("\n") +
      `\n</urlset>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, s-maxage=300"
      }
    });
  } catch (error) {
    console.error("Dynamic sitemap error:", error);
    return new Response("Sitemap is temporarily unavailable.", {
      status: 500,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
};
