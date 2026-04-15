import { type BoardColumnTone, getBoardColumnDefinitions } from "@runtime-board-columns";

const columnIndicatorColorByTone: Record<BoardColumnTone, string> = {
	default: "var(--color-text-primary)",
	accent: "var(--color-accent)",
	blue: "var(--color-status-blue)",
	green: "var(--color-status-green)",
	orange: "var(--color-status-orange)",
	purple: "var(--color-status-purple)",
	red: "var(--color-status-red)",
	gold: "var(--color-status-gold)",
};

export const columnIndicatorColors: Record<string, string> = Object.fromEntries(
	getBoardColumnDefinitions().map((column) => [column.id, columnIndicatorColorByTone[column.tone]]),
);

export const columnBackgroundColors: Record<string, string> = Object.fromEntries(
	getBoardColumnDefinitions().map((column) => [column.id, "var(--color-surface-0)"]),
);
