require('dotenv').config();
const axios = require('axios');
const instagramUrlDirect = require('instagram-url-direct');
const sharp = require('sharp');
const express = require('express');
const app = express();

// Set up the port and the server
const port = process.env.PORT || 3000;

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets (for UI)
app.use(express.static('public'));

// Endpoint for home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// Endpoint to handle the Instagram URL
app.post('/download', async (req, res) => {
    const instagramUrl = req.body.instagramUrl;

    if (!instagramUrl.includes('instagram.com')) {
        return res.send('Invalid URL. Please provide a valid Instagram post URL.');
    }

    try {
        // Extract direct URLs from Instagram post
        const directUrls = await instagramUrlDirect(instagramUrl);
        if (!directUrls || !directUrls.url_list || directUrls.url_list.length === 0) {
            return res.send('No media found in the Instagram post.');
        }

        const mediaUrls = [];
        for (const url of directUrls.url_list) {
            const response = await axios({
                url: url,
                method: 'GET',
                responseType: 'arraybuffer',
            });

            if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')) {
                // Handle image download and convert to JPG
                const imageBuffer = await sharp(response.data)
                    .jpeg()
                    .toBuffer();
                mediaUrls.push({ type: 'image', buffer: imageBuffer, url });
            } else {
                // Handle video download
                mediaUrls.push({ type: 'video', data: response.data, url });
            }
        }

        // Render media download options to user
        res.send(`
            <h1>Instagram Media Downloader</h1>
            <ul>
                ${mediaUrls
                    .map((media) => {
                        if (media.type === 'image') {
                            return `<li><img src="data:image/jpeg;base64,${media.buffer.toString('base64')}" alt="image" style="max-width: 100%;"/><br>Click to <a href="${media.url}" download>Download Image</a></li>`;
                        } else {
                            return `<li><video controls><source src="data:video/mp4;base64,${media.data.toString('base64')}" type="video/mp4"></video><br>Click to <a href="${media.url}" download>Download Video</a></li>`;
                        }
                    })
                    .join('')}
            </ul>
            <br><br><a href="/">Go Back</a>
        `);
    } catch (error) {
        console.error('Error processing media:', error);
        res.send('We are currently experiencing technical issues. Please try again later.');
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
