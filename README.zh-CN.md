# MasteryThread

<p align="center">
  <img src="skill/mastery-thread/assets/icon.svg" width="84" alt="MasteryThread 图标" />
</p>

<h3 align="center">让学习不断线，让掌握有证据。</h3>

<p align="center">
  大多数学习工具记录你学过什么；MasteryThread 记录你真正会了什么。
</p>

<p align="center">
  <a href="https://mastery-thread.heyard2025.chatgpt.site">产品预览</a>
  ·
  <a href="packages/mastery-thread-skill.zip">下载 Skill</a>
  ·
  <a href="https://github.com/heyard2026/mastery-thread/issues/1">加入首批体验计划</a>
  ·
  <a href="README.md">English</a>
</p>

![MasteryThread 产品界面](media/social-preview.png)

> **公开演示：** 在线预览已向所有人开放，无需登录；Skill 与本地学习工作台也已开源，可以独立使用。

## 为什么做 MasteryThread

AI 很会解释知识，却不一定能可靠回答三个问题：

- 学习者究竟能够独立完成什么？
- 这次答对是因为真正掌握，还是因为提示过强？
- 中断几天以后，应该从哪里继续？

MasteryThread 把学习设计成一套持续的证据系统：先让学习者表现，再进行最小干预；更换题目重新验证，并且只记录证据能够支持的掌握等级。

## 核心闭环

![MasteryThread 产品导览](media/product-tour.gif)

```text
检索 → 观察 → 最小干预 → 变式验证 → 记录 → 安排复习
```

Skill 负责诊断、教学决策和掌握判定；本地工作台负责呈现学习状态、证据账本、薄弱点和复习队列。

## 与普通学习工具的区别

| 普通学习记录工具 | MasteryThread |
|---|---|
| 记录课程、打卡和学习时长 | 记录可观察的真实表现证据 |
| 答对一次就可能判定掌握 | 对强提示下的成功进行降权 |
| 从上次看到的页面继续 | 从最后确认的能力继续 |
| 学习进度锁在某次聊天里 | 使用可携带的 `learning-state.json` |
| 统一安排重复复习 | 优先处理逾期前置能力和未关闭薄弱点 |

## 三类典型场景

### 1. 准备考试或面试

把考试大纲或岗位要求转化为有前置依赖的学习路线；先诊断真实起点，再分别验证回忆、解释和应用能力。

### 2. 学习一项实用技能

通过接近真实工作的任务学习 SQL、用户访谈、数据分析、写作等能力。只有能够独立完成代表性任务，才达到 L3 应用等级。

### 3. 恢复一个中断的长期学习项目

导入之前的 `learning-state.json`，直接恢复最后确认的能力、尚未解决的薄弱点、到期复习和下一步行动，不依赖聊天记录重建项目。

## 快速开始

### 方式一：使用打包好的 Skill

1. 下载 [`mastery-thread-skill.zip`](packages/mastery-thread-skill.zip)。
2. 在 ChatGPT 或 Codex 中上传，并说明：`请安装这个 Skill。`
3. 安装后可以这样开始：

```text
使用 MasteryThread 帮我建立一个“独立完成用户访谈”的学习项目。
先诊断我的真实起点，不要直接给完整课程表。
```

### 方式二：在 Codex 中从源码安装

```bash
git clone https://github.com/heyard2026/mastery-thread.git
mkdir -p ~/.codex/skills
cp -R mastery-thread/skill/mastery-thread ~/.codex/skills/mastery-thread
```

### 方式三：运行本地学习工作台

需要 Node.js 22.13 或更高版本。

```bash
git clone https://github.com/heyard2026/mastery-thread.git
cd mastery-thread/web-app
npm ci
npm run dev -- --host 0.0.0.0
```

学习数据默认只保存在当前浏览器设备中。前端导入导出的文件，与 Skill 使用的是同一份规范化 `learning-state.json`。

## 掌握等级

| 等级 | 含义 | 最低证据 |
|---|---|---|
| L0 | 尚无证据 | 没有可用表现 |
| L1 | 能回忆 | 无关键提示提取事实、步骤或语法 |
| L2 | 能解释 | 用自己的话说明关系、边界并处理反例 |
| L3 | 能应用 | 独立完成并验证代表性任务 |
| L4 | 能迁移 | 在实质不同的情境中适应、辩护并处理例外 |

`worked-step` 或 `solution` 级提示不能独立支持 L3/L4。学习时长、自信程度和完成课程只能作为背景，不能替代表现证据。

## 项目结构

```text
mastery-thread/
├── skill/mastery-thread/        # 教练逻辑、证据规则和状态脚本
├── web-app/                     # 设备本地学习工作台
├── media/                       # 产品与推广视觉素材
└── packages/                    # 可下载的 Skill 安装包
```

前端中的 SQL 流程是明确标注的确定性演示，不冒充已经接入的云端模型。通用领域的任务生成、适应性诊断、来源核验和掌握判定由 Skill 完成。

## 运行检查

```bash
cd skill/mastery-thread
python3 scripts/test_mastery_thread.py

cd ../../web-app
npm run lint
npm run build
```

## 数据与隐私

- 本地工作台不需要账户。
- 导入文件不会由前端上传到第三方服务。
- 学习状态使用语义化版本，更新时保留未知字段。
- 只保存简洁的表现、错误和验证摘要，不记录隐藏思维过程。

## 独立设计说明

MasteryThread 围绕“持续学习状态＋可验证掌握”从零设计了自己的状态契约、掌握量表、诊断闭环、视觉语言和前端交互。它不是任何现有学习 Skill 的复制、换皮或代码分叉。

## 当前边界

- 通用领域的适应性诊断需要在 MasteryThread Skill 中运行。
- 前端目前使用设备本地状态，不提供云同步或多人协作。
- 在线产品预览已公开，无需登录；源码和本地工作台也可以独立使用。

## 参与改进

当前最需要的是关于掌握判定、中断恢复、状态兼容性和真实学习流程的反馈。提交问题时，请说明你的学习目标、实际发生的情况和预期结果。

## 许可证

MIT
