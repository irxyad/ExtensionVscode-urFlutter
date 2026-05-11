import { AppConstant } from '@common/constants/common.constants';
import { CONTEXT_MENUS } from '@common/constants/menus/context-menu.constants';
import { SIDEBAR_MENUS } from '@common/constants/menus/sidebar-menu.constants';
import ImageCacheUtils from '@common/utils/image-cache.utils';
import { useEffect, useState } from 'react';
import { Accordion } from '../components/Accordion';
import Button from '../components/Button';

function LeftPanel() {
	const [extensionLogo, setExtensionLogo] = useState<string>(
		AppConstant.ExtensionLogoUrl,
	);

	useEffect(() => {
		ImageCacheUtils.get(AppConstant.ExtensionLogoUrl).then(setExtensionLogo);
	}, []);

	const header = (
		<div className="panel-header">
			<img src={extensionLogo} alt="urFlutter Logo" className="logo-header" />
			<div className="ext-name">
				<span className="ur">ur</span>
				<span className="flutter">Flutter</span>
			</div>
		</div>
	);

	const infoContextMenu = (
		<div className="section-context-menus">
			<p className="title-context-menus">Available Context Menu Options:</p>
			<ul className="context-menus">
				{CONTEXT_MENUS.map((ctxMn) => (
					<li key={ctxMn.label}>{ctxMn.label}</li>
				))}
			</ul>
		</div>
	);

	return (
		<div className="panel-wrapper">
			{header}
			{/* <h1 className="title">Thanks & Welcome</h1> */}
			{/* Context Menu */}
			{infoContextMenu}
			{/* Sidebar Menu */}
			<div className="section-sidebar-menus">
				<p className="label-main-menu">Main Menu:</p>
				<p className="warning-main-menu">
					WARNING: Backup or push to GitHub before using these avoid data loss
				</p>
				<div className="list-sidebar-menus">
					{SIDEBAR_MENUS.map((menu) => {
						if (menu.children) {
							return (
								<Accordion
									key={menu.id}
									children={menu.children}
									id={menu.id}
									title={menu.title}
									subtitle={menu.subtitle}
								/>
							);
						}
						return <Button key={menu.id} id={menu.id} label={menu.title} />;
					})}
				</div>
			</div>
		</div>
	);
}

export default LeftPanel;
