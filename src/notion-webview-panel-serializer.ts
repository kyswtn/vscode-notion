import {nanoid} from 'nanoid'
import {getPageTitle} from 'notion-utils'
import {InjectContext, Injectable} from 'vedk'
import * as vscode from 'vscode'
import {CommandId, ConfigId, ViewType, configurationPrefix, trustedSources, untitledPageTitle} from './constants'
import {NotionApiClient} from './notion-api-client'
import {RecentsStateProvider} from './recents'

/**
 * State that gets serialized and passed into webview.
 */
export type NotionWebviewState = {
  id: string
  title: string
  data: Awaited<ReturnType<NotionApiClient['getPageDataById']>>
}

class CachedNotionWebview implements vscode.Disposable {
  constructor(
    public webviewPanel: vscode.WebviewPanel,
    public state: NotionWebviewState,
    private readonly extraDisposables: vscode.Disposable,
  ) {}

  dispose() {
    this.extraDisposables.dispose()
    this.webviewPanel.dispose()
  }

  reveal() {
    this.webviewPanel.reveal()
  }
}

@Injectable()
export class NotionWebviewPanelSerializer implements vscode.WebviewPanelSerializer, vscode.Disposable {
  private readonly cache = new Map<string, CachedNotionWebview>()
  private readonly disposable: vscode.Disposable

  constructor(
    @InjectContext() private readonly context: vscode.ExtensionContext,
    private readonly notionApi: NotionApiClient,
    private readonly recentsState: RecentsStateProvider,
  ) {
    this.disposable = vscode.Disposable.from(
      vscode.commands.registerCommand(CommandId.RefreshPage, this.refreshActivePage, this),
      vscode.window.registerWebviewPanelSerializer(ViewType.NotionPageView, this),
      vscode.workspace.onDidChangeConfiguration(async (event) => {
        if (event.affectsConfiguration(configurationPrefix)) {
          await this.rerenderCachedWebviews()
        }
      }),
    )
  }

  dispose() {
    this.disposable.dispose()
  }

  async createOrShowPage(id: string) {
    const cached = this.cache.get(id)
    if (cached) {
      this.recentsState.addRecent(id, cached.state.title)
      cached.reveal()
      return
    }

    const state = await this.fetchDataAndGetPageState(id)
    const webviewPanel = vscode.window.createWebviewPanel(
      ViewType.NotionPageView,
      state.title,
      {viewColumn: vscode.ViewColumn.Active},
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        enableCommandUris: [CommandId.OpenPage],
      },
    )

    this.recentsState.addRecent(id, state.title)
    await this.deserializeWebviewPanel(webviewPanel, state)
  }

  async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state?: NotionWebviewState) {
    if (!state) return

    const notionPage = new CachedNotionWebview(
      webviewPanel,
      state,
      webviewPanel.onDidDispose(() => {
        const cached = this.cache.get(state.id)
        if (cached) {
          cached.dispose()
          this.cache.delete(state.id)
        }
      }, this),
    )

    this.renderWebview(notionPage.webviewPanel, state)
    this.cache.set(state.id, notionPage)
  }

  private async refreshActivePage() {
    let activePage: [string, CachedNotionWebview] | undefined
    for (const cache of this.cache) {
      if (cache[1].webviewPanel.active) {
        activePage = cache
        break
      }
    }

    if (!activePage) return
    const [id, cache] = activePage

    const state = await this.fetchDataAndGetPageState(id)
    this.renderWebview(cache.webviewPanel, state)
  }

  private async rerenderCachedWebviews() {
    for (const cache of this.cache.values()) {
      this.renderWebview(cache.webviewPanel, cache.state)
    }
  }

  private async fetchDataAndGetPageState(id: string) {
    const data = await vscode.window.withProgress(
      {
        title: 'VSCode Notion',
        location: vscode.ProgressLocation.Notification,
      },
      async (progress, _) => {
        progress.report({message: 'Loading...'})
        return this.notionApi.getPageDataById(id)
      },
    )
    const title = getPageTitle(data) ?? untitledPageTitle
    return {id, title, data}
  }

  private renderWebview(webviewPanel: vscode.WebviewPanel, state: NotionWebviewState) {
    const nonce = nanoid()
    const extensionUri = this.context.extensionUri
    const cspSource = webviewPanel.webview.cspSource

    const config = vscode.workspace.getConfiguration(configurationPrefix)
    const fontFamily = config.get<string>(ConfigId.FontFamily)
    const fontSize = config.get<number>(ConfigId.FontSize)
    const fontSettings = `--notion-font-family: ${fontFamily};--notion-font-size: ${fontSize}px;`.replace(
      /"/g,
      '&quot;',
    )
    const frameSrcCsp = config.get<boolean>(ConfigId.AllowEmbeds) ? trustedSources.join(' ') : "'none'"

    const styleSheets = ['reset.css', 'vscode.css', 'notion.css', 'prism.css']
    const styleSheetUris = styleSheets.map((cssPath) =>
      webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'resources/css', cssPath)),
    )

    const reactWebviewUri = webviewPanel.webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'dist/webview.js'))

    webviewPanel.webview.html = `
<!DOCTYPE html>
<html lang="en" style="${fontSettings}">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      http-equiv="Content-Security-Policy" 
      content="frame-src ${frameSrcCsp}; default-src 'none';  style-src ${cspSource} 'unsafe-inline'; img-src ${cspSource} https:; script-src 'nonce-${nonce}';"
    />
    ${styleSheetUris.map((x) => `<link href="${x}" rel="stylesheet" />`).join('\n')}
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">
      const vscode = acquireVsCodeApi();
      vscode.setState(${JSON.stringify(state)});
      window.vscode = vscode;
    </script>
    <script nonce="${nonce}" src="${reactWebviewUri}"></script>
</body>
</html>`
  }
}
