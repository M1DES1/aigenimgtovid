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

// 2. Endpoint do pobierania dostępnych głosów z HeyGen
app.get('/api/heygen-voices', async (req, res) => {
    try {
        const response = await axios.get(`${HEYGEN_BASE_URL}/v2/voices`, {
            headers: { 
                'X-Api-Key': HEYGEN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        const voicesList = response.data.data.voices.map(voice => ({
            id: voice.voice_id,
            name: voice.name || `Voice (${voice.locale})`,
            gender: voice.gender,
            language: voice.locale
        }));
        
        res.json({ 
            success: true, 
            voices: voicesList 
        });
    } catch (error) {
        console.error('Błąd pobierania głosów z HeyGen:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false,
            error: 'Nie udało się pobrać listy głosów z HeyGen',
            details: error.response?.data || error.message 
        });
    }
});

// 3. GŁÓWNY Endpoint do generowania wideo - POPRAWIONY
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, avatarId, dimension, includeVoice } = req.body;

        // Walidacja
        if (!prompt || typeof prompt !== 'string') {
            return res.status(400).json({ 
                success: false,
                error: 'Brakuje lub nieprawidłowy opis (prompt).' 
            });
        }

        // KROK 1: Pobierz listę dostępnych głosów z HeyGen
        const voicesResponse = await axios.get(`${HEYGEN_BASE_URL}/v2/voices`, {
            headers: { 'X-Api-Key': HEYGEN_API_KEY }
        });
        
        const availableVoices = voicesResponse.data.data.voices;
        
        if (!availableVoices || availableVoices.length === 0) {
            return res.status(500).json({
                success: false,
                error: 'Brak dostępnych głosów w koncie HeyGen'
            });
        }

        // KROK 2: Znajdź prawidłowy voice_id
        let selectedVoiceId = null;
        
        // Spróbuj znaleźć angielski głos żeński
        const targetVoice = availableVoices.find(v => 
            v.locale && v.locale.startsWith('en') && v.gender === 'female'
        );
        
        if (targetVoice) {
            selectedVoiceId = targetVoice.voice_id;
        } else {
            // Jeśli nie znaleziono, użyj pierwszego dostępnego głosu
            selectedVoiceId = availableVoices[0].voice_id;
        }

        // Użyj przekazanego avatarId lub domyślnego
        const selectedAvatarId = avatarId || "Abigail_expressive_2024112501";
        
        // Wybór wymiarów
        let videoDimension = { width: 1080, height: 1920 };
        if (dimension === 'square') {
            videoDimension = { width: 1080, height: 1080 };
        } else if (dimension === 'landscape') {
            videoDimension = { width: 1920, height: 1080 };
        }

        // KROK 3: Zbuduj POPRAWNE żądanie zgodne z HeyGen v2 API
        const requestPayload = {
            "video_inputs": [{
                "character": {
                    "type": "avatar",
                    "avatar_id": selectedAvatarId
                },
                "voice": {
                    "type": "text",
                    "input_text": prompt,
                    "voice_id": selectedVoiceId  // PRAWDZIWE voice_id z API HeyGen
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

        console.log('Wysyłanie żądania do HeyGen:', {
            avatar: selectedAvatarId,
            voice: selectedVoiceId,
            promptLength: prompt.length,
            voiceName: targetVoice?.name || availableVoices[0]?.name
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
            message: 'Rozpoczęto generowanie wideo.',
            video_id: videoId,
            status: videoStatus.status,
            video_url: videoStatus.video_url || null,
            thumbnail_url: videoStatus.thumbnail_url || null,
            duration: videoStatus.duration || 0,
            voice_used: targetVoice?.name || availableVoices[0]?.name
        });

    } catch (error) {
        console.error('Błąd w endpointcie /generate:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            error: 'Błąd podczas generowania wideo',
            details: error.response?.data || error.message,
            code: error.response?.data?.error?.code || 'unknown_error'
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

// 5. Endpoint testowy
app.get('/api/test', async (req, res) => {
    try {
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

// 6. Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'HeyGen Video Generator API',
        note: 'Używamy prawidłowych voice_id z API HeyGen'
    });
});

// 7. Strona główna
app.get('/', (req, res) => {
    res.json({
        message: 'HeyGen Video Generator API - Fixed Version',
        version: '2.2.0',
        note: 'Teraz używamy prawidłowych voice_id pobieranych z API HeyGen',
        endpoints: {
            test: '/api/test',
            avatars: '/api/avatars',
            voices: '/api/heygen-voices',
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
    console.log(`🗣️  Głosy będą pobierane dynamicznie z HeyGen API`);
});
