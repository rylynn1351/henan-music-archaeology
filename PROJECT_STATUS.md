# 项目当前状态

## 1. 状态快照

- **当前版本：** 贾湖骨笛数字展示 Demo v0.2
- **检查日期：** 2026-07-23
- **正式交接目录：** `D:\learing\competence\大创赛--音乐考古\henan-music-archaeology`
- **当前分支：** `codex/handoff-baseline`
- **远程仓库：** 无
- **页面入口：** `/`
- **包管理器：** npm
- **Node.js：** v24.15.0，符合项目声明的 `>=22.13.0`
- **内容审核状态：** 现有页面仍显示“待专业成员审核”

## 2. 当前可以运行的功能

- 贾湖骨笛单件文物档案；
- 参考图片、基本资料、时间线、来源和更新时间；
- 程序生成的 Three.js 3D 演示模型；
- 3D 旋转、缩放、自动旋转和复位；
- 浏览器生成的数字合成演示音频；
- 本地规则问答和推荐问题；
- Demo、模型和声音性质说明；
- 响应式 CSS 和减少动画样式。

以上来自源码检查、成功构建、服务端渲染测试和本地 HTTP 冒烟测试。

## 3. 当前无法确认

- 现有考古内容是否已经完成逐条专业审核；
- 当前图片来源与实际 JPG 文件是否已经完成最终版权核对；
- 3D 在低端手机、关闭硬件加速和部分微信 WebView 中是否稳定；
- 音频是否能在所有目标手机浏览器正常播放；
- 375px 和 1440px 的最终视觉效果是否没有溢出或遮挡；
- 微信内置浏览器的触控、音频和 3D 兼容性；
- 现有公开演示地址在国内不同运营商网络中的稳定性；
- 计划中的多文物、真实 GLB、模型热点、AI 讲解、纪念卡、AIGC 视频和小程序功能尚未实现。

## 4. 实际运行结果

| 检查 | 命令 | 结果 |
| --- | --- | --- |
| 安装依赖 | `npm.cmd ci` | 成功，按锁文件安装 514 个包 |
| Cloudflare 类型依赖 | `npm.cmd install --save-dev --save-exact @cloudflare/workers-types@4.20260515.1` | 成功，只增加 1 个官方开发依赖 |
| 类型检查 | `npm.cmd run typecheck` | 成功，0 个错误 |
| Lint | `npm.cmd run lint` | 失败，1 个错误、1 个警告 |
| 构建 | `npm.cmd run build` | 成功 |
| 现有测试 | `npm.cmd test` | 成功，2 项通过、0 项失败 |
| 本地启动 | `npm.cmd run start -- --host 127.0.0.1 --port 4173` | 成功，首页 HTTP 200，包含 Demo 标题 |

原类型检查错误：

- `db/index.ts(1,21)`：找不到 `cloudflare:workers` 模块或类型声明；
- `worker/index.ts(6,11)`：找不到 `Fetcher`；
- `worker/index.ts(7,7)`：找不到 `D1Database`。

根本原因与修改方式：

- 现有 Wrangler 仅把 `@cloudflare/workers-types` 列为可选 peer dependency，项目实际没有安装或加载 Cloudflare Worker 官方类型；
- 增加与当前 Wrangler 兼容的精确版本 `@cloudflare/workers-types@4.20260515.1`；
- 在 `tsconfig.json` 中显式加载 Node 和 Cloudflare Worker 类型；
- 新增 `worker/env.d.ts`，只声明项目现有的可选 D1 `DB` 绑定；
- 在 `package.json` 中增加 `typecheck` 脚本：`tsc --noEmit --incremental false`；
- 未使用 `any`、`@ts-ignore`、`@ts-nocheck`，未关闭 `strict`，未排除 Worker 目录，也未修改 Worker 运行时代码。

Lint 问题：

- `HeritageDemo.tsx` 在 effect 内同步设置音频 URL，触发 `react-hooks/set-state-in-effect`；
- `ArtifactDetail.tsx` 使用普通 `<img>`，触发性能警告。

其他安装和构建提示：

- `npm.cmd ci` 报告 17 项依赖安全告警，其中 11 项为 high；本轮没有自动执行可能升级依赖的 `npm audit fix`；
- 构建提示客户端存在大于 500 kB 的代码块；
- Vinext 暂时不能完全静态判断根路由类型。

## 5. 已知问题

### 严重

当前没有发现已经确认的密钥泄露、无法构建或数据破坏问题。

### 高

1. `npm.cmd run lint` 仍因音频 URL effect 内同步设置 state 而失败；本轮按任务边界只记录，未修改页面代码。
2. 现有专业内容仍待团队审核，正式公开前不能自行改成已审核。
3. 3D 初始化没有错误捕获和静态图片降级，部分设备可能出现空白区域。
4. 国内稳定部署方案、正式域名和网络验收尚未确定。
5. 依赖安装报告多项 high 安全告警，需要单独分析直接影响，不能直接使用强制升级处理。

### 中

6. `HeritageDemo.tsx` 同时负责页面、3D、音频和问答，职责较多。
7. 首屏数字、部分展示文字、3D 几何和合成音高仍有硬编码。
8. `Artifact` 的模型和声音字段不能完整记录真实文件 URL、热点、授权和来源。
9. 页面底部来源区遍历全局来源，增加第二件文物后可能显示无关资料。
10. 测试没有覆盖真实 3D、音频、问答交互、375px、1440px 和微信环境。
11. Three.js 跟随整个客户端页面加载，首屏资源偏大。

### 低

12. README、空数据库和 D1 示例仍有 starter 模板痕迹。
13. 图片没有显式宽高，可能出现布局偏移。
14. 3D 清理没有显式释放全部端部和音孔几何体。

## 6. 缺少资料

- 现有专业陈述的最终审核人、审核结论和审核时间；
- 正式文物清单和第二件文物完整资料；
- 图片、模型、音频和视频授权凭证；
- 真实 GLB 的比例、朝向和热点资料；
- 专业声音文件及其准确分类；
- AI 讲解的审核资料、标准问答和引用规则；
- 正式视觉规范、版权主体和隐私文本；
- 国内域名、部署平台、备案和小程序主体资料。

## 7. 最近修改内容

- 增加 Cloudflare Worker 官方类型开发依赖；
- 将 Node 和 Cloudflare Worker 类型接入现有 TypeScript 配置；
- 增加项目 D1 `DB` 绑定的环境类型声明；
- 增加固定的 `npm.cmd run typecheck` 命令；
- 类型检查、构建和 2 项现有测试均通过；
- Lint 仍有 1 个原有错误和 1 个原有警告，本轮没有扩大范围处理；
- 没有修改功能代码、页面表现或考古资料。

## 8. 下一项推荐开发任务

下一轮只做“修复现有 Lint 检查基线”：

- 在不改变音频行为的前提下，解决 `HeritageDemo.tsx` 的 `react-hooks/set-state-in-effect` 错误；
- 判断 `ArtifactDetail.tsx` 的普通 `<img>` 警告是否需要本阶段处理，避免为了消除警告引入新的托管耦合；
- 重新运行 typecheck、lint、构建和现有测试；
- 不修改考古资料，也不进行页面重构。

完成后再单独处理 3D 初始化失败时的静态图片降级。
