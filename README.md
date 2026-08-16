# 河南音乐考古数字展示网站

“豫音焕新声”是河南音乐考古资源数字展示项目。当前版本提供文物总览、通用详情页、程序化 3D 演示、数字合成音频和本地规则问答。

当前公开内容仍是概念验证 Demo。考古事实、图片、模型、音频和视频必须经过团队审核与授权后才能作为正式资料发布。

## 开始开发

环境要求：Node.js `>=22.13.0`，使用 npm 和仓库现有的 `package-lock.json`。

```powershell
npm.cmd ci
npm.cmd run dev
```

常用质量检查：

```powershell
npm.cmd run verify
```

`verify` 会依次执行 lint、类型检查、文物资料预检、生产构建和全部自动测试；`npm test` 也会先执行 `artifact:check`。GitHub Actions 在 Node.js 22 环境中执行同一套门禁。

构建完成后可在 Windows 上启动本地生产预览：

```powershell
npm.cmd run start
```

## 目录说明

- `app/`：页面、组件、文物数据和本地问答逻辑。
- `app/artifact-records/`：一件文物一个数据文件；`index.ts` 是统一注册表，`template.ts` 是新文物模板。
- `public/`：网站当前实际使用的公开图片与图标。
- `worker/`：Cloudflare Worker 服务入口和环境类型。
- `tests/`：服务端渲染、数据、路由、降级和生产资源测试。
- `.openai/hosting.json`：Sites 项目标识与资源绑定声明。
- `build/`：Sites 构建产物整理逻辑。
- `db/`、`drizzle/`、`examples/d1/`：为后续可能使用的 D1 数据库能力保留的框架，当前产品未启用。
- `app/chatgpt-auth.ts`：为后续可能使用的身份能力保留的辅助框架，当前页面未调用。

## 开发边界

- 先阅读 `AGENTS.md`、`PROJECT_CONTEXT.md` 和 `PROJECT_STATUS.md`。
- 每次只完成一个可独立测试、验收和回退的小任务。
- 不自行补写或推断考古学内容。
- 程序模型、合成声音和 AIGC 内容必须明确标注性质。
- 不在前端、Git 或文档中保存密钥、令牌和个人隐私信息。

详细需求、架构和阶段安排分别见 `SOFTWARE_REQUIREMENTS_SPECIFICATION.md`、`ARCHITECTURE.md` 和 `ROADMAP.md`。

## 新增文物

团队先使用仓库外层私有 `项目资料/文物资料交付模板/` 中的 Word 和素材目录交付资料。空缺字段统一填写“待确认”，内部 Word、授权书和未审核素材不得进入网站 `public/`。

创建一件内部草稿：

```powershell
npm.cmd run artifact:new -- --index 004 --slug stable-slug --name "文物名称"
```

该命令会检查编号和 slug、生成独立数据文件并自动注册。新记录固定为 `draft + internal`；生成后不得修改 `id`、`slug` 或 `displayIndex`，名称可以按审核结果更新。

录入时：

1. 将 Word 内容逐项复制到数据文件，时间线和问答保留稳定 `id`。
2. 在 `sources` 记录来源，在 `fieldReferences` 使用字段路径关联来源及页码、章节或链接，例如 `timeline.timeline-004-01.text`。
3. 只有审核和授权完成的正式素材才能放入 `public/artifacts/<slug>/images/`、`models/`、`audio/`；原始授权文件仍留在私有目录。
4. 运行 `npm.cmd run artifact:check`。命令会按文物输出中文错误和警告，并检查注册、引用、文件、格式、审核和授权。
5. 预检通过后人工核对资料版本、内容审核记录和素材审核记录，再手动把状态改为 `approved` 或 `published`。项目不提供自动发布命令。

审核职责分开记录：

- 内容审核人填写 `reviewer`、`reviewedAt`，负责专业文字、来源定位、争议表述和资料版本。
- 素材审核人填写 `assetReviewer`、`assetsReviewedAt`，负责公开图片、GLB、文件音频的授权范围、署名和公开文件。纯文字正式记录无需素材审核记录。
- 两类日期统一使用 `YYYY-MM-DD`；正式公开素材的授权状态只接受 `authorized` 或 `open_license`。

GLB 记录至少填写 `glbPath`、`unit`、`scale`、`rotation`、`fallbackImageId`、`classification`、`sourceId` 和 `authorizationStatus`。页面、卡片、3D 和播放器不需要复制。
