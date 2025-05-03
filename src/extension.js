"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
var vscode = require("vscode");
var path = require("path");
/**
 * 拡張機能がアクティブになったときに呼び出される
 */
function activate(context) {
    // VRMエディタプロバイダの登録
    var vrmEditorProvider = new VrmEditorProvider(context);
    context.subscriptions.push(vscode.window.registerCustomEditorProvider('vrmViewer.vrmPreview', vrmEditorProvider, {
        webviewOptions: {
            retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
    }));
    console.log('VRM Viewer 拡張機能がアクティブになりました');
}
exports.activate = activate;
/**
 * 拡張機能が非アクティブになったときに呼び出される
 */
function deactivate() { }
exports.deactivate = deactivate;
/**
 * VRMファイルを表示するためのカスタムエディタプロバイダ
 */
var VrmEditorProvider = /** @class */ (function () {
    function VrmEditorProvider(context) {
        this.context = context;
    }
    /**
     * カスタムドキュメントを開く
     */
    VrmEditorProvider.prototype.openCustomDocument = function (uri, openContext, token) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // 単純なドキュメントを返す
                return [2 /*return*/, { uri: uri, dispose: function () { } }];
            });
        });
    };
    /**
     * カスタムエディタを解決する
     */
    VrmEditorProvider.prototype.resolveCustomEditor = function (document, webviewPanel, token) {
        return __awaiter(this, void 0, void 0, function () {
            var fileData, base64Data, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // WebViewを設定
                        webviewPanel.webview.options = {
                            enableScripts: true,
                            localResourceRoots: [
                                vscode.Uri.joinPath(this.context.extensionUri, 'out')
                            ]
                        };
                        // HTML内容をセット
                        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, vscode.workspace.fs.readFile(document.uri)];
                    case 2:
                        fileData = _a.sent();
                        base64Data = Buffer.from(fileData).toString('base64');
                        // データをWebViewに送信
                        webviewPanel.webview.postMessage({
                            type: 'loadVrm',
                            data: base64Data,
                            fileName: path.basename(document.uri.fsPath)
                        });
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        vscode.window.showErrorMessage("VRM\u30D5\u30A1\u30A4\u30EB\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)));
                        return [3 /*break*/, 4];
                    case 4:
                        // WebViewからのメッセージを処理
                        webviewPanel.webview.onDidReceiveMessage(function (message) {
                            switch (message.type) {
                                case 'error':
                                    vscode.window.showErrorMessage(message.message);
                                    break;
                                case 'info':
                                    vscode.window.showInformationMessage(message.message);
                                    break;
                                case 'debug':
                                    console.log("\u30C7\u30D0\u30C3\u30B0: ".concat(message.message));
                                    break;
                            }
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * WebView用のHTMLを生成する（CSSとJavaScriptを埋め込み）
     */
    VrmEditorProvider.prototype.getHtmlForWebview = function (webview) {
        // nonce値を生成してCSP（Content Security Policy）で使用
        var nonce = this.getNonce();
        return /* html */ "\n      <!DOCTYPE html>\n      <html lang=\"ja\">\n      <head>\n        <meta charset=\"UTF-8\">\n        <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n        <meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src ".concat(webview.cspSource, " blob:; style-src 'unsafe-inline'; script-src 'nonce-").concat(nonce, "' https://unpkg.com; connect-src blob:;\">\n        <title>VRM Viewer</title>\n        \n        <!-- \u30B9\u30BF\u30A4\u30EB\u3092\u76F4\u63A5\u57CB\u3081\u8FBC\u307F -->\n        <style>\n          body, html {\n            margin: 0;\n            padding: 0;\n            width: 100%;\n            height: 100%;\n            overflow: hidden;\n            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;\n          }\n          \n          #container {\n            width: 100%;\n            height: 100%;\n            position: relative;\n          }\n          \n          #loading {\n            position: absolute;\n            top: 50%;\n            left: 50%;\n            transform: translate(-50%, -50%);\n            background-color: rgba(0, 0, 0, 0.7);\n            color: white;\n            padding: 10px 20px;\n            border-radius: 5px;\n            z-index: 10;\n          }\n          \n          #info {\n            position: absolute;\n            top: 10px;\n            left: 10px;\n            background-color: rgba(0, 0, 0, 0.7);\n            color: white;\n            padding: 5px 10px;\n            border-radius: 5px;\n            font-size: 12px;\n          }\n          \n          #metadata {\n            position: absolute;\n            top: 10px;\n            right: 10px;\n            background-color: rgba(0, 0, 0, 0.7);\n            color: white;\n            padding: 10px;\n            border-radius: 5px;\n            font-size: 12px;\n            max-width: 300px;\n            max-height: 80vh;\n            overflow-y: auto;\n          }\n          \n          .metadata-item {\n            margin-bottom: 5px;\n          }\n          \n          .metadata-title {\n            font-weight: bold;\n            color: #88ccff;\n          }\n          \n          #controls {\n            position: absolute;\n            bottom: 10px;\n            right: 10px;\n          }\n          \n          button {\n            background-color: #0e639c;\n            color: white;\n            border: none;\n            padding: 8px 12px;\n            border-radius: 3px;\n            cursor: pointer;\n            font-size: 12px;\n          }\n          \n          button:hover {\n            background-color: #1177bb;\n          }\n          \n          button:active {\n            background-color: #0d5086;\n          }\n        </style>\n      </head>\n      <body>\n        <div id=\"container\">\n          <div id=\"loading\">VRM\u30E2\u30C7\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u4E2D...</div>\n          <div id=\"info\"></div>\n          <div id=\"metadata\"></div>\n          <div id=\"controls\">\n            <button id=\"reset-camera\">\u30AB\u30E1\u30E9\u30EA\u30BB\u30C3\u30C8</button>\n          </div>\n        </div>\n        \n        <!-- Three.js\u3068VRM\u95A2\u9023\u30E9\u30A4\u30D6\u30E9\u30EA\u3092CDN\u304B\u3089\u8AAD\u307F\u8FBC\u307F -->\n        <script nonce=\"").concat(nonce, "\" src=\"https://unpkg.com/three@0.137.0/build/three.min.js\"></script>\n        <script nonce=\"").concat(nonce, "\" src=\"https://unpkg.com/three@0.137.0/examples/js/controls/OrbitControls.js\"></script>\n        <script nonce=\"").concat(nonce, "\" src=\"https://unpkg.com/three@0.137.0/examples/js/loaders/GLTFLoader.js\"></script>\n        <script nonce=\"").concat(nonce, "\" src=\"https://unpkg.com/@pixiv/three-vrm@0.6.11/lib/three-vrm.js\"></script>\n        \n        <!-- \u30E1\u30A4\u30F3\u30B9\u30AF\u30EA\u30D7\u30C8\u3092\u76F4\u63A5\u57CB\u3081\u8FBC\u307F -->\n        <script nonce=\"").concat(nonce, "\">\n          // VSCode\u306EWebView\u3068\u306E\u901A\u4FE1\u7528\n          const vscode = acquireVsCodeApi();\n          \n          // \u30C7\u30D0\u30C3\u30B0\u306E\u305F\u3081\u306E\u30ED\u30B0\u9001\u4FE1\u95A2\u6570\n          function sendDebugMessage(message) {\n            console.log(message); // Dev\u30C4\u30FC\u30EB\u306E\u30B3\u30F3\u30BD\u30FC\u30EB\u306B\u51FA\u529B\n            vscode.postMessage({\n              type: 'debug',\n              message: message\n            });\n          }\n          \n          // Three.js\u95A2\u9023\u306E\u5909\u6570\n          let container;\n          let camera, scene, renderer;\n          let controls;\n          let currentVrm;\n          let loadingElement;\n          let infoElement;\n          let metadataElement;\n          \n          // \u521D\u671F\u5316\n          init();\n          \n          // \u30E1\u30C3\u30BB\u30FC\u30B8\u30CF\u30F3\u30C9\u30E9\u306E\u767B\u9332\uFF08\u62E1\u5F35\u6A5F\u80FD\u304B\u3089\u306E\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u53D7\u4FE1\uFF09\n          window.addEventListener('message', event => {\n            const message = event.data;\n            switch (message.type) {\n              case 'loadVrm':\n                loadVrmFromBase64(message.data, message.fileName);\n                break;\n            }\n          });\n          \n          // \u30EA\u30BB\u30C3\u30C8\u30DC\u30BF\u30F3\u306E\u30A4\u30D9\u30F3\u30C8\u30EA\u30B9\u30CA\u30FC\n          document.getElementById('reset-camera').addEventListener('click', resetCamera);\n          \n          // Three.js\u306E\u521D\u671F\u5316\n          function init() {\n            sendDebugMessage('Three.js \u521D\u671F\u5316\u958B\u59CB');\n            container = document.getElementById('container');\n            loadingElement = document.getElementById('loading');\n            infoElement = document.getElementById('info');\n            metadataElement = document.getElementById('metadata');\n            \n            // \u30B7\u30FC\u30F3\u4F5C\u6210\n            scene = new THREE.Scene();\n            scene.background = new THREE.Color(0x303030);\n            \n            // \u30AB\u30E1\u30E9\u306E\u8A2D\u5B9A\n            camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);\n            camera.position.set(0, 1.5, 3);\n            \n            // \u30E9\u30A4\u30C8\u306E\u8A2D\u5B9A\n            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // \u660E\u308B\u3055\u3092\u4E0A\u3052\u308B\n            scene.add(ambientLight);\n            \n            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // \u660E\u308B\u3055\u3092\u4E0A\u3052\u308B\n            directionalLight.position.set(1, 1, 1);\n            scene.add(directionalLight);\n            \n            // \u30EC\u30F3\u30C0\u30E9\u30FC\u306E\u8A2D\u5B9A\n            renderer = new THREE.WebGLRenderer({ antialias: true });\n            renderer.setPixelRatio(window.devicePixelRatio);\n            renderer.setSize(window.innerWidth, window.innerHeight);\n            container.appendChild(renderer.domElement);\n            \n            // OrbitControls\u306E\u8A2D\u5B9A\n            controls = new THREE.OrbitControls(camera, renderer.domElement);\n            controls.target.set(0, 1, 0);\n            controls.enableDamping = true;\n            controls.dampingFactor = 0.05;\n            \n            // \u30B0\u30EA\u30C3\u30C9\u30D8\u30EB\u30D1\u30FC\n            const gridHelper = new THREE.GridHelper(10, 10);\n            scene.add(gridHelper);\n            \n            // \u8EF8\u30D8\u30EB\u30D1\u30FC\n            const axesHelper = new THREE.AxesHelper(5);\n            scene.add(axesHelper);\n            \n            // \u30EA\u30B5\u30A4\u30BA\u30CF\u30F3\u30C9\u30E9\n            window.addEventListener('resize', onWindowResize);\n            \n            // \u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u30EB\u30FC\u30D7\u958B\u59CB\n            animate();\n            \n            sendDebugMessage('Three.js \u521D\u671F\u5316\u5B8C\u4E86');\n          }\n          \n          // Base64\u30C7\u30FC\u30BF\u304B\u3089VRM\u3092\u8AAD\u307F\u8FBC\u3080\n          function loadVrmFromBase64(base64String, fileName) {\n            sendDebugMessage(`VRM\u30ED\u30FC\u30C9\u958B\u59CB: ${fileName}`);\n            loadingElement.style.display = 'block';\n            infoElement.textContent = `\u30D5\u30A1\u30A4\u30EB: ${fileName}`;\n            \n            try {\n              // base64\u3092\u30D0\u30A4\u30CA\u30EA\u30C7\u30FC\u30BF\u306B\u5909\u63DB\n              const binary = atob(base64String);\n              const bytes = new Uint8Array(binary.length);\n              for (let i = 0; i < binary.length; i++) {\n                bytes[i] = binary.charCodeAt(i);\n              }\n              \n              // \u65E2\u5B58\u306EVRM\u3092\u524A\u9664\n              if (currentVrm) {\n                scene.remove(currentVrm.scene);\n                currentVrm = null;\n              }\n              \n              sendDebugMessage('GLTFLoader\u3092\u4F5C\u6210');\n              // GLTFLoader\n              const loader = new THREE.GLTFLoader();\n              \n              // VRM\u62E1\u5F35\u3092\u30B5\u30DD\u30FC\u30C8\u3059\u308B\u3088\u3046\u306B\u30ED\u30FC\u30C9\u3092\u8A2D\u5B9A\n              loader.crossOrigin = 'anonymous';\n              \n              // Blob\u3092\u4F7F\u308F\u305A\u306B\u76F4\u63A5ArrayBuffer\u3092\u4F7F\u7528\n              sendDebugMessage('VRM\u30D5\u30A1\u30A4\u30EB\u306E\u30ED\u30FC\u30C9\u958B\u59CB (ArrayBuffer\u3092\u4F7F\u7528)');\n              \n              // parse\u30E1\u30BD\u30C3\u30C9\u3092\u4F7F\u3063\u3066ArrayBuffer\u3092\u76F4\u63A5\u30ED\u30FC\u30C9\n              loader.parse(\n                bytes.buffer,\n                '',\n                (gltf) => {\n                  sendDebugMessage('GLTF\u30E2\u30C7\u30EB\u306E\u30ED\u30FC\u30C9\u6210\u529F\u3001VRM\u5909\u63DB\u958B\u59CB');\n                  console.log('GLTF\u30C7\u30FC\u30BF:', gltf);\n                  \n                  THREE.VRM.from(gltf)\n                    .then((vrm) => {\n                      sendDebugMessage('VRM\u5909\u63DB\u6210\u529F');\n                      // VRM\u30E2\u30C7\u30EB\u304C\u8AAD\u307F\u8FBC\u307E\u308C\u305F\n                      currentVrm = vrm;\n                      \n                      // \u30E2\u30C7\u30EB\u306E\u521D\u671F\u8A2D\u5B9A\n                      vrm.scene.rotation.y = Math.PI; // \u30E2\u30C7\u30EB\u3092\u524D\u5411\u304D\u306B\u3059\u308B\n                      \n                      // \u30B7\u30FC\u30F3\u306BVRM\u30E2\u30C7\u30EB\u3092\u8FFD\u52A0\n                      scene.add(vrm.scene);\n                      sendDebugMessage('VRM\u30E2\u30C7\u30EB\u3092\u30B7\u30FC\u30F3\u306B\u8FFD\u52A0');\n                      \n                      // \u30E2\u30C7\u30EB\u306E\u30DC\u30FC\u30F3\u3084\u69CB\u9020\u3092\u8ABF\u3079\u308B\n                      if (vrm && vrm.humanoid) {\n                        const bones = vrm.humanoid.humanBones;\n                        sendDebugMessage(`\u30E2\u30C7\u30EB\u306E\u30DC\u30FC\u30F3\u6570: ${Object.keys(bones).length}`);\n                      }\n                      \n                      // \u30E2\u30C7\u30EB\u304C\u8AAD\u307F\u8FBC\u307E\u308C\u305F\u3089\u30ED\u30FC\u30C7\u30A3\u30F3\u30B0\u8868\u793A\u3092\u96A0\u3059\n                      loadingElement.style.display = 'none';\n                      \n                      // \u30E2\u30C7\u30EB\u60C5\u5831\u306E\u8868\u793A\u3092\u66F4\u65B0\n                      const meta = vrm.meta;\n                      if (meta) {\n                        let infoText = `\u30E2\u30C7\u30EB\u540D: ${meta.title || 'Unknown'}`;\n                        if (meta.author) {\n                          infoText += ` | \u4F5C\u8005: ${meta.author}`;\n                        }\n                        infoElement.textContent = infoText;\n                        sendDebugMessage(`\u30E2\u30C7\u30EB\u60C5\u5831: ${infoText}`);\n                        displayVrmMetadata(meta);\n                      }\n                      \n                      resetCamera();\n                      \n                      // \u6210\u529F\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u62E1\u5F35\u6A5F\u80FD\u306B\u9001\u4FE1\n                      vscode.postMessage({\n                        type: 'debug',\n                        message: 'VRM\u30E2\u30C7\u30EB\u3092\u8AAD\u307F\u8FBC\u307F\u307E\u3057\u305F\u3002'\n                      });\n                    })\n                    .catch((error) => {\n                      sendDebugMessage(`VRM\u5909\u63DB\u30A8\u30E9\u30FC: ${error.message}`);\n                      console.error('VRM\u5909\u63DB\u30A8\u30E9\u30FC:', error);\n                      \n                      // \u30A8\u30E9\u30FC\u6642\u306B\u4EE3\u66FF\u3068\u3057\u3066GLTF\u30E2\u30C7\u30EB\u3092\u305D\u306E\u307E\u307E\u8868\u793A\u3057\u3066\u307F\u308B\n                      scene.add(gltf.scene);\n                      sendDebugMessage('GLTF\u30E2\u30C7\u30EB\u3092\u30B7\u30FC\u30F3\u306B\u76F4\u63A5\u8FFD\u52A0\uFF08VRM\u5909\u63DB\u5931\u6557\u306E\u305F\u3081\uFF09');\n                      \n                      loadingElement.style.display = 'none';\n                      \n                      // \u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u62E1\u5F35\u6A5F\u80FD\u306B\u9001\u4FE1\n                      vscode.postMessage({\n                        type: 'error',\n                        message: `VRM\u306E\u5909\u63DB\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error.message}`\n                      });\n                    });\n                },\n                (error) => {\n                  // \u30A8\u30E9\u30FC\u30CF\u30F3\u30C9\u30EA\u30F3\u30B0\n                  sendDebugMessage(`VRM\u30ED\u30FC\u30C9\u30A8\u30E9\u30FC: ${error.message}`);\n                  console.error('VRM\u306E\u8AAD\u307F\u8FBC\u307F\u30A8\u30E9\u30FC:', error);\n                  loadingElement.style.display = 'none';\n                  \n                  // \u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u62E1\u5F35\u6A5F\u80FD\u306B\u9001\u4FE1\n                  vscode.postMessage({\n                    type: 'debug',\n                    message: `VRM\u306E\u8AAD\u307F\u8FBC\u307F\u306B\u5931\u6557\u3057\u307E\u3057\u305F: ${error.message}`\n                  });\n                }\n              );\n            } catch (error) {\n              sendDebugMessage(`\u51E6\u7406\u30A8\u30E9\u30FC: ${error.message}`);\n              console.error('\u30A8\u30E9\u30FC:', error);\n              loadingElement.style.display = 'none';\n              \n              // \u30A8\u30E9\u30FC\u30E1\u30C3\u30BB\u30FC\u30B8\u3092\u62E1\u5F35\u6A5F\u80FD\u306B\u9001\u4FE1\n              vscode.postMessage({\n                type: 'debug',\n                message: `\u51E6\u7406\u30A8\u30E9\u30FC: ${error.message}`\n              });\n            }\n          }\n          \n          // VRM\u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u8868\u793A\u3059\u308B\u95A2\u6570\n          function displayVrmMetadata(meta) {\n            // \u30E1\u30BF\u30C7\u30FC\u30BF\u8981\u7D20\u3092\u30AF\u30EA\u30A2\n            metadataElement.innerHTML = '<div class=\"metadata-title\">VRM\u30E1\u30BF\u30C7\u30FC\u30BF</div>';\n\n            // \u4F7F\u7528\u53EF\u80FD\u306A\u3059\u3079\u3066\u306E\u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u8868\u793A\n            const metadataList = [\n              { key: 'title', label: '\u30BF\u30A4\u30C8\u30EB' },\n              { key: 'version', label: '\u30D0\u30FC\u30B8\u30E7\u30F3' },\n              { key: 'author', label: '\u4F5C\u8005' },\n              { key: 'contactInformation', label: '\u9023\u7D61\u5148' },\n              { key: 'reference', label: '\u53C2\u7167' },\n              { key: 'allowedUserName', label: '\u4F7F\u7528\u8A31\u53EF' },\n              { key: 'violentUssageName', label: '\u66B4\u529B\u8868\u73FE' },\n              { key: 'violentUsage', label: '\u66B4\u529B\u8868\u73FE(v1.0)' },\n              { key: 'sexualUssageName', label: '\u6027\u7684\u8868\u73FE' },\n              { key: 'sexualUsage', label: '\u6027\u7684\u8868\u73FE(v1.0)' },\n              { key: 'commercialUssageName', label: '\u5546\u7528\u5229\u7528' },\n              { key: 'commercialUsage', label: '\u5546\u7528\u5229\u7528(v1.0)' },\n              { key: 'otherPermissionUrl', label: '\u4ED6\u306E\u8A31\u53EFURL' },\n              { key: 'licenseName', label: '\u30E9\u30A4\u30BB\u30F3\u30B9\u540D' },\n              { key: 'otherLicenseUrl', label: '\u30E9\u30A4\u30BB\u30F3\u30B9URL' },\n              { key: 'copyright', label: '\u8457\u4F5C\u6A29\u60C5\u5831' },\n              { key: 'avatarPermission', label: '\u30A2\u30D0\u30BF\u30FC\u4F7F\u7528\u8A31\u53EF' },\n              { key: 'redistributionPermission', label: '\u518D\u914D\u5E03\u8A31\u53EF' },\n              { key: 'modification', label: '\u6539\u5909\u8A31\u53EF' },\n              { key: 'modelVersion', label: '\u30E2\u30C7\u30EB\u30D0\u30FC\u30B8\u30E7\u30F3' },\n              { key: 'description', label: '\u8AAC\u660E' }\n            ];\n\n            // \u30E1\u30BF\u30C7\u30FC\u30BF\u3092\u8868\u793A\n            metadataList.forEach(item => {\n              console.log('item:', item.key, meta[item.key]);\n              if (meta[item.key]) {\n                const div = document.createElement('div');\n                div.className = 'metadata-item';\n                div.innerHTML = `<span class=\"metadata-title\">${item.label}:</span> ${meta[item.key]}`;\n                metadataElement.appendChild(div);\n              }\n            });\n\n            // \u30B5\u30E0\u30CD\u30A4\u30EB\u753B\u50CF\u304C\u3042\u308C\u3070\u8868\u793A\n            if (meta.thumbnailImage) {\n              try {\n                const div = document.createElement('div');\n                div.className = 'metadata-item';\n                div.innerHTML = '<span class=\"metadata-title\">\u30B5\u30E0\u30CD\u30A4\u30EB:</span>';\n                \n                // \u753B\u50CF\u8981\u7D20\u3092\u4F5C\u6210\n                const img = document.createElement('img');\n                const blob = new Blob([meta.thumbnailImage], { type: 'image/png' });\n                img.src = URL.createObjectURL(blob);\n                img.style.maxWidth = '100%';\n                img.style.marginTop = '5px';\n                div.appendChild(img);\n                \n                metadataElement.appendChild(div);\n              } catch (error) {\n                console.error('\u30B5\u30E0\u30CD\u30A4\u30EB\u8868\u793A\u30A8\u30E9\u30FC:', error);\n              }\n            }\n\n            // \u30E1\u30BF\u30C7\u30FC\u30BF\u304C\u4F55\u3082\u8868\u793A\u3055\u308C\u306A\u3044\u5834\u5408\n            if (metadataElement.children.length <= 1) {\n              const div = document.createElement('div');\n              div.className = 'metadata-item';\n              div.textContent = '\u8A73\u7D30\u306A\u30E1\u30BF\u30C7\u30FC\u30BF\u306F\u3042\u308A\u307E\u305B\u3093';\n              metadataElement.appendChild(div);\n            }\n          }\n\n          // \u30AB\u30E1\u30E9\u3092\u30EA\u30BB\u30C3\u30C8\n          function resetCamera() {\n            if (currentVrm) {\n              // \u30E2\u30C7\u30EB\u306E\u4F4D\u7F6E\u3092\u4E2D\u5FC3\u306B\n              camera.position.set(0, 1.5, 3);\n              controls.target.set(0, 1, 0);\n            } else {\n              camera.position.set(0, 1.5, 3);\n              controls.target.set(0, 1, 0);\n            }\n            controls.update();\n            sendDebugMessage('\u30AB\u30E1\u30E9\u3092\u30EA\u30BB\u30C3\u30C8\u3057\u307E\u3057\u305F');\n          }\n\n          // \u30A6\u30A3\u30F3\u30C9\u30A6\u30EA\u30B5\u30A4\u30BA\u6642\u306E\u51E6\u7406\n          function onWindowResize() {\n            camera.aspect = window.innerWidth / window.innerHeight;\n            camera.updateProjectionMatrix();\n            renderer.setSize(window.innerWidth, window.innerHeight);\n          }\n\n          // \u30A2\u30CB\u30E1\u30FC\u30B7\u30E7\u30F3\u30EB\u30FC\u30D7\n          function animate() {\n            requestAnimationFrame(animate);\n\n            // \u30B3\u30F3\u30C8\u30ED\u30FC\u30EB\u306E\u66F4\u65B0\n            controls.update();\n\n            // VRM\u306E\u66F4\u65B0\u51E6\u7406\uFF08\u5FC5\u8981\u306B\u5FDC\u3058\u3066\uFF09\n            if (currentVrm) {\n              // currentVrm.update(clock.getDelta());\n            }\n\n            // \u30EC\u30F3\u30C0\u30EA\u30F3\u30B0\n            renderer.render(scene, camera);\n          }\n\n          // \u6642\u9593\u7BA1\u7406\u7528\u306E\u30AF\u30ED\u30C3\u30AF\n          const clock = new THREE.Clock();\n\n          // \u521D\u671F\u5316\u5B8C\u4E86\u30E1\u30C3\u30BB\u30FC\u30B8\n          sendDebugMessage('WebView\u521D\u671F\u5316\u5B8C\u4E86');\n        </script>\n      </body>\n      </html>\n    ");
    };
    /**
     * ランダムなnonce値を生成する
     */
    VrmEditorProvider.prototype.getNonce = function () {
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (var i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    };
    return VrmEditorProvider;
}());
;
//# sourceMappingURL=extension.js.map