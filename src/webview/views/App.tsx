import { TabbarView } from '@common/constants/common.constants';
import { useState } from 'react';
import { Footer } from '../components/Footer';
import LeftPanel from './LeftPanel';
import SnippetView from './SnippetView';

const tabs = [
	{ key: TabbarView.HomepageView, label: 'Home' },
	{ key: TabbarView.SnippetView, label: 'Snippets' },
];

export default function App() {
	const [activeTab, setActiveTab] = useState<string>(TabbarView.HomepageView);

	return (
		<main className="main-page">
			{/* Tabbar */}
			<div className="tabbar">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						className={`tab ${activeTab === tab.key ? 'active' : ''}`}
						onClick={() => setActiveTab(tab.key)}>
						{tab.label}
					</button>
				))}
			</div>
			{/* Content */}
			<div className="content-container">
				{activeTab === TabbarView.HomepageView && (
					<div id={TabbarView.HomepageView} className="container-homepage">
						<div className="content">
							<LeftPanel />
						</div>
					</div>
				)}

				{activeTab === TabbarView.SnippetView && (
					<div id={TabbarView.SnippetView} className="container-snippet-page">
						<SnippetView />
					</div>
				)}
			</div>
			{/* Footer */}
			<Footer />
		</main>
	);
}
