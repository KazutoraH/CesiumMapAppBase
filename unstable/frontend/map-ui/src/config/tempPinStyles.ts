import * as Cesium from 'cesium'

export type TempPinGeometry = 'inverted-pyramid' | 'point' | 'ellipsoid'

export interface TempPinStyle {
	id: string
	label: string
	geometry: TempPinGeometry
	color: Cesium.Color
	size: number
	outlineColor?: Cesium.Color
}

export const tempPinStyles: Record<string, TempPinStyle> = {
	'temp-inverted-pyramid': {
		id: 'temp-inverted-pyramid',
		label: '逆四角錐（赤）',
		geometry: 'inverted-pyramid',
		color: Cesium.Color.RED,
		size: 15,
		outlineColor: Cesium.Color.WHITE
	},
	'temp-point-yellow': {
		id: 'temp-point-yellow',
		label: 'ポイント（黄）',
		geometry: 'point',
		color: Cesium.Color.YELLOW,
		size: 18,
		outlineColor: Cesium.Color.BLACK
	},
	'temp-ellipsoid-cyan': {
		id: 'temp-ellipsoid-cyan',
		label: '球体（シアン）',
		geometry: 'ellipsoid',
		color: Cesium.Color.CYAN,
		size: 12,
		outlineColor: Cesium.Color.WHITE
	}
}


