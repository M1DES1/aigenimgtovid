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
    
    // Zmienne stanu aplikacji
    let uploadedImage = null;
    let generatedVideo = null;
    let generationHistory = [];
    
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
                size: (file.size / (1024*1024)).toFixed(2) + ' MB'
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
    function startGeneration() {
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
        
        // Aktualizuj status
        showStatus('Rozpoczynam generowanie wideo AI. To może potrwać do 2 minut...', 'info');
        
        // Symulacja postępu generowania
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += Math.random() * 10;
            if (progress > 100) progress = 100;
            
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
            
            // Aktualizuj komunikaty statusu na różnych etapach
            if (progress < 30) {
                statusMessage.innerHTML = '<p>Analizuję zdjęcie i prompt...</p>';
            } else if (progress < 60) {
                statusMessage.innerHTML = '<p>Generuję klatki wideo przy użyciu AI...</p>';
            } else if (progress < 90) {
                statusMessage.innerHTML = '<p>Łączę klatki i dodaję efekty...</p>';
            } else {
                statusMessage.innerHTML = '<p>Kończenie procesu generowania...</p>';
            }
            
            // Zakończ symulację po osiągnięciu 100%
            if (progress >= 100) {
                clearInterval(progressInterval);
                finishGeneration();
            }
        }, 500);
        
        // Zapisz interwał, aby móc go zatrzymać w razie potrzeby
        window.generationInterval = progressInterval;
    }
    
    // Funkcja kończąca proces generowania
    function finishGeneration() {
        // Przywróć przycisk generowania
        generateBtn.disabled = false;
        generateBtn.innerHTML = '<i class="fas fa-magic"></i> Generuj Wideo';
        generateBtn.classList.remove('generating');
        
        // Ukryj pasek postępu
        progressContainer.style.display = 'none';
        
        // Wygeneruj przykładowe wideo (w rzeczywistości byłoby to wideo z API AI)
        const videoId = Date.now();
        const videoUrl = `https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4`;
        
        // Wyświetl wygenerowane wideo
        videoOutput.innerHTML = `
            <div class="video-container">
                <video controls autoplay loop style="width:100%; border-radius:10px;">
                    <source src="${videoUrl}" type="video/mp4">
                    Twoja przeglądarka nie obsługuje odtwarzacza wideo.
                </video>
            </div>
        `;
        
        // Zaktualizuj informacje o wideo
        const duration = durationSlider.value;
        const style = styleSelect.options[styleSelect.selectedIndex].text;
        
        videoInfo.innerHTML = `
            <p><i class="fas fa-info-circle"></i> Wygenerowano wideo (${duration}s) w stylu ${style} na podstawie promptu: "${promptInput.value.substring(0, 50)}${promptInput.value.length > 50 ? '...' : ''}"</p>
        `;
        
        // Aktywuj przyciski akcji
        downloadBtn.disabled = false;
        shareBtn.disabled = false;
        
        // Ustaw wygenerowane wideo
        generatedVideo = {
            id: videoId,
            url: videoUrl,
            prompt: promptInput.value,
            duration: duration,
            style: style,
            timestamp: new Date().toLocaleString()
        };
        
        // Dodaj do historii
        addToHistory(generatedVideo);
        
        // Pokaż sukces
        showStatus('Wideo zostało wygenerowane pomyślnie!', 'success');
        
        // Przewiń do sekcji wideo
        videoOutput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
                    title: 'Moje wygenerowane wideo AI',
                    text: `Spójrz na to wideo wygenerowane przez AI: ${generatedVideo.prompt.substring(0, 100)}...`,
                    url: window.location.href,
                })
                .then(() => showStatus('Wideo udostępnione pomyślnie!', 'success'))
                .catch(error => showStatus('Udostępnianie nie powiodło się.', 'error'));
            } else {
                // Alternatywa dla przeglądarek bez Web Share API
                navigator.clipboard.writeText(window.location.href)
                    .then(() => showStatus('Link skopiowany do schowka!', 'success'))
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
    console.log("AI Video Generator został załadowany. Aplikacja jest gotowa do użycia!");
    
    // Dodanie obsługi klawisza Enter w promptcie
    promptInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && e.ctrlKey) {
            generateBtn.click();
        }
    });
});
