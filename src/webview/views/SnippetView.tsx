import { SnippetAction } from '@features/snippets/snippet.constants';
import {
  ActionSnippetOption,
  EditSnippetOption,
  RenameSnippetNameOption,
  StorageSnippetInterface,
} from '@features/snippets/types/snippet.types';
import { postMessageToExtension } from '@webview/utils/bridge.utils';
import { useEffect, useState } from 'react';
import { Accordion } from '../components/Accordion';
import { ActionBridgeWebview, ReturnBridgeWebview } from '../webview.constants';

function SnippetView() {
	const [listSnippets, setListSnippets] = useState<StorageSnippetInterface[]>(
		[],
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
			if (message.action === ReturnBridgeWebview.IsDeletedSnippet) {
				postMessageToExtension(ActionBridgeWebview.GetSnippets);
				setIsLoading(true);
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, []);

	function deleteGroupSnippets(storageName: string) {
		postMessageToExtension(ActionBridgeWebview.DeleteGroupSnippet, {
			extra: storageName,
		});
	}

	function deleteSnippets(props: ActionSnippetOption) {
		postMessageToExtension(ActionBridgeWebview.DeleteSnippet, {
			extra: props,
		});
	}

	return (
		<div className="snippet-view">
			<p>Snippets are grouped by their workspace/project.</p>

			{isLoading ? (
				<p>Loading snippets...</p>
			) : listSnippets.length === 0 ? (
				<p>Empty Snippets</p>
			) : (
				<div className="accordion-snippets">
					{listSnippets.map((storage) => {
						const accordionItems = storage.snippets.map((snip) => ({
							id: snip.name,
							title: snip.name,
						}));

						return (
							<Accordion
								key={storage.name}
								id={storage.name}
								title={storage.name.toTitleCase}
								children={accordionItems}
								onClickChildren={(val) => {
									postMessageToExtension(ActionBridgeWebview.EditSnippet, {
										extra: {
											snippetName: val.id,
											storage: storage,
										} satisfies EditSnippetOption,
									});
								}}
								tooltip={`From Workspace: ${storage.metadata.uri_workspace}`}
								tooltipChildren={(index) =>
									`Type ${storage.snippets[index].prefix} to get snippet`
								}
								actions={[
									<button
										key={`delete-group-${storage.name}`}
										id={storage.name}
										className="btn-delete-group-snippet"
										data-action={SnippetAction.DeleteStorage}
										onClick={() => deleteGroupSnippets(storage.name)}
										title="Delete this group and all snippets">
										&times;
									</button>,
								]}
								actionsChildren={(val) => {
                  return [
                    <button
                      key={`delete-${val.id}`}
                      id={val.id}
                      className="btn-delete-snippet"
                      data-action={SnippetAction.Delete}
                      onClick={(e) => {
                        e.stopPropagation();

                        deleteSnippets({
                          storage: storage,
                          snippetName: val.id,
                        });
                      } }
                      title="Delete this snippet">
                      &times;
                    </button>,

                    <button
                      key={`rename-${val.id}`}
                      id={val.id}
                      className="btn-rename-snippet"
                      data-action={SnippetAction.Rename}
                      onClick={(e) => {
                        e.stopPropagation();

                        postMessageToExtension(
                          ActionBridgeWebview.RenameSnippet,
                          {
                            extra: {
                              snippetName: val.id,
                              storage: storage,
                            }satisfies RenameSnippetNameOption ,
                          }
                        );
                      } }
                      title="Rename this snippet">
                      &#128393;
                    </button>,
                  ];
                }}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
export default SnippetView;
