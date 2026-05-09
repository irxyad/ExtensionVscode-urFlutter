import { postMessageToExtension } from '@webview/utils/webview-bridge.utils';
import { useState, type ReactNode } from 'react';

export type DropdownChildren = {
	id: string;
	title: string;
	subtitle?: string;
};

type AccordionProps = {
	id: string;
	title: string;
	subtitle?: string;
	tooltip?: string;
	tooltipChildren?: (index: number) => string;
	children: DropdownChildren[];
	actions?: ReactNode[];
	actionsChildren?: (val: DropdownChildren) => ReactNode[];
	onClickChildren?: (val: DropdownChildren) => void;
};
export function Accordion({
	id,
	title,
	subtitle,
	tooltip,
	tooltipChildren,
	children,
	actions,
	actionsChildren,
	onClickChildren,
}: AccordionProps) {
	const [isActive, setIsActive] = useState(false);

	const handleHeaderClick = () => {
		setIsActive(!isActive);
	};

	return (
		<div className="accordion">
			<div className={`accordion-item ${isActive ? 'active' : ''}`} key={id}>
				<div
					className="accordion-header"
					onClick={handleHeaderClick}
					title={tooltip}>
					<div className="accordion-header-title">
						<div className="text-section ">
							{title}
							<div className="subtitle">{subtitle}</div>
						</div>
						{actions}
					</div>
				</div>
				<div
					className="accordion-content"
					style={{ display: isActive ? 'block' : 'none' }}>
					{children.map((val, index) => (
						<div
							id={val.id}
							key={val.id}
							className="accordion-content-item"
							tabIndex={0}
							role="button"
							title={tooltipChildren ? tooltipChildren(index) : undefined}
							onClick={() => {
								if (onClickChildren) {
									onClickChildren(val);
								} else {
									postMessageToExtension(val.id);
								}
							}}>
							<p>{val.title}</p>
							<div className="accordion-actions">
								{actionsChildren ? actionsChildren(val) : null}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
