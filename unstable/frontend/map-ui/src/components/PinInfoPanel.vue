<template>
  <div
    v-if="pinPosition"
    class="info-overlay pin-overlay"
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

    <div>
      <strong>位置情報＋標高</strong><br />
      緯度: <input type="number" v-model.number="editPinPosition.latitude" step="0.000001" :disabled="isPinLocked" /><br />
      経度: <input type="number" v-model.number="editPinPosition.longitude" step="0.000001" :disabled="isPinLocked" /><br />
      高さ: <input type="number" v-model.number="editPinPosition.height" step="0.01" :disabled="isPinLocked" /> m<br />
      <div class="pin-lock-control">
        <label>
          <input 
            type="checkbox" 
            v-model="isPinLocked" 
            @change="onPinLockChange"
          />
          ピンを固定
        </label>
      </div>
      <div class="button-group">
        <button @click.stop="saveEdits" :disabled="isPinLocked">保存</button>
        <button @click.stop="jumpToPosition">ジャンプ</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  pinPosition: {
    latitude: number
    longitude: number
    height: number
  } | null
}>()

const emit = defineEmits<{
  (e: 'update:pinPosition', value: { latitude: number; longitude: number; height: number }): void
  (e: 'update:cameraOrientation', value: { heading: number; pitch: number; roll: number }): void
  (e: 'jump-to-position', value: { latitude: number; longitude: number; height: number }): void
}>()

const isPinLocked = ref(false)
const editPinPosition = reactive({ latitude: 0, longitude: 0, height: 0 })
const editCameraOrientation = reactive({ heading: 0, pitch: 0, roll: 0 })

// ドラッグ機能用の状態
const panelRef = ref<HTMLElement>()
const panelPosition = ref({ x: 100, y: 100 })
const isDragging = ref(false)
const dragOffset = ref({ x: 0, y: 0 })

const displayPinPosition = computed(() => {
  return props.pinPosition
    ? {
        lat: props.pinPosition.latitude.toFixed(6),
        lon: props.pinPosition.longitude.toFixed(6),
        height: props.pinPosition.height.toFixed(2),
      }
    : {
        lat: '---',
        lon: '---',
        height: '---',
      }
})

// ピン位置が変更されたときに編集用の値を更新
watch(() => props.pinPosition, (newPosition) => {
  if (newPosition) {
    editPinPosition.latitude = newPosition.latitude
    editPinPosition.longitude = newPosition.longitude
    editPinPosition.height = newPosition.height
  }
}, { immediate: true })

// ドラッグ開始
function startDrag(event: MouseEvent | TouchEvent) {
  if (isPinLocked.value) return // ピンが固定されている場合はドラッグを無効化
  
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
  if (!isDragging.value || isPinLocked.value) return
  
  event.preventDefault()
  
  const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX
  const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY
  
  const newX = clientX - dragOffset.value.x
  const newY = clientY - dragOffset.value.y
  
  // 画面内に制限
  const maxX = window.innerWidth - (panelRef.value?.offsetWidth || 250)
  const maxY = window.innerHeight - (panelRef.value?.offsetHeight || 200)
  
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
    const saved = localStorage.getItem('pinPanelPosition')
    if (saved) {
      const position = JSON.parse(saved)
      panelPosition.value = position
    }
  } catch (error) {
    console.warn('ピンパネル位置の読み込みに失敗しました:', error)
  }
}

// ローカルストレージに位置を保存
function savePosition() {
  try {
    localStorage.setItem('pinPanelPosition', JSON.stringify(panelPosition.value))
  } catch (error) {
    console.warn('ピンパネル位置の保存に失敗しました:', error)
  }
}

function onPinLockChange() {
  // ピンが固定された時にドラッグを停止
  if (isPinLocked.value && isDragging.value) {
    stopDrag()
  }
}

function saveEdits() {
  if (
    isNaN(editPinPosition.latitude) ||
    isNaN(editPinPosition.longitude) ||
    isNaN(editPinPosition.height)
  ) {
    alert('無効な座標値が入力されています。')
    return
  }

  const newPosition = {
    latitude: editPinPosition.latitude,
    longitude: editPinPosition.longitude,
    height: editPinPosition.height,
  }

  console.log('保存ボタンが押されました。新しい位置:', newPosition)
  
  emit('update:pinPosition', newPosition)
}

function jumpToPosition() {
  if (!props.pinPosition) return
  
  emit('jump-to-position', {
    latitude: props.pinPosition.latitude,
    longitude: props.pinPosition.longitude,
    height: props.pinPosition.height,
  })
}

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

<style scoped>
.pin-overlay {
  position: fixed;
  z-index: 10001;
  background-color: rgba(0, 0, 0, 0.4);
  color: #ffffcc;
  padding: 8px 12px;
  border-radius: 10px;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.3;
  box-shadow: 0 0 6px rgba(255, 255, 150, 0.5);
  max-height: 220px;
  overflow-y: auto;
  width: max-content;
  min-width: 250px;
  user-select: none;
}

.drag-handle {
  background-color: rgba(255, 255, 150, 0.2);
  padding: 4px 8px;
  margin: -8px -12px 8px -12px;
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

.pin-overlay:has(input[type="checkbox"]:checked) .drag-handle {
  cursor: default;
}

.pin-lock-control {
  margin: 8px 0;
  font-size: 11px;
}

.pin-lock-control label {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}

.pin-lock-control input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.info-overlay button {
  background-color: #ffd;
  border: 1px solid #cca;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
  flex: 1;
}

.info-overlay button:hover:not(:disabled) {
  background-color: #ffe;
}

.info-overlay button:disabled {
  background-color: #ccc;
  color: #666;
  cursor: not-allowed;
  border-color: #999;
}

.info-overlay input[type="number"] {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 150, 0.3);
  border-radius: 3px;
  color: #ffffcc;
  padding: 2px 4px;
  font-size: 12px;
  width: 80px;
  font-family: monospace;
}

.info-overlay input[type="number"]:disabled {
  background-color: rgba(255, 255, 255, 0.05);
  color: #999;
  cursor: not-allowed;
}

.info-overlay input[type="number"]:focus {
  outline: none;
  border-color: rgba(255, 255, 150, 0.6);
  background-color: rgba(255, 255, 255, 0.15);
}
</style> 