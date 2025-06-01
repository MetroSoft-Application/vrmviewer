import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * VRMファイルを表示するためのカスタムエディタプロバイダ
 * VS Codeのカスタムエディタ機能を利用してVRMファイルをプレビュー表示する
 */
export class VrmEditorProvider implements vscode.CustomReadonlyEditorProvider {
    /**
     * コンストラクタ
     * @param context - 拡張機能のコンテキスト。拡張機能のリソースへのアクセスに使用する
     */
    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    /**
     * カスタムドキュメントを開く
     * @param uri - 開くドキュメントのURI
     * @param openContext - ドキュメントを開くコンテキスト情報
     * @param token - 操作をキャンセルするためのキャンセレーショントークン
     * @returns カスタムドキュメントのインスタンス
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
     * @param document - 表示するカスタムドキュメント
     * @param webviewPanel - 表示に使用するWebViewパネル
     * @param token - 操作をキャンセルするためのキャンセレーショントークン
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
                vscode.Uri.joinPath(this.context.extensionUri, 'out'),
                vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'view')
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
     * @param webview - HTML内容を設定するWebViewインスタンス
     * @returns WebViewに表示するHTML文字列
     */
    private getHtmlForWebview(webview: vscode.Webview): string {
        const nonce = this.getNonce();
        const htmlPath = vscode.Uri.file(path.join(this.context.extensionPath, 'resources', 'view', 'webview.html'));
        const viewerJsPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'view', 'viewer.js'));
        const sceneManagerJsPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'view', 'scene-manager.js'));
        const vrmLoaderJsPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'view', 'vrm-loader.js'));
        const vrmUIJsPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'view', 'vrm-ui.js'));
        const boneControllerJsPath = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'view', 'bone-controller.js'));

        let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');
        htmlContent = htmlContent
            .replace(/{{nonce}}/g, nonce)
            .replace(/{{cspSource}}/g, webview.cspSource)
            .replace(/{{viewerJsPath}}/g, viewerJsPath.toString())
            .replace(/{{sceneManagerJsPath}}/g, sceneManagerJsPath.toString())
            .replace(/{{vrmLoaderJsPath}}/g, vrmLoaderJsPath.toString())
            .replace(/{{vrmUIJsPath}}/g, vrmUIJsPath.toString())
            .replace(/{{boneControllerJsPath}}/g, boneControllerJsPath.toString());

        return htmlContent;
    }

    /**
     * ランダムなnonce値を生成する
     * コンテンツセキュリティポリシー（CSP）のためのランダムな文字列を生成
     * @returns ランダムに生成された32文字の文字列
     */
    private getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}