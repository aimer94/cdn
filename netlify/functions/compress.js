const sharp = require('sharp');
const cheerio = require('cheerio');

// Gunakan import() dinamis untuk node-fetch
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

    // Proses semua elemen <img> untuk kompresi
    const promises = $('img').map(async (_, img) => {
      const originalSrc = $(img).attr('src');
      if (originalSrc) {
        try {
          const imageResponse = await fetch(originalSrc);
          const imageBuffer = await imageResponse.arrayBuffer();

          // Kompresi gambar dengan sharp
          const compressedImage = await sharp(Buffer.from(imageBuffer))
            .resize({ width: 800 }) // Ukuran maksimal
            .jpeg({ quality: 75 }) // Kualitas gambar
            .toBuffer();

          // Encode gambar hasil kompresi ke base64
          const base64Image = `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
          $(img).attr('src', base64Image);
        } catch (error) {
          console.error(`Gagal mengompresi gambar: ${originalSrc}`, error);
        }
      }
    }).get();

    // Tunggu semua proses selesai
    await Promise.all(promises);

    // Kembalikan HTML yang dimodifikasi
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
