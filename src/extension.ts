import 'reflect-metadata/lite'
import {Extension} from 'vedk'
import * as vscode from 'vscode'

import {NotionApiClient} from './notion-api-client'
import {NotionWebviewPanelSerializer} from './notion-webview-panel-serializer'
import {OpenPageCommand} from './open-page-command'
import {RecentsStateProvider, RecentsTreeDataProvider, RecentsTreeView} from './recents'

const extension = new Extension({
  entries: [
    NotionApiClient,
    NotionWebviewPanelSerializer,
    OpenPageCommand,
    // Recents
    RecentsStateProvider,
    RecentsTreeDataProvider,
    RecentsTreeView,
  ],
})

export async function activate(context: vscode.ExtensionContext) {
  await extension.activate(context)
}
