
const SITE = "https://ma-news-24.pages.dev";
const SUPABASE_URL = "https://gmiwiorhkotptgjtyrmp.supabase.co";
const SUPABASE_KEY = "sb_publishable_WURwgOFhWX5dwRvOAD3pEw_jGK7kSHA";

function esc(value) {
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
  const fallback = asset.clone();

  try {
    const requestUrl = new URL(context.request.url);
    const id = requestUrl.searchParams.get("id");

    if (!id) return fallback;

    const apiUrl = new URL(`${SUPABASE_URL}/rest/v1/news`);
    apiUrl.searchParams.set(
      "select",
      "id,category,title,description,image_url,created_at"
    );
    apiUrl.searchParams.set("id", `eq.${id}`);
    apiUrl.searchParams.set("status", "eq.published");
    apiUrl.searchParams.set("limit", "1");

    const response = await fetch(apiUrl.toString(), {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!response.ok) return fallback;

    const stories = await response.json();
    const story = stories[0];

    if (!story) return fallback;

    const html = await asset.text();

    const title = `${story.title || "News Article"} | MA News 24`;
    const description = String(
      story.description || "Read the latest news on MA News 24."
    ).replace(/\s+/g, " ").slice(0, 155);

    const storyUrl =
      `${SITE}/news.html?id=${encodeURIComponent(story.id)}`;

    const image = story.image_url || "";
    const date = story.created_at
      ? new Date(story.created_at)
      : null;

    const dateText =
      date && !isNaN(date)
        ? date.toLocaleString("en-IN")
        : "MA News 24";

    let output = html;

    output = output.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${esc(title)}</title>`
    );

    output = output.replace(
      /<meta name="description"[^>]*>/i,
      `<meta name="description" content="${esc(description)}">`
    );

    output = output.replace(
      /<link rel="canonical"[^>]*>/i,
      `<link rel="canonical" href="${esc(storyUrl)}">`
    );

    output = output.replace(
      /<meta property="og:title"[^>]*>/i,
      `<meta property="og:title" content="${esc(title)}">`
    );

    output = output.replace(
      /<meta property="og:description"[^>]*>/i,
      `<meta property="og:description" content="${esc(description)}">`
    );

    output = output.replace(
      /<meta property="og:url"[^>]*>/i,
      `<meta property="og:url" content="${esc(storyUrl)}">`
    );

    if (image) {
      output = output.replace(
        "</head>",
        `<meta property="og:image" content="${esc(image)}">
<meta name="twitter:image" content="${esc(image)}">
</head>`
      );
    }

    const article = `
      <div class="category">${esc(story.category || "News")}</div>
      <h1>${esc(story.title)}</h1>
      <div class="meta">MA News 24 · ${esc(dateText)}</div>
      ${image
        ? `<img class="hero" src="${esc(image)}" alt="${esc(story.title)}">`
        : ""}
      <div class="body">${esc(story.description || "")}</div>
      <div class="share">
        <a href="https://wa.me/?text=${encodeURIComponent(
          story.title + " - " + storyUrl
        )}" target="_blank" rel="noopener">Share on WhatsApp</a>
        <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          storyUrl
        )}" target="_blank" rel="noopener">Share on Facebook</a>
      </div>
    `;

    output = output.replace(
      /<main id="article" class="article">[\s\S]*?<\/main>/i,
      `<main id="article" class="article">${article}</main>`
    );

    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": storyUrl
      },
      "headline": story.title,
      "description": description,
      "datePublished": story.created_at,
      "dateModified": story.created_at,
      "author": {
        "@type": "Organization",
        "name": "MA News 24"
      },
      "publisher": {
        "@type": "Organization",
        "name": "MA News 24"
      },
      ...(image ? { "image": [image] } : {})
    };

    const safeSchema = JSON.stringify(schema)
      .replace(/</g, "\\u003c");

    output = output.replace(
      "</head>",
      `<script type="application/ld+json">${safeSchema}</script>
</head>`
    );

    const headers = new Headers(fallback.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=60");

    return new Response(output, {
      status: 200,
      headers
    });

  } catch (error) {
    return fallback;
  }
}
