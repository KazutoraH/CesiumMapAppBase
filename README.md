# Python + Vue + Cesium ion構成の3Dマップひな形

Python + Vue + Cesium ion構成の3Dマップ
WSL + Docker構成で簡単環境構築
MongoDB利用を想定しているが未実装
不具合込みのひな形
成長途中。


# 必要な設定用の追加ファイル

## /unstable/frontend/map-ui/.env_mapui

```
VITE_CESIUM_TOKEN=**Cesiumのトークン**
```

## /unstable/geoapp/.env_geoapp

```
FLASK_APP=run.py
FLASK_ENV=development
VITE_CESIUM_TOKEN=**Cesiumのトークン**
MONGO_URI=mongodb+srv://**ここにURI**
```


# Cesium + 国土地理院地図

このアプリは CesiumJS と 国土地理院タイルを利用して地図を表示します。

## 📑 使用ライセンス

- **コードライセンス**: Apache License 2.0  
- **CesiumJS**: Apache License 2.0  
- **Cesium ion タイル**: © Cesium ion, © OpenStreetMap contributors  
- **国土地理院タイル**: 「地理院タイル（国土地理院）」を加工して利用  

## ⚖️ 注意事項
- Cesium ion の利用規約に従い、アプリ内やドキュメントにクレジットを明示してください。  
- 国土地理院タイル利用時は「地理院タイル（国土地理院）」と明示してください。  
