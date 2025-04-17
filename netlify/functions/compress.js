const fetch = require('node-fetch');
const sharp = require('sharp');
const cheerio = require('cheerio');

exports.handler = async (event) => {
  const { url } = event.queryStringParameters;

  if (!url) {
    return {
      statusCode: 400,
      body: 'Parameter "url" diperlukan untuk memuat halaman.',
    };
  }

  try {
    // Ambil halaman dari URL yang diminta
    const response = await fetch(url);
    const html = await response.text();

    // Muat HTML dengan cheerio untuk manipulasi
    const $ = cheerio.load(html);

    // Proses semua elemen <img> dan ganti dengan versi terkompresi
    const promises = $('img').map(async (_, img) => {
      const originalSrc = $(img).attr('src');
      if (originalSrc) {
        try {
          const imageResponse = await fetch(originalSrc);
          const imageBuffer = await imageResponse.buffer();

          // Kompresi gambar dengan sharp
          const compressedImage = await sharp(imageBuffer)
            .resize({ width: 800 }) // Atur ukuran maksimal
            .jpeg({ quality: 75 }) // Sesuaikan kualitas
            .toBuffer();

          // Ganti URL gambar dengan data base64
          const base64Image = `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
          $(img).attr('src', base64Image);
        } catch (error) {
          console.error(`Gagal mengompresi gambar: ${originalSrc}`, error);
        }
      }
    }).get();

    // Tunggu semua proses selesai
    await Promise.all(promises);

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
