FROM python:3.10-slim-bookworm

# 必要なパッケージをインストール（GDAL 3.x）
RUN apt-get update && apt-get install -y \
    lsb-release \
    curl \
    build-essential \
    cmake \
    gcc \
    g++ \
    git \
    make \
    libgeos-dev \
    libproj-dev \
    libspatialindex-dev \
    libboost-all-dev \
    gdal-bin \
    libgdal-dev \
    libglib2.0-0 && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# GDALのバージョン確認
RUN gdalinfo --version

# libgdal の場所を確認（任意）
RUN echo "Searching for libgdal..." && find / -name "libgdal.so*" || true

# GDAL のヘッダーを使うための環境変数
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# 🔧 libgdal の共有ライブラリパスを LD_LIBRARY_PATH に追加（重要）
ENV LD_LIBRARY_PATH=/usr/lib/x86_64-linux-gnu:$LD_LIBRARY_PATH

# Pythonパッケージのインストール
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir numpy

# Python用GDALパッケージを明示的にインストール（gdal-configのバージョンに合わせる）
RUN pip install --no-cache-dir gdal==$(gdal-config --version)

# 作業ディレクトリ
WORKDIR /app

# cesium-terrain-builder をクローン
RUN git clone https://github.com/geo-data/cesium-terrain-builder.git /app/cesium-terrain-builder

# Python依存パッケージ（アプリ側）
COPY requirements_unstable.txt .
RUN pip install --no-cache-dir -r requirements_unstable.txt

# cesium-terrain-builder のビルド
RUN BUILD_LOG=/tmp/ctb_build.log && \
    echo "=== Starting CTB build at $(date) ===" | tee $BUILD_LOG && \
    cd /app/cesium-terrain-builder && \
    mkdir build && cd build && \
    cmake .. 2>&1 | tee -a $BUILD_LOG && \
    make -j"$(nproc)" 2>&1 | tee -a $BUILD_LOG && \
    make install 2>&1 | tee -a $BUILD_LOG && \
    echo "=== CTB build complete ===" | tee -a $BUILD_LOG && \
    rm -rf /tmp/ctb

# Flask アプリを配置
COPY geoapp /app/geoapp
COPY run.py /app/run.py

ENV FLASK_APP=run.py

# Flask サーバを起動
CMD ["flask", "run", "--host=0.0.0.0", "--port=5000"]
