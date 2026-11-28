
const SUPABASE_URL = "https://gmiwiorhkotptgjtyrmp.supabase.co";
const SUPABASE_KEY = "sb_publishable_WURwgOFhWX5dwRvOAD3pEw_jGK7kSHA";
const SITE = "https://ma-news-24.pages.dev";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function setMeta(html, attribute, name, content) {
  const safeName = escapeRegExp(name);
  const pattern = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}\\s*=\\s*["']${safeName}["'])[^>]*>`,
    "i"
  );

  const tag = `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;

  if (pattern.test(html)) {
    return html.replace(pattern, tag);
  }

  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

export async function onRequestGet(context) {
  const asset = await context.next();

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id || !asset.ok) return asset;

    const apiUrl = new URL(`${SUPABASE_URL}/rest/v1/news`);

    apiUrl.searchParams.set(
      "select",
      "id,title,description,image_url,created_at,category"
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

    if (!response.ok) return asset;

    const stories = await response.json();
    const story = Array.isArray(stories) ? stories[0] : null;

    if (!story) return asset;

    const title = `${story.title || "Latest News"} | MA News 24`;

    const description = String(
      story.description || "Read the latest news on MA News 24."
    ).replace(/<[^>]*>/g, "").replace(/\s+/g, " ").slice(0, 160);

    const canonical =
      `${SITE}/news?id=${encodeURIComponent(story.id)}`;

    const imageUrl = story.image_url || "";

    const date = story.created_at
      ? new Date(story.created_at)
      : null;

    const validDate =
      date && !Number.isNaN(date.getTime())
        ? date.toISOString()
        : undefined;

    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonical
      },
      "headline": story.title || "Latest News",
      "description": description,
      "datePublished": validDate,
      "dateModified": validDate,
      "author": {
        "@type": "Organization",
        "name": "MA News 24"
      },
      "publisher": {
        "@type": "Organization",
        "name": "MA News 24"
      },
      "articleSection": story.category || "News",
      "image": imageUrl ? [imageUrl] : undefined
    };

    let html = await asset.text();

    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`
    );

    html = setMeta(html, "name", "description", description);
    html = setMeta(html, "property", "og:type", "article");
    html = setMeta(html, "property", "og:site_name", "MA News 24");
    html = setMeta(html, "property", "og:title", title);
    html = setMeta(html, "property", "og:description", description);
    html = setMeta(html, "property", "og:url", canonical);

    html = setMeta(
      html,
      "name",
      "twitter:card",
      "summary_large_image"
    );
    html = setMeta(html, "name", "twitter:title", title);
    html = setMeta(html, "name", "twitter:description", description);

    if (imageUrl) {
      html = setMeta(html, "property", "og:image", imageUrl);
      html = setMeta(html, "name", "twitter:image", imageUrl);
    }

    const canonicalTag =
      `<link rel="canonical" href="${escapeHtml(canonical)}">`;

    const canonicalPattern =
      /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i;

    if (canonicalPattern.test(html)) {
      html = html.replace(canonicalPattern, canonicalTag);
    } else {
      html = html.replace(
        /<\/head>/i,
        `  ${canonicalTag}\n</head>`
      );
    }

    // Add NewsArticle JSON-LD directly to server HTML.
    const schemaScript =
      `<script type="application/ld+json" id="ma-news-article-schema">` +
      JSON.stringify(schema).replace(/</g, "\\u003c") +
      `</script>`;

    html = html.replace(
      /<\/head>/i,
      `  ${schemaScript}\n</head>`
    );

    const headers = new Headers(asset.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    headers.delete("etag");
    headers.set("content-type", "text/html; charset=utf-8");

    return new Response(html, {
      status: asset.status,
      statusText: asset.statusText,
      headers
    });

  } catch (error) {
    console.error("MA News Article SEO Error:", error);
    return asset;
  }
}
