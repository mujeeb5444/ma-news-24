
const SUPABASE_URL = "https://gmiwiorhkotptgjtyrmp.supabase.co";
const SUPABASE_KEY = "sb_publishable_WURwgOFhWX5dwRvOAD3pEw_jGK7kSHA";
const SITE_URL = "https://ma-news-24.pages.dev/";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function upsertMeta(html, attribute, name, content) {
  const safeName = escapeRegExp(name);
  const regex = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}\\s*=\\s*["']${safeName}["'])[^>]*>`,
    "i"
  );

  const tag = `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;

  if (regex.test(html)) {
    return html.replace(regex, tag);
  }

  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function upsertCanonical(html, url) {
  const tag = `<link rel="canonical" href="${escapeHtml(url)}">`;
  const regex = /<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/i;

  if (regex.test(html)) {
    return html.replace(regex, tag);
  }

  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

export async function onRequestGet(context) {
  const asset = await context.next();
  const requestUrl = new URL(context.request.url);
  const articleId = requestUrl.searchParams.get("id");

  // Normal page or missing ID: serve the original page.
  if (!articleId || !asset.ok) {
    return asset;
  }

  try {
    const apiUrl = new URL(`${SUPABASE_URL}/rest/v1/news`);

    apiUrl.searchParams.set(
      "select",
      "id,category,title,description,image_url,created_at"
    );
    apiUrl.searchParams.set("id", `eq.${articleId}`);
    apiUrl.searchParams.set("status", "eq.published");
    apiUrl.searchParams.set("limit", "1");

    const supabaseResponse = await fetch(apiUrl.toString(), {
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Accept": "application/json"
      }
    });

    if (!supabaseResponse.ok) {
      console.error("Supabase request failed:", supabaseResponse.status);
      return asset;
    }

    const stories = await supabaseResponse.json();
    const story = Array.isArray(stories) ? stories[0] : null;

if (!story) {
  return new Response("MA DEBUG: Story not found in Supabase", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}

    const title = `${story.title || "Latest News"} | MA News 24`;
    const description = String(
      story.description || "Read the latest news on MA News 24."
    ).replace(/\s+/g, " ").slice(0, 160);

    const articleUrl =
      `${SITE_URL}news.html?id=${encodeURIComponent(story.id)}`;

    const imageUrl = story.image_url || "";
    const publishedDate = story.created_at
      ? new Date(story.created_at)
      : null;

    const validDate =
      publishedDate && !Number.isNaN(publishedDate.getTime())
        ? publishedDate.toISOString()
        : undefined;

    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": articleUrl
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

    // Remove an older copy of our server-generated schema, if present.
    html = html.replace(
      /<script\b[^>]*id=["']ma-news-article-schema["'][^>]*>[\s\S]*?<\/script>/gi,
      ""
    );

    // Server-side SEO tags.
    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`
    );

    html = upsertMeta(html, "name", "description", description);
    html = upsertCanonical(html, articleUrl);

    html = upsertMeta(html, "property", "og:type", "article");
    html = upsertMeta(html, "property", "og:site_name", "MA News 24");
    html = upsertMeta(html, "property", "og:title", title);
    html = upsertMeta(html, "property", "og:description", description);
    html = upsertMeta(html, "property", "og:url", articleUrl);

    html = upsertMeta(html, "name", "twitter:card", "summary_large_image");
    html = upsertMeta(html, "name", "twitter:title", title);
    html = upsertMeta(html, "name", "twitter:description", description);

    if (imageUrl) {
      html = upsertMeta(html, "property", "og:image", imageUrl);
      html = upsertMeta(html, "name", "twitter:image", imageUrl);
    }

    // Add NewsArticle JSON-LD directly inside the original HTML head.
    const schemaScript =
      `<script type="application/ld+json" id="ma-news-article-schema">` +
      `${JSON.stringify(schema).replace(/</g, "\\u003c")}` +
      `</script>`;

    html = html.replace(
      /<\/head>/i,
      `  ${schemaScript}\n</head>`
    );

    // Prevent the page's old browser-side code from adding a duplicate schema.
    html = html.replace(
      "document.head.appendChild(ld);",
      "if(!document.getElementById('ma-news-article-schema'))document.head.appendChild(ld);"
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
    console.error("MA News SEO Function error:", error);
    return asset;
  }
}
