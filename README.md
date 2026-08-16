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
