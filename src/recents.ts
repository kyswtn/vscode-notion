import {ContextKeys, GlobalState, Injectable, OnExtensionBootstrap} from 'vedk'
import * as vscode from 'vscode'
import {CommandId, ContextId, TreeId} from './constants'
import {OpenPageCommandArgs} from './open-page-command'

type RecentEntry = {
  id: string
  title: string
  date: number
}

@Injectable()
export class RecentsStateProvider implements vscode.Disposable {
  private readonly onDidChangeRecentsEventEmitter = new vscode.EventEmitter<void>()

  constructor(private readonly globalState: GlobalState) {}

  dispose() {
    this.onDidChangeRecentsEventEmitter.dispose()
  }

  get onDidChangeRecents() {
    return this.onDidChangeRecentsEventEmitter.event
  }

  get recents() {
    return this.getEntries(TreeId.Recents)
  }

  async addRecent(id: string, title: string) {
    await this.addEntry(TreeId.Recents, id, title)
    this.onDidChangeRecentsEventEmitter.fire()
  }

  async removeRecent(id: string) {
    await this.removeEntry(TreeId.Recents, id)
    this.onDidChangeRecentsEventEmitter.fire()
  }

  async clearRecents() {
    await this.clearEntries(TreeId.Recents)
    this.onDidChangeRecentsEventEmitter.fire()
  }

  private getEntries(key: string) {
    const entries = this.globalState.get<RecentEntry[]>(key)
    return entries ?? []
  }

  private async addEntry(key: string, id: string, title: string) {
    const entries = [...this.getEntries(key)]

    const index = entries.findIndex((entry) => entry.id === id)
    if (index !== -1) {
      const entry = entries[index]!
      entries.splice(index, 1, {...entry, date: new Date().getTime()})
    } else {
      entries.push({
        id,
        title,
        date: new Date().getTime(),
      })
    }

    await this.globalState.update(key, entries)
  }

  private async removeEntry(key: string, id: string) {
    const entries = this.getEntries(key)
    await this.globalState.update(
      key,
      entries.filter((entry) => entry.id !== id),
    )
  }

  private async clearEntries(key: string) {
    await this.globalState.update(key, [])
  }
}

@Injectable()
export class RecentsTreeDataProvider implements vscode.TreeDataProvider<RecentEntry>, vscode.Disposable {
  private readonly onDidChangeTreeDataEventEmitter = new vscode.EventEmitter<void>()
  private readonly disposable: vscode.Disposable

  constructor(private readonly recentsState: RecentsStateProvider) {
    this.disposable = recentsState.onDidChangeRecents(() => {
      this.refresh()
    })
  }

  dispose() {
    this.disposable.dispose()
    this.onDidChangeTreeDataEventEmitter.dispose()
  }

  get onDidChangeTreeData() {
    return this.onDidChangeTreeDataEventEmitter.event
  }

  getTreeItem(entry: RecentEntry): vscode.TreeItem {
    return {
      iconPath: new vscode.ThemeIcon('file'),
      id: entry.id,
      label: entry.title,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      command: {
        command: CommandId.OpenPage,
        title: 'Open page',
        arguments: [{id: entry.id} satisfies OpenPageCommandArgs],
      },
    }
  }

  getChildren() {
    return this.recentsState.recents.sort((next, prev) => next.date - prev.date)
  }

  refresh() {
    this.onDidChangeTreeDataEventEmitter.fire()
  }
}

@Injectable()
export class RecentsTreeView implements OnExtensionBootstrap, vscode.Disposable {
  private readonly disposable: vscode.Disposable

  constructor(
    treeDataProvider: RecentsTreeDataProvider,
    private readonly recentsState: RecentsStateProvider,
    private readonly contextKeys: ContextKeys,
  ) {
    this.disposable = vscode.Disposable.from(
      treeDataProvider,
      vscode.window.registerTreeDataProvider(TreeId.Recents, treeDataProvider),
      vscode.commands.registerCommand(CommandId.RefreshRecents, treeDataProvider.refresh, treeDataProvider),
      vscode.commands.registerCommand(CommandId.ClearRecents, recentsState.clearRecents, recentsState),
      vscode.commands.registerCommand(CommandId.RemoveRecent, this.removeRecent, this),
    )
  }

  dispose() {
    this.disposable.dispose()
  }

  async onExtensionBootstrap() {
    await this.contextKeys.set(ContextId.IsReady, true)
  }

  private async removeRecent(item?: RecentEntry) {
    if (!item) return
    await this.recentsState.removeRecent(item.id)
  }
}
