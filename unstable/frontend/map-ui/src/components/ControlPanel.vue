<template>
  <div 
    class="controller-panel" 
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

    <div class="terrain-selector">
      <label><input type="radio" value="ion" v-model="terrainType" /> Ion地形</label>
      <label><input type="radio" value="none" v-model="terrainType" /> 地形なし</label>
    </div>

    <div class="animation-controls">
      <button @click="toggleAnimation" class="animation-toggle">
        {{ isAnimating ? '⏸ 停止' : '▶ 再生' }}
      </button>
      <div class="time-display">現在時刻: {{ currentTime }}</div>
      <label class="slider-label">
        時間の進み方（{{ multiplier }}倍速）:
        <input type="range" min="1" max="10000" v-model.number="multiplier" @input="updateMultiplier" />
      </label>
      <div class="time-jump">
        <label>時刻ジャンプ:
          <input type="datetime-local" v-model="jumpDatetime" />
        </label>
        <button @click="jumpToDatetime" class="jump-button">ジャンプ</button>
      </div>
    </div>

    <div class="optimization-toggle">
      <label><input type="checkbox" v-model="optimizeEnabled" /> 軽量表示モード</label>
    </div>

    <!-- ピン管理セクション -->
    <div class="pin-management">
      <button @click="showPinList" class="pin-list-button">
        📍 ピン一覧・検索
      </button>
      <button @click="addCurrentPin" class="add-pin-button">
        ➕ 現在位置をピン追加
      </button>
      <button @click="showIconSettings" class="icon-settings-button">
        🎨 アイコン設定
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps<{
  currentTime: string
  currentPinPosition?: { latitude: number; longitude: number; height: number } | null
}>()

const emit = defineEmits<{
  (e: 'update:terrainType', value: string): void
  (e: 'update:optimizeEnabled', value: boolean): void
  (e: 'toggleAnimation'): void
  (e: 'update:multiplier', value: number): void
  (e: 'jumpToDatetime', value: string): void
  (e: 'showPinList'): void
  (e: 'addCurrentPin'): void
  (e: 'showIconSettings'): void
}>()

const terrainType = ref('none')
const optimizeEnabled = ref(true)
const isAnimating = ref(false)
const multiplier = ref(60)
const jumpDatetime = ref('')

// ドラッグ機能用の状態
const panelRef = ref<HTMLElement>()
const panelPosition = ref({ x: window.innerWidth - 300, y: 20 })
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
    const saved = localStorage.getItem('controlPanelPosition')
    if (saved) {
      const position = JSON.parse(saved)
      panelPosition.value = position
    }
  } catch (error) {
    console.warn('パネル位置の読み込みに失敗しました:', error)
  }
}

// ローカルストレージに位置を保存
function savePosition() {
  try {
    localStorage.setItem('controlPanelPosition', JSON.stringify(panelPosition.value))
  } catch (error) {
    console.warn('パネル位置の保存に失敗しました:', error)
  }
}

function toggleAnimation() {
  isAnimating.value = !isAnimating.value
  emit('toggleAnimation')
}

function updateMultiplier() {
  emit('update:multiplier', multiplier.value)
}

function jumpToDatetime() {
  if (!jumpDatetime.value) return
  emit('jumpToDatetime', jumpDatetime.value)
}

function showPinList() {
  emit('showPinList')
}

function addCurrentPin() {
  emit('addCurrentPin')
}

function showIconSettings() {
  emit('showIconSettings')
}

watch(terrainType, (newValue) => {
  emit('update:terrainType', newValue)
})

watch(optimizeEnabled, (newValue) => {
  emit('update:optimizeEnabled', newValue)
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

<style scoped>
.controller-panel {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.35);
  color: #ffffcc;
  padding: 12px 16px;
  border-radius: 10px;
  font-family: monospace;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 0 10px 3px rgba(255, 255, 150, 0.7);
  z-index: 10000;
  user-select: none;
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

.terrain-selector {
  margin-bottom: 12px;
}

.animation-controls {
  margin-bottom: 12px;
}

.animation-toggle {
  background-color: #ffd;
  border: 1px solid #cca;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
  margin-bottom: 8px;
}

.time-display {
  margin-bottom: 8px;
}

.slider-label {
  display: block;
  margin-bottom: 8px;
}

.time-jump {
  margin-top: 8px;
}

.jump-button {
  background-color: #ffd;
  border: 1px solid #cca;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 13px;
  margin-left: 8px;
}

.optimization-toggle {
  margin-top: 12px;
  margin-bottom: 12px;
}

/* ピン管理セクション */
.pin-management {
  border-top: 1px solid rgba(255, 255, 150, 0.3);
  padding-top: 12px;
}

.pin-list-button, .add-pin-button {
  background-color: #ffd;
  border: 1px solid #cca;
  border-radius: 4px;
  padding: 6px 10px;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
  width: 100%;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pin-list-button:hover, .add-pin-button:hover, .icon-settings-button:hover {
  background-color: #ffe;
}

.pin-list-button {
  background-color: rgba(33, 150, 243, 0.2);
  border-color: rgba(33, 150, 243, 0.4);
  color: #2196f3;
}

.add-pin-button {
  background-color: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.4);
  color: #4caf50;
}

.icon-settings-button {
  background-color: rgba(255, 193, 7, 0.2);
  border-color: rgba(255, 193, 7, 0.4);
  color: #ffc107;
}
</style> 