<template>
  <div class="pin-list-panel" v-if="isVisible">
    <div class="panel-header">
      <h3>ピン一覧・検索</h3>
      <button @click="closePanel" class="close-button">×</button>
    </div>

    <!-- 検索機能 -->
    <div class="search-section">
      <div class="search-inputs">
        <input 
          v-model="searchName" 
          placeholder="名前で検索..." 
          class="search-input"
        />
        <select v-model="searchCategory" class="search-input">
          <option value="">すべてのカテゴリ</option>
          <option v-for="category in pinCategories" :key="category.value" :value="category.value">
            {{ category.label }}
          </option>
        </select>
        <div class="coordinate-search">
          <input 
            v-model="searchLat" 
            placeholder="緯度" 
            type="number" 
            step="0.000001"
            class="search-input small"
          />
          <input 
            v-model="searchLng" 
            placeholder="経度" 
            type="number" 
            step="0.000001"
            class="search-input small"
          />
          <input 
            v-model="searchHeight" 
            placeholder="高さ" 
            type="number" 
            step="0.1"
            class="search-input small"
          />
        </div>
      </div>
      <div class="search-buttons">
        <button @click="searchPins" class="search-button">検索</button>
        <button @click="clearSearch" class="clear-button">クリア</button>
      </div>
    </div>

    <!-- 一括操作セクション -->
    <div class="bulk-actions-section" v-if="filteredPins.length > 0">
      <div class="bulk-selection">
        <label class="select-all-label">
          <input 
            type="checkbox" 
            :checked="isAllSelected" 
            @change="toggleSelectAll"
            class="select-all-checkbox"
          />
          全選択 ({{ selectedPinsCount }}件選択中)
        </label>
      </div>
      
      <div class="bulk-category-change" v-if="selectedPinsCount > 0">
        <span class="bulk-label">一括カテゴリ変更:</span>
        <select v-model="bulkCategory" class="bulk-category-select">
          <option value="">カテゴリを選択</option>
          <option v-for="category in pinCategories" :key="category.value" :value="category.value">
            {{ category.label }}
          </option>
        </select>
        <button @click="changeBulkCategory" class="bulk-change-button" :disabled="!bulkCategory">
          変更実行
        </button>
      </div>
    </div>

    <!-- ピン一覧 -->
    <div class="pin-list">
      <div class="list-header">
        <span class="header-select">選択</span>
        <span class="header-name">名前</span>
        <span class="header-coords">緯度</span>
        <span class="header-coords">経度</span>
        <span class="header-height">高さ</span>
        <span class="header-category">カテゴリ</span>
        <span class="header-style">スタイル</span>
        <span class="header-actions">操作</span>
      </div>
      
      <div class="list-content">
        <div 
          v-for="pin in filteredPins" 
          :key="pin.id" 
          class="pin-item"
          :class="{ 'selected': selectedPinId === pin.id }"
        >
          <div class="pin-select">
            <input 
              type="checkbox" 
              :checked="selectedPins.has(pin.id)"
              @change="togglePinSelection(pin.id)"
              class="pin-checkbox"
            />
          </div>
          <span class="pin-name">{{ pin.name || '未命名' }}</span>
          <span class="pin-lat">{{ pin.latitude.toFixed(6) }}</span>
          <span class="pin-lng">{{ pin.longitude.toFixed(6) }}</span>
          <span class="pin-height">{{ pin.height.toFixed(2) }}m</span>
          <span class="pin-category">{{ getCategoryLabel(pin.category) }}</span>
          <div class="pin-style">
            <select :value="getStyleForPin(pin)" @change="onStyleChange(pin.id, ($event.target as HTMLSelectElement).value)" class="style-select">
              <option v-for="style in availablePinStyles" :key="style.id" :value="style.id">
                {{ style.label }}
              </option>
            </select>
          </div>
          <div class="pin-actions">
            <button @click="selectPin(pin)" class="action-button select">選択</button>
            <button @click="flyToPin(pin)" class="action-button fly">移動</button>
            <button @click="deletePin(pin.id)" class="action-button delete">削除</button>
          </div>
        </div>
        
        <div v-if="filteredPins.length === 0" class="no-pins">
          ピンが見つかりません
        </div>
      </div>
    </div>

    <!-- 統計情報 -->
    <div class="pin-stats">
      表示中: {{ filteredPins.length }} / {{ pins.length }} 件
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { pinStyles, categoryDefaultStyle } from '../config/pinStyles'

interface Pin {
  id: string
  name: string
  latitude: number
  longitude: number
  height: number
  category: string
  styleId?: string
  description?: string
}

// カテゴリの選択肢
const pinCategories = [
  { value: 'landmark', label: 'ランドマーク' },
  { value: 'restaurant', label: 'レストラン' },
  { value: 'hotel', label: 'ホテル' },
  { value: 'shopping', label: 'ショッピング' },
  { value: 'transport', label: '交通機関' },
  { value: 'park', label: '公園・自然' },
  { value: 'culture', label: '文化施設' },
  { value: 'business', label: 'ビジネス' },
  { value: 'residential', label: '住宅' },
  { value: 'mountain', label: '山' },
  { value: 'shrine', label: '神社' },
  { value: 'other', label: 'その他' }
]

// カテゴリ値をラベルに変換する関数
function getCategoryLabel(categoryValue: string): string {
  const category = pinCategories.find(cat => cat.value === categoryValue)
  return category ? category.label : categoryValue
}

const props = defineProps<{
  isVisible: boolean
  pins: Pin[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'selectPin', pin: Pin): void
  (e: 'flyToPin', pin: Pin): void
  (e: 'deletePin', pinId: string): void
  (e: 'updatePinCategory', pinId: string, category: string): void
  (e: 'updatePinStyle', pinId: string, styleId: string): void
}>()

// 検索用の状態
const searchName = ref('')
const searchCategory = ref('')
const searchLat = ref('')
const searchLng = ref('')
const searchHeight = ref('')
const selectedPinId = ref<string | null>(null)

// 一括操作用の状態
const selectedPins = ref<Set<string>>(new Set())
const bulkCategory = ref('')

// フィルタリングされたピン一覧
const filteredPins = computed(() => {
  let filtered = [...props.pins]

  // 名前で検索
  if (searchName.value.trim()) {
    filtered = filtered.filter(pin => 
      pin.name.toLowerCase().includes(searchName.value.toLowerCase())
    )
  }

  // カテゴリで検索
  if (searchCategory.value.trim()) {
    filtered = filtered.filter(pin => 
      pin.category === searchCategory.value
    )
  }

  // 緯度で検索
  if (searchLat.value.trim()) {
    const lat = parseFloat(searchLat.value)
    if (!isNaN(lat)) {
      filtered = filtered.filter(pin => 
        Math.abs(pin.latitude - lat) < 0.001
      )
    }
  }

  // 経度で検索
  if (searchLng.value.trim()) {
    const lng = parseFloat(searchLng.value)
    if (!isNaN(lng)) {
      filtered = filtered.filter(pin => 
        Math.abs(pin.longitude - lng) < 0.001
      )
    }
  }

  // 高さで検索
  if (searchHeight.value.trim()) {
    const height = parseFloat(searchHeight.value)
    if (!isNaN(height)) {
      filtered = filtered.filter(pin => 
        Math.abs(pin.height - height) < 1.0
      )
    }
  }

  return filtered
})

// 全選択状態の計算
const isAllSelected = computed(() => {
  return filteredPins.value.length > 0 && selectedPins.value.size === filteredPins.value.length
})

// 選択されたピンの数を計算
const selectedPinsCount = computed(() => selectedPins.value.size)

function closePanel() {
  emit('close')
}

function searchPins() {
  // 検索はリアクティブなので自動的に実行される
  console.log('検索実行:', {
    name: searchName.value,
    category: searchCategory.value,
    lat: searchLat.value,
    lng: searchLng.value,
    height: searchHeight.value
  })
}

function clearSearch() {
  searchName.value = ''
  searchCategory.value = ''
  searchLat.value = ''
  searchLng.value = ''
  searchHeight.value = ''
  selectedPinId.value = null
}

function selectPin(pin: Pin) {
  selectedPinId.value = pin.id
  emit('selectPin', pin)
}

function flyToPin(pin: Pin) {
  emit('flyToPin', pin)
}

function deletePin(pinId: string) {
  if (confirm('このピンを削除しますか？')) {
    emit('deletePin', pinId)
  }
}

// 一括操作の関数
function toggleSelectAll() {
  if (isAllSelected.value) {
    // 全選択解除
    selectedPins.value.clear()
  } else {
    // 全選択
    filteredPins.value.forEach(pin => {
      selectedPins.value.add(pin.id)
    })
  }
}

function togglePinSelection(pinId: string) {
  if (selectedPins.value.has(pinId)) {
    selectedPins.value.delete(pinId)
  } else {
    selectedPins.value.add(pinId)
  }
}

function changeBulkCategory() {
  if (!bulkCategory.value || selectedPins.value.size === 0) {
    alert('カテゴリを選択し、変更対象のピンを選択してください。')
    return
  }

  const count = selectedPins.value.size
  if (confirm(`${count}件のピンのカテゴリを「${getCategoryLabel(bulkCategory.value)}」に変更しますか？`)) {
    selectedPins.value.forEach(pinId => {
      emit('updatePinCategory', pinId, bulkCategory.value)
    })
    
    // 選択をクリア
    selectedPins.value.clear()
    bulkCategory.value = ''
    
    alert(`${count}件のピンのカテゴリを変更しました。`)
  }
}

// 検索条件が変更されたときに自動的に検索を実行
watch([searchName, searchCategory, searchLat, searchLng, searchHeight], () => {
  // リアクティブな computed なので自動的に更新される
})

const availablePinStyles = computed(() => Object.values(pinStyles))

function getStyleForPin(pin: Pin): string {
  return pin.styleId || categoryDefaultStyle[pin.category] || 'basic-sphere-blue'
}

function onStyleChange(pinId: string, styleId: string) {
  emit('updatePinStyle', pinId, styleId)
}
</script>

<style scoped>
.pin-list-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 800px;
  max-width: 90vw;
  max-height: 80vh;
  background-color: rgba(0, 0, 0, 0.9);
  color: #ffffcc;
  border-radius: 10px;
  font-family: monospace;
  font-size: 13px;
  box-shadow: 0 0 20px rgba(255, 255, 150, 0.8);
  z-index: 10002;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 150, 0.3);
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
}

.close-button {
  background: none;
  border: none;
  color: #ffffcc;
  font-size: 20px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: #ff6b6b;
}

.search-section {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 150, 0.2);
}

.search-inputs {
  margin-bottom: 8px;
}

.search-input {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 150, 0.3);
  color: #ffffcc;
  padding: 6px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  width: 100%;
  margin-bottom: 4px;
}

.search-input.small {
  width: calc(33.33% - 4px);
  margin-right: 4px;
}

.search-input:focus {
  outline: none;
  border-color: rgba(255, 255, 150, 0.6);
}

.coordinate-search {
  display: flex;
  gap: 4px;
}

.search-buttons {
  display: flex;
  gap: 8px;
}

.search-button, .clear-button {
  background-color: #ffd;
  border: 1px solid #cca;
  border-radius: 4px;
  padding: 6px 12px;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
}

.search-button:hover, .clear-button:hover {
  background-color: #ffe;
}

.clear-button {
  background-color: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.4);
  color: #ff6b6b;
}

.pin-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.list-header {
  display: grid;
  grid-template-columns: 0.5fr 2fr 1fr 1fr 1fr 1fr 2fr 2fr;
  gap: 8px;
  padding: 8px 16px;
  background-color: rgba(255, 255, 150, 0.1);
  border-bottom: 1px solid rgba(255, 255, 150, 0.2);
  font-weight: bold;
  font-size: 12px;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.pin-item {
  display: grid;
  grid-template-columns: 0.5fr 2fr 1fr 1fr 1fr 1fr 2fr 2fr;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 150, 0.1);
  align-items: center;
  font-size: 12px;
}

.pin-item:hover {
  background-color: rgba(255, 255, 150, 0.05);
}

.pin-item.selected {
  background-color: rgba(255, 255, 150, 0.1);
}

.pin-select {
  text-align: center;
}

.pin-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.pin-name {
  font-weight: bold;
}

.pin-lat, .pin-lng, .pin-height {
  text-align: right;
}

.pin-category {
  text-align: right;
}

.pin-style {
  display: flex;
  justify-content: flex-end;
}

.style-select {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 150, 0.3);
  color: #ffffcc;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  min-width: 160px;
}

.style-select:focus {
  outline: none;
  border-color: rgba(255, 255, 150, 0.6);
}

.pin-actions {
  display: flex;
  gap: 4px;
}

.action-button {
  background-color: #ffd;
  border: 1px solid #cca;
  border-radius: 3px;
  padding: 3px 6px;
  cursor: pointer;
  font-size: 10px;
  font-family: monospace;
}

.action-button:hover {
  background-color: #ffe;
}

.action-button.select {
  background-color: rgba(76, 175, 80, 0.2);
  border-color: rgba(76, 175, 80, 0.4);
  color: #4caf50;
}

.action-button.fly {
  background-color: rgba(33, 150, 243, 0.2);
  border-color: rgba(33, 150, 243, 0.4);
  color: #2196f3;
}

.action-button.delete {
  background-color: rgba(255, 107, 107, 0.2);
  border-color: rgba(255, 107, 107, 0.4);
  color: #ff6b6b;
}

.no-pins {
  text-align: center;
  padding: 20px;
  color: rgba(255, 255, 150, 0.6);
  font-style: italic;
}

.pin-stats {
  padding: 8px 16px;
  background-color: rgba(255, 255, 150, 0.05);
  border-top: 1px solid rgba(255, 255, 150, 0.2);
  font-size: 11px;
  text-align: center;
}

/* スクロールバーのスタイル */
.list-content::-webkit-scrollbar {
  width: 8px;
}

.list-content::-webkit-scrollbar-track {
  background: rgba(255, 255, 150, 0.1);
  border-radius: 4px;
}

.list-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 150, 0.3);
  border-radius: 4px;
}

.list-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 150, 0.5);
}

/* 一括操作セクションのスタイル */
.bulk-actions-section {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 150, 0.2);
  background-color: rgba(255, 255, 150, 0.05);
}

.bulk-selection {
  margin-bottom: 8px;
}

.select-all-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  cursor: pointer;
}

.select-all-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.bulk-category-change {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.bulk-label {
  font-size: 12px;
  color: rgba(255, 255, 150, 0.8);
}

.bulk-category-select {
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 150, 0.3);
  color: #ffffcc;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  min-width: 120px;
}

.bulk-category-select:focus {
  outline: none;
  border-color: rgba(255, 255, 150, 0.6);
}

.bulk-change-button {
  background-color: rgba(76, 175, 80, 0.2);
  border: 1px solid rgba(76, 175, 80, 0.4);
  color: #4caf50;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: monospace;
}

.bulk-change-button:hover:not(:disabled) {
  background-color: rgba(76, 175, 80, 0.3);
}

.bulk-change-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 