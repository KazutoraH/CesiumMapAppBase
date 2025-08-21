classDiagram
    class ControlPanel {
        +string currentTime
        +Record~number, number, number~ | null currentPinPosition
        
        +void toggleAnimation() : アニメーションの再生/停止を切り替え
        +void updateMultiplier() : アニメーション速度を更新
        +void jumpToDatetime() : 指定時刻にジャンプ
        +void showPinList() : ピン一覧を表示
        +void addCurrentPin() : 現在位置にピンを追加
        +void showIconSettings() : アイコン設定を表示
        +void startDrag(event: MouseEvent | TouchEvent) : ドラッグ開始
        +void onDrag(event: MouseEvent | TouchEvent) : ドラッグ中
        +void stopDrag() : ドラッグ終了
        +void loadPosition() : パネル位置を読み込み
        +void savePosition() : パネル位置を保存
    }
    
    ControlPanel --> "1" TerrainControl : 使用
    ControlPanel --> "1" AnimationControl : 使用
    ControlPanel --> "1" PinManagement : 使用
    ControlPanel --> "1" DragHandler : 使用
    
    class TerrainControl {
        +string terrainType
    }
    
    class AnimationControl {
        +boolean isAnimating
        +number multiplier
        +string jumpDatetime
    }
    
    class PinManagement {
        +boolean optimizeEnabled
    }
    
    class DragHandler {
        +boolean isDragging
        +Record~number, number~ dragOffset
    }
```
### メソッド詳細

- **toggleAnimation()**
  - アニメーションの再生/停止状態を切り替え
  - 親コンポーネントに状態変更を通知

- **updateMultiplier()**
  - アニメーションの再生速度を更新
  - 親コンポーネントに速度変更を通知

- **jumpToDatetime()**
  - 指定した日時にマップをジャンプ
  - 親コンポーネントにジャンプ先の日時を通知

- **showPinList()**
  - ピン一覧パネルを表示
  - 親コンポーネントに表示要求を通知

- **addCurrentPin()**
  - 現在のマップ位置に新しいピンを追加
  - 親コンポーネントに追加要求を通知

- **showIconSettings()**
  - アイコン設定パネルを表示
  - 親コンポーネントに表示要求を通知

- **startDrag(), onDrag(), stopDrag()**
  - パネルのドラッグ操作を管理
  - マウスとタッチ操作に対応

- **loadPosition(), savePosition()**
  - パネルの位置をローカルストレージに保存/読み込み
  - ユーザーのカスタマイズを保持
