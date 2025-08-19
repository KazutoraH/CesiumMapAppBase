<template>
  <div class="icon-settings-overlay" v-if="isVisible" @click.self="close">
    <div class="icon-settings-modal">
      <div class="modal-header">
        <h3>🎨 アイコン設定</h3>
        <button class="close-button" @click="close">×</button>
      </div>

      <div class="modal-body">
        <div class="section">
          <div class="section-title">登録ピン（カテゴリ別デフォルト）</div>
          <div class="grid">
            <div v-for="cat in categories" :key="cat.value" class="grid-row">
              <div class="grid-label">{{ cat.label }}</div>
              <select class="grid-select" v-model="localCategoryToStyle[cat.value]">
                <option v-for="style in allStyles" :key="style.id" :value="style.id">
                  {{ style.label }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">仮ピン（配置時の見た目）</div>
          <select class="single-select" v-model="localTempStyleId">
            <option v-for="style in allTempStyles" :key="style.id" :value="style.id">
              {{ style.label }}
            </option>
          </select>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn cancel" @click="close">キャンセル</button>
        <button class="btn save" @click="save">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { pinStyles, categoryDefaultStyle } from '../config/pinStyles'
import { tempPinStyles } from '../config/tempPinStyles'

const props = defineProps<{
  isVisible: boolean
  categoryToStyle: Record<string, string>
  tempStyleId: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', payload: { categoryToStyle: Record<string, string>; tempStyleId: string }): void
}>()

const categories = [
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
  { value: 'other', label: 'その他' },
]

const allStyles = computed(() => Object.values(pinStyles))
const allTempStyles = computed(() => Object.values(tempPinStyles))

const localCategoryToStyle = reactive<Record<string, string>>({ ...categoryDefaultStyle, ...props.categoryToStyle })
const localTempStyleId = ref<string>(props.tempStyleId)

watch(() => props.isVisible, (v) => {
  if (v) {
    Object.assign(localCategoryToStyle, { ...categoryDefaultStyle, ...props.categoryToStyle })
    localTempStyleId.value = props.tempStyleId
  }
})

// 親の値変更を常にローカルに反映
watch(() => props.tempStyleId, (v) => {
  localTempStyleId.value = v
})

watch(() => props.categoryToStyle, (v) => {
  Object.assign(localCategoryToStyle, { ...categoryDefaultStyle, ...v })
}, { deep: false })

function shallowEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  for (const k of ak) {
    if (a[k] !== b[k]) return false
  }
  return true
}

function close() {
  // 変更がある場合は自動保存してから閉じる
  const incoming = { ...props.categoryToStyle }
  const current = { ...localCategoryToStyle }
  const changedMap = !shallowEqual(incoming, current)
  const changedTemp = props.tempStyleId !== localTempStyleId.value
  if (changedMap || changedTemp) {
    emit('save', { categoryToStyle: current, tempStyleId: localTempStyleId.value })
  }
  emit('close')
}

function save() {
  emit('save', { categoryToStyle: { ...localCategoryToStyle }, tempStyleId: localTempStyleId.value })
  emit('close')
}
</script>

<style scoped>
.icon-settings-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10005;
}
.icon-settings-modal {
  background: #111;
  color: #fff;
  width: 560px;
  max-width: 92vw;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.6);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  border-bottom: 1px solid #333;
}
.modal-header h3 { margin: 0; font-size: 16px; }
.close-button {
  background: none; border: none; color: #ccc; font-size: 20px; cursor: pointer;
}
.modal-body { padding: 16px; }
.section { margin-bottom: 16px; }
.section-title { font-weight: 700; margin-bottom: 8px; color: #ffd54f; }
.grid { display: grid; grid-template-columns: 1fr; gap: 8px; }
.grid-row { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; align-items: center; }
.grid-label { color: #ddd; }
.grid-select, .single-select {
  background: #1e1e1e; color: #fff; border: 1px solid #555; border-radius: 6px; padding: 8px;
}
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 12px 16px; border-top: 1px solid #333; }
.btn { padding: 8px 12px; border-radius: 6px; border: 1px solid #555; cursor: pointer; }
.btn.cancel { background: #222; color: #ccc; }
.btn.save { background: #2962ff; color: #fff; border-color: #2962ff; }
</style>

