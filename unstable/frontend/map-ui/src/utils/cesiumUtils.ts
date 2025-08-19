import * as Cesium from 'cesium'

export async function getTerrain(type: string): Promise<Cesium.TerrainProvider> {
  if (type === 'none') {
    return new Cesium.EllipsoidTerrainProvider()
  }

  try {
    const terrainProvider = await Cesium.CesiumTerrainProvider.fromIonAssetId(1)
    console.log('✅ Cesium World Terrain loaded successfully')
    return terrainProvider
  } catch (error) {
    console.error('❌ Failed to load Cesium World Terrain:', error)
    return new Cesium.EllipsoidTerrainProvider() // fallback
  }
}

export function applyOptimization(viewer: Cesium.Viewer, enable: boolean) {
  const scene = viewer.scene
  scene.requestRenderMode = enable
  scene.maximumRenderTimeChange = enable ? Infinity : 0.0
  scene.globe.enableLighting = !enable
  scene.fog.enabled = !enable
  scene.skyAtmosphere.show = !enable
  scene.globe.showGroundAtmosphere = !enable
  viewer.shadowMap.enabled = !enable
}

export async function getHeightFromTerrainProvider(
  provider: Cesium.TerrainProvider,
  positions: Cesium.Cartographic[]
): Promise<Cesium.Cartographic[]> {
  const terrainProvider = await getTerrain('ion')
  return await getHeightOrDefault(terrainProvider, positions)
}

export async function getHeightOrDefault(
  provider: Cesium.TerrainProvider,
  positions: Cesium.Cartographic[],
  level = 10
): Promise<Cesium.Cartographic[]> {
  if (!provider || (!provider.availability && typeof provider.getTileDataAvailable !== 'function')) {
    console.warn('Provider does not support terrain sampling. Using ellipsoid height 0.')
    return positions.map(pos => {
      pos.height = 0
      return pos
    })
  }

  try {
    return await Cesium.sampleTerrain(provider, level, positions)
  } catch (e) {
    console.warn('sampleTerrain failed, fallback to ellipsoid height 0.', e)
    return positions.map(pos => {
      pos.height = 0
      return pos
    })
  }
}

export async function getHeights(
  provider: Cesium.TerrainProvider,
  positions: Cesium.Cartographic[]
): Promise<Cesium.Cartographic[]> {
  if (provider instanceof Cesium.EllipsoidTerrainProvider) {
    return positions.map(p => {
      p.height = 0
      return p
    })
  }

  if (provider.availability) {
    return await Cesium.sampleTerrainMostDetailed(provider, positions)
  } else {
    const level = 10
    return await Cesium.sampleTerrain(provider, level, positions)
  }
}

export function createViewer(
  containerId: string,
  terrain: Cesium.TerrainProvider,
  isAnimating: boolean,
  multiplier: number
): Cesium.Viewer {
  // CesiumのWorkerを無効化（ただしBASE_URLは設定しない）
  ;(window as any).CESIUM_DISABLE_WORKERS = true
  
  // リソース読み込みエラーを防ぐための設定
  Cesium.RequestScheduler.requestsByServer = {}
  
  const viewer = new Cesium.Viewer(containerId, {
    terrainProvider: terrain,
    shouldAnimate: false,
    baseLayerPicker: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
    targetFrameRate: 60,
    // レンダリング関連の設定
    scene3DOnly: true,
    selectionIndicator: false,
    infoBox: false,
    homeButton: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    geocoder: false,
  })

  viewer.clock.shouldAnimate = isAnimating
  viewer.clock.multiplier = multiplier

  // Worker関連の設定を無効化
  viewer.scene.globe.enableLighting = false
  viewer.scene.fog.enabled = false
  viewer.scene.skyAtmosphere.show = false
  viewer.scene.globe.showGroundAtmosphere = false
  viewer.shadowMap.enabled = false

  // デフォルトの画像プロバイダーを無効化（リソース読み込みエラーを防ぐ）
  viewer.scene.globe.show = true
  viewer.scene.globe.showGroundAtmosphere = false

  return viewer
}

export function flyToCameraPositionAndSyncUI(
  viewer: Cesium.Viewer,
  {
    longitude,
    latitude,
    height,
    heading,
    pitch,
    roll,
    duration = 1.5,
  }: {
    longitude: number
    latitude: number
    height: number
    heading: number
    pitch: number
    roll: number
    duration?: number
  }
): Promise<void> {
  return new Promise((resolve, reject) => {
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: Cesium.Math.toRadians(roll),
      },
      duration,
      complete: () => {
        console.log('flyTo complete: camera moved')
        resolve()
      },
      cancel: () => {
        console.warn('flyTo canceled')
        reject(new Error('flyTo canceled'))
      },
    })
  })
}

export function putCrossMark(
  viewer: Cesium.Viewer,
  pinPosition: { longitude: number; latitude: number; height: number }
) {
  const crossLength = 20
  const crossColor = Cesium.Color.YELLOW

  const centerCartesian = Cesium.Cartesian3.fromDegrees(
    pinPosition.longitude,
    pinPosition.latitude,
    pinPosition.height + 5
  )

  const enuTransform = Cesium.Transforms.eastNorthUpToFixedFrame(centerCartesian)

  const localCrossPoints = [
    new Cesium.Cartesian3(-crossLength / 2, 0, 0),
    new Cesium.Cartesian3(crossLength / 2, 0, 0),
    new Cesium.Cartesian3(0, -crossLength / 2, 0),
    new Cesium.Cartesian3(0, crossLength / 2, 0),
  ]

  const globalCrossPoints = localCrossPoints.map(local =>
    Cesium.Matrix4.multiplyByPoint(enuTransform, local, new Cesium.Cartesian3())
  )

  viewer.entities.add({
    polyline: {
      positions: [globalCrossPoints[0], globalCrossPoints[1]],
      width: 2,
      material: crossColor,
      clampToGround: false,
    },
  })
  viewer.entities.add({
    polyline: {
      positions: [globalCrossPoints[2], globalCrossPoints[3]],
      width: 2,
      material: crossColor,
      clampToGround: false,
    },
  })
}

// OpenStreetMapのNominatim APIから住所情報を取得（代替手段）
async function getAddressFromNominatim(latitude: number, longitude: number): Promise<{
  address: string
  prefecture: string
  city: string
  district: string
  postalCode?: string
} | null> {
  try {
    // 開発環境ではViteのプロキシを使用
    const isDev = import.meta.env.DEV
    const baseUrl = isDev 
      ? `/api/nominatim/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
      : `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    
    console.log('Nominatim API URL:', baseUrl)
    
    const response = await fetch(baseUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MapUI/1.0 (https://example.com; contact@example.com)',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Nominatim API応答:', data)
    
    if (data.display_name) {
      const address = data.display_name
      const addressParts = data.address || {}
      
      return {
        address: address,
        prefecture: addressParts.state || addressParts.prefecture || '',
        city: addressParts.city || addressParts.town || addressParts.village || '',
        district: addressParts.suburb || addressParts.neighbourhood || '',
        postalCode: addressParts.postcode || undefined
      }
    } else {
      throw new Error('住所情報が見つかりませんでした')
    }
    
  } catch (error) {
    console.warn('Nominatim API呼び出しエラー:', error)
    throw error
  }
}

// 国土地理院の逆ジオコーディングAPIから住所情報を取得
export async function getAddressFromCoordinates(latitude: number, longitude: number): Promise<{
  address: string
  prefecture: string
  city: string
  district: string
  postalCode?: string
} | null> {
  // まず国土地理院のAPIを試行
  try {
    // 開発環境ではViteのプロキシを使用
    const isDev = import.meta.env.DEV
    const baseUrl = isDev 
      ? `/api/gsi/reverse-geocoder/LonLatToAddress?lat=${latitude}&lon=${longitude}`
      : `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${latitude}&lon=${longitude}`
    
    // CORSエラーを回避するためのプロキシサーバー経由でのアクセス（本番環境用）
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(baseUrl)}`
    
    console.log('住所情報取得URL:', baseUrl)
    console.log('プロキシURL:', proxyUrl)
    console.log('リクエスト座標:', { latitude, longitude })
    console.log('開発環境:', isDev)
    
    // 開発環境では直接アクセス、本番環境ではプロキシ経由
    let response: Response
    if (isDev) {
      // 開発環境：Viteのプロキシ経由
      try {
        response = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        })
        console.log('開発環境プロキシ経由アクセス成功')
      } catch (devError) {
        console.error('開発環境プロキシ経由アクセス失敗:', devError)
        throw devError
      }
    } else {
      // 本番環境：まず直接アクセスを試行
      try {
        response = await fetch(baseUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          mode: 'cors',
        })
        console.log('直接アクセス成功')
      } catch (directError) {
        console.warn('直接アクセス失敗、プロキシ経由で試行:', directError)
        
        // 直接アクセスが失敗した場合、プロキシ経由で試行
        response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        })
        console.log('プロキシ経由アクセス成功')
      }
    }
    
    console.log('API応答ステータス:', response.status, response.statusText)
    console.log('API応答ヘッダー:', Object.fromEntries(response.headers.entries()))
    
    // レスポンスの詳細を確認
    const responseText = await response.text()
    console.log('API応答本文:', responseText)
    
    if (!response.ok) {
      console.error('API応答エラー:', responseText)
      throw new Error(`HTTP ${response.status}: ${response.statusText} - ${responseText}`)
    }
    
    // JSONとして解析
    let data
    try {
      data = JSON.parse(responseText)
    } catch (parseError: unknown) {
      const errorMessage = parseError instanceof Error ? parseError.message : '不明なエラー'
      console.error('JSON解析エラー:', parseError)
      throw new Error(`JSON解析エラー: ${errorMessage} - レスポンス: ${responseText}`)
    }
    
    console.log('API応答データ:', data)
    
    // 国土地理院APIのレスポンス形式に対応
    if (data.results) {
      const result = data.results
      
      // 自治体コードから都道府県と市区町村を取得
      const muniCd = result.muniCd || ''
      let prefecture = ''
      let city = ''
      
      // 自治体コードの例: 19202 (静岡県富士宮市)
      if (muniCd.length >= 5) {
        const prefCode = muniCd.substring(0, 2)
        // 都道府県コードのマッピング（主要なもの）
        const prefMap: { [key: string]: string } = {
          '01': '北海道', '02': '青森県', '03': '岩手県', '04': '宮城県', '05': '秋田県',
          '06': '山形県', '07': '福島県', '08': '茨城県', '09': '栃木県', '10': '群馬県',
          '11': '埼玉県', '12': '千葉県', '13': '東京都', '14': '神奈川県', '15': '新潟県',
          '16': '富山県', '17': '石川県', '18': '福井県', '19': '山梨県', '20': '長野県',
          '21': '岐阜県', '22': '静岡県', '23': '愛知県', '24': '三重県', '25': '滋賀県',
          '26': '京都府', '27': '大阪府', '28': '兵庫県', '29': '奈良県', '30': '和歌山県',
          '31': '鳥取県', '32': '島根県', '33': '岡山県', '34': '広島県', '35': '山口県',
          '36': '徳島県', '37': '香川県', '38': '愛媛県', '39': '高知県', '40': '福岡県',
          '41': '佐賀県', '42': '長崎県', '43': '熊本県', '44': '大分県', '45': '宮崎県',
          '46': '鹿児島県', '47': '沖縄県'
        }
        prefecture = prefMap[prefCode] || ''
        
        // 自治体コードから市区町村名を取得（主要なもの）
        const cityMap: { [key: string]: string } = {
          '19202': '富士宮市', // 静岡県富士宮市
          '13100': '千代田区', '13101': '中央区', '13102': '港区', '13103': '新宿区', '13104': '文京区',
          '13105': '台東区', '13106': '墨田区', '13107': '江東区', '13108': '品川区', '13109': '目黒区',
          '13110': '大田区', '13111': '世田谷区', '13112': '渋谷区', '13113': '中野区', '13114': '杉並区',
          '13115': '豊島区', '13116': '北区', '13117': '荒川区', '13118': '板橋区', '13119': '練馬区',
          '13120': '足立区', '13121': '葛飾区', '13122': '江戸川区', '13201': '八王子市', '13202': '立川市',
          '13203': '武蔵野市', '13204': '三鷹市', '13205': '青梅市', '13206': '府中市', '13207': '昭島市',
          '13208': '調布市', '13209': '町田市', '13210': '小金井市', '13211': '小平市', '13212': '日野市',
          '13213': '東村山市', '13214': '国分寺市', '13215': '国立市', '13218': '福生市', '13219': '狛江市',
          '13220': '東大和市', '13221': '清瀬市', '13222': '東久留米市', '13223': '武蔵村山市', '13224': '多摩市',
          '13225': '稲城市', '13227': '羽村市', '13228': 'あきる野市', '13229': '西東京市', '13303': '瑞穂町',
          '13305': '日の出町', '13307': '檜原村', '13308': '奥多摩町', '13361': '大島町', '13362': '利島村',
          '13363': '新島村', '13364': '神津島村', '13381': '三宅村', '13382': '御蔵島村', '13401': '八丈町',
          '13402': '青ヶ島村', '13421': '小笠原村'
        }
        city = cityMap[muniCd] || ''
      }
      
      // 住所の構築
      const lv01Nm = result.lv01Nm || ''
      const address = [prefecture, city, lv01Nm].filter(Boolean).join(' ')
      
      console.log('国土地理院API住所情報構築:', {
        muniCd,
        prefecture,
        city,
        lv01Nm,
        address
      })
      
      return {
        address: address || '住所情報が不完全です',
        prefecture: prefecture,
        city: city,
        district: lv01Nm || '',
        postalCode: undefined
      }
    } else {
      console.warn('住所情報が見つかりませんでした:', data)
      throw new Error('住所情報が見つかりませんでした')
    }
    
  } catch (gsiError) {
    console.warn('国土地理院API失敗、Nominatim APIを試行:', gsiError)
    
    // 国土地理院のAPIが失敗した場合、Nominatim APIを試行
    try {
      return await getAddressFromNominatim(latitude, longitude)
    } catch (nominatimError) {
      console.warn('Nominatim APIも失敗:', nominatimError)
      
      // 両方のAPIが失敗した場合の詳細なエラー情報
      if (gsiError instanceof TypeError && gsiError.message.includes('fetch')) {
        throw new Error(`ネットワークエラー: ${gsiError.message} - CORS設定またはネットワーク接続を確認してください`)
      } else if (gsiError instanceof Error) {
        throw new Error(`API呼び出しエラー: ${gsiError.message}`)
      } else {
        throw new Error(`不明なエラー: ${JSON.stringify(gsiError)}`)
      }
    }
  }
}

// 住所情報を整形する関数
export function formatAddress(addressInfo: {
  address: string
  prefecture: string
  city: string
  district: string
  postalCode?: string
}): string {
  const parts = []
  
  if (addressInfo.postalCode) {
    parts.push(`〒${addressInfo.postalCode}`)
  }
  
  if (addressInfo.prefecture) {
    parts.push(addressInfo.prefecture)
  }
  
  if (addressInfo.city) {
    parts.push(addressInfo.city)
  }
  
  if (addressInfo.district) {
    parts.push(addressInfo.district)
  }
  
  return parts.join(' ')
} 