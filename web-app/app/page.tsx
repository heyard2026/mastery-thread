"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { completeSqlSession, createProjectState, createSampleState, HintLevel, LearningState, RouteType, STORAGE_KEY, validateImportedState } from "./learning-state";

type View = "home" | "new" | "records" | "profile" | "reviews" | "session";
type Choice = "where" | "having" | "unsure" | null;
type SessionStage = "retrieve" | "diagnosis" | "verify" | "complete";

const levelCopy = ["尚无证据", "能回忆", "能解释", "能应用", "能迁移"];
const routeCopy: Record<RouteType, { title: string; detail: string; target: number }> = {
  practical: { title: "实用技能", detail: "以独立完成真实任务为标准", target: 3 },
  knowledge: { title: "知识理解", detail: "以解释关系与边界为标准", target: 2 },
  research: { title: "专业研究", detail: "以证据质量与真实交付为标准", target: 3 },
  exam: { title: "考试认证", detail: "按考试实际行为建立证据", target: 3 },
};
const unitOf = (state: LearningState, id: string) => state.roadmap.units.find((unit) => unit.id === id);
const formatDay = (value: string) => { const [, month, day] = value.slice(0, 10).split("-"); return `${Number(month)}月${Number(day)}日`; };
const downloadName = (title: string) => `${title.replace(/[^\p{L}\p{N}-]+/gu, "-") || "mastery-thread"}-learning-state.json`;

export default function Home() {
  const [state, setState] = useState<LearningState>(() => createSampleState());
  const [view, setView] = useState<View>("home");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setState(validateImportedState(JSON.parse(saved)));
      } catch {
        setNotice("本地记录读取失败，已先打开示例项目。你仍可导入之前导出的 JSON。");
      } finally { setReady(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state, ready]);

  function navigate(next: View) { setView(next); setNotice(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function exportState() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = downloadName(state.project.title); link.click(); URL.revokeObjectURL(url);
    setNotice("学习状态已导出。这个文件可以交给 MasteryThread Skill 继续教练流程。");
  }
  async function importState(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try {
      const imported = validateImportedState(JSON.parse(await file.text()));
      setState(imported); navigate("home"); setNotice(`已导入「${imported.project.title}」，未知扩展字段也会原样保留。`);
    } catch (error) { setNotice(error instanceof Error ? `无法导入：${error.message}` : "无法导入这个文件。"); }
    finally { event.target.value = ""; }
  }

  return <div className="site-shell">
    <Header view={view} state={state} navigate={navigate} onExport={exportState} onImport={() => fileRef.current?.click()} />
    <input ref={fileRef} className="sr-only" type="file" accept="application/json,.json" onChange={importState} />
    {notice && <div className="notice" role="status"><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="关闭提示">×</button></div>}
    {view === "home" && <Dashboard state={state} navigate={navigate} />}
    {view === "new" && <NewProject onCreate={(next) => { setState(next); navigate("home"); setNotice("项目已建立。路线只是第一版，后续会随证据调整。"); }} onCancel={() => navigate("home")} />}
    {view === "records" && <Records state={state} />}
    {view === "profile" && <Profile state={state} />}
    {view === "reviews" && <Reviews state={state} onStart={() => navigate("session")} />}
    {view === "session" && <Session state={state} onFinish={(next) => { setState(next); navigate("home"); setNotice("本次证据、薄弱点和下次复习时间已经写入学习状态。"); }} onExit={() => navigate("home")} />}
    <MobileNav view={view} navigate={navigate} />
    <footer className="site-footer"><strong>MasteryThread</strong><span>让学习不断线，让掌握有证据。</span><small>设备本地保存 · 可随时导出</small></footer>
  </div>;
}

function Header({ view, state, navigate, onExport, onImport }: { view: View; state: LearningState; navigate: (view: View) => void; onExport: () => void; onImport: () => void }) {
  const [open, setOpen] = useState(false);
  return <header className="site-header">
    <button className="brand" type="button" onClick={() => navigate("home")} aria-label="回到 MasteryThread 首页"><span className="brand-symbol"><i /><i /><i /></span><span className="brand-copy"><strong>MasteryThread</strong><small>让学习不断线，让掌握有证据</small></span></button>
    <nav className="main-nav" aria-label="主导航">
      <button className={view === "home" ? "active" : ""} type="button" onClick={() => navigate("home")}>我的学习</button>
      <button className={view === "records" ? "active" : ""} type="button" onClick={() => navigate("records")}>学习记录</button>
      <button className={view === "profile" ? "active" : ""} type="button" onClick={() => navigate("profile")}>能力档案</button>
      <button className={view === "reviews" ? "active" : ""} type="button" onClick={() => navigate("reviews")}>复习中心</button>
    </nav>
    <div className="header-tools"><span className="project-chip" title={state.project.title}>{state.project.title}</span><button className="avatar" type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开数据菜单">S</button>{open && <div className="data-menu"><span>这台设备上的数据</span><button type="button" onClick={() => { onExport(); setOpen(false); }}>导出学习状态</button><button type="button" onClick={() => { onImport(); setOpen(false); }}>导入 JSON 状态</button><button type="button" onClick={() => { navigate("new"); setOpen(false); }}>新建学习项目</button></div>}</div>
  </header>;
}

function Dashboard({ state, navigate }: { state: LearningState; navigate: (view: View) => void }) {
  const counts = useMemo(() => { const entries = Object.values(state.mastery); return { sessions: state.sessions.length, mastered: entries.filter((item) => item.status === "mastered").length, evidence: state.evidence.length }; }, [state]);
  const activeUnit = unitOf(state, state.resume.unit_id) ?? state.roadmap.units[0];
  const openWeaknesses = state.weaknesses.filter((item) => item.status !== "closed");
  const due = state.reviews.filter((item) => item.status === "pending" && item.due_date <= new Date().toISOString().slice(0, 10)).length;
  const canRunLocalDemo = state.project.id === "prj_sql_demo";
  return <main className="home-page">
    <section className="hero-grid"><div className="hero-copy"><span className="section-kicker"><i /> {state.project.title} · {routeCopy[state.project.route_type].title}</span><h1>把 {state.project.topic}<br /><em>学到真正会用。</em></h1><p>{state.project.desired_outcome || "用真实表现代替“好像学会了”，每次只推进一个可以被验证的能力。"}</p><div className="proof-strip" aria-label="学习概况"><div><strong>{counts.sessions}</strong><span>次有效学习</span></div><div><strong>{counts.mastered}</strong><span>项能力已达标</span></div><div><strong>{counts.evidence}</strong><span>条有效证据</span></div></div></div>
      <article className="today-card"><div className="today-top"><span>今天只做一件事</span><b>{state.learner.preferred_session_minutes ? `约 ${state.learner.preferred_session_minutes} 分钟` : "时长待定"}</b></div><div className="today-number">NEXT EVIDENCE · {activeUnit?.id.replace("unit_", "").toUpperCase()}</div><h2>{activeUnit?.title ?? "建立真实起点"}</h2><p>{state.resume.next_action}</p><div className="task-evidence"><span>完成标准</span><strong>{activeUnit?.capability ?? "产生一次可观察的表现"}</strong></div><button className="start-button" type="button" onClick={() => navigate("session")}>{canRunLocalDemo ? "开始今天的学习" : "准备本次学习"}<span>→</span></button>{!canRunLocalDemo && <small className="local-note">通用项目会生成交接提示，由 MasteryThread Skill 负责领域诊断。</small>}</article></section>
    <section className="thread-section"><div className="section-heading"><div><span className="section-kicker">你的掌握主线</span><h2>清楚知道走到了哪里</h2></div><div className="level-legend"><span>L0 尚无证据</span><span>L2 能解释</span><span>L3 能应用</span><span>L4 能迁移</span></div></div><div className="thread-track"><div className="thread-line"><i style={{ width: `${Math.max(4, state.roadmap.phases.filter((phase) => phase.unit_ids.every((id) => state.mastery[id]?.status === "mastered")).length / Math.max(1, state.roadmap.phases.length) * 100)}%` }} /></div>{state.roadmap.phases.map((phase) => { const levels = phase.unit_ids.map((id) => state.mastery[id]?.level ?? 0); const mastered = phase.unit_ids.length > 0 && phase.unit_ids.every((id) => state.mastery[id]?.status === "mastered"); const active = phase.unit_ids.includes(state.resume.unit_id) || (!mastered && levels.some((level) => level > 0)); const doneUnits = phase.unit_ids.filter((id) => state.mastery[id]?.status === "mastered").length; return <article key={phase.id} className={`thread-phase ${mastered ? "done" : active ? "active" : "next"}`}><div className="phase-node">{mastered ? "✓" : String(phase.order).padStart(2, "0")}</div><span>{mastered ? "已掌握" : active ? "正在学习" : "尚未开始"}</span><h3>{phase.title}</h3><p>{phase.detail}</p>{active && <strong>{doneUnits} / {phase.unit_ids.length} 项能力</strong>}</article>; })}</div></section>
    <section className="insight-grid"><article className="evidence-panel"><div className="panel-heading"><div><span className="section-kicker">最近的掌握证据</span><h2>不是“学过”，而是“做到过”</h2></div><button type="button" onClick={() => navigate("records")}>查看全部</button></div><div className="evidence-list">{state.evidence.slice(0, 3).map((item) => <div className="evidence-row" key={item.id}><span className={`level-badge l${item.level_supported}`}>L{item.level_supported}</span><div><strong>{item.summary}</strong><p>{item.verification_method} · {item.hint_level === "none" ? "无提示" : `提示：${item.hint_level}`}</p></div><time>{formatDay(item.timestamp)}</time></div>)}{state.evidence.length === 0 && <EmptyInline text="还没有证据。第一次诊断会从真实起点开始。" />}</div></article>
      <article className="repair-panel"><span className="section-kicker light">当前最值得修复</span><div className="repair-count">{String(openWeaknesses.length).padStart(2, "0")} <small>个开放薄弱点</small></div><h2>{openWeaknesses[0]?.observation ?? "还没有确认的薄弱点。先用表现建立诊断。"}</h2><p>{openWeaknesses[0] ? `关闭条件：${openWeaknesses[0].closure_condition}` : "系统不会因为自我感觉良好就判定掌握。"}</p><button type="button" onClick={() => navigate(due ? "reviews" : "session")}>{due ? `${due} 项复习今天到期` : "继续收集证据"}<span>↗</span></button></article></section>
    <button className="new-project-link" type="button" onClick={() => navigate("new")}><span>＋</span><div><strong>新建另一个学习项目</strong><small>当前项目会保留在导出的状态文件中</small></div></button>
  </main>;
}

function NewProject({ onCreate, onCancel }: { onCreate: (state: LearningState) => void; onCancel: () => void }) {
  const [route, setRoute] = useState<RouteType>("practical"); const [title, setTitle] = useState(""); const [outcome, setOutcome] = useState(""); const [context, setContext] = useState(""); const [baseline, setBaseline] = useState(""); const [minutes, setMinutes] = useState(""); const [deadline, setDeadline] = useState(""); const [step, setStep] = useState(1);
  function submit(event: FormEvent) { event.preventDefault(); onCreate(createProjectState({ title: title.trim(), desiredOutcome: outcome.trim(), useContext: context.trim(), baseline: baseline.trim(), routeType: route, targetLevel: routeCopy[route].target, sessionMinutes: minutes ? Number(minutes) : null, deadline: deadline || null })); }
  return <main className="workspace-page narrow-page"><div className="workspace-heading"><button className="back-link" type="button" onClick={onCancel}>← 返回</button><span className="section-kicker">NEW LEARNING PROJECT</span><h1>先定义“会了”是什么样子。</h1><p>路线不是课程目录，而是一组需要被证明的能力。未知条件可以留空，系统不会替你编造。</p></div><form className="project-form" onSubmit={submit}><div className="form-progress"><span className={step >= 1 ? "active" : ""}>1 目标</span><i /><span className={step >= 2 ? "active" : ""}>2 路线</span><i /><span className={step >= 3 ? "active" : ""}>3 约束</span></div>
    {step === 1 && <div className="form-section"><label><span>你想学什么？</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：用户研究、Python、公开演讲" autoFocus required /></label><label><span>你希望最终能做到什么？</span><textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="用可观察的结果描述，不要只写“理解”或“掌握”" required /></label><label><span>会在什么情境中使用？</span><input value={context} onChange={(e) => setContext(e.target.value)} placeholder="例如：三个月后独立完成一次客户访谈" /></label><div className="form-actions"><button className="primary-action" type="button" disabled={!title.trim() || !outcome.trim()} onClick={() => setStep(2)}>选择学习路线 →</button></div></div>}
    {step === 2 && <div className="form-section"><fieldset className="route-options"><legend>哪条路线最接近你的目标？</legend>{(Object.keys(routeCopy) as RouteType[]).map((key) => <button className={route === key ? "selected" : ""} type="button" onClick={() => setRoute(key)} key={key}><span>L{routeCopy[key].target}</span><div><strong>{routeCopy[key].title}</strong><small>{routeCopy[key].detail}</small></div></button>)}</fieldset><label><span>你现在的真实起点（可留空）</span><textarea value={baseline} onChange={(e) => setBaseline(e.target.value)} placeholder="写做过什么、哪里会卡住；没把握就留空，第一次学习会诊断" /></label><div className="form-actions split"><button type="button" onClick={() => setStep(1)}>上一步</button><button className="primary-action" type="button" onClick={() => setStep(3)}>设置约束 →</button></div></div>}
    {step === 3 && <div className="form-section"><div className="form-columns"><label><span>单次可用时间（分钟，可留空）</span><input type="number" min="5" max="180" value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder="例如：25" /></label><label><span>截止日期（可留空）</span><input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></label></div><div className="project-preview"><span>第一版路线</span><h3>{title}</h3><p>目标等级 L{routeCopy[route].target} · {routeCopy[route].title}</p><ol><li>建立真实起点</li><li>完成代表性任务</li><li>诊断并关闭薄弱点</li><li>在真实情境中交付</li></ol><small>创建后会根据证据调整，不把预设路线当成事实。</small></div><div className="form-actions split"><button type="button" onClick={() => setStep(2)}>上一步</button><button className="primary-action" type="submit">创建学习项目 →</button></div></div>}
  </form></main>;
}

function Records({ state }: { state: LearningState }) {
  const [filter, setFilter] = useState<"all" | "pass" | "partial">("all"); const items = state.evidence.filter((item) => filter === "all" || item.result === filter);
  return <Workspace title="学习记录" kicker="EVIDENCE LEDGER" intro="每条记录都回答三件事：你做了什么、用了多少帮助、它能支持哪一级掌握。"><div className="summary-cards"><SummaryCard value={state.evidence.length} label="全部证据" note="可观察尝试" /><SummaryCard value={state.evidence.filter((item) => item.level_supported >= 3).length} label="强证据" note="独立应用或迁移" /><SummaryCard value={state.sessions.length} label="学习会话" note="保留中断上下文" /></div><div className="ledger-panel"><div className="filter-row"><div><strong>证据账本</strong><span>最新记录在前</span></div><div className="segmented">{(["all", "pass", "partial"] as const).map((key) => <button className={filter === key ? "active" : ""} type="button" onClick={() => setFilter(key)} key={key}>{key === "all" ? "全部" : key === "pass" ? "通过" : "部分"}</button>)}</div></div><div className="ledger-list">{items.map((item) => <article className="ledger-row" key={item.id}><span className={`level-badge l${item.level_supported}`}>L{item.level_supported}</span><div className="ledger-main"><div><strong>{item.capability}</strong><time>{formatDay(item.timestamp)}</time></div><p>{item.summary}</p><small>{item.evidence_type} · {item.verification_method} · {item.hint_level === "none" ? "无实质提示" : `最高提示 ${item.hint_level}`}</small></div><span className={`result-pill ${item.result}`}>{item.result === "pass" ? "通过" : item.result === "partial" ? "部分" : item.result === "transfer" ? "迁移" : "未通过"}</span></article>)}{items.length === 0 && <EmptyState title="还没有匹配的证据" text="完成一次诊断后，系统会记录观察结果，但不会保存隐藏思维过程。" />}</div></div></Workspace>;
}

function Profile({ state }: { state: LearningState }) {
  const levels = [0, 1, 2, 3, 4].map((level) => ({ level, count: Object.values(state.mastery).filter((item) => item.level === level).length }));
  return <Workspace title="能力档案" kicker="MASTERY PROFILE" intro="等级属于一个具体能力，而不是对你的笼统评价。只有表现证据才能推动升级。"><section className="profile-overview"><div><span>项目目标</span><h2>{state.project.title}</h2><p>{state.project.desired_outcome}</p></div><div className="level-distribution">{levels.map((item) => <div key={item.level}><span>L{item.level}</span><i><b style={{ width: `${Math.max(5, item.count / Math.max(1, state.roadmap.units.length) * 100)}%` }} /></i><strong>{item.count}</strong></div>)}</div></section><section className="capability-panel"><div className="panel-title"><span>能力清单</span><small>目标 L{state.project.target_level}</small></div><div className="capability-list">{state.roadmap.units.map((unit) => { const item = state.mastery[unit.id]; return <article key={unit.id}><div className="capability-level"><strong>L{item?.level ?? 0}</strong><small>{levelCopy[item?.level ?? 0]}</small></div><div className="capability-copy"><strong>{unit.title}</strong><p>{unit.capability}</p><div className="confidence"><i><b style={{ width: `${(item?.confidence ?? 0) * 100}%` }} /></i><span>证据一致性 {Math.round((item?.confidence ?? 0) * 100)}%</span></div></div><span className={`status-badge ${item?.status}`}>{item?.status === "mastered" ? "已达标" : item?.status === "review" ? "待复习" : item?.status === "learning" ? "学习中" : "未开始"}</span></article>; })}</div></section><aside className="rubric-note"><strong>等级如何判定？</strong><p>L1 回忆 · L2 解释边界 · L3 独立应用并验证 · L4 在不同情境迁移。看过、听过或自信都不能单独升级。</p></aside></Workspace>;
}

function Reviews({ state, onStart }: { state: LearningState; onStart: () => void }) {
  const open = state.weaknesses.filter((item) => item.status !== "closed"); const pending = state.reviews.filter((item) => item.status === "pending").sort((a, b) => a.due_date.localeCompare(b.due_date)); const today = new Date().toISOString().slice(0, 10);
  return <Workspace title="薄弱点与复习" kicker="REPAIR QUEUE" intro="复习不是重复看材料，而是在合适的时间重新尝试，并用新证据决定下一步。"><div className="review-hero"><div><span>今天到期</span><strong>{pending.filter((item) => item.due_date <= today).length}</strong><p>优先处理会阻碍下一项能力的薄弱点。</p></div><button type="button" onClick={onStart} disabled={pending.length === 0}>开始一次验证 <span>→</span></button></div><div className="review-grid"><section className="queue-panel"><div className="panel-title"><span>复习队列</span><small>{pending.length} 项待处理</small></div>{pending.map((review) => { const unit = unitOf(state, review.unit_id); const due = review.due_date <= today; return <article className="review-row" key={review.id}><div className={`due-date ${due ? "due" : ""}`}><strong>{formatDay(review.due_date)}</strong><small>{due ? "今天到期" : `${review.interval_days} 天间隔`}</small></div><div><strong>{unit?.title ?? "未知能力"}</strong><p>{review.reason}</p></div><span className={`priority ${review.priority}`}>{review.priority === "high" ? "高" : review.priority === "medium" ? "中" : "低"}</span></article>; })}{pending.length === 0 && <EmptyState title="队列已清空" text="新的表现证据会决定是否需要安排下一次验证。" />}</section><section className="weakness-panel"><div className="panel-title"><span>开放薄弱点</span><small>{open.length} 个</small></div>{open.map((item) => <article className="weakness-card" key={item.id}><div><span>{item.status === "monitoring" ? "观察中" : `出现 ${item.recurrence_count} 次`}</span><strong>{unitOf(state, item.unit_id)?.title}</strong></div><p>{item.observation}</p><dl><dt>可能原因</dt><dd>{item.likely_cause}</dd><dt>最小干预</dt><dd>{item.intervention}</dd><dt>关闭条件</dt><dd>{item.closure_condition}</dd></dl></article>)}{open.length === 0 && <EmptyState title="暂无开放薄弱点" text="这不代表全部掌握，只代表目前还没有被证据确认的问题。" />}</section></div></Workspace>;
}

function Session({ state, onFinish, onExit }: { state: LearningState; onFinish: (state: LearningState) => void; onExit: () => void }) { return state.project.id === "prj_sql_demo" ? <SqlSession state={state} onFinish={onFinish} onExit={onExit} /> : <GenericHandoff state={state} onExit={onExit} />; }

function SqlSession({ state, onFinish, onExit }: { state: LearningState; onFinish: (state: LearningState) => void; onExit: () => void }) {
  const [stage, setStage] = useState<SessionStage>("retrieve"); const [choice, setChoice] = useState<Choice>(null); const [reason, setReason] = useState(""); const [variantChoice, setVariantChoice] = useState<Choice>(null); const [variantReason, setVariantReason] = useState(""); const [hintLevel, setHintLevel] = useState<HintLevel>("none");
  const firstCorrect = choice === "having"; const variantCorrect = variantChoice === "where"; const cleanResult = firstCorrect && variantCorrect && reason.trim().length >= 8 && variantReason.trim().length >= 8; const stageIndex = { retrieve: 1, diagnosis: 2, verify: 3, complete: 3 }[stage];
  function finish() { onFinish(completeSqlSession(state, { firstCorrect, firstReason: reason, variantCorrect, variantReason, hintLevel })); }
  return <main className="session-page"><div className="session-topline"><button type="button" onClick={onExit}>← 退出本次学习</button><div><span>证据闭环</span><strong>0{stageIndex} / 03</strong></div><span className="draft-label">本地诊断演示</span></div><section className="session-layout"><aside className="session-rail"><span className="section-kicker">本次路径</span><ol><SessionStep no={1} title="先独立判断" detail="不给答案和提示" state={stageIndex === 1 ? "current" : stageIndex > 1 ? "done" : ""} /><SessionStep no={2} title="定位错误类型" detail="只做最小干预" state={stageIndex === 2 ? "current" : stageIndex > 2 ? "done" : ""} /><SessionStep no={3} title="变式验证" detail="确认不是碰巧答对" state={stageIndex === 3 ? "current" : ""} /></ol><div className="session-goal"><span>本次达标证据</span><p>面对一个新的筛选需求，独立选择正确语句、解释执行边界，并在变式中再次应用。</p></div></aside>
    <section className="question-card">{stage === "retrieve" && <><QuestionHeading tag="订单分析 · 聚合过滤" title={<>哪一种写法，才能找到<br />“订单总额超过 5000 元”的客户？</>} text="你已经按客户完成分组，现在需要过滤聚合后的结果。先凭自己的理解判断，不要查资料。" /><SqlCode variant="having" /><ChoiceGroup value={choice} onChange={setChoice} /><ReasonField value={reason} onChange={setReason} /><button className="diagnose-button" type="button" disabled={!choice} onClick={() => setStage("diagnosis")}>提交并诊断我的理解 <span>→</span></button></>}
      {stage === "diagnosis" && <div className="diagnosis-view"><span className="section-kicker">观察 → 假设 → 最小干预</span><div className={`diagnosis-mark ${firstCorrect ? "pass" : "repair"}`}>{firstCorrect ? "第一步判断正确" : "发现边界混淆"}</div><h1>{firstCorrect ? "选择正确，但还不能据此判定掌握。" : "你把过滤发生的时机混在了一起。"}</h1><p>{firstCorrect ? (reason.trim().length >= 8 ? "你的解释提到了聚合后的分组结果。接下来换一个业务表述，检查这是否是稳定模型。" : "你选中了正确答案，但解释证据不足。下一步仍要换表述验证。") : "WHERE 先决定哪些原始行进入分组；HAVING 再决定哪些聚合后的分组留下。问题不在语法记忆，而在执行边界。"}</p><div className="contrast-box"><div><span>WHERE</span><strong>先筛原始行</strong><small>会改变参与聚合的数据</small></div><i>→ GROUP BY →</i><div><span>HAVING</span><strong>后筛聚合组</strong><small>不会回头改变组内原始行</small></div></div><div className="diagnosis-note"><strong>为什么只讲这一点？</strong><p>当前证据只支持“执行边界不稳”这个假设，没有必要重讲整章聚合函数。</p></div><button className="diagnose-button" type="button" onClick={() => setStage("verify")}>进入变式验证 <span>→</span></button></div>}
      {stage === "verify" && <><QuestionHeading tag="变式验证 · 行级筛选" title={<>如果要统计“2026 年以来”<br />每位客户的订单总额，空格填什么？</>} text="这次筛选条件针对每一条订单记录，而不是聚合后的客户分组。请重新判断，不要照搬上一题答案。" /><SqlCode variant="where" /><ChoiceGroup value={variantChoice} onChange={setVariantChoice} /><ReasonField value={variantReason} onChange={setVariantReason} /><button className="diagnose-button" type="button" disabled={!variantChoice} onClick={() => setStage("complete")}>完成验证并查看证据 <span>→</span></button></>}
      {stage === "complete" && <div className="completion-view"><div className={`completion-symbol ${cleanResult ? "pass" : "repair"}`}>{cleanResult ? "✓" : "↻"}</div><span className="section-kicker">本次证据判定</span><h1>{cleanResult ? "这次表现支持 L3：独立应用。" : "这次还不能证明稳定应用。"}</h1><p>{cleanResult ? "两道题都正确，解释足够，而且没有决定性提示。系统会记录一条应用证据，并安排 7 天后的保持性复习。" : "系统会保存真实结果、保留薄弱点，并安排短间隔重试；历史进度不会因为一次失败被抹掉。"}</p><div className="evidence-receipt"><div><span>判断</span><strong>{firstCorrect && variantCorrect ? "2 / 2 正确" : `${Number(firstCorrect) + Number(variantCorrect)} / 2 正确`}</strong></div><div><span>最高提示</span><strong>{hintLevel === "none" ? "无实质提示" : hintLevel}</strong></div><div><span>支持等级</span><strong>{cleanResult ? "L3" : firstCorrect || variantCorrect ? "最高 L2" : "诊断信号"}</strong></div></div><button className="diagnose-button" type="button" onClick={finish}>写入学习状态并返回 <span>→</span></button></div>}</section>
    <aside className="coach-panel"><div className="coach-avatar">MT</div><span className="section-kicker">本地教练流程</span><h2>{stage === "retrieve" ? "我先不告诉你答案。" : stage === "diagnosis" ? "只干预真正的卡点。" : stage === "verify" ? "换一个表面，再测一次。" : "让证据决定下一步。"}</h2><p>{stage === "retrieve" ? "答错不会扣分，它能帮助系统避免给你一整段没必要的讲解。" : stage === "diagnosis" ? "这里展示的是预设 SQL 规则，不是云端大模型生成的诊断。" : stage === "verify" ? "变式题改变了筛选对象，只有重新判断才能支持应用证据。" : "记录包含结果、提示、验证方式与复习时间，不保存隐藏思维过程。"}</p><div className="coach-rule"><span>证据规则</span><ul><li>选择正确只是第一步</li><li>解释不足不能支持 L2</li><li>关键提示会限制最高等级</li></ul></div>{stage === "retrieve" && <button type="button" onClick={() => setHintLevel("cue")}>{hintLevel === "cue" ? "提示已记录：想想过滤发生在分组前还是后" : "我需要一个小提示"}</button>}</aside></section></main>;
}

function GenericHandoff({ state, onExit }: { state: LearningState; onExit: () => void }) {
  const [copied, setCopied] = useState(false); const unit = unitOf(state, state.resume.unit_id); const prompt = `请使用 MasteryThread Skill 继续我的学习项目。\n项目：${state.project.title}\n目标：${state.project.desired_outcome}\n当前单元：${unit?.title}\n下一步：${state.resume.next_action}\n请先检索我的真实表现，再做最小干预，最后用变式任务验证。不要把自我感觉当作掌握证据。`;
  async function copy() { await navigator.clipboard.writeText(prompt); setCopied(true); }
  return <main className="workspace-page handoff-page"><button className="back-link" type="button" onClick={onExit}>← 返回项目</button><section className="handoff-card"><span className="section-kicker">READY FOR COACHING</span><h1>路线已经准备好，<br />领域诊断交给 Skill。</h1><p>这个轻前端负责状态、证据和复习队列。它不会假装能为任意领域生成可靠题目；真正的自适应教练流程在 MasteryThread Skill 中完成。</p><div className="handoff-task"><span>本次任务</span><strong>{unit?.title}</strong><p>{state.resume.next_action}</p></div><label><span>复制下面的交接提示</span><textarea readOnly value={prompt} /></label><button className="primary-action" type="button" onClick={copy}>{copied ? "已复制，可以回到 ChatGPT" : "复制并交给 MasteryThread Skill"} <span>→</span></button><small>同时导出 learning-state.json，可以让 Skill 在学习后更新同一份状态。</small></section></main>;
}

function Workspace({ title, kicker, intro, children }: { title: string; kicker: string; intro: string; children: React.ReactNode }) { return <main className="workspace-page"><div className="workspace-heading"><span className="section-kicker">{kicker}</span><h1>{title}</h1><p>{intro}</p></div>{children}</main>; }
function SummaryCard({ value, label, note }: { value: number; label: string; note: string }) { return <article><strong>{String(value).padStart(2, "0")}</strong><div><span>{label}</span><small>{note}</small></div></article>; }
function EmptyInline({ text }: { text: string }) { return <div className="empty-inline">{text}</div>; }
function EmptyState({ title, text }: { title: string; text: string }) { return <div className="empty-state"><span>○</span><strong>{title}</strong><p>{text}</p></div>; }
function SessionStep({ no, title, detail, state }: { no: number; title: string; detail: string; state: string }) { return <li className={state}><b>{state === "done" ? "✓" : no}</b><div><strong>{title}</strong><span>{detail}</span></div></li>; }
function QuestionHeading({ tag, title, text }: { tag: string; title: React.ReactNode; text: string }) { return <><div className="question-meta"><span>{tag}</span><b>预计 6 分钟</b></div><h1>{title}</h1><p className="question-context">{text}</p></>; }
function SqlCode({ variant }: { variant: "having" | "where" }) { return <div className="code-card" aria-label="SQL 题目代码"><div className="code-dots"><i /><i /><i /><span>orders_analysis.sql</span></div><pre><code>{variant === "having" ? <><span className="kw">SELECT</span> customer_id, <span className="fn">SUM</span>(amount) <span className="kw">AS</span> total_amount{`\n`}<span className="kw">FROM</span> orders{`\n`}<span className="kw">GROUP BY</span> customer_id{`\n`}<mark>_____ total_amount &gt; 5000;</mark></> : <><span className="kw">SELECT</span> customer_id, <span className="fn">SUM</span>(amount){`\n`}<span className="kw">FROM</span> orders{`\n`}<mark>_____ order_date &gt;= &apos;2026-01-01&apos;</mark>{`\n`}<span className="kw">GROUP BY</span> customer_id;</>}</code></pre></div>; }
function ChoiceGroup({ value, onChange }: { value: Choice; onChange: (value: Choice) => void }) { return <fieldset className="choice-group"><legend>你的判断</legend><button className={value === "where" ? "selected" : ""} type="button" onClick={() => onChange("where")}><b>A</b><span><strong>WHERE</strong><small>在分组前过滤数据</small></span></button><button className={value === "having" ? "selected" : ""} type="button" onClick={() => onChange("having")}><b>B</b><span><strong>HAVING</strong><small>在分组后过滤结果</small></span></button><button className={value === "unsure" ? "selected" : ""} type="button" onClick={() => onChange("unsure")}><b>C</b><span><strong>我还不确定</strong><small>记录真实判断，不影响评分</small></span></button></fieldset>; }
function ReasonField({ value, onChange }: { value: string; onChange: (value: string) => void }) { return <label className="reason-field"><span>为什么？用你自己的话解释</span><textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder="例如：我认为应该用……因为数据在这一步已经……" /></label>; }
function MobileNav({ view, navigate }: { view: View; navigate: (view: View) => void }) { const items: Array<{ view: View; icon: string; label: string }> = [{ view: "home", icon: "⌂", label: "学习" }, { view: "records", icon: "≡", label: "记录" }, { view: "profile", icon: "◫", label: "能力" }, { view: "reviews", icon: "↻", label: "复习" }]; if (view === "session" || view === "new") return null; return <nav className="mobile-nav" aria-label="移动端主导航">{items.map((item) => <button className={view === item.view ? "active" : ""} type="button" onClick={() => navigate(item.view)} key={item.view}><span>{item.icon}</span><small>{item.label}</small></button>)}</nav>; }
