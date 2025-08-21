classDiagram
    class IconSettingsPanel {
        +boolean isVisible
        +Record~string, string~ categoryToStyle
        +string tempStyleId
        
        +void close() : 設定を保存してモーダルを閉じる
        +void save() : 設定を保存
        -boolean shallowEqual(a: Record~string, string~, b: Record~string, string~) : オブジェクトの浅い比較
    }
    
    IconSettingsPanel --> "1" PinStyleConfig : 使用
    IconSettingsPanel --> "1" TempPinStyleConfig : 使用
    
    class PinStyleConfig {
        +string id
        +string label
    }
    
    class TempPinStyleConfig {
        +string id
        +string label
    }
```
### メソッド詳細

- **close()**
  - モーダルを閉じる際に呼び出される
  - 変更がある場合は自動的に設定を保存
  - `emit('close')` で親コンポーネントに閉じることを通知

- **save()**
  - ユーザーが保存ボタンをクリックした時に呼び出される
  - 現在の設定値を親コンポーネントに通知
  - `emit('save', payload)` で保存データを送信

- **shallowEqual()**
  - 2つのオブジェクトを浅く比較するユーティリティ関数
  - 設定値の変更を検出するために使用
