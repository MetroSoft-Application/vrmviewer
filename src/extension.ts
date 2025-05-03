import * as vscode from 'vscode';
import * as path from 'path';

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
   * WebView用のHTMLを生成する（CSSとJavaScriptを埋め込み）
   */
  private getHtmlForWebview(webview: vscode.Webview): string {
    // nonce値を生成してCSP（Content Security Policy）で使用
    const nonce = this.getNonce();

    return /* html */`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' https://unpkg.com; connect-src blob:;">
        <title>VRM Viewer</title>
        
        <!-- スタイルを直接埋め込み -->
        <style>
          body, html {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          }
          
          #container {
            width: 100%;
            height: 100%;
            position: relative;
          }
          
          #loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10;
          }
          
          #info {
            position: absolute;
            top: 10px;
            left: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 12px;
          }
          
          #metadata {
            position: absolute;
            top: 10px;
            right: 10px;
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-size: 12px;
            max-width: 300px;
            max-height: 80vh;
            overflow-y: auto;
          }
          
          .metadata-item {
            margin-bottom: 5px;
          }
          
          .metadata-title {
            font-weight: bold;
            color: #88ccff;
          }
          
          #controls {
            position: absolute;
            bottom: 10px;
            right: 10px;
          }
          
          button {
            background-color: #0e639c;
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
          }
          
          button:hover {
            background-color: #1177bb;
          }
          
          button:active {
            background-color: #0d5086;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <div id="loading">VRMモデルを読み込み中...</div>
          <div id="info"></div>
          <div id="metadata"></div>
          <div id="controls">
            <button id="reset-camera">カメラリセット</button>
          </div>
        </div>
        
        <!-- Three.jsとVRM関連ライブラリをCDNから読み込み -->
        <script nonce="${nonce}" src="https://unpkg.com/three@0.137.0/build/three.min.js"></script>
        <script nonce="${nonce}" src="https://unpkg.com/three@0.137.0/examples/js/controls/OrbitControls.js"></script>
        <script nonce="${nonce}" src="https://unpkg.com/three@0.137.0/examples/js/loaders/GLTFLoader.js"></script>
        <script nonce="${nonce}" src="https://unpkg.com/@pixiv/three-vrm@0.6.11/lib/three-vrm.js"></script>
        
        <!-- メインスクリプトを直接埋め込み -->
        <script nonce="${nonce}">
          // VSCodeのWebViewとの通信用
          const vscode = acquireVsCodeApi();
          
          // デバッグのためのログ送信関数
          function sendDebugMessage(message) {
            console.log(message); // Devツールのコンソールに出力
            vscode.postMessage({
              type: 'debug',
              message: message
            });
          }
          
          // Three.js関連の変数
          let container;
          let camera, scene, renderer;
          let controls;
          let currentVrm;
          let loadingElement;
          let infoElement;
          let metadataElement;
          
          // 初期化
          init();
          
          // メッセージハンドラの登録（拡張機能からのメッセージを受信）
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
              case 'loadVrm':
                loadVrmFromBase64(message.data, message.fileName);
                break;
            }
          });
          
          // リセットボタンのイベントリスナー
          document.getElementById('reset-camera').addEventListener('click', resetCamera);
          
          // Three.jsの初期化
          function init() {
            sendDebugMessage('Three.js 初期化開始');
            container = document.getElementById('container');
            loadingElement = document.getElementById('loading');
            infoElement = document.getElementById('info');
            metadataElement = document.getElementById('metadata');
            
            // シーン作成
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x303030);
            
            // カメラの設定
            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
            camera.position.set(0, 1.5, 3);
            
            // ライトの設定
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // 明るさを上げる
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // 明るさを上げる
            directionalLight.position.set(1, 1, 1);
            scene.add(directionalLight);
            
            // レンダラーの設定
            renderer = new THREE.WebGLRenderer({ antialias: true });
            renderer.setPixelRatio(window.devicePixelRatio);
            renderer.setSize(window.innerWidth, window.innerHeight);
            container.appendChild(renderer.domElement);
            
            // OrbitControlsの設定
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.target.set(0, 1, 0);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            
            // グリッドヘルパー
            const gridHelper = new THREE.GridHelper(10, 10);
            scene.add(gridHelper);
            
            // 軸ヘルパー
            const axesHelper = new THREE.AxesHelper(5);
            scene.add(axesHelper);
            
            // リサイズハンドラ
            window.addEventListener('resize', onWindowResize);
            
            // アニメーションループ開始
            animate();
            
            sendDebugMessage('Three.js 初期化完了');
          }
          
          // Base64データからVRMを読み込む
          function loadVrmFromBase64(base64String, fileName) {
            sendDebugMessage(\`VRMロード開始: \${fileName}\`);
            loadingElement.style.display = 'block';
            infoElement.textContent = \`ファイル: \${fileName}\`;
            
            try {
              // base64をバイナリデータに変換
              const binary = atob(base64String);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i++) {
                bytes[i] = binary.charCodeAt(i);
              }
              
              // 既存のVRMを削除
              if (currentVrm) {
                scene.remove(currentVrm.scene);
                currentVrm = null;
              }
              
              sendDebugMessage('GLTFLoaderを作成');
              // GLTFLoader
              const loader = new THREE.GLTFLoader();
              
              // VRM拡張をサポートするようにロードを設定
              loader.crossOrigin = 'anonymous';
              
              // Blobを使わずに直接ArrayBufferを使用
              sendDebugMessage('VRMファイルのロード開始 (ArrayBufferを使用)');
              
              // parseメソッドを使ってArrayBufferを直接ロード
              loader.parse(
                bytes.buffer,
                '',
                (gltf) => {
                  sendDebugMessage('GLTFモデルのロード成功、VRM変換開始');
                  console.log('GLTFデータ:', gltf);
                  
                  THREE.VRM.from(gltf)
                    .then((vrm) => {
                      sendDebugMessage('VRM変換成功');
                      // VRMモデルが読み込まれた
                      currentVrm = vrm;
                      
                      // モデルの初期設定
                      vrm.scene.rotation.y = Math.PI; // モデルを前向きにする
                      
                      // シーンにVRMモデルを追加
                      scene.add(vrm.scene);
                      sendDebugMessage('VRMモデルをシーンに追加');
                      
                      // モデルのボーンや構造を調べる
                      if (vrm && vrm.humanoid) {
                        const bones = vrm.humanoid.humanBones;
                        sendDebugMessage(\`モデルのボーン数: \${Object.keys(bones).length}\`);
                      }
                      
                      // モデルが読み込まれたらローディング表示を隠す
                      loadingElement.style.display = 'none';
                      
                      // モデル情報の表示を更新
                      const meta = vrm.meta;
                      if (meta) {
                        let infoText = \`モデル名: \${meta.title || 'Unknown'}\`;
                        if (meta.author) {
                          infoText += \` | 作者: \${meta.author}\`;
                        }
                        infoElement.textContent = infoText;
                        sendDebugMessage(\`モデル情報: \${infoText}\`);
                        displayVrmMetadata(meta);
                      }
                      
                      resetCamera();
                      
                      // 成功メッセージを拡張機能に送信
                      vscode.postMessage({
                        type: 'debug',
                        message: 'VRMモデルを読み込みました。'
                      });
                    })
                    .catch((error) => {
                      sendDebugMessage(\`VRM変換エラー: \${error.message}\`);
                      console.error('VRM変換エラー:', error);
                      
                      // エラー時に代替としてGLTFモデルをそのまま表示してみる
                      scene.add(gltf.scene);
                      sendDebugMessage('GLTFモデルをシーンに直接追加（VRM変換失敗のため）');
                      
                      loadingElement.style.display = 'none';
                      
                      // エラーメッセージを拡張機能に送信
                      vscode.postMessage({
                        type: 'error',
                        message: \`VRMの変換に失敗しました: \${error.message}\`
                      });
                    });
                },
                (error) => {
                  // エラーハンドリング
                  sendDebugMessage(\`VRMロードエラー: \${error.message}\`);
                  console.error('VRMの読み込みエラー:', error);
                  loadingElement.style.display = 'none';
                  
                  // エラーメッセージを拡張機能に送信
                  vscode.postMessage({
                    type: 'debug',
                    message: \`VRMの読み込みに失敗しました: \${error.message}\`
                  });
                }
              );
            } catch (error) {
              sendDebugMessage(\`処理エラー: \${error.message}\`);
              console.error('エラー:', error);
              loadingElement.style.display = 'none';
              
              // エラーメッセージを拡張機能に送信
              vscode.postMessage({
                type: 'debug',
                message: \`処理エラー: \${error.message}\`
              });
            }
          }
          
          // VRMメタデータを表示する関数
          function displayVrmMetadata(meta) {
            // メタデータ要素をクリア
            metadataElement.innerHTML = '<div class="metadata-title">VRMメタデータ</div>';

            // 使用可能なすべてのメタデータを表示
            const metadataList = [
              { key: 'title', label: 'タイトル' },
              { key: 'version', label: 'バージョン' },
              { key: 'author', label: '作者' },
              { key: 'contactInformation', label: '連絡先' },
              { key: 'reference', label: '参照' },
              { key: 'allowedUserName', label: '使用許可' },
              { key: 'violentUssageName', label: '暴力表現' },
              { key: 'sexualUssageName', label: '性的表現' },
              { key: 'commercialUssageName', label: '商用利用' },
              { key: 'otherPermissionUrl', label: '他の許可URL' },
              { key: 'licenseName', label: 'ライセンス名' },
              { key: 'otherLicenseUrl', label: 'ライセンスURL' }
            ];

            // メタデータを表示
            metadataList.forEach(item => {
              if (meta[item.key]) {
                const div = document.createElement('div');
                div.className = 'metadata-item';
                div.innerHTML = \`<span class="metadata-title">\${item.label}:</span> \${meta[item.key]}\`;
                metadataElement.appendChild(div);
              }
            });

            // メタデータが何も表示されない場合
            if (metadataElement.children.length <= 1) {
              const div = document.createElement('div');
              div.className = 'metadata-item';
              div.textContent = '詳細なメタデータはありません';
              metadataElement.appendChild(div);
            }
          }

          // カメラをリセット
          function resetCamera() {
            if (currentVrm) {
              // モデルの位置を中心に
              camera.position.set(0, 1.5, 3);
              controls.target.set(0, 1, 0);
            } else {
              camera.position.set(0, 1.5, 3);
              controls.target.set(0, 1, 0);
            }
            controls.update();
            sendDebugMessage('カメラをリセットしました');
          }

          // ウィンドウリサイズ時の処理
          function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
          }

          // アニメーションループ
          function animate() {
            requestAnimationFrame(animate);

            // コントロールの更新
            controls.update();

            // VRMの更新処理（必要に応じて）
            if (currentVrm) {
              // currentVrm.update(clock.getDelta());
            }

            // レンダリング
            renderer.render(scene, camera);
          }

          // 時間管理用のクロック
          const clock = new THREE.Clock();

          // 初期化完了メッセージ
          sendDebugMessage('WebView初期化完了');
        </script>
      </body>
      </html>
    `;
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