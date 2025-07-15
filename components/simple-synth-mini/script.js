// script.js

/**
 * SimpleSynthMini クラス定義
 * - SVG ピアノ鍵盤を描画
 * - Web Audio API で音を鳴らす
 * - data-* 属性でカスタマイズ可能
 */
export class SimpleSynthMini {
    /**
     * @param {HTMLElement} containerElement — コンポーネントを差し込む div 要素
     */
    constructor(containerElement) {
        this.container = containerElement;
        this.audioContext = null;      // AudioContext のインスタンス
        this.gainNode = null;          // ボリューム操作用の GainNode
        this.oscillators = {};         // 再生中のオシレータを格納

        // 初期設定を読み込む
        this.settings = this._readSettingsFromDataAttributes();
        this.init();
    }

    /**
     * data-* 属性から設定値を読み込む（プライベートメソッド）
     */
    _readSettingsFromDataAttributes() {
        return {
            volumeSlider: this.container.dataset.volumeSlider === 'true',
            octaves: parseInt(this.container.dataset.octaves, 10) || 1,
            startNote: this.container.dataset.startNote || 'C4',
            soundEnabled: this.container.dataset.soundEnabled === 'true',
            instrument: this.container.dataset.instrument || 'sine', // 波形タイプ
            showNoteLabels: this.container.dataset.showNoteLabels === 'true'
        };
    }

    /** 初期化 */
    init() {
        this.renderUI();             // UI（SVG + 内部ボリュームスライダー）を生成
        this.updateLabelVisibility(); // ラベル表示設定を反映
        this.attachEventListeners(); // 鍵盤のクリック / タッチイベントを設定
    }

    /** AudioContext をユーザー操作後に初期化 */
    initAudio() {
        if (!this.audioContext) {
            try {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.gainNode = this.audioContext.createGain();
                this.gainNode.connect(this.audioContext.destination);
                this.gainNode.gain.value = 0.5;
            }
            catch (e) {
                console.error('Web Audio API 初期化失敗:', e);
                this.settings.soundEnabled = false;
            }
        }
        // 既存のコンテキストがサスペンド中なら復帰させる
        else if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log('AudioContext resumed.');
            });
        }
    }


    /** UI 部分の描画 */
    renderUI() {
        // コンテナ内をクリア
        this.container.innerHTML = '';

        // SVG キーボードを追加
        const svgString = this.createKeyboardSVG();
        this.container.insertAdjacentHTML('beforeend', svgString);

        // data-volume-slider が true の場合のみ、内部ボリュームスライダーを追加
        if (this.settings.volumeSlider) {
            const volumeDiv = document.createElement('div');
            volumeDiv.className = 'ssm-volume-control';
            volumeDiv.innerHTML = `
                <label for="vol-${this.container.id}">Volume:</label>
                <input type="range" id="vol-${this.container.id}" min="0" max="1" step="0.01" value="0.5">
            `;
            this.container.appendChild(volumeDiv);

            // 内部スライダー変更時に音量更新
            const slider = volumeDiv.querySelector(`#vol-${this.container.id}`);
            slider.addEventListener('input', e => {
                this.updateVolume(parseFloat(e.target.value));
            });
        }
    }

    /**鍵盤 SVG を生成 */
    createKeyboardSVG() {
        const whiteCount = 7;
        const totalWhite = this.settings.octaves * whiteCount;
        const whiteW = 200 / whiteCount;
        const blackW = whiteW * 0.6;
        const blackH = 60;
        const startMidi = this.noteToMidi(this.settings.startNote);
        const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const whiteNotes = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
        const blackNotes = ['C#', 'D#', 'F#', 'G#', 'A#'];

        let svg = `<svg viewBox="0 0 ${totalWhite * whiteW} 100" role="application" aria-label="ピアノ鍵盤"><defs>
            <rect id="w" width="${whiteW}" height="100"/>
            <rect id="b" width="${blackW}" height="${blackH}"/>
        </defs>`;

        // 白鍵
        for (let oct = 0; oct < this.settings.octaves; oct++) {
            let idxW = 0;
            notes.forEach((n, i) => {
                if (whiteNotes.includes(n)) {
                    const midi = startMidi + oct * 12 + i;
                    const noteName = this.midiToNote(midi);
                    const x = idxW * whiteW + oct * whiteW * whiteCount;
                    svg += `<g transform="translate(${x},0)">
                                <use href="#w" class="key white-key" data-note="${noteName}" />
                                <text x="${whiteW / 2}" y="90" class="note-label">${noteName}</text>
                            </g>`;
                    idxW++;
                }
            });
        }

        // 黒鍵
        for (let oct = 0; oct < this.settings.octaves; oct++) {
            notes.forEach((n, i) => {
                if (blackNotes.includes(n)) {
                    const midi = startMidi + oct * 12 + i;
                    const noteName = this.midiToNote(midi);
                    let pos;
                    if (n === 'C#') pos = 1;
                    else if (n === 'D#') pos = 2;
                    else if (n === 'F#') pos = 4;
                    else if (n === 'G#') pos = 5;
                    else if (n === 'A#') pos = 6;
                    const x = (pos * whiteW - blackW / 2) + oct * whiteW * whiteCount;
                    svg += `<g transform="translate(${x},0)">
                                <use href="#b" class="key black-key" data-note="${noteName}" />
                                <text x="${blackW / 2}" y="50" class="note-label black-key-label">${noteName}</text>
                            </g>`;
                }
            });
        }

        svg += `</svg>`;
        return svg;
    }

    /**鍵盤の押下／離脱イベントを設定 */
    attachEventListeners() {
        const keys = this.container.querySelectorAll('.key');
        keys.forEach(key => {
            const note = key.dataset.note;
            const down = () => {
                key.classList.add('active');
                if (this.settings.soundEnabled) this.playNote(note);
            };
            const up = () => {
                key.classList.remove('active');
                if (this.settings.soundEnabled) this.stopNote(note);
            };

            // マウス操作
            key.addEventListener('mousedown', down);
            key.addEventListener('mouseup', up);
            key.addEventListener('mouseleave', up);

            // タッチ操作
            key.addEventListener('touchstart', e => { e.preventDefault(); down(); }, { passive: false });
            key.addEventListener('touchend', up);
            key.addEventListener('touchcancel', up);
        });
    }

    /** 音を鳴らす */
    playNote(note) {
        this.initAudio();
        if (!this.audioContext) return;

        // すでに再生中なら一旦停止
        if (this.oscillators[note]) {
            this.stopNote(note);
        }

        // 周波数計算
        const freq = this.noteToFrequency(note);
        if (freq == null) return;

        // オシレータ生成
        const osc = this.audioContext.createOscillator();
        osc.type = this.settings.instrument;
        osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
        osc.connect(this.gainNode);
        osc.start();

        this.oscillators[note] = osc;

        // カスタムイベント
        this.container.dispatchEvent(new CustomEvent('ssm-key-down', {
            detail: {
                note,
                frequency: freq,
                midi: this.noteToMidi(note),
                instrument: this.settings.instrument
            }
        }));
    }


    /** 音を止める */
    stopNote(note) {
        const osc = this.oscillators[note];
        if (osc) {
            osc.stop(this.audioContext.currentTime + 0.05);
            osc.disconnect();
            delete this.oscillators[note];
            this.container.dispatchEvent(new CustomEvent('ssm-key-up', {
                detail: { note, midi: this.noteToMidi(note) }
            }));
        }
    }

    /** ボリューム更新 */
    updateVolume(v) {
        if (this.gainNode) this.gainNode.gain.value = v;
    }

    /** ノート名 → MIDI 番号 */
    noteToMidi(note) {
        const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const pitch = note.slice(0, -1);
        const oct = parseInt(note.slice(-1), 10);
        const idx = names.indexOf(pitch);
        if (idx < 0) return null;
        return idx + (oct + 1) * 12;
    }

    /** MIDI 番号 → ノート名 */
    midiToNote(num) {
        const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const oct = Math.floor(num / 12) - 1;
        const idx = num % 12;
        return names[idx] + oct;
    }

    /** ノート名 → 周波数 */
    noteToFrequency(note) {
        const midi = this.noteToMidi(note);
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /** ラベル表示切替 */
    updateLabelVisibility() {
        if (this.settings.showNoteLabels) this.container.classList.remove('ssm-no-labels');
        else this.container.classList.add('ssm-no-labels');
    }

    /** 外部から data-* を変更後に再描画 */
    updateSettings() {
        this.settings = this._readSettingsFromDataAttributes();
        this.renderUI();
        this.updateLabelVisibility();
        this.attachEventListeners();
    }
}

