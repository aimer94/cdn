// File: netlify/functions/image-proxy.js
const sharp = require('sharp');
const fetch = require('node-fetch');

export async function handler(event) {
  const { path } = event.queryStringParameters;

  if (!path) {
    return {
      statusCode: 400,
      body: 'Path parameter is required.',
    };
  }

  const targetUrl = `https://komiku.id/${path}`;
  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get('content-type');

    if (!contentType || !contentType.startsWith('image/')) {
      return {
        statusCode: 400,
        body: 'Requested resource is not an image.',
      };
    }

    const originalImage = await response.buffer();
    const compressedImage = await sharp(originalImage)
      .resize({ width: 800 }) // Mengatur ukuran maksimal untuk mengoptimalkan kecepatan
      .jpeg({ quality: 75 }) // Mengurangi kualitas gambar untuk kompresi
      .toBuffer();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'image/jpeg' },
      body: compressedImage.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: `Error: ${error.message}`,
    };
  }
}
