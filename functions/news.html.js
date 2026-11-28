
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
  }[ch]));
}

export async function onRequestGet(context) {
  const asset = await context.next();

  try {
    const url = new URL(context.request.url);
    const id = url.searchParams.get("id");

    if (!id) return asset;

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
const story = stories[0];

if (!story) return asset;

const title = `${story.title || "Latest News"} | MA News 24`;

const description = String(
  story.description || "Read the latest news on MA News 24."
)
  .replace(/<[^>]*>/g, "")
  .replace(/\s+/g, " ")
  .slice(0, 155);
}
return new Response(
  "MA DEBUG SUCCESS: Article mil gaya. Title: " + story.title,
  { headers: { "Content-Type": "text/plain" } }
);
    const description = String(
      story.description || "Read the latest news on MA News 24."
    )
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .slice(0, 155);

    const canonical =
      `${SITE}/news.html?id=${encodeURIComponent(story.id)}`;

    let html = await asset.text();

    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`
    );

    function updateMeta(attribute, name, content) {
      const tag =
        `<meta ${attribute}="${escapeHtml(name)}" content="${escapeHtml(content)}">`;

      const pattern = new RegExp(
        `<meta\\s+[^>]*${attribute}=["']${name}["'][^>]*>`,
        "i"
      );

      if (pattern.test(html)) {
        html = html.replace(pattern, tag);
      } else {
        html = html.replace("</head>", `  ${tag}\n</head>`);
      }
    }

    updateMeta("name", "description", description);
    updateMeta("property", "og:title", title);
    updateMeta("property", "og:description", description);
    updateMeta("property", "og:url", canonical);
    updateMeta("property", "og:type", "article");
    updateMeta("name", "twitter:title", title);
    updateMeta("name", "twitter:description", description);

    if (story.image_url) {
      updateMeta("property", "og:image", story.image_url);
      updateMeta("name", "twitter:image", story.image_url);
    }

    const canonicalTag =
      `<link rel="canonical" href="${escapeHtml(canonical)}">`;

    if (/<link\s+[^>]*rel=["']canonical["'][^>]*>/i.test(html)) {
      html = html.replace(
        /<link\s+[^>]*rel=["']canonical["'][^>]*>/i,
        canonicalTag
      );
    } else {
      html = html.replace("</head>", `  ${canonicalTag}\n</head>`);
    }

    // Server-rendered NewsArticle Schema
    const schema = {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": canonical
      },
      "headline": story.title,
      "description": description,
      "datePublished": story.created_at,
      "author": {
        "@type": "Organization",
        "name": "MA News 24"
      },
      "publisher": {
        "@type": "Organization",
        "name": "MA News 24"
      }
    };

    if (story.image_url) {
      schema.image = [story.image_url];
    }

    if (story.category) {
      schema.articleSection = story.category;
    }

    const schemaScript =
      `<script type="application/ld+json" id="ma-news-article-schema">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>`;

  html = html.replace(
  /<\/head>/i,
  `<!-- MA-SCHEMA-INSERTION-TEST -->
  ${schemaScript}
</head>`
);

    const headers = new Headers(asset.headers);
    headers.delete("content-length");
    headers.set("Content-Type", "text/html; charset=utf-8");

    return new Response(html, {
      status: asset.status,
      headers
    });

  } catch (error) {
    return asset;
  }
}
