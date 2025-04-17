// netlify/functions/compress-images.js

const fetch = require('node-fetch');
const sharp = require('sharp');

exports.handler = async (event, context) => {
    const url = event.queryStringParameters.url;

    if (!url) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'URL parameter is required' }),
        };
    }

    try {
        // Mengambil gambar dari URL
        const response = await fetch(url);
        const buffer = await response.buffer();

        // Mengompresi gambar menggunakan sharp
        const compressedImage = await sharp(buffer)
            .resize({ width: 800 }) // Menjaga resolusi
            .jpeg({ quality: 50 }) // Mengatur kualitas untuk kompresi
            .toBuffer();

        // Mengatur ukuran gambar menjadi 1KB
        const finalImage = compressedImage.slice(0, 1024);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'image/jpeg',
                'Content-Length': finalImage.length,
            },
            body: finalImage.toString('base64'),
            isBase64Encoded: true,
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to compress image' }),
        };
    }
};
