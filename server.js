const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Zwiększony limit dla obrazów

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_BASE_URL = 'https://api.heygen.com';

// 1. Endpoint do pobierania dostępnych awatarów
app.get('/api/avatars', async (req, res) => {
    try {
        const response = await axios.get(`${HEYGEN_BASE_URL}/v2/avatars`, {
            headers: { 
                'X-Api-Key': HEYGEN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data.data.avatars);
    } catch (error) {
        console.error('Błąd pobierania awatarów:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Nie udało się pobrać listy awatarów',
            details: error.response?.data || error.message 
        });
    }
});

// 2. Endpoint do generowania wideo z awatarem
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, avatarId, voiceId, dimension } = req.body;

        // Walidacja
        if (!prompt) {
            return res.status(400).json({ error: 'Brakuje opisu (prompt).' });
        }

        // Użyj przekazanego avatarId lub domyślnego
        const selectedAvatarId = avatarId || "Abigail_expressive_2024112501";
        const selectedVoiceId = voiceId || "Rachel";
        
        // Wybór wymiarów
        let videoDimension = { width: 1080, height: 1920 }; // pionowy
        if (dimension === 'square') {
            videoDimension = { width: 1080, height: 1080 };
        } else if (dimension === 'landscape') {
            videoDimension = { width: 1920, height: 1080 };
        }

        const requestPayload = {
            "video_inputs": [{
                "character": {
                    "type": "avatar",
                    "avatar_id": selectedAvatarId
                },
                "voice": {
                    "type": "text",
                    "input_text": prompt,
                    "voice_id": selectedVoiceId
                },
                "background": {
                    "type": "color",
                    "value": "#000000"
                }
            }],
            "dimension": videoDimension,
            "aspect_ratio": "9:16", // Może być "9:16", "16:9", "1:1"
            "test": false,
            "version": "v2"
        };

        // Wywołanie API HeyGen do generowania wideo
        const generateResponse = await axios.post(
            `${HEYGEN_BASE_URL}/v2/video/generate`,
            requestPayload,
            {
                headers: {
                    'X-Api-Key': HEYGEN_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 30000 // 30 sekund timeout
            }
        );

        const videoId = generateResponse.data.data.video_id;
        
        // Natychmiast sprawdź status
        await new Promise(resolve => setTimeout(resolve, 2000)); // Poczekaj 2 sekundy
        
        const statusResponse = await axios.get(
            `${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`,
            { 
                headers: { 'X-Api-Key': HEYGEN_API_KEY },
                timeout: 10000
            }
        );

        const videoStatus = statusResponse.data.data;

        res.json({
            success: true,
            message: 'Rozpoczęto generowanie wideo.',
            video_id: videoId,
            status: videoStatus.status,
            video_url: videoStatus.video_url || null,
            thumbnail_url: videoStatus.thumbnail_url || null,
            duration: videoStatus.duration || 0
        });

    } catch (error) {
        console.error('Błąd w endpointcie /generate:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Błąd podczas generowania wideo',
            details: error.response?.data?.message || error.message
        });
    }
});

// 3. Endpoint do sprawdzania statusu wideo
app.get('/api/status/:videoId', async (req, res) => {
    try {
        const { videoId } = req.params;
        const response = await axios.get(
            `${HEYGEN_BASE_URL}/v1/video_status.get?video_id=${videoId}`,
            { 
                headers: { 'X-Api-Key': HEYGEN_API_KEY },
                timeout: 10000
            }
        );
        
        const videoData = response.data.data;
        res.json({
            success: true,
            status: videoData.status,
            video_url: videoData.video_url,
            thumbnail_url: videoData.thumbnail_url,
            duration: videoData.duration,
            created_at: videoData.created_at,
            error_message: videoData.error_message
        });
    } catch (error) {
        console.error('Błąd sprawdzania statusu:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Nie udało się sprawdzić statusu wideo',
            details: error.response?.data || error.message 
        });
    }
});

// 4. Endpoint do pobierania dostępnych głosów
app.get('/api/voices', async (req, res) => {
    try {
        // HeyGen nie ma dedykowanego endpointu na głosy, ale możemy użyć znanych ID
        const voices = [
            { id: 'Rachel', name: 'Rachel (Female, US)', gender: 'female', language: 'en-US' },
            { id: 'Ethan', name: 'Ethan (Male, US)', gender: 'male', language: 'en-US' },
            { id: 'Sarah', name: 'Sarah (Female, UK)', gender: 'female', language: 'en-GB' },
            { id: 'David', name: 'David (Male, UK)', gender: 'male', language: 'en-GB' },
            { id: 'Emma', name: 'Emma (Female, AU)', gender: 'female', language: 'en-AU' },
            { id: 'Luis', name: 'Luis (Male, ES)', gender: 'male', language: 'es-ES' },
            { id: 'Sophie', name: 'Sophie (Female, FR)', gender: 'female', language: 'fr-FR' }
        ];
        
        res.json(voices);
    } catch (error) {
        console.error('Błąd pobierania głosów:', error);
        res.status(500).json({ error: 'Nie udało się pobrać listy głosów' });
    }
});

// 5. Endpoint testowy - sprawdzenie konfiguracji
app.get('/api/test', async (req, res) => {
    try {
        // Test połączenia z HeyGen API
        const response = await axios.get(`${HEYGEN_BASE_URL}/v1/user`, {
            headers: { 'X-Api-Key': HEYGEN_API_KEY }
        });
        
        res.json({
            success: true,
            message: 'Połączenie z HeyGen API działa poprawnie',
            user: response.data.data,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Błąd połączenia z HeyGen API',
            details: error.message
        });
    }
});

// 6. Endpoint health check dla Render.com
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'HeyGen Video Generator API'
    });
});

// 7. Endpoint główny
app.get('/', (req, res) => {
    res.json({
        message: 'HeyGen Video Generator API',
        version: '1.0.0',
        endpoints: {
            test: '/api/test',
            avatars: '/api/avatars',
            voices: '/api/voices',
            generate: 'POST /api/generate',
            status: 'GET /api/status/:videoId',
            health: '/health'
        }
    });
});

// Obsługa błędów 404
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint nie znaleziony' });
});

// Globalna obsługa błędów
app.use((err, req, res, next) => {
    console.error('Globalny błąd:', err);
    res.status(500).json({ 
        error: 'Wewnętrzny błąd serwera',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start serwera
app.listen(PORT, () => {
    console.log(`🚀 Serwer backendu działa na porcie: ${PORT}`);
    console.log(`🔗 URL: http://localhost:${PORT}`);
    console.log(`⚡ Środowisko: ${process.env.NODE_ENV || 'development'}`);
});
