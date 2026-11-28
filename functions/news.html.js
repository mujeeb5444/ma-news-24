
export async function onRequestGet(context) {
  const response = await context.next();
  const html = await response.text();

  const updated = html.replace(
    "</head>",
    "<!-- MA-SEO-FUNCTION-RUNNING -->\n</head>"
  );

  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(updated, {
    status: response.status,
    headers
  });
}
