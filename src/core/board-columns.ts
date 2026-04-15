export const BACKLOG_COLUMN_ID = "backlog";
export const IN_PROGRESS_COLUMN_ID = "in_progress";
export const REVIEW_COLUMN_ID = "review";
export const TRASH_COLUMN_ID = "trash";

export type BoardColumnKind = "backlog" | "in_progress" | "automation_stage" | "review" | "trash";
export type BoardColumnTone = "default" | "accent" | "blue" | "green" | "orange" | "purple" | "red" | "gold";

export interface BoardColumnAutomationDefinition {
	promptTemplateDefault: string;
	failurePromptTemplateDefault: string;
	passSignal: string;
	failSignal: string;
	completionMode?: "signal" | "always_pass";
	passTargetColumnId?: string;
	failTargetColumnId?: string;
	legacyPromptTemplateKey?: string;
	legacyFailurePromptTemplateKey?: string;
}

export interface BoardColumnDefinition {
	id: string;
	title: string;
	shortLabel: string;
	kind: BoardColumnKind;
	tone: BoardColumnTone;
	automation?: BoardColumnAutomationDefinition;
}

const BOARD_BASE_COLUMN_DEFINITIONS: readonly BoardColumnDefinition[] = [
	{
		id: BACKLOG_COLUMN_ID,
		title: "Backlog",
		shortLabel: "B",
		kind: "backlog",
		tone: "default",
	},
	{
		id: IN_PROGRESS_COLUMN_ID,
		title: "In Progress",
		shortLabel: "IP",
		kind: "in_progress",
		tone: "accent",
	},
] as const;

export const TEST_STAGE_FAILED_SIGNAL = "TEST FAILED";
export const TEST_STAGE_PASSED_SIGNAL = "TEST PASSED";
export const CODE_REVIEW_STAGE_FAILED_SIGNAL = "CODE REVIEW FAILED";
export const CODE_REVIEW_STAGE_PASSED_SIGNAL = "CODE REVIEW PASSED";
export const DOCS_OPTIMIZATION_STAGE_FAILED_SIGNAL = "DOCS OPTIMIZATION FAILED";
export const DOCS_OPTIMIZATION_STAGE_PASSED_SIGNAL = "DOCS OPTIMIZATION COMPLETE";

const DEFAULT_TEST_STAGE_PROMPT_TEMPLATE = `Run the project's tests relevant to the task and evaluate the result.

Rules:
- Execute the best available automated tests for the changed behavior.
- Include the exact test command(s) used.
- If any test fails, your final line must include: ${TEST_STAGE_FAILED_SIGNAL}
- If tests pass, your final line must include: ${TEST_STAGE_PASSED_SIGNAL}

Return:
- Short summary of what was tested
- Key failures, if any
- Final line with either ${TEST_STAGE_FAILED_SIGNAL} or ${TEST_STAGE_PASSED_SIGNAL}`;

const DEFAULT_TEST_STAGE_FAILURE_PROMPT_TEMPLATE = `Tests failed. Investigate and fix the failing tests.

Steps:
1. Reproduce the failure.
2. Apply the minimal code changes needed to make tests pass.
3. Re-run the relevant tests.
4. Summarize what failed and what was fixed.

When finished, hand off for another test run.`;

const DEFAULT_CODE_REVIEW_STAGE_PROMPT_TEMPLATE = `Run the /review skill against the current task changes.

Rules:
- Treat any finding labeled "blocker" or "should fix" as a failing result.
- Summarize those blocker/should-fix findings clearly if any exist.
- If blocker/should-fix findings exist, your final line must include: ${CODE_REVIEW_STAGE_FAILED_SIGNAL}
- If no blocker/should-fix findings exist, your final line must include: ${CODE_REVIEW_STAGE_PASSED_SIGNAL}

Return:
- Short summary of the review
- Blocker/should-fix findings that must be addressed, if any
- Final line with either ${CODE_REVIEW_STAGE_FAILED_SIGNAL} or ${CODE_REVIEW_STAGE_PASSED_SIGNAL}`;

const DEFAULT_CODE_REVIEW_STAGE_FAILURE_PROMPT_TEMPLATE = `Code review found blocker or should-fix feedback.

Steps:
1. Review the blocker and should-fix findings carefully.
2. Apply the minimal code changes needed to address them.
3. Re-check your work so the task is ready for another /review pass.
4. Summarize what you fixed.

When finished, hand off for another code review run.`;

const DEFAULT_DOCS_OPTIMIZATION_STAGE_PROMPT_TEMPLATE = `Review the full task conversation and final implementation context as a learning pass for future agents.

Goal:
Identify documentation, AGENTS.md tribal knowledge, Codex/cloud skills, prompts, metadata, or workflow guidance that would have helped avoid confusion, rework, review findings, test failures, wrong assumptions, or slow investigation during this task.

Rules:
- Do not edit product code.
- Do not run the application.
- Do not run broad validation unless it is needed only to inspect documentation tooling.
- You may update documentation, AGENTS.md, skills, prompt templates, or metadata files when the improvement is concrete and high-signal.
- Do not add obvious or generic advice.
- Prefer small, durable notes that a future AI agent can act on.
- If no worthwhile documentation or metadata improvement exists, explain that briefly and make no file changes.

Process:
1. Inspect the task conversation, review feedback, test/debug notes, and final outcome.
2. Identify preventable friction: missing context, undocumented conventions, surprising files, non-obvious workflows, or repeated mistakes.
3. Apply focused documentation/metadata updates only where they would materially improve future agent performance.
4. Summarize what was learned and what, if anything, was updated.

Return:
- Preventable issues found
- Documentation/skill/metadata updates made, if any
- Remaining recommendations, if any`;

const DEFAULT_DOCS_OPTIMIZATION_STAGE_FAILURE_PROMPT_TEMPLATE = `The documentation optimization pass did not complete cleanly.

Summarize what prevented the pass from completing, then hand off for review without changing product code.`;

export const BOARD_STAGE_COLUMN_DEFINITIONS: readonly BoardColumnDefinition[] = [
	{
		id: "test",
		title: "Test",
		shortLabel: "TS",
		kind: "automation_stage",
		tone: "orange",
		automation: {
			promptTemplateDefault: DEFAULT_TEST_STAGE_PROMPT_TEMPLATE,
			failurePromptTemplateDefault: DEFAULT_TEST_STAGE_FAILURE_PROMPT_TEMPLATE,
			passSignal: TEST_STAGE_PASSED_SIGNAL,
			failSignal: TEST_STAGE_FAILED_SIGNAL,
			completionMode: "signal",
			legacyPromptTemplateKey: "testPromptTemplate",
			legacyFailurePromptTemplateKey: "testFailurePromptTemplate",
		},
	},
	{
		id: "code_review",
		title: "Code Review",
		shortLabel: "CR",
		kind: "automation_stage",
		tone: "blue",
		automation: {
			promptTemplateDefault: DEFAULT_CODE_REVIEW_STAGE_PROMPT_TEMPLATE,
			failurePromptTemplateDefault: DEFAULT_CODE_REVIEW_STAGE_FAILURE_PROMPT_TEMPLATE,
			passSignal: CODE_REVIEW_STAGE_PASSED_SIGNAL,
			failSignal: CODE_REVIEW_STAGE_FAILED_SIGNAL,
			completionMode: "signal",
			legacyPromptTemplateKey: "codeReviewPromptTemplate",
			legacyFailurePromptTemplateKey: "codeReviewFailurePromptTemplate",
		},
	},
	{
		id: "docs_optimization",
		title: "Docs Optimization",
		shortLabel: "DO",
		kind: "automation_stage",
		tone: "purple",
		automation: {
			promptTemplateDefault: DEFAULT_DOCS_OPTIMIZATION_STAGE_PROMPT_TEMPLATE,
			failurePromptTemplateDefault: DEFAULT_DOCS_OPTIMIZATION_STAGE_FAILURE_PROMPT_TEMPLATE,
			passSignal: DOCS_OPTIMIZATION_STAGE_PASSED_SIGNAL,
			failSignal: DOCS_OPTIMIZATION_STAGE_FAILED_SIGNAL,
			completionMode: "always_pass",
		},
	},
] as const;

const BOARD_FINAL_COLUMN_DEFINITIONS: readonly BoardColumnDefinition[] = [
	{
		id: REVIEW_COLUMN_ID,
		title: "Review",
		shortLabel: "R",
		kind: "review",
		tone: "green",
	},
	{
		id: TRASH_COLUMN_ID,
		title: "Trash",
		shortLabel: "T",
		kind: "trash",
		tone: "red",
	},
] as const;

export const BOARD_COLUMN_DEFINITIONS: readonly BoardColumnDefinition[] = [
	...BOARD_BASE_COLUMN_DEFINITIONS,
	...BOARD_STAGE_COLUMN_DEFINITIONS,
	...BOARD_FINAL_COLUMN_DEFINITIONS,
] as const;

export const BOARD_COLUMN_IDS = BOARD_COLUMN_DEFINITIONS.map((column) => column.id);

const BOARD_COLUMN_ID_SET = new Set<string>(BOARD_COLUMN_IDS);
const BOARD_COLUMN_BY_ID = new Map<string, BoardColumnDefinition>(
	BOARD_COLUMN_DEFINITIONS.map((column) => [column.id, column]),
);

export function getBoardColumnDefinitions(): readonly BoardColumnDefinition[] {
	return BOARD_COLUMN_DEFINITIONS;
}

export function getBoardStageColumnDefinitions(): readonly BoardColumnDefinition[] {
	return BOARD_STAGE_COLUMN_DEFINITIONS;
}

export function getAutomatedBoardStageColumnDefinitions(): readonly BoardColumnDefinition[] {
	return BOARD_STAGE_COLUMN_DEFINITIONS.filter((column) => column.automation !== undefined);
}

export function getBoardColumnDefinition(columnId: string | null | undefined): BoardColumnDefinition | null {
	if (!columnId) {
		return null;
	}
	return BOARD_COLUMN_BY_ID.get(columnId) ?? null;
}

export function isBoardColumnId(value: string | null | undefined): value is string {
	return typeof value === "string" && BOARD_COLUMN_ID_SET.has(value);
}

export function normalizeBoardColumnId(value: string | null | undefined): string | null {
	return isBoardColumnId(value) ? value : null;
}

export function isBacklogColumnId(columnId: string | null | undefined): boolean {
	return columnId === BACKLOG_COLUMN_ID;
}

export function isInProgressColumnId(columnId: string | null | undefined): boolean {
	return columnId === IN_PROGRESS_COLUMN_ID;
}

export function isReviewColumnId(columnId: string | null | undefined): boolean {
	return columnId === REVIEW_COLUMN_ID;
}

export function isTrashColumnId(columnId: string | null | undefined): boolean {
	return columnId === TRASH_COLUMN_ID;
}

export function isStageColumnId(columnId: string | null | undefined): boolean {
	return getBoardColumnDefinition(columnId)?.kind === "automation_stage";
}

export function isTaskWorkspaceColumnId(columnId: string | null | undefined): boolean {
	const definition = getBoardColumnDefinition(columnId);
	return definition !== null && definition.kind !== "backlog" && definition.kind !== "trash";
}

export function isDetailViewColumnId(columnId: string | null | undefined): boolean {
	return isTaskWorkspaceColumnId(columnId);
}

export function getBoardColumnOrderIndex(columnId: string | null | undefined): number | null {
	if (!columnId) {
		return null;
	}
	const index = BOARD_COLUMN_IDS.indexOf(columnId);
	return index === -1 ? null : index;
}

export function getWorkflowColumnIds(): readonly string[] {
	return BOARD_COLUMN_DEFINITIONS.filter((column) => column.kind !== "backlog" && column.kind !== "trash").map(
		(column) => column.id,
	);
}

export function getFirstPostInProgressColumnId(): string {
	const workflowColumnIds = getWorkflowColumnIds();
	const inProgressIndex = workflowColumnIds.indexOf(IN_PROGRESS_COLUMN_ID);
	return workflowColumnIds[inProgressIndex + 1] ?? REVIEW_COLUMN_ID;
}

export function getNextWorkflowColumnId(columnId: string): string | null {
	const workflowColumnIds = getWorkflowColumnIds();
	const columnIndex = workflowColumnIds.indexOf(columnId);
	if (columnIndex === -1) {
		return null;
	}
	return workflowColumnIds[columnIndex + 1] ?? null;
}

export function createEmptyProjectTaskCounts(): Record<string, number> {
	const counts: Record<string, number> = {};
	for (const column of BOARD_COLUMN_DEFINITIONS) {
		counts[column.id] = 0;
	}
	return counts;
}
