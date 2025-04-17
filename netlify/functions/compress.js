// netlify/functions/proxy-compress.js

const fetch = require('node-fetch');
const sharp = require('sharp');
const { JSDOM } = require('jsdom');

exports.handler = async (event, context) => {
    const urlParam = new URLSearchParams(event.queryStringParameters).get('url');

    if (!urlParam) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'URL parameter is required' }),
        };
    }

    try {
        // Mengambil konten dari halaman target
        const response = await fetch(urlParam);
        const html = await response.text();

        // Menggunakan JSDOM untuk memanipulasi HTML
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Mencari semua elemen gambar
        const images = document.querySelectorAll('img');

        // Mengompresi setiap gambar
        for (const img of images) {
            const imgUrl = img.src;

            // Mengambil gambar
            const imgResponse = await fetch(imgUrl);
            const imgBuffer = await imgResponse.buffer();

            // Mengompresi gambar menggunakan sharp
            const compressedImage = await sharp(imgBuffer)
                .jpeg({ quality: 50 }) // Mengatur kualitas untuk kompresi
                .toBuffer();

            // Mengatur ukuran gambar menjadi 1KB
            const finalImage = compressedImage.slice(0, 1024);

            // Mengubah src gambar menjadi base64
            const base64Image = `data:image/jpeg;base64,${finalImage.toString('base64')}`;
            img.src = base64Image;
        }

        // Mengembalikan HTML yang telah dimodifikasi
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'text/html',
            },
            body: dom.serialize(),
        };
    } catch (error) {
        console.error(error); // Menambahkan log untuk debugging
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch or compress images' }),
        };
    }
};
