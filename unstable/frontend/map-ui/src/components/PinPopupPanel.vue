<template>
  <div
    v-if="isVisible"
    class="pin-popup-overlay"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
    ref="popupRef"
  >
    <!-- デバッグ情報（一時的） -->
    <div style="position: absolute; top: -30px; left: 0; background: red; color: white; padding: 2px; font-size: 10px;">
      DEBUG: isVisible={{ isVisible }}, x={{ position.x }}, y={{ position.y }}
    </div>
    
    <!-- 吹き出しの矢印部分 -->
    <div class="popup-arrow" :class="{ 'arrow-left': pinInfo.name, 'arrow-top': !pinInfo.name }"></div>
    
    <!-- 吹き出しの内容 -->
    <div class="popup-content">
      <div class="popup-header">
        <h3>📍 ピン情報</h3>
        <button class="close-button" @click="closePopup">×</button>
      </div>
      
      <div class="popup-body">
        <!-- 登録済みピンの情報表示 -->
        <div v-if="pinInfo.name" class="pin-info-section">
          <div class="info-row">
            <span class="label">名前:</span>
            <span class="value">{{ pinInfo.name }}</span>
          </div>
          <div v-if="pinInfo.category" class="info-row">
            <span class="label">カテゴリ:</span>
            <span class="value">{{ pinInfo.category }}</span>
          </div>
          <div v-if="pinInfo.description" class="info-row">
            <span class="label">説明:</span>
            <span class="value description">{{ pinInfo.description }}</span>
          </div>
        </div>
        
        <div class="info-row">
          <span class="label">緯度:</span>
          <span class="value">{{ pinInfo.latitude.toFixed(6) }}</span>
        </div>
        <div class="info-row">
          <span class="label">経度:</span>
          <span class="value">{{ pinInfo.longitude.toFixed(6) }}</span>
        </div>
        <div class="info-row">
          <span class="label">高さ:</span>
          <span class="value">{{ pinInfo.height.toFixed(2) }} m</span>
        </div>
        
        <!-- 住所情報の表示（仮ピンの場合のみ） -->
        <div v-if="addressInfo && !pinInfo.name" class="address-section">
          <div class="address-header">
            <span class="source-badge" :class="addressSource === 'gsi' ? 'gsi-badge' : 'nominatim-badge'">
              {{ addressSource === 'gsi' ? 'GSI' : 'OSM' }}
            </span>
            <span class="address-title">住所情報</span>
          </div>
          <div class="info-row">
            <span class="label">住所:</span>
            <span class="value address">{{ addressInfo.address }}</span>
          </div>
          <div class="info-row">
            <span class="label">都道府県:</span>
            <span class="value">{{ addressInfo.prefecture }}</span>
          </div>
          <div class="info-row">
            <span class="label">市区町村:</span>
            <span class="value">{{ addressInfo.city }}</span>
          </div>
          <div class="info-row">
            <span class="label">地区:</span>
            <span class="value">{{ addressInfo.district }}</span>
          </div>
          <div v-if="addressInfo.postalCode" class="info-row">
            <span class="label">郵便番号:</span>
            <span class="value">{{ addressInfo.postalCode }}</span>
          </div>

          <!-- 地図サービスへのリンク -->
          <div class="map-links">
            <a :href="googleMapsUrl" target="_blank" rel="noopener" class="map-link-btn google">Googleマップ</a>
            <a :href="googleEarthUrl" target="_blank" rel="noopener" class="map-link-btn earth">Google Earth</a>
            <a :href="gsiMapsUrl" target="_blank" rel="noopener" class="map-link-btn gsi">国土地理院地図</a>
          </div>
        </div>
        
        <!-- ローディング表示（仮ピンの場合のみ） -->
        <div v-if="isLoadingAddress && !pinInfo.name" class="loading-section">
          <div class="loading-spinner"></div>
          <span class="loading-text">住所情報を取得中...</span>
        </div>
        
        <!-- エラー表示（仮ピンの場合のみ） -->
        <div v-if="addressError && !pinInfo.name" class="error-section">
          <div class="error-message">
            <span class="error-icon">⚠️</span>
            <span class="error-text">{{ addressError }}</span>
          </div>
          
          <!-- トラブルシューティング情報 -->
          <div class="troubleshooting-info">
            <details>
              <summary class="troubleshooting-summary">🔧 トラブルシューティング</summary>
              <div class="troubleshooting-content">
                <p><strong>考えられる原因:</strong></p>
                <ul>
                  <li>ネットワーク接続の問題</li>
                  <li>CORS設定の制限</li>
                  <li>APIサーバーの一時的な障害</li>
                  <li>座標が日本国外の場合</li>
                </ul>
                <p><strong>対処法:</strong></p>
                <ul>
                  <li>ネットワーク接続を確認</li>
                  <li>しばらく時間をおいて再試行</li>
                  <li>別の座標で試行</li>
                  <li>開発者ツールのコンソールで詳細を確認</li>
                </ul>
              </div>
            </details>
          </div>
          
          <button @click="retryAddressFetch" class="retry-btn">
            🔄 再試行
          </button>
        </div>
        
        <div class="action-buttons">
          <button @click="jumpToPosition" class="action-btn jump-btn">
            🎯 ジャンプ
          </button>
          <button @click="editPosition" class="action-btn edit-btn">
            ✏️ 編集
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue'
import { getAddressFromCoordinates } from '@/utils/cesiumUtils'

interface PinInfo {
  latitude: number
  longitude: number
  height: number
  name?: string
  category?: string
  description?: string
}

interface AddressInfo {
  address: string
  prefecture: string
  city: string
  district: string
  postalCode?: string
}

const props = defineProps<{
  isVisible: boolean
  position: { x: number; y: number }
  pinInfo: PinInfo
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'jump-to-position', position: PinInfo): void
  (e: 'edit-position', position: PinInfo): void
}>()

const popupRef = ref<HTMLElement>()
const addressInfo = ref<AddressInfo | null>(null)
const isLoadingAddress = ref(false)
const addressError = ref<string | null>(null)
const addressSource = ref<'gsi' | 'nominatim' | null>(null)

// 住所情報を取得する関数
async function fetchAddressInfo() {
  if (!props.pinInfo) return
  
  isLoadingAddress.value = true
  addressError.value = null
  addressSource.value = null
  
  try {
    console.log('住所情報取得開始:', props.pinInfo)
    const address = await getAddressFromCoordinates(props.pinInfo.latitude, props.pinInfo.longitude)
    addressInfo.value = address
    // 国土地理院APIが成功した場合は'si'、フォールバックでNominatimが使用された場合は'nominatim'
    addressSource.value = 'gsi' // 現在は国土地理院APIが優先されているため
    console.log('住所情報取得成功:', address)
  } catch (error) {
    console.error('住所情報取得エラー:', error)
    addressError.value = error instanceof Error ? error.message : '不明なエラーが発生しました'
  } finally {
    isLoadingAddress.value = false
  }
}

// 再試行ボタンの処理
function retryAddressFetch() {
  fetchAddressInfo()
}

// ポップアップが表示されたときに住所情報を取得
watch(() => props.isVisible, (newVisible) => {
  if (newVisible && props.pinInfo) {
    console.log('PinPopupPanel: ポップアップが表示されました')
    console.log('PinPopupPanel: isVisible =', props.isVisible)
    console.log('PinPopupPanel: position =', props.position)
    console.log('PinPopupPanel: pinInfo =', props.pinInfo)
    console.log('PinPopupPanel: pinInfo.name =', props.pinInfo.name)
    
    // ポップアップが表示されたときにクリックイベントリスナーを追加
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100) // 少し遅延させて、ピンクリックイベントが処理されるのを待つ
    
    // 仮ピンの場合のみ住所情報を取得（登録済みピンは既に住所情報を持っているため）
    if (!props.pinInfo.name) {
      console.log('仮ピンのため住所情報を取得します')
      fetchAddressInfo()
    } else {
      console.log('登録済みピンのため住所情報の取得をスキップします:', props.pinInfo.name)
    }
  } else if (!newVisible) {
    // ポップアップが非表示になったときにイベントリスナーを削除
    document.removeEventListener('click', handleClickOutside)
  }
})

function closePopup() {
  emit('close')
}

function jumpToPosition() {
  emit('jump-to-position', props.pinInfo)
}

function editPosition() {
  emit('edit-position', props.pinInfo)
}

// クリックイベントの処理（ポップアップ外をクリックしたら閉じる）
function handleClickOutside(event: MouseEvent) {
  console.log('handleClickOutside called, target:', event.target)
  if (popupRef.value && !popupRef.value.contains(event.target as Node)) {
    console.log('ポップアップ外をクリックしたため、ポップアップを閉じます')
    closePopup()
  }
}

onMounted(() => {
  // イベントリスナーはwatchで管理するため、ここでは何もしない
})

onBeforeUnmount(() => {
  // イベントリスナーを削除
  document.removeEventListener('click', handleClickOutside)
})

// 地図サービスへのリンク
const googleMapsUrl = computed(() =>
  `https://www.google.com/maps?q=${props.pinInfo.latitude},${props.pinInfo.longitude}`
)
const googleEarthUrl = computed(() =>
  `https://earth.google.com/web/@${props.pinInfo.latitude},${props.pinInfo.longitude},100a,35y,0h,0t,0r`
)
const gsiMapsUrl = computed(() =>
  `https://maps.gsi.go.jp/#16/${props.pinInfo.latitude}/${props.pinInfo.longitude}/`
)
</script>

<style scoped>
.pin-popup-overlay {
  position: fixed;
  z-index: 10003;
  pointer-events: auto;
  user-select: none;
}

.popup-content {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 2px solid #007bff;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 123, 255, 0.3);
  min-width: 280px;
  max-width: 350px;
  backdrop-filter: blur(10px);
}

.popup-arrow {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #007bff;
}

.popup-arrow.arrow-left {
  top: 50%;
  left: -10px;
  transform: translateY(-50%);
  border-left: 10px solid #007bff;
  border-right: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-top: 10px solid transparent;
}

.popup-arrow.arrow-top {
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 10px solid #007bff;
  border-top: 10px solid transparent;
}

.popup-arrow::after {
  content: '';
  position: absolute;
  top: 2px;
  left: -8px;
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #ffffff;
}

.popup-arrow.arrow-left::after {
  top: -8px;
  left: 2px;
  border-left: 8px solid #ffffff;
  border-right: 8px solid transparent;
  border-bottom: 8px solid transparent;
  border-top: 8px solid transparent;
}

.popup-arrow.arrow-top::after {
  top: 2px;
  left: -8px;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-bottom: 8px solid #ffffff;
  border-top: 8px solid transparent;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px 8px 16px;
  border-bottom: 1px solid #e9ecef;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  color: white;
  border-radius: 10px 10px 0 0;
}

.popup-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  color: white;
  font-size: 20px;
  font-weight: bold;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-button:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.popup-body {
  padding: 16px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f1f3f4;
}

.info-row:last-of-type {
  border-bottom: none;
  margin-bottom: 16px;
}

.label {
  font-weight: 600;
  color: #495057;
  font-size: 14px;
}

.value {
  font-family: 'Courier New', monospace;
  color: #212529;
  font-size: 14px;
  background-color: #f8f9fa;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.value.address {
  max-width: 200px;
  white-space: normal;
  word-break: break-all;
}

.value.description {
  max-width: 200px;
  white-space: normal;
  word-break: break-all;
  line-height: 1.3;
}

/* 住所情報セクション */
.address-section {
  margin: 12px 0;
  padding: 12px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #28a745;
}

.address-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 4px;
  border-bottom: 1px solid #e9ecef;
}

.source-badge {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  color: white;
}

.gsi-badge {
  background-color: #007bff;
}

.nominatim-badge {
  background-color: #28a745;
}

.address-title {
  font-size: 12px;
  font-weight: 600;
  color: #495057;
}

/* ローディングセクション */
.loading-section {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0;
  padding: 12px;
  background-color: #fff3cd;
  border-radius: 8px;
  border-left: 4px solid #ffc107;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffc107;
  border-top: 2px solid transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-text {
  color: #856404;
  font-size: 14px;
  font-weight: 500;
}

/* エラーセクション */
.error-section {
  margin: 12px 0;
  padding: 12px;
  background-color: #f8d7da;
  border-radius: 8px;
  border-left: 4px solid #dc3545;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}

.error-icon {
  font-size: 16px;
  flex-shrink: 0;
}

.error-text {
  color: #721c24;
  font-size: 13px;
  line-height: 1.4;
  word-break: break-word;
}

.retry-btn {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.retry-btn:hover {
  background: linear-gradient(135deg, #c82333 0%, #bd2130 100%);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
}

/* トラブルシューティング情報 */
.troubleshooting-info {
  margin: 8px 0;
}

.troubleshooting-summary {
  color: #721c24;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 0;
  border-bottom: 1px solid rgba(220, 53, 69, 0.3);
}

.troubleshooting-summary:hover {
  color: #dc3545;
}

.troubleshooting-content {
  margin-top: 8px;
  padding: 8px;
  background-color: rgba(220, 53, 69, 0.05);
  border-radius: 4px;
  font-size: 11px;
  line-height: 1.4;
}

.troubleshooting-content p {
  margin: 4px 0;
  color: #721c24;
}

.troubleshooting-content ul {
  margin: 4px 0;
  padding-left: 16px;
  color: #721c24;
}

.troubleshooting-content li {
  margin: 2px 0;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.jump-btn {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.jump-btn:hover {
  background: linear-gradient(135deg, #218838 0%, #1ea085 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.edit-btn {
  background: linear-gradient(135deg, #ffc107 0%, #fd7e14 100%);
  color: white;
}

.edit-btn:hover {
  background: linear-gradient(135deg, #e0a800 0%, #e8590c 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
}

/* アニメーション効果 */
.pin-popup-overlay {
  animation: popupFadeIn 0.3s ease-out;
}

@keyframes popupFadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.map-links {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.map-link-btn {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  color: white;
  transition: background 0.2s;
}
.map-link-btn.google {
  background: #4285f4;
}
.map-link-btn.google:hover {
  background: #3367d6;
}
.map-link-btn.earth {
  background: #34a853;
}
.map-link-btn.earth:hover {
  background: #258a3e;
}
.map-link-btn.gsi {
  background: #007bff;
}
.map-link-btn.gsi:hover {
  background: #0056b3;
}

/* 登録済みピン情報セクション */
.pin-info-section {
  margin: 12px 0;
  padding: 12px;
  background-color: #e3f2fd;
  border-radius: 8px;
  border-left: 4px solid #2196f3;
}
</style> 