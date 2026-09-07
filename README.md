# Petal Garden · florr.io 二次创作

可直接在浏览器游玩的非官方单机游戏。参考原版游客界面；16种花瓣、15种生物与玩家头像全部使用官方 Wiki 图片。图鉴背景只在加载时去除，缓存透明显示表面；源文件保留原始字节。

## 启动

```sh
npm install
npm run dev -- --host 0.0.0.0
```

打开服务器输出的网址。`npm test`执行游戏回归测试；`npm run typecheck`检查类型；`npm run build`构建部署版本。

## 可玩内容

- 游客大厅、冒险本地存档；以4 Basic + 1 Rose开始。
- 鼠标/WASD/方向键移动；Space/左键进攻，Shift/右键防御。
- 16种花瓣、9阶稀有度、耐久/独立子瓣/重载、碰撞互伤、护甲、毒、恢复、导弹、豌豆弹。
- 背包搜索/稀有度过滤/拖放和点击装备、主备双排、数字键换槽、R整排互换。
- 5合1、失败退回余量、吸收获得经验、3种天赋、5–10槽位。
- 花园/沙漠/海洋三片本地模拟区域，15种生物、掉落拾取、稀有度分区、世界地图、死亡/复活。
- 设置、音效、缩放、操作帮助；本地自动存档。

## 数据边界

本作品不是原版客户端，不连接原版服务器。未实现多人联机、原版完整世界、全部花瓣/生物/天赋、商店、全部事件或完整官方数值。Wiki公开数值已采用并保留来源；公开资料有冲突时以`public/SOURCES.md`注明的值为准。移动、地图、掉率、刷新、经验曲线与部分技能是本地模拟，不声称服务器一比一一致。

- `lib/game-data.ts`：Wiki基础值和隔离的模拟参数。
- `lib/game-engine.ts`：可独立测试的状态与战斗。
- `lib/game-renderer.ts`、`lib/sprite-loader.ts`：画布渲染。
- `app/page.tsx`：交互UI、持久化、输入。
- `public/SOURCES.md`、`public/ASSETS.json`：来源、冲突、素材原始URL与hash。
- `evidence`：基线、差异、验证和入口页回滚。回滚只恢复脚手架入口，保留游戏代码供继续开发。

## 性能与界面优化

- 地形一次绘制后复用缓存块；文字、源素材预解码并缓存。
- 主React树移除每90ms整树刷新，生命条/冷却独立更新；无变化不写存档。
- 缓存花瓣数值、限制显示粒子数量、后台页面暂停更新。
- 统一HUD缩放、手机版面板/装备栏防重叠；玩家使用Wiki原图，40px世界直径，不加自创表情。
- 删除自创免费装备练习、发现图鉴、冗余状态/大厅标语/重复控制。旧练习存档不清除，但不再提供入口。
- `node scripts/benchmark.mjs .`用于可重复的绘制指令数/引擎计算基准，不等同于实际GPU帧率。

Debug: Settings → Debug mode stocks each of the 16 implemented Super petals to at least 500; Restock replenishes used inventory. Switching off retains granted items. Mobs use shortest-arc, time-based steering and acceleration.

## GitHub Pages

仓库：`nahc2o4/nahc2o4.github.io`。公开发布后的地址为 `https://nahc2o4.github.io/`。

使用 Node.js 22.16 或更新的 22.x 版本，运行 `npm ci`、`npm run build:pages`、`node scripts/verify-pages.mjs`。静态产物位于 `dist/client`，无需 Worker 或服务器。

推送到 `main` 会自动运行测试、静态构建并发布 GitHub Pages；私有仓库阶段只构建，不公开部署。首次发布时需在仓库 Settings → Pages 中选择 GitHub Actions。

在 GitHub 工作副本中修改后执行：

```sh
git add .
git commit -m "Update game"
git push origin main
```

从原 Sites 工作目录同步最新源码，可运行 `node scripts/sync-github.mjs ../florr.io-github`，然后在 GitHub 工作副本审阅、提交并推送。同步只复制源文件白名单，不包含旧 Git 历史、私有部署配置、凭据、日志或验证副本；不会自动删除目标中的额外文件。

GitHub Pages 和原 Sites 地址各自保存浏览器本地进度，不会自动同步存档。
