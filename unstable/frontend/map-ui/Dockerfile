# Node.js環境を作ってビルドする（Vite開発用）
FROM node:20

# 作業ディレクトリを作成
WORKDIR /app

# package.jsonとlockファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm install


# 🔧 cesium パッケージを明示的にインストール
RUN npm install cesium --save

# vite-plugin-cesium を追加インストール（明示的に）
RUN npm install vite-plugin-cesium --save-dev

# アプリ全体をコピー
COPY . .

# SSL証明書をコピー(開発用のため、実際の証明書は使用しないこと）
COPY ./localhost.key ./localhost.key
COPY ./localhost.crt ./localhost.crt

# サーバ起動 (vite dev serverを立ち上げる場合)
CMD ["npm", "run", "dev", "--", "--host"]
