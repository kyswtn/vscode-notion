export const untitledPageTitle = 'Untitled'

export const trustedSources = ['https://www.youtube.com', 'https://www.openstreetmap.org']

export const configurationPrefix = 'notion'
export const enum ConfigId {
  FontFamily = 'fontFamily',
  FontSize = 'fontSize',
  AllowEmbeds = 'allowEmbeds',
}

export const enum ContextId {
  IsReady = 'notion:isReady',
  NoRecents = 'notion:noRecents',
}

export const enum CommandId {
  OpenPage = 'notion.openPage',
  RefreshPage = 'notion.refreshPage',
  RefreshRecents = 'notion.recents.refresh',
  ClearRecents = 'notion.recents.clear',
  RemoveRecent = 'notion.recents.remove',
}

export const enum ViewType {
  NotionPageView = 'notion.pageView',
}

export const enum TreeId {
  Recents = 'notion-recents',
}
