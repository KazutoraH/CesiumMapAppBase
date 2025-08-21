classDiagram
    class PinPopupPanel {
        +boolean isVisible
        +Record~number, number~ position
        +PinInfo pinInfo
        +AddressInfo | null addressInfo
        +boolean isLoadingAddress
        +string | null addressError
        +string | null addressSource
        
        +void closePopup() : ポップアップを閉じる
        +void jumpToPosition() : ピン位置にジャンプ
        +void editPosition() : ピン位置を編集
        +void fetchAddressInfo() : 住所情報を取得
        +void retryAddressFetch() : 住所情報取得を再試行
        +void handleClickOutside(event: MouseEvent) : ポップアップ外クリックを処理
    }
    
    PinPopupPanel --> "1" PinInfo : 表示
    PinPopupPanel --> "1" AddressInfo : 使用
    PinPopupPanel --> "1" MapServiceLink : 使用
    
    class PinInfo {
        +number latitude
        +number longitude
        +number height
        +string? name
        +string? category
        +string? description
    }
    
    class AddressInfo {
        +string address
        +string prefecture
        +string city
        +string district
        +string? postalCode
    }
    
    class MapServiceLink {
        +string googleMapsUrl
        +string googleEarthUrl
        +string gsiMapsUrl
    }
```
### メソッド詳細

- **closePopup()**
  - ポップアップを閉じる
  - 親コンポーネントに閉じることを通知

- **jumpToPosition()**
  - 現在のピン位置にマップをジャンプ
  - 親コンポーネントにジャンプ要求を通知

- **editPosition()**
  - ピン位置の編集を開始
  - 親コンポーネントに編集要求を通知

- **fetchAddressInfo()**
  - ピンの住所情報を取得
  - 国土地理院APIまたはNominatimを使用
  - 取得結果を状態に保存

- **retryAddressFetch()**
  - 住所情報の取得に失敗した場合に再試行
  - `fetchAddressInfo()` を再度実行

- **handleClickOutside(event: MouseEvent)**
  - ポップアップ外をクリックした際の処理
  - ポップアップを閉じる
