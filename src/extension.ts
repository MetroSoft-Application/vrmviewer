import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * 拡張機能がアクティブになったときに呼び出される
 */
export function activate(context: vscode.ExtensionContext) {
  // VRMエディタプロバイダの登録
  const vrmEditorProvider = new VrmEditorProvider(context);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      'vrmViewer.vrmPreview',
      vrmEditorProvider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    )
  );

  console.log('VRM Viewer 拡張機能がアクティブになりました');
}

/**
 * 拡張機能が非アクティブになったときに呼び出される
 */
export function deactivate() { }

/**
 * VRMファイルを表示するためのカスタムエディタプロバイダ
 */
class VrmEditorProvider implements vscode.CustomReadonlyEditorProvider {
  constructor(
    private readonly context: vscode.ExtensionContext
  ) { }

  /**
   * カスタムドキュメントを開く
   */
  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    token: vscode.CancellationToken
  ): Promise<vscode.CustomDocument> {
    // 単純なドキュメントを返す
    return { uri, dispose: () => { } };
  }

  /**
   * カスタムエディタを解決する
   */
  async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    // WebViewを設定
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'out')
      ]
    };

    // HTML内容をセット
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // VRMファイルデータをWebViewに送信
    try {
      const fileData = await vscode.workspace.fs.readFile(document.uri);
      const base64Data = Buffer.from(fileData).toString('base64');

      // データをWebViewに送信
      webviewPanel.webview.postMessage({
        type: 'loadVrm',
        data: base64Data,
        fileName: path.basename(document.uri.fsPath)
      });
    } catch (error) {
      vscode.window.showErrorMessage(`VRMファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }

    // WebViewからのメッセージを処理
    webviewPanel.webview.onDidReceiveMessage(message => {
      switch (message.type) {
        case 'error':
          vscode.window.showErrorMessage(message.message);
          break;
        case 'info':
          vscode.window.showInformationMessage(message.message);
          break;
        case 'debug':
          console.log(`デバッグ: ${message.message}`);
          break;
      }
    });
  }

  /**
   * WebView用のHTMLを生成する
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // nonce値を生成してCSP（Content Security Policy）で使用
    const nonce = this.getNonce();
    
    // HTMLファイルのパスを取得
    const htmlPath = vscode.Uri.file(
      path.join(this.context.extensionPath, 'resources', 'view', 'webview.html')
    );
    
    // HTMLファイルを読み込み
    let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
    
    // プレースホルダーを置換
    htmlContent = htmlContent
      .replace(/{{nonce}}/g, nonce)
      .replace(/{{cspSource}}/g, webview.cspSource);
      
    return htmlContent;
  }

  /**
   * ランダムなnonce値を生成する
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
};