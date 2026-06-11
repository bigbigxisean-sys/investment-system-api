# 投资管理系统后端 - 部署配置文件
# 支持: Render.com / Railway.app / Fly.io

## 方式一：Render.com (推荐，免费)
# 1. 登录 https://render.com
# 2. 点击 "New +" → "Web Service"
# 3. 连接此 GitHub 仓库
# 4. 设置:
#    - Name: investment-system-api
#    - Environment: Node
#    - Build Command: npm install
#    - Start Command: node server.js
#    - Plan: Free

## 方式二：Railway.app (中国访问快)
# 1. 登录 https://railway.app
# 2. 点击 "New Project" → "Deploy from GitHub repo"
# 3. 连接此仓库
# 4. 自动部署

## 方式三：Fly.io
# flyctl launch
# flyctl deploy
