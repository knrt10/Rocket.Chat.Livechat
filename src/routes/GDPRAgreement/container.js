import { Component } from 'preact';
import { Consumer } from '../../store';
import GDPRAgreement from './component';


export class GDPRContainer extends Component {

	handleAgree = async() => {
		const { dispatch } = this.props;
		await dispatch({ gdpr: { accepted: true } });
	}

	render = (props) => (
		<GDPRAgreement {...props} onAgree={this.handleAgree} />
	)
}

const defaultConsentText = 'The controller of your personal data is Rocket.Chat Technologies Corp., with registered ' +
	'office at 2711 Centerville Road, Suite 400, Wilmington, Delaware, USA. To start the chat you agree that your ' +
	'personal data shall be processed and trasmitted in accordance with the General Data Protection Regulation (GDPR).';


export const GDPRConnector = ({ ref, ...props }) => (
	<Consumer>
		{({
			config: {
				theme: {
					color,
				} = {},
				messages: {
					dataProcessingConsentText: consentText = defaultConsentText,
				} = {},
			} = {},
			dispatch,
		}) => (
			<GDPRContainer
				ref={ref}
				{...props}
				title={I18n.t('GDPR')}
				color={color}
				dispatch={dispatch}
				consentText={I18n.t(consentText)}
			/>
		)}
	</Consumer>
);


export default GDPRConnector;
