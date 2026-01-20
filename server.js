const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Pozwala na połączenie z Twoją stroną na GitHub Pages
app.use(express.json({ limit: '10mb' })); // Potrzebne do odbierania dużych obrazów

// Twój prawdziwy klucz HeyGen API będzie w zmiennych środowiskowych na Render.com
const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_BASE_URL = 'https://api.heygen.com';

// Endpoint 1: Pobierz listę dostępnych awatarów (przydatne do testów)
app.get('/api/avatars', async (req, res) => {
    try {
        const response = await axios.get(`${HEYGEN_BASE_URL}/v2/avatars`, {
            headers: { 'X-Api-Key': HEYGEN_API_KEY }
        });
        res.json(response.data.data.avatars);
    } catch (error) {
        console.error('Błąd pobierania awatarów:', error.response?.data || error.message);
        res.status(500).json({ error: 'Nie udało się pobrać listy awatarów' });
    }
});

// Endpoint 2: Główny - generuj wideo na podstawie obrazu i promptu
app.post('/api/generate', async (req, res) => {
    try {
        const { imageData, prompt, duration, motion, style } = req.body;

        // 1. Walidacja danych wejściowych
        if (!imageData || !prompt) {
            return res.status(400).json({ error: 'Brakuje obrazu lub opisu (prompt).' });
        }

        // UWAGA: HeyGen nie ma prostego "image-to-video" API.
        // Poniższy kod zakłada, że używasz awatara (avatar_id) i prompt staje się tekstem, który awatar mówi.
        // Musisz wybrać avatar_id z listy lub utworzyć własny awatar ze zdjęcia (to osobny, złożony proces).

        // Przykładowy, STAŁY avatar_id. MUSISZ GO ZMIENIĆ na swój po pobraniu listy!
        const exampleAvatarId = "avatar_123abc"; // <--- TU WPISZ SWÓJ PRAWDZIWY avatar_id

        const requestPayload = {
            "video_inputs": [{
                "character": {
                    "type": "avatar",
                    "avatar_id": exampleAvatarId // Tutaj użyjemy awatara, a nie bezpośrednio przesłanego obrazu.
                },
                "voice": {
                    "type": "text",
                    "input_text": prompt, // Twój opis staje się tekstem, który mówi awatar
                    "voice_id": "Rachel" // Przykładowy głos, możesz zmienić
                }
            }],
            "dimension": {
                "width": 512,
                "height": 512
            }
        };

        // 2. Wywołanie API HeyGen, aby utworzyć wideo
        const generateResponse = await axios.post(
            `${HEYGEN_BASE_URL}/v2/video/generate`,
            requestPayload,
            {
                headers: {
                    'X-Api-Key': HEYGEN_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        // 3. HeyGen zwraca video_id, nie gotowy film
        const videoId = generateResponse.data.data.video_id;

        // 4. Natychmiast sprawdź status, może być już gotowy dla krótkich filmów
        const statusResponse = await axios.get(
            `${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`,
            { headers: { 'X-Api-Key': HEYGEN_API_KEY } }
        );

        const videoStatus = statusResponse.data.data;

        // 5. Zwróć video_id i status do Twojej strony
        res.json({
            message: 'Rozpoczęto generowanie wideo.',
            video_id: videoId,
            status: videoStatus.status,
            video_url: videoStatus.video_url || null // URL będzie null, dopóki status nie będzie "completed"
        });

    } catch (error) {
        console.error('Błąd w endpointcie /generate:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Błąd podczas generowania wideo',
            details: error.response?.data || error.message
        });
    }
});

// Endpoint 3: Sprawdź status wygenerowanego wideo
app.get('/api/status/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const response = await axios.get(
            `${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`,
            { headers: { 'X-Api-Key': HEYGEN_API_KEY } }
        );
        res.json(response.data.data); // Zawiera status i video_url, gdy gotowe
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start serwera
app.listen(PORT, () => {
    console.log(`🚀 Serwer backendu działa na porcie: ${PORT}`);
});
