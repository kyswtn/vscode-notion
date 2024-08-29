import {parsePageId} from 'notion-utils'
import {Injectable} from 'vedk'
import * as vscode from 'vscode'
import {CommandId} from './constants'
import {NotionWebviewPanelSerializer} from './notion-webview-panel-serializer'

export type OpenPageCommandArgs = {id?: string}

@Injectable()
export class OpenPageCommand implements vscode.Disposable {
  private readonly disposable: vscode.Disposable

  constructor(private readonly notionPages: NotionWebviewPanelSerializer) {
    this.disposable = vscode.commands.registerCommand(CommandId.OpenPage, this.run, this)
  }

  dispose() {
    this.disposable.dispose()
  }

  private async run(args?: OpenPageCommandArgs) {
    let pageId = args?.id
    if (!pageId) {
      const urlOrId = await vscode.window.showInputBox({
        prompt: 'Enter a full URL or just ID of the page.',
      })
      if (!urlOrId) return
      pageId = parsePageId(urlOrId)
    }

    try {
      await this.notionPages.createOrShowPage(pageId)
    } catch (e) {
      const message = e instanceof Error ? e.message : 'An unknown error occoured while trying to open notion page.'
      await vscode.window.showErrorMessage(message)
    }
  }
}
