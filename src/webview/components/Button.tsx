import { postMessageToExtension } from '@webview/utils/bridge.utils';

type ButtonProps = {
	id: string;
	label: string;
	classname?: string;
	onClick?: () => void;
};

function Button({ id, label, classname, onClick }: ButtonProps) {
	return (
		<button
			id={id}
			className={classname ?? 'urflutter-button'}
			onClick={() => {
				if (onClick) {
					onClick();
				} else {
					postMessageToExtension(id);
				}
			}}>
			{label}
		</button>
	);
}

export default Button;
