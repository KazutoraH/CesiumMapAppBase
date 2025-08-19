import os
import subprocess

def run_terrain_builder():
    input_dir = "/app/data/elevation"     # 入力DEMフォルダ
    output_dir = "/app/data/terrain"      # 出力地形タイルフォルダ
    bounds = [135.0, 34.0, 135.1, 34.1]    # xmin, ymin, xmax, ymax（例）

    cmd = [
        "ctb-tile",                        # ctb-tile コマンド
        "--input", os.path.join(input_dir, "dem.tif"),  # 入力GeoTIFFファイル
        "--output-dir", output_dir,
        "--bounds", *map(str, bounds),
        "--output-format", "terrain",     # Cesium形式で出力
        "--profile", "geodetic"
    ]

    print("実行コマンド:", " ".join(cmd))
    subprocess.run(cmd, check=True)

if __name__ == "__main__":
    run_terrain_builder()
