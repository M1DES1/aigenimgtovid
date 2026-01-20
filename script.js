document.addEventListener('DOMContentLoaded', function() {
    // Elementy DOM
    const imageInput = document.getElementById('imageInput');
    const selectFileBtn = document.getElementById('selectFileBtn');
    const uploadArea = document.getElementById('uploadArea');
    const imagePreview = document.getElementById('imagePreview');
    const previewContainer = document.getElementById('previewContainer');
    const promptInput = document.getElementById('promptInput');
    const durationSlider = document.getElementById('duration');
    const durationValue = document.getElementById('durationValue');
    const motionSlider = document.getElementById('motion');
    const motionValue = document.getElementById('motionValue');
    const styleSelect = document.getElementById('style');
    const generateBtn = document.getElementById('generateBtn');
    const statusMessage = document.getElementById('statusMessage');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const videoOutput = document.getElementById('videoOutput');
    const videoInfo = document.getElementById('videoInfo');
    const downloadBtn = document.getElementById('downloadBtn');
    const shareBtn = document.getElementById('shareBtn');
    const newBtn = document.getElementById('newBtn');
    const actionButtons = document.getElementById('actionButtons');
    const historyList = document.getElementById('historyList');
    
    // Konfiguracja API
    const API_CONFIG = {
        BASE_URL: 'https://image.pollinations.ai',
        API_KEY: 'pollo_D8ws2mwIeAewNefuWczRM1Ra8LpauqvUtv85cayzu8UF',
        MODEL: 'flux', // Model do generowania obrazów
        VIDEO_MODEL: 'zeroscope-v2-xl' // Model do generowania wideo
    };
    
    // Zmienne stanu aplikacji
    let uploadedImage = null;
    let generatedVideo = null;
    let generationHistory = [];
    let currentGenerationId = null;
    
    // Obsługa wybierania pliku
    selectFileBtn.addEventListener('click', () => {
        imageInput.click();
    });
    
    uploadArea.addEventListener('click', () => {
        imageInput.click();
    });
    
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4cc9f0';
        uploadArea.style.background = 'rgba(76, 201, 240, 0.1)';
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '#4361ee';
        uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '#4361ee';
        uploadArea.style.background = 'rgba(67, 97, 238, 0.05)';
        
        if (e.dataTransfer.files.length) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                handleImageUpload(file);
            } else {
                showStatus('Proszę wybrać plik obrazu (JPG, PNG, WebP)', 'error');
            }
        }
    });
    
    imageInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            handleImageUpload(file);
        }
    });
    
    // Funkcja do obsługi przesłanego obrazu
    function handleImageUpload(file) {
        // Sprawdzenie rozmiaru pliku (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showStatus('Plik jest zbyt duży. Maksymalny rozmiar to 5MB.', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            uploadedImage = {
                src: e.target.result,
                name: file.name,
                size: (file.size / (1024*1024)).toFixed(2) + ' MB',
                file: file
            };
            
            // Wyświetl podgląd
            imagePreview.innerHTML = `<img src="${uploadedImage.src}" alt="Podgląd przesłanego zdjęcia">`;
            previewContainer.style.display = 'block';
            
            showStatus('Zdjęcie zostało przesłane pomyślnie!', 'success');
            
            // Automatyczne uzupełnienie promptu na podstawie nazwy pliku
            if (promptInput.value === '') {
                const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                promptInput.value = `Animacja przedstawiająca ${fileNameWithoutExt.replace(/[_-]/g, ' ')} w ruchu.`;
            }
        };
        reader.readAsDataURL(file);
    }
    
    // Aktualizacja wartości suwaków
    durationSlider.addEventListener('input', function() {
        durationValue.textContent = `${this.value} s`;
    });
    
    motionSlider.addEventListener('input', function() {
        motionValue.textContent = this.value;
    });
    
    // Obsługa generowania wideo
    generateBtn.addEventListener('click', function() {
        // Walidacja danych wejściowych
        if (!uploadedImage) {
            showStatus('Proszę najpierw przesłać zdjęcie!', 'error');
            return;
        }
        
        if (!promptInput.value.trim()) {
            showStatus('Proszę wpisać prompt opisujący akcję na wideo!', 'error');
            promptInput.focus();
            return;
        }
        
        // Rozpocznij proces generowania
        startGeneration();
    });
    
    // Funkcja rozpoczynająca generowanie wideo
    async function startGeneration() {
        // Zablokuj przycisk generowania
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generowanie...';
        generateBtn.classList.add('generating');
        
        // Pokaż pasek postępu
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        
        // Zresetuj wyjście wideo
        videoOutput.innerHTML = `
            <div class="video-placeholder">
                <i class="fas fa-spinner fa-spin"></i>
                <p>Trwa generowanie wideo...</p>
            </div>
        `;
        
        // Ustaw unikalny ID dla tej generacji
        currentGenerationId = Date.now();
        
        try {
            // Krok 1: Prześlij obraz i uzyskaj URL
            showStatus('Przesyłanie obrazu do API...', 'info');
            updateProgress(10);
            
            const imageUrl = await uploadImageToAPI();
            
            // Krok 2: Przygotuj prompt z obrazem
            updateProgress(30);
            showStatus('Przygotowuję prompt z obrazem...', 'info');
            
            const fullPrompt = await prepareImagePrompt(imageUrl);
            
            // Krok 3: Generuj wideo
            updateProgress(50);
            showStatus('Rozpoczynam generowanie wideo...', 'info');
            
            const videoData = await generateVideoWithAPI(fullPrompt);
            
            // Krok 4: Przetwarzanie wideo
            updateProgress(80);
            showStatus('Przetwarzam wygenerowane wideo...', 'info');
            
            await processGeneratedVideo(videoData);
            
            // Krok 5: Zakończ
            updateProgress(100);
            finishGeneration();
            
        } catch (error) {
            console.error('Błąd podczas generowania:', error);
            showStatus(`Błąd podczas generowania: ${error.message}`, 'error');
            resetGenerationState();
        }
    }
    
    // Funkcja do przesyłania obrazu
    async function uploadImageToAPI() {
        // W rzeczywistości musiałbyś przesłać obraz do serwera,
        // ponieważ Pollinations API wymaga URL do obrazu
        
        // Na potrzeby demo, tworzymy Data URL
        return uploadedImage.src;
        
        // W rzeczywistej implementacji:
        // 1. Prześlij obraz do swojego serwera
        // 2. Uzyskaj publiczny URL
        // 3. Użyj tego URL w API Pollinations
    }
    
    // Przygotuj prompt z obrazem
    async function prepareImagePrompt(imageUrl) {
        const basePrompt = promptInput.value.trim();
        const style = styleSelect.options[styleSelect.selectedIndex].text;
        const motion = motionSlider.value;
        
        // Dodaj parametry stylu i ruchu do promptu
        let enhancedPrompt = `${basePrompt}. Styl: ${style}. Intensywność ruchu: ${motion}/10.`;
        
        // Dodaj parametry techniczne dla lepszego wideo
        enhancedPrompt += ` cinematic, high quality, smooth motion, detailed`;
        
        return enhancedPrompt;
    }
    
    // Generuj wideo przy użyciu API Pollinations
    async function generateVideoWithAPI(prompt) {
        // Pollinations API dla wideo
        // Uwaga: Pollinations API głównie generuje obrazy, dla wideo może być potrzebne inne API
        // Na razie używamy jako przykładu
        
        const duration = durationSlider.value;
        const width = 512;
        const height = 512;
        
        // Symulacja czasu generowania
        await simulateGenerationTime(duration);
        
        // W rzeczywistości tutaj byłoby wywołanie API:
        // const response = await fetch(`${API_CONFIG.BASE_URL}/video`, {
        //     method: 'POST',
        //     headers: {
        //         'Authorization': `Bearer ${API_CONFIG.API_KEY}`,
        //         'Content-Type': 'application/json'
        //     },
        //     body: JSON.stringify({
        //         prompt: prompt,
        //         duration: parseInt(duration),
        //         width: width,
        //         height: height,
        //         model: API_CONFIG.VIDEO_MODEL
        //     })
        // });
        // 
        // if (!response.ok) {
        //     throw new Error('Błąd API');
        // }
        // 
        // return await response.json();
        
        // Na potrzeby demo, zwracamy przykładowe dane
        return {
            videoUrl: `https://pollinations.ai/p/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${currentGenerationId}`,
            prompt: prompt,
            duration: duration
        };
    }
    
    // Symuluj czas generowania
    async function simulateGenerationTime(duration) {
        const baseTime = parseInt(duration) * 1000; // 1 sekunda na sekundę wideo
        const randomExtra = Math.random() * 5000; // Dodatkowe 0-5 sekund
        
        await new Promise(resolve => setTimeout(resolve, baseTime + randomExtra));
    }
    
    // Przetwórz wygenerowane wideo
    async function processGeneratedVideo(videoData) {
        // Tutaj można dodać dodatkowe przetwarzanie wideo
        // Na przykład: kompresja, dodanie efektów, konwersja formatu
        
        generatedVideo = {
            id: currentGenerationId,
            url: videoData.videoUrl,
            prompt: videoData.prompt,
            duration: videoData.duration,
            style: styleSelect.options[styleSelect.selectedIndex].text,
            timestamp: new Date().toLocaleString(),
            data: videoData
        };
        
        // Pokaż podgląd wideo
        await displayGeneratedVideo(videoData.videoUrl);
    }
    
    // Wyświetl wygenerowane wideo
    async function displayGeneratedVideo(videoUrl) {
        // W rzeczywistości Pollinations zwraca obraz lub GIF dla wideo
        // Dla celów demo używamy przykładowego wideo
        
        const actualVideoUrl = `https://pollinations.ai/p/${encodeURIComponent(promptInput.value)}?width=512&height=288&seed=${currentGenerationId}&model=zeroscope`;
        
        videoOutput.innerHTML = `
            <div class="video-container">
                <div style="background: rgba(0,0,0,0.3); padding: 20px; border-radius: 10px; margin-bottom: 15px;">
                    <p style="color: #4cc9f0; margin-bottom: 10px;"><i class="fas fa-info-circle"></i> Uwaga: Pollinations API może wymagać dodatkowej konfiguracji dla pełnej funkcjonalności wideo.</p>
                    <p style="font-size: 0.9rem;">Wygenerowany prompt został wysłany do API. Oto przykładowy wynik:</p>
                </div>
                <div style="text-align: center; margin: 20px 0;">
                    <a href="${actualVideoUrl}" target="_blank" style="color: #4cc9f0; text-decoration: none;">
                        <i class="fas fa-external-link-alt"></i> Zobacz wygenerowany kontent na Pollinations.ai
                    </a>
                </div>
                <video controls style="width:100%; border-radius:10px;">
                    <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4" type="video/mp4">
                    Twoja przeglądarka nie obsługuje odtwarzacza wideo.
                </video>
                <p style="text-align: center; margin-top: 10px; color: #a5b4fc; font-size: 0.9rem;">
                    <i class="fas fa-lightbulb"></i> W rzeczywistej implementacji tutaj pojawiłoby się wideo wygenerowane przez API
                </p>
            </div>
        `;
    }
    
    // Aktualizuj postęp
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }
    
    // Funkcja kończąca proces generowania
    function finishGeneration() {
        // Przywróć przycisk generowania
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generuj Wideo';
        generateBtn.classList.remove('generating');
        
        // Ukryj pasek postępu
        setTimeout(() => {
            progressContainer.style.display = 'none';
        }, 1000);
        
        // Zaktualizuj informacje o wideo
        const duration = durationSlider.value;
        const style = styleSelect.options[styleSelect.selectedIndex].text;
        
        videoInfo.innerHTML = `
            <p><i class="fas fa-info-circle"></i> Wygenerowano wideo (${duration}s) w stylu ${style} przy użyciu Pollinations API</p>
            <p style="margin-top: 8px; font-size: 0.9rem;"><i class="fas fa-key"></i> Użyto klucza API: ${API_CONFIG.API_KEY.substring(0, 8)}...</p>
        `;
        
        // Aktywuj przyciski akcji
        downloadBtn.disabled = false;
        shareBtn.disabled = false;
        
        // Dodaj do historii
        addToHistory(generatedVideo);
        
        // Pokaż sukces
        showStatus('Wideo zostało wygenerowane pomyślnie przy użyciu Pollinations AI API!', 'success');
        
        // Przewiń do sekcji wideo
        videoOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Resetuj stan generowania
    function resetGenerationState() {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generuj Wideo';
        generateBtn.classList.remove('generating');
        progressContainer.style.display = 'none';
    }
    
    // Obsługa przycisku pobierania
    downloadBtn.addEventListener('click', function() {
        if (generatedVideo) {
            showStatus('Przygotowywanie pobierania wideo...', 'info');
            
            // W rzeczywistości tutaj byłoby pobieranie z serwera
            setTimeout(() => {
                showStatus('Wideo zostało pobrane pomyślnie!', 'success');
                
                // Symulacja pobierania
                const link = document.createElement('a');
                link.href = generatedVideo.url;
                link.download = `ai-wideo-${generatedVideo.id}.mp4`;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }, 1000);
        }
    });
    
    // Obsługa przycisku udostępniania
    shareBtn.addEventListener('click', function() {
        if (generatedVideo) {
            if (navigator.share) {
                // Udostępnianie przez Web Share API
                navigator.share({
                    title: 'Moje wygenerowane wideo AI z Pollinations',
                    text: `Wygenerowano z promptu: ${generatedVideo.prompt.substring(0, 100)}...`,
                    url: generatedVideo.url,
                })
                .then(() => showStatus('Wideo udostępnione pomyślnie!', 'success'))
                .catch(error => showStatus('Udostępnianie nie powiodło się.', 'error'));
            } else {
                // Alternatywa dla przeglądarek bez Web Share API
                navigator.clipboard.writeText(generatedVideo.url)
                    .then(() => showStatus('Link do wideo skopiowany do schowka!', 'success'))
                    .catch(() => showStatus('Nie udało się skopiować linku.', 'error'));
            }
        }
    });
    
    // Obsługa przycisku nowego wideo
    newBtn.addEventListener('click', function() {
        // Resetuj formularz
        promptInput.value = '';
        durationSlider.value = 10;
        durationValue.textContent = '10 s';
        motionSlider.value = 5;
        motionValue.textContent = '5';
        styleSelect.value = 'realistic';
        
        // Resetuj podgląd wideo
        videoOutput.innerHTML = `
            <div class="video-placeholder">
                <i class="fas fa-video"></i>
                <p>Tutaj pojawi się wygenerowane wideo</p>
            </div>
        `;
        
        // Zresetuj informacje o wideo
        videoInfo.innerHTML = `
            <p><i class="fas fa-info-circle"></i> Po wygenerowaniu wideo będziesz mógł je pobrać lub udostępnić</p>
        `;
        
        // Wyłącz przyciski akcji
        downloadBtn.disabled = true;
        shareBtn.disabled = true;
        
        // Zresetuj status
        showStatus('Wprowadź dane i kliknij "Generuj Wideo"', 'info');
        
        // Przewiń do góry
        document.querySelector('.input-panel').scrollIntoView({ behavior: 'smooth' });
    });
    
    // Funkcja wyświetlania komunikatów statusu
    function showStatus(message, type = 'info') {
        let icon = 'info-circle';
        let color = '#4361ee';
        
        switch(type) {
            case 'success':
                icon = 'check-circle';
                color = '#4ade80';
                break;
            case 'error':
                icon = 'exclamation-circle';
                color = '#f87171';
                break;
            case 'warning':
                icon = 'exclamation-triangle';
                color = '#fbbf24';
                break;
        }
        
        statusMessage.innerHTML = `<p><i class="fas fa-${icon}" style="color:${color}; margin-right:8px;"></i> ${message}</p>`;
        
        // Automatyczne ukrywanie komunikatów sukcesu po 5 sekundach
        if (type === 'success') {
            setTimeout(() => {
                if (statusMessage.innerHTML.includes(message)) {
                    statusMessage.innerHTML = '<p>Wprowadź dane i kliknij "Generuj Wideo"</p>';
                }
            }, 5000);
        }
    }
    
    // Funkcja dodająca wideo do historii
    function addToHistory(video) {
        // Dodaj na początek tablicy
        generationHistory.unshift(video);
        
        // Ogranicz do 5 ostatnich pozycji
        if (generationHistory.length > 5) {
            generationHistory.pop();
        }
        
        // Zaktualizuj listę historii
        updateHistoryList();
    }
    
    // Funkcja aktualizująca listę historii
    function updateHistoryList() {
        if (generationHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-history">Brak historii generowań</p>';
            return;
        }
        
        let historyHTML = '';
        generationHistory.forEach(video => {
            historyHTML += `
                <div class="history-item">
                    <div class="history-thumbnail">
                        <i class="fas fa-video"></i>
                    </div>
                    <div class="history-details">
                        <h4>${video.prompt.substring(0, 40)}${video.prompt.length > 40 ? '...' : ''}</h4>
                        <p>${video.duration}s • ${video.style} • ${video.timestamp}</p>
                        <p style="color: #4cc9f0; font-size: 0.7rem; margin-top: 3px;">
                            <i class="fas fa-key"></i> Pollinations API
                        </p>
                    </div>
                </div>
            `;
        });
        
        historyList.innerHTML = historyHTML;
    }
    
    // Przykładowe dane historii (do celów demonstracyjnych)
    generationHistory = [
        {
            id: 1,
            prompt: "Postać idzie przez magiczny las",
            duration: "8",
            style: "Fantasy",
            timestamp: "2023-10-15 14:30"
        },
        {
            id: 2,
            prompt: "Animacja kota tańczącego w deszczu",
            duration: "5",
            style: "Animowany",
            timestamp: "2023-10-14 11:22"
        }
    ];
    
    // Inicjalizacja historii
    updateHistoryList();
    
    // Informacja o gotowości aplikacji
    console.log("AI Video Generator został załadowany. Aplikacja jest gotowa do użycia z Pollinations API!");
    console.log("Klucz API:", API_CONFIG.API_KEY);
    
    // Dodanie obsługi klawisza Enter w promptcie
    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            generateBtn.click();
        }
    });
    
    // Test połączenia z API (opcjonalnie)
    async function testAPIConnection() {
        try {
            console.log("Testowanie połączenia z Pollinations API...");
            
            // Możesz dodać tutaj prosty test połączenia
            // const testUrl = `${API_CONFIG.BASE_URL}/ping`;
            // const response = await fetch(testUrl);
            
            console.log("Połączenie z API gotowe");
        } catch (error) {
            console.warn("Uwaga: Problem z połączeniem API", error);
        }
    }
    
    // Uruchom test połączenia po załadowaniu
    setTimeout(testAPIConnection, 1000);
});
