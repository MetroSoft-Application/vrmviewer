// VSCodeのWebViewとの通信用
const vscode = acquireVsCodeApi();
// 時間管理用のクロック - トップレベルに移動
const clock = new THREE.Clock();

// デバッグのためのログ送信関数
function sendDebugMessage(message) {
    console.log(message);
    vscode.postMessage({ type: 'debug', message: message });
}

// Three.js関連の変数
let container, camera, scene, renderer, controls, currentVrm;
let loadingElement, metadataElement;
// ライト関連の変数
let ambientLight, directionalLight;
// デフォルト設定
const DEFAULT_SETTINGS = {
    ambientIntensity: 0.4,
    directionalIntensity: 0.75,
    backgroundColor: 0x303030,
    cameraPosition: {
        x: 0,
        y: 1.5,
        z: 1.8
    }
};

// 初期化
init();

// メッセージハンドラの登録（拡張機能からのメッセージを受信）
window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'loadVrm') loadVrmFromBase64(message.data, message.fileName);
});

// リセットボタンなどのイベントリスナー
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reset-camera').addEventListener('click', resetCamera);
    document.getElementById('reset-lights').addEventListener('click', resetLights);

    // ライト調整スライダーのイベントリスナーを設定
    document.getElementById('ambient-light').addEventListener('input', updateAmbientLight);
    document.getElementById('directional-light').addEventListener('input', updateDirectionalLight);
    document.getElementById('background-color').addEventListener('input', updateBackgroundColor);
});

// Three.jsの初期化
function init() {
    sendDebugMessage('Initializing Three.js');

    // DOM要素の取得
    container = document.getElementById('container');
    loadingElement = document.getElementById('loading');
    metadataElement = document.getElementById('metadata');

    // シーン作成
    scene = new THREE.Scene();
    scene.background = new THREE.Color(DEFAULT_SETTINGS.backgroundColor);

    // カメラの設定
    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(
        DEFAULT_SETTINGS.cameraPosition.x,
        DEFAULT_SETTINGS.cameraPosition.y,
        DEFAULT_SETTINGS.cameraPosition.z
    );

    // ライトの設定
    ambientLight = new THREE.AmbientLight(0xffffff, DEFAULT_SETTINGS.ambientIntensity);
    scene.add(ambientLight);

    directionalLight = new THREE.DirectionalLight(0xffffff, DEFAULT_SETTINGS.directionalIntensity);
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

    sendDebugMessage('Three.js initialization completed');

    // UIの初期値を設定
    updateLightControlsUI();
}

// ライト操作関数
function updateAmbientLight(event) {
    const intensity = parseFloat(event.target.value);
    ambientLight.intensity = intensity;
    sendDebugMessage(`Ambient light intensity set to ${intensity}`);
}

function updateDirectionalLight(event) {
    const intensity = parseFloat(event.target.value);
    directionalLight.intensity = intensity;
    sendDebugMessage(`Directional light intensity set to ${intensity}`);
}

function updateBackgroundColor(event) {
    const color = event.target.value;
    scene.background = new THREE.Color(color);
    sendDebugMessage(`Background color set to ${color}`);
}

// ライトをデフォルト設定にリセット
function resetLights() {
    ambientLight.intensity = DEFAULT_SETTINGS.ambientIntensity;
    directionalLight.intensity = DEFAULT_SETTINGS.directionalIntensity;
    scene.background = new THREE.Color(DEFAULT_SETTINGS.backgroundColor);

    // UIスライダーも更新
    updateLightControlsUI();

    sendDebugMessage('Light settings reset to default');
}

// UIコントロールを現在の設定に合わせて更新
function updateLightControlsUI() {
    document.getElementById('ambient-light').value = ambientLight.intensity;
    document.getElementById('directional-light').value = directionalLight.intensity;
    document.getElementById('background-color').value = '#' +
        new THREE.Color(scene.background).getHexString();
}

// Base64データからVRMを読み込む
function loadVrmFromBase64(base64String, fileName) {
    sendDebugMessage(`Loading VRM: ${fileName}`);
    loadingElement.style.display = 'block';

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

        sendDebugMessage('Creating GLTFLoader');
        // GLTFLoaderの設定
        const loader = new THREE.GLTFLoader();

        // VRM 1.0対応のプラグインを登録
        loader.register((parser) => new THREE.VRMLoaderPlugin(parser));

        sendDebugMessage('Starting VRM file loading');

        // parseメソッドを使ってArrayBufferを直接ロード
        loader.parse(
            bytes.buffer,
            '',
            handleGltfLoad,
            handleLoadError
        );
    } catch (error) {
        handleLoadError(error, 'Processing Error');
    }
}

// GLTFロード成功ハンドラ
function handleGltfLoad(gltf) {
    sendDebugMessage('GLTF model loaded successfully, getting VRM');

    // まずVRM 1.0形式を確認
    const vrm = gltf.userData.vrm;

    if (vrm) {
        // VRMバージョン情報を取得して保存（後で表示に使用）
        if (!vrm.vrmVersion) {
            if (vrm.meta && vrm.meta.metaVersion) {
                vrm.vrmVersion = vrm.meta.metaVersion;
            } else {
                vrm.vrmVersion = "1.0";
            }
        }
        sendDebugMessage(`Detected VRM version: ${vrm.vrmVersion}`);
        handleVrm10Model(vrm);
    } else {
        // VRM 0.x形式として処理
        handleVrm0xModel(gltf);
    }
}

// VRM 1.0モデル処理
function handleVrm10Model(vrm) {
    sendDebugMessage(`Processing VRM ${vrm.vrmVersion || '1.0'} model`);
    currentVrm = vrm;

    // モデルの向きを自動判定
    vrm.scene.rotation.y = determineModelOrientation(vrm);

    // シーンにVRMモデルを追加
    scene.add(vrm.scene);
    sendDebugMessage('VRM model added to scene');

    // モデルが読み込まれたらローディング表示を隠す
    loadingElement.style.display = 'none';

    // モデル情報の表示を更新
    displayVrmMetadata(vrm);

    resetCamera();

    // 成功メッセージを拡張機能に送信
    vscode.postMessage({
        type: 'debug',
        message: `Loaded VRM ${vrm.vrmVersion || '1.0'} model.`
    });
}

// VRM 0.x形式モデル処理
function handleVrm0xModel(gltf) {
    // VRM 1.0形式でない場合、従来のVRM 0.x形式として読み込みを試みる
    sendDebugMessage('Not a VRM 1.0 model. Attempting to load as VRM 0.x format.');

    THREE.VRM.from(gltf)
        .then((vrm) => {
            sendDebugMessage('VRM 0.x conversion successful');
            // VRMモデルが読み込まれた
            currentVrm = vrm;

            // バージョン情報を設定
            if (!vrm.vrmVersion) {
                vrm.vrmVersion = "0.x";
            }

            // モデルの向きを自動判定して設定
            vrm.scene.rotation.y = determineModelOrientation(vrm);

            // シーンにVRMモデルを追加
            scene.add(vrm.scene);
            sendDebugMessage('VRM 0.x model added to scene');

            // モデルが読み込まれたらローディング表示を隠す
            loadingElement.style.display = 'none';

            // モデル情報の表示を更新
            displayVrmMetadata(vrm);

            resetCamera();

            // 成功メッセージを拡張機能に送信
            vscode.postMessage({
                type: 'debug',
                message: 'Loaded VRM 0.x model.'
            });
        })
        .catch((error) => {
            sendDebugMessage(`VRM conversion error: ${error.message}`);

            // エラー時に代替としてGLTFモデルをそのまま表示
            scene.add(gltf.scene);
            sendDebugMessage('Added GLTF model directly to scene (due to VRM conversion failure)');

            loadingElement.style.display = 'none';

            // エラーメッセージを拡張機能に送信
            vscode.postMessage({
                type: 'error',
                message: `VRM conversion failed: ${error.message}`
            });
        });
}

// エラーハンドリング関数
function handleLoadError(error, prefix = 'VRM Loading Error') {
    sendDebugMessage(`${prefix}: ${error.message || error}`);

    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.textContent = `Error: ${error.message || 'Failed to load VRM model'}`;
        loadingElement.style.backgroundColor = 'rgba(220, 53, 69, 0.8)'; // エラー表示を赤色に
    }

    console.error(error);
}

// ローディングメッセージ更新
function updateLoadingMessage(message) {
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.textContent = message;
    }
}

// VRMメタデータを表示する関数
function displayVrmMetadata(vrm) {
    // メタデータ要素をクリア
    metadataElement.innerHTML = '<div class="metadata-title">VRM Metadata</div>';

    // VRMバージョンの判定とメタデータの取得
    if (!vrm.meta) {
        appendMetadataItem('No metadata available');
        return;
    }

    const meta = vrm.meta;

    // モデルから直接VRMバージョンを取得
    let vrmVersion = "Unknown";

    // VRM 1.0以降ではversionInfoプロパティがある場合がある
    if (vrm.vrmVersion) {
        vrmVersion = vrm.vrmVersion;
    }
    // メタデータのバージョン情報を確認
    else if (meta.metaVersion) {
        vrmVersion = meta.metaVersion;
    }
    // 0.xバージョンの場合は特定の構造を持っているかどうかで判断
    else if (meta.title && !meta.name) {
        vrmVersion = "0.x";
    } else {
        // バージョンが判断できない場合、構造から推測
        const isVrm1Structure = meta.name !== undefined
            && (meta.authors !== undefined || Array.isArray(meta.authors));
        vrmVersion = isVrm1Structure ? "1.0 (Estimated)" : "0.x (Estimated)";
    }

    sendDebugMessage(`VRM metadata version: ${vrmVersion}`);

    // モデルのバージョンに応じた情報表示
    const isVrm1 = vrmVersion.startsWith('1.') || vrmVersion.includes('1.0');

    // モデル情報の基本情報を表示
    const modelName = isVrm1 ? (meta.name || 'Unknown') : (meta.title || 'Unknown');
    const authorName = isVrm1
        ? (Array.isArray(meta.authors) && meta.authors.length > 0 ? meta.authors.join(', ') : (meta.authors || ''))
        : (meta.author || '');

    // VRMバージョン情報を最初の項目として表示
    appendMetadataItem({ label: 'VRM Version', key: '_version' }, { _version: vrmVersion });

    // VRM 1.0と0.xの両方のメタデータキーを網羅したリスト
    const metadataList = [
        // VRM 1.0のキー
        { key: 'name', label: 'Model Name (v1.x)' },
        { key: 'version', label: 'Version' },
        { key: 'authors', label: 'Authors (v1.x)', isArray: true },
        { key: 'copyrightInformation', label: 'Copyright Information (v1.x)' },
        { key: 'contactInformation', label: 'Contact Information' },
        { key: 'references', label: 'References (v1.x)', isArray: true },
        { key: 'thirdPartyLicenses', label: 'Third Party Licenses' },
        { key: 'thumbnailImage', label: 'Thumbnail', isImage: true },
        { key: 'licenseUrl', label: 'License URL (v1.x)' },
        { key: 'avatarPermission', label: 'Avatar Permission' },
        { key: 'allowExcessivelyViolentUsage', label: 'Violent Expression (v1.x)' },
        { key: 'allowExcessivelySexualUsage', label: 'Sexual Expression (v1.x)' },
        { key: 'commercialUsage', label: 'Commercial Usage (v1.x)' },
        { key: 'allowRedistribution', label: 'Redistribution Permission (v1.x)' },
        { key: 'allowModification', label: 'Modification Permission (v1.x)' },

        // VRM 0.xのキー
        { key: 'title', label: 'Title (v0.x)' },
        { key: 'author', label: 'Author (v0.x)' },
        { key: 'copyright', label: 'Copyright (v0.x)' },
        { key: 'reference', label: 'Reference (v0.x)' },
        { key: 'violentUssageName', label: 'Violent Expression (v0.x)' },
        { key: 'sexualUssageName', label: 'Sexual Expression (v0.x)' },
        { key: 'commercialUssageName', label: 'Commercial Usage (v0.x)' },
        { key: 'otherPermissionUrl', label: 'Other Permission URL' },
        { key: 'licenseName', label: 'License Name' },
        { key: 'otherLicenseUrl', label: 'License URL (v0.x)' },
        { key: 'redistributionPermission', label: 'Redistribution Permission (v0.x)' },
        { key: 'modification', label: 'Modification Permission (v0.x)' },
        { key: 'modelVersion', label: 'Model Version' },
        { key: 'description', label: 'Description' },
        { key: 'allowedUserName', label: 'Usage Permission (v0.x)' }
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
        appendMetadataItem('No detailed metadata available');
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
                div.innerHTML += ' [Thumbnail display error]';
                sendDebugMessage(`Thumbnail display error: ${error.message}`);
            }
        } else if (item.isArray && Array.isArray(meta[item.key])) {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key].join(', ')}`;
        } else {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key]}`;
        }
    }

    metadataElement.appendChild(div);
}

// モデルの向きを自動判定する関数
function determineModelOrientation(vrm) {
    // メタデータが存在しない場合はデフォルト値（前向き）を返す
    if (!vrm || !vrm.meta) {
        sendDebugMessage('No metadata found, using default orientation');
        return 0;
    }

    // VRMバージョンに応じて向きを設定
    // VRM 1.0は前向き（0度）、VRM 0.xは後ろ向き（180度）をデフォルトとする
    if (vrm.vrmVersion && vrm.vrmVersion.startsWith('1')) {
        return 0;
    } else {
        return Math.PI;
    }
}

// カメラをリセット
function resetCamera() {
    // モデルの有無に関わらず同じ位置・向きにリセットする
    camera.position.set(
        DEFAULT_SETTINGS.cameraPosition.x,
        DEFAULT_SETTINGS.cameraPosition.y,
        DEFAULT_SETTINGS.cameraPosition.z
    );
    controls.target.set(0, 1, 0);
    controls.update();
    sendDebugMessage('Camera reset to default position');
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
sendDebugMessage('WebView initialization completed');