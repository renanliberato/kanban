import { act, type Dispatch, type SetStateAction, useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useBoardInteractions } from "@/hooks/use-board-interactions";
import type { UseTaskSessionsResult } from "@/hooks/use-task-sessions";
import type { RuntimeStageAutomationPromptConfig, RuntimeTaskSessionSummary } from "@/runtime/types";
import type { SendTerminalInputOptions } from "@/terminal/terminal-input";
import type { BoardCard, BoardData } from "@/types";

const notifyErrorMock = vi.hoisted(() => vi.fn());
const showAppToastMock = vi.hoisted(() => vi.fn());
const useLinkedBacklogTaskActionsMock = vi.hoisted(() => vi.fn());
const useProgrammaticCardMovesMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/app-toaster", () => ({
	notifyError: notifyErrorMock,
	showAppToast: showAppToastMock,
}));

vi.mock("@/hooks/use-linked-backlog-task-actions", () => ({
	useLinkedBacklogTaskActions: useLinkedBacklogTaskActionsMock,
}));

vi.mock("@/hooks/use-programmatic-card-moves", () => ({
	useProgrammaticCardMoves: useProgrammaticCardMovesMock,
}));

vi.mock("@/hooks/use-review-auto-actions", () => ({
	useReviewAutoActions: () => ({}) as ReturnType<typeof useBoardInteractions>,
}));

function createTask(taskId: string, prompt: string, createdAt: number): BoardCard {
	return {
		id: taskId,
		title: prompt,
		prompt,
		startInPlanMode: false,
		autoReviewEnabled: false,
		autoReviewMode: "commit",
		baseRef: "main",
		createdAt,
		updatedAt: createdAt,
	};
}

function createBoard(): BoardData {
	return {
		columns: [
			{
				id: "backlog",
				title: "Backlog",
				cards: [createTask("task-1", "Backlog task", 1)],
			},
			{ id: "in_progress", title: "In Progress", cards: [] },
			{ id: "review", title: "Review", cards: [] },
			{ id: "trash", title: "Trash", cards: [] },
		],
		dependencies: [],
	};
}

const NOOP_STOP_SESSION = async (): Promise<void> => {};
const NOOP_CLEANUP_WORKSPACE = async (): Promise<null> => null;
const NOOP_FETCH_WORKSPACE_INFO = async (): Promise<null> => null;
const NOOP_SEND_TASK_INPUT = async (): Promise<{ ok: boolean }> => ({ ok: true });
const NOOP_RUN_AUTO_REVIEW = async (): Promise<boolean> => false;

interface HookSnapshot {
	board?: BoardData;
	setSessions?: Dispatch<SetStateAction<Record<string, RuntimeTaskSessionSummary>>>;
	handleRestoreTaskFromTrash: (taskId: string) => void;
	handleStartTask: (taskId: string) => void;
	handleCardSelect: (taskId: string) => void;
}

function createRect(width: number, height: number): DOMRect {
	return {
		x: 0,
		y: 0,
		left: 0,
		top: 0,
		width,
		height,
		right: width,
		bottom: height,
		toJSON: () => ({}),
	} as DOMRect;
}

function HookHarness({
	board,
	setBoard,
	ensureTaskWorkspace,
	startTaskSession,
	selectedCard = null,
	setSelectedTaskIdOverride,
	onSnapshot,
}: {
	board: BoardData;
	setBoard: Dispatch<SetStateAction<BoardData>>;
	ensureTaskWorkspace: UseTaskSessionsResult["ensureTaskWorkspace"];
	startTaskSession: UseTaskSessionsResult["startTaskSession"];
	selectedCard?: { card: BoardCard; column: { id: "backlog" | "in_progress" | "review" | "trash" } } | null;
	setSelectedTaskIdOverride?: Dispatch<SetStateAction<string | null>>;
	onSnapshot?: (snapshot: HookSnapshot) => void;
}): null {
	const [sessions, setSessions] = useState<Record<string, RuntimeTaskSessionSummary>>({});
	const [, setSelectedTaskId] = useState<string | null>(null);
	const [, setIsClearTrashDialogOpen] = useState(false);
	const [, setIsGitHistoryOpen] = useState(false);

	const actions = useBoardInteractions({
		board,
		setBoard,
		sessions,
		setSessions,
		selectedCard,
		selectedTaskId: null,
		currentProjectId: "project-1",
		setSelectedTaskId: setSelectedTaskIdOverride ?? setSelectedTaskId,
		setIsClearTrashDialogOpen,
		setIsGitHistoryOpen,
		stopTaskSession: NOOP_STOP_SESSION,
		cleanupTaskWorkspace: NOOP_CLEANUP_WORKSPACE,
		ensureTaskWorkspace,
		startTaskSession,
		fetchTaskWorkspaceInfo: NOOP_FETCH_WORKSPACE_INFO,
		sendTaskSessionInput: NOOP_SEND_TASK_INPUT,
		readyForReviewNotificationsEnabled: false,
		taskGitActionLoadingByTaskId: {},
		runAutoReviewGitAction: NOOP_RUN_AUTO_REVIEW,
	});

	useEffect(() => {
		onSnapshot?.({
			handleRestoreTaskFromTrash: actions.handleRestoreTaskFromTrash,
			handleStartTask: actions.handleStartTask,
			handleCardSelect: actions.handleCardSelect,
		});
	}, [actions.handleCardSelect, actions.handleRestoreTaskFromTrash, actions.handleStartTask, onSnapshot]);

	return null;
}

function createAwaitingReviewSession(
	taskId: string,
	updatedAt: number,
	finalMessage: string,
): RuntimeTaskSessionSummary {
	return {
		taskId,
		state: "awaiting_review",
		agentId: "codex",
		workspacePath: `/tmp/${taskId}`,
		pid: 123,
		startedAt: 1,
		updatedAt,
		lastOutputAt: updatedAt,
		reviewReason: "hook",
		exitCode: null,
		lastHookAt: updatedAt,
		latestHookActivity: {
			activityText: null,
			toolName: null,
			toolInputSummary: null,
			finalMessage,
			hookEventName: null,
			notificationType: null,
			source: null,
		},
		warningMessage: null,
	};
}

const QA_STAGE_PROMPT: RuntimeStageAutomationPromptConfig = {
	columnId: "qa",
	title: "QA",
	promptTemplate: "run qa",
	failurePromptTemplate: "fix qa",
	promptTemplateDefault: "run qa",
	failurePromptTemplateDefault: "fix qa",
	passSignal: "QA PASSED",
	failSignal: "QA FAILED",
	passTargetColumnId: "security_review",
	failTargetColumnId: "in_progress",
};

const SECURITY_REVIEW_STAGE_PROMPT: RuntimeStageAutomationPromptConfig = {
	columnId: "security_review",
	title: "Security Review",
	promptTemplate: "run security review",
	failurePromptTemplate: "fix security review",
	promptTemplateDefault: "run security review",
	failurePromptTemplateDefault: "fix security review",
	passSignal: "SECURITY REVIEW PASSED",
	failSignal: "SECURITY REVIEW FAILED",
	passTargetColumnId: "review",
	failTargetColumnId: "in_progress",
};

function createStageBoard(columnId: string, task: BoardCard): BoardData {
	return {
		columns: [
			{ id: "backlog", title: "Backlog", cards: [] },
			{ id: "in_progress", title: "In Progress", cards: columnId === "in_progress" ? [task] : [] },
			{ id: "qa", title: "QA", cards: columnId === "qa" ? [task] : [] },
			{
				id: "security_review",
				title: "Security Review",
				cards: columnId === "security_review" ? [task] : [],
			},
			{ id: "review", title: "Review", cards: columnId === "review" ? [task] : [] },
			{ id: "trash", title: "Trash", cards: columnId === "trash" ? [task] : [] },
		],
		dependencies: [],
	};
}

function SessionTransitionHarness({
	initialBoard,
	initialSessions,
	sendTaskSessionInput,
	stageAutomationPrompts,
	onSnapshot,
}: {
	initialBoard: BoardData;
	initialSessions: Record<string, RuntimeTaskSessionSummary>;
	sendTaskSessionInput: (
		taskId: string,
		input: string,
		options?: SendTerminalInputOptions,
	) => Promise<{ ok: boolean; message?: string }>;
	stageAutomationPrompts: readonly RuntimeStageAutomationPromptConfig[];
	onSnapshot: (snapshot: HookSnapshot) => void;
}): null {
	const [board, setBoard] = useState<BoardData>(initialBoard);
	const [sessions, setSessions] = useState<Record<string, RuntimeTaskSessionSummary>>(initialSessions);
	const [, setSelectedTaskId] = useState<string | null>(null);
	const [, setIsClearTrashDialogOpen] = useState(false);
	const [, setIsGitHistoryOpen] = useState(false);

	useBoardInteractions({
		board,
		setBoard,
		sessions,
		setSessions,
		selectedCard: null,
		selectedTaskId: null,
		currentProjectId: "project-1",
		setSelectedTaskId,
		setIsClearTrashDialogOpen,
		setIsGitHistoryOpen,
		stopTaskSession: NOOP_STOP_SESSION,
		cleanupTaskWorkspace: NOOP_CLEANUP_WORKSPACE,
		ensureTaskWorkspace: async () => ({ ok: true }),
		startTaskSession: async () => ({ ok: true }),
		fetchTaskWorkspaceInfo: NOOP_FETCH_WORKSPACE_INFO,
		sendTaskSessionInput,
		readyForReviewNotificationsEnabled: false,
		stageAutomationPrompts,
		taskGitActionLoadingByTaskId: {},
		runAutoReviewGitAction: NOOP_RUN_AUTO_REVIEW,
	});

	useEffect(() => {
		onSnapshot({
			board,
			setSessions,
			handleRestoreTaskFromTrash: () => {},
			handleStartTask: () => {},
			handleCardSelect: () => {},
		});
	}, [board, onSnapshot, setSessions]);

	return null;
}

function mockBoardSessionDependencies(): void {
	useProgrammaticCardMovesMock.mockReturnValue({
		handleProgrammaticCardMoveReady: () => {},
		setRequestMoveTaskToTrashHandler: () => {},
		tryProgrammaticCardMove: () => "unavailable" as const,
		consumeProgrammaticCardMove: () => ({}),
		resolvePendingProgrammaticTrashMove: () => {},
		waitForProgrammaticCardMoveAvailability: async () => {},
		resetProgrammaticCardMoves: () => {},
		requestMoveTaskToTrashWithAnimation: async () => {},
		programmaticCardMoveCycle: 0,
	});
	useLinkedBacklogTaskActionsMock.mockReturnValue({
		handleCreateDependency: () => {},
		handleDeleteDependency: () => {},
		confirmMoveTaskToTrash: async () => {},
		requestMoveTaskToTrash: async () => {},
	});
}

describe("useBoardInteractions", () => {
	let container: HTMLDivElement;
	let root: Root;
	let previousActEnvironment: boolean | undefined;

	beforeEach(() => {
		vi.useFakeTimers();
		vi.spyOn(performance, "now").mockImplementation(() => Date.now());
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback) => {
			return window.setTimeout(() => {
				callback(performance.now());
			}, 16);
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation((handle: number) => {
			window.clearTimeout(handle);
		});
		notifyErrorMock.mockReset();
		showAppToastMock.mockReset();
		useLinkedBacklogTaskActionsMock.mockReset();
		useProgrammaticCardMovesMock.mockReset();
		previousActEnvironment = (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
			.IS_REACT_ACT_ENVIRONMENT;
		(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
		container = document.createElement("div");
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(() => {
		act(() => {
			root.unmount();
		});
		vi.restoreAllMocks();
		vi.useRealTimers();
		container.remove();
		if (previousActEnvironment === undefined) {
			delete (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
		} else {
			(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
				previousActEnvironment;
		}
	});

	it("starts dependency-unblocked tasks even when setBoard updater is deferred", async () => {
		let startBacklogTaskWithAnimation: ((task: BoardCard) => Promise<boolean>) | null = null;

		useProgrammaticCardMovesMock.mockReturnValue({
			handleProgrammaticCardMoveReady: () => {},
			setRequestMoveTaskToTrashHandler: () => {},
			tryProgrammaticCardMove: () => "unavailable",
			consumeProgrammaticCardMove: () => ({}),
			resolvePendingProgrammaticTrashMove: () => {},
			waitForProgrammaticCardMoveAvailability: async () => {},
			resetProgrammaticCardMoves: () => {},
			requestMoveTaskToTrashWithAnimation: async () => {},
			programmaticCardMoveCycle: 0,
		});

		useLinkedBacklogTaskActionsMock.mockImplementation(
			(input: { startBacklogTaskWithAnimation?: (task: BoardCard) => Promise<boolean> }) => {
				startBacklogTaskWithAnimation = input.startBacklogTaskWithAnimation ?? null;
				return {
					handleCreateDependency: () => {},
					handleDeleteDependency: () => {},
					confirmMoveTaskToTrash: async () => {},
					requestMoveTaskToTrash: async () => {},
				};
			},
		);

		const board = createBoard();
		const setBoard = vi.fn<Dispatch<SetStateAction<BoardData>>>((_nextBoard) => {
			// Simulate React deferring state updater execution.
		});
		const ensureTaskWorkspace = vi.fn(async () => ({
			ok: true as const,
			response: {
				ok: true as const,
				path: "/tmp/task-1",
				baseRef: "main",
				baseCommit: "abc123",
			},
		}));
		const startTaskSession = vi.fn(async () => ({ ok: true as const }));

		await act(async () => {
			root.render(
				<HookHarness
					board={board}
					setBoard={setBoard}
					ensureTaskWorkspace={ensureTaskWorkspace}
					startTaskSession={startTaskSession}
				/>,
			);
		});

		if (!startBacklogTaskWithAnimation) {
			throw new Error("Expected startBacklogTaskWithAnimation to be provided.");
		}

		const backlogTask = board.columns[0]?.cards[0];
		if (!backlogTask) {
			throw new Error("Expected a backlog task.");
		}

		let started = false;
		await act(async () => {
			started = await startBacklogTaskWithAnimation!(backlogTask);
		});

		expect(started).toBe(true);
		expect(ensureTaskWorkspace).toHaveBeenCalledWith(backlogTask);
		expect(startTaskSession).toHaveBeenCalledWith(backlogTask);
	});

	it("keeps the original in-progress to review transition when no stage automation is configured", async () => {
		let latestSnapshot: HookSnapshot | null = null;
		const sendTaskSessionInput = vi.fn(async () => ({ ok: true as const }));
		mockBoardSessionDependencies();

		const task = createTask("task-1", "Task", 1);
		const board: BoardData = {
			columns: [
				{ id: "backlog", title: "Backlog", cards: [] },
				{ id: "in_progress", title: "In Progress", cards: [task] },
				{ id: "review", title: "Review", cards: [] },
				{ id: "trash", title: "Trash", cards: [] },
			],
			dependencies: [],
		};

		await act(async () => {
			root.render(
				<SessionTransitionHarness
					initialBoard={board}
					initialSessions={{ "task-1": createAwaitingReviewSession("task-1", 10, "Done") }}
					sendTaskSessionInput={sendTaskSessionInput}
					stageAutomationPrompts={[]}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		const latestBoard: BoardData | null = (latestSnapshot as HookSnapshot | null)?.board ?? null;
		expect(latestBoard?.columns.find((column) => column.id === "review")?.cards[0]?.id).toBe("task-1");
		expect(sendTaskSessionInput).not.toHaveBeenCalled();
	});

	it("moves awaiting-review in-progress tasks to the first configured stage and sends its prompt", async () => {
		let latestSnapshot: HookSnapshot | null = null;
		const sendTaskSessionInput = vi.fn(async () => ({ ok: true as const }));
		mockBoardSessionDependencies();

		const task = createTask("task-1", "Task", 1);
		await act(async () => {
			root.render(
				<SessionTransitionHarness
					initialBoard={createStageBoard("in_progress", task)}
					initialSessions={{ "task-1": createAwaitingReviewSession("task-1", 10, "Done") }}
					sendTaskSessionInput={sendTaskSessionInput}
					stageAutomationPrompts={[QA_STAGE_PROMPT, SECURITY_REVIEW_STAGE_PROMPT]}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		const latestBoard: BoardData | null = (latestSnapshot as HookSnapshot | null)?.board ?? null;
		expect(latestBoard?.columns.find((column) => column.id === "qa")?.cards[0]?.id).toBe("task-1");
		await act(async () => {
			vi.advanceTimersByTime(200);
			await Promise.resolve();
		});
		expect(sendTaskSessionInput).toHaveBeenCalledWith("task-1", "run qa", {
			appendNewline: false,
			mode: "paste",
		});
		expect(sendTaskSessionInput).toHaveBeenCalledWith("task-1", "\r", { appendNewline: false });
	});

	it("does not auto-progress a stage on the same completion that entered it", async () => {
		let latestSnapshot: HookSnapshot | null = null;
		const sendTaskSessionInput = vi.fn(async () => ({ ok: true as const }));
		mockBoardSessionDependencies();

		const task = createTask("task-1", "Task", 1);
		await act(async () => {
			root.render(
				<SessionTransitionHarness
					initialBoard={createStageBoard("qa", task)}
					initialSessions={{ "task-1": createAwaitingReviewSession("task-1", 10, "QA FAILED") }}
					sendTaskSessionInput={sendTaskSessionInput}
					stageAutomationPrompts={[QA_STAGE_PROMPT, SECURITY_REVIEW_STAGE_PROMPT]}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		const latestBoard: BoardData | null = (latestSnapshot as HookSnapshot | null)?.board ?? null;
		expect(latestBoard?.columns.find((column) => column.id === "qa")?.cards[0]?.id).toBe("task-1");
		expect(latestBoard?.columns.find((column) => column.id === "in_progress")?.cards[0]?.id).toBeUndefined();
	});

	it("keeps staged tasks in place until the final line has an explicit pass or fail signal", async () => {
		let latestBoard: BoardData | null = null;
		let latestSetSessions: Dispatch<SetStateAction<Record<string, RuntimeTaskSessionSummary>>> | null = null;
		const sendTaskSessionInput = vi.fn(async () => ({ ok: true as const }));
		mockBoardSessionDependencies();

		const task = createTask("task-1", "Task", 1);
		const initialSession = createAwaitingReviewSession("task-1", 10, "Done");
		await act(async () => {
			root.render(
				<SessionTransitionHarness
					initialBoard={createStageBoard("qa", task)}
					initialSessions={{ "task-1": initialSession }}
					sendTaskSessionInput={sendTaskSessionInput}
					stageAutomationPrompts={[QA_STAGE_PROMPT, SECURITY_REVIEW_STAGE_PROMPT]}
					onSnapshot={(snapshot) => {
						latestBoard = snapshot.board ?? null;
						latestSetSessions = snapshot.setSessions ?? null;
					}}
				/>,
			);
		});

		const setSessions = latestSetSessions as Dispatch<
			SetStateAction<Record<string, RuntimeTaskSessionSummary>>
		> | null;
		if (!setSessions) {
			throw new Error("Expected session setter.");
		}
		await act(async () => {
			setSessions({
				"task-1": createAwaitingReviewSession("task-1", 11, "QA PASSED\nbut not on final line"),
			});
		});

		const boardAfterUnsignaledUpdate = latestBoard as BoardData | null;
		expect(boardAfterUnsignaledUpdate?.columns.find((column) => column.id === "qa")?.cards[0]?.id).toBe("task-1");
		expect(
			boardAfterUnsignaledUpdate?.columns.find((column) => column.id === "security_review")?.cards[0]?.id,
		).toBeUndefined();
	});

	it("routes failed stages back to in progress and sends the failure prompt", async () => {
		let latestBoard: BoardData | null = null;
		let latestSetSessions: Dispatch<SetStateAction<Record<string, RuntimeTaskSessionSummary>>> | null = null;
		const sendTaskSessionInput = vi.fn(async () => ({ ok: true as const }));
		mockBoardSessionDependencies();

		const task = createTask("task-1", "Task", 1);
		await act(async () => {
			root.render(
				<SessionTransitionHarness
					initialBoard={createStageBoard("qa", task)}
					initialSessions={{ "task-1": createAwaitingReviewSession("task-1", 10, "Done") }}
					sendTaskSessionInput={sendTaskSessionInput}
					stageAutomationPrompts={[QA_STAGE_PROMPT, SECURITY_REVIEW_STAGE_PROMPT]}
					onSnapshot={(snapshot) => {
						latestBoard = snapshot.board ?? null;
						latestSetSessions = snapshot.setSessions ?? null;
					}}
				/>,
			);
		});

		const setSessions = latestSetSessions as Dispatch<
			SetStateAction<Record<string, RuntimeTaskSessionSummary>>
		> | null;
		if (!setSessions) {
			throw new Error("Expected session setter.");
		}
		await act(async () => {
			setSessions({
				"task-1": createAwaitingReviewSession("task-1", 11, "Needs work.\nQA FAILED"),
			});
		});

		const boardAfterFailure = latestBoard as BoardData | null;
		expect(boardAfterFailure?.columns.find((column) => column.id === "in_progress")?.cards[0]?.id).toBe("task-1");
		expect(boardAfterFailure?.columns.find((column) => column.id === "qa")?.cards[0]?.id).toBeUndefined();
		await act(async () => {
			vi.advanceTimersByTime(200);
			await Promise.resolve();
		});
		expect(sendTaskSessionInput).toHaveBeenCalledWith("task-1", "fix qa", {
			appendNewline: false,
			mode: "paste",
		});
	});

	it("advances through configured stages on pass signals", async () => {
		let latestBoard: BoardData | null = null;
		let latestSetSessions: Dispatch<SetStateAction<Record<string, RuntimeTaskSessionSummary>>> | null = null;
		const sendTaskSessionInput = vi.fn(async () => ({ ok: true as const }));
		mockBoardSessionDependencies();

		const task = createTask("task-1", "Task", 1);
		await act(async () => {
			root.render(
				<SessionTransitionHarness
					initialBoard={createStageBoard("qa", task)}
					initialSessions={{ "task-1": createAwaitingReviewSession("task-1", 10, "Done") }}
					sendTaskSessionInput={sendTaskSessionInput}
					stageAutomationPrompts={[QA_STAGE_PROMPT, SECURITY_REVIEW_STAGE_PROMPT]}
					onSnapshot={(snapshot) => {
						latestBoard = snapshot.board ?? null;
						latestSetSessions = snapshot.setSessions ?? null;
					}}
				/>,
			);
		});

		const setSessions = latestSetSessions as Dispatch<
			SetStateAction<Record<string, RuntimeTaskSessionSummary>>
		> | null;
		if (!setSessions) {
			throw new Error("Expected session setter.");
		}
		await act(async () => {
			setSessions({
				"task-1": createAwaitingReviewSession("task-1", 11, "All good.\nQA PASSED"),
			});
		});

		const boardAfterQaPass = latestBoard as BoardData | null;
		expect(boardAfterQaPass?.columns.find((column) => column.id === "security_review")?.cards[0]?.id).toBe("task-1");
		await act(async () => {
			vi.advanceTimersByTime(200);
			await Promise.resolve();
		});
		expect(sendTaskSessionInput).toHaveBeenCalledWith("task-1", "run security review", {
			appendNewline: false,
			mode: "paste",
		});

		await act(async () => {
			setSessions({
				"task-1": createAwaitingReviewSession("task-1", 12, "Clean.\nSECURITY REVIEW PASSED"),
			});
		});
		const boardAfterSecurityPass = latestBoard as BoardData | null;
		expect(boardAfterSecurityPass?.columns.find((column) => column.id === "review")?.cards[0]?.id).toBe("task-1");
	});

	it("waits for a new backlog card height to settle before starting animation", async () => {
		let latestSnapshot: HookSnapshot | null = null;
		const tryProgrammaticCardMove = vi.fn(() => "unavailable" as const);
		let measurementCount = 0;
		const boardElement = document.createElement("section");
		boardElement.className = "kb-board";
		const taskElement = document.createElement("div");
		taskElement.dataset.taskId = "task-1";
		vi.spyOn(taskElement, "getBoundingClientRect").mockImplementation(() => {
			measurementCount += 1;
			if (measurementCount === 1) {
				return createRect(160, 44);
			}
			return createRect(160, 96);
		});
		boardElement.appendChild(taskElement);
		document.body.appendChild(boardElement);

		useProgrammaticCardMovesMock.mockReturnValue({
			handleProgrammaticCardMoveReady: () => {},
			setRequestMoveTaskToTrashHandler: () => {},
			tryProgrammaticCardMove,
			consumeProgrammaticCardMove: () => ({}),
			resolvePendingProgrammaticTrashMove: () => {},
			waitForProgrammaticCardMoveAvailability: async () => {},
			resetProgrammaticCardMoves: () => {},
			requestMoveTaskToTrashWithAnimation: async () => {},
			programmaticCardMoveCycle: 0,
		});

		useLinkedBacklogTaskActionsMock.mockReturnValue({
			handleCreateDependency: () => {},
			handleDeleteDependency: () => {},
			confirmMoveTaskToTrash: async () => {},
			requestMoveTaskToTrash: async () => {},
		});

		const board = createBoard();
		const setBoard = vi.fn<Dispatch<SetStateAction<BoardData>>>(() => {});
		const ensureTaskWorkspace = vi.fn(async () => ({
			ok: true as const,
			response: {
				ok: true as const,
				path: "/tmp/task-1",
				baseRef: "main",
				baseCommit: "abc123",
			},
		}));
		const startTaskSession = vi.fn(async () => ({ ok: true as const }));

		await act(async () => {
			root.render(
				<HookHarness
					board={board}
					setBoard={setBoard}
					ensureTaskWorkspace={ensureTaskWorkspace}
					startTaskSession={startTaskSession}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		if (!latestSnapshot) {
			throw new Error("Expected a hook snapshot.");
		}

		await act(async () => {
			latestSnapshot!.handleStartTask("task-1");
		});

		expect(tryProgrammaticCardMove).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(32);
			await Promise.resolve();
		});

		expect(tryProgrammaticCardMove).not.toHaveBeenCalled();

		await act(async () => {
			vi.advanceTimersByTime(16);
			await Promise.resolve();
		});

		expect(tryProgrammaticCardMove).toHaveBeenCalledWith("task-1", "backlog", "in_progress");
		boardElement.remove();
	});

	it("starts backlog tasks immediately from detail view without waiting for card height to settle", async () => {
		let latestSnapshot: HookSnapshot | null = null;
		const tryProgrammaticCardMove = vi.fn(() => "unavailable" as const);
		let measurementCount = 0;
		const boardElement = document.createElement("section");
		boardElement.className = "kb-board";
		const taskElement = document.createElement("div");
		taskElement.dataset.taskId = "task-1";
		vi.spyOn(taskElement, "getBoundingClientRect").mockImplementation(() => {
			measurementCount += 1;
			if (measurementCount === 1) {
				return createRect(160, 44);
			}
			return createRect(160, 96);
		});
		boardElement.appendChild(taskElement);
		document.body.appendChild(boardElement);

		useProgrammaticCardMovesMock.mockReturnValue({
			handleProgrammaticCardMoveReady: () => {},
			setRequestMoveTaskToTrashHandler: () => {},
			tryProgrammaticCardMove,
			consumeProgrammaticCardMove: () => ({}),
			resolvePendingProgrammaticTrashMove: () => {},
			waitForProgrammaticCardMoveAvailability: async () => {},
			resetProgrammaticCardMoves: () => {},
			requestMoveTaskToTrashWithAnimation: async () => {},
			programmaticCardMoveCycle: 0,
		});

		useLinkedBacklogTaskActionsMock.mockReturnValue({
			handleCreateDependency: () => {},
			handleDeleteDependency: () => {},
			confirmMoveTaskToTrash: async () => {},
			requestMoveTaskToTrash: async () => {},
		});

		const board = createBoard();
		const setBoard = vi.fn<Dispatch<SetStateAction<BoardData>>>(() => {});
		const ensureTaskWorkspace = vi.fn(async () => ({
			ok: true as const,
			response: {
				ok: true as const,
				path: "/tmp/task-1",
				baseRef: "main",
				baseCommit: "abc123",
			},
		}));
		const startTaskSession = vi.fn(async () => ({ ok: true as const }));

		await act(async () => {
			root.render(
				<HookHarness
					board={board}
					setBoard={setBoard}
					ensureTaskWorkspace={ensureTaskWorkspace}
					startTaskSession={startTaskSession}
					selectedCard={{ card: board.columns[0]!.cards[0]!, column: { id: "backlog" } }}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		if (!latestSnapshot) {
			throw new Error("Expected a hook snapshot.");
		}

		await act(async () => {
			latestSnapshot!.handleStartTask("task-1");
		});

		expect(tryProgrammaticCardMove).not.toHaveBeenCalled();
		expect(measurementCount).toBe(0);
		expect(setBoard).toHaveBeenCalled();
		expect(startTaskSession).toHaveBeenCalledWith(board.columns[0]!.cards[0]!);
		boardElement.remove();
	});

	it("shows a warning toast when restoring a trashed task with a saved patch warning", async () => {
		let latestSnapshot: HookSnapshot | null = null;

		useProgrammaticCardMovesMock.mockReturnValue({
			handleProgrammaticCardMoveReady: () => {},
			setRequestMoveTaskToTrashHandler: () => {},
			tryProgrammaticCardMove: () => "unavailable",
			consumeProgrammaticCardMove: () => ({}),
			resolvePendingProgrammaticTrashMove: () => {},
			waitForProgrammaticCardMoveAvailability: async () => {},
			resetProgrammaticCardMoves: () => {},
			requestMoveTaskToTrashWithAnimation: async () => {},
			programmaticCardMoveCycle: 0,
		});

		useLinkedBacklogTaskActionsMock.mockReturnValue({
			handleCreateDependency: () => {},
			handleDeleteDependency: () => {},
			confirmMoveTaskToTrash: async () => {},
			requestMoveTaskToTrash: async () => {},
		});

		const trashTask = createTask("task-trash", "Trash task", 2);
		const board: BoardData = {
			columns: [
				{ id: "backlog", title: "Backlog", cards: [] },
				{ id: "in_progress", title: "In Progress", cards: [] },
				{ id: "review", title: "Review", cards: [] },
				{ id: "trash", title: "Trash", cards: [trashTask] },
			],
			dependencies: [],
		};
		const setBoard = vi.fn<Dispatch<SetStateAction<BoardData>>>((_nextBoard) => {
			// The optimistic move is not part of this assertion.
		});
		const ensureTaskWorkspace = vi.fn(async () => ({
			ok: true as const,
			response: {
				ok: true as const,
				path: "/tmp/task-trash",
				baseRef: "main",
				baseCommit: "abc123",
				warning: "Saved task changes could not be reapplied automatically.",
			},
		}));
		const startTaskSession = vi.fn(async () => ({ ok: true as const }));

		await act(async () => {
			root.render(
				<HookHarness
					board={board}
					setBoard={setBoard}
					ensureTaskWorkspace={ensureTaskWorkspace}
					startTaskSession={startTaskSession}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		if (!latestSnapshot) {
			throw new Error("Expected a hook snapshot.");
		}

		await act(async () => {
			latestSnapshot!.handleRestoreTaskFromTrash("task-trash");
			// resumeTaskFromTrash is fire-and-forget (void), so flush enough
			// microtasks for ensureTaskWorkspace and startTaskSession to resolve.
			for (let i = 0; i < 10; i++) {
				await Promise.resolve();
			}
		});

		// moveTaskToColumn updates updatedAt with Date.now(), so match fields except updatedAt.
		const expectedTask = expect.objectContaining({
			id: trashTask.id,
			prompt: trashTask.prompt,
			baseRef: trashTask.baseRef,
			createdAt: trashTask.createdAt,
		});
		expect(ensureTaskWorkspace).toHaveBeenCalledWith(expectedTask);
		expect(startTaskSession).toHaveBeenCalledWith(expectedTask, { resumeFromTrash: true });
		expect(showAppToastMock).toHaveBeenCalledWith({
			intent: "warning",
			icon: "warning-sign",
			message: "Saved task changes could not be reapplied automatically.",
			timeout: 7000,
		});
	});

	it("preserves model fields when restoring a trashed task", async () => {
		let latestSnapshot: HookSnapshot | null = null;

		useProgrammaticCardMovesMock.mockReturnValue({
			handleProgrammaticCardMoveReady: () => {},
			setRequestMoveTaskToTrashHandler: () => {},
			tryProgrammaticCardMove: () => "unavailable",
			consumeProgrammaticCardMove: () => ({}),
			resolvePendingProgrammaticTrashMove: () => {},
			waitForProgrammaticCardMoveAvailability: async () => {},
			resetProgrammaticCardMoves: () => {},
			requestMoveTaskToTrashWithAnimation: async () => {},
			programmaticCardMoveCycle: 0,
		});

		useLinkedBacklogTaskActionsMock.mockReturnValue({
			handleCreateDependency: () => {},
			handleDeleteDependency: () => {},
			confirmMoveTaskToTrash: async () => {},
			requestMoveTaskToTrash: async () => {},
		});

		const trashTask: BoardCard = {
			id: "task-trash-model",
			title: "Trash task with model title",
			prompt: "Trash task with model",
			startInPlanMode: false,
			autoReviewEnabled: false,
			autoReviewMode: "commit",
			agentId: "codex",
			clineSettings: {
				providerId: "my-provider",
				modelId: "my-model",
			},
			baseRef: "main",
			createdAt: 2,
			updatedAt: 2,
		};
		let currentBoard: BoardData = {
			columns: [
				{ id: "backlog", title: "Backlog", cards: [] },
				{ id: "in_progress", title: "In Progress", cards: [] },
				{ id: "review", title: "Review", cards: [] },
				{ id: "trash", title: "Trash", cards: [trashTask] },
			],
			dependencies: [],
		};
		const setBoard = vi.fn<Dispatch<SetStateAction<BoardData>>>((nextBoard) => {
			if (typeof nextBoard === "function") {
				currentBoard = nextBoard(currentBoard);
			} else {
				currentBoard = nextBoard;
			}
		});
		const ensureTaskWorkspace = vi.fn(async () => ({
			ok: true as const,
			response: {
				ok: true as const,
				path: "/tmp/task-trash-model",
				baseRef: "main",
				baseCommit: "abc123",
			},
		}));
		const startTaskSession = vi.fn(async () => ({ ok: true as const }));

		await act(async () => {
			root.render(
				<HookHarness
					board={currentBoard}
					setBoard={setBoard}
					ensureTaskWorkspace={ensureTaskWorkspace}
					startTaskSession={startTaskSession}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		if (!latestSnapshot) {
			throw new Error("Expected a hook snapshot.");
		}

		await act(async () => {
			latestSnapshot!.handleRestoreTaskFromTrash("task-trash-model");
			for (let i = 0; i < 10; i++) {
				await Promise.resolve();
			}
		});

		// After restore, disableTaskAutoReview is called via setBoard updater.
		// Verify model fields survived the restore flow.
		const reviewCards = currentBoard.columns.find((col) => col.id === "review")?.cards ?? [];
		const restoredTask = reviewCards.find((card) => card.id === "task-trash-model");
		expect(restoredTask).toBeDefined();
		expect(restoredTask?.clineSettings).toEqual({
			providerId: "my-provider",
			modelId: "my-model",
		});
		expect(restoredTask?.agentId).toBe("codex");
	});

	it("ignores card selection requests for trashed tasks", async () => {
		let latestSnapshot: HookSnapshot | null = null;

		useProgrammaticCardMovesMock.mockReturnValue({
			handleProgrammaticCardMoveReady: () => {},
			setRequestMoveTaskToTrashHandler: () => {},
			tryProgrammaticCardMove: () => "unavailable",
			consumeProgrammaticCardMove: () => ({}),
			resolvePendingProgrammaticTrashMove: () => {},
			waitForProgrammaticCardMoveAvailability: async () => {},
			resetProgrammaticCardMoves: () => {},
			requestMoveTaskToTrashWithAnimation: async () => {},
			programmaticCardMoveCycle: 0,
		});

		useLinkedBacklogTaskActionsMock.mockReturnValue({
			handleCreateDependency: () => {},
			handleDeleteDependency: () => {},
			confirmMoveTaskToTrash: async () => {},
			requestMoveTaskToTrash: async () => {},
		});

		const trashTask = createTask("task-trash", "Trash task", 2);
		const board: BoardData = {
			columns: [
				{ id: "backlog", title: "Backlog", cards: [] },
				{ id: "in_progress", title: "In Progress", cards: [] },
				{ id: "review", title: "Review", cards: [] },
				{ id: "trash", title: "Trash", cards: [trashTask] },
			],
			dependencies: [],
		};
		const setSelectedTaskId = vi.fn<Dispatch<SetStateAction<string | null>>>();

		await act(async () => {
			root.render(
				<HookHarness
					board={board}
					setBoard={() => board}
					ensureTaskWorkspace={async () => ({ ok: true as const })}
					startTaskSession={async () => ({ ok: true as const })}
					setSelectedTaskIdOverride={setSelectedTaskId}
					onSnapshot={(snapshot) => {
						latestSnapshot = snapshot;
					}}
				/>,
			);
		});

		if (!latestSnapshot) {
			throw new Error("Expected a hook snapshot.");
		}

		await act(async () => {
			latestSnapshot!.handleCardSelect("task-trash");
		});

		expect(setSelectedTaskId).not.toHaveBeenCalled();
	});
});
