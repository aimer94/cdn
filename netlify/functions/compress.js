const cheerio = require('cheerio');
const Jimp = require('jimp');

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

    // Proses elemen <img> secara bertahap untuk menghindari timeout
    const images = $('img').toArray(); // Ambil semua elemen gambar
    const maxImages = 1; // Batasi jumlah gambar yang diproses per permintaan

    for (let i = 0; i < Math.min(images.length, maxImages); i++) {
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
