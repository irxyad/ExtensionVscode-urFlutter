import '@common/extensions/primitive.ext';
import { postMessageToExtension } from '@webview/utils/bridge.utils';
import { hexToRgba } from '@webview/utils/color.utils';
import { useState, type ReactNode } from 'react';


export type DropdownChildren = {
	id: string;
	title: string;
	subtitle?: string;
	group?: string;
	badgeColor?: string;
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

	return (
		<div className="accordion">
			<div className={`item ${isActive ? 'active' : ''}`} key={id}>
				<div
					className="header"
					onClick={() => setIsActive(!isActive)}
					title={tooltip}>
					<div className="header-title">
						<div className="text">
							{title}
							<div className="subtitle">{subtitle}</div>
						</div>
						{actions}
					</div>
				</div>
				<div className="content">
					{children.map((val, index) => {
            console.log('AAAAAAAA', val.group?.firstUppercase);

            return (
              <div
                id={val.id}
                key={val.id}
                className="content-item"
                tabIndex={0}
                role="button"
                title={tooltipChildren?.(index)}
                onClick={() => onClickChildren
                  ? onClickChildren(val)
                  : postMessageToExtension(val.id)}>
                <div className="child">
                  <span>{val.title}</span>
                  {val.group && (
                    <span
                      className="badge"
                      style={val.badgeColor
                        ? {
                          backgroundColor: hexToRgba(val.badgeColor, 0.1),
                          borderColor: val.badgeColor,
                          border: '1px solid',
                          color: val.badgeColor,
                        }
                        : {}}>
                      {val.group.firstUppercase}
                    </span>
                  )}
                </div>
                {actionsChildren && (
                  <div className="actions">{actionsChildren(val)}</div>
                )}
              </div>
            );
          })}
				</div>
			</div>
		</div>
	);
}
