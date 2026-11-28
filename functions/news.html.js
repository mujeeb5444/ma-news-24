
const SUPABASE_URL = "https://gmiwiorhkotptgjtyrmp.supabase.co";
const SUPABASE_KEY = "sb_publishable_WURwgOFhWX5dwRvOAD3pEw_jGK7kSHA";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[ch]));
}

export async function onRequestGet(context) {
  const asset = await context.next();

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) return asset;

    const apiUrl = new URL(`${SUPABASE_URL}/rest/v1/news`);
    apiUrl.searchParams.set("select", "id,title,description");
    apiUrl.searchParams.set("id", `eq.${id}`);
    apiUrl.searchParams.set("status", "eq.published");
    apiUrl.searchParams.set("limit", "1");

    const response = await fetch(apiUrl.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) return asset;

    const stories = await response.json();
    const story = stories[0];

    if (!story) return asset;

    const title = `${story.title || "News Article"} | MA News 24`;

    const description = String(
      story.description || "Read the latest news on MA News 24."
    ).replace(/\s+/g, " ").slice(0, 155);

    let html = await asset.clone().text();

    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`
    );

    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(description)}">`
    );

    const headers = new Headers(asset.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");

    return new Response(html, {
      status: asset.status,
      headers
    });

  } catch (error) {
    return asset;
  }
}
