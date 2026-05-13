import { SnippetAction } from '@features/snippets/snippet.constants';
import { DeleteorRenameSnippetProp, StorageSnippetInterface } from '@features/snippets/types/snippet.types';
import { postMessageToExtension } from '@webview/utils/bridge.utils';
import { useEffect, useState } from 'react';
import { Accordion } from '../components/Accordion';
import {
    ActionBridgeWebview,
    ReturnBridgeWebview,
} from '../webview.constants';

function SnippetView() {
	const [listSnippets, setListSnippets] = useState<StorageSnippetInterface[]>(
		[]
	);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	useEffect(() => {
		postMessageToExtension(ActionBridgeWebview.GetSnippets);
		setIsLoading(true);

		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

			if (message.action === ReturnBridgeWebview.SnippetsData) {
				setListSnippets(message.data);
				setIsLoading(false);
			}

			// Kalau delete sukses, fetch ulang
			if (message.action === ActionBridgeWebview.IsDeletedSnippet) {
				postMessageToExtension(ActionBridgeWebview.GetSnippets);
				setIsLoading(true);
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, []);

	function deleteGroupSnippets(storageName: string) {
		postMessageToExtension(ActionBridgeWebview.DeleteGroupSnippet, {
			extra: {
				storageName: storageName,
			},
		});
	}

	function deleteSnippets(props: DeleteorRenameSnippetProp) {
		postMessageToExtension(ActionBridgeWebview.DeleteSnippet, {
			extra: {
				props,
			},
		});
	}

	return (
		<div className="snippet-view">
			<p className="label-main-menu">Your Snippets:</p>
			<p>The panel title is based on the snippet's project name.</p>

			{isLoading ? (
				<p>Loading snippets...</p>
			) : listSnippets.length === 0 ? (
				<p>Empty Snippets</p>
			) : (
				<div className="accordion-snippets">
					{listSnippets.map((snippet) => {
						const accordionItems = snippet.dataSnippet.map((snip) => ({
							id: snip.snippetName,
							title: snip.snippetName,
						}));

						return (
							<Accordion
								key={snippet.storageName}
								id={snippet.storageName}
								title={snippet.storageName}
								children={accordionItems}
								onClickChildren={(val) => {
									postMessageToExtension(ActionBridgeWebview.EditSnippet, {
										extra: {
											snippetName: val.id,
											storage: snippet,
										},
									});
								}}
								tooltip={`From Workspace: ${snippet.metadata.uri_workspace}`}
								tooltipChildren={(index) =>
									`Type ${snippet.dataSnippet[index].body.prefix} to get snippet`
								}
								actions={[
									<button
										key={`delete-group-${snippet.storageName}`}
										id={snippet.storageName}
										className="btn-delete-group-snippet"
										data-action={SnippetAction.DeleteGroupSnippet}
										onClick={() => deleteGroupSnippets(snippet.storageName)}
										title="Delete this group and all snippets">
										&times;
									</button>,
								]}
								actionsChildren={(val) => [
									<button
										key={`delete-${val.id}`}
										id={val.id}
										className="btn-delete-snippet"
										data-action={SnippetAction.DeleteSnippet}
										onClick={(e) => {
											e.stopPropagation();

											deleteSnippets({
												groupSnippet: snippet.storageName,
												keySnippet: val.id,
											});
										}}
										title="Delete this snippet">
										&times;
									</button>,
									<button
										key={`rename-${val.id}`}
										id={val.id}
										className="btn-rename-snippet"
										data-action={SnippetAction.RenameSnippet}
										onClick={(e) => {
											e.stopPropagation();

											postMessageToExtension(ActionBridgeWebview.RenameSnippet, {
												extra: {
													snippetName: val.id,
													storage: snippet,
												},
											});
										}}
										title="Rename this snippet">
										&#128393;
									</button>,
								]}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
export default SnippetView;
