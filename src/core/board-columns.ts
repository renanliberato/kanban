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

export const BOARD_STAGE_COLUMN_DEFINITIONS: readonly BoardColumnDefinition[] = [];

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
