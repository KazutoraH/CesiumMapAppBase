classDiagram
    class PinInfoPanel {
        +Record~number, number, number~ | null pinPosition
        +boolean isPinLocked
        
        +void saveEdits() : 編集内容を保存
        +void jumpToPosition() : ピン位置にジャンプ
        +void onPinLockChange() : ピン固定状態の変更を処理
        +void startDrag(event: MouseEvent | TouchEvent) : ドラッグ開始
        +void onDrag(event: MouseEvent | TouchEvent) : ドラッグ中
        +void stopDrag() : ドラッグ終了
        +void loadPosition() : パネル位置を読み込み
        +void savePosition() : パネル位置を保存
    }
    
    PinInfoPanel --> "1" PinPosition : 使用
    PinInfoPanel --> "1" DragHandler : 使用
    
    class PinPosition {
        +number latitude
        +number longitude
        +number height
    }
    
    class DragHandler {
        +boolean isDragging
        +Record~number, number~ dragOffset
    }
```
### メソッド詳細

- **saveEdits()**
  - 編集されたピン位置情報を保存
  - 入力値のバリデーションを実施
  - 親コンポーネントに更新内容を通知

- **jumpToPosition()**
  - 現在のピン位置にマップをジャンプ
  - 親コンポーネントにジャンプ要求を通知

- **onPinLockChange()**
  - ピンの固定状態が変更された際の処理
  - ピンが固定された場合、ドラッグ操作を停止

- **startDrag(), onDrag(), stopDrag()**
  - パネルのドラッグ操作を管理
  - ピンが固定されている場合はドラッグを無効化

- **loadPosition(), savePosition()**
  - パネルの位置をローカルストレージに保存/読み込み
  - ユーザーのカスタマイズを保持
