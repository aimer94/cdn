import { ImagePool } from '@squoosh/lib';

export default async (request, context) => {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');

  // If HTML page (no 'url' param), rewrite <img> tags to point to our proxy
  const accept = request.headers.get('Accept') || '';
  if (!target && accept.includes('text/html')) {
    const res = await fetch(request);
    let html = await res.text();
    // Rewrite all src="/..." or absolute komiku.id URLs
    html = html.replace(/<img[^>]+src=["']([^"']+)["']/g, (match, src) => {
      // Skip data URIs, external domains
      if (src.startsWith('data:') || !src.match(/\.(png|jpe?g|gif)$/)) return match;
      const clean = src.startsWith('http') ? src : `https://komiku.id${src}`;
      const proxy = `/_img/${encodeURIComponent(src)}?url=${encodeURIComponent(clean)}`;
      return match.replace(src, proxy);
    });
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  }

  if (!target) {
    return new Response('Missing image URL', { status: 400 });
  }

  // Fetch original image
  const original = await fetch(target);
  const arrayBuffer = await original.arrayBuffer();

  // Setup Squoosh
  const pool = new ImagePool();
  const image = pool.ingestImage(arrayBuffer);
  await image.decoded;

  // Initial quality
  let quality = 75;
  let output;

  // Compress loop until ≤1KB or quality floor
  do {
    image.encoders = { mozjpeg: { quality } };
    await image.encode();
    output = await image.encodedWith.mozjpeg;
    quality = quality - 5;
  } while (output.binary.byteLength > 1024 && quality >= 10);

  pool.close();

  // Return compressed image with headers
  return new Response(output.binary, {
    headers: {
      'Content-Type': output.mimeType,
      'Content-Length': output.binary.byteLength.toString(),
      'Cache-Control': 'public, max-age=31536000'
    }
  });
};
