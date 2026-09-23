# 8bit Retro Asset Manager & Generator

ゲーム開発初期のプレースホルダーとして利用できる「8bitレトロ効果音（SE）自動生成スクリプト」「ドット絵スプライト群」、およびアセットマネージャー（`AssetManager`）のコードベースです。

## ディレクトリ構成
- `scripts/generate_assets.py`: 8bit効果音 (WAV) およびドット絵 (PNG) を自動生成するスクリプト
- `assets/assets.json`: アセットマニフェスト (IDとパスの一元管理)
- `assets/audio/`: 生成された効果音ファイル
- `assets/sprites/`: 生成されたドット絵スプライト
- `src/AssetManager.js`: 非同期アセット読み込みおよびWeb Audio API音声再生管理クラス
- `src/main.js`: 検証用ゲームループ・Canvas描画ロジック
- `public/index.html`: 検証用画面

## 使用方法
### 1. アセットの生成
```bash
python3 scripts/generate_assets.py
```

### 2. 動作検証画面の起動
```bash
python3 -m http.server 8080
```
ブラウザで `http://localhost:8080/public/index.html` にアクセスします。
