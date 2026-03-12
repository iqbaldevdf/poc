import { useRef, useState, useEffect } from 'react';

const WS_RECONNECT_MS = 2000;

function attachHandlers(ws, url, onMessageRef, setIsConnected, queueRef) {
	ws.onopen = () => {
		console.log('[WS] Connected to backend', url);
		setIsConnected(true);
		const q = queueRef?.current;
		if (q?.length) {
			console.log('[WS] Flushing', q.length, 'queued audio chunks');
			while (q.length > 0 && ws.readyState === window.WebSocket.OPEN) ws.send(q.shift());
		}
	};
	ws.onclose = () => {
		console.log('[WS] Disconnected from backend');
		setIsConnected(false);
		setTimeout(() => {
			console.log('[WS] Reconnecting in', WS_RECONNECT_MS, 'ms...');
			const next = new window.WebSocket(url);
			const refs = onMessageRef.current;
			if (refs?.wsRef) refs.wsRef.current = next;
			attachHandlers(next, url, onMessageRef, setIsConnected, refs?.queueRef);
		}, WS_RECONNECT_MS);
	};
	ws.onmessage = (event) => {
		try {
			const msg = JSON.parse(event.data);
			onMessageRef.current?.callback?.(msg);
		} catch (err) {
			// Ignore parse errors
		}
	};
	ws.onerror = () => {
		console.warn('[WS] Connection error - check backend is running on', url);
	};
}

const MAX_QUEUE = 100;

export default function useWebSocket(url, onMessage) {
	const wsRef = useRef(null);
	const queueRef = useRef([]);
	const dropCountRef = useRef(0);
	const [isConnected, setIsConnected] = useState(false);
	const onMessageRef = useRef({ callback: onMessage, wsRef, queueRef });
	onMessageRef.current.callback = onMessage;
	onMessageRef.current.wsRef = wsRef;
	onMessageRef.current.queueRef = queueRef;

	const resolvedUrl = url && String(url).trim() ? url : 'ws://127.0.0.1:3001';

	function flushQueue(ws) {
		const queue = queueRef.current;
		if (queue.length === 0) return;
		console.log('[WS] Flushing', queue.length, 'queued audio chunks');
		while (queue.length > 0 && ws?.readyState === window.WebSocket.OPEN) {
			ws.send(queue.shift());
		}
		queue.length = 0;
	}

	useEffect(() => {
		let ws = new window.WebSocket(resolvedUrl);
		wsRef.current = ws;
		attachHandlers(ws, resolvedUrl, onMessageRef, setIsConnected, queueRef);
		return () => {
			wsRef.current = null;
			ws.close();
		};
	}, [resolvedUrl]);

	const send = (data) => {
		const ws = wsRef.current;
		if (ws?.readyState === window.WebSocket.OPEN) {
			flushQueue(ws);
			ws.send(data);
		} else {
			const isAudio = typeof data === 'object' && data?.byteLength !== undefined;
			if (isAudio) {
				const queue = queueRef.current;
				if (queue.length < MAX_QUEUE) {
					queue.push(data);
				} else {
					dropCountRef.current++;
					if (dropCountRef.current <= 3 || dropCountRef.current % 20 === 0) {
						console.warn('[WS] Queue full, dropping audio chunk. Not connected? State:', ws?.readyState ?? 'no socket');
					}
				}
			}
		}
	};

	return { send, isConnected };
}
