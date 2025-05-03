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
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
        vscode.Uri.joinPath(this.context.extensionUri, 'node_modules'),
        vscode.Uri.joinPath(this.context.extensionUri, 'resources') // リソースフォルダを追加
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

    // リソースフォルダ内のスクリプトのURIを取得
    const threeJsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'three', 'three.min.js')
    );

    const orbitControlsUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'three', 'OrbitControls.js')
    );

    const gltfLoaderUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'three', 'GLTFLoader.js')
    );

    const vrmUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'vrm', 'three-vrm.js')
    );

    // リソースファイルが存在するか確認（デバッグ用）
    const checkFiles = [
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'three', 'three.min.js'),
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'three', 'OrbitControls.js'),
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'three', 'GLTFLoader.js'),
      vscode.Uri.joinPath(this.context.extensionUri, 'resources', 'libs', 'vrm', 'three-vrm.js')
    ];

    // ファイルの存在を確認してログに出力
    for (const fileUri of checkFiles) {
      try {
        if (fs.existsSync(fileUri.fsPath)) {
          console.log(`ファイルが存在します: ${fileUri.fsPath}`);
        } else {
          console.log(`ファイルが存在しません: ${fileUri.fsPath}`);
        }
      } catch (err) {
        console.error(`ファイル確認エラー: ${fileUri.fsPath}`, err);
      }
    }

    return /* html */`
      <!DOCTYPE html>
      <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} blob: data:; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' ${webview.cspSource} 'unsafe-eval';">
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
          
          #error-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: rgba(255, 0, 0, 0.7);
            color: white;
            padding: 15px;
            border-radius: 5px;
            max-width: 80%;
            text-align: center;
            z-index: 20;
            display: none;
          }
          
          #retry-button {
            margin-top: 10px;
            background-color: #ffffff;
            color: #333;
          }

          #debug-info {
            position: absolute;
            bottom: 10px;
            left: 10px;
            color: #666;
            font-size: 10px;
            z-index: 5;
            max-height: 150px;
            overflow-y: auto;
            background-color: rgba(255, 255, 255, 0.7);
            padding: 5px;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <div id="loading">VRMモデルを読み込み中...</div>
          <div id="info"></div>
          <div id="controls">
            <button id="reset-camera">カメラリセット</button>
          </div>
          <div id="error-container">
            <div id="error-message"></div>
            <button id="retry-button">再試行</button>
          </div>
          <div id="debug-info"></div>
        </div>
        
        <!-- Three.jsライブラリ本体を読み込み -->
        <script nonce="${nonce}" src="${threeJsUri}"></script>
        
        <!-- スクリプト読み込み用のヘルパー関数 -->
        <script nonce="${nonce}">
          // VSCodeのWebViewとの通信用
          const vscode = acquireVsCodeApi();
          
          // デバッグ情報表示要素
          const debugInfo = document.getElementById('debug-info');
          
          // デバッグのためのログ送信関数
          function sendDebugMessage(message) {
            console.log(message); // Devツールのコンソールに出力
            debugInfo.textContent += message + '\\n';
            vscode.postMessage({
              type: 'debug',
              message: message
            });
          }

          // エラー表示用の関数
          function showError(message) {
            const errorContainer = document.getElementById('error-container');
            const errorMessage = document.getElementById('error-message');
            document.getElementById('loading').style.display = 'none';
            errorMessage.textContent = message;
            errorContainer.style.display = 'block';
            
            // エラーメッセージを拡張機能に送信
            vscode.postMessage({
              type: 'error',
              message: message
            });
          }

          // THREEオブジェクトが正しく読み込まれているか確認
          if (typeof THREE === 'undefined') {
            showError('THREE オブジェクトが初期化されていません。Three.jsの読み込みに問題があります。');
          } else {
            sendDebugMessage('Three.js が正常に読み込まれました');
            
            // OrbitControlsを直接インラインで定義（Three.jsの依存があるため、Three.js読み込み後に実行）
            try {
              // OrbitControlsの基本機能を直接定義（簡易版）
              THREE.OrbitControls = function(camera, domElement) {
                this.camera = camera;
                this.domElement = domElement || document;
                this.target = new THREE.Vector3();
                this.enableDamping = false;
                this.dampingFactor = 0.05;
                this.enabled = true;
                
                var scope = this;
                var STATE = { NONE: -1, ROTATE: 0, DOLLY: 1, PAN: 2 };
                var state = STATE.NONE;
                var EPS = 0.000001;
                
                var rotateStart = new THREE.Vector2();
                var rotateEnd = new THREE.Vector2();
                var rotateDelta = new THREE.Vector2();
                
                var dollyStart = new THREE.Vector2();
                var dollyEnd = new THREE.Vector2();
                var dollyDelta = new THREE.Vector2();
                
                var panStart = new THREE.Vector2();
                var panEnd = new THREE.Vector2();
                var panDelta = new THREE.Vector2();
                
                var phiDelta = 0;
                var thetaDelta = 0;
                var scale = 1;
                
                function rotateLeft(angle) {
                  thetaDelta -= angle;
                }
                
                function rotateUp(angle) {
                  phiDelta -= angle;
                }
                
                var position = new THREE.Vector3();
                var offset = new THREE.Vector3();
                var lastPosition = new THREE.Vector3();
                
                this.update = function() {
                  if (!scope.enabled) return;
                  
                  position.copy(this.camera.position);
                  
                  // 視点の回転を更新
                  offset.copy(position).sub(this.target);
                  var theta = Math.atan2(offset.x, offset.z);
                  var phi = Math.atan2(Math.sqrt(offset.x * offset.x + offset.z * offset.z), offset.y);
                  
                  theta += thetaDelta;
                  phi += phiDelta;
                  
                  phi = Math.max(EPS, Math.min(Math.PI - EPS, phi));
                  
                  var radius = offset.length() * scale;
                  
                  offset.x = radius * Math.sin(phi) * Math.sin(theta);
                  offset.y = radius * Math.cos(phi);
                  offset.z = radius * Math.sin(phi) * Math.cos(theta);
                  
                  position.copy(this.target).add(offset);
                  this.camera.position.copy(position);
                  
                  // ダンピングを適用
                  if (this.enableDamping) {
                    thetaDelta *= (1 - this.dampingFactor);
                    phiDelta *= (1 - this.dampingFactor);
                    scale = 1 + (scale - 1) * (1 - this.dampingFactor);
                  } else {
                    thetaDelta = 0;
                    phiDelta = 0;
                    scale = 1;
                  }
                  
                  // カメラの更新完了
                  this.camera.lookAt(this.target);
                };
                
                function onMouseDown(event) {
                  if (!scope.enabled) return;
                  
                  event.preventDefault();
                  
                  if (event.button === 0) {
                    state = STATE.ROTATE;
                    rotateStart.set(event.clientX, event.clientY);
                  } else if (event.button === 1) {
                    state = STATE.DOLLY;
                    dollyStart.set(event.clientX, event.clientY);
                  } else if (event.button === 2) {
                    state = STATE.PAN;
                    panStart.set(event.clientX, event.clientY);
                  }
                  
                  document.addEventListener('mousemove', onMouseMove, false);
                  document.addEventListener('mouseup', onMouseUp, false);
                }
                
                function onMouseMove(event) {
                  if (!scope.enabled) return;
                  
                  event.preventDefault();
                  
                  if (state === STATE.ROTATE) {
                    rotateEnd.set(event.clientX, event.clientY);
                    rotateDelta.subVectors(rotateEnd, rotateStart);
                    
                    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
                    
                    // 回転の計算
                    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientWidth);
                    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
                    
                    rotateStart.copy(rotateEnd);
                  } else if (state === STATE.DOLLY) {
                    dollyEnd.set(event.clientX, event.clientY);
                    dollyDelta.subVectors(dollyEnd, dollyStart);
                    
                    if (dollyDelta.y > 0) {
                      scale /= 1.1;
                    } else if (dollyDelta.y < 0) {
                      scale *= 1.1;
                    }
                    
                    dollyStart.copy(dollyEnd);
                  }
                  
                  scope.update();
                }
                
                function onMouseUp(event) {
                  if (!scope.enabled) return;
                  
                  document.removeEventListener('mousemove', onMouseMove, false);
                  document.removeEventListener('mouseup', onMouseUp, false);
                  
                  state = STATE.NONE;
                }
                
                function onMouseWheel(event) {
                  if (!scope.enabled) return;
                  
                  event.preventDefault();
                  
                  var delta = 0;
                  
                  if (event.wheelDelta !== undefined) {
                    // WebKitやChrome
                    delta = event.wheelDelta;
                  } else if (event.detail !== undefined) {
                    // Firefox
                    delta = -event.detail;
                  }
                  
                  if (delta > 0) {
                    scale /= 1.1;
                  } else {
                    scale *= 1.1;
                  }
                  
                  scope.update();
                }
                
                this.domElement.addEventListener('contextmenu', function(event) { event.preventDefault(); }, false);
                this.domElement.addEventListener('mousedown', onMouseDown, false);
                this.domElement.addEventListener('mousewheel', onMouseWheel, false);
                this.domElement.addEventListener('DOMMouseScroll', onMouseWheel, false); // Firefox
              };
              
              sendDebugMessage('OrbitControls を手動で登録しました');
            } catch (error) {
              sendDebugMessage(\`OrbitControlsの手動登録に失敗しました: \${error.message}\`);
            }
            
            // GLTFLoaderを読み込み
            loadScript('${gltfLoaderUri}', () => {
              sendDebugMessage('GLTFLoader が正常に読み込まれました');
              
              // VRMライブラリを読み込み
              loadScript('${vrmUri}', () => {
                sendDebugMessage('VRM ライブラリが正常に読み込まれました');
                
                // 全てのライブラリの読み込みが成功したら、ビューワを初期化
                initializeViewer();
              }, (error) => {
                showError('VRMライブラリの読み込みに失敗しました');
              });
            }, (error) => {
              showError('GLTFLoaderの読み込みに失敗しました');
            });
          }

          // 各スクリプトの読み込み関数
          function loadScript(url, onSuccess, onError) {
            sendDebugMessage(\`スクリプトを読み込みます: \${url}\`);
            const script = document.createElement('script');
            script.nonce = "${nonce}";
            script.src = url;
            
            script.onload = () => {
              sendDebugMessage(\`スクリプト読み込み成功: \${url}\`);
              if (onSuccess) onSuccess();
            };
            
            script.onerror = (e) => {
              sendDebugMessage(\`スクリプト読み込み失敗: \${url}\`);
              if (onError) onError(e);
            };
            
            document.head.appendChild(script);
          }

          // 再試行ボタンのイベントリスナー
          document.getElementById('retry-button').addEventListener('click', () => {
            document.getElementById('error-container').style.display = 'none';
            document.getElementById('loading').style.display = 'block';
            document.getElementById('loading').textContent = 'ライブラリを再読み込み中...';
            
            // ページをリロード
            location.reload();
          });
          
          // Three.jsビューワーの初期化
          function initializeViewer() {
            try {
              // THREE オブジェクトが存在するかチェック
              if (typeof THREE === 'undefined') {
                throw new Error('THREE オブジェクトが初期化されていません');
              }
              
              // OrbitControlsが存在するかチェック
              if (typeof THREE.OrbitControls === 'undefined') {
                throw new Error('THREE.OrbitControls が見つかりません');
              }
              
              // GLTFLoaderが存在するかチェック
              if (typeof THREE.GLTFLoader === 'undefined') {
                throw new Error('THREE.GLTFLoader が見つかりません');
              }
              
              sendDebugMessage('全てのライブラリが正常に読み込まれました');
              
              // Three.js関連の変数
              let container;
              let camera, scene, renderer;
              let controls;
              let currentVrm;
              let loadingElement;
              let infoElement;
              let errorContainer;
              let errorMessage;
              
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
                errorContainer = document.getElementById('error-container');
                errorMessage = document.getElementById('error-message');
                
                // シーン作成
                scene = new THREE.Scene();
                scene.background = new THREE.Color(0x303030);
                
                // カメラの設定
                camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
                camera.position.set(0, 1.5, 3);
                
                // ライトの設定
                const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
                scene.add(ambientLight);
                
                const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
                directionalLight.position.set(1, 1, 1);
                scene.add(directionalLight);
                
                // バックライト（モデルの輪郭を見やすくする）
                const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
                backLight.position.set(-1, 1, -1);
                scene.add(backLight);
                
                // レンダラーの設定
                try {
                  renderer = new THREE.WebGLRenderer({ antialias: true });
                  renderer.setPixelRatio(window.devicePixelRatio);
                  renderer.setSize(window.innerWidth, window.innerHeight);
                  
                  // three.js r137以降はsRGBEncodingの代わりにoutputColorSpaceを使用
                  if (typeof renderer.outputColorSpace !== 'undefined') {
                    renderer.outputColorSpace = THREE.SRGBColorSpace;
                  } else if (typeof renderer.outputEncoding !== 'undefined') {
                    renderer.outputEncoding = THREE.sRGBEncoding;
                  }
                  
                  container.appendChild(renderer.domElement);
                  sendDebugMessage('WebGLレンダラーを正常に初期化しました');
                } catch (error) {
                  showError(\`WebGLレンダラーの初期化に失敗しました: \${error.message}\`);
                  return;
                }
                
                try {
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
                } catch (error) {
                  showError(\`シーン要素の初期化に失敗しました: \${error.message}\`);
                  return;
                }
                
                // リサイズハンドラ
                window.addEventListener('resize', onWindowResize);
                
                // アニメーションループ開始
                animate();
                
                sendDebugMessage('Three.js 初期化完了');
                loadingElement.textContent = 'シーンの準備ができました。VRMモデルを読み込んでいます...';
              }
              
              // Base64データからVRMを読み込む
              function loadVrmFromBase64(base64String, fileName) {
                sendDebugMessage(\`VRMロード開始: \${fileName}\`);
                loadingElement.style.display = 'block';
                infoElement.textContent = \`ファイル: \${fileName}\`;
                errorContainer.style.display = 'none';
                
                try {
                  // base64をバイナリデータに変換
                  const binary = atob(base64String);
                  const bytes = new Uint8Array(binary.length);
                  for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                  }
                  
                  const blob = new Blob([bytes], { type: 'application/octet-stream' });
                  const url = URL.createObjectURL(blob);
                  
                  // 既存のVRMを削除
                  if (currentVrm) {
                    scene.remove(currentVrm.scene);
                    currentVrm = null;
                  }
                  
                  // GLTFLoader
                  const loader = new THREE.GLTFLoader();
                  
                  // VRMを読み込み
                  sendDebugMessage('VRMファイルのロード開始');
                  loader.load(
                    url,
                    (gltf) => {
                      sendDebugMessage('GLTFモデルのロード成功、VRM変換開始');
                      
                      // VRM変換の詳細をログ出力
                      console.log('GLTFデータ:', gltf);
                      
                      // VRMライブラリが利用可能か確認
                      if (typeof THREE.VRM === 'undefined') {
                        sendDebugMessage('ERROR: THREE.VRMが初期化されていません');
                        
                        // VRMライブラリがない場合はGLTFとして表示
                        scene.add(gltf.scene);
                        sendDebugMessage('GLTFモデルをシーンに直接追加（VRMライブラリなし）');
                        
                        loadingElement.style.display = 'none';
                        infoElement.textContent = \`ファイル: \${fileName} (GLTFとして表示)\`;
                        
                        vscode.postMessage({
                          type: 'warning',
                          message: 'VRMライブラリが読み込まれていません。GLTFとして表示します。'
                        });
                        
                        // Blobの解放
                        URL.revokeObjectURL(url);
                        return;
                      }
                      
                      // VRM変換を試行
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
                          }
                          
                          resetCamera();
                          
                          // Blobの解放
                          URL.revokeObjectURL(url);
                          
                          // 成功メッセージを拡張機能に送信
                          vscode.postMessage({
                            type: 'info',
                            message: 'VRMモデルを読み込みました。'
                          });
                        })
                        .catch((error) => {
                          sendDebugMessage(\`VRM変換エラー: \${error.message}\`);
                          console.error('VRM変換エラー:', error);
                          
                          // エラー時に代替としてGLTFモデルをそのまま表示
                          try {
                            scene.add(gltf.scene);
                            sendDebugMessage('GLTFモデルをシーンに直接追加（VRM変換失敗のため）');
                            loadingElement.style.display = 'none';
                            infoElement.textContent = \`ファイル: \${fileName} (GLTFとして表示)\`;
                            
                            // Blobの解放
                            URL.revokeObjectURL(url);
                          } catch (e) {
                            showError(\`モデル表示に失敗しました: \${e.message}\`);
                          }
                          
                          // エラーメッセージを表示
                          showError(\`VRMの変換に失敗しました: \${error.message}\`);
                        });
                    },
                    (progress) => {
                      // 進捗状況の更新
                      if (progress.total > 0) {
                        const percentComplete = Math.round((progress.loaded / progress.total) * 100);
                        loadingElement.textContent = \`読み込み中... \${percentComplete}%\`;
                        sendDebugMessage(\`ロード進捗: \${percentComplete}%\`);
                      }
                    },
                    (error) => {
                      // エラーハンドリング
                      sendDebugMessage(\`VRMロードエラー: \${error.message}\`);
                      console.error('VRMの読み込みエラー:', error);
                      
                      // エラーメッセージを表示
                      showError(\`VRMファイルの読み込みに失敗しました: \${error.message}\`);
                      
                      // Blobの解放
                      URL.revokeObjectURL(url);
                    }
                  );
                } catch (error) {
                  sendDebugMessage(\`処理エラー: \${error.message}\`);
                  console.error('エラー:', error);
                  
                  // エラーメッセージを表示
                  showError(\`処理エラー: \${error.message}\`);
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
                
                try {
                  // コントロールの更新
                  controls.update();
                  
                  // レンダリング
                  renderer.render(scene, camera);
                } catch (e) {
                  console.error('レンダリングエラー:', e);
                }
              }
              
              // 初期化完了メッセージ
              sendDebugMessage('WebView初期化完了');
            } catch (error) {
              console.error('初期化エラー:', error);
              showError(\`ビューワーの初期化に失敗しました: \${error.message}\`);
            }
          }
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
}