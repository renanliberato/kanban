import { getBoardColumnDefinitions } from "@runtime-board-columns";
import type { BoardColumn, BoardColumnId, BoardData } from "@/types";

function createEmptyColumn(id: BoardColumnId, title: string): BoardColumn {
	return {
		id,
		title,
		cards: [],
	};
}

export function createInitialBoardData(): BoardData {
	return {
		columns: getBoardColumnDefinitions().map((column) => createEmptyColumn(column.id, column.title)),
		dependencies: [],
	};
}
