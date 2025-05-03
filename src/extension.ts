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
        <script nonce="\${nonce}" src="https://unpkg.com/three@0.137.0/build/three.min.js"></script>
        <script nonce="\${nonce}" src="https://unpkg.com/three@0.137.0/examples/js/controls/OrbitControls.js"></script>
        <script nonce="\${nonce}" src="https://unpkg.com/three@0.137.0/examples/js/loaders/GLTFLoader.js"></script>
        <script nonce="\${nonce}" src="https://unpkg.com/@pixiv/three-vrm@1.0.9/lib/three-vrm.js"></script>

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
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
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
              // GLTFLoaderの設定
              const loader = new THREE.GLTFLoader();
              
              // VRM 1.0対応のプラグインを登録
              loader.register((parser) => {
                return new THREE.VRMLoaderPlugin(parser);
              });
              
              sendDebugMessage('VRMファイルのロード開始');
              
              // parseメソッドを使ってArrayBufferを直接ロード
              loader.parse(
                bytes.buffer,
                '',
                (gltf) => {
                  sendDebugMessage('GLTFモデルのロード成功、VRM取得開始');
                  
                  // VRM 1.0形式ではgltf.userData.vrmからVRMを取得
                  const vrm = gltf.userData.vrm;
                  
                  if (vrm) {
                    sendDebugMessage('VRM 1.0形式のモデルを検出');
                    currentVrm = vrm;
                    
                    // モデルの初期設定
                    vrm.scene.rotation.y = Math.PI; // モデルを前向きにする
                    
                    // シーンにVRMモデルを追加
                    scene.add(vrm.scene);
                    sendDebugMessage('VRMモデルをシーンに追加');
                    
                    // モデルが読み込まれたらローディング表示を隠す
                    loadingElement.style.display = 'none';
                    
                    // モデル情報の表示を更新
                    displayVrmMetadata(vrm);
                    
                    resetCamera();
                    
                    // 成功メッセージを拡張機能に送信
                    vscode.postMessage({
                      type: 'debug',
                      message: 'VRM 1.0モデルを読み込みました。'
                    });
                  } else {
                    // VRM 1.0形式でない場合、従来のVRM 0.x形式として読み込みを試みる
                    sendDebugMessage('VRM 1.0形式ではありません。VRM 0.x形式として読み込みを試みます。');
                    
                    THREE.VRM.from(gltf)
                      .then((vrm) => {
                        sendDebugMessage('VRM 0.x変換成功');
                        // VRMモデルが読み込まれた
                        currentVrm = vrm;
                        
                        // モデルの初期設定
                        vrm.scene.rotation.y = Math.PI; // モデルを前向きにする
                        
                        // シーンにVRMモデルを追加
                        scene.add(vrm.scene);
                        sendDebugMessage('VRM 0.xモデルをシーンに追加');
                        
                        // モデルが読み込まれたらローディング表示を隠す
                        loadingElement.style.display = 'none';
                        
                        // モデル情報の表示を更新
                        displayVrmMetadata(vrm);
                        
                        resetCamera();
                        
                        // 成功メッセージを拡張機能に送信
                        vscode.postMessage({
                          type: 'debug',
                          message: 'VRM 0.xモデルを読み込みました。'
                        });
                      })
                      .catch((error) => {
                        sendDebugMessage(\`VRM変換エラー: \${error.message}\`);
                        
                        // エラー時に代替としてGLTFモデルをそのまま表示
                        scene.add(gltf.scene);
                        sendDebugMessage('GLTFモデルをシーンに直接追加（VRM変換失敗のため）');
                        
                        loadingElement.style.display = 'none';
                        
                        // エラーメッセージを拡張機能に送信
                        vscode.postMessage({
                          type: 'error',
                          message: \`VRMの変換に失敗しました: \${error.message}\`
                        });
                      });
                  }
                },
                (error) => {
                  // エラーハンドリング
                  sendDebugMessage(\`VRMロードエラー: \${error.message}\`);
                  loadingElement.style.display = 'none';
                  
                  // エラーメッセージを拡張機能に送信
                  vscode.postMessage({
                    type: 'error',
                    message: \`VRMの読み込みに失敗しました: \${error.message}\`
                  });
                }
              );
            } catch (error) {
              sendDebugMessage(\`処理エラー: \${error.message}\`);
              loadingElement.style.display = 'none';
              
              // エラーメッセージを拡張機能に送信
              vscode.postMessage({
                type: 'error',
                message: \`処理エラー: \${error.message}\`
              });
            }
          }
          
          // VRMメタデータを表示する関数
          function displayVrmMetadata(vrm) {
            // メタデータ要素をクリア
            metadataElement.innerHTML = '<div class="metadata-title">VRMメタデータ</div>';

            // VRMバージョンの判定とメタデータの取得
            let meta;
            let isVrm1 = false;

            if (vrm.meta) {
              // VRM 1.0の場合はmeta直接、0.xの場合もmetaプロパティがあります
              meta = vrm.meta;
              // metaVersionプロパティでVRM1.0かどうかを判定
              isVrm1 = meta.metaVersion && meta.metaVersion.startsWith('1.');
              sendDebugMessage(\`VRMメタデータバージョン: \${isVrm1 ? '1.0' : '0.x'}\`);
            } else {
              // メタデータが見つからない場合
              const div = document.createElement('div');
              div.className = 'metadata-item';
              div.textContent = 'メタデータはありません';
              metadataElement.appendChild(div);
              return;
            }

            // モデル情報の基本情報を表示
            let modelName = '';
            let authorName = '';
            
            if (isVrm1) {
              modelName = meta.name || 'Unknown';
              authorName = Array.isArray(meta.authors) && meta.authors.length > 0 ? 
                meta.authors.join(', ') : (meta.authors || '');
            } else {
              modelName = meta.title || 'Unknown';
              authorName = meta.author || '';
            }
            
            let infoText = \`VRM \${isVrm1 ? '1.0' : '0.x'}: \${modelName}\`;
            if (authorName) {
              infoText += \` | 作者: \${authorName}\`;
            }
            infoElement.textContent = infoText;

            // VRM 1.0と0.xの両方のメタデータキーを網羅したリスト
            const metadataList = [
              // VRM 1.0のキー
              { key: 'name', label: 'モデル名(v1.0)' },
              { key: 'version', label: 'バージョン' },
              { key: 'authors', label: '作者(v1.0)', isArray: true },
              { key: 'copyrightInformation', label: '著作権情報(v1.0)' },
              { key: 'contactInformation', label: '連絡先' },
              { key: 'references', label: '参照(v1.0)', isArray: true },
              { key: 'thirdPartyLicenses', label: 'サードパーティライセンス' },
              { key: 'thumbnailImage', label: 'サムネイル', isImage: true },
              { key: 'licenseUrl', label: 'ライセンスURL(v1.0)' },
              { key: 'avatarPermission', label: 'アバター使用許可' },
              { key: 'allowExcessivelyViolentUsage', label: '暴力表現(v1.0)' },
              { key: 'allowExcessivelySexualUsage', label: '性的表現(v1.0)' },
              { key: 'commercialUsage', label: '商用利用(v1.0)' },
              { key: 'allowRedistribution', label: '再配布許可(v1.0)' },
              { key: 'allowModification', label: '改変許可(v1.0)' },
              
              // VRM 0.xのキー
              { key: 'title', label: 'タイトル(v0.x)' },
              { key: 'author', label: '作者(v0.x)' },
              { key: 'copyright', label: '著作権情報(v0.x)' },
              { key: 'reference', label: '参照(v0.x)' },
              { key: 'violentUssageName', label: '暴力表現(v0.x)' },
              { key: 'sexualUssageName', label: '性的表現(v0.x)' },
              { key: 'commercialUssageName', label: '商用利用(v0.x)' },
              { key: 'otherPermissionUrl', label: '他の許可URL' },
              { key: 'licenseName', label: 'ライセンス名' },
              { key: 'otherLicenseUrl', label: 'ライセンスURL(v0.x)' },
              { key: 'redistributionPermission', label: '再配布許可(v0.x)' },
              { key: 'modification', label: '改変許可(v0.x)' },
              { key: 'modelVersion', label: 'モデルバージョン' },
              { key: 'description', label: '説明' },
              { key: 'allowedUserName', label: '使用許可(v0.x)' }
            ];

            // メタデータを表示
            metadataList.forEach(item => {
              if (meta[item.key] !== undefined && meta[item.key] !== null) {
                const div = document.createElement('div');
                div.className = 'metadata-item';
                
                if (item.isImage && meta[item.key]) {
                  div.innerHTML = \`<span class="metadata-title">\${item.label}:</span>\`;
                  try {
                    // 画像要素を作成
                    const img = document.createElement('img');
                    const blob = new Blob([meta[item.key]], { type: 'image/png' });
                    img.src = URL.createObjectURL(blob);
                    img.style.maxWidth = '100%';
                    img.style.marginTop = '5px';
                    div.appendChild(img);
                  } catch (error) {
                    div.innerHTML += ' [サムネイル表示エラー]';
                    sendDebugMessage(\`サムネイル表示エラー: \${error.message}\`);
                  }
                } else if (item.isArray && Array.isArray(meta[item.key])) {
                  div.innerHTML = \`<span class="metadata-title">\${item.label}:</span> \${meta[item.key].join(', ')}\`;
                } else {
                  div.innerHTML = \`<span class="metadata-title">\${item.label}:</span> \${meta[item.key]}\`;
                }
                
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

            // VRMの更新処理
            if (currentVrm) {
              const delta = clock.getDelta();
              
              // VRM 1.0と0.xの両方に対応する更新方法
              if (typeof currentVrm.update === 'function') {
                currentVrm.update(delta);
              }
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