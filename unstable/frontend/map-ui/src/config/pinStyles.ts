import * as Cesium from 'cesium'

export type PinGeometryType = 'ellipsoid' | 'point' | 'cylinder' | 'billboard'

export interface PinStyle {
	/** 一意のID */
	id: string
	/** UI表示名 */
	label: string
	/** 形状タイプ */
	geometry: PinGeometryType
	/** 基準サイズ（ピクセル or メートル換算用） */
	size: number
	/** 主色 */
	color: Cesium.Color
	/** 輪郭色（必要に応じて） */
	outlineColor?: Cesium.Color
	/** billboard用の画像URL（任意） */
	billboardImageUrl?: string
	/** ラベル設定（任意） */
	label?: {
		icon?: string
		fontSize?: number
		backgroundColor?: Cesium.Color
		pixelOffsetY?: number
		textTemplate?: string // 例: "{icon} {name}"
	}
}

export const pinStyles: Record<string, PinStyle> = {
	'basic-sphere-blue': {
		id: 'basic-sphere-blue',
		label: '基本: 球/青',
		geometry: 'ellipsoid',
		size: 12,
		color: Cesium.Color.BLUE,
		outlineColor: Cesium.Color.WHITE,
		label: {
			icon: '📍',
			fontSize: 14,
			backgroundColor: Cesium.Color.BLUE.withAlpha(0.9),
			pixelOffsetY: -22,
			textTemplate: '{icon} {name}'
		}
	},
	'mountain-peak': {
		id: 'mountain-peak',
		label: '山: 球/褐色',
		geometry: 'ellipsoid',
		size: 14,
		color: Cesium.Color.BROWN,
		outlineColor: Cesium.Color.WHITE,
		label: {
			icon: '⛰️',
			fontSize: 14,
			backgroundColor: Cesium.Color.BROWN.withAlpha(0.9),
			pixelOffsetY: -24,
			textTemplate: '{icon} {name}'
		}
	},
	'shinto-shrine': {
		id: 'shinto-shrine',
		label: '神社: 球/赤',
		geometry: 'ellipsoid',
		size: 14,
		color: Cesium.Color.RED,
		outlineColor: Cesium.Color.WHITE,
		label: {
			icon: '⛩️',
			fontSize: 14,
			backgroundColor: Cesium.Color.RED.withAlpha(0.9),
			pixelOffsetY: -24,
			textTemplate: '{icon} {name}'
		}
	},
	'poi-restaurant': {
		id: 'poi-restaurant',
		label: 'レストラン',
		geometry: 'ellipsoid',
		size: 12,
		color: Cesium.Color.ORANGE,
		outlineColor: Cesium.Color.WHITE,
		label: {
			icon: '🍽️',
			fontSize: 14,
			backgroundColor: Cesium.Color.ORANGE.withAlpha(0.9),
			pixelOffsetY: -22,
			textTemplate: '{icon} {name}'
		}
	},
	'poi-park': {
		id: 'poi-park',
		label: '公園/自然',
		geometry: 'ellipsoid',
		size: 12,
		color: Cesium.Color.LIME,
		outlineColor: Cesium.Color.WHITE,
		label: {
			icon: '🌳',
			fontSize: 14,
			backgroundColor: Cesium.Color.LIME.withAlpha(0.9),
			pixelOffsetY: -22,
			textTemplate: '{icon} {name}'
		}
	},
	'point-yellow': {
		id: 'point-yellow',
		label: 'ポイント/黄',
		geometry: 'point',
		size: 10,
		color: Cesium.Color.YELLOW,
		outlineColor: Cesium.Color.BLACK,
		label: {
			icon: '•',
			fontSize: 12,
			backgroundColor: Cesium.Color.YELLOW.withAlpha(0.9),
			pixelOffsetY: -18,
			textTemplate: '{name}'
		}
	},
	'cylinder-red': {
		id: 'cylinder-red',
		label: '円錐/赤',
		geometry: 'cylinder',
		size: 12,
		color: Cesium.Color.RED,
		outlineColor: Cesium.Color.WHITE,
		label: {
			icon: '▲',
			fontSize: 12,
			backgroundColor: Cesium.Color.RED.withAlpha(0.9),
			pixelOffsetY: -26,
			textTemplate: '{name}'
		}
	}
}

export const categoryDefaultStyle: Record<string, string> = {
	landmark: 'basic-sphere-blue',
	restaurant: 'poi-restaurant',
	hotel: 'basic-sphere-blue',
	shopping: 'basic-sphere-blue',
	transport: 'basic-sphere-blue',
	park: 'poi-park',
	culture: 'basic-sphere-blue',
	business: 'basic-sphere-blue',
	residential: 'basic-sphere-blue',
	other: 'basic-sphere-blue',
	mountain: 'mountain-peak',
	shrine: 'shinto-shrine',
}


