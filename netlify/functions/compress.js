const cheerio = require('cheerio');
const Jimp = require('jimp');

exports.handler = async (event) => {
  const fetch = await import('node-fetch').then((module) => module.default);

  const { url } = event.queryStringParameters;

  if (!url) {
    return {
      statusCode: 400,
      body: 'Parameter "url" diperlukan untuk memuat halaman.',
    };
  }

  try {
    // Ambil halaman dari URL target
    const response = await fetch(url);
    const html = await response.text();

    // Parse HTML menggunakan cheerio
    const $ = cheerio.load(html);

    // Perbaiki URL semua resource <link>, <script>, dan <img>
    $('link, script, img').each((_, elem) => {
      const attr = $(elem).attr('src') || $(elem).attr('href');
      if (attr && !attr.startsWith('http')) {
        // Pastikan resource memiliki URL absolut
        const absoluteUrl = new URL(attr, url).href;
        if ($(elem).is('img')) {
          $(elem).attr('src', absoluteUrl);
        } else {
          $(elem).attr('href', absoluteUrl);
          $(elem).attr('src', absoluteUrl);
        }
      }
    });

    // Batasi pemrosesan hanya untuk beberapa gambar per batch
    const images = $('img').toArray(); // Ambil semua elemen gambar
    const batchSize = 10; // Jumlah gambar per batch

    for (let i = 0; i < Math.min(images.length, batchSize); i++) {
      const img = images[i];
      const originalSrc = $(img).attr('src');
      if (originalSrc) {
        try {
          const imageResponse = await fetch(originalSrc);
          const imageBuffer = await imageResponse.buffer();

          // Kompresi gambar dengan Jimp
          const compressedImage = await Jimp.read(imageBuffer)
            .then((image) => {
              return image.resize(800, Jimp.AUTO) // Resize gambar
                .quality(75) // Kualitas gambar
                .getBase64Async(Jimp.MIME_JPEG); // Konversi ke base64
            });

          // Ganti URL gambar dengan data base64
          $(img).attr('src', compressedImage);
        } catch (error) {
          console.error(`Gagal mengompresi gambar: ${originalSrc}`, error);
        }
      }
    }

    // Kembalikan HTML yang sudah dimodifikasi
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: $.html(),
    };
  } catch (error) {
    console.error('Error saat memuat atau memproses halaman:', error);
    return {
      statusCode: 500,
      body: `Error: ${error.message}`,
    };
  }
};
