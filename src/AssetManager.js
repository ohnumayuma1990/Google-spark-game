/**
 * AssetManager.js
 * アセットマニフェスト (assets.json) の非同期ロード、画像および Web Audio API を用いた効果音管理クラス。
 */
export class AssetManager {
  constructor() {
    this.manifest = null;
    this.images = new Map();
    this.audioBuffers = new Map();
    this.audioConfig = new Map();
    this.fallbackCanvas = null;

    this.totalAssets = 0;
    this.loadedAssets = 0;

    // Web Audio API Context (Lazy initialize)
    this.audioCtx = null;
  }

  /**
   * Web Audio API の AudioContext を取得（必要に応じて生成・再開）
   */
  getAudioContext() {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * 相対URLの解決関数
   * @private
   */
  _resolveUrl(url, manifestUrl) {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) {
      return url;
    }
    try {
      const absoluteManifestUrl = new URL(manifestUrl, window.location.href);
      if (absoluteManifestUrl.pathname.endsWith('/assets/assets.json')) {
        const rootUrl = new URL('../..', absoluteManifestUrl);
        return new URL(url, rootUrl).href;
      }
      return new URL(url, absoluteManifestUrl).href;
    } catch (e) {
      return url;
    }
  }

  /**
   * アセットマニフェスト (JSON) を読み込み、全アセットを非同期並列ロードする
   * @param {string} manifestUrl
   * @returns {Promise<void>}
   */
  async loadManifest(manifestUrl) {
    try {
      const response = await fetch(manifestUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.statusText}`);
      }
      this.manifest = await response.json();

      const spriteEntries = Object.entries(this.manifest.sprites || {});
      const audioEntries = Object.entries(this.manifest.audio || {});

      this.totalAssets = spriteEntries.length + audioEntries.length;
      this.loadedAssets = 0;

      const loadPromises = [];

      // 画像ロード
      for (const [id, config] of spriteEntries) {
        const resolvedUrl = this._resolveUrl(config.url, manifestUrl);
        loadPromises.push(
          this._loadImage(id, resolvedUrl).then(() => {
            this.loadedAssets++;
          }).catch((err) => {
            console.warn(`Failed to load image [${id}]:`, err);
            this.loadedAssets++;
          })
        );
      }

      // オーディオロード
      for (const [id, config] of audioEntries) {
        this.audioConfig.set(id, config);
        const resolvedUrl = this._resolveUrl(config.url, manifestUrl);
        loadPromises.push(
          this._loadAudio(id, resolvedUrl).then(() => {
            this.loadedAssets++;
          }).catch((err) => {
            console.warn(`Failed to load audio [${id}]:`, err);
            this.loadedAssets++;
          })
        );
      }

      await Promise.all(loadPromises);
    } catch (err) {
      console.error('AssetManager: Error loading manifest or assets', err);
      throw err;
    }
  }

  /**
   * 画像の個別読み込み
   * @private
   */
  _loadImage(id, url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.images.set(id, img);
        resolve(img);
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = url;
    });
  }

  /**
   * オーディオ (WAV等) の個別読み込みとデコード
   * @private
   */
  async _loadAudio(id, url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const ctx = this.getAudioContext();
    if (!ctx) {
      throw new Error('Web Audio API not supported');
    }
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.audioBuffers.set(id, audioBuffer);
  }

  /**
   * ロードされた画像を取得。未読み込みやエラー時はフォールバックの単色プレースホルダーを返す。
   * @param {string} id
   * @returns {HTMLImageElement | HTMLCanvasElement}
   */
  getImage(id) {
    if (this.images.has(id)) {
      return this.images.get(id);
    }
    return this._getFallbackPlaceholder();
  }

  /**
   * フォールバックプレースホルダーキャンバスの生成
   * @private
   */
  _getFallbackPlaceholder() {
    if (!this.fallbackCanvas) {
      const canvas = document.createElement('canvas');
      canvas.width = 16;
      canvas.height = 16;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(0, 0, 16, 16);
      this.fallbackCanvas = canvas;
    }
    return this.fallbackCanvas;
  }

  /**
   * 指定した ID の効果音を即時再生する
   * @param {string} id
   * @param {number} [volumeOverride]
   */
  playSound(id, volumeOverride = null) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    const buffer = this.audioBuffers.get(id);
    if (!buffer) {
      console.warn(`Sound [${id}] is not loaded or does not exist.`);
      return;
    }

    const config = this.audioConfig.get(id) || {};
    const baseVolume = config.volume !== undefined ? config.volume : 1.0;
    const finalVolume = volumeOverride !== null ? volumeOverride : baseVolume;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.value = finalVolume;

    source.connect(gainNode);
    gainNode.connect(ctx.destination);

    source.start(0);
  }

  /**
   * 現在のロード進捗 (0.0 ～ 1.0) を取得
   * @returns {number}
   */
  getProgress() {
    if (this.totalAssets === 0) return 1.0;
    return this.loadedAssets / this.totalAssets;
  }

  /**
   * ロード完了判定
   * @returns {boolean}
   */
  isLoaded() {
    return this.totalAssets > 0 && this.loadedAssets >= this.totalAssets;
  }
}
