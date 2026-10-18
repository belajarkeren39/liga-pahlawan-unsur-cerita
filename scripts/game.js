function goHome() { document.getElementById('home-confirm-modal').style.display = 'flex'; }
        
        function goToTutorial() {
            
            document.getElementById('intro-screen').style.opacity = '0';
            setTimeout(() => {
                document.getElementById('intro-screen').style.display = 'none';
                const tut = document.getElementById('tutorial-screen');
                tut.style.display = 'flex'; void tut.offsetWidth; tut.style.opacity = '1';
            }, 500);
        }

        const HERO_DB = [
            { id: 1, name: "Kapten Superior", tier: "common", power: 270, price: 20000, imgUrl: "assets/gambar/pahlawan/kapten-superior.png" },
            { id: 2, name: "Pamong Botani", tier: "common", power: 170, price: 20000, imgUrl: "assets/gambar/pahlawan/pamong-botani.png" },
            { id: 3, name: "Pendekar Bara", tier: "common", power: 180, price: 20000, imgUrl: "assets/gambar/pahlawan/pendekar-bara.png" },
            { id: 4, name: "Sesepuh Akal", tier: "common", power: 220, price: 20000, imgUrl: "assets/gambar/pahlawan/sesepuh-akal.png" },
            { id: 5, name: "Nona Afiat", tier: "common", power: 140, price: 20000, imgUrl: "assets/gambar/pahlawan/nona-afiat.png" },
            { id: 6, name: "Pelindung Alam", tier: "rare", power: 290, price: 50000, imgUrl: "assets/gambar/pahlawan/pelindung-alam.png" },
            { id: 7, name: "Sang Penunggang Naga", tier: "rare", power: 320, price: 50000, imgUrl: "assets/gambar/pahlawan/sang-penunggang-naga.png" },
            { id: 8, name: "Algojo Supranatural", tier: "rare", power: 300, price: 50000, imgUrl: "assets/gambar/pahlawan/algojo-supranatural.png" },
            { id: 9, name: "Komandan Metropolis", tier: "rare", power: 320, price: 50000, imgUrl: "assets/gambar/pahlawan/komandan-metropolis.png" },
            { id: 10, name: "Panglima Surya", tier: "legend", power: 400, price: 120000, effect: "+30 All Power", imgUrl: "assets/gambar/pahlawan/panglima-surya.png" },
            { id: 11, name: "Panglima Lunar", tier: "legend", power: 400, price: 120000, effect: "-30 Power Monster", imgUrl: "assets/gambar/pahlawan/panglima-lunar.png" },
            { id: 12, name: "Panglima Gaia", tier: "legend", power: 400, price: 120000, effect: "+10 All Power", imgUrl: "assets/gambar/pahlawan/panglima-gaia.png" }
        ];

        const MONSTER_LEVELS = [
            { level: 1, power: 250, name: "Iblis Karang", imgUrl: "assets/gambar/monster/iblis-karang.png" },
            { level: 2, power: 450, name: "Lidah Api Gurun", imgUrl: "assets/gambar/monster/lidah-api-gurun.png" },
            { level: 3, power: 700, name: "Beruang Batu", imgUrl: "assets/gambar/monster/beruang-batu.png" },
            { level: 4, power: 1000, name: "Golem Robo", imgUrl: "assets/gambar/monster/golem-robo.png" },
            { level: 5, power: 1200, name: "Jenderal Naga Hitam", imgUrl: "assets/gambar/monster/jenderal-naga-hitam.png" }
        ];

        let QUESTION_DB = [];
        let state = {
            playerName: "Komandan",
            jenjang: "SD",
            money: 0,
            level: 1,
            myHeroes: [],
            baseMonsterPower: 250,
            correctAnswersLog: [],
            askedQuestions: [], // Menyimpan ID soal yang sudah keluar agar tidak berulang
            timeLimit: 0,
            gameStarted: false,
            gameEnded: false,
            timeRemaining: 0
        };

        function generateCompleteQuestionBank(jenjang) {
            // Kita langsung memetakan semua soal dari DB yang tersedia
            // tanpa ada duplikasi palsu.
            const baseSoal = DB_BASE_SOAL[jenjang] || [];
            return baseSoal.map(q => JSON.parse(JSON.stringify(q)));
        }

        // --- TIMER LOGIC ---
        let timerInterval = null;

        // Simpan lokal terlebih dahulu, lalu antrekan pengiriman hasil baru ke spreadsheet.
        const HISTORY_KEY = 'liga-pahlawan-cerita-hasil-v1';
        const sessionId = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
        let memoryHistory = [];
        let historyLoaded = false;

        function readHistory() {
            if (historyLoaded) return memoryHistory;
            historyLoaded = true;
            try {
                const data = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
                if (Array.isArray(data)) memoryHistory = data;
            } catch (error) { /* Tetap dapat bermain jika penyimpanan browser dibatasi. */ }
            return memoryHistory;
        }

        let finalResultSaved = false;
        function saveGameResult(statusGame) {
            if(finalResultSaved) return true;
            const result = {
                id: sessionId,
                waktu: new Date().toISOString(),
                nama: state.playerName,
                kelas: state.jenjang,
                level: state.level,
                jawabanBenar: state.correctAnswersLog.filter(item => !item.cat.startsWith('INTERAKSI')).length,
                interaksiSelesai: state.correctAnswersLog.filter(item => item.cat.startsWith('INTERAKSI')).length,
                status: statusGame,
                pemahamanAwal: {lulus:learningProgress.passed,benar:learningProgress.solved.filter(Boolean).length,total:4,percobaan:learningProgress.attempts},
                uang: state.money,
                rekapan: state.correctAnswersLog.map(item => ({...item}))
            };
            memoryHistory = [...readHistory().filter(item => item.id !== sessionId), result];
            let savedLocally = false;
            try {
                localStorage.setItem(HISTORY_KEY, JSON.stringify(memoryHistory));
                savedLocally = true;
            } catch (error) {
                showNotification('Penyimpanan browser tidak tersedia. Jangan tutup sebelum menyimpan cadangan.');
            }
            finalResultSaved = savedLocally;
            HasilOnline.enqueue(result);
            return savedLocally;
        }

        function downloadResults() {
            const history = readHistory();
            if (!history.length) {
                showNotification('Belum ada hasil tersimpan.');
                return;
            }
            const blob = new Blob([JSON.stringify(history, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'hasil-liga-pahlawan.json';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }

        async function exitAndSave() {
            const button = document.getElementById('btn-exit-confirm');
            if (button.disabled) return;
            button.disabled = true;
            state.gameEnded = true;
            clearInterval(timerInterval);
            if(cancelFundingDrag)cancelFundingDrag();
            button.textContent = 'Menyimpan…';
            if (saveGameResult('Berhenti di Tengah Permainan')) {
                await HasilOnline.flush();
                location.reload();
            } else {
                // Jangan keluar otomatis ketika browser menolak penyimpanan.
                document.getElementById('save-fallback').style.display = 'block';
                button.disabled = false;
                button.textContent = 'Keluar & Simpan';
            }
        }

        function startTimer() {
            if (state.timeLimit === 0) return; 
            
            state.timeRemaining = state.timeLimit * 60; 
            document.getElementById('timer-box').style.display = 'flex';
            updateTimerDisplay();

            timerInterval = setInterval(() => {
                state.timeRemaining--;
                updateTimerDisplay();

                if (state.timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    timeOutGameOver();
                }
            }, 1000);
        }

        function updateTimerDisplay() {
            const timerBox = document.getElementById('timer-box');
            if (state.timeLimit === 0) {
                timerBox.style.display = 'none';
                return;
            }
            
            let m = Math.floor(state.timeRemaining / 60);
            let s = state.timeRemaining % 60;
            document.getElementById('time-display').innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            if (state.timeRemaining <= 60) {
                timerBox.classList.add('timer-alert');
            } else {
                timerBox.classList.remove('timer-alert');
            }
        }

        function timeOutGameOver() {
            if(state.gameEnded)return;
            clearInterval(timerInterval);
            if(cancelFundingDrag) cancelFundingDrag();
            state.gameEnded = true;
            document.querySelectorAll('.modal-overlay').forEach(el => el.style.display = 'none');
            saveGameResult("Waktu Habis"); // Simpan hasil saat waktu habis

            const modal = document.getElementById('result-modal');
            document.getElementById('result-title').innerText = "WAKTU HABIS!";
            document.getElementById('result-title').style.color = "#e74c3c";
            document.getElementById('result-message').innerText = `Sayang sekali Komandan ${state.playerName}, waktu misimu telah habis! Bumi telah dikuasai monster.`;
            
            document.getElementById('normal-nav-buttons').innerHTML = `<button class="btn btn-red" onclick="location.reload()">Ulangi Misi</button>`;
            document.getElementById('final-recap-area').style.display = 'none';
            modal.style.display = 'flex';
        }

        // --- START GAME LOGIC ---
        function startGame() {
            if(state.gameStarted)return;
            if(!learningProgress.passed){openLearningSummary();return;}
            const nameInput = document.getElementById('player-name-input').value;
            if (nameInput.trim() === "") {
                showNotification("Mohon masukkan nama Komandan!");
                return;
            }
            
            state.gameStarted = true;
            toggleMusic(true);
            state.playerName = nameInput;
            state.jenjang = "Kelas 5";
            state.timeLimit = parseInt(document.getElementById('time-mode-select').value);
            
            // Inisialisasi Bank Soal Spesifik Jenjang
            QUESTION_DB = generateCompleteQuestionBank(state.jenjang);
            
            document.getElementById('player-name-display').innerText = state.playerName;
            document.getElementById('jenjang-badge').innerText = "KLS 5";

            document.getElementById('understanding-screen').style.opacity = '0';
            setTimeout(() => {
                ['tutorial-screen','summary-screen','understanding-screen'].forEach(id=>document.getElementById(id).style.display='none');
                positionGameControls();
                document.getElementById('hud').style.display = 'flex';
                document.getElementById('arena').style.display = 'flex';
                document.getElementById('action-bar').style.display = 'flex';
                
                startTimer();
                initLevel(1);
            }, 500);
        }

        function initLevel(lvl) {
            const mData = MONSTER_LEVELS.find(m => m.level === lvl);
            if (!mData) {
                showFinalVictory();
                return;
            }

            state.level = lvl;
            state.baseMonsterPower = mData.power;
            
            updateHUD();
            renderHeroes();
            renderMonster(mData);
        }

        // --- CORE POWER CALCULATIONS ---
        function getCalculatedTeamPower() {
            let totalHeroPower = 0;
            state.myHeroes.forEach(h => totalHeroPower += h.power);
            
            let suryaCount = state.myHeroes.filter(h => h.name === "Panglima Surya").length;
            let gaiaCount = state.myHeroes.filter(h => h.name === "Panglima Gaia").length;

            if (suryaCount > 0) totalHeroPower += (30 * state.myHeroes.length * suryaCount);
            if (gaiaCount > 0) totalHeroPower += (10 * state.myHeroes.length * gaiaCount);

            return totalHeroPower;
        }

        function getCalculatedMonsterPower() {
            let currentMonsterPower = state.baseMonsterPower;
            let lunarCount = state.myHeroes.filter(h => h.name === "Panglima Lunar").length;
            
            if (lunarCount > 0) {
                currentMonsterPower -= (30 * lunarCount);
            }
            return Math.max(0, currentMonsterPower);
        }

        function updateHUD() {
            document.getElementById('level-display').innerText = state.level;
            document.getElementById('money-display').innerText = "Rp " + state.money.toLocaleString('id-ID');
            
            let buffTexts = [];
            let suryaCount = state.myHeroes.filter(h => h.name === "Panglima Surya").length;
            let gaiaCount = state.myHeroes.filter(h => h.name === "Panglima Gaia").length;
            let lunarCount = state.myHeroes.filter(h => h.name === "Panglima Lunar").length;

            if (suryaCount > 0) buffTexts.push(`✨ Surya: +${30 * state.myHeroes.length * suryaCount} All`);
            if (gaiaCount > 0) buffTexts.push(`🌿 Gaia: +${10 * state.myHeroes.length * gaiaCount} All`);
            if (lunarCount > 0) buffTexts.push(`🌙 Lunar: -${30 * lunarCount} Monster`);

            document.getElementById('player-power-display').innerText = getCalculatedTeamPower();
            document.getElementById('monster-power-display').innerText = getCalculatedMonsterPower();
            
            const buffIndicator = document.getElementById('buff-indicator');
            if (buffTexts.length > 0) {
                buffIndicator.style.display = 'block';
                buffIndicator.innerHTML = buffTexts.join(" | ");
            } else {
                buffIndicator.style.display = 'none';
            }
        }

        function renderHeroes() {
            const container = document.getElementById('my-heroes');
            container.innerHTML = '';
            if (state.myHeroes.length === 0) {
                container.innerHTML = '<div style="opacity: 0.7; font-style: italic; color: #ddd; font-size: 1.2rem; margin-top: 50px;">Belum ada pahlawan.</div>';
                return;
            }
            state.myHeroes.forEach((hero, index) => container.appendChild(createCard(hero, false, index)));
        }

        function renderMonster(mData) {
            const container = document.getElementById('current-monster');
            container.innerHTML = '';
            const div = document.createElement('div');
            div.className = 'card monster-card';
            div.style.backgroundImage = `url('${mData.imgUrl}')`;
            
            div.innerHTML = `<div class="card-power">${getCalculatedMonsterPower()}</div>`; 
            container.appendChild(div);
        }

        function createCard(hero, isShop, index = null) {
            const div = document.createElement('div');
            div.className = `card ${hero.tier}`;
            if (isShop) div.classList.add('shop-item-wrapper');
            div.style.backgroundImage = `url('${hero.imgUrl}')`;
            
            const footerText = isShop ? `Rp ${hero.price.toLocaleString()}` : hero.tier.toUpperCase();
            const specialText = hero.effect ? `<div class="special-effect">${hero.effect}</div>` : '';

            div.innerHTML = `
                <div class="card-power">${hero.power}</div>
                ${specialText}
                <div class="card-price">${footerText}</div>
            `;

            if (!isShop && index !== null) {
                const deleteBtn = document.createElement('button');
                deleteBtn.setAttribute('aria-label', 'Pecat '+hero.name);
                deleteBtn.className = 'discard-btn';
                deleteBtn.innerHTML = '🗑️';
                deleteBtn.title = "Hapus Hero Ini";
                deleteBtn.onclick = function(e) {
                    e.stopPropagation(); 
                    discardHero(index);
                };
                div.appendChild(deleteBtn);
            }
            
            if (isShop) {
                div.onclick = () => buyHero(hero);
                div.tabIndex=0; div.setAttribute('role','button');
                div.setAttribute('aria-label',`Rekrut ${hero.name}, kekuatan ${hero.power}, harga ${hero.price} rupiah`);
                div.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();buyHero(hero);}};
            }
            return div;
        }

        function attackMonster() {
            if (state.gameEnded) return;
            if (state.myHeroes.length === 0) {
                showNotification("Rekrut pahlawan dulu!");
                return;
            }
            
            let totalHeroPower = getCalculatedTeamPower();
            let currentMonsterPower = getCalculatedMonsterPower();

            const mZone = document.getElementById('monster-zone');
            mZone.classList.add('shake-anim');
            setTimeout(() => mZone.classList.remove('shake-anim'), 500);

            if (totalHeroPower > currentMonsterPower) {
                playSound('levelup');
                showLevelUpPopup(state.level);
            } else {
                playSound('wrong');
                showNotification("Kalah Power! Cari dana & beli hero lagi!");
            }
        }

        function showLevelUpPopup(lvl) {
            if (lvl >= 5) {
                showFinalVictory();
                return;
            }

            const modal = document.getElementById('result-modal');
            document.getElementById('result-title').innerText = `Level ${lvl} Selesai!`;
            document.getElementById('result-title').style.color = "#2ecc71";
            document.getElementById('result-message').innerText = `Selamat Komandan ${state.playerName}! Monster berhasil dikalahkan. Siap untuk tantangan berikutnya?`;
            
            document.getElementById('normal-nav-buttons').style.display = 'flex';
            document.getElementById('final-recap-area').style.display = 'none';
            
            const nextBtn = document.getElementById('btn-next-level');
            nextBtn.onclick = () => {
                closeModal('result-modal');
                initLevel(state.level + 1);
            };
            modal.style.display = 'flex';
        }

        function showFinalVictory() {
            if(state.gameEnded)return;
            state.gameEnded = true;
            if(timerInterval) clearInterval(timerInterval);
            
            saveGameResult("Menang (Boss Kalahkan)"); 

            const modal = document.getElementById('result-modal');
            document.getElementById('result-title').innerText = "MISI SUKSES! BUMI AMAN!";
            document.getElementById('result-title').style.color = "#ffd700";
            document.getElementById('result-message').innerText = `Luar Biasa, Komandan ${state.playerName}! Anda telah mengalahkan Jenderal Naga Hitam dan memenangkan permainan.`;

            document.getElementById('normal-nav-buttons').style.display = 'none';
            
            const recapArea = document.getElementById('final-recap-area');
            const recapList = document.getElementById('recap-list');
            recapList.innerHTML = '';
            
            if (state.correctAnswersLog.length > 0) {
                state.correctAnswersLog.forEach((item) => {
                    const row = document.createElement('div');
                    row.className = 'recap-item';
                    row.innerHTML = `
                        <div class="recap-question"><span style="color:#888; font-size:0.8rem;">[${item.cat}]</span><br>${item.q}</div>
                        <div class="recap-answer">✔ ${item.a}</div>
                    `;
                    recapList.appendChild(row);
                });
            } else {
                recapList.innerHTML = '<div style="text-align:center; color:#888;">Belum ada tantangan yang diselesaikan.</div>';
            }

            recapArea.style.display = 'block';
            modal.style.display = 'flex';
        }

        let currentQuestion = null;

        const paidQuestions = new Set();
        function getQuestionByDifficulty(){
            const difficulty=state.level===5?'hard':'medium';
            const eligible=QUESTION_DB.filter(q=>q.difficulty===difficulty&&!paidQuestions.has(q.id));
            return eligible.length?eligible[Math.floor(Math.random()*eligible.length)]:null;
        }
        function openQuestion(){
            if(state.gameEnded)return;if(state.level<=3){openFunding();return;}
            currentQuestion=getQuestionByDifficulty();
            if(!currentQuestion){showNotification('Semua tantangan level ini selesai. Gunakan dana untuk merekrut tim dan melawan monster.');return;}
            renderQuestion();document.getElementById('question-modal').style.display='flex';
        }
        function renderQuestion(){
            const q=currentQuestion;
            document.getElementById('q-category').textContent='UNSUR INTRINSIK CERITA';
            document.getElementById('q-difficulty').textContent=`Level ${state.level} · ${q.type==='multiple'?'Pilih semua jawaban benar':'Pilih satu jawaban'}`;
            document.getElementById('q-stimulus').textContent=q.stimulus;
            document.getElementById('q-text').textContent=q.text;
            document.getElementById('question-feedback').textContent='Baca cerita dengan teliti dan gunakan bukti dari cerita.';
            const opts=document.getElementById('q-options');opts.replaceChildren();
            fundingShuffle(q.options).forEach(opt=>{
                const label=document.createElement('label');label.className='answer-label-anbk';
                const input=document.createElement('input');input.type=q.type==='multiple'?'checkbox':'radio';input.name='story-answer';input.value=opt;input.className='anbk-check';
                label.append(input,document.createTextNode(opt));opts.append(label);
            });
            const btn=document.getElementById('submit-answer-btn');btn.style.display='inline-block';btn.disabled=false;btn.textContent='Periksa jawaban';btn.onclick=validateAnbkAnswer;
        }
        function validateAnbkAnswer(){
            if(state.gameEnded||!currentQuestion||paidQuestions.has(currentQuestion.id))return;
            const selected=[...document.querySelectorAll('.anbk-check:checked')].map(x=>x.value);
            if(!selected.length){document.getElementById('question-feedback').textContent='Pilih jawaban terlebih dahulu.';return;}
            const correct=currentQuestion.correct;
            if(selected.length===correct.length&&selected.every(x=>correct.includes(x))){
                handleCorrectReward(currentQuestion,selected);
                document.querySelectorAll('.anbk-check').forEach(x=>{x.disabled=true;if(x.checked)x.closest('label').classList.add('correct');});
                const btn=document.getElementById('submit-answer-btn');btn.textContent='Tantangan berikutnya';btn.onclick=openQuestion;
            }else{playSound('wrong');document.getElementById('question-feedback').textContent='Belum tepat. '+currentQuestion.explanation+' Perbaiki pilihanmu, lalu periksa kembali.';}
        }
        function handleCorrectReward(q,answers){
            if(state.gameEnded||paidQuestions.has(q.id))return;paidQuestions.add(q.id);
            const reward=(q.difficulty==='hard'?15000:7500)+Math.floor(Math.random()*2000);
            state.money+=reward;state.correctAnswersLog.push({id:q.id,cat:q.category,q:q.stimulus+' — '+q.text,a:answers.join('; ')+' Penjelasan: '+q.explanation,lvl:q.difficulty.toUpperCase()});
            updateHUD();playSound('correct');document.getElementById('question-feedback').textContent=`Tepat! +Rp${reward.toLocaleString('id-ID')}. ${q.explanation} Hadiah diberikan satu kali.`;
        }

        function openShop() {
            if(state.gameEnded)return;
            const modal = document.getElementById('shop-modal');
            const container = document.getElementById('shop-container');
            container.innerHTML = '';
            HERO_DB.forEach(hero => {
                container.appendChild(createCard(hero, true));
            });
            modal.style.display = 'flex';
        }

        function buyHero(hero) {
            if(state.gameEnded)return;
            if(state.myHeroes.length >= 5) { showNotification("Tim Penuh (Maks 5)!"); return; } 
            if(state.money < hero.price) { showNotification("Dana Kurang!"); return; }
            
            state.money -= hero.price;
            state.myHeroes.push({...hero}); 
            updateHUD();
            
            const currentMonsterData = MONSTER_LEVELS.find(m => m.level === state.level);
            if(currentMonsterData) renderMonster(currentMonsterData);

            renderHeroes();
            showNotification(`+ ${hero.name}`);
            closeModal('shop-modal');
            playSound('buy');
        }

        let heroToDiscardIndex = null; 
        function discardHero(index) {
            heroToDiscardIndex = index;
            document.getElementById('discard-confirm-modal').style.display = 'flex';
        }

        function executeDiscard() {
            if (heroToDiscardIndex !== null) {
                const removedHero = state.myHeroes[heroToDiscardIndex];
                state.myHeroes.splice(heroToDiscardIndex, 1);
                updateHUD();
                
                const currentMonsterData = MONSTER_LEVELS.find(m => m.level === state.level);
                if(currentMonsterData) renderMonster(currentMonsterData);

                renderHeroes();
                showNotification(`- ${removedHero.name} Dibuang`);
                
                heroToDiscardIndex = null;
                closeModal('discard-confirm-modal');
            }
        }

        function toggleFullscreen() {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {});
            } else {
                if (document.exitFullscreen) document.exitFullscreen();
            }
        }

        function closeModal(id) { if(id==='funding-modal' && cancelFundingDrag) cancelFundingDrag(); document.getElementById(id).style.display = 'none'; }
        
        function showNotification(txt) {
            const el = document.getElementById('notification');
            el.innerText = txt;
            el.style.opacity = '1';
            el.style.top = '50%';
            setTimeout(() => { el.style.opacity = '0'; el.style.top = '20%'; }, 2000);
        }
        
        function playSound(type) { 
            const sounds = {
                'correct': document.getElementById('sfx-correct'),
                'wrong': document.getElementById('sfx-wrong'),
                'buy': document.getElementById('sfx-buy'),
                'levelup': document.getElementById('sfx-levelup')
            };
            const el = sounds[type];
            if (el) {
                el.currentTime = 0;
                el.play().catch(e => console.log("Audio play blocked by browser:", e));
            }
        }

        const musicBtn = document.getElementById('music-btn');
        let isMusicPlaying = false;
        function updateMusicButton() {
            const bgm = document.getElementById('bgm');
            isMusicPlaying = !bgm.paused;
            musicBtn.innerHTML = isMusicPlaying && bgm.volume > 0 ? '🔊' : '🔇';
            musicBtn.title = isMusicPlaying ? 'Jeda musik' : 'Putar musik';
            musicBtn.setAttribute('aria-label', musicBtn.title);
            musicBtn.classList.toggle('playing', isMusicPlaying && bgm.volume > 0);
        }
        function toggleMusic(forcePlay = false) {
            const bgm = document.getElementById('bgm');
            if (bgm.paused || forcePlay) {
                bgm.play().then(updateMusicButton).catch(() => {
                    updateMusicButton();
                    showNotification('Ketuk tombol musik untuk memutar.');
                });
            } else {
                bgm.pause();
                updateMusicButton();
            }
        }
        document.getElementById('bgm').addEventListener('pause', updateMusicButton);
        document.getElementById('bgm').addEventListener('play', updateMusicButton);
        const FUNDING_TITLES = ['', 'Temukan Unsur Cerita', 'Hubungkan Bukti Cerita', 'Susun Alur Cerita'];
        const FUNDING_TYPES = ['', 'Klik kartu bukti', 'Menjodohkan', 'Seret dan lepas peristiwa'];
        let fundingChallenge = null;
        const fundingSeen = {1:new Set(),2:new Set(),3:new Set()};
        const fundingNumber = n => n.toLocaleString('id-ID');
        function fundingShuffle(items) {
            const result=[...items];
            for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
            return result;
        }
        function createFundingChallenge() {
            const level=state.level, pool=[];
            STORIES.forEach(s=>{for(let mode=0;mode<(level===1?3:1);mode++){
                const id=`${level}-${s.id}-${mode}`;
                if(!fundingSeen[level].has(id))pool.push({id,s,mode});
            }});
            if(!pool.length)return null;
            const {id,s,mode}=pool[Math.floor(Math.random()*pool.length)];
            return {id,level,s,mode,paid:false,selected:null,chosen:[],matched:[],places:fundingShuffle([0,1,2,3]),
                tokens:fundingShuffle([...s.people,s.place,s.time,s.trait,s.theme]),
                numbers:fundingShuffle([0,1,2,3]),events:s.events,order:[null,null,null,null],answer:[0,1,2,3]};
        }
        function openFunding() {
            if(state.gameEnded||state.level>3)return;
            if(!fundingChallenge||fundingChallenge.level!==state.level||fundingChallenge.paid)fundingChallenge=createFundingChallenge();
            if(!fundingChallenge){showNotification('Semua tantangan level ini selesai. Gunakan dana untuk merekrut tim dan melawan monster.');return;}
            document.getElementById('funding-modal').style.display='flex';renderFunding();document.getElementById('funding-title').focus();
        }
        function fundingFeedback(message,success=false){const el=document.getElementById('funding-feedback');el.textContent=message;el.className=success?'funding-feedback success':'funding-feedback';}
        function fundingButton(text,action,attrs={}){const b=document.createElement('button');b.className='funding-tile';b.textContent=text;b.onclick=action;for(const [k,v] of Object.entries(attrs))b.setAttribute(k,v);return b;}
        function fundingExpected(c){return c.mode===0?c.s.people:c.mode===1?[c.s.place]:[c.s.time];}
        function renderFunding(){
            const c=fundingChallenge,s=c.s;
            if(fundingMatchObserver)fundingMatchObserver.disconnect();if(cancelFundingDrag)cancelFundingDrag();
            document.getElementById('funding-kicker').textContent=`CARI DANA · LEVEL ${c.level} · ${FUNDING_TYPES[c.level]}`;
            document.getElementById('funding-title').textContent=FUNDING_TITLES[c.level];
            const body=document.getElementById('funding-interaction');body.replaceChildren();
            document.getElementById('funding-check').hidden=c.paid;
            document.getElementById('funding-reset').hidden=c.paid;
            document.getElementById('funding-next').hidden=!c.paid;
            fundingFeedback('Selesaikan aktivitas untuk mendapat dana. Jika belum tepat, perbaiki dan coba kembali.');
            document.getElementById('funding-story').textContent=c.level===3?'Judul cerita: '+s.title:s.title+'\n'+s.events.join(' ');
            if(c.paid){body.textContent=c.explanation;fundingFeedback(`Tepat! +Rp${fundingNumber(c.reward)}. Hadiah tantangan ini sudah diterima satu kali.`,true);return;}
            if(c.level===1){
                const p=document.createElement('p');p.className='story-instruction';
                p.textContent=['Klik SEMUA kartu nama tokoh dalam cerita.','Klik kartu latar tempat pada AWAL cerita.','Klik kartu latar waktu pada AWAL cerita.'][c.mode]+' Klik lagi untuk membatalkan pilihan.';body.append(p);
                const bank=document.createElement('div');bank.className='story-tokens';
                c.tokens.forEach((token,i)=>{const b=fundingButton(token,()=>{if(c.chosen.includes(token))c.chosen=c.chosen.filter(x=>x!==token);else c.chosen.push(token);renderFunding();document.querySelector(`[data-token="${i}"]`).focus();},{'aria-pressed':c.chosen.includes(token),'data-token':i});bank.append(b);});body.append(bank);
            }else if(c.level===2){
                const p=document.createElement('p');p.className='story-instruction';p.textContent='Pilih bukti di kiri, lalu unsur yang sesuai di kanan. Hubungkan keempat pasangan.';body.append(p);
                const grid=document.createElement('div');grid.className='funding-match';
                const left=document.createElement('div'),right=document.createElement('div');
                const values=[s.people.join(' dan '),s.clue,s.place,s.time],labels=['Tokoh',`Bukti watak ${s.trait}`,'Latar tempat awal','Latar waktu awal'];
                values.forEach((v,i)=>{const b=fundingButton(v,()=>{c.selected=i;renderFunding();fundingFeedback('Bukti dipilih. Sekarang pilih unsur di kanan.');document.querySelector('[data-place-index]:not(:disabled)')?.focus();},{'data-digit-index':i,'aria-pressed':c.selected===i});b.disabled=c.matched.includes(i);left.append(b);});
                c.places.forEach(i=>{const b=fundingButton(labels[i],()=>{if(c.selected===null){fundingFeedback('Pilih bukti di kiri terlebih dahulu.');return;}if(c.selected!==i){playSound('wrong');fundingFeedback('Belum cocok. Tokoh = pelaku; watak = sifat dari tindakan; tempat = di mana; waktu = kapan.');return;}c.matched.push(i);c.selected=null;renderFunding();fundingFeedback(`Tepat, ${c.matched.length}/4 pasangan terhubung.`,true);document.querySelector('[data-digit-index]:not(:disabled)')?.focus();},{'data-place-index':i});b.disabled=c.matched.includes(i);right.append(b);});
                const lines=document.createElementNS('http://www.w3.org/2000/svg','svg');lines.classList.add('funding-lines');lines.setAttribute('aria-hidden','true');grid.append(lines,left,right);body.append(grid);
                fundingMatchObserver=new ResizeObserver(drawFundingConnections);fundingMatchObserver.observe(grid);requestAnimationFrame(drawFundingConnections);
            }else renderFundingOrder(body,c);
        }
        function resetFunding(){if(!fundingChallenge||fundingChallenge.paid||state.gameEnded)return;Object.assign(fundingChallenge,{chosen:[],selected:null,matched:[],order:[null,null,null,null]});fundingKeyboardCard=null;renderFunding();}
        function checkFunding(){
            const c=fundingChallenge;if(!c||c.paid||state.gameEnded||c.level!==state.level)return;
            const expected=fundingExpected(c);
            const correct=c.level===1?c.chosen.length===expected.length&&expected.every(x=>c.chosen.includes(x)):c.level===2?c.matched.length===4:c.order.every((x,i)=>x===i);
            if(!correct){playSound('wrong');fundingFeedback(c.level===1?['Cari pelaku yang disebut namanya dalam cerita. Pilih semua tokohnya.','Cari keterangan yang menjawab: di mana cerita dimulai?','Cari keterangan yang menjawab: kapan cerita dimulai?'][c.mode]:c.level===2?'Hubungkan semua empat pasangan terlebih dahulu.':'Perhatikan awal kejadian, masalah, usaha menyelesaikannya, lalu hasilnya. Susunan belum tepat.');return;}
            c.paid=true;fundingSeen[c.level].add(c.id);c.reward=(c.level===3?7500:5000)+Math.floor(Math.random()*2000);
            c.explanation=c.level===1?['Tokoh: ','Latar tempat awal: ','Latar waktu awal: '][c.mode]+expected.join(' dan '):c.level===2?`Tokoh: ${c.s.people.join(' dan ')}. ${c.s.clue} Ini menunjukkan watak ${c.s.trait}. Awal cerita: ${c.s.time} di ${c.s.place}.`:c.events.map((x,i)=>`${i+1}. ${x}`).join(' ');
            state.money+=c.reward;state.correctAnswersLog.push({id:c.id,cat:`INTERAKSI LEVEL ${c.level}`,q:c.s.title+' — '+FUNDING_TITLES[c.level],a:c.explanation,lvl:`LEVEL ${c.level}`});
            playSound('correct');updateHUD();renderFunding();document.getElementById('funding-next').focus();
        }

        let fundingMatchObserver = null;
        
        let fundingKeyboardCard = null;
        let cancelFundingDrag = null;
        const fundingPairColors = ['#2563eb','#9d3fc4','#138260','#c15712','#b52b5e'];

        function drawFundingConnections() {
            const grid = document.querySelector('.funding-match');
            const svg = grid && grid.querySelector('.funding-lines');
            if (!svg || !fundingChallenge || fundingChallenge.level !== 2) return;
            svg.replaceChildren();
            const bounds = grid.getBoundingClientRect();
            if (!bounds.width) return;
            svg.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
            fundingChallenge.matched.forEach(i => {
                const left = grid.querySelector(`[data-digit-index="${i}"]`);
                const right = grid.querySelector(`[data-place-index="${i}"]`);
                const a = left.getBoundingClientRect(), b = right.getBoundingClientRect();
                const x1 = a.right-bounds.left, y1 = a.top+a.height/2-bounds.top;
                const x2 = b.left-bounds.left, y2 = b.top+b.height/2-bounds.top;
                const middle = (x1+x2)/2;
                const line = document.createElementNS('http://www.w3.org/2000/svg','path');
                line.setAttribute('d', `M ${x1} ${y1} C ${middle} ${y1}, ${middle} ${y2}, ${x2} ${y2}`);
                line.setAttribute('stroke',fundingPairColors[i]);line.setAttribute('stroke-width','3');line.setAttribute('fill','none');
                line.dataset.connection = i;svg.appendChild(line);
                [left,right].forEach(button => {button.style.borderColor=fundingPairColors[i];});
                [[x1,y1],[x2,y2]].forEach(([x,y]) => {
                    const dot=document.createElementNS('http://www.w3.org/2000/svg','circle');
                    dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',4);dot.setAttribute('fill',fundingPairColors[i]);svg.appendChild(dot);
                });
            });
        }

        function placeFundingCard(number, destination) {
            const c = fundingChallenge;
            if (!c || c.level !== 3 || c.paid || state.gameEnded || state.level !== 3 || !c.numbers.includes(number)) return;
            const previous = c.order.indexOf(number);
            if (destination === 'bank') {
                if (previous >= 0) c.order[previous] = null;
            } else {
                const index = Number(destination);
                if (!Number.isInteger(index) || index < 0 || index > 3) return;
                if (previous === index) return;
                const displaced = c.order[index];
                if (previous >= 0) c.order[previous] = displaced;
                c.order[index] = number;
            }
            fundingKeyboardCard = null;renderFunding();
            fundingFeedback(destination === 'bank' ? 'Kartu kembali ke tempat semula.' : `Kartu ${fundingChallenge.events[number]} ditempatkan pada urutan ${Number(destination)+1}.`, true);
            document.querySelector(`[data-number="${number}"]`)?.focus({preventScroll:true});
        }

        function makeFundingDragCard(number) {
            const card = fundingButton(fundingChallenge.events[number], () => {}, {'data-number':number,'aria-label':`Peristiwa ${fundingChallenge.events[number]}. Seret ke kotak urutan, atau tekan Spasi untuk mengambil.`});
            card.classList.add('funding-drag-card');
            card.onkeydown = event => {
                if (event.key === ' ' || event.key === 'Enter') {
                    event.preventDefault();event.stopPropagation();fundingKeyboardCard=number;
                    document.querySelectorAll('.funding-drag-card').forEach(el=>el.classList.remove('keyboard-picked'));
                    card.classList.add('keyboard-picked');
                    fundingFeedback(`Kartu ${fundingChallenge.events[number]} diambil. Tekan Tab ke kotak tujuan, lalu Enter untuk meletakkan. Esc untuk batal.`);
                } else if(event.key==='Escape') {fundingKeyboardCard=null;card.classList.remove('keyboard-picked');}
            };
            card.onpointerdown = event => {
                if (!event.isPrimary || (event.pointerType==='mouse' && event.button!==0)) return;
                if (cancelFundingDrag) cancelFundingDrag();
                const initialX=event.clientX, initialY=event.clientY, pointerId=event.pointerId;
                let ghost=null, target=null;
                card.focus({preventScroll:true});card.setPointerCapture(pointerId);
                const cleanup=()=>{
                    ghost?.remove();target?.classList.remove('drop-active');card.classList.remove('dragging');
                    window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);
                    if(card.hasPointerCapture(pointerId)) card.releasePointerCapture(pointerId);
                    cancelFundingDrag=null;
                };
                const move=e=>{
                    if(e.pointerId!==pointerId)return;
                    if(!ghost && Math.hypot(e.clientX-initialX,e.clientY-initialY)<7)return;
                    e.preventDefault();
                    if(!ghost){ghost=document.createElement('div');ghost.className='funding-drag-ghost';ghost.textContent=fundingChallenge.events[number];ghost.setAttribute('aria-hidden','true');document.body.appendChild(ghost);card.classList.add('dragging');}
                    ghost.style.left=`${e.clientX}px`;ghost.style.top=`${e.clientY}px`;
                    target?.classList.remove('drop-active');
                    target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-drop-slot]')||null;
                    target?.classList.add('drop-active');
                };
                const up=e=>{if(e.pointerId!==pointerId)return;const destination=ghost&&target?target.dataset.dropSlot:null;cleanup();if(destination!==null)placeFundingCard(number,destination);};
                const cancel=e=>{if(e.pointerId===pointerId)cleanup();};
                cancelFundingDrag=cleanup;
                window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);
            };
            return card;
        }
        function enableFundingKeyboardDrop(element) {
            element.tabIndex=0;
            element.onkeydown=event=>{
                if(event.target!==element)return;
                if((event.key==='Enter'||event.key===' ')&&fundingKeyboardCard!==null){event.preventDefault();placeFundingCard(fundingKeyboardCard,element.dataset.dropSlot);}
            };
        }
        function renderFundingOrder(body,c){
            const p=document.createElement('p');p.className='story-instruction';p.textContent='Seret kartu ke urutan 1–4. Kartu dapat ditukar atau dikembalikan ke area kartu. Keyboard: Tab ke kartu, Spasi/Enter untuk mengambil, Tab ke kotak, Enter untuk meletakkan; Esc untuk batal.';body.append(p);
            const slots=document.createElement('div');slots.className='funding-drop-slots';
            for(let i=0;i<4;i++){
                const slot=document.createElement('div');slot.className='funding-drop-slot';slot.dataset.dropSlot=i;slot.setAttribute('aria-label',`Urutan ${i+1}`);slot.setAttribute('role','group');enableFundingKeyboardDrop(slot);
                const label=document.createElement('span');label.className='funding-slot-label';label.textContent=`Urutan ${i+1}`;slot.append(label);
                if(c.order[i]!==null)slot.append(makeFundingDragCard(c.order[i]));else {const hint=document.createElement('span');hint.className='funding-drop-hint';hint.textContent='Lepaskan peristiwa di sini';slot.append(hint);}slots.append(slot);
            }body.append(slots);
            const label=document.createElement('p');label.className='funding-bank-label';label.textContent='Kartu peristiwa — dari awal sampai akhir cerita';body.append(label);
            const bank=document.createElement('div');bank.className='funding-number-bank funding-drop-bank';bank.dataset.dropSlot='bank';bank.setAttribute('role','group');bank.setAttribute('aria-label','Area kartu peristiwa');enableFundingKeyboardDrop(bank);
            c.numbers.filter(n=>!c.order.includes(n)).forEach(n=>bank.append(makeFundingDragCard(n)));
            if(c.order.every(n=>n!==null))bank.append(document.createTextNode('Semua kartu terpasang. Seret ke sini untuk mengembalikan kartu.'));body.append(bank);
        }

        document.addEventListener('keydown', event=>{
            if(event.key==='Escape') {if(cancelFundingDrag)cancelFundingDrag();fundingKeyboardCard=null;document.querySelectorAll('.keyboard-picked').forEach(el=>el.classList.remove('keyboard-picked'));}
        });

        const MUSIC_VOLUME_KEY = 'liga-pahlawan-volume-musik-v1';
        function setMusicVolume(value) {
            const parsed = Number(value);
            const percent = Number.isFinite(parsed) ? Math.max(0, Math.min(100, Math.round(parsed))) : 50;
            document.getElementById('bgm').volume = percent / 100;
            document.getElementById('bgm-volume').value = percent;
            document.getElementById('bgm-volume-value').textContent = percent + '%';
            updateMusicButton();
            try { localStorage.setItem(MUSIC_VOLUME_KEY, String(percent)); } catch (error) { /* Musik tetap dapat diatur tanpa penyimpanan. */ }
        }
        let savedMusicVolume = 50;
        try {
            const saved = localStorage.getItem(MUSIC_VOLUME_KEY);
            if (saved !== null && saved.trim() !== '' && Number.isFinite(Number(saved))) savedMusicVolume = Number(saved);
        } catch (error) { /* Gunakan volume awal jika penyimpanan dibatasi. */ }
        setMusicVolume(savedMusicVolume);
        function positionGameControls() {
            const levelGroup = document.getElementById('level-controls');
            levelGroup.prepend(document.getElementById('game-audio-controls'));
            document.querySelector('#hud .hud-right').appendChild(document.getElementById('fullscreen-btn'));
            document.querySelector('.top-controls').style.display = 'none';
        }
        function fitGameStage() {
            const viewport = window.visualViewport;
            const width = viewport ? viewport.width : window.innerWidth;
            const height = viewport ? viewport.height : window.innerHeight;
            const scale = Math.min(width / 1280, height / 720);
            document.documentElement.style.setProperty('--game-scale', String(scale));
            const frame = document.getElementById('game-viewport');
            frame.style.width = width + 'px';frame.style.height = height + 'px';
            frame.style.left = (viewport ? viewport.offsetLeft : 0) + 'px';
            frame.style.top = (viewport ? viewport.offsetTop : 0) + 'px';
            requestAnimationFrame(drawFundingConnections);
        }
        window.addEventListener('resize',fitGameStage);
        document.addEventListener('fullscreenchange',fitGameStage);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize',fitGameStage);
            window.visualViewport.addEventListener('scroll',fitGameStage);
        }
        fitGameStage();
        function openDeveloperProfile() {
            document.getElementById('developer-overlay').style.display='flex';
            document.getElementById('developer-profile').show();
            document.querySelector('.developer-close').focus({preventScroll:true});
        }
        function closeDeveloperProfile() {
            document.getElementById('developer-profile').close();
            document.getElementById('developer-overlay').style.display='none';
            document.getElementById('developer-profile-open').focus({preventScroll:true});
        }
        document.getElementById('developer-profile').addEventListener('keydown',event=>{
            if(event.key==='Escape'){event.preventDefault();closeDeveloperProfile();}
            if(event.key==='Tab'){event.preventDefault();document.querySelector('.developer-close').focus();}
        });

        
        const learningProgress = {summaryRead:false,index:0,solved:[false,false,false,false],choices:[null,null,null,null],attempts:0,passed:false};

        function showLearningScreen(id) {
            document.getElementById('notification').style.opacity='0';
            ['tutorial-screen','summary-screen','understanding-screen'].forEach(screenId=>{
                const screen=document.getElementById(screenId);
                screen.style.display=screenId===id?'flex':'none';
                screen.style.opacity=screenId===id?'1':'0';
            });
        }
        function openLearningSummary() {
            if(state.gameStarted)return;
            if(!document.getElementById('player-name-input').value.trim()){
                showLearningScreen('tutorial-screen');
                showNotification('Mohon masukkan nama Komandan!');
                document.getElementById('player-name-input').focus();return;
            }
            showLearningScreen('summary-screen');
            document.getElementById('summary-title').focus({preventScroll:true});
        }
        function backToPreparation() {
            if(state.gameStarted)return;
            showLearningScreen('tutorial-screen');document.getElementById('player-name-input').focus({preventScroll:true});
        }
        function openUnderstanding() {
            if(state.gameStarted)return;
            learningProgress.summaryRead=true;
            showLearningScreen('understanding-screen');renderUnderstanding();
            document.getElementById('understanding-title').focus({preventScroll:true});
        }
        function setUnderstandingFeedback(text,kind='') {
            const feedback=document.getElementById('understanding-feedback');
            feedback.textContent=text;feedback.dataset.kind=kind;
        }
        function renderUnderstanding() {
            const p=learningProgress;
            const complete=p.solved.every(Boolean);
            p.passed=p.summaryRead&&complete;
            document.getElementById('understanding-layout').hidden=complete;
            document.getElementById('understanding-complete').hidden=!complete;
            document.getElementById('understanding-check').hidden=complete;
            document.getElementById('understanding-next').hidden=complete;
            document.getElementById('understanding-start').hidden=!complete;
            document.getElementById('understanding-start').disabled=!p.passed;
            document.getElementById('understanding-status').textContent=`${p.solved.filter(Boolean).length}/4 latihan selesai`;
            if(complete)return;
            const q=UNDERSTANDING_QUESTIONS[p.index];
            const steps=document.getElementById('understanding-steps');steps.replaceChildren();
            UNDERSTANDING_QUESTIONS.forEach((item,i)=>{
                const li=document.createElement('li');li.className=p.solved[i]?'done':i===p.index?'current':'';
                if(i===p.index)li.setAttribute('aria-current','step');
                const symbol=document.createElement('b');symbol.textContent=p.solved[i]?'✓':String(i+1);
                li.append(symbol,document.createTextNode(item.topic));steps.appendChild(li);
            });
            document.getElementById('understanding-counter').textContent=`LATIHAN ${p.index+1} DARI 4 · ${q.topic.toUpperCase()}`;
            document.getElementById('understanding-question').textContent=q.question;
            const options=document.getElementById('understanding-options');options.replaceChildren();
            q.options.forEach((answer,i)=>{
                const label=document.createElement('label');label.className='understanding-option';
                if(p.solved[p.index]&&i===q.correct)label.classList.add('correct');
                const input=document.createElement('input');input.type='radio';input.name='understanding-answer';input.value=i;
                input.checked=p.choices[p.index]===i;input.disabled=p.solved[p.index];
                input.onchange=()=>{p.choices[p.index]=i;setUnderstandingFeedback('Jawaban dipilih. Klik Periksa jawaban untuk melanjutkan.');};
                label.append(input,document.createTextNode(answer));options.appendChild(label);
            });
            document.getElementById('understanding-check').disabled=p.solved[p.index];
            document.getElementById('understanding-next').disabled=!p.solved[p.index];
            document.getElementById('understanding-next').textContent=p.index===3?'Lihat hasil latihan →':'Latihan berikutnya →';
            setUnderstandingFeedback(p.solved[p.index]?q.explanation:'Pilih satu jawaban. Kamu bisa mencoba kembali jika belum tepat.',p.solved[p.index]?'correct':'');
        }
        function checkUnderstanding() {
            const p=learningProgress;
            if(state.gameStarted||p.passed||p.solved[p.index])return;
            if(p.choices[p.index]===null){setUnderstandingFeedback('Pilih satu jawaban terlebih dahulu.');return;}
            p.attempts++;
            const q=UNDERSTANDING_QUESTIONS[p.index];
            if(p.choices[p.index]!==q.correct){playSound('wrong');setUnderstandingFeedback('Belum tepat. '+q.hint,'wrong');return;}
            p.solved[p.index]=true;playSound('correct');renderUnderstanding();
            if(p.passed)document.getElementById('understanding-start').focus({preventScroll:true});
            else document.getElementById('understanding-next').focus({preventScroll:true});
        }
        function nextUnderstanding() {
            if(state.gameStarted||!learningProgress.solved[learningProgress.index])return;
            if(learningProgress.index<3)learningProgress.index++;
            renderUnderstanding();document.getElementById('understanding-question').focus({preventScroll:true});
        }

