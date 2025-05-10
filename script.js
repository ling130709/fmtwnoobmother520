document.addEventListener('DOMContentLoaded', function() {
    // --- 元素選擇 ---
    const openingPanels = document.getElementById('opening-panels');
    const cardContent = document.getElementById('cardContent');

    // 音樂播放器元素
    const backgroundMusic = document.getElementById('backgroundMusic');
    const musicPlayer = document.getElementById('musicPlayer');
    const playerPlayPauseBtn = musicPlayer ? musicPlayer.querySelector('#playerPlayPause') : null;
    const songTitleEl = musicPlayer ? musicPlayer.querySelector('.song-title') : null;

    // === 歌詞顯示元素 (三行) ===
    const lyricDisplayContainer = musicPlayer ? musicPlayer.querySelector('.lyric-display-container') : null;
    const prevLyricEl = lyricDisplayContainer ? lyricDisplayContainer.querySelector('.lyric-line.prev-lyric') : null;
    const currentLyricEl = lyricDisplayContainer ? lyricDisplayContainer.querySelector('.lyric-line.current-lyric') : null;
    const nextLyricEl = lyricDisplayContainer ? lyricDisplayContainer.querySelector('.lyric-line.next-lyric') : null;
    // ==========================

    const progressBar = musicPlayer ? musicPlayer.querySelector('#progressBar') : null;
    const currentTimeEl = musicPlayer ? musicPlayer.querySelector('.current-time') : null;
    const durationEl = musicPlayer ? musicPlayer.querySelector('.duration') : null;


    console.log("✅ DOMContentLoaded 載入完成。");
    console.log("找到 開場面板 #opening-panels 元素嗎?", openingPanels);
    console.log("找到 卡片內容 #cardContent 元素嗎?", cardContent);
    console.log("找到 audio 元素嗎?", backgroundMusic);
    console.log("找到播放器容器元素嗎?", musicPlayer);
    console.log("找到播放器按鈕 #playerPlayPause 嗎?", playerPlayPauseBtn);
    console.log("找到歌詞顯示容器 .lyric-display-container 嗎?", lyricDisplayContainer);
    console.log("找到前一句歌詞元素 .prev-lyric 嗎?", prevLyricEl);
    console.log("找到當前歌詞元素 .current-lyric 嗎?", currentLyricEl);
    console.log("找到後一句歌詞元素 .next-lyric 嗎?", nextLyricEl);
    console.log("找到進度條 #progressBar 嗎?", progressBar);


    // --- 初始狀態設定 ---
    if (cardContent) { cardContent.classList.add('hidden'); }
    if (musicPlayer) {
        musicPlayer.classList.add('player-initial');
        console.log("▶️ 播放器設定為初始狀態 player-initial。");
         const controls = musicPlayer.querySelector('.player-controls');
         const info = musicPlayer.querySelector('.player-info');
         if (controls) controls.classList.remove('content-visible');
         if (info) info.classList.remove('content-visible');
    }
     // 設定初始歌名
    if (songTitleEl) {
        songTitleEl.textContent = '聽媽媽的話 - 周杰倫';
        songTitleEl.style.opacity = 1;
    }
    // 清空初始三行歌詞顯示
    if (prevLyricEl) { prevLyricEl.textContent = ''; prevLyricEl.style.opacity = 0;}
    if (currentLyricEl) { currentLyricEl.textContent = ''; currentLyricEl.style.opacity = 0; }
    if (nextLyricEl) { nextLyricEl.textContent = ''; nextLyricEl.style.opacity = 0; }


    // --- 輔助函式 ---
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
        return `${minutes}:${formattedSeconds}`;
    }

    // --- 歌詞相關變數和函式 ---
    let lyrics = [];
    let currentLyricIndex = -1;

    async function loadAndParseLRC(lrcFilePath) {
        try {
            console.log(`🎶 嘗試載入歌詞檔案: ${lrcFilePath}`);
            const response = await fetch(lrcFilePath);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status} when fetching ${lrcFilePath}`);
            }
            const lrcText = await response.text();
            console.log("🎶 歌詞檔案載入成功。");

            lyrics = parseLRC(lrcText);
            console.log("🎶 歌詞解析完成。行數:", lyrics.length, lyrics);

             if (!lyrics.length && currentLyricEl) {
                 currentLyricEl.textContent = "無歌詞數據";
                 currentLyricEl.style.opacity = 0.8;
                 currentLyricEl.style.color = '#bbb';
                 console.warn("❌ LRC 文件沒有解析到任何帶時間戳的歌詞行。");
             } else if (currentLyricEl) {
                 currentLyricEl.textContent = '';
                 currentLyricEl.style.opacity = 0;
                 currentLyricEl.style.color = 'white';
             }
             if (prevLyricEl) { prevLyricEl.textContent = ''; prevLyricEl.style.opacity = 0; }
             if (nextLyricEl) { nextLyricEl.textContent = ''; nextLyricEl.style.opacity = 0; }


        } catch (e) {
            console.error("❌ 載入或解析 LRC 檔案失敗:", e);
            lyrics = [];
            if (currentLyricEl) {
                 currentLyricEl.textContent = "無法載入歌詞";
                 currentLyricEl.style.opacity = 1;
                 currentLyricEl.style.color = 'red';
            }
            if (prevLyricEl) { prevLyricEl.textContent = ''; prevLyricEl.style.opacity = 0; }
            if (nextLyricEl) { nextLyricEl.textContent = ''; nextLyricEl.style.opacity = 0; }
        }
    }

    function parseLRC(lrcText) {
        const lines = lrcText.split('\n');
        const parsedLyrics = [];
        const timeRegex = /\[(\d{1,2}):(\d{2}(\.\d{1,3})?)\](.*)/;

        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseFloat(match[2]);
                const time = minutes * 60 + seconds;
                const text = match[4].trim();
                parsedLyrics.push({ time: time, text: text });
            }
        }
        parsedLyrics.sort((a, b) => a.time - b.time);
        return parsedLyrics;
    }

    function updateLyricDisplay(currentTime) {
        if (!prevLyricEl || !currentLyricEl || !nextLyricEl || lyrics.length === 0) {
             if (currentLyricEl && (currentLyricEl.textContent === "無法載載歌詞" || currentLyricEl.textContent === "無歌詞數據")) { // Fixed typo here
                 currentLyricEl.style.opacity = 1;
                 currentLyricEl.style.color = currentLyricEl.textContent === "無法載載歌詞" ? 'red' : '#bbb'; // Fixed typo here
            } else if (currentLyricEl) {
                 currentLyricEl.textContent = '';
                 currentLyricEl.style.opacity = 0;
            }
            if(prevLyricEl) { prevLyricEl.textContent = ''; prevLyricEl.style.opacity = 0; }
            if(nextLyricEl) { nextLyricEl.textContent = ''; nextLyricEl.style.opacity = 0; }
            return;
        }

        let foundIndex = currentLyricIndex;
        for (let i = Math.max(0, currentLyricIndex); i < lyrics.length; i++) {
            if (currentTime >= lyrics[i].time) {
                 foundIndex = i;
            } else {
                 break;
            }
        }

        if (foundIndex !== currentLyricIndex && foundIndex !== -1) {
            currentLyricIndex = foundIndex;

            const prevIndex = currentLyricIndex - 1;
            if (prevLyricEl) {
                prevLyricEl.textContent = (prevIndex >= 0 && prevIndex < lyrics.length) ? lyrics[prevIndex].text : '';
                prevLyricEl.style.opacity = prevLyricEl.textContent ? 0.7 : 0;
                prevLyricEl.style.color = '#bbb';
            }

            if (currentLyricEl) {
                currentLyricEl.textContent = lyrics[currentLyricIndex].text;
                currentLyricEl.style.opacity = 0;
                currentLyricEl.style.color = 'white';
                setTimeout(() => { currentLyricEl.style.opacity = 1; }, 50);
            }

            const nextIndex = currentLyricIndex + 1;
             if (nextLyricEl) {
                nextLyricEl.textContent = (nextIndex >= 0 && nextIndex < lyrics.length) ? lyrics[nextIndex].text : '';
                nextLyricEl.style.opacity = nextLyricEl.textContent ? 0.7 : 0;
                 nextLyricEl.style.color = '#bbb';
            }

            console.log(`🎵 更新三行歌詞到 [${formatTime(lyrics[currentLyricIndex].time)}] ${lyrics[currentLyricIndex].text}`);

        } else if (currentTime < (lyrics[0]?.time || 0) && currentLyricIndex !== -1) {
             if (prevLyricEl) prevLyricEl.textContent = '';
             if (currentLyricEl) currentLyricEl.textContent = '';
             if (nextLyricEl) nextLyricEl.textContent = '';
             if (prevLyricEl) prevLyricEl.style.opacity = 0;
             if (currentLyricEl) currentLyricEl.style.opacity = 0;
             if (nextLyricEl) nextLyricEl.style.opacity = 0;
             currentLyricIndex = -1;
             console.log("🎵 時間回跳到開頭，清空所有歌詞顯示。");
        } else if (currentTime >= backgroundMusic.duration && currentLyricIndex !== -1 && lyrics.length > 0 && currentTime >= lyrics[lyrics.length - 1].time) {
             if (prevLyricEl) prevLyricEl.textContent = '';
             if (currentLyricEl) currentLyricEl.textContent = '';
             if (nextLyricEl) nextLyricEl.textContent = '';
             if (prevLyricEl) prevLyricEl.style.opacity = 0;
             if (currentLyricEl) currentLyricEl.style.opacity = 0;
             if (nextLyricEl) nextLyricEl.style.opacity = 0;
             currentLyricIndex = -1;
             console.log("🎵 歌曲結束或時間超出，清空所有歌詞顯示。");
        }


        if (songTitleEl && lyricDisplayContainer && musicPlayer && musicPlayer.classList.contains('content-visible')) {
             if (backgroundMusic.currentTime > 0 && !backgroundMusic.paused && lyrics.length > 0) {
                  songTitleEl.style.opacity = 0;
             } else {
                  songTitleEl.style.opacity = 1;
                  if (currentLyricEl && (currentLyricEl.textContent === "無法載載歌詞" || currentLyricEl.textContent === "無歌詞數據")) { // Fixed typo here
                       currentLyricEl.style.opacity = 1;
                  } else if (currentLyricEl) {
                       if (prevLyricEl) prevLyricEl.style.opacity = 0;
                       if (currentLyricEl) currentLyricEl.style.opacity = 0;
                       if (nextLyricEl) nextLyricEl.style.opacity = 0;
                  }
             }
        } else if (songTitleEl && musicPlayer && !musicPlayer.classList.contains('content-visible')) {
        }
    }

    // --- 卡片開啟邏輯 (修正位置，移到元素檢查通過後) ---

    // --- 音樂播放器邏輯 ---
    let isPlaying = false;

    // 檢查所有必需的音樂播放器相關元素是否存在
    // 如果存在，則啟用播放器功能和開卡動畫觸發
    if (backgroundMusic && musicPlayer && playerPlayPauseBtn && songTitleEl && lyricDisplayContainer && prevLyricEl && currentLyricEl && nextLyricEl && progressBar && currentTimeEl && durationEl && openingPanels && cardContent) { // Added openingPanels and cardContent check here
         console.log("✅ 所有音樂播放器和開卡所需元素均已找到。啟用功能和事件監聽器。");

        loadAndParseLRC("聽媽媽的話.lrc"); // 請確保你的 LRC 檔案名稱和這裡一致！

        backgroundMusic.onloadedmetadata = () => { /* ... */ };
        backgroundMusic.ontimeupdate = () => { /* ... */ updateLyricDisplay(backgroundMusic.currentTime); };
        backgroundMusic.onended = () => { /* ... */ };
        backgroundMusic.onerror = (e) => { /* ... */ };
        backgroundMusic.onplay = () => { /* ... */ };
        backgroundMusic.onpause = () => { /* ... */ };

        playerPlayPauseBtn.addEventListener('click', function() { /* ... */ });

        if (progressBar && backgroundMusic) {
            progressBar.addEventListener('input', function() { /* ... */ updateLyricDisplay(backgroundMusic.currentTime); });
             progressBar.addEventListener('change', function() { /* ... */ });
        }

        // === 開卡面板點擊監聽器 (移到這裡) ===
        openingPanels.addEventListener('click', function() {
            console.log("✅ 開場面板被點擊了！開始開卡和播放器動畫...");

            if (musicPlayer && musicPlayer.classList.contains('player-initial')) {
                console.log("▶️ 觸發音樂播放器動畫：從初始狀態彈出。");
                 musicPlayer.classList.remove('player-initial');
                 const playerExpandDuration = 600;
                 const contentFadeDelay = 400;
                 setTimeout(() => {
                      const controls = musicPlayer.querySelector('.player-controls');
                      const info = musicPlayer.querySelector('.player-info');
                      if (controls) controls.classList.add('content-visible');
                      if (info) info.classList.add('content-visible');
                      console.log("▶️ 播放器內容設定為可見狀態 (通過點擊開卡觸發)。");
                      if (backgroundMusic && backgroundMusic.paused) {
                           console.log("🎵 開卡時嘗試自動播放音樂...");
                           backgroundMusic.play().then(() => { console.log("🎵 開卡時自動播放成功！"); }).catch(e => { console.log("🔇 開卡時自動播放失敗:", e); });
                      } else if (backgroundMusic && !backgroundMusic.paused) {
                           console.log("🎵 開卡時，音樂已在播放。");
                            if (currentLyricEl && lyrics.length > 0) { // Check if currentLyricEl is found and lyrics exist
                                // currentLyricEl.style.opacity = 1; // Let updateLyricDisplay handle opacity
                                if(songTitleEl) songTitleEl.style.opacity = 0;
                            }
                       } else if (backgroundMusic) {
                           console.log("🔊 開卡時，音頻狀態不是暫停或播放:", backgroundMusic.readyState);
                       }
                 }, contentFadeDelay);
            } else if (musicPlayer && !musicPlayer.classList.contains('content-visible')) {
                 console.log("▶️ 播放器已非初始狀態，但內容是隱藏的。顯示內容並嘗試播放。");
                 const controls = musicPlayer.querySelector('.player-controls');
                 const info = musicPlayer.querySelector('.player-info');
                 if (controls) controls.classList.add('content-visible');
                 if (info) info.classList.add('content-visible');
                  if (backgroundMusic && backgroundMusic.paused) {
                       console.log("🎵 嘗試播放音樂...");
                       backgroundMusic.play().then(() => { console.log("🎵 播放成功！"); }).catch(e => { console.log("🔇 播放失敗:", e); });
                  }
            }

            const openingText = openingPanels.querySelector('#opening-text');
            const textFadeOutDuration = 500;
            const panelAnimationDuration = 1000;
            if (openingText) { openingText.style.opacity = '0'; }
            setTimeout(function() {
                if (openingText) openingText.style.display = 'none';
                const leftPanel = openingPanels.querySelector('.left-panel');
                const rightPanel = openingPanels.querySelector('.right-panel');
                if (leftPanel) leftPanel.classList.add('open');
                if (rightPanel) rightPanel.classList.add('open');
                cardContent.classList.remove('hidden');
                setTimeout(function() { cardContent.classList.add('visible'); }, 50);
            }, textFadeOutDuration);
            setTimeout(function() {
                 if (openingPanels) {
                    openingPanels.style.display = 'none';
                    console.log("✅ 開場面板已隱藏。");
                 }
            }, textFadeOutDuration + panelAnimationDuration);
        });
        // === 開卡面板點擊監聽器結束 ===


    } else {
        console.error("❌ 無法找到一個或多個音樂播放器或開卡所需元素。音樂播放器和開卡功能可能無法運作。");
        console.log("Debug: player:", musicPlayer, "btn:", playerPlayPauseBtn, "title:", songTitleEl, "lyric container:", lyricDisplayContainer, "prev:", prevLyricEl, "current:", currentLyricEl, "next:", nextLyricEl, "bar:", progressBar, "current time:", currentTimeEl, "duration:", durationEl, "opening panels:", openingPanels, "card content:", cardContent);
    }

});
