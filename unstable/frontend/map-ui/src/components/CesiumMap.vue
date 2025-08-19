<template>
  <div class="container">
    <div class="map-container">
      <!-- 地図表示 -->
      <div id="cesiumContainer" class="cesium-map"></div>

      <!-- カメラ情報パネル -->
      <CameraInfoPanel
        :display-camera-orientation="displayCameraOrientation"
        :display-camera-position="displayCameraPosition"
        :camera-height="cameraHeight"
        :screen-size="screenSize"
        :temp-pin-screen-position="tempPinScreenPosition"
        :auto-center-on-pin-placement="autoCenterOnPinPlacement"
        v-model:selected-altitude="selectedAltitude"
        v-model:custom-altitude="customAltitude"
        @update:camera-orientation="updateCameraOrientation"
        @update:camera-z="updateCameraZ"
        @update:camera-height="updateCameraHeight"
        @update:auto-center-on-pin-placement="updateAutoCenterOnPinPlacement"
      />

      <!-- ピン情報パネル -->
      <PinInfoPanel
        v-if="pinPosition"
        :pin-position="pinPosition"
        @update:pin-position="updatePinPosition"
        @update:camera-orientation="updateCameraOrientation"
        @jump-to-position="jumpToPinPosition"
      />

      <!-- コントロールパネル -->
      <ControlPanel
        :current-time="currentTime"
        :current-pin-position="pinPosition"
        v-model:terrain-type="terrainType"
        v-model:optimize-enabled="optimizeEnabled"
        @toggle-animation="toggleAnimation"
        @update:multiplier="updateMultiplier"
        @jump-to-datetime="jumpToDatetime"
        @show-pin-list="showPinList"
        @add-current-pin="addCurrentPin"
        @show-icon-settings="showIconSettings"
      />

      <!-- ピン一覧パネル -->
      <PinListPanel
        :is-visible="isPinListVisible"
        :pins="savedPins"
        @close="hidePinList"
        @select-pin="selectPinFromList"
        @fly-to-pin="flyToPinFromList"
        @delete-pin="deletePinFromList"
        @update-pin-category="updatePinCategory"
        @update-pin-style="updatePinStyle"
      />

      <!-- アイコン設定パネル -->
      <IconSettingsPanel
        :is-visible="isIconSettingsVisible"
        :category-to-style="categoryToStyleMap"
        :temp-style-id="selectedTempPinStyleId"
        @close="hideIconSettings"
        @save="applyIconSettings"
      />

      <!-- ピンポップアップパネル -->
      <PinPopupPanel
        :is-visible="isPinPopupVisible"
        :position="pinPopupPosition"
        :pin-info="pinPopupInfo"
        @close="closePinPopup"
        @jump-to-position="jumpToPinPosition"
        @edit-position="editPinPosition"
      />

      <!-- ピン登録モーダル -->
      <div v-if="isPinRegistrationVisible" class="modal-overlay" @click="hidePinRegistrationModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>ピン登録</h3>
            <button @click="hidePinRegistrationModal" class="close-button">×</button>
          </div>
          
          <div class="modal-body">
            <div class="form-group">
              <label for="pin-name">ピン名 *</label>
              <input 
                id="pin-name"
                v-model="newPinData.name" 
                type="text" 
                placeholder="ピンの名前を入力してください"
                class="form-input"
                @keyup.enter="submitPinRegistration"
              />
            </div>
            
            <!-- 住所情報表示 -->
            <div class="form-group">
              <label>住所情報</label>
              <div class="address-info">
                <div v-if="isLoadingAddress" class="loading-address">
                  <span class="loading-spinner">⏳</span> 住所情報を取得中...
                </div>
                <div v-else-if="addressInfo" class="address-details">
                  <div class="address-line">{{ addressInfo.address }}</div>
                  <div class="address-breakdown">
                    <span v-if="addressInfo.postalCode" class="postal-code">〒{{ addressInfo.postalCode }}</span>
                    <span v-if="addressInfo.prefecture" class="prefecture">{{ addressInfo.prefecture }}</span>
                    <span v-if="addressInfo.city" class="city">{{ addressInfo.city }}</span>
                    <span v-if="addressInfo.district" class="district">{{ addressInfo.district }}</span>
                  </div>
                </div>
                <div v-else-if="addressError" class="address-error">
                  <div class="error-title">住所情報を取得できませんでした</div>
                  <div class="error-code">エラーコード: {{ addressError.code }}</div>
                  <div class="error-message">エラーメッセージ: {{ addressError.message }}</div>
                  <div v-if="addressError.details" class="error-details">
                    <details>
                      <summary>詳細情報</summary>
                      <pre>{{ addressError.details }}</pre>
                    </details>
                  </div>
                </div>
                <div v-else class="no-address">
                  住所情報を取得できませんでした
                </div>
              </div>
            </div>
            
            <div class="form-group">
              <label for="pin-category">カテゴリ</label>
              <select id="pin-category" v-model="newPinData.category" class="form-input">
                <option v-for="category in pinCategories" :key="category.value" :value="category.value">
                  {{ category.label }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="pin-style">スタイル（形状/色/ラベル）</label>
              <select id="pin-style" v-model="newPinData.styleId" class="form-input">
                <option v-for="style in availablePinStyles" :key="style.id" :value="style.id">
                  {{ style.label }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="pin-description">説明（任意）</label>
              <textarea 
                id="pin-description"
                v-model="newPinData.description" 
                placeholder="ピンの説明を入力してください"
                class="form-input"
                rows="3"
              ></textarea>
            </div>
            
            <div class="form-group">
              <label>位置情報</label>
              <div class="position-info">
                <div>緯度: {{ pinPosition?.latitude.toFixed(8) }}°</div>
                <div>経度: {{ pinPosition?.longitude.toFixed(8) }}°</div>
                <div>高さ: {{ pinPosition?.height.toFixed(3) }}m</div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button @click="hidePinRegistrationModal" class="cancel-button">キャンセル</button>
            <button @click="submitPinRegistration" class="submit-button">登録</button>
          </div>
        </div>
      </div>

      <!-- 仮地点操作ヘルプパネル -->
      <div v-if="pinPosition" class="help-overlay">
        <div class="help-content">
          <strong>仮地点の精密操作</strong><br />
          • <strong>クリック</strong>: 地図上をクリックして仮地点を配置<br />
          • <strong>ドラッグ</strong>: 仮地点を直接ドラッグして移動<br />
          • <strong>矢印キー</strong>: 精密に位置を調整<br />
          • <strong>Shift + 矢印キー</strong>: 10倍の精度で調整<br />
          • <strong>PageUp/PageDown</strong>: 高さを調整<br />
          • <strong>Shift + PageUp/PageDown</strong>: 高さを10倍の精度で調整
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import * as Cesium from 'cesium'
import CameraInfoPanel from './CameraInfoPanel.vue'
import PinInfoPanel from './PinInfoPanel.vue'
import ControlPanel from './ControlPanel.vue'
import PinListPanel from './PinListPanel.vue'
import PinPopupPanel from './PinPopupPanel.vue'
import IconSettingsPanel from './IconSettingsPanel.vue'
import { pinStyles, categoryDefaultStyle, type PinStyle } from '../config/pinStyles'
import {
  getTerrain,
  applyOptimization,
  createViewer,
  flyToCameraPositionAndSyncUI,
  putCrossMark,
  getHeightFromTerrainProvider,
  getAddressFromCoordinates,
  formatAddress,
} from '../utils/cesiumUtils'
import { tempPinStyles } from '../config/tempPinStyles'

Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_TOKEN

// ピン管理用のインターフェース
interface SavedPin {
  id: string
  name: string
  latitude: number
  longitude: number
  height: number
  category: string
  styleId?: string
  description?: string
  addressInfo?: {
    address: string
    prefecture: string
    city: string
    district: string
    postalCode?: string
  }
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

// スタイル一覧（UI用）
const availablePinStyles = Object.values(pinStyles)

// refs
const pinPosition = ref<null | { latitude: number; longitude: number; height: number }>(null)
const terrainType = ref('none')
const optimizeEnabled = ref(true)
const isAnimating = ref(false)
const multiplier = ref(60)
const currentTime = ref('')
const jumpDatetime = ref('')
const selectedAltitude = ref('2000')
const customAltitude = ref(0)

// ピン管理用の状態
const isPinListVisible = ref(false)
const savedPins = ref<SavedPin[]>([])
const pinEntities = ref<Map<string, Cesium.Entity>>(new Map())

// ピン登録用のモーダル状態
const isPinRegistrationVisible = ref(false)
const newPinData = reactive({
  name: '',
  category: 'other',
  styleId: '' as string,
  description: ''
})

// 住所情報の状態
const addressInfo = ref<{
  address: string
  prefecture: string
  city: string
  district: string
  postalCode?: string
} | null>(null)
const isLoadingAddress = ref(false)
const addressError = ref<{
  code: string
  message: string
  details?: string
} | null>(null)

// ピンポップアップの状態管理
const isPinPopupVisible = ref(false)
const pinPopupPosition = ref({ x: 0, y: 0 })
const pinPopupInfo = ref({ 
  latitude: 0, 
  longitude: 0, 
  height: 0,
  name: undefined as string | undefined,
  category: undefined as string | undefined,
  description: undefined as string | undefined
})

// ホバー効果用の状態
const isHovering = ref(false)
let hoverAnimationId: number | null = null

// カメラ移動設定
const autoCenterOnPinPlacement = ref(true) // 仮アイコン配置時に自動で画面中央に移動するかどうか

// 画面サイズ管理
const screenSize = ref({ width: window.innerWidth, height: window.innerHeight })

// 仮地点の画面座標管理
const tempPinScreenPosition = ref({ x: 0, y: 0 })
const selectedTempPinStyleId = ref<string>(localStorage.getItem('tempPinStyleId') || 'temp-inverted-pyramid')
const isIconSettingsVisible = ref(false)
const categoryToStyleMap = ref<Record<string, string>>({
  ...categoryDefaultStyle,
  ...(JSON.parse(localStorage.getItem('pinCategoryToStyle') || 'null') || {})
})

// reactiveを使用したカメラ状態管理
const cameraPosition = reactive({ x: 0, y: 0, z: 0 })
const cameraOrientation = reactive({ heading: 0, pitch: 0, roll: 0 })
const cameraCartographic = reactive({
  longitude: 0,
  latitude: 0,
  height: 1000,
})

const viewerReady = ref(false)
const viewer = ref<Cesium.Viewer | null>(null)
let tempPinEntity: Cesium.Entity | null = null
let tempPinLabelEntity: Cesium.Entity | null = null
let tempPinAllEntities: Cesium.Entity[] = [] // 仮地点アイコンの全エンティティを管理
let clockUpdateInterval: number | null = null

const displayCameraPosition = computed(() => ({
  x: cameraPosition.x?.toFixed(2) ?? '---',
  y: cameraPosition.y?.toFixed(2) ?? '---',
  z: cameraPosition.z?.toFixed(2) ?? '---',
}))

const displayCameraOrientation = computed(() => ({
  heading: cameraOrientation.heading.toFixed(1),
  pitch: cameraOrientation.pitch.toFixed(1),
  roll: cameraOrientation.roll.toFixed(1),
}))

const cameraHeight = computed(() => cameraCartographic.height)

// 仮地点のドラッグ状態管理
const isDraggingPin = ref(false)
const dragStartPosition = ref({ x: 0, y: 0 })
const originalPinPosition = ref({ latitude: 0, longitude: 0, height: 0 })

// ピン管理機能
function showPinList() {
  isPinListVisible.value = true
}

function hidePinList() {
  isPinListVisible.value = false
}

// 住所情報を取得する関数
async function loadAddressInfo() {
  if (!pinPosition.value) return
  
  isLoadingAddress.value = true
  addressError.value = null
  
  try {
    const address = await getAddressFromCoordinates(
      pinPosition.value.latitude,
      pinPosition.value.longitude
    )
    addressInfo.value = address
  } catch (error) {
    console.warn('住所情報の取得に失敗しました:', error)
    addressInfo.value = null
    
    // エラー詳細を設定
    if (error instanceof Error) {
      addressError.value = {
        code: 'FETCH_ERROR',
        message: error.message,
        details: error.stack
      }
    } else if (typeof error === 'string') {
      addressError.value = {
        code: 'UNKNOWN_ERROR',
        message: error,
        details: '文字列エラー'
      }
    } else {
      addressError.value = {
        code: 'UNKNOWN_ERROR',
        message: '不明なエラーが発生しました',
        details: JSON.stringify(error)
      }
    }
  } finally {
    isLoadingAddress.value = false
  }
}

function showPinRegistrationModal() {
  // フォームデータをリセット
  newPinData.name = ''
  newPinData.category = 'other'
  newPinData.styleId = categoryDefaultStyle['other'] || 'basic-sphere-blue'
  newPinData.description = ''
  addressInfo.value = null
  addressError.value = null
  
  // 住所情報を取得
  if (pinPosition.value) {
    loadAddressInfo()
  }
  
  // モーダルを表示
  isPinRegistrationVisible.value = true
}

function hidePinRegistrationModal() {
  isPinRegistrationVisible.value = false
}

function submitPinRegistration() {
  if (!pinPosition.value || !newPinData.name.trim()) {
    alert('ピン名を入力してください。')
    return
  }

  // カテゴリのデフォルトスタイルを補完
  const resolvedStyleId = (newPinData.styleId && pinStyles[newPinData.styleId])
    ? newPinData.styleId
    : (categoryDefaultStyle[newPinData.category] || 'basic-sphere-blue')

  const newPin: SavedPin = {
    id: generatePinId(),
    name: newPinData.name.trim(),
    latitude: pinPosition.value.latitude,
    longitude: pinPosition.value.longitude,
    height: pinPosition.value.height,
    category: newPinData.category,
    styleId: resolvedStyleId,
    description: newPinData.description.trim() || undefined,
    addressInfo: addressInfo.value || undefined
  }

  savedPins.value.push(newPin)
  addPinToMap(newPin)
  
  // ローカルストレージに保存
  savePinsToStorage()
  
  // モーダルを閉じる
  hidePinRegistrationModal()
  
  alert(`ピン「${newPin.name}」を追加しました。`)
}

function generatePinId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

function addPinToMap(pin: SavedPin) {
  if (!viewer.value) return

  // スタイルを解決
  const resolvedStyleId = pin.styleId || categoryDefaultStyle[pin.category] || 'basic-sphere-blue'
  const userMapped = categoryToStyleMap.value[pin.category]
  const finalStyleId = userMapped || resolvedStyleId
  const styleDef = pinStyles[finalStyleId]
  if (!styleDef) {
    console.warn('未知のスタイルIDのためデフォルトを使用します:', resolvedStyleId)
    return addPinToMap({ ...pin, styleId: 'basic-sphere-blue' })
  }

  // エンティティを作成（Workerで問題を起こす可能性のあるプロパティを避ける）
  const basePosition = Cesium.Cartesian3.fromDegrees(pin.longitude, pin.latitude, pin.height + 2)
  const labelIcon = styleDef.label?.icon || '📍'
  const fontSize = styleDef.label?.fontSize || 14
  const labelBg = styleDef.label?.backgroundColor || styleDef.color.withAlpha(0.9)
  const pixelOffsetY = styleDef.label?.pixelOffsetY ?? -(styleDef.size + 10)
  const textTemplate = styleDef.label?.textTemplate || '{icon} {name}'
  const labelText = textTemplate
    .replace('{icon}', labelIcon)
    .replace('{name}', pin.name)

  const entityOptions: Cesium.Entity.ConstructorOptions = {
    position: basePosition,
    description: `登録済みピン: ${pin.name} (${pin.category})`,
    properties: new Cesium.PropertyBag({
      pinId: pin.id,
      pinName: pin.name,
      pinCategory: pin.category,
      pinStyleId: finalStyleId,
      pinDescription: pin.description || ''
    }),
    id: pin.id
  }

  // 形状の分岐
  if (styleDef.geometry === 'ellipsoid') {
    entityOptions.ellipsoid = {
      radii: new Cesium.Cartesian3(styleDef.size, styleDef.size, styleDef.size),
      material: styleDef.color.withAlpha(0.86),
      outline: !!styleDef.outlineColor,
      outlineColor: styleDef.outlineColor || Cesium.Color.WHITE,
      outlineWidth: 2
    }
  } else if (styleDef.geometry === 'point') {
    entityOptions.point = {
      pixelSize: styleDef.size,
      color: styleDef.color.withAlpha(0.95),
      outlineColor: styleDef.outlineColor || Cesium.Color.BLACK,
      outlineWidth: 2,
      heightReference: Cesium.HeightReference.NONE
    }
  } else if (styleDef.geometry === 'cylinder') {
    entityOptions.cylinder = {
      length: styleDef.size * 2.0,
      topRadius: styleDef.size * 0.8,
      bottomRadius: 0,
      material: styleDef.color.withAlpha(0.9),
      outline: !!styleDef.outlineColor,
      outlineColor: styleDef.outlineColor || Cesium.Color.WHITE,
      outlineWidth: 2
    }
  } else if (styleDef.geometry === 'billboard') {
    entityOptions.billboard = {
      image: styleDef.billboardImageUrl || undefined,
      width: styleDef.size,
      height: styleDef.size,
      color: styleDef.color.withAlpha(0.95),
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM
    }
  }

  // ラベル
  entityOptions.label = {
    text: labelText,
    font: `bold ${fontSize}px sans-serif`,
    fillColor: Cesium.Color.BLACK,
    outlineColor: Cesium.Color.WHITE,
    outlineWidth: 2,
    pixelOffset: new Cesium.Cartesian2(0, pixelOffsetY),
    backgroundColor: labelBg,
    showBackground: true,
    backgroundPadding: new Cesium.Cartesian2(8, 4),
    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
    disableDepthTestDistance: 0
  }

  const entity = viewer.value.entities.add(entityOptions)

  console.log('登録済みピンをマップに追加:', pin.id, pin.name)
  pinEntities.value.set(pin.id, entity)
}

function selectPinFromList(pin: SavedPin) {
  // ピン位置を更新
  updatePinPosition({
    latitude: pin.latitude,
    longitude: pin.longitude,
    height: pin.height
  })
  
  // ターゲットの3D座標を取得
  const targetCartesian = Cesium.Cartesian3.fromDegrees(
    pin.longitude,
    pin.latitude,
    pin.height
  )

  // 現在のカメラの向きを維持しながら、ターゲットを画面中央に表示
  // カメラの現在の高さと向きを維持し、位置のみを調整
  const currentCameraPosition = viewer.value?.camera.position
  const currentOrientation = viewer.value ? {
    heading: viewer.value.camera.heading,
    pitch: viewer.value.camera.pitch,
    roll: viewer.value.camera.roll
  } : { heading: 0, pitch: 0, roll: 0 }

  if (viewer.value && currentCameraPosition) {
    // カメラをターゲットの後ろに配置（現在のpitch角度を考慮）
    const offsetDistance = cameraCartographic.height * 0.1 // カメラ高さの10%
    const offsetCartesian = Cesium.Cartesian3.multiplyByScalar(
      Cesium.Cartesian3.subtract(currentCameraPosition, targetCartesian, new Cesium.Cartesian3()),
      offsetDistance / Cesium.Cartesian3.distance(currentCameraPosition, targetCartesian),
      new Cesium.Cartesian3()
    )

    const newCameraPosition = Cesium.Cartesian3.add(targetCartesian, offsetCartesian, new Cesium.Cartesian3())

    viewer.value.camera.flyTo({
      destination: newCameraPosition,
      orientation: currentOrientation,
      duration: 1.0
    })
  }
  
  // ピン一覧を閉じる
  hidePinList()
}

function flyToPinFromList(pin: SavedPin) {
  if (!viewer.value) return

  flyToCameraPositionAndSyncUI(viewer.value, {
    longitude: pin.longitude,
    latitude: pin.latitude,
    height: pin.height + 1000,
    heading: cameraOrientation.heading,
    pitch: -45,
    roll: 0,
  })
}

function jumpToPinPosition(position: { latitude: number; longitude: number; height: number }) {
  if (!viewer.value) return

  // ピン位置を画面中央に表示する（その位置をクリックしたときと同じように）
  centerCameraOnPinPlacement(position)
}

function deletePinFromList(pinId: string) {
  // マップからエンティティを削除
  const entity = pinEntities.value.get(pinId)
  if (entity && viewer.value) {
    viewer.value.entities.remove(entity)
    pinEntities.value.delete(pinId)
  }

  // 配列から削除
  const index = savedPins.value.findIndex(pin => pin.id === pinId)
  if (index !== -1) {
    savedPins.value.splice(index, 1)
  }

  // ローカルストレージに保存
  savePinsToStorage()
}

function savePinsToStorage() {
  try {
    localStorage.setItem('savedPins', JSON.stringify(savedPins.value))
    localStorage.setItem('pinCategoryToStyle', JSON.stringify(categoryToStyleMap.value))
    localStorage.setItem('tempPinStyleId', selectedTempPinStyleId.value)
  } catch (error) {
    console.warn('ピンの保存に失敗しました:', error)
  }
}

function loadPinsFromStorage() {
  try {
    const stored = localStorage.getItem('savedPins')
    if (stored) {
      const pins = JSON.parse(stored)
      
      // 既存のピンデータにカテゴリが含まれていない場合はデフォルト値を設定
      const processedPins = pins.map((pin: any) => ({
        ...pin,
        category: pin.category || 'other',
        styleId: pin.styleId || categoryDefaultStyle[(pin.category || 'other')] || 'basic-sphere-blue'
      }))
      
      savedPins.value = processedPins
      
      // マップにピンを追加
      processedPins.forEach((pin: SavedPin) => {
        addPinToMap(pin)
      })
    }
    // ここではカテゴリ/仮ピンスタイルは初期化時に読み込み済み
  } catch (error) {
    console.warn('ピンの読み込みに失敗しました:', error)
  }
}

function updateCameraInfo() {
  if (!viewer.value) return

  const pos = viewer.value.camera.positionWC
  cameraPosition.x = pos.x
  cameraPosition.y = pos.y
  
  // Z軸高度は海抜高度から計算する（統一性のため）
  const carto = Cesium.Cartographic.fromCartesian(viewer.value.camera.position)
  const earthRadius = Cesium.Ellipsoid.WGS84.maximumRadius
  const calculatedZAxisHeight = earthRadius + carto.height
  cameraPosition.z = calculatedZAxisHeight
  
  // デバッグ用ログ（必要に応じてコメントアウト）
  // console.log('updateCameraInfo - 海抜高度:', carto.height.toFixed(2), 'm, Z軸高度:', calculatedZAxisHeight.toFixed(2), 'm')

  const heading = Cesium.Math.toDegrees(viewer.value.camera.heading)
  const pitch = Cesium.Math.toDegrees(viewer.value.camera.pitch)
  const roll = Cesium.Math.toDegrees(viewer.value.camera.roll)

  cameraOrientation.heading = heading
  cameraOrientation.pitch = pitch
  cameraOrientation.roll = roll
  updateCameraCartographic()
  
  // 仮地点アイコンのサイズをズームに応じて更新
  updatePinIconSize()
}

function updateCameraCartographic() {
  if (!viewer.value) return

  const carto = Cesium.Cartographic.fromCartesian(viewer.value.camera.position)
  cameraCartographic.longitude = Cesium.Math.toDegrees(carto.longitude)
  cameraCartographic.latitude = Cesium.Math.toDegrees(carto.latitude)
  cameraCartographic.height = carto.height
}

// カメラの距離を取得する関数
function getCameraDistance(): number {
  if (!viewer.value) return 1000
  const distance = viewer.value.camera.distanceToBoundingSphere
  return typeof distance === 'number' ? distance : 1000
}

// ズームに応じたスケールを計算する関数
function getZoomScale(): number {
  const distance = getCameraDistance()
  return Math.max(0.3, Math.min(3.0, 1000 / distance))
}

// 仮地点アイコンのサイズをズームに応じて更新する関数
function updatePinIconSize() {
  if (!viewer.value || !tempPinEntity) return
  
  const zoomScale = getZoomScale()
  const baseSize = 15 // ベースサイズ
  
  // すべての仮地点アイコンエンティティのサイズを調整
  tempPinAllEntities.forEach(entity => {
    // 3D球体のサイズ調整
    if (entity.ellipsoid) {
      const scaledSize = baseSize * zoomScale
      entity.ellipsoid.radii = new Cesium.ConstantProperty(new Cesium.Cartesian3(scaledSize, scaledSize, scaledSize))
    }
    
    // ポイントマーカーのサイズ調整
    if (entity.point) {
      entity.point.pixelSize = new Cesium.ConstantProperty(Math.max(8, Math.min(40, 20 * zoomScale)))
    }
    
    // 3Dボックスのサイズ調整
    if (entity.box) {
      const scaledSize = baseSize * 0.8 * zoomScale
      entity.box.dimensions = new Cesium.ConstantProperty(new Cesium.Cartesian3(scaledSize, scaledSize, scaledSize))
    }
    
    // 逆四角錐（逆ピラミッド）型のサイズ調整
    if (entity.cylinder) {
      const scaledLength = 30 * zoomScale
      entity.cylinder.length = new Cesium.ConstantProperty(scaledLength)
      entity.cylinder.topRadius = new Cesium.ConstantProperty(12 * zoomScale)
      entity.cylinder.bottomRadius = new Cesium.ConstantProperty(0)
    }
    
    // ポリライン（十字線）のサイズ調整
    if (entity.polyline) {
      entity.polyline.width = new Cesium.ConstantProperty(Math.max(2, Math.min(8, 4 * zoomScale)))
    }
  })
  
  // メインの仮地点エンティティのラベルサイズ調整
  if (tempPinEntity && tempPinEntity.label) {
    const baseFontSize = 20
    const scaledFontSize = Math.max(12, Math.min(32, baseFontSize * zoomScale))
    tempPinEntity.label.font = new Cesium.ConstantProperty(`bold ${scaledFontSize}px sans-serif`)
  }
  
  // 座標情報ラベルのフォントサイズ調整
  if (tempPinLabelEntity && tempPinLabelEntity.label) {
    const baseFontSize = 14
    const scaledFontSize = Math.max(10, Math.min(18, baseFontSize * zoomScale))
    tempPinLabelEntity.label.font = new Cesium.ConstantProperty(`bold ${scaledFontSize}px sans-serif`)
  }
}

function updatePinPosition(newPosition: { latitude: number; longitude: number; height: number }) {
  console.log('updatePinPositionが呼び出されました。新しい位置:', newPosition)
  
  // ポップアップが開いている場合は処理をスキップ
  if (isPinPopupVisible.value) {
    console.log('ポップアップが開いているため、位置更新をスキップします')
    return
  }
  
  pinPosition.value = newPosition
  if (viewer.value) {
    if (tempPinEntity) {
      console.log('既存の仮地点アイコンの位置を更新します')
      // 既存のエンティティの位置を直接更新
      const newPosition3D = Cesium.Cartesian3.fromDegrees(
        newPosition.longitude,
        newPosition.latitude,
        newPosition.height + 15 // 逆四角錐の高さの半分（30/2=15）だけ上に移動して、とがった部分が指定位置に来るようにする
      )
      
      tempPinEntity.position = new Cesium.ConstantPositionProperty(newPosition3D)
      
      // すべての仮地点アイコンエンティティの位置を更新
      tempPinAllEntities.forEach(entity => {
        if (entity) {
          entity.position = new Cesium.ConstantPositionProperty(newPosition3D)
        }
      })
      
      // 座標情報ラベルも更新
      if (tempPinLabelEntity) {
        tempPinLabelEntity.position = new Cesium.ConstantPositionProperty(newPosition3D)
        tempPinLabelEntity.label!.text = new Cesium.ConstantProperty(
          `📍 仮地点\n緯度: ${newPosition.latitude.toFixed(8)}°\n経度: ${newPosition.longitude.toFixed(8)}°\n高さ: ${newPosition.height.toFixed(3)}m`
        )
        // ラベルのスタイルも更新
        tempPinLabelEntity.label!.font = new Cesium.ConstantProperty('bold 14px sans-serif')
        tempPinLabelEntity.label!.fillColor = new Cesium.ConstantProperty(Cesium.Color.DARKBLUE)
        tempPinLabelEntity.label!.outlineColor = new Cesium.ConstantProperty(Cesium.Color.WHITE)
        tempPinLabelEntity.label!.outlineWidth = new Cesium.ConstantProperty(3)
        tempPinLabelEntity.label!.backgroundColor = new Cesium.ConstantProperty(Cesium.Color.LIGHTYELLOW.withAlpha(0.98))
        tempPinLabelEntity.label!.backgroundPadding = new Cesium.ConstantProperty(new Cesium.Cartesian2(15, 10))
      }
      
      console.log('仮地点アイコンの位置更新が完了しました')
    } else {
      console.log('新しい仮地点アイコンを作成します:', newPosition)
      // 仮地点アイコンが存在しない場合は新規作成
      if (!viewer.value) return
      
      // エンティティ配列をクリア
      tempPinAllEntities = []
      
      const tempStyle = tempPinStyles[selectedTempPinStyleId.value] || tempPinStyles['temp-inverted-pyramid']

      tempPinEntity = viewer.value.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          newPosition.longitude,
          newPosition.latitude,
          newPosition.height + (tempStyle.geometry === 'inverted-pyramid' ? tempStyle.size : 10)
        ),
        // ラベル
        label: {
          text: new Cesium.ConstantProperty('仮地点'),
          font: new Cesium.ConstantProperty('bold 20px sans-serif'),
          fillColor: Cesium.Color.WHITE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 4,
          pixelOffset: new Cesium.Cartesian2(0, -70),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          backgroundColor: tempStyle.color.withAlpha(0.95),
          backgroundPadding: new Cesium.Cartesian2(15, 10),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        },
        // クリック検出用のdescription
        description: '仮地点アイコン'
      })
      tempPinAllEntities.push(tempPinEntity)
      
      // 形状に応じた仮ピン描画
      if (tempStyle.geometry === 'inverted-pyramid') {
        const invertedPyramidEntity = viewer.value.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            newPosition.longitude,
            newPosition.latitude,
            newPosition.height + tempStyle.size
          ),
          cylinder: {
            length: tempStyle.size * 2, // 高さ
            topRadius: tempStyle.size * 0.8,
            bottomRadius: 0,
            material: tempStyle.color,
            outline: !!tempStyle.outlineColor,
            outlineColor: tempStyle.outlineColor || Cesium.Color.WHITE,
            outlineWidth: 3,
          }
        })
        tempPinAllEntities.push(invertedPyramidEntity)
      } else if (tempStyle.geometry === 'point') {
        const pointEntity = viewer.value.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            newPosition.longitude,
            newPosition.latitude,
            newPosition.height + 1
          ),
          point: {
            pixelSize: tempStyle.size,
            color: tempStyle.color.withAlpha(0.95),
            outlineColor: tempStyle.outlineColor || Cesium.Color.BLACK,
            outlineWidth: 2,
          }
        })
        tempPinAllEntities.push(pointEntity)
      } else if (tempStyle.geometry === 'ellipsoid') {
        const ellipsoidEntity = viewer.value.entities.add({
          position: Cesium.Cartesian3.fromDegrees(
            newPosition.longitude,
            newPosition.latitude,
            newPosition.height + tempStyle.size * 0.2
          ),
          ellipsoid: {
            radii: new Cesium.Cartesian3(tempStyle.size, tempStyle.size, tempStyle.size),
            material: tempStyle.color.withAlpha(0.9),
            outline: !!tempStyle.outlineColor,
            outlineColor: tempStyle.outlineColor || Cesium.Color.WHITE,
            outlineWidth: 2,
          }
        })
        tempPinAllEntities.push(ellipsoidEntity)
      }
      
      // 仮地点のベース円盤（地面との接点を明確にする）
      const baseDiskEntity = viewer.value.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          newPosition.longitude,
          newPosition.latitude,
          newPosition.height + 0.1 // 地面近くに配置
        ),
        ellipse: {
          semiMinorAxis: 20,
          semiMajorAxis: 20,
          material: tempStyle.color.withAlpha(0.6),
          height: newPosition.height + 0.1,
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        }
      })
      tempPinAllEntities.push(baseDiskEntity)

      // 吹き出しの矢印（スタイル色を使用）
      const arrowEntity = viewer.value.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          newPosition.longitude,
          newPosition.latitude,
          newPosition.height + (tempStyle.geometry === 'inverted-pyramid' ? tempStyle.size : 10)
        ),
        cylinder: {
          length: 20,
          topRadius: 10,
          bottomRadius: 0,
          material: tempStyle.color.withAlpha(0.98),
          outline: true,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 2,
        }
      })
      tempPinAllEntities.push(arrowEntity)
      
      // 座標情報を表示する別のエンティティ - 吹き出しスタイル
      tempPinLabelEntity = viewer.value.entities.add({
        position: Cesium.Cartesian3.fromDegrees(
          newPosition.longitude,
          newPosition.latitude,
          newPosition.height + 15 // 逆四角錐と同じ高さに配置
        ),
        label: {
          text: new Cesium.ConstantProperty(
            `📍 仮地点\n緯度: ${newPosition.latitude.toFixed(8)}°\n経度: ${newPosition.longitude.toFixed(8)}°\n高さ: ${newPosition.height.toFixed(3)}m`
          ),
          font: new Cesium.ConstantProperty('bold 14px sans-serif'),
          fillColor: Cesium.Color.DARKBLUE,
          outlineColor: Cesium.Color.WHITE,
          outlineWidth: 3,
          pixelOffset: new Cesium.Cartesian2(0, -140),
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
          backgroundColor: Cesium.Color.LIGHTYELLOW.withAlpha(0.98),
          backgroundPadding: new Cesium.ConstantProperty(new Cesium.Cartesian2(15, 10)),
          style: Cesium.LabelStyle.FILL_AND_OUTLINE,
          // 吹き出しの矢印効果を作成
          showBackground: true,
          // 角丸効果のためのスタイル
          scale: 1.0,
        }
      })
      
      console.log('仮地点アイコンの作成が完了しました')
    }
    
    // レンダリングを強制して変更を反映
    viewer.value.scene.requestRender()
  }
}

function updateCameraOrientation(newOrientation: { heading: number; pitch: number; roll: number }) {
  if (!viewer.value) return
  
  // ジンバルロック検出
  const pitchAbs = Math.abs(newOrientation.pitch)
  if (pitchAbs >= 85) {
    console.warn('⚠️ ジンバルロック検出: Pitchが±85度以上の場合、HeadingとRollの値が不安定になる可能性があります')
    console.log('Pitch:', newOrientation.pitch, 'Heading:', newOrientation.heading, 'Roll:', newOrientation.roll)
    
    if (newOrientation.pitch === 90) {
      console.log('→ Pitch = +90度: 真上を向く（ジンバルロック発生）')
    } else if (newOrientation.pitch === -90) {
      console.log('→ Pitch = -90度: 真下を向く（ジンバルロック発生）')
    } else if (newOrientation.pitch >= 85) {
      console.log('→ Pitch = +85度以上: ほぼ真上を向く（ジンバルロックの可能性）')
    } else if (newOrientation.pitch <= -85) {
      console.log('→ Pitch = -85度以下: ほぼ真下を向く（ジンバルロックの可能性）')
    }
  }
  
  cameraOrientation.heading = newOrientation.heading
  cameraOrientation.pitch = newOrientation.pitch
  cameraOrientation.roll = newOrientation.roll
  viewer.value.camera.setView({
    orientation: {
      heading: Cesium.Math.toRadians(newOrientation.heading),
      pitch: Cesium.Math.toRadians(newOrientation.pitch),
      roll: Cesium.Math.toRadians(newOrientation.roll)
    }
  })
}

function updateCameraZ(newZ: number) {
  if (!viewer.value) return
  
  // Z軸高度は表示のみで、実際のカメラ制御は行わない
  // 表示値のみ更新
  cameraPosition.z = newZ
  console.log('Z軸高度表示更新:', newZ)
}

function updateCameraHeight(newHeight: number) {
  if (!viewer.value) return
  
  console.log('=== カメラ高度変更開始 ===')
  console.log('変更前の海抜高度:', cameraCartographic.height, 'm')
  console.log('変更前のZ軸高度:', cameraPosition.z, 'm')
  
  // 現在のカメラ位置を取得
  const currentPosition = viewer.value.camera.position
  const currentCartographic = Cesium.Cartographic.fromCartesian(currentPosition)
  
  console.log('現在のカメラ位置 - 経度:', Cesium.Math.toDegrees(currentCartographic.longitude).toFixed(6), '°')
  console.log('現在のカメラ位置 - 緯度:', Cesium.Math.toDegrees(currentCartographic.latitude).toFixed(6), '°')
  console.log('現在のカメラ位置 - 高度:', currentCartographic.height.toFixed(2), 'm')
  
  // 新しい高度でカメラ位置を更新
  const newPosition = Cesium.Cartesian3.fromRadians(
    currentCartographic.longitude,
    currentCartographic.latitude,
    newHeight
  )
  
  console.log('新しい海抜高度:', newHeight, 'm')
  console.log('高度の変化量:', (newHeight - currentCartographic.height).toFixed(2), 'm')
  
  viewer.value.camera.setView({
    destination: newPosition,
    orientation: {
      heading: Cesium.Math.toRadians(cameraOrientation.heading),
      pitch: Cesium.Math.toRadians(cameraOrientation.pitch),
      roll: Cesium.Math.toRadians(cameraOrientation.roll)
    }
  })
  
  // 表示値を更新
  cameraCartographic.height = newHeight
  
  // Z軸高度も更新（地球中心からの距離）
  const newCartographic = Cesium.Cartographic.fromCartesian(newPosition)
  const earthRadius = Cesium.Ellipsoid.WGS84.maximumRadius
  const newZAxisHeight = earthRadius + newCartographic.height
  cameraPosition.z = newZAxisHeight
  
  console.log('地球半径:', earthRadius.toFixed(2), 'm')
  console.log('新しいZ軸高度:', newZAxisHeight.toFixed(2), 'm')
  console.log('Z軸高度の変化量:', (newZAxisHeight - (earthRadius + currentCartographic.height)).toFixed(2), 'm')
  console.log('=== カメラ高度変更完了 ===')
  console.log('最終的な海抜高度:', cameraCartographic.height, 'm')
  console.log('最終的なZ軸高度:', cameraPosition.z.toFixed(2), 'm')
  console.log('')
}

function updateAutoCenterOnPinPlacement(newValue: boolean) {
  autoCenterOnPinPlacement.value = newValue
}

function handleMapClick(click: any) {
  if (!viewer.value) return

  const target = click.originalEvent?.target
  if (target && target.tagName !== 'CANVAS') {
    console.log('クリック対象がcanvasではない')
    return
  }

  const pickedObject = viewer.value.scene.pick(click.position)
  if (pickedObject) {
    console.log('クリックされたオブジェクト:', pickedObject.id)
    console.log('仮地点エンティティ:', tempPinEntity)
    console.log('登録済みピンエンティティ数:', pinEntities.value.size)
    console.log('登録済みピン一覧:', Array.from(pinEntities.value.keys()))
    
    // 仮ピンがクリックされた場合
    if (pickedObject.id === tempPinEntity) {
      console.log('仮アイコンがクリックされました')
      // 吹き出しパネルを表示
      showPinPopup(
        { x: click.position.x, y: click.position.y },
        {
          latitude: pinPosition.value!.latitude,
          longitude: pinPosition.value!.longitude,
          height: pinPosition.value!.height
        },
        undefined // 仮ピンの場合はundefined
      )
      return
    }
    
    // 仮地点アイコンの子エンティティがクリックされた場合も処理
    if (pickedObject.id && pickedObject.id.description === '仮地点アイコン') {
      console.log('仮地点アイコンの子エンティティがクリックされました')
      showPinPopup(
        { x: click.position.x, y: click.position.y },
        {
          latitude: pinPosition.value!.latitude,
          longitude: pinPosition.value!.longitude,
          height: pinPosition.value!.height
        },
        undefined // 仮ピンの場合はundefined
      )
      return
    }
    
    // 仮地点アイコンのdescriptionプロパティをチェック
    if (pickedObject.id && typeof pickedObject.id.description === 'string' && pickedObject.id.description.includes('仮地点')) {
      console.log('仮地点アイコンのdescriptionが検出されました:', pickedObject.id.description)
      showPinPopup(
        { x: click.position.x, y: click.position.y },
        {
          latitude: pinPosition.value!.latitude,
          longitude: pinPosition.value!.longitude,
          height: pinPosition.value!.height
        },
        undefined // 仮ピンの場合はundefined
      )
      return
    }
    
    // 保存されたピンがクリックされた場合
    console.log('登録済みピンのクリック検出を試行中...')
    console.log('クリックされたエンティティのdescription:', pickedObject.id?.description)
    console.log('クリックされたエンティティのID:', pickedObject.id?.id)
    
    // 方法1: エンティティの直接比較
    const clickedPin = Array.from(pinEntities.value.entries()).find(
      ([_, entity]) => entity === pickedObject.id
    )
    
    // 方法2: ピンIDの直接比較（より確実）
    let pinId: string | null = null
    if (pickedObject.id && pickedObject.id.id) {
      pinId = pickedObject.id.id
    }
    
    if (clickedPin || pinId) {
      const targetPinId = clickedPin ? clickedPin[0] : pinId!
      console.log('登録済みピンがクリックされました:', targetPinId)
      const pin = savedPins.value.find(p => p.id === targetPinId)
      if (pin) {
        console.log('ピン情報:', pin)
        // 吹き出しパネルを表示
        showPinPopup(
          { x: click.position.x, y: click.position.y },
          {
            latitude: pin.latitude,
            longitude: pin.longitude,
            height: pin.height
          },
          pin // 完全なピン情報を渡す
        )
        console.log('登録済みピンの処理を完了し、returnします')
        return // 確実にreturnする
      } else {
        console.warn('ピンIDに対応するピン情報が見つかりません:', targetPinId)
      }
    } else {
      console.log('クリックされたエンティティは登録済みピンではありません')
      console.log('登録済みピンエンティティ:', Array.from(pinEntities.value.values()))
    }
  } else {
    console.log('クリックされたオブジェクトが見つかりませんでした')
  }

  // ここに到達するのは、ピン以外の場所をクリックした場合のみ
  console.log('ピン以外の場所をクリックしたため、仮ピンの位置を更新します')
  
  const pos = viewer.value.scene.pickPosition(click.position)
  if (!Cesium.defined(pos)) {
    console.warn('pickPositionで位置が取得できませんでした')
    return
  }

  const carto = Cesium.Cartographic.fromCartesian(pos)
  const lat = Cesium.Math.toDegrees(carto.latitude)
  const lon = Cesium.Math.toDegrees(carto.longitude)
  const height = carto.height

  const newPinPosition = { latitude: lat, longitude: lon, height }
  updatePinPosition(newPinPosition)
  
  // 仮アイコン配置時にカメラを中央に移動
  centerCameraOnPinPlacement(newPinPosition)
}

function updateCurrentTime() {
  if (!viewer.value) return
  const julian = viewer.value.clock.currentTime
  const date = Cesium.JulianDate.toDate(julian)
  currentTime.value = date.toLocaleString()
}

function toggleAnimation() {
  isAnimating.value = !isAnimating.value
  if (viewer.value) viewer.value.clock.shouldAnimate = isAnimating.value
}

function updateMultiplier(newMultiplier: number) {
  multiplier.value = newMultiplier
  if (viewer.value) viewer.value.clock.multiplier = newMultiplier
}

function jumpToDatetime(datetime: string) {
  if (!viewer.value || !datetime) return
  const date = new Date(datetime)
  const julian = Cesium.JulianDate.fromDate(date)
  viewer.value.clock.currentTime = julian
  viewer.value.clock.shouldAnimate = false
  isAnimating.value = false
  updateCurrentTime()
}

// 仮地点の画面座標を計算する関数
function calculateTempPinScreenPosition() {
  if (!viewer.value || !pinPosition.value) {
    tempPinScreenPosition.value = { x: 0, y: 0 }
    return
  }

  // 仮地点の3D座標を取得
  const pinCartesian = Cesium.Cartesian3.fromDegrees(
    pinPosition.value.longitude,
    pinPosition.value.latitude,
    pinPosition.value.height + 15 // 逆四角錐のとがった部分の位置
  )

  // 3D座標を画面座標に変換
  const screenPosition = Cesium.SceneTransforms.worldToWindowCoordinates(
    viewer.value.scene,
    pinCartesian
  )

  if (screenPosition) {
    tempPinScreenPosition.value = {
      x: Math.round(screenPosition.x),
      y: Math.round(screenPosition.y)
    }
  } else {
    tempPinScreenPosition.value = { x: 0, y: 0 }
  }
}

// 吹き出しパネルを表示
function showPinPopup(clickPosition: { x: number; y: number }, pinInfo: { latitude: number; longitude: number; height: number }, fullPinInfo?: SavedPin) {
  // パネルの位置を画面内に調整
  const panelWidth = 300
  const panelHeight = 200
  const margin = 20
  
  let x = clickPosition.x
  let y = clickPosition.y
  
  if (fullPinInfo) {
    // 登録済みピンの場合は右上に表示
    x = clickPosition.x + 20 // ピンの右側
    y = clickPosition.y - panelHeight - 20 // ピンの上側
  } else {
    // 仮ピンの場合は上に表示
    x = clickPosition.x
    y = clickPosition.y - panelHeight - 20 // ピンの上に表示
  }
  
  // 画面右端を超える場合は左に調整
  if (x + panelWidth > window.innerWidth - margin) {
    x = clickPosition.x - panelWidth - 20 // ピンの左側に表示
  }
  
  // 画面左端を超える場合は右に調整
  if (x < margin) {
    x = margin
  }
  
  // 画面上端を超える場合は下に表示
  if (y < margin) {
    y = clickPosition.y + 20
  }
  
  // 画面下端を超える場合は上に調整
  if (y + panelHeight > window.innerHeight - margin) {
    y = window.innerHeight - panelHeight - margin
  }
  
  pinPopupPosition.value = { x, y }
  // 登録済みピンの場合は完全な情報を、仮ピンの場合は基本情報のみを設定
  if (fullPinInfo) {
    pinPopupInfo.value = {
      latitude: fullPinInfo.latitude,
      longitude: fullPinInfo.longitude,
      height: fullPinInfo.height,
      name: fullPinInfo.name,
      category: fullPinInfo.category,
      description: fullPinInfo.description
    }
    console.log('登録済みピンのポップアップを表示:', fullPinInfo.name)
  } else {
    pinPopupInfo.value = {
      latitude: pinInfo.latitude,
      longitude: pinInfo.longitude,
      height: pinInfo.height,
      name: undefined,
      category: undefined,
      description: undefined
    }
    console.log('仮ピンのポップアップを表示')
  }
  
  console.log('showPinPopup: isPinPopupVisibleをtrueに設定します')
  isPinPopupVisible.value = true
  console.log('showPinPopup: isPinPopupVisible =', isPinPopupVisible.value)
}

// 吹き出しパネルを閉じる
function closePinPopup() {
  console.log('closePinPopup: isPinPopupVisibleをfalseに設定します')
  isPinPopupVisible.value = false
  console.log('closePinPopup: isPinPopupVisible =', isPinPopupVisible.value)
}

// ピン位置を編集
function editPinPosition(position: { latitude: number; longitude: number; height: number }) {
  updatePinPosition(position)
  closePinPopup()
}

// ドラッグ開始
function handlePinDragStart(event: any) {
  if (!viewer.value || !pinPosition.value) return
  
  // 仮地点アイコンがクリックされたかチェック
  const pickedObject = viewer.value.scene.pick(event.position)
  if (!pickedObject || pickedObject.id !== tempPinEntity) {
    return
  }
  
  isDraggingPin.value = true
  dragStartPosition.value = { x: event.position.x, y: event.position.y }
  originalPinPosition.value = { ...pinPosition.value }
  
  // カーソルを変更
  document.body.style.cursor = 'grabbing'
  
  console.log('仮地点のドラッグを開始しました')
}

onMounted(async () => {
  await nextTick()

  const container = document.getElementById('cesiumContainer')
  if (!container) return

  const waitForContainerSize = async () => {
    return new Promise<void>((resolve, reject) => {
      const maxRetries = 10
      let retries = 0

      const checkSize = () => {
        const width = container.clientWidth
        const height = container.clientHeight

        if (width > 0 && height > 0) {
          resolve()
        } else {
          retries++
          if (retries >= maxRetries) {
            reject('コンテナのサイズが無効です')
          } else {
            setTimeout(checkSize, 100)
          }
        }
      }

      checkSize()
    })
  }

  try {
    await waitForContainerSize()
    
    console.log('Cesium初期化開始')
    
    const terrain = await getTerrain(terrainType.value)
    viewer.value = createViewer('cesiumContainer', terrain, isAnimating.value, multiplier.value)

    // エラーハンドリングを追加
    viewer.value.scene.renderError.addEventListener((error: any) => {
      console.warn('Cesium render error:', error)
      // エラーが発生してもレンダリングを継続
      viewer.value?.scene.requestRender()
    })

    // Workerを無効化してDataCloneErrorを回避
    viewer.value.scene.globe.enableLighting = false
    viewer.value.scene.fog.enabled = false
    viewer.value.scene.skyAtmosphere.show = false
    viewer.value.scene.globe.showGroundAtmosphere = false
    viewer.value.shadowMap.enabled = false
    
    // レンダリングモードを調整
    viewer.value.scene.requestRenderMode = true
    viewer.value.scene.maximumRenderTimeChange = Infinity

    viewer.value.scene.globe.preloadSiblings = true
    viewer.value.scene.globe.depthTestAgainstTerrain = false
    
    // Worker関連の追加設定
    viewer.value.scene.globe.enableLighting = false
    viewer.value.scene.globe.showGroundAtmosphere = false
    viewer.value.scene.fog.enabled = false
    viewer.value.scene.skyAtmosphere.show = false
    viewer.value.shadowMap.enabled = false
    
    // レンダリングパフォーマンスの最適化
    viewer.value.scene.globe.maximumScreenSpaceError = 2.0
    viewer.value.scene.globe.tileCacheSize = 1000

    applyOptimization(viewer.value, optimizeEnabled.value)

    // 国土地理院の標準地図レイヤーを追加
    const gsiLayer = viewer.value.imageryLayers.addImageryProvider(
      new Cesium.UrlTemplateImageryProvider({
        url: 'https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png',
        maximumLevel: 18,
        credit: '地理院タイル',
      })
    )

    gsiLayer.alpha = 0.5

    viewer.value.screenSpaceEventHandler.setInputAction(handleMapClick, Cesium.ScreenSpaceEventType.LEFT_CLICK)

    // ドラッグイベントを設定
    viewer.value.screenSpaceEventHandler.setInputAction(handlePinDragStart, Cesium.ScreenSpaceEventType.LEFT_DOWN)

    // 初期位置（富士山付近）
    const baseLon = 138.7274
    const baseLat = 35.3606

    const terrainProvider = viewer.value.terrainProvider
    const positions = [Cesium.Cartographic.fromDegrees(baseLon, baseLat)]
    const updatedPositions = await getHeightFromTerrainProvider(terrainProvider, positions)

    const surfaceHeight = updatedPositions[0]?.height ?? 0
    const cameraOffset = 2000

    viewer.value.scene.requestRender()

    await flyToCameraPositionAndSyncUI(viewer.value, {
      longitude: baseLon,
      latitude: baseLat,
      height: surfaceHeight + cameraOffset,
      heading: 0,
      pitch: -60,
      roll: 0,
    })

    pinPosition.value = {
      latitude: baseLat,
      longitude: baseLon,
      height: surfaceHeight,
    }

    updatePinPosition(pinPosition.value)

    clockUpdateInterval = setInterval(() => {
      updateCurrentTime()
      updateCameraInfo()
      calculateTempPinScreenPosition() // 仮地点の画面座標を更新
    }, 500)

    updateCurrentTime()
    window.addEventListener('resize', () => viewer.value?.resize())

    viewer.value.scene.camera.moveEnd.addEventListener(() => {
      if (!viewerReady.value) {
        viewerReady.value = true
      }
      // カメラ移動終了時にアイコンサイズを更新
      updatePinIconSize()
    })

    // カメラ移動中にもアイコンサイズを更新（スムーズな変化のため）
    viewer.value.scene.camera.moveStart.addEventListener(() => {
      // 移動開始時の処理（必要に応じて）
    })

    viewer.value.scene.camera.changed.addEventListener(() => {
      // カメラ変更時にアイコンサイズを更新
      updatePinIconSize()
    })

    // 保存されたピンを読み込んで表示
    loadPinsFromStorage()
    
    console.log('Cesium初期化完了')
  } catch (err) {
    console.error('Cesium初期化エラー:', err)
    // エラーが発生してもアプリケーションを継続
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', () => viewer.value?.resize())
  if (clockUpdateInterval) clearInterval(clockUpdateInterval)
})

watch(terrainType, async (type) => {
  if (!viewer.value) return
  const newTerrain = await getTerrain(type)
  viewer.value.terrainProvider = newTerrain
})

watch(optimizeEnabled, (enabled) => {
  if (viewer.value) applyOptimization(viewer.value, enabled)
})

watch([selectedAltitude, customAltitude], () => {
  if (!viewer.value || !pinPosition.value) return

  const height = selectedAltitude.value === 'custom'
    ? customAltitude.value ?? 0
    : Number(selectedAltitude.value)

  flyToCameraPositionAndSyncUI(viewer.value, {
    longitude: pinPosition.value.longitude,
    latitude: pinPosition.value.latitude,
    height: pinPosition.value.height + height,
    heading: cameraOrientation.heading,
    pitch: cameraOrientation.pitch,
    roll: cameraOrientation.roll,
  })
})

// カテゴリ変更時、デフォルトスタイルを適用
watch(() => newPinData.category, (cat) => {
  const defaultStyle = categoryDefaultStyle[cat] || 'basic-sphere-blue'
  newPinData.styleId = defaultStyle
})

function updatePinCategory(pinId: string, newCategory: string) {
  // 既存のエンティティを削除
  const existingEntity = pinEntities.value.get(pinId)
  if (existingEntity && viewer.value) {
    viewer.value.entities.remove(existingEntity)
    pinEntities.value.delete(pinId)
  }

  // ピンデータを更新
  const pin = savedPins.value.find(p => p.id === pinId)
  if (pin) {
    pin.category = newCategory
    const mapped = categoryToStyleMap.value[newCategory] || categoryDefaultStyle[newCategory]
    pin.styleId = mapped || pin.styleId
    // 新しいカテゴリでマップにピンを再追加
    addPinToMap(pin)
    // ローカルストレージに保存
    savePinsToStorage()
  }
}

// スタイル更新API（UIから呼び出せるように定義のみ）
function updatePinStyle(pinId: string, newStyleId: string) {
  // 既存のエンティティを削除
  const existingEntity = pinEntities.value.get(pinId)
  if (existingEntity && viewer.value) {
    viewer.value.entities.remove(existingEntity)
    pinEntities.value.delete(pinId)
  }

  // ピンデータを更新
  const pin = savedPins.value.find(p => p.id === pinId)
  if (pin) {
    pin.styleId = newStyleId
    addPinToMap(pin)
    savePinsToStorage()
  }
}

// 仮アイコン配置時にカメラを中央に移動する関数
function centerCameraOnPinPlacement(pinPosition: { latitude: number; longitude: number; height: number }) {
  // ポップアップが開いている場合は処理をスキップ
  if (isPinPopupVisible.value) {
    console.log('ポップアップが開いているため、カメラ移動をスキップします')
    return
  }
  
  if (!autoCenterOnPinPlacement.value || !viewer.value) return

  // ターゲットの3D座標を取得
  const targetCartesian = Cesium.Cartesian3.fromDegrees(
    pinPosition.longitude,
    pinPosition.latitude,
    pinPosition.height
  )

  // 現在のカメラの向きと高度を維持
  const currentOrientation = {
    heading: viewer.value.camera.heading,
    pitch: viewer.value.camera.pitch,
    roll: viewer.value.camera.roll
  }

  // 現在のカメラの高度を維持
  const currentHeight = cameraCartographic.height

  // カメラの向きベクトル（カメラから見る方向）を取得
  const cameraDirection = viewer.value.camera.direction

  // ターゲットから現在のカメラ高度分だけ離れた位置にカメラを配置
  // カメラの向きベクトルの逆方向に移動
  const offsetCartesian = Cesium.Cartesian3.multiplyByScalar(
    cameraDirection,
    -currentHeight,
    new Cesium.Cartesian3()
  )

  const newCameraPosition = Cesium.Cartesian3.add(
    targetCartesian,
    offsetCartesian,
    new Cesium.Cartesian3()
  )

  viewer.value.camera.flyTo({
    destination: newCameraPosition,
    orientation: currentOrientation,
    duration: 1.0
  })
}

function addCurrentPin() {
  if (!pinPosition.value) {
    alert('現在のピン位置がありません。地図上をクリックしてピンを配置してください。')
    return
  }

  // モーダルフォームを表示
  showPinRegistrationModal()
}

// デバッグ用：isPinPopupVisibleの値の変化を追跡
watch(isPinPopupVisible, (newValue, oldValue) => {
  console.log('isPinPopupVisible changed:', oldValue, '->', newValue)
})

// アイコン設定パネル
function showIconSettings() { isIconSettingsVisible.value = true }
function hideIconSettings() { isIconSettingsVisible.value = false }
function applyIconSettings(payload: { categoryToStyle: Record<string, string>; tempStyleId: string }) {
  categoryToStyleMap.value = { ...categoryDefaultStyle, ...payload.categoryToStyle }
  selectedTempPinStyleId.value = payload.tempStyleId
  // 既存ピン再描画
  if (viewer.value) {
    pinEntities.value.forEach((entity, pinId) => viewer.value!.entities.remove(entity))
    pinEntities.value.clear()
    savedPins.value.forEach(p => addPinToMap(p))

    // 仮ピンも即時に新スタイルへ更新
    if (tempPinAllEntities.length > 0) {
      tempPinAllEntities.forEach(e => viewer.value!.entities.remove(e))
      tempPinAllEntities = []
    }
    if (tempPinLabelEntity) {
      viewer.value!.entities.remove(tempPinLabelEntity)
      tempPinLabelEntity = null
    }
    if (tempPinEntity) {
      viewer.value!.entities.remove(tempPinEntity)
      tempPinEntity = null
    }
    if (pinPosition.value) {
      updatePinPosition(pinPosition.value)
    }
  }
  // 設定は即時保存
  try {
    localStorage.setItem('pinCategoryToStyle', JSON.stringify(categoryToStyleMap.value))
    localStorage.setItem('tempPinStyleId', selectedTempPinStyleId.value)
  } catch (e) {
    console.warn('設定保存に失敗:', e)
  }
}
</script>

<style scoped>
.container {
  width: 100%;
  height: 100vh;
  position: relative;
}

.map-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.cesium-map {
  width: 100%;
  height: 100%;
}

.help-overlay {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  pointer-events: none;
}

.help-content {
  background-color: rgba(0, 0, 0, 0.8);
  color: #ffffcc;
  padding: 12px 16px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.3;
  max-width: 280px;
  box-shadow: 0 0 10px 3px rgba(255, 255, 150, 0.3);
  border: 1px solid rgba(255, 255, 150, 0.5);
}

.help-content strong {
  color: #fffacd;
}

/* モーダルスタイル */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 10001;
}

.modal-content {
  background: white;
  border-radius: 8px;
  padding: 0;
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #444;
  background-color: #333;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  color: #fff;
  font-size: 18px;
}

.modal-header .close-button {
  background: none;
  border: none;
  color: #ccc;
  font-size: 24px;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.modal-header .close-button:hover {
  background-color: #555;
  color: #fff;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #fff;
  font-weight: 500;
  font-size: 14px;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #555;
  border-radius: 6px;
  background-color: #1a1a1a;
  color: #fff;
  font-size: 14px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #4a9eff;
  box-shadow: 0 0 0 2px rgba(74, 158, 255, 0.2);
}

.form-input::placeholder {
  color: #888;
}

textarea.form-input {
  resize: vertical;
  min-height: 80px;
}

.position-info {
  background-color: #1a1a1a;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #555;
  font-family: monospace;
  font-size: 13px;
  color: #ccc;
}

.position-info div {
  margin-bottom: 4px;
}

.position-info div:last-child {
  margin-bottom: 0;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid #444;
  background-color: #333;
  border-radius: 0 0 12px 12px;
}

.cancel-button {
  padding: 10px 20px;
  border: 1px solid #666;
  border-radius: 6px;
  background-color: transparent;
  color: #ccc;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.cancel-button:hover {
  background-color: #555;
  color: #fff;
}

.submit-button {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  background-color: #4a9eff;
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.submit-button:hover {
  background-color: #3a8eef;
}

.submit-button:disabled {
  background-color: #555;
  cursor: not-allowed;
}

/* 住所情報のスタイル */
.address-info {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 12px;
  margin-top: 4px;
}

.loading-address {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6c757d;
  font-style: italic;
}

.loading-spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.address-details {
  color: #495057;
}

.address-line {
  font-weight: bold;
  margin-bottom: 4px;
  color: #212529;
}

.address-breakdown {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 0.9em;
}

.postal-code {
  color: #6c757d;
  font-family: monospace;
}

.prefecture, .city, .district {
  color: #495057;
}

.no-address {
  color: #dc3545;
  font-style: italic;
}

.address-error {
  color: #dc3545;
}

.error-title {
  font-weight: bold;
  margin-bottom: 8px;
  color: #dc3545;
}

.error-code {
  font-family: monospace;
  font-size: 0.9em;
  margin-bottom: 4px;
  color: #6c757d;
}

.error-message {
  margin-bottom: 8px;
  color: #dc3545;
}

.error-details {
  margin-top: 8px;
}

.error-details details {
  font-size: 0.8em;
}

.error-details summary {
  cursor: pointer;
  color: #6c757d;
  margin-bottom: 4px;
}

.error-details summary:hover {
  color: #495057;
}

.error-details pre {
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 8px;
  margin: 4px 0;
  font-size: 0.75em;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>