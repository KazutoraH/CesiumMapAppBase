<script setup lang="ts">
import { ref, watch, computed, reactive, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  displayCameraOrientation: {
    heading: string
    pitch: string
    roll: string
  }
  displayCameraPosition: {
    x: string
    y: string
    z: string
  }
  cameraHeight: number | null
  screenSize: {
    width: number
    height: number
  }
  tempPinScreenPosition: {
    x: number
    y: number
  }
  autoCenterOnPinPlacement: boolean
}>()

const emit = defineEmits<{
  (e: 'update:cameraOrientation', value: { heading: number; pitch: number; roll: number }): void
  (e: 'update:cameraZ', value: number): void
  (e: 'update:cameraHeight', value: number): void
  (e: 'update:selectedAltitude', value: string): void
  (e: 'update:customAltitude', value: number): void
  (e: 'update:autoCenterOnPinPlacement', value: boolean): void
}>()

// --- reactiveを使用した編集用ローカル状態 ---
const editableOrientation = reactive({
  heading: Number(props.displayCameraOrientation.heading),
  pitch: Number(props.displayCameraOrientation.pitch),
  roll: Number(props.displayCameraOrientation.roll),
})
const editableZ = ref(Number(props.displayCameraPosition.z))
const editableHeight = ref(props.cameraHeight ?? 0)

// 自動中央移動設定
const autoCenterOnPinPlacement = ref(props.autoCenterOnPinPlacement)

// ドラッグ機能用の状態
const panelRef = ref<HTMLElement>()
const panelPosition = ref({ x: 20, y: window.innerHeight - 400 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

// ドラッグ開始
function startDrag(event: MouseEvent | TouchEvent) {
  event.preventDefault()
  isDragging.value = true
  
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  if (panelRef.value) {
    const rect = panelRef.value.getBoundingClientRect()
    dragOffset.value = {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag, { passive: false })
  document.addEventListener('mouseup', stopDrag)
  document.addEventListener('touchend', stopDrag)
}

// ドラッグ中
function onDrag(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return
  
  event.preventDefault()
  
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  const newX = clientX - dragOffset.value.x
  const newY = clientY - dragOffset.value.y
  
  // 画面内に制限
  const maxX = window.innerWidth - (panelRef.value?.offsetWidth || 300)
  const maxY = window.innerHeight - (panelRef.value?.offsetHeight || 400)
  
  panelPosition.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY))
  }
}

// ドラッグ終了
function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchend', stopDrag)
}

// ローカルストレージから位置を読み込み
function loadPosition() {
  try {
    const saved = localStorage.getItem('cameraPanelPosition')
    if (saved) {
      const position = JSON.parse(saved)
      panelPosition.value = position
    }
  } catch (error) {
    console.warn('カメラパネル位置の読み込みに失敗しました:', error)
  }
}

// ローカルストレージに位置を保存
function savePosition() {
  try {
    localStorage.setItem('cameraPanelPosition', JSON.stringify(panelPosition.value))
  } catch (error) {
    console.warn('カメラパネル位置の保存に失敗しました:', error)
  }
}

// 親からの更新があったときだけ、ローカルを更新（ユーザー操作は上書きされない）
watch(() => props.displayCameraOrientation, (newVal) => {
  console.log('親からの更新:', newVal)
  if (!document.activeElement?.classList.contains('input-transparent')) {
    console.log('値の反映:', newVal)
    editableOrientation.heading = Number(newVal.heading)
    editableOrientation.pitch = Number(newVal.pitch)
    editableOrientation.roll = Number(newVal.roll)
  }
}, { deep: true, immediate: true })

watch(() => props.displayCameraPosition.z, (newZ) => {
  if (!document.activeElement?.classList.contains('input-transparent')) {
    editableZ.value = Number(newZ)
  }
})

watch(() => props.cameraHeight, (newHeight) => {
  if (!document.activeElement?.classList.contains('input-transparent')) {
    editableHeight.value = newHeight ?? 0
  }
})

watch(() => props.autoCenterOnPinPlacement, (newValue) => {
  autoCenterOnPinPlacement.value = newValue
})

// --- ユーザー入力に反応して emit（親に通知） ---
const updateCameraOrientation = () => {
  console.log('カメラ角度更新:', editableOrientation)
  emit('update:cameraOrientation', {
    heading: Number(editableOrientation.heading),
    pitch: Number(editableOrientation.pitch),
    roll: Number(editableOrientation.roll)
  })
}

// 個別の値の変更を監視（lazy対応のため、blurイベントで更新）
const updateCameraZ = () => {
  emit('update:cameraZ', editableZ.value)
}

const updateCameraHeight = () => {
  emit('update:cameraHeight', editableHeight.value)
}

// --- 高度選択 ---
const selectedAltitude = ref('2000')
const customAltitude = ref(0)
const altitudeOptions = [
  { label: '近距離（500m）', value: '500' },
  { label: '標準（2000m）', value: '2000' },
  { label: '遠距離（5000m）', value: '5000' },
  { label: 'カスタム入力', value: 'custom' },
]

// 30度単位の角度ボタン用の配列
const angleButtons = [
  -180, -150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180
]

// Heading用の角度ボタン（0度～360度）
const headingButtons = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360
]

// Roll用の角度ボタン（0度～360度）
const rollButtons = [
  0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 360
]

// Pitch用の角度ボタン（-90度～+90度）
const pitchButtons = [
  -90, -85, -60, -30, 0, 30, 60, 85, 90
]

// 角度ボタンクリック時の処理
const setAngle = (type: 'heading' | 'pitch' | 'roll', angle: number) => {
  editableOrientation[type] = angle
  updateCameraOrientation()
}

// 角度を10度ずつ増減する処理
const adjustAngle = (type: 'heading' | 'pitch' | 'roll', increment: boolean) => {
  const currentAngle = editableOrientation[type]
  const change = increment ? 10 : -10
  
  // 各角度タイプに応じた範囲制限
  let newAngle = currentAngle + change
  
  if (type === 'heading') {
    // Headingは0度～360度に制限
    newAngle = Math.max(0, Math.min(360, newAngle))
  } else if (type === 'pitch') {
    // Pitchは-90度～+90度に制限
    newAngle = Math.max(-90, Math.min(90, newAngle))
  } else {
    // Rollは0度～360度に制限
    newAngle = Math.max(0, Math.min(360, newAngle))
  }
  
  editableOrientation[type] = newAngle
  updateCameraOrientation()
}

// 高度を調整する処理
const adjustHeight = (type: 'z' | 'height', increment: boolean, unit: number) => {
  const change = increment ? unit : -unit
  
  if (type === 'z') {
    editableZ.value += change
    updateCameraZ()
  } else {
    editableHeight.value += change
    updateCameraHeight()
  }
}

const displayAltitude = computed(() => {
  return selectedAltitude.value === 'custom'
    ? customAltitude.value ?? '未入力'
    : selectedAltitude.value
})

watch(selectedAltitude, (newVal) => {
  emit('update:selectedAltitude', newVal)
})

watch(customAltitude, (newVal) => {
  emit('update:customAltitude', newVal)
})

watch(autoCenterOnPinPlacement, (newValue) => {
  emit('update:autoCenterOnPinPlacement', newValue)
})

// 位置変更時にローカルストレージに保存
watch(panelPosition, () => {
  savePosition()
}, { deep: true })

onMounted(() => {
  loadPosition()
})

onBeforeUnmount(() => {
  stopDrag()
})
</script>

<template>
  <div 
    class="info-overlay camera-panel" 
    :style="{ top: panelPosition.y + 'px', left: panelPosition.x + 'px' }"
    ref="panelRef"
  >
    <!-- ドラッグハンドル -->
    <div 
      class="drag-handle"
      @mousedown="startDrag"
      @touchstart="startDrag"
    >
      ⋮⋮ ドラッグ
    </div>

    <strong>カメラ角度</strong>Ver３（lazy対応）<br />
    Heading:
    <input type="number" v-model.lazy.number="editableOrientation.heading" class="input-transparent" @blur="updateCameraOrientation" /> °
    <div class="angle-controls">
      <button @click="adjustAngle('heading', false)" class="angle-adjust-btn">▼</button>
      <button @click="adjustAngle('heading', true)" class="angle-adjust-btn">▲</button>
    </div>
    <div class="angle-buttons">
      <button 
        v-for="angle in headingButtons" 
        :key="`heading-${angle}`"
        @click="setAngle('heading', angle)"
        class="angle-btn"
        :class="{ active: editableOrientation.heading === angle }"
      >
        {{ angle }}
      </button>
    </div>
    <br />
    Pitch:
    <input type="number" v-model.lazy.number="editableOrientation.pitch" class="input-transparent" @blur="updateCameraOrientation" /> °
    <div class="angle-controls">
      <button @click="adjustAngle('pitch', false)" class="angle-adjust-btn">▼</button>
      <button @click="adjustAngle('pitch', true)" class="angle-adjust-btn">▲</button>
    </div>
    <div class="angle-buttons">
      <button 
        v-for="angle in pitchButtons" 
        :key="`pitch-${angle}`"
        @click="setAngle('pitch', angle)"
        class="angle-btn"
        :class="{ 
          active: editableOrientation.pitch === angle,
          'gimbal-lock-warning': angle === 90 || angle === -90
        }"
      >
        {{ angle }}
      </button>
    </div>
    <br />
    Roll:
    <input type="number" v-model.lazy.number="editableOrientation.roll" class="input-transparent" @blur="updateCameraOrientation" /> °
    <div class="angle-controls">
      <button @click="adjustAngle('roll', false)" class="angle-adjust-btn">▼</button>
      <button @click="adjustAngle('roll', true)" class="angle-adjust-btn">▲</button>
    </div>
    <div class="angle-buttons">
      <button 
        v-for="angle in rollButtons" 
        :key="`roll-${angle}`"
        @click="setAngle('roll', angle)"
        class="angle-btn"
        :class="{ active: editableOrientation.roll === angle }"
      >
        {{ angle }}
      </button>
    </div>
    <br />

    <div style="margin-top: 6px;">
      <strong>カメラ高度:</strong><br />
      <p>Z軸高度: <input type="number" v-model.lazy.number="editableZ" class="input-transparent" readonly /> m
        <span style="margin-left: 8px; font-size: 11px; color: #ffffaa;">（表示のみ）</span>
      </p>
      <p>海抜高度: <input type="number" v-model.lazy.number="editableHeight" class="input-transparent" @blur="updateCameraHeight" /> m
        <div class="height-controls">
          <button @click="adjustHeight('height', false, 100)" class="height-adjust-btn">▼100</button>
          <button @click="adjustHeight('height', true, 100)" class="height-adjust-btn">▲100</button>
          <button @click="adjustHeight('height', false, 500)" class="height-adjust-btn">▼500</button>
          <button @click="adjustHeight('height', true, 500)" class="height-adjust-btn">▲500</button>
          <button @click="adjustHeight('height', false, 1000)" class="height-adjust-btn">▼1000</button>
          <button @click="adjustHeight('height', true, 1000)" class="height-adjust-btn">▲1000</button>
        </div>
      </p>
    </div>

    <div style="margin-top: 8px;">
      <strong>カメラ高度(標高基準)</strong><br />
      <label for="altitude-select">高度を選択:</label>
      <select id="altitude-select" v-model="selectedAltitude">
        <option v-for="option in altitudeOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <div v-if="selectedAltitude === 'custom'" class="mt-2">
        <input type="number" v-model.lazy.number="customAltitude" placeholder="高度を入力 (m)" class="border px-2 py-1" />
      </div>
      <p class="mt-2">選択された高度: <strong>{{ displayAltitude }} m</strong></p>
    </div>

    <!-- カメラ移動設定 -->
    <div style="margin-top: 8px;">
      <strong>カメラ移動設定</strong><br />
      <label><input type="checkbox" v-model="autoCenterOnPinPlacement" /> 仮アイコン配置時に自動中央移動</label>
    </div>

    <div style="margin-top: 8px;">
      <strong>画面サイズ</strong><br />
      <p>幅: <strong>{{ screenSize.width }} px</strong></p>
      <p>高さ: <strong>{{ screenSize.height }} px</strong></p>
    </div>

    <div style="margin-top: 8px;">
      <strong>仮地点の画面座標</strong><br />
      <p>X: <strong>{{ tempPinScreenPosition.x }} px</strong></p>
      <p>Y: <strong>{{ tempPinScreenPosition.y }} px</strong></p>
      <p v-if="tempPinScreenPosition.x > 0 && tempPinScreenPosition.y > 0">
        中央からの距離: <strong>{{ Math.round(Math.sqrt(Math.pow(tempPinScreenPosition.x - screenSize.width/2, 2) + Math.pow(tempPinScreenPosition.y - screenSize.height/2, 2))) }} px</strong>
      </p>
    </div>
  </div>
</template>

<style scoped>
.info-overlay {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.35);
  color: #ffffcc;
  padding: 12px 16px;
  border-radius: 10px;
  font-family: monospace, monospace;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 0 10px 3px rgba(255, 255, 150, 0.7);
  user-select: none;
  z-index: 10000;
  min-width: 280px;
}

.drag-handle {
  background-color: rgba(255, 255, 150, 0.2);
  padding: 4px 8px;
  margin: -12px -16px 8px -16px;
  border-radius: 10px 10px 0 0;
  cursor: move;
  text-align: center;
  font-size: 11px;
  border-bottom: 1px solid rgba(255, 255, 150, 0.3);
  user-select: none;
}

.drag-handle:hover {
  background-color: rgba(255, 255, 150, 0.3);
}

.info-overlay strong {
  color: #fffacd;
}

.input-transparent {
  background-color: transparent;
  border: none;
  color: #ffffaa;
  font-family: monospace;
  width: 60px;
  text-align: right;
}

.input-transparent:focus {
  outline: none;
  border-bottom: 1px solid #ffffcc;
}

.angle-controls {
  display: inline-flex;
  margin-left: 8px;
  gap: 1px;
}

.angle-adjust-btn {
  background-color: rgba(255, 255, 150, 0.1);
  border: 1px solid rgba(255, 255, 150, 0.3);
  color: #ffffaa;
  font-family: monospace;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 2px;
  min-width: 24px;
  text-align: center;
  transition: all 0.2s ease;
}

.angle-adjust-btn:hover {
  background-color: rgba(255, 255, 150, 0.2);
  color: #fffacd;
  border-color: rgba(255, 255, 150, 0.5);
}

.angle-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  margin-top: 4px;
  max-width: 100%;
}

.angle-btn {
  background-color: rgba(255, 255, 150, 0.1);
  border: 1px solid rgba(255, 255, 150, 0.3);
  color: #ffffaa;
  font-family: monospace;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  min-width: 30px;
  text-align: center;
  transition: all 0.2s ease;
}

.angle-btn:hover {
  background-color: rgba(255, 255, 150, 0.2);
  color: #fffacd;
  border-color: rgba(255, 255, 150, 0.5);
}

.angle-btn.active {
  background-color: rgba(255, 255, 150, 0.3);
  color: #fffacd;
  font-weight: bold;
  border-color: rgba(255, 255, 150, 0.7);
}

.angle-btn.gimbal-lock-warning {
  border-color: rgba(255, 100, 100, 0.8);
  background-color: rgba(255, 100, 100, 0.1);
}

.angle-btn.gimbal-lock-warning:hover {
  border-color: rgba(255, 100, 100, 1.0);
  background-color: rgba(255, 100, 100, 0.2);
}

.angle-btn.gimbal-lock-warning.active {
  border-color: rgba(255, 100, 100, 1.0);
  background-color: rgba(255, 100, 100, 0.3);
}

.height-controls {
  display: inline-flex;
  margin-left: 8px;
  gap: 1px;
}

.height-adjust-btn {
  background-color: rgba(255, 255, 150, 0.1);
  border: 1px solid rgba(255, 255, 150, 0.3);
  color: #ffffaa;
  font-family: monospace;
  font-size: 10px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 2px;
  min-width: 24px;
  text-align: center;
  transition: all 0.2s ease;
}

.height-adjust-btn:hover {
  background-color: rgba(255, 255, 150, 0.2);
  color: #fffacd;
  border-color: rgba(255, 255, 150, 0.5);
}
</style>
