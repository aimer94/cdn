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
    // Fetch halaman dari URL target
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
          const imageBuffer = await imageResponse.buffer();

          // Kompresi gambar menggunakan sharp
          const compressedImage = await sharp(imageBuffer)
            .resize({ width: 800 }) // Sesuaikan ukuran
            .jpeg({ quality: 75 }) // Kualitas gambar
            .toBuffer();

          // Encode hasil kompresi ke base64 dan gantikan src
          const base64Image = `data:image/jpeg;base64,${compressedImage.toString('base64')}`;
          $(img).attr('src', base64Image);
        } catch (error) {
          console.error(`Gagal mengompresi gambar: ${originalSrc}`, error);
        }
      }
    }).get();

    // Tunggu semua proses selesai
    await Promise.all(promises);

    // Kembalikan halaman HTML yang telah dimodifikasi
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
