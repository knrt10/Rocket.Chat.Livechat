import Triggers from './triggers';
import CustomFields from './customFields';
import { store } from '../store';
import { setWidgetLanguage } from './locale';
import { Livechat } from '../api';
import { createToken } from '../components/helpers';
import { loadConfig } from '../lib/main';
import { parentCall } from '../lib/parentCall';

const createOrUpdateGuest = async(guest) => {
	const { token } = guest;
	token && await store.setState({ token });
	await Livechat.grantVisitor({ visitor: { ...guest } });
	await loadConfig();
};

const updateIframeGuestData = (data) => {
	const { iframe, iframe: { guest }, user: _id, token } = store.state;
	store.setState({ iframe: { ...iframe, guest: { ...guest, ...data } } });

	if (!_id) {
		return;
	}

	const guestData = { token, ...data };
	createOrUpdateGuest(guestData);
};

const api = {
	pageVisited(info) {
		if (info.change === 'url') {
			Triggers.processRequest(info);
		}

		const { token, room } = store.state;
		// TODO: Need to change this behavior... But we need to change the endpoint on backend side before....
		if (!room) {
			return;
		}

		const { change, title, location: { href } } = info;
		Livechat.sendVisitorNavigation({ token, rid: room._id, pageInfo: { change, title, location: { href } } });
	},

	setCustomField(key, value, overwrite = true) {
		CustomFields.setCustomField(key, value, overwrite);
	},

	setTheme({ color, fontColor, iconColor } = {}) {
		const { iframe, iframe: { theme } } = store.state;
		store.setState({
			iframe: {
				...iframe,
				theme: {
					...theme,
					color,
					fontColor,
					iconColor,
				},
			},
		});
	},

	setDepartment(value) {
		const { config: { departments = [] } } = store.state;

		const dept = departments.find((dep) => dep._id === value || dep.name === value);
		const department = (dept && dept._id) || '';

		updateIframeGuestData({ department });
	},

	clearDepartment() {
		updateIframeGuestData({ department: '' });
	},

	setExpanded(expanded) {
		store.setState({ expanded });
	},

	async setGuestToken(token) {
		const { token: localToken, iframe, iframe: { guest } } = store.state;
		if (token === localToken) {
			return;
		}
		store.setState({ token, iframe: { ...iframe, guest: { ...guest, token } } });
		await loadConfig();
	},

	setGuestName(name) {
		updateIframeGuestData({ name });
	},

	setGuestEmail(email) {
		updateIframeGuestData({ email });
	},

	registerGuest(data = {}) {
		if (typeof data !== 'object') {
			return;
		}

		if (!data.token) {
			data.token = createToken();
		}

		if (data.department) {
			api.setDepartment(data.department);
		}

		createOrUpdateGuest(data);
	},
  
	async setLanguage(language) {
		const { iframe } = store.state;
		await store.setState({ iframe: { ...iframe, language } });
		setWidgetLanguage();
	},
  
	showWidget() {
		const { iframe } = store.state;
		store.setState({ iframe: { ...iframe, visible: true } });
		parentCall('showWidget');
	},
  
	hideWidget() {
		const { iframe } = store.state;
		store.setState({ iframe: { ...iframe, visible: false } });
		parentCall('hideWidget');
	},
};

const onNewMessage = (msg) => {
	if (typeof msg.data === 'object' && msg.data.src !== undefined && msg.data.src === 'rocketchat') {
		if (api[msg.data.fn] !== undefined && typeof api[msg.data.fn] === 'function') {
			const args = [].concat(msg.data.args || []);
			api[msg.data.fn].apply(null, args);
		}
	}
};

class Hooks {
	constructor() {
		if (!Hooks.instance) {
			this._started = false;
			Hooks.instance = this;
		}

		return Hooks.instance;
	}

	init() {
		if (this._started) {
			return;
		}

		this._started = true;
		window.addEventListener('message', onNewMessage, false);
	}

	reset() {
		this._started = false;
		window.removeEventListener('message', onNewMessage, false);
	}
}

const instance = new Hooks();
export default instance;
