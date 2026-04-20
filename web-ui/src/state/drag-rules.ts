import {
	BACKLOG_COLUMN_ID,
	IN_PROGRESS_COLUMN_ID,
	isStageColumnId,
	isTaskWorkspaceColumnId,
	PLAN_COLUMN_ID,
	REVIEW_COLUMN_ID,
	TRASH_COLUMN_ID,
} from "@runtime-board-columns";
import type { BoardColumn, BoardColumnId } from "@/types";

export interface ProgrammaticCardMoveInFlight {
	taskId: string;
	fromColumnId: BoardColumnId;
	toColumnId: BoardColumnId;
	insertAtTop: boolean;
}

function isMatchingProgrammaticCardMove(
	taskId: string | null | undefined,
	fromColumnId: BoardColumnId,
	toColumnId: BoardColumnId,
	programmaticCardMoveInFlight?: ProgrammaticCardMoveInFlight | null,
): boolean {
	return (
		taskId !== null &&
		taskId !== undefined &&
		programmaticCardMoveInFlight?.taskId === taskId &&
		programmaticCardMoveInFlight.fromColumnId === fromColumnId &&
		programmaticCardMoveInFlight.toColumnId === toColumnId
	);
}

export function isAllowedCrossColumnCardMove(
	fromColumnId: BoardColumnId,
	toColumnId: BoardColumnId,
	options?: {
		taskId?: string | null;
		programmaticCardMoveInFlight?: ProgrammaticCardMoveInFlight | null;
	},
): boolean {
	if (fromColumnId === BACKLOG_COLUMN_ID && toColumnId === PLAN_COLUMN_ID) {
		return true;
	}
	if (toColumnId === TRASH_COLUMN_ID && fromColumnId !== TRASH_COLUMN_ID) {
		return true;
	}
	if (fromColumnId === TRASH_COLUMN_ID && toColumnId === REVIEW_COLUMN_ID) {
		return true;
	}
	if (isTaskWorkspaceColumnId(fromColumnId) && isTaskWorkspaceColumnId(toColumnId)) {
		return isMatchingProgrammaticCardMove(
			options?.taskId,
			fromColumnId,
			toColumnId,
			options?.programmaticCardMoveInFlight,
		);
	}
	return false;
}

export function findCardColumnId(columns: ReadonlyArray<BoardColumn>, taskId: string): BoardColumnId | null {
	for (const column of columns) {
		if (column.cards.some((card) => card.id === taskId)) {
			return column.id;
		}
	}
	return null;
}

export function isCardDropDisabled(
	columnId: BoardColumnId,
	activeDragSourceColumnId: BoardColumnId | null,
	options?: {
		activeDragTaskId?: string | null;
		programmaticCardMoveInFlight?: ProgrammaticCardMoveInFlight | null;
	},
): boolean {
	if (!activeDragSourceColumnId) {
		return false;
	}
	if (isStageColumnId(columnId) || columnId === REVIEW_COLUMN_ID) {
		return !isAllowedCrossColumnCardMove(activeDragSourceColumnId, columnId, {
			taskId: options?.activeDragTaskId,
			programmaticCardMoveInFlight: options?.programmaticCardMoveInFlight,
		});
	}
	if (isTaskWorkspaceColumnId(columnId) && columnId !== IN_PROGRESS_COLUMN_ID) {
		return !isAllowedCrossColumnCardMove(activeDragSourceColumnId, columnId, {
			taskId: options?.activeDragTaskId,
			programmaticCardMoveInFlight: options?.programmaticCardMoveInFlight,
		});
	}
	if (columnId === BACKLOG_COLUMN_ID) {
		return activeDragSourceColumnId !== BACKLOG_COLUMN_ID;
	}
	if (columnId === IN_PROGRESS_COLUMN_ID) {
		if (activeDragSourceColumnId === IN_PROGRESS_COLUMN_ID) {
			return false;
		}
		return !isAllowedCrossColumnCardMove(activeDragSourceColumnId, columnId, {
			taskId: options?.activeDragTaskId,
			programmaticCardMoveInFlight: options?.programmaticCardMoveInFlight,
		});
	}
	if (columnId === TRASH_COLUMN_ID) {
		return activeDragSourceColumnId === TRASH_COLUMN_ID;
	}
	return false;
}
