// VSCodeのWebViewとの通信用
const vscode = acquireVsCodeApi();
// 時間管理用のクロック - トップレベルに移動
const clock = new THREE.Clock();

// デバッグのためのログ送信関数
function sendDebugMessage(message) {
    console.log(message); // Devツールのコンソールに出力
    vscode.postMessage({ type: 'debug', message: message });
}

// Three.js関連の変数
let container, camera, scene, renderer, controls, currentVrm;
let loadingElement, infoElement, metadataElement;

// 初期化
init();

// メッセージハンドラの登録（拡張機能からのメッセージを受信）
window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'loadVrm') loadVrmFromBase64(message.data, message.fileName);
});

// リセットボタンのイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reset-camera').addEventListener('click', resetCamera);
});

// Three.jsの初期化
function init() {
    sendDebugMessage('Three.js 初期化開始');
    
    // DOM要素の取得
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
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
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

    // ヘルパー
    scene.add(new THREE.GridHelper(10, 10));
    scene.add(new THREE.AxesHelper(5));

    // リサイズハンドラ
    window.addEventListener('resize', onWindowResize);

    // アニメーションループ開始
    animate();

    sendDebugMessage('Three.js 初期化完了');
}

// Base64データからVRMを読み込む
function loadVrmFromBase64(base64String, fileName) {
    sendDebugMessage(`VRMロード開始: ${fileName}`);
    loadingElement.style.display = 'block';
    infoElement.textContent = `ファイル: ${fileName}`;

    try {
        // base64をバイナリデータに変換
        const binary = atob(base64String);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

        // 既存のVRMを削除
        if (currentVrm) {
            scene.remove(currentVrm.scene);
            currentVrm = null;
        }

        sendDebugMessage('GLTFLoaderを作成');
        // GLTFLoaderの設定
        const loader = new THREE.GLTFLoader();

        // VRM 1.0対応のプラグインを登録
        loader.register((parser) => new THREE.VRMLoaderPlugin(parser));

        sendDebugMessage('VRMファイルのロード開始');

        // parseメソッドを使ってArrayBufferを直接ロード
        loader.parse(
            bytes.buffer,
            '',
            handleGltfLoad,
            handleLoadError
        );
    } catch (error) {
        handleLoadError(error, '処理エラー');
    }
}

// GLTFロード成功ハンドラ
function handleGltfLoad(gltf) {
    sendDebugMessage('GLTFモデルのロード成功、VRM取得開始');

    // VRM 1.0形式ではgltf.userData.vrmからVRMを取得
    const vrm = gltf.userData.vrm;

    if (vrm) {
        handleVrm10Model(vrm);
    } else {
        handleVrm0xModel(gltf);
    }
}

// VRM 1.0モデル処理
function handleVrm10Model(vrm) {
    sendDebugMessage('VRM 1.0形式のモデルを検出');
    currentVrm = vrm;

    // モデルの初期設定
    vrm.scene.rotation.y = Math.PI;

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
}

// VRM 0.x形式モデル処理
function handleVrm0xModel(gltf) {
    // VRM 1.0形式でない場合、従来のVRM 0.x形式として読み込みを試みる
    sendDebugMessage('VRM 1.0形式ではありません。VRM 0.x形式として読み込みを試みます。');

    THREE.VRM.from(gltf)
        .then((vrm) => {
            sendDebugMessage('VRM 0.x変換成功');
            // VRMモデルが読み込まれた
            currentVrm = vrm;

            // モデルの初期設定
            vrm.scene.rotation.y = Math.PI;

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
            sendDebugMessage(`VRM変換エラー: ${error.message}`);

            // エラー時に代替としてGLTFモデルをそのまま表示
            scene.add(gltf.scene);
            sendDebugMessage('GLTFモデルをシーンに直接追加（VRM変換失敗のため）');

            loadingElement.style.display = 'none';

            // エラーメッセージを拡張機能に送信
            vscode.postMessage({
                type: 'error',
                message: `VRMの変換に失敗しました: ${error.message}`
            });
        });
}

// エラーハンドリング関数
function handleLoadError(error, prefix = 'VRMロードエラー') {
    sendDebugMessage(`${prefix}: ${error.message}`);
    loadingElement.style.display = 'none';

    // エラーメッセージを拡張機能に送信
    vscode.postMessage({
        type: 'error',
        message: `${prefix === 'VRMロードエラー' ? 'VRMの読み込みに失敗しました' : prefix}: ${error.message}`
    });
}

// VRMメタデータを表示する関数
function displayVrmMetadata(vrm) {
    // メタデータ要素をクリア
    metadataElement.innerHTML = '<div class="metadata-title">VRMメタデータ</div>';

    // VRMバージョンの判定とメタデータの取得
    if (!vrm.meta) {
        appendMetadataItem('メタデータはありません');
        return;
    }

    const meta = vrm.meta;
    const isVrm1 = meta.metaVersion && meta.metaVersion.startsWith('1.');
    sendDebugMessage(`VRMメタデータバージョン: ${isVrm1 ? '1.0' : '0.x'}`);

    // モデル情報の基本情報を表示
    const modelName = isVrm1 ? (meta.name || 'Unknown') : (meta.title || 'Unknown');
    const authorName = isVrm1
        ? (Array.isArray(meta.authors) && meta.authors.length > 0 ? meta.authors.join(', ') : (meta.authors || ''))
        : (meta.author || '');

    let infoText = `VRM ${isVrm1 ? '1.0' : '0.x'}: ${modelName}`;
    if (authorName) infoText += ` | 作者: ${authorName}`;
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
    let metadataCount = 0;
    metadataList.forEach(item => {
        if (meta[item.key] !== undefined && meta[item.key] !== null) {
            appendMetadataItem(item, meta);
            metadataCount++;
        }
    });

    // メタデータが何も表示されない場合
    if (metadataCount === 0) {
        appendMetadataItem('詳細なメタデータはありません');
    }
}

// メタデータ項目を追加する関数
function appendMetadataItem(itemOrText, meta) {
    const div = document.createElement('div');
    div.className = 'metadata-item';

    if (typeof itemOrText === 'string') {
        div.textContent = itemOrText;
    } else {
        const item = itemOrText;
        if (item.isImage && meta[item.key]) {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span>`;
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
                sendDebugMessage(`サムネイル表示エラー: ${error.message}`);
            }
        } else if (item.isArray && Array.isArray(meta[item.key])) {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key].join(', ')}`;
        } else {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key]}`;
        }
    }

    metadataElement.appendChild(div);
}

// カメラをリセット
function resetCamera() {
    // モデルの有無に関わらず同じ位置・向きにリセットする
    camera.position.set(0, 1.5, 3);
    controls.target.set(0, 1, 0); 
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
    if (currentVrm && typeof currentVrm.update === 'function') {
        currentVrm.update(clock.getDelta());
    }

    // レンダリング
    renderer.render(scene, camera);
}

// 初期化完了メッセージ
sendDebugMessage('WebView初期化完了');