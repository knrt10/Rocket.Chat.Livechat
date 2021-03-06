import { Livechat } from '../api';
import { store } from '../store';
import { route } from 'preact-router';
import { setCookies, upsert, canRenderMessage } from '../components/helpers';
import Commands from '../lib/commands';
import { loadConfig, processUnread } from '../lib/main';
import { parentCall } from './parentCall';
import { handleTranscript } from './transcript';
import { normalizeMessage, normalizeMessages } from './threads';

const commands = new Commands();

export const closeChat = async() => {
	await handleTranscript();
	await loadConfig();
	parentCall('callback', 'chat-ended');
	route('/chat-finished');
};

const processMessage = async(message) => {
	if (message.t === 'livechat-close') {
		closeChat();
	} else if (message.t === 'command') {
		commands[message.msg] && commands[message.msg]();
	}
};

const doPlaySound = async(message) => {
	const { sound, user } = store.state;

	if (!sound.enabled || (user && message.u && message.u._id === user._id)) {
		return;
	}

	await store.setState({ sound: { ...sound, play: true } });
};

export const initRoom = async() => {
	const { state } = store;
	const { room } = state;

	if (!room) {
		return;
	}

	Livechat.unsubscribeAll();

	const { token, agent, room: { _id: rid, servedBy } } = state;
	Livechat.subscribeRoom(rid);

	let roomAgent = agent;
	if (!roomAgent) {
		if (servedBy) {
			roomAgent = await Livechat.agent({ rid });
			await store.setState({ agent: roomAgent });
		}
	}

	Livechat.onAgentChange(rid, async(agent) => {
		await store.setState({ agent });
	});

	Livechat.onAgentStatusChange(rid, (status) => {
		const { agent } = store.state;
		agent && store.setState({ agent: { ...agent, status } });
	});

	setCookies(rid, token);
	parentCall('callback', 'chat-started');
};

Livechat.onTyping((username, isTyping) => {
	const { typing, user } = store.state;

	if (user && user.username && user.username === username) {
		return;
	}

	if (typing.indexOf(username) === -1 && isTyping) {
		typing.push(username);
		return store.setState({ typing });
	}

	if (!isTyping) {
		return store.setState({ typing: typing.filter((u) => u !== username) });
	}
});

Livechat.onMessage(async(message) => {
	if (message.ts instanceof Date) {
		message.ts = message.ts.toISOString();
	}

	message = await normalizeMessage(message);
	if (!message) {
		return;
	}

	await store.setState({
		messages: upsert(store.state.messages, message, ({ _id }) => _id === message._id, ({ ts }) => ts),
	});

	await processMessage(message);

	if (canRenderMessage(message) !== true) {
		return;
	}

	if (message.editedAt) {
		return;
	}

	await processUnread();
	await doPlaySound(message);
});

export const loadMessages = async() => {
	const { room: { _id: rid } = {} } = store.state;

	if (!rid) {
		return;
	}

	await store.setState({ loading: true });
	const messages = await Livechat.loadMessages(rid).then((data) => (normalizeMessages(data)));
	await initRoom();
	await store.setState({ messages: (messages || []).reverse(), noMoreMessages: false });
	await store.setState({ loading: false });

	if (messages && messages.length) {
		const lastMessage = messages[messages.length - 1];
		await store.setState({ lastReadMessageId: lastMessage && lastMessage._id });
	}
};

export const loadMoreMessages = async() => {
	const { room: { _id: rid } = {}, messages = [], noMoreMessages = false } = store.state;

	if (!rid || noMoreMessages) {
		return;
	}

	await store.setState({ loading: true });
	const moreMessages = await Livechat.loadMessages(rid, { limit: messages.length + 10 }).then((data) => (normalizeMessages(data)));
	await store.setState({
		messages: (moreMessages || []).reverse(),
		noMoreMessages: messages.length + 10 > moreMessages.length,
	});
	await store.setState({ loading: false });
};

export const defaultRoomParams = () => {
	const params = {};

	const { triggerAgent: { agent } = {} } = store.state;
	if (agent && agent._id) {
		Object.assign(params, { agentId: agent._id });
	}

	return params;
};
