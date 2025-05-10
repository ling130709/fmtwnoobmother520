document.addEventListener('DOMContentLoaded', function() {
    // --- 元素選擇 ---
    const openingPanels = document.getElementById('opening-panels');
    const cardContent = document.getElementById('cardContent');

    // 音樂播放器元素
    const backgroundMusic = document.getElementById('backgroundMusic');
    const musicPlayer = document.getElementById('musicPlayer');
    const playerPlayPauseBtn = musicPlayer ? musicPlayer.querySelector('#playerPlayPause') : null;
    const songTitleEl = musicPlayer ? musicPlayer.querySelector('.song-title') : null;
    const lyricLineEl = musicPlayer ? musicPlayer.querySelector('.lyric-line') : null;
    const progressBar = musicPlayer ? musicPlayer.querySelector('#progressBar') : null;
    const currentTimeEl = musicPlayer ? musicPlayer.querySelector('.current-time') : null;
    const durationEl = musicPlayer ? musicPlayer.querySelector('.duration') : null;


    console.log("✅ DOMContentLoaded 載入完成。");
    console.log("找到 開場面板 #opening-panels 元素嗎?", openingPanels);
    console.log("找到 卡片內容 #cardContent 元素嗎?", cardContent);
    console.log("找到 audio 元素嗎?", backgroundMusic);
    console.log("找到播放器容器元素嗎?", musicPlayer);
    console.log("找到播放器按鈕 #playerPlayPause 嗎?", playerPlayPauseBtn);
    console.log("找到歌詞行元素 .lyric-line 嗎?", lyricLineEl);
    console.log("找到進度條 #progressBar 嗎?", progressBar);


    // --- 初始狀態設定 ---
    // 確保卡片內容初始是隱藏的 (通過 CSS 類別控制 display)
    if (cardContent) {
        cardContent.classList.add('hidden');
    }
    // === 給音樂播放器設定初始狀態類別 ===
    if (musicPlayer) {
        // 頁面載入時，播放器立刻是初始小而透明的狀態 (由 CSS .player-initial 控制可見性)
        musicPlayer.classList.add('player-initial');
        console.log("▶️ 播放器設定為初始狀態 player-initial。");
         // 初始狀態下確保內容是隱藏的 (CSS 應該已經處理，這裡做個保險)
         const controls = musicPlayer.querySelector('.player-controls');
         const info = musicPlayer.querySelector('.player-info');
         if (controls) controls.classList.remove('content-visible'); // 移除顯示類別
         if (info) info.classList.remove('content-visible');
    }
     // 設定初始歌名
    if (songTitleEl) {
        songTitleEl.textContent = '聽媽媽的話 - 周杰倫'; // 載入時就設定好歌名
        songTitleEl.style.opacity = 1; // 確保初始是可見的
    }
    // 清空初始歌詞顯示
    if (lyricLineEl) {
        lyricLineEl.textContent = '';
        lyricLineEl.style.opacity = 0; // 確保初始歌詞顯示元素是透明的
        lyricLineEl.style.color = '#ddd'; // 恢復正常顏色
    }


    // --- 輔助函式 ---
    function formatTime(seconds) {
        if (isNaN(seconds) || seconds < 0) return '0:00';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        const formattedSeconds = remainingSeconds < 10 ? '0' + remainingSeconds : remainingSeconds;
        return `${minutes}:${formattedSeconds}`;
    }

    // --- 歌詞相關變數和函式 ---
    let lyrics = []; // 儲存解析後的歌詞和時間戳 [{time: 15.34, text: "歌詞內容"}, ...]
    let currentLyricIndex = -1; // 當前顯示的歌詞索引

    // === 載入和解析 LRC 檔案的函式 ===
    async function loadAndParseLRC(lrcFilePath) {
        try {
            console.log(`🎶 嘗試載入歌詞檔案: ${lrcFilePath}`);
            const response = await fetch(lrcFilePath);
            if (!response.ok) {
                 // 如果文件不存在 (404) 或其他 HTTP 錯誤
                throw new Error(`HTTP error! status: ${response.status} when fetching ${lrcFilePath}`);
            }
            const lrcText = await response.text();
            console.log("🎶 歌詞檔案載入成功。"); // 不打印全部文本，避免主控台過長
            // console.log("載入的 LRC 文本:", lrcText.substring(0, 500) + '...'); // 打印部分文本

            lyrics = parseLRC(lrcText); // 呼叫解析函式
            console.log("🎶 歌詞解析完成。行數:", lyrics.length, lyrics);

             // 如果解析成功但沒有任何帶時間戳的歌詞行
             if (lyrics.length === 0 && lyricLineEl) {
                 lyricLineEl.textContent = "無歌詞數據";
                 lyricLineEl.style.opacity = 0.8; // 顯示提示
                 lyricLineEl.style.color = '#bbb';
                 console.warn("❌ LRC 文件沒有解析到任何帶時間戳的歌詞行。");
             } else if (lyricLineEl) {
                 // 解析成功有歌詞，初始清空歌詞行，等待播放時更新
                 lyricLineEl.textContent = '';
                 lyricLineEl.style.opacity = 0; // 確保初始是透明的
                 lyricLineEl.style.color = '#ddd'; // 恢復正常顏色
             }


        } catch (e) {
            console.error("❌ 載入或解析 LRC 檔案失敗:", e);
            lyrics = []; // 清空歌詞
            if (lyricLineEl) {
                 lyricLineEl.textContent = "無法載入歌詞"; // 顯示錯誤訊息
                 lyricLineEl.style.opacity = 1; // 讓錯誤訊息可見
                 lyricLineEl.style.color = 'red';
            }
        }
    }

    // === 修正：解析 LRC 文本的函式 ===
    function parseLRC(lrcText) {
        const lines = lrcText.split('\n');
        const parsedLyrics = [];
        // 修正的正則表達式：
        // \[(\d{1,2}) # 匹配 [一位或兩位分鐘
        // :          # 匹配 :
        // (\d{2}    # 匹配 兩位秒
        // (\.\d{1,3})?) # 可選的 點 + 一到三位毫秒
        // \]         # 匹配 ]
        // (.*)       # 捕獲後面的所有文本 (歌詞內容)
        const timeRegex = /\[(\d{1,2}):(\d{2}(\.\d{1,3})?)\](.*)/;

        for (const line of lines) {
            const match = line.match(timeRegex);
            if (match) {
                const minutes = parseInt(match[1], 10);
                const seconds = parseFloat(match[2]); // parseFloat 自動處理有無毫秒
                const time = minutes * 60 + seconds;
                const text = match[4].trim(); // match[4] 捕獲時間標籤後面的歌詞文本

                // 只添加匹配到時間標籤的行
                parsedLyrics.push({ time: time, text: text });

            } else {
                // 忽略沒有匹配時間標籤的行 (標籤行, 空行, 錯誤格式行)
                // console.log("Skipping line without time tag:", line); // 可選的偵錯日誌
            }
        }

        // 確保歌詞按時間排序
        parsedLyrics.sort((a, b) => a.time - b.time);

        // 過濾掉時間戳相同但歌詞為空的重複行 (如果需要更精確的歌詞顯示控制)
        // 例如，如果 [01:00] 和 [01:00]歌詞 在 LRC 中，只保留後者
        // 但這通常需要更複雜的邏輯，基礎版可以先不過濾空文本行，只過濾沒有時間戳的行

        return parsedLyrics;
    }

    // === 根據當前時間更新歌詞顯示 ===
    function updateLyricDisplay(currentTime) {
        // 如果沒有歌詞元素，或者歌詞數據為空（載入失敗或無歌詞數據）
        if (!lyricLineEl || lyrics.length === 0) {
            // 確保錯誤或無歌詞提示是可見的（如果它存在）
            if (lyricLineEl && (lyricLineEl.textContent === "無法載入歌詞" || lyricLineEl.textContent === "無歌詞數據")) {
                 lyricLineEl.style.opacity = 1;
                 lyricLineEl.style.color = lyricLineEl.textContent === "無法載入歌詞" ? 'red' : '#bbb';
            } else if (lyricLineEl) {
                // 如果 lyricLineEl 存在但 lyrics 數組為空且沒有錯誤提示文本，清空並隱藏它
                 lyricLineEl.textContent = '';
                 lyricLineEl.style.opacity = 0;
            }
            return; // 無法顯示歌詞
        }

        // 找到當前時間應該顯示的歌詞索引
        let foundIndex = currentLyricIndex;

        // 從當前索引或上一個索引開始往後找，直到找到時間大於當前時間的前一句
        // 這樣處理時間回跳和快進都比較穩定
        for (let i = Math.max(0, currentLyricIndex); i < lyrics.length; i++) {
            if (currentTime >= lyrics[i].time) {
                 foundIndex = i;
            } else {
                 // 找到了第一句時間晚於當前時間的歌詞，前一句 (foundIndex) 就是我們要的
                 break;
            }
        }

        // 如果找到了新的歌詞行 (索引不同且找到的索引不是 -1)
        if (foundIndex !== currentLyricIndex && foundIndex !== -1) {
            currentLyricIndex = foundIndex;
            // 更新歌詞文本
            lyricLineEl.textContent = lyrics[currentLyricIndex].text;

            // 觸發歌詞淡入動畫
            lyricLineEl.style.opacity = 0; // 先設為透明
            lyricLineEl.style.color = '#ddd'; // 恢復正常顏色
            setTimeout(() => { // 短暫延遲後再設為不透明，觸發 CSS transition
                 lyricLineEl.style.opacity = 1;
            }, 50); // 短延遲確保 transition 生效

            console.log(`🎵 更新歌詞到 [${formatTime(lyrics[currentLyricIndex].time)}] ${lyrics[currentLyricIndex].text}`);

        } else if (currentTime < (lyrics[0]?.time || 0) && currentLyricIndex !== -1) {
            // 如果時間跳回到了第一句歌詞之前，清空歌詞顯示
             lyricLineEl.textContent = '';
             lyricLineEl.style.opacity = 0;
             currentLyricIndex = -1;
             console.log("🎵 時間回跳到開頭，清空歌詞顯示。");
        } else if (currentTime >= backgroundMusic.duration && currentLyricIndex !== -1 && lyrics.length > 0 && currentTime >= lyrics[lyrics.length - 1].time) {
             // 如果歌曲結束或時間超出最後一句歌詞的時間點
             lyricLineEl.textContent = '';
             lyricLineEl.style.opacity = 0;
             currentLyricIndex = -1;
             console.log("🎵 歌曲結束或時間超出，清空歌詞顯示。");
        }


        // === 控制歌名和歌詞的顯示/隱藏 ===
        // 只有當播放器內容是可見狀態時才進行控制
        if (songTitleEl && lyricLineEl && musicPlayer && musicPlayer.classList.contains('content-visible')) {
             // 如果有有效的歌詞內容且音樂在播放
             if (backgroundMusic.currentTime > 0 && !backgroundMusic.paused && lyricLineEl.textContent && lyricLineEl.textContent !== "無法載入歌詞" && lyricLineEl.textContent !== "無歌詞數據") {
                  songTitleEl.style.opacity = 0; // 歌名淡出
                  lyricLineEl.style.opacity = 1; // 歌詞顯示
             } else {
                  // 否則 (音樂暫停/停止/開頭前，或無歌詞時，或錯誤訊息時)
                  songTitleEl.style.opacity = 1; // 歌名淡入
                  // 如果是錯誤或無歌詞提示，保持顯示；否則清空歌詞行
                  if (lyricLineEl.textContent === "無法載入歌詞" || lyricLineEl.textContent === "無歌詞數據") {
                       // opacity 在上面 updateLyricDisplay 或 loadAndParseLRC 里设置了
                       // 保持它的当前状态
                  } else {
                       // 如果没有歌词数据，或者歌词行是空的，确保歌词行是透明的
                       lyricLineEl.style.opacity = 0;
                  }
             }
        } else if (songTitleEl && musicPlayer && !musicPlayer.classList.contains('content-visible')) {
             // 如果播放器內容是隱藏狀態 (例如 player-initial 時)，確保歌名是可見的 (如果需要的話)
             // 這裡的 CSS .player-initial .player-info { opacity: 0 } 已經把整個 info 區塊隱藏了
             // 所以當 player-initial 時，歌名和歌詞都是隱藏的，不需要這裡額外控制 opacity
             // 確保在內容顯示時 (content-visible)，歌名是可見的，除非被歌詞隱藏
        }
    }
    // === 歌詞相關函式結束 ===


    // --- 卡片開啟邏輯 ---
    if (openingPanels && cardContent) {
        openingPanels.addEventListener('click', function() {
            console.log("✅ 開場面板被點擊了！開始開卡和播放器動畫...");

            // --- 觸發音樂播放器動畫 (彈出並顯示內容) ---
            if (musicPlayer && musicPlayer.classList.contains('player-initial')) { // 確保是初始狀態才觸發動畫
                console.log("▶️ 觸發音樂播放器動畫：從初始狀態彈出。");
                // 立即移除初始狀態類別，讓播放器動畫到最終狀態
                musicPlayer.classList.remove('player-initial');

                // 延遲後給播放器內部內容加上顯示類別，觸發內容淡入
                // CSS 中的 transition-delay 會控制内容的淡入
                const playerExpandDuration = 600; // 播放器放大動畫時間

                 setTimeout(() => {
                      const controls = musicPlayer.querySelector('.player-controls');
                      const info = musicPlayer.querySelector('.player-info');
                      // 添加 class="content-visible" 來觸發內容淡入和 pointer-events: auto
                      if (controls) controls.classList.add('content-visible');
                      if (info) info.classList.add('content-visible');
                      console.log("▶️ 播放器內容設定為可見狀態 (通過點擊開卡觸發)。");

                      // === 嘗試音樂自動播放 (由使用者點擊觸發) ===
                      if (backgroundMusic && backgroundMusic.paused) { // 確保是暫停狀態才嘗試播放
                           console.log("🎵 開卡時嘗試自動播放音樂...");
                           backgroundMusic.play().then(() => {
                              console.log("🎵 開卡時自動播放成功！");
                              // onplay 事件會處理 isPlaying 和按鈕圖示以及歌名歌詞顯示
                           }).catch(e => {
                              console.log("🔇 開卡時自動播放失敗:", e);
                              // onerror 或 onpause 事件會處理 isPlaying 和按鈕圖示以及歌名歌詞顯示
                              // 可以在卡片內容或播放器附近顯示一個提示，請媽媽手動點擊播放按鈕
                           });
                      } else if (backgroundMusic && !backgroundMusic.paused) {
                           console.log("🎵 開卡時，音樂已在播放。");
                           // 如果音樂已經在播放，確保 UI 狀態正確 (儘管 onplay/onpause 應該處理了)
                           // 如果歌詞載入成功，確保歌詞顯示
                            if (lyricLineEl && lyrics.length > 0) {
                                lyricLineEl.style.opacity = 1; // 让歌词可见
                                if(songTitleEl) songTitleEl.style.opacity = 0; // 隐藏歌名
                            }
                       }


                 }, playerExpandDuration * 0.6); // 播放器放大動畫進行到 60% 時開始淡入內容和嘗試播放
            } else if (musicPlayer && !musicPlayer.classList.contains('content-visible')) {
                 console.log("▶️ 播放器已非初始狀態，但內容是隱藏的。顯示內容並嘗試播放。");
                 // 如果播放器已經展開但內容是隱藏的 (可能是重開卡片)
                 const controls = musicPlayer.querySelector('.player-controls');
                 const info = musicPlayer.querySelector('.player-info');
                 if (controls) controls.classList.add('content-visible');
                 if (info) info.classList.add('content-visible');

                  // 嘗試播放音樂
                  if (backgroundMusic && backgroundMusic.paused) {
                       console.log("🎵 嘗試播放音樂...");
                       backgroundMusic.play().then(() => {
                          console.log("🎵 播放成功！");
                       }).catch(e => {
                          console.log("🔇 播放失敗:", e);
                       });
                  }
            }


            // --- 開場文字淡出、面板移動、卡片顯示 (保持原有的計時和邏輯) ---
            const openingText = openingPanels.querySelector('#opening-text');
            const textFadeOutDuration = 500;
            const panelAnimationDuration = 1000;

            if (openingText) {
                openingText.style.opacity = '0';
            }

            setTimeout(function() {
                if (openingText) openingText.style.display = 'none';

                const leftPanel = openingPanels.querySelector('.left-panel');
                const rightPanel = openingPanels.querySelector('.right-panel');
                if (leftPanel) leftPanel.classList.add('open');
                if (rightPanel) rightPanel.classList.add('open');

                cardContent.classList.remove('hidden');
                setTimeout(function() {
                    cardContent.classList.add('visible'); // 觸發卡片淡入
                    // ... 卡片內容元素的依序淡入動畫 (如果有的話) ...
                }, 50); // 顯示卡片內容的短延遲
            }, textFadeOutDuration); // 延遲直到開場文字淡出

            // 徹底隱藏開場面板容器
            setTimeout(function() {
                 if (openingPanels) {
                    openingPanels.style.display = 'none';
                    console.log("✅ 開場面板已隱藏。");
                 }
            }, textFadeOutDuration + panelAnimationDuration);


        }); // 開場面板點擊監聽器結束
    } else {
        console.error("❌ 無法找到開場面板 (#opening-panels) 或卡片內容 (#cardContent) 元素。開卡功能無法運作。");
    }


    // --- 音樂播放器邏輯 ---
    let isPlaying = false; // Local flag

    // 檢查所有必需的播放器元素是否存在
    if (backgroundMusic && musicPlayer && playerPlayPauseBtn && songTitleEl && lyricLineEl && progressBar && currentTimeEl && durationEl) {

        // === 在這裡載入歌詞檔案 ===
        // 請確保你有名為 '聽媽媽的話.lrc' 的歌詞檔案在同一個資料夾
        // 請檢查並完善 parseLRC 函式以正確解析你的檔案格式
        loadAndParseLRC("聽媽媽的話.lrc");

        // === 音訊元素狀態監聽器 ===
        backgroundMusic.onloadedmetadata = () => {
            console.log("🎵 音訊 metadata 載入完成。總時長:", backgroundMusic.duration);
            if (progressBar) progressBar.max = backgroundMusic.duration;
            if (durationEl) durationEl.textContent = formatTime(backgroundMusic.duration);
             // 音樂載入後，如果歌詞載入成功，可以在這裡準備顯示第一句（但不自動顯示）
             // 初始歌詞文本在 loadAndParseLRC 成功後設定
        };

        backgroundMusic.ontimeupdate = () => {
            // console.log("⏰ timeupdate 事件觸發。當前時間:", backgroundMusic.currentTime); // Optional: log frequently
            if (progressBar) progressBar.value = backgroundMusic.currentTime;
            if (currentTimeEl) currentTimeEl.textContent = formatTime(backgroundMusic.currentTime);

            // === 在 timeupdate 事件中更新歌詞顯示 ===
            updateLyricDisplay(backgroundMusic.currentTime);
            // ========================================
        };

        backgroundMusic.onended = () => {
            console.log("🎵 音訊播放結束。");
            isPlaying = false;
            if (playerPlayPauseBtn) playerPlayPauseBtn.textContent = '▶️';
            if (progressBar) progressBar.value = 0;
            if (currentTimeEl) currentTimeEl.textContent = '0:00';
            // 歌曲結束後清空歌詞顯示並重置索引
            if (lyricLineEl) {
                 lyricLineEl.textContent = '';
                 lyricLineEl.style.opacity = 0; // 隱藏
            }
            currentLyricIndex = -1; // 重置索引
            // 歌曲結束後，歌名重新顯示
            if (songTitleEl) songTitleEl.style.opacity = 1;
        };

        backgroundMusic.onerror = (e) => {
             console.error("❌ 音訊播放錯誤:", e);
             isPlaying = false;
             if (playerPlayPauseBtn) playerPlayPauseBtn.textContent = '▶️';
             if (lyricLineEl) {
                  lyricLineEl.textContent = "播放錯誤"; // 显示播放错误
                  lyricLineEl.style.opacity = 1; // 可见
                  lyricLineEl.style.color = 'red'; // 红色
             }
              if (songTitleEl) songTitleEl.style.opacity = 0; // 错误时隐藏歌名
        };

        backgroundMusic.onplay = () => {
            console.log("🎵 音訊狀態變為：播放中");
            isPlaying = true;
            if (playerPlayPauseBtn) playerPlayPauseBtn.textContent = '⏸️';
            // 音樂開始播放時，根據歌詞載入狀態控制顯示
            if (lyricLineEl && (lyricLineEl.textContent === "無法載入歌詞" || lyricLineEl.textContent === "無歌詞數據")) {
                 // 如果是错误或无歌词信息，保持显示，并隐藏歌名
                 lyricLineEl.style.opacity = 1;
                 if(songTitleEl) songTitleEl.style.opacity = 0;
            } else if (lyricLineEl && lyrics.length > 0) {
                // 如果有正常的歌詞数据
                lyricLineEl.style.opacity = 1; // 让歌词可见
                lyricLineEl.style.color = '#ddd'; // 确保颜色正确
                if(songTitleEl) songTitleEl.style.opacity = 0; // 隐藏歌名
            } else if (lyricLineEl) {
                 // 否则 (lyrics 数组为空且不是错误状态)，隐藏歌词行
                 lyricLineEl.textContent = ''; // 清空文本
                 lyricLineEl.style.opacity = 0; // 隐藏
            }
        };

         backgroundMusic.onpause = () => {
             console.log("🎵 音訊狀態變為：已暫停");
             isPlaying = false;
             if (playerPlayPauseBtn) playerPlayPauseBtn.textContent = '▶️';
             // 音樂暫停時，歌名重新顯示，歌詞變暗（如果顯示的話）
              if (lyricLineEl && lyricLineEl.textContent && lyricLineEl.textContent !== "無法載入歌詞" && lyricLineEl.textContent !== "無歌詞數據") {
                  lyricLineEl.style.opacity = 0.5; // 歌词变暗
              } else if (lyricLineEl) {
                  // 如果是错误或无歌词信息，保持其可见性和颜色
              }
              if (songTitleEl) songTitleEl.style.opacity = 1; // 歌名淡入
         };
        // === 監聽器結束 ===


        // === 播放/暫停按鈕點擊監聽器 ===
        playerPlayPauseBtn.addEventListener('click', function() {
            console.log("🖱️ 播放/暫停按鈕被點擊！點擊前的 isPlaying:", isPlaying, " Audio paused:", backgroundMusic.paused);

            // 檢查播放器當前是否有 player-initial 類別 (是否處於縮小狀態)
            if (musicPlayer.classList.contains('player-initial')) {
                console.log("🖱️ 點擊了小播放器，觸發放大動畫和內容淡入。");
                 musicPlayer.classList.remove('player-initial'); // 移除初始狀態類別

                 // 延遲後給播放器內部內容加上顯示類別，觸發內容淡入
                 // CSS 中的 transition-delay 會控制内容的淡入
                 const playerExpandDuration = 600; // 播放器放大動畫時間
                 const contentFadeDelay = 400; // 點擊後，內容開始淡入的延遲 (相對於點擊時間)

                 setTimeout(() => {
                      const controls = musicPlayer.querySelector('.player-controls');
                      const info = musicPlayer.querySelector('.player-info');
                      if (controls) controls.classList.add('content-visible');
                      if (info) info.classList.add('content-visible');
                      console.log("▶️ 播放器內容設定為可見狀態 (通過點擊小播放器觸發)。");

                      // 嘗試播放音樂
                      if (backgroundMusic && backgroundMusic.paused) {
                          console.log("🎵 點擊小播放器，嘗試播放音樂...");
                           backgroundMusic.play().then(() => {
                              console.log("🎵 點擊小播放器，播放成功！");
                              // onplay 事件會處理 isPlaying 和按鈕圖示以及歌名歌詞顯示
                           }).catch(e => {
                              console.log("🔇 點擊小播放器，播放失敗:", e);
                              // onerror 或 onpause 事件會處理 isPlaying 和按鈕圖示以及歌名歌詞顯示
                           });
                      } else if (backgroundMusic && !backgroundMusic.paused) {
                           console.log("🎵 點擊小播放器，音樂已在播放。");
                           // 如果音樂已經在播放，確保 UI 狀態正確 (儘管 onplay/onpause 應該處理了)
                           // 如果歌詞載入成功，確保歌詞顯示
                            if (lyricLineEl && lyrics.length > 0) {
                                lyricLineEl.style.opacity = 1; // 让歌词可见
                                if(songTitleEl) songTitleEl.style.opacity = 0; // 隐藏歌名
                            }
                       } else if (backgroundMusic) {
                           // 处理其他音频状态，比如 ended 或 seeking
                           console.log("🔊 點擊小播放器，音頻狀態不是暫停或播放:", backgroundMusic.readyState);
                       }


                 }, contentFadeDelay); // 延遲後觸發內容淡入和自動播放


            } else {
                // 如果播放器已經是展開狀態，執行正常的播放/暫停切換
                console.log("🖱️ 點擊了展開的播放器，執行正常播放/暫停。");
                if (backgroundMusic.paused) {
                    console.log("🎧 嘗試從暫停狀態播放...");
                     backgroundMusic.play().then(() => {
                         console.log("🎵 play() Promise resolved (成功恢復播放)。");
                     }).catch(e => {
                         console.log("❌ play() Promise rejected (恢復播放失敗)。", e);
                     });
                } else {
                    console.log("⏸️ 嘗試暫停音樂...");
                    backgroundMusic.pause();
                }
            }
        });
        // === 按鈕監聽器結束 ===


        // === 進度條拖動監聽器 ===
        if (progressBar && backgroundMusic) {
            progressBar.addEventListener('input', function() {
                console.log("🖱️ 進度條被拖動到:", progressBar.value);
                backgroundMusic.currentTime = progressBar.value;
                // 拖動時立刻更新歌詞顯示
                 updateLyricDisplay(backgroundMusic.currentTime);
            });
             // 可選：在拖動結束後確保播放狀態
             progressBar.addEventListener('change', function() {
                  // 如果在拖動時是播放狀態，鬆開後可以自動播放
                  // 如果拖動前是暫停狀態，鬆開後維持暫停
                   if (!backgroundMusic.paused && isPlaying) { // 檢查拖動前是否是播放狀態 (使用 isPlaying 旗標較穩定)
                       console.log("🖱️ 進度條拖動結束，恢復播放...");
                       backgroundMusic.play().catch(e => console.log("恢復播放失敗:", e));
                   } else if (backgroundMusic.paused && !isPlaying) {
                       console.log("🖱️ 進度條拖動結束，維持暫停。");
                       // isPlaying 旗標應已是 false, 按鈕圖示應是播放
                   }
             });
        }
        // === 進度條監聽器結束 ===


    } else {
        console.error("❌ 無法找到一個或多個音樂播放器相關元素。音樂播放器功能可能無法運作。");
        console.log("Debug: player:", musicPlayer, "btn:", playerPlayPauseBtn, "title:", songTitleEl, "lyric:", lyricLineEl, "bar:", progressBar, "current:", currentTimeEl, "duration:", durationEl);
    }

    // --- 音樂播放器邏輯結束 ---

});