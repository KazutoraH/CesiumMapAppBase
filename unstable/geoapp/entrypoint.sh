#!/bin/sh

echo "----- Startup Env Info -----" > /tmp/envinfo.log
date >> /tmp/envinfo.log
env >> /tmp/envinfo.log
python --version >> /tmp/envinfo.log
pip list >> /tmp/envinfo.log

exec "$@"  # 元のコマンド実行（flask run など）
