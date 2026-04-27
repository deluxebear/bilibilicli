# bilibilicli

`bilibilicli` 是一个本地 CLI，用来把哔哩哔哩创作中心的视频投稿流程命令行化。它复用你本机浏览器登录后的 Cookie，并通过已研究出的投稿接口完成视频上传、封面上传、草稿保存、删除草稿、参数查询和正式投稿等操作。

这个项目不是哔哩哔哩官方工具。接口来自已授权登录状态下的浏览器流量分析，后续如果创作中心页面或接口变更，可能需要重新捕获并更新实现。

## 安装

直接用 `npx` 运行：

```bash
npx @deluxebear/bilibilicli --help
```

全局安装后使用 `bilibilicli` 命令：

```bash
npm install -g @deluxebear/bilibilicli
bilibilicli --help
```

本地开发：

```bash
npm install
npm link
bilibilicli --help
```

从本地 tarball 安装：

```bash
npm pack
npm install -g ./deluxebear-bilibilicli-0.1.0.tgz
```

安装配套的 Agent Skill：

```bash
npx skills add deluxebear/bilibilicli --skill bilibilicli
```

全局安装到 Agent：

```bash
npx skills add deluxebear/bilibilicli --skill bilibilicli -g -y
```

## 登录与本地凭据

先打开真实浏览器完成登录：

```bash
bilibilicli auth login --profile default
```

检查登录状态：

```bash
bilibilicli auth status --profile default
bilibilicli doctor --profile default
```

默认数据目录：

- 浏览器用户目录：`~/.bilibilicli/browser-profiles/default/`
- Cookie 文件：`~/.bilibilicli/profiles/default/auth.json`
- 抓包摘要：`~/.bilibilicli/profiles/default/capture-summary.json`

`~/.bilibilicli` 内包含你的登录态，请不要提交到 Git，也不要分享给他人。

## 投稿参数查询

投稿表单里常用的三个参数分别是：

- `copyright`：类型，`1` 表示自制，`2` 表示转载。
- `tid`：分区 ID，例如情感分区在当前接口中为 `27`。
- `topic_id` / `topic_detail` / `mission_id`：话题、活动、任务相关参数。

查询类型：

```bash
bilibilicli params copyright
```

查询分区：

```bash
bilibilicli params types
bilibilicli params types --compact
```

按关键词或标题查询话题：

```bash
bilibilicli params topics --keyword "上B站看播客"
bilibilicli params topics --tid 27 --title "099 What Earth in 2125 could look like"
```

查询单个话题详情：

```bash
bilibilicli params topic-info --topic-id 1260884
```

## 捕获投稿流程

当哔哩哔哩页面改版、参数缺失，或需要重新研究接口时，可以打开投稿页并记录接口摘要：

```bash
bilibilicli auth capture \
  --profile default \
  --url https://member.bilibili.com/platform/upload/video/frame
```

完成一遍浏览器操作后，CLI 会把请求摘要保存到：

```text
~/.bilibilicli/profiles/default/capture-summary.json
```

## 常用命令

查看已实现命令和配置：

```bash
bilibilicli commands list
bilibilicli config list
bilibilicli doctor --profile default
```

上传视频文件，返回后续投稿需要的 `filename`、`biz_id` 等字段：

```bash
bilibilicli upload file \
  --profile default \
  --file ./video.mp4
```

上传封面：

```bash
bilibilicli cover upload \
  --profile default \
  --file ./cover.jpg
```

保存字幕：

```bash
bilibilicli subtitle save \
  --profile default \
  --cid 123456789 \
  --file ./subtitle.srt \
  --lan en-US
```

低层接口保存草稿：

```bash
bilibilicli draft save \
  --profile default \
  --filename "<uploaded-filename>" \
  --cid "<cid>" \
  --title "投稿标题" \
  --tid 27 \
  --tags "英语,英语学习,短片" \
  --description "简介"
```

删除草稿：

```bash
bilibilicli draft delete \
  --profile default \
  --id 3399934
```

正式投稿：

```bash
bilibilicli archive submit \
  --profile default \
  --filename "<uploaded-filename>" \
  --title "投稿标题" \
  --tid 27 \
  --tags "英语,英语学习,短片" \
  --description "简介"
```

从视频、封面和字幕文件直接生成草稿：

```bash
bilibilicli video draft \
  --profile default \
  --file ./video.mp4 \
  --cover-file ./cover.jpg \
  --subtitle-file ./subtitle.srt \
  --subtitle-lan en-US \
  --title "099 What Earth in 2125 could look like" \
  --description "TED-Ed video with subtitles" \
  --tid 27 \
  --tags "英语,英语学习,短片"
```

从文件直接执行正式投稿：

```bash
bilibilicli video run \
  --profile default \
  --file ./video.mp4 \
  --cover-file ./cover.jpg \
  --subtitle-file ./subtitle.srt \
  --subtitle-lan en-US \
  --title "099 What Earth in 2125 could look like" \
  --description "TED-Ed video with subtitles" \
  --tid 27 \
  --tags "英语,英语学习,短片" \
  --topic-id 1260884 \
  --mission-id 12345
```

## 字幕说明

哔哩哔哩的草稿接口可以接受字幕相关的 `preSave` 参数，但创作中心草稿编辑器不一定会稳定回显已保存的字幕文件。对字幕强依赖的流程，优先使用 `video run` 走正式投稿接口，而不是只保存草稿后再从网页继续编辑。

## 会产生远端状态的命令

下面这些命令会修改哔哩哔哩账号下的远端状态：

- `upload file`
- `cover upload`
- `subtitle save`
- `draft save`
- `draft delete`
- `archive submit`
- `video draft`
- `video run`

在自动化批量投稿前，建议先用小文件或测试草稿验证一遍参数。

## 已知接口

当前实现主要覆盖这些接口：

- 登录态检查：`https://api.bilibili.com/x/web-interface/nav`
- 上传初始化：`https://member.bilibili.com/preupload`
- 视频分片上传：上传服务返回的 `upos_uri`
- 上传完成：上传服务返回的 `complete` 地址
- 封面上传：`https://member.bilibili.com/x/vu/web/cover/up`
- 字幕图片上传：`https://member.bilibili.com/x/vu/web/image/subtitle`
- 字幕预保存：`https://member.bilibili.com/x/vu/web/add/v3/pre`
- 草稿保存：`https://member.bilibili.com/x/vupre/web/draft/add`
- 草稿更新：`https://member.bilibili.com/x/vupre/web/draft/edit`
- 草稿删除：`https://member.bilibili.com/x/vupre/web/draft/delete`
- 正式投稿：`https://member.bilibili.com/x/vu/web/add/v3`
- 投稿预检和参数：创作中心 `archive/pre`、分区、话题、活动相关接口

## 发布到 npm

包名是 `@deluxebear/bilibilicli`，命令名是 `bilibilicli`。

本仓库通过 GitHub Actions 发布 npm 包。npm 侧需要开启 Trusted Publishing，配置如下：

```text
Package: @deluxebear/bilibilicli
Publisher: GitHub Actions
Owner: deluxebear
Repository: bilibilicli
Workflow: publish.yml
Environment: 留空
```

发布新版本：

```bash
npm version patch
git push
git push origin --tags
gh release create v0.1.1 --title "v0.1.1" --notes "Release v0.1.1"
```

`publish.yml` 会执行：

```bash
npm ci
npm run check
npm run pack:dry
npm publish --access public
```

工作流还会检查 Git tag 是否和 `package.json` 版本一致；如果 npm 上已经存在同版本，会自动跳过发布。

## 开发检查

```bash
npm run check
npm run pack:dry
```

如果哔哩哔哩接口发生变化，优先重新执行 `auth capture`，再对比和更新这些文件：

- `lib/archive.mjs`
- `lib/upload.mjs`
- `lib/subtitle.mjs`
- `lib/params.mjs`
