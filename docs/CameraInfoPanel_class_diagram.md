classDiagram
    class CameraInfoPanel {
        +Record~string, string~ displayCameraOrientation
        +Record~string, string~ displayCameraPosition
        +number | null cameraHeight
        +Record~number, number~ screenSize
        +Record~number, number~ tempPinScreenPosition
        +boolean autoCenterOnPinPlacement
        
        +void updateCameraOrientation() : カメラの向きを更新
        +void updateCameraZ() : カメラのZ軸位置を更新
        +void updateCameraHeight() : カメラの海抜高度を更新
        +void setAngle(type: string, angle: number) : 指定された角度を設定
        +void adjustAngle(type: string, increment: boolean) : 角度を増減
        +void adjustHeight(type: string, increment: boolean, unit: number) : 高度を増減
        +void startDrag(event: MouseEvent | TouchEvent) : ドラッグ開始
        +void onDrag(event: MouseEvent | TouchEvent) : ドラッグ中
        +void stopDrag() : ドラッグ終了
        +void loadPosition() : パネル位置を読み込み
        +void savePosition() : パネル位置を保存
    }
    
    CameraInfoPanel --> "1" AngleControl : 使用
    CameraInfoPanel --> "1" HeightControl : 使用
    CameraInfoPanel --> "1" DragHandler : 使用
    
    class AngleControl {
        +number heading
        +number pitch
        +number roll
    }
    
    class HeightControl {
        +number z
        +number height
    }
    
    class DragHandler {
        +boolean isDragging
        +Record~number, number~ dragOffset
    }
```
### メソッド詳細

- **updateCameraOrientation()**
  - カメラの向き（Heading, Pitch, Roll）を更新
  - 親コンポーネントに変更を通知

- **updateCameraZ()**
  - カメラのZ軸位置を更新
  - 親コンポーネントに変更を通知

- **updateCameraHeight()**
  - カメラの海抜高度を更新
  - 親コンポーネントに変更を通知

- **setAngle()**
  - 指定された角度を設定
  - Heading, Pitch, Roll の各角度を直接設定

- **adjustAngle()**
  - 角度を10度ずつ増減
  - 各角度タイプに応じた範囲制限を適用

- **adjustHeight()**
  - 高度を指定された単位で増減
  - Z軸高度または海抜高度を調整

- **startDrag(), onDrag(), stopDrag()**
  - パネルのドラッグ操作を管理
  - マウスとタッチ操作に対応

- **loadPosition(), savePosition()**
  - パネルの位置をローカルストレージに保存/読み込み
  - ユーザーのカスタマイズを保持
