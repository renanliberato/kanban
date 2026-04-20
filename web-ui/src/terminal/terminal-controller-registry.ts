export interface TerminalController {
	input: (text: string) => boolean;
	paste: (text: string) => boolean;
	waitForLikelyPrompt?: (timeoutMs: number) => Promise<boolean>;
}

type TerminalSubmittedLineListener = (line: string) => void;

const controllersByTaskId = new Map<string, TerminalController>();
const submittedLineListenersByTaskId = new Map<string, Set<TerminalSubmittedLineListener>>();

export function getTerminalController(taskId: string): TerminalController | null {
	return controllersByTaskId.get(taskId) ?? null;
}

export async function waitForTerminalLikelyPrompt(taskId: string, timeoutMs: number): Promise<boolean> {
	const controller = getTerminalController(taskId);
	if (!controller?.waitForLikelyPrompt) {
		return false;
	}
	return await controller.waitForLikelyPrompt(timeoutMs);
}

export function registerTerminalController(taskId: string, controller: TerminalController): () => void {
	controllersByTaskId.set(taskId, controller);
	return () => {
		if (controllersByTaskId.get(taskId) === controller) {
			controllersByTaskId.delete(taskId);
		}
	};
}

export function addTerminalSubmittedLineListener(taskId: string, listener: TerminalSubmittedLineListener): () => void {
	const listeners = submittedLineListenersByTaskId.get(taskId) ?? new Set<TerminalSubmittedLineListener>();
	listeners.add(listener);
	submittedLineListenersByTaskId.set(taskId, listeners);
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			submittedLineListenersByTaskId.delete(taskId);
		}
	};
}

export function notifyTerminalSubmittedLine(taskId: string, line: string): void {
	const listeners = submittedLineListenersByTaskId.get(taskId);
	if (!listeners || listeners.size === 0) {
		return;
	}
	for (const listener of listeners) {
		listener(line);
	}
}
