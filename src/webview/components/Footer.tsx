import { AppConstant } from '@common/constants/common.constants';
import Button from './Button';

export function Footer() {
	return (
		<footer>
			<Button id={AppConstant.AboutMe} label="Get in touch 👋" />
		</footer>
	);
}
