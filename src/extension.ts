import * as vscode from 'vscode';
import { VrmEditorProvider } from './VrmEditorProvider';

/**
 * 拡張機能がアクティブになったときに呼び出される
 * @param context - 拡張機能のコンテキスト。拡張機能のリソースやサブスクリプションを管理する
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
 * リソースのクリーンアップなどの終了処理を行う
 */
export function deactivate() { }