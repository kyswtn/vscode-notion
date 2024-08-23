import React from 'react'
import {createRoot} from 'react-dom/client'
import {NotionRenderer} from 'react-notion-x'
import type {CommandId} from '../constants'
import type {NotionWebviewState} from '../notion-webview-panel-serializer'
import type {OpenPageCommandArgs} from '../open-page-command'

import {Code} from 'react-notion-x/build/third-party/code'
import {Collection} from 'react-notion-x/build/third-party/collection'
import {Equation} from 'react-notion-x/build/third-party/equation'
import {Modal} from 'react-notion-x/build/third-party/modal'
import {Pdf} from 'react-notion-x/build/third-party/pdf'

// Assertion because we can't actually import enum into here.
const openPageCommand: `${CommandId.OpenPage}` = 'notion.openPage'

declare global {
  interface Window {
    vscode: {
      getState: () => NotionWebviewState
      setState: (state: NotionWebviewState) => void
    }
  }
}

const root = createRoot(document.getElementById('root'))
const state = window.vscode.getState()
root.render(
  <NotionRenderer
    fullPage
    recordMap={state.data}
    components={{
      Code,
      Collection,
      Equation,
      Modal,
      Pdf,
      PageLink: ({
        href,
        children,
        ...props
      }: {href: string; children: React.ReactElement}) => {
        // Strip prefix / to get page ID.
        const args = JSON.stringify({id: href.slice(1)} as OpenPageCommandArgs)

        return (
          <a {...props} href={`command:${openPageCommand}?${encodeURI(args)}`}>
            {children}
          </a>
        )
      },
    }}
  />,
)
