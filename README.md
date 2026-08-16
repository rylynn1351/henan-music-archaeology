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
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
```

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

1. 复制 `app/artifact-records/template.ts` 为新的文物文件，并立即确定不会再变化的 `id`、`slug` 和 `displayIndex`。
2. 只录入团队提供并标明来源、审核状态的专业资料；图片、GLB 和音频同时填写来源与授权状态。
3. 在 `app/artifact-records/index.ts` 注册记录。占位阶段使用 `reviewStatus: "placeholder"`，公开整理页使用 `catalogVisibility: "public"`。
4. 资料完成审核后填写 `reviewer`、`reviewedAt`，把记录改为 `approved` 或 `published`；页面、卡片、3D 和播放器无需复制。
5. 运行完整质量检查。重复编号、失效引用、不完整审核信息和缺失资产授权会阻止构建或测试。
