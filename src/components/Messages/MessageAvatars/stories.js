import centered from '@storybook/addon-centered/react';
import { withKnobs, object } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react';
import { avatarResolver } from '../../../helpers.stories';
import { MessageAvatars } from '.';


storiesOf('Messages|MessageAvatars', module)
	.addDecorator(centered)
	.addDecorator(withKnobs)
	.add('empty', () => (
		<MessageAvatars
			avatarResolver={avatarResolver}
			usernames={object('usernames', [])}
		/>
	))
	.add('with one avatar', () => (
		<MessageAvatars
			avatarResolver={avatarResolver}
			usernames={object('usernames', ['guilherme.gazzo'])}
		/>
	))
	.add('with two avatars', () => (
		<MessageAvatars
			avatarResolver={avatarResolver}
			usernames={object('usernames', ['guilherme.gazzo', 'tasso.evangelista'])}
		/>
	))
	.add('with three avatars', () => (
		<MessageAvatars
			avatarResolver={avatarResolver}
			usernames={object('usernames', ['guilherme.gazzo', 'tasso.evangelista', 'martin.schoeler'])}
		/>
	))
;
