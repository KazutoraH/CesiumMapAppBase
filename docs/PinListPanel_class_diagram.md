classDiagram
    class PinListPanel {
        +boolean isVisible
        +Pin[] pins
        +string searchName
        +string searchCategory
        +string searchLat
        +string searchLng
        +string searchHeight
        +string | null selectedPinId
        +Set~string~ selectedPins
        +string bulkCategory
        
        +void closePanel() : パネルを閉じる
        +void searchPins() : ピンを検索
        +void clearSearch() : 検索条件をクリア
        +void selectPin(pin: Pin) : ピンを選択
        +void flyToPin(pin: Pin) : ピン位置に移動
        +void deletePin(pinId: string) : ピンを削除
        +void toggleSelectAll() : 全選択/全解除
        +void togglePinSelection(pinId: string) : ピンの選択状態を切り替え
        +void changeBulkCategory() : 一括カテゴリ変更
        +void onStyleChange(pinId: string, styleId: string) : ピンスタイルを変更
    }
    
    PinListPanel --> "1" Pin : 操作
    PinListPanel --> "1" SearchFilter : 使用
    PinListPanel --> "1" BulkOperation : 使用
    
    class Pin {
        +string id
        +string name
        +number latitude
        +number longitude
        +number height
        +string category
        +string? styleId
        +string? description
    }
    
    class SearchFilter {
        +string name
        +string category
        +string lat
        +string lng
        +string height
    }
    
    class BulkOperation {
        +Set~string~ selectedPins
        +string category
    }
```
### メソッド詳細

- **searchPins()**
  - 検索条件に基づいてピンをフィルタリング
  - 名前、カテゴリ、座標（緯度、経度、高さ）で検索可能

- **clearSearch()**
  - すべての検索条件をリセット
  - フィルタリングされたピン一覧を初期状態に戻す

- **selectPin(pin: Pin)**
  - 特定のピンを選択
