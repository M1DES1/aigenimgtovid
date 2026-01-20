const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_BASE_URL = 'https://api.heygen.com';

// Domyślne ustawienia
const DEFAULT_AVATAR = "Abigail_expressive_2024112501";
const DEFAULT_DIMENSION = { width: 1080, height: 1920 };

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

// 2. Endpoint do generowania wideo - BEZ GŁOSU
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, avatarId, dimension, includeVoice } = req.body;

        // Walidacja
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ 
                error: 'Brakuje lub nieprawidłowy opis (prompt).' 
            });
        }

        // Użyj przekazanego avatarId lub domyślnego
        const selectedAvatarId = avatarId || DEFAULT_AVATAR;
        
        // Wybór wymiarów
        let videoDimension = DEFAULT_DIMENSION;
        if (dimension === 'square') {
            videoDimension = { width: 1080, height: 1080 };
        } else if (dimension === 'landscape') {
            videoDimension = { width: 1920, height: 1080 };
        }

        // Budujemy żądanie - BEZ GŁOSU
        const requestPayload = {
            "video_inputs": [{
                "character": {
                    "type": "avatar",
                    "avatar_id": selectedAvatarId
                },
                "voice": {
                    "type": "text",
                    "input_type": "none",  // KLUCZOWE - bez głosu
                    "input_text": prompt   // Tekst nadal wysyłamy, ale nie będzie mówiony
                },
                "background": {
                    "type": "color",
                    "value": "#000000"
                }
            }],
            "dimension": videoDimension,
            "test": false,
            "version": "v2"
        };

        console.log('Wysyłanie żądania do HeyGen (bez głosu):', {
            avatar: selectedAvatarId,
            promptLength: prompt.length,
            includeVoice: includeVoice || false
        });

        // Wywołanie API HeyGen do generowania wideo
        const generateResponse = await axios.post(
            `${HEYGEN_BASE_URL}/v2/video/generate`,
            requestPayload,
            {
                headers: {
                    'X-Api-Key': HEYGEN_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const videoId = generateResponse.data.data.video_id;
        
        if (!videoId) {
            throw new Error('HeyGen nie zwrócił video_id');
        }

        // Poczekaj chwilę i sprawdź status
        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
            message: 'Rozpoczęto generowanie wideo (bez głosu).',
            video_id: videoId,
            status: videoStatus.status,
            video_url: videoStatus.video_url || null,
            thumbnail_url: videoStatus.thumbnail_url || null,
            duration: videoStatus.duration || 0,
            silent_video: true  // Informacja, że to wideo bez głosu
        });

    } catch (error) {
        console.error('Błąd w endpointcie /generate:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Błąd podczas generowania wideo',
            details: error.response?.data || error.message,
            code: error.response?.data?.error?.code || 'unknown_error'
        });
    }
});

// 3. Endpoint do generowania wideo Z głosem (opcjonalnie)
app.post('/api/generate-with-voice', async (req, res) => {
    try {
        const { prompt, avatarId, voiceId, dimension } = req.body;

        // Walidacja
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ 
                error: 'Brakuje lub nieprawidłowy opis (prompt).' 
            });
        }

        if (!voiceId) {
            return res.status(400).json({ 
                error: 'Brakuje voice_id dla wideo z głosem.' 
            });
        }

        const selectedAvatarId = avatarId || DEFAULT_AVATAR;
        
        let videoDimension = DEFAULT_DIMENSION;
        if (dimension === 'square') {
            videoDimension = { width: 1080, height: 1080 };
        } else if (dimension === 'landscape') {
            videoDimension = { width: 1920, height: 1080 };
        }

        // Żądanie Z głosem
        const requestPayload = {
            "video_inputs": [{
                "character": {
                    "type": "avatar",
                    "avatar_id": selectedAvatarId
                },
                "voice": {
                    "type": "text",
                    "input_text": prompt,
                    "voice_id": voiceId  // Wymagany voice_id
                },
                "background": {
                    "type": "color",
                    "value": "#000000"
                }
            }],
            "dimension": videoDimension,
            "test": false,
            "version": "v2"
        };

        console.log('Wysyłanie żądania do HeyGen (z głosem):', {
            avatar: selectedAvatarId,
            voice: voiceId,
            promptLength: prompt.length
        });

        const generateResponse = await axios.post(
            `${HEYGEN_BASE_URL}/v2/video/generate`,
            requestPayload,
            {
                headers: {
                    'X-Api-Key': HEYGEN_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const videoId = generateResponse.data.data.video_id;
        
        if (!videoId) {
            throw new Error('HeyGen nie zwrócił video_id');
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        
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
            message: 'Rozpoczęto generowanie wideo z głosem.',
            video_id: videoId,
            status: videoStatus.status,
            video_url: videoStatus.video_url || null,
            thumbnail_url: videoStatus.thumbnail_url || null,
            duration: videoStatus.duration || 0,
            silent_video: false
        });

    } catch (error) {
        console.error('Błąd w endpointcie /generate-with-voice:', error.response?.data || error.message);
        res.status(500).json({
            error: 'Błąd podczas generowania wideo z głosem',
            details: error.response?.data || error.message
        });
    }
});

// 4. Endpoint do sprawdzania statusu wideo
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

// 5. Endpoint do pobierania dostępnych głosów (opcjonalnie)
app.get('/api/voices', async (req, res) => {
    try {
        // Możesz dodać logikę pobierania głosów z HeyGen, jeśli potrzebujesz
        res.json({
            message: 'Używamy wideo bez głosu. Aby użyć głosu, wywołaj /api/generate-with-voice z prawidłowym voice_id.',
            silent_mode: true
        });
    } catch (error) {
        res.status(500).json({ error: 'Nie udało się pobrać informacji o głosach' });
    }
});

// 6. Endpoint testowy
app.get('/api/test', async (req, res) => {
    try {
        const response = await axios.get(`${HEYGEN_BASE_URL}/v1/user`, {
            headers: { 'X-Api-Key': HEYGEN_API_KEY }
        });
        
        res.json({
            success: true,
            message: 'Połączenie z HeyGen API działa poprawnie',
            user: response.data.data,
            timestamp: new Date().toISOString(),
            note: 'Domyślnie generujemy wideo bez głosu (silent mode)'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Błąd połączenia z HeyGen API',
            details: error.message
        });
    }
});

// 7. Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'HeyGen Video Generator API (Silent Mode)',
        default_mode: 'Wideo bez głosu'
    });
});

// 8. Strona główna
app.get('/', (req, res) => {
    res.json({
        message: 'HeyGen Video Generator API - Silent Mode',
        version: '2.1.0',
        note: 'Domyślnie generujemy wideo bez głosu. Awatar wykonuje tylko naturalne ruchy.',
        endpoints: {
            test: '/api/test',
            avatars: '/api/avatars',
            generate_silent: 'POST /api/generate',
            generate_with_voice: 'POST /api/generate-with-voice',
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
    console.log(`🔇 Tryb domyślny: Wideo BEZ głosu (silent mode)`);
    console.log(`🗣️  Tryb z głosem: Dostępny przez POST /api/generate-with-voice`);
});
