import { DropdownProps } from '@webview/types/webview.types';

export function Dropdown({ id, label, classname, children }: DropdownProps) {
	return (
		<select className={classname ?? 'urflutter-dropdown'} name={id} id={id}>
			{[
				<option key={-999} value="">
					{label}
				</option>,
				children.map((child) => {
					return (
						<option key={child.id} value={child.id}>
							🔸 {child.label}
						</option>
					);
				}),
			]}
		</select>
	);
}
