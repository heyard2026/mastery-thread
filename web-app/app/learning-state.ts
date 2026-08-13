export type RouteType = "knowledge" | "practical" | "research" | "exam";
export type MasteryStatus = "not-started" | "learning" | "review" | "mastered";
export type HintLevel = "none" | "clarification" | "cue" | "scaffold" | "worked-step" | "solution";
export type AttemptResult = "fail" | "partial" | "pass" | "transfer";

export type Unit = {
  id: string;
  title: string;
  capability: string;
  phase_id: string;
  order: number;
};

export type Phase = {
  id: string;
  title: string;
  detail: string;
  order: number;
  unit_ids: string[];
};

export type MasteryEntry = {
  level: number;
  confidence: number;
  target_level: number;
  evidence_ids: string[];
  last_checked_at: string | null;
  status: MasteryStatus;
};

export type EvidenceEntry = {
  id: string;
  unit_id: string;
  capability: string;
  evidence_type: "recall" | "explanation" | "application" | "transfer" | "authentic-work";
  result: AttemptResult;
  hint_level: HintLevel;
  summary: string;
  level_supported: number;
  verification_method: string;
  timestamp: string;
  artifact_reference?: string;
};

export type WeaknessEntry = {
  id: string;
  unit_id: string;
  status: "open" | "monitoring" | "closed";
  observation: string;
  likely_cause: string;
  diagnostic_confidence: number;
  intervention: string;
  closure_condition: string;
  recurrence_count: number;
  evidence_ids: string[];
  created_at: string;
  updated_at: string;
};

export type ReviewEntry = {
  id: string;
  unit_id: string;
  due_date: string;
  priority: "low" | "medium" | "high";
  reason: string;
  status: "pending" | "completed";
  interval_days: number;
  stability_count: number;
  result_history: Array<{ result: AttemptResult; date: string }>;
};

export type LearningState = {
  schema_version: string;
  project: {
    id: string;
    title: string;
    topic: string;
    desired_outcome: string;
    use_context: string;
    route_type: RouteType;
    target_level: number;
    created_at: string;
    deadline: string | null;
    constraints: string[];
  };
  learner: {
    baseline: string;
    preferred_session_minutes: number | null;
    preferences: string[];
  };
  roadmap: { phases: Phase[]; units: Unit[] };
  mastery: Record<string, MasteryEntry>;
  weaknesses: WeaknessEntry[];
  evidence: EvidenceEntry[];
  reviews: ReviewEntry[];
  sessions: Array<{
    id: string;
    unit_id: string;
    started_at: string;
    completed_at: string;
    summary: string;
    result: AttemptResult;
  }>;
  sources: Array<Record<string, unknown>>;
  resume: { unit_id: string; next_action: string; updated_at: string };
  updated_at: string;
  [key: string]: unknown;
};

export const STORAGE_KEY = "mastery-thread.learning-state.v1";

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const iso = () => new Date().toISOString();
const day = (offset = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
};

export function createSampleState(): LearningState {
  const now = "2026-08-12T16:00:00.000Z";
  const phases: Phase[] = [
    { id: "phase_query", title: "查询基础", detail: "筛选、排序与字段", order: 1, unit_ids: ["unit_filter", "unit_sort"] },
    { id: "phase_analyze", title: "分析数据", detail: "聚合与业务指标", order: 2, unit_ids: ["unit_aggregate", "unit_having", "unit_verify"] },
    { id: "phase_join", title: "连接数据", detail: "关联与窗口函数", order: 3, unit_ids: ["unit_join", "unit_window"] },
    { id: "phase_deliver", title: "交付洞察", detail: "完成订单分析", order: 4, unit_ids: ["unit_project"] },
  ];
  const units: Unit[] = [
    { id: "unit_filter", title: "行级筛选", capability: "用 WHERE 正确筛选原始行", phase_id: "phase_query", order: 1 },
    { id: "unit_sort", title: "结果排序", capability: "用 ORDER BY 交付清晰结果", phase_id: "phase_query", order: 2 },
    { id: "unit_aggregate", title: "聚合指标", capability: "构建并核对聚合指标", phase_id: "phase_analyze", order: 3 },
    { id: "unit_having", title: "聚合过滤", capability: "区分 WHERE 与 HAVING 的执行边界", phase_id: "phase_analyze", order: 4 },
    { id: "unit_verify", title: "结果验证", capability: "用总量和抽样检查结果", phase_id: "phase_analyze", order: 5 },
    { id: "unit_join", title: "表连接诊断", capability: "识别并修复连接后的重复行", phase_id: "phase_join", order: 6 },
    { id: "unit_window", title: "窗口分析", capability: "在保留明细的同时计算分组指标", phase_id: "phase_join", order: 7 },
    { id: "unit_project", title: "订单分析交付", capability: "独立完成并解释一份业务分析", phase_id: "phase_deliver", order: 8 },
  ];
  const mastery: Record<string, MasteryEntry> = {};
  for (const unit of units) mastery[unit.id] = { level: 0, confidence: 0.25, target_level: 3, evidence_ids: [], last_checked_at: null, status: "not-started" };
  mastery.unit_filter = { level: 3, confidence: 0.84, target_level: 3, evidence_ids: ["ev_filter"], last_checked_at: now, status: "mastered" };
  mastery.unit_sort = { level: 3, confidence: 0.79, target_level: 3, evidence_ids: ["ev_sort"], last_checked_at: now, status: "mastered" };
  mastery.unit_aggregate = { level: 3, confidence: 0.81, target_level: 3, evidence_ids: ["ev_aggregate"], last_checked_at: now, status: "mastered" };
  mastery.unit_having = { level: 1, confidence: 0.48, target_level: 3, evidence_ids: [], last_checked_at: null, status: "learning" };
  mastery.unit_verify = { level: 2, confidence: 0.66, target_level: 3, evidence_ids: ["ev_verify"], last_checked_at: now, status: "learning" };
  mastery.unit_join = { level: 2, confidence: 0.55, target_level: 3, evidence_ids: ["ev_join"], last_checked_at: now, status: "review" };

  return {
    schema_version: "1.0.0",
    project: {
      id: "prj_sql_demo",
      title: "SQL 数据分析",
      topic: "SQL",
      desired_outcome: "面对一张新的订单表，独立完成分析、验证结果并解释业务含义。",
      use_context: "工作中的订单数据分析",
      route_type: "practical",
      target_level: 3,
      created_at: now,
      deadline: null,
      constraints: [],
    },
    learner: { baseline: "了解 SELECT、WHERE 和基础聚合", preferred_session_minutes: 18, preferences: [] },
    roadmap: { phases, units },
    mastery,
    weaknesses: [
      {
        id: "weak_join_rows",
        unit_id: "unit_join",
        status: "open",
        observation: "连接后未主动检查行数变化，导致指标被重复计算。",
        likely_cause: "把连接视为字段补全，没有建立关系基数意识。",
        diagnostic_confidence: 0.82,
        intervention: "先预测行数，再用连接前后计数和主键唯一性检查验证。",
        closure_condition: "在两个新表连接任务中，独立预测并验证行数变化。",
        recurrence_count: 2,
        evidence_ids: ["ev_join"],
        created_at: now,
        updated_at: now,
      },
      {
        id: "weak_having_boundary",
        unit_id: "unit_having",
        status: "open",
        observation: "尚未证明能稳定区分行级过滤与聚合后过滤。",
        likely_cause: "SQL 书写顺序和逻辑执行顺序尚未形成清晰模型。",
        diagnostic_confidence: 0.68,
        intervention: "用一组最小对比题建立 WHERE / HAVING 边界，再换业务表验证。",
        closure_condition: "无关键提示完成一次解释和一次变式应用。",
        recurrence_count: 1,
        evidence_ids: [],
        created_at: now,
        updated_at: now,
      },
    ],
    evidence: [
      { id: "ev_filter", unit_id: "unit_filter", capability: "行级筛选", evidence_type: "application", result: "pass", hint_level: "none", summary: "独立完成日期与地区组合筛选，并抽样核对。", level_supported: 3, verification_method: "抽样检查", timestamp: now },
      { id: "ev_sort", unit_id: "unit_sort", capability: "结果排序", evidence_type: "application", result: "pass", hint_level: "none", summary: "独立交付 Top 客户列表，正确处理并列结果。", level_supported: 3, verification_method: "边界值检查", timestamp: now },
      { id: "ev_aggregate", unit_id: "unit_aggregate", capability: "聚合指标", evidence_type: "application", result: "pass", hint_level: "none", summary: "独立构建订单聚合指标，结果与源数据总量一致。", level_supported: 3, verification_method: "总量校验", timestamp: now },
      { id: "ev_verify", unit_id: "unit_verify", capability: "结果验证", evidence_type: "explanation", result: "pass", hint_level: "clarification", summary: "能解释为什么总量检查与抽样检查需要同时使用。", level_supported: 2, verification_method: "口头反例", timestamp: now },
      { id: "ev_join", unit_id: "unit_join", capability: "表连接诊断", evidence_type: "explanation", result: "partial", hint_level: "cue", summary: "能解释 LEFT JOIN 边界，但未主动检查重复行。", level_supported: 2, verification_method: "反例追问", timestamp: now },
    ],
    reviews: [
      { id: "rev_join", unit_id: "unit_join", due_date: "2026-08-12", priority: "high", reason: "薄弱点重复出现，需要短间隔验证。", status: "pending", interval_days: 1, stability_count: 0, result_history: [] },
      { id: "rev_verify", unit_id: "unit_verify", due_date: "2026-08-14", priority: "medium", reason: "已有解释证据，等待独立应用验证。", status: "pending", interval_days: 3, stability_count: 1, result_history: [] },
    ],
    sessions: [
      { id: "ses_demo_06", unit_id: "unit_join", started_at: now, completed_at: now, summary: "定位到连接后行数检查缺失。", result: "partial" },
    ],
    sources: [],
    resume: { unit_id: "unit_having", next_action: "完成 WHERE 与 HAVING 边界诊断，并通过一道变式题。", updated_at: now },
    updated_at: now,
  };
}

export function createProjectState(input: {
  title: string;
  desiredOutcome: string;
  useContext: string;
  baseline: string;
  routeType: RouteType;
  targetLevel: number;
  sessionMinutes: number | null;
  deadline: string | null;
}): LearningState {
  const now = iso();
  const projectId = uid("prj");
  const phaseNames = input.routeType === "research"
    ? [["界定问题", "明确范围与判断标准"], ["建立证据", "检索、筛选与记录来源"], ["形成判断", "综合、反驳与表达"], ["迁移交付", "在真实情境中完成成果"]]
    : input.routeType === "exam"
      ? [["诊断基础", "定位已会与易错内容"], ["核心理解", "建立概念与题型边界"], ["独立应用", "完成代表性问题"], ["模拟验证", "在限时情境中稳定表现"]]
      : input.routeType === "knowledge"
        ? [["建立地图", "识别核心概念与关系"], ["解释边界", "用自己的话区分概念"], ["反例验证", "处理误区与边界情况"], ["迁移表达", "在新语境中组织理解"]]
        : [["建立基础", "掌握必要动作与判断"], ["刻意练习", "在代表任务中独立应用"], ["诊断修复", "定位并关闭薄弱点"], ["真实交付", "在真实情境中完成成果"]];
  const phases: Phase[] = phaseNames.map((item, index) => ({ id: uid("phase"), title: item[0], detail: item[1], order: index + 1, unit_ids: [] }));
  const units: Unit[] = phases.map((phase, index) => {
    const id = uid("unit");
    phase.unit_ids = [id];
    return { id, title: phase.title, capability: index === 0 ? `建立「${input.title}」的真实起点` : phase.detail, phase_id: phase.id, order: index + 1 };
  });
  const mastery = Object.fromEntries(units.map((unit, index) => [unit.id, { level: 0, confidence: 0.25, target_level: input.targetLevel, evidence_ids: [], last_checked_at: null, status: index === 0 ? "learning" : "not-started" }])) as Record<string, MasteryEntry>;
  return {
    schema_version: "1.0.0",
    project: { id: projectId, title: input.title, topic: input.title, desired_outcome: input.desiredOutcome, use_context: input.useContext, route_type: input.routeType, target_level: input.targetLevel, created_at: now, deadline: input.deadline, constraints: [] },
    learner: { baseline: input.baseline, preferred_session_minutes: input.sessionMinutes, preferences: [] },
    roadmap: { phases, units },
    mastery,
    weaknesses: [], evidence: [], reviews: [], sessions: [], sources: [],
    resume: { unit_id: units[0].id, next_action: `先用一个不带提示的代表任务，诊断「${input.title}」的真实起点。`, updated_at: now },
    updated_at: now,
  };
}

export function validateImportedState(value: unknown): LearningState {
  if (!value || typeof value !== "object") throw new Error("文件不是有效的学习状态对象。");
  const state = value as Partial<LearningState>;
  if (typeof state.schema_version !== "string") throw new Error("缺少 schema_version。");
  const major = Number(state.schema_version.split(".")[0]);
  if (!Number.isFinite(major) || major > 1) throw new Error("这个文件来自更新的主版本，当前前端不会擅自降级它。");
  if (!state.project || !state.roadmap || !Array.isArray(state.roadmap.units) || !Array.isArray(state.roadmap.phases)) throw new Error("项目或路线数据不完整。");
  if (!state.mastery || !Array.isArray(state.evidence) || !Array.isArray(state.weaknesses) || !Array.isArray(state.reviews)) throw new Error("掌握、证据或复习数据不完整。");
  const unitIds = new Set(state.roadmap.units.map((unit) => unit.id));
  if (Object.keys(state.mastery).some((id) => !unitIds.has(id))) throw new Error("掌握记录引用了不存在的学习单元。");
  return state as LearningState;
}

export function completeSqlSession(state: LearningState, input: { firstCorrect: boolean; firstReason: string; variantCorrect: boolean; variantReason: string; hintLevel: HintLevel }): LearningState {
  const next: LearningState = structuredClone(state);
  const timestamp = iso();
  const unitId = next.roadmap.units.some((unit) => unit.id === "unit_having") ? "unit_having" : next.resume.unit_id;
  const unit = next.roadmap.units.find((item) => item.id === unitId)!;
  const hasReason = input.firstReason.trim().length >= 8 && input.variantReason.trim().length >= 8;
  const clean = input.firstCorrect && input.variantCorrect && hasReason;
  const maxLevel = input.hintLevel === "worked-step" || input.hintLevel === "solution" ? 2 : clean ? 3 : input.firstCorrect || input.variantCorrect ? 2 : 1;
  const result: AttemptResult = clean ? "pass" : maxLevel >= 2 ? "partial" : "fail";
  const evidenceId = uid("ev");
  next.evidence.unshift({
    id: evidenceId,
    unit_id: unitId,
    capability: unit.capability,
    evidence_type: maxLevel >= 3 ? "application" : maxLevel === 2 ? "explanation" : "recall",
    result,
    hint_level: input.hintLevel,
    summary: clean ? "独立区分行级筛选与聚合后筛选，并在变式场景中正确应用。" : "已完成边界诊断；仍需一次无关键提示的干净验证。",
    level_supported: maxLevel,
    verification_method: "更换业务表述的变式题",
    timestamp,
  });
  const old = next.mastery[unitId];
  const newLevel = Math.max(old?.level ?? 0, maxLevel);
  next.mastery[unitId] = {
    level: newLevel,
    confidence: clean ? Math.max(old?.confidence ?? 0, input.hintLevel === "none" ? 0.78 : 0.72) : Math.max(old?.confidence ?? 0, 0.56),
    target_level: old?.target_level ?? next.project.target_level,
    evidence_ids: [evidenceId, ...(old?.evidence_ids ?? [])],
    last_checked_at: timestamp,
    status: newLevel >= (old?.target_level ?? next.project.target_level) ? "mastered" : "review",
  };
  const weakness = next.weaknesses.find((item) => item.unit_id === unitId);
  if (weakness) {
    weakness.evidence_ids.unshift(evidenceId);
    weakness.updated_at = timestamp;
    weakness.status = clean ? "monitoring" : "open";
    if (!clean) weakness.recurrence_count += 1;
  } else if (!clean) {
    next.weaknesses.unshift({ id: uid("weak"), unit_id: unitId, status: "open", observation: "行级筛选与聚合后筛选的边界尚不稳定。", likely_cause: "逻辑执行顺序尚未形成可迁移模型。", diagnostic_confidence: 0.75, intervention: "用最小对比题后，再完成一次更换字段与业务目标的验证。", closure_condition: "无关键提示完成一次解释和一次变式应用。", recurrence_count: 1, evidence_ids: [evidenceId], created_at: timestamp, updated_at: timestamp });
  }
  const interval = clean ? 7 : 1;
  next.reviews.unshift({ id: uid("rev"), unit_id: unitId, due_date: day(interval), priority: clean ? "medium" : "high", reason: clean ? "确认这次掌握能够保持。" : "当前证据仍不稳定，需要短间隔重试。", status: "pending", interval_days: interval, stability_count: clean ? 1 : 0, result_history: [{ result, date: day(0) }] });
  next.sessions.unshift({ id: uid("ses"), unit_id: unitId, started_at: timestamp, completed_at: timestamp, summary: clean ? "完成 WHERE / HAVING 边界诊断与变式验证。" : "完成诊断，保留一个待关闭的边界薄弱点。", result });
  const nextUnit = next.roadmap.units.find((item) => (next.mastery[item.id]?.level ?? 0) < (next.mastery[item.id]?.target_level ?? next.project.target_level));
  next.resume = { unit_id: nextUnit?.id ?? unitId, next_action: clean ? (nextUnit ? `继续验证「${nextUnit.title}」的独立应用能力。` : "用一个更陌生的情境检查迁移能力。") : "隔一天后，不看本次解释，重新完成一组 WHERE / HAVING 变式题。", updated_at: timestamp };
  next.updated_at = timestamp;
  return next;
}
