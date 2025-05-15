// VSCodeのWebViewとの通信用
const vscode = acquireVsCodeApi();
// 時間管理用のクロック - トップレベルに移動
const clock = new THREE.Clock();

// 表情コントロール関連の変数
let expressionControlsElement;

// ログ送信関数
function sendDebugMessage(message) {
    console.log(message);
    vscode.postMessage({ type: 'debug', message: message });
}

// Three.js関連の変数
let container, camera, scene, renderer, controls, currentVrm;
let loadingElement, metadataElement;
// モデル読み込み状態管理
let modelLoaded = false;
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

    // 表情のリセットボタンにログ付きのイベントハンドラを設定
    document.getElementById('reset-expressions').addEventListener('click', () => {
        console.log('Reset Expressions button clicked');
        sendDebugMessage('表情リセットボタンがクリックされました');
        resetExpressions();
    });

    // ライト調整スライダーのイベントリスナーを設定    document.getElementById('ambient-light').addEventListener('input', updateAmbientLight);
    document.getElementById('directional-light').addEventListener('input', updateDirectionalLight);
    document.getElementById('background-color').addEventListener('input', updateBackgroundColor);

    // DOM要素を再取得
    expressionControlsElement = document.getElementById('expression-controls');
});

// Three.jsの初期化
function init() {
    console.log('Initializing Three.js');
    // DOM要素の取得
    container = document.getElementById('container');
    loadingElement = document.getElementById('loading');
    metadataElement = document.getElementById('metadata');
    expressionControlsElement = document.getElementById('expression-controls');

    // 表情コントロールのスタイルを初期化
    setupExpressionControlsStyle();

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
    window.addEventListener('resize', onWindowResize);    // アニメーションループ開始
    animate();

    // UIの初期値を設定
    updateLightControlsUI();
}

// ライト操作関数
function updateAmbientLight(event) {
    const intensity = parseFloat(event.target.value);
    ambientLight.intensity = intensity;
}

function updateDirectionalLight(event) {
    const intensity = parseFloat(event.target.value);
    directionalLight.intensity = intensity;
}

function updateBackgroundColor(event) {
    const color = event.target.value;
    scene.background = new THREE.Color(color);
}

// ライトをデフォルト設定にリセット
function resetLights() {
    ambientLight.intensity = DEFAULT_SETTINGS.ambientIntensity;
    directionalLight.intensity = DEFAULT_SETTINGS.directionalIntensity;
    scene.background = new THREE.Color(DEFAULT_SETTINGS.backgroundColor);

    // UIスライダーも更新
    updateLightControlsUI();
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
    console.log(`Loading VRM: ${fileName}`);
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

        // GLTFLoaderの設定
        const loader = new THREE.GLTFLoader();

        // VRM 1.0対応のプラグインを登録
        loader.register((parser) => new THREE.VRMLoaderPlugin(parser));

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
    // VRM 1.0形式を確認
    const vrm = gltf.userData.vrm;

    if (vrm) {
        // VRMバージョン情報を取得して保存
        if (!vrm.vrmVersion) {
            if (vrm.meta && vrm.meta.metaVersion) {
                vrm.vrmVersion = vrm.meta.metaVersion;
            } else {
                vrm.vrmVersion = "1.0";
            }
        }
        handleVrm10Model(vrm);
    } else {
        // VRM 0.x形式として処理
        handleVrm0xModel(gltf);
    }
}

function handleVrm10Model(vrm) {
    sendDebugMessage(`Processing VRM ${vrm.vrmVersion || '1.0'} model`);
    currentVrm = vrm;
    modelLoaded = true;
    // モデルの向きを自動判定
    vrm.scene.rotation.y = determineModelOrientation(vrm);
    // シーンにVRMモデルを追加
    scene.add(vrm.scene);
    sendDebugMessage('VRM model added to scene');
    // モデルが読み込まれたらローディング表示を隠す
    loadingElement.style.display = 'none';
    // モデル情報の表示を更新
    displayVrmMetadata(vrm);
    // カメラ位置をリセット
    resetCamera();
    // 既存の表情をリセット
    resetExpressions();
    // 表情システムの準備に時間差を設ける（モデルが完全にロードされるまで待つ）
    setTimeout(() => {
        try {
            if (expressionControlsElement) {
                // 表情コントロールを初期化
                initExpressionControls();
            } else {
                // エレメントを再取得
                expressionControlsElement = document.getElementById('expression-controls');
                if (expressionControlsElement) {
                    initExpressionControls();
                }
            }
        } catch (e) {
            sendDebugMessage(`Error initializing expressions: ${e.message}`);
        }

        // 表示を確保する追加処理
        ensureExpressionControlsVisible();
    }, 800); // さらに待機時間を長くする

    // 成功メッセージを拡張機能に送信
    vscode.postMessage({
        type: 'debug',
        message: `Loaded VRM ${vrm.vrmVersion || '1.0'} model.`
    });
}

// VRM 0.x形式モデル処理
function handleVrm0xModel(gltf) {
    // VRM 1.0形式でない場合、従来のVRM 0.x形式として読み込みを試みる
    console.log('Loading as VRM 0.x format');

    THREE.VRM.from(gltf)
        .then((vrm) => {
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
            // モデルが読み込まれたらローディング表示を隠す
            loadingElement.style.display = 'none';
            // モデル情報の表示を更新
            displayVrmMetadata(vrm);
            // カメラ位置をリセット
            resetCamera();
            // 既存の表情をリセット
            resetExpressions();
            // VRM 0.xの場合、表情管理のための互換レイヤーを追加
            setupVrm0xExpressionManager(vrm);            // 表情システムの準備に時間差を設ける
            setTimeout(() => {
                try {
                    if (expressionControlsElement) {
                        // 表情コントロールを初期化
                        initExpressionControls();
                    } else {
                        // エレメントを再取得
                        expressionControlsElement = document.getElementById('expression-controls');
                        if (expressionControlsElement) {
                            initExpressionControls();
                        }
                    }
                } catch (e) {
                    console.log(`表情初期化エラー: ${e.message}`);
                }

                // 表示を確保する追加処理
                ensureExpressionControlsVisible();
            }, 800);

            // 成功メッセージを拡張機能に送信
            vscode.postMessage({
                type: 'debug',
                message: 'Loaded VRM 0.x model.'
            });
        })
        .catch((error) => {
            console.log(`VRM conversion error: ${error.message}`);

            // エラー時に代替としてGLTFモデルをそのまま表示
            scene.add(gltf.scene);

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
    console.error(`${prefix}: ${error.message || error}`);

    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.textContent = `Error: ${error.message || 'Failed to load VRM model'}`;
        loadingElement.style.backgroundColor = 'rgba(220, 53, 69, 0.8)'; // エラー表示を赤色に
    }
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
    if (vrm.vrmVersion) {
        // VRM 1.0以降ではversionInfoプロパティがある場合がある
        vrmVersion = vrm.vrmVersion;
    }
    else if (meta.metaVersion) {
        // メタデータのバージョン情報を確認
        vrmVersion = meta.metaVersion;
    }
    else if (meta.title && !meta.name) {
        // 0.xバージョンの場合は特定の構造を持っているかどうかで判断
        vrmVersion = "0.x";
    } else {
        // バージョンが判断できない場合、構造から推測
        const isVrm1Structure = meta.name !== undefined
            && (meta.authors !== undefined || Array.isArray(meta.authors));
        vrmVersion = isVrm1Structure ? "1.0 (Estimated)" : "0.x (Estimated)";
    }
    // VRMバージョン情報を最初の項目として表示
    appendMetadataItem({ label: 'VRM Version', key: '_version' }, { _version: vrmVersion });
    // VRM 1.0と0.xの両方のメタデータキーを網羅したリスト
    const metadataList = [
        // VRM 1.0のキー
        { key: 'name', label: 'Model Name' },
        { key: 'version', label: 'Version' },
        { key: 'authors', label: 'Authors', isArray: true },
        { key: 'copyrightInformation', label: 'Copyright Information' },
        { key: 'contactInformation', label: 'Contact Information' },
        { key: 'references', label: 'References', isArray: true },
        { key: 'thirdPartyLicenses', label: 'Third Party Licenses' },
        { key: 'thumbnailImage', label: 'Thumbnail', isImage: true },
        { key: 'licenseUrl', label: 'License URL' },
        { key: 'avatarPermission', label: 'Avatar Permission' },
        { key: 'allowExcessivelyViolentUsage', label: 'Violent Expression' },
        { key: 'allowExcessivelySexualUsage', label: 'Sexual Expression' },
        { key: 'commercialUsage', label: 'Commercial Usage' },
        { key: 'allowRedistribution', label: 'Redistribution Permission' },
        { key: 'allowModification', label: 'Modification Permission' },

        // VRM 0.xのキー
        { key: 'title', label: 'Title' },
        { key: 'author', label: 'Author' },
        { key: 'copyright', label: 'Copyright' },
        { key: 'reference', label: 'Reference' },
        { key: 'violentUssageName', label: 'Violent Expression' },
        { key: 'sexualUssageName', label: 'Sexual Expression' },
        { key: 'commercialUssageName', label: 'Commercial Usage' },
        { key: 'otherPermissionUrl', label: 'Other Permission URL' },
        { key: 'licenseName', label: 'License Name' },
        { key: 'otherLicenseUrl', label: 'License URL' },
        { key: 'redistributionPermission', label: 'Redistribution Permission' },
        { key: 'modification', label: 'Modification Permission' },
        { key: 'modelVersion', label: 'Model Version' },
        { key: 'description', label: 'Description' },
        { key: 'allowedUserName', label: 'Usage Permission' }
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
        const deltaTime = clock.getDelta();

        // モデル全体の更新
        if (typeof currentVrm.update === 'function') {
            currentVrm.update(deltaTime);
        }

        // 表情マネージャーも明示的に更新
        if (currentVrm.expressionManager && typeof currentVrm.expressionManager.update === 'function') {
            currentVrm.expressionManager.update();
        }

        // VRM 0.xの場合は特に明示的にブレンドシェイプを更新
        if (currentVrm.blendShapeProxy && typeof currentVrm.blendShapeProxy.update === 'function') {
            currentVrm.blendShapeProxy.update();
        }
    }

    // レンダリング
    renderer.render(scene, camera);
}

// 初期化完了メッセージ
sendDebugMessage('WebView initialization completed');

// 表情コントロールの初期化関数
function initExpressionControls() {
    console.log('Initializing expression controls');

    // DOM要素の取得を再確認
    const expressionControlsEl = document.getElementById('expression-controls');
    const container = document.getElementById('expression-sliders');

    if (!expressionControlsEl || !container) {
        console.log('Error: expression controls elements not found');
        return;
    }

    // コンテナをクリア
    container.innerHTML = '';

    // 表示を保証
    expressionControlsEl.style.display = 'block';

    if (!currentVrm) {
        container.innerHTML = '<div class="expression-control" style="justify-content: center;">No VRM model loaded</div>';
        return;
    }

    let initialized = false;

    // VRM 1.0表情の処理
    if (currentVrm.expressionManager && currentVrm.expressionManager.expressionMap) {
        const expressions = currentVrm.expressionManager.expressionMap;

        try {
            // Mapの場合
            if (expressions instanceof Map) {
                expressions.forEach((expression, name) => {
                    addExpressionSliderToContainer(container, name, expression);
                });
            }
            // オブジェクトの場合
            else if (typeof expressions === 'object' && expressions !== null) {
                for (const name in expressions) {
                    if (expressions.hasOwnProperty(name)) {
                        const expression = expressions[name];
                        addExpressionSliderToContainer(container, name, expression);
                    }
                }
            }
            // 配列の場合
            else if (Array.isArray(expressions)) {
                expressions.forEach((expression, index) => {
                    const name = expression.name || `Expression_${index}`;
                    addExpressionSliderToContainer(container, name, expression);
                });
            }
            // それ以外の場合、直接その値を使用
            else {
                const name = "Default";
                const expression = expressions;
                addExpressionSliderToContainer(container, name, expression);
            }
        } catch (error) {
            console.log(`Error handling expressions: ${error.message}`);
            // フォールバック: expressionsオブジェクトを直接検査
            try {
                const props = Object.getOwnPropertyNames(expressions);
                for (const prop of props) {
                    if (typeof prop === 'string' && prop !== 'size' && prop !== 'forEach') {
                        try {
                            const expression = expressions[prop];
                            if (expression && typeof expression === 'object') {
                                addExpressionSliderToContainer(container, prop, expression);
                            }
                        } catch (e) {
                            // エラー処理を簡略化
                        }
                    }
                }
            } catch (inspectError) {
                console.log(`Expression inspection failed: ${inspectError.message}`);
            }
        }

        initialized = true;
    }

    // VRM 0.x表情の処理
    if (!initialized && currentVrm.blendShapeProxy) {
        // expressionManagerが既に設定されていればそれを使う
        if (currentVrm.expressionManager && currentVrm.expressionManager.expressionMap) {
            currentVrm.expressionManager.expressionMap.forEach((preset, name) => {
                addExpressionSlider(container, name,
                    (value) => {
                        currentVrm.expressionManager.setValue(name, value);
                    },
                    () => currentVrm.expressionManager.getValue(name) || 0
                );
            });
            initialized = currentVrm.expressionManager.expressionMap.size > 0;
        } else {
            // 従来の方法を試す
            const presets = ['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o'];
            let addedCount = 0;

            // 最初に互換レイヤーを設定
            if (!currentVrm.expressionManager) {
                setupVrm0xExpressionManager(currentVrm);
            }

            // 直接blendShapeProxyを使用
            presets.forEach(preset => {
                try {
                    const trackName = currentVrm.blendShapeProxy.getBlendShapeTrackName(preset);
                    if (trackName !== undefined) {
                        addExpressionSlider(container, preset.toUpperCase(),
                            (value) => {
                                try {
                                    currentVrm.blendShapeProxy.setValue(preset, value);
                                } catch (e) {
                                    console.log(`Failed to set ${preset}`);
                                }
                            },
                            () => {
                                try {
                                    return currentVrm.blendShapeProxy.getValue(preset) || 0;
                                } catch (e) {
                                    return 0;
                                }
                            }
                        );
                        addedCount++;
                    }
                } catch (e) {
                    // エラー処理を簡略化
                }
            });

            initialized = addedCount > 0;
        }
    }

    // 表情が見つからなかった場合
    if (!initialized) {
        container.innerHTML = '<div class="expression-control" style="justify-content: center;">No expressions available in this model</div>';

        // それでも表示は続ける
        document.getElementById('expression-controls').style.display = 'block';
    }
}

// VRM 0.xの表情管理のための互換レイヤーを設定
function setupVrm0xExpressionManager(vrm) {
    if (!vrm || !vrm.blendShapeProxy) {
        return;
    }

    // 利用可能な全ブレンドシェイプをチェック
    let availablePresets = [];
    const standardPresets = ['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o'];

    // 標準プリセットをチェック
    standardPresets.forEach(preset => {
        try {
            // ブレンドシェイプが見つかれば追加
            if (vrm.blendShapeProxy.getBlendShapeTrackName(preset) !== undefined) {
                availablePresets.push(preset);
            } else {
                // 大文字も試す
                const upperPreset = preset.toUpperCase();
                if (vrm.blendShapeProxy.getBlendShapeTrackName(upperPreset) !== undefined) {
                    availablePresets.push(upperPreset);
                }
            }
        } catch (e) {
            // エラー処理を簡略化
        }
    });

    // カスタムマッピングを探す
    if (availablePresets.length === 0) {
        try {
            const proxy = vrm.blendShapeProxy;
            if (proxy._blendShapeGroups) {
                const keys = Object.keys(proxy._blendShapeGroups);
                keys.forEach(key => {
                    availablePresets.push(key);
                });
            }
        } catch (e) {
            // エラー処理を簡略化
        }
    }    // VRM 1.0互換の表情マネージャーを作成
    vrm.expressionManager = {
        expressionMap: new Map(),
        setValue: (name, weight) => {
            try {
                // 大文字小文字を区別しない対応
                const lowerName = name.toLowerCase();
                const exactName = availablePresets.find(p => p.toLowerCase() === lowerName) || name;

                // 値が変更された場合のみ設定して更新を強制
                const currentValue = vrm.blendShapeProxy.getValue(exactName) || 0;
                if (currentValue !== weight) {
                    vrm.blendShapeProxy.setValue(exactName, weight);

                    // 即時更新を強制
                    if (vrm.blendShapeProxy.update) {
                        vrm.blendShapeProxy.update();
                    }
                }
                return true;
            } catch (e) {
                console.log(`Error setting expression ${name}: ${e.message}`);
                return false;
            }
        },
        getValue: (name) => {
            try {
                const lowerName = name.toLowerCase();
                const exactName = availablePresets.find(p => p.toLowerCase() === lowerName) || name;
                return vrm.blendShapeProxy.getValue(exactName) || 0;
            } catch (e) {
                return 0;
            }
        },
        // 全表情の更新を強制するメソッドを追加
        update: () => {
            try {
                if (vrm.blendShapeProxy && vrm.blendShapeProxy.update) {
                    vrm.blendShapeProxy.update();
                }
                return true;
            } catch (e) {
                console.log(`Error updating expressions: ${e.message}`);
                return false;
            }
        }
    };

    // 見つかったプリセットをマップに追加
    availablePresets.forEach(preset => {
        vrm.expressionManager.expressionMap.set(preset.toUpperCase(), preset);
    });
}

// 表情スライダーの追加
function addExpressionSlider(container, name, setValueFn, getValueFn) {
    const controlDiv = document.createElement('div');
    controlDiv.className = 'expression-control';
    // コントロール全体にテキスト選択を防止
    controlDiv.style.userSelect = 'none';
    controlDiv.style.webkitUserSelect = 'none';
    controlDiv.style.msUserSelect = 'none';
    controlDiv.style.cursor = 'default';

    const labelContainer = document.createElement('div');
    labelContainer.style.display = 'flex';
    labelContainer.style.justifyContent = 'space-between';
    labelContainer.style.width = '100%';
    labelContainer.style.marginBottom = '4px';
    // テキスト選択を防止
    labelContainer.style.userSelect = 'none';
    labelContainer.style.webkitUserSelect = 'none';
    labelContainer.style.msUserSelect = 'none';

    const label = document.createElement('label');
    label.textContent = name;
    label.htmlFor = `expression-${name}`;
    // ラベル自身にも選択防止を適用
    label.style.userSelect = 'none';
    label.style.webkitUserSelect = 'none';
    label.style.msUserSelect = 'none';
    label.style.cursor = 'default'; // カーソルをデフォルトに

    const valueDisplay = document.createElement('span');
    valueDisplay.textContent = '0.00';
    valueDisplay.style.marginLeft = '8px';
    valueDisplay.style.fontSize = '12px';
    valueDisplay.style.color = '#ccc';
    valueDisplay.style.minWidth = '40px';
    valueDisplay.style.display = 'inline-block';
    valueDisplay.style.textAlign = 'right';
    valueDisplay.style.userSelect = 'none';
    valueDisplay.style.webkitUserSelect = 'none';
    valueDisplay.style.msUserSelect = 'none';
    valueDisplay.id = `expression-value-${name}`;

    labelContainer.appendChild(label);
    labelContainer.appendChild(valueDisplay);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = `expression-${name}`;
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';

    // 初期値を取得
    try {
        const initialValue = getValueFn();
        slider.value = initialValue;
        valueDisplay.textContent = initialValue.toFixed(2);
    } catch (e) {
        slider.value = 0;
        valueDisplay.textContent = '0.00';
    }

    // スライダーのイベントリスナー
    slider.addEventListener('input', (e) => {
        try {
            const value = parseFloat(e.target.value);
            setValueFn(value);
            valueDisplay.textContent = value.toFixed(2);

            // 変更が即座に反映されるよう、必要に応じてモデルの更新を強制
            if (currentVrm && currentVrm.expressionManager && typeof currentVrm.expressionManager.update === 'function') {
                currentVrm.expressionManager.update();
            }
        } catch (error) {
            console.log(`Error with slider ${name}: ${error.message}`);
        }
    });

    controlDiv.appendChild(labelContainer);
    controlDiv.appendChild(slider);
    container.appendChild(controlDiv);
}

// 表情をリセット
function resetExpressions() {
    if (!currentVrm) {
        return;
    }

    try {
        // 前回に更新された表情リストを追跡
        const resetExpressions = [];

        // VRM 1.0表情のリセット
        if (currentVrm.expressionManager && currentVrm.expressionManager.expressionMap) {
            try {
                // 全ての表情名を取得
                const expressionNames = [];

                if (currentVrm.expressionManager.expressionMap instanceof Map) {
                    // Mapから表情名を収集
                    currentVrm.expressionManager.expressionMap.forEach((_, name) => {
                        expressionNames.push(name);
                    });
                } else if (typeof currentVrm.expressionManager.expressionMap === 'object') {
                    // オブジェクトから表情名を収集
                    Object.keys(currentVrm.expressionManager.expressionMap).forEach(name => {
                        expressionNames.push(name);
                    });
                }

                // 各表情を個別にリセット
                expressionNames.forEach(name => {
                    try {
                        // 現在の値を確認し、0でなければリセット
                        const currentValue = currentVrm.expressionManager.getValue(name);
                        if (currentValue && currentValue > 0) {
                            currentVrm.expressionManager.setValue(name, 0);
                            resetExpressions.push(name);
                            // デバッグログでリセット操作を記録
                            console.log(`Reset expression: ${name} (from ${currentValue} to 0)`);
                        }
                    } catch (innerError) {
                        console.log(`Failed to reset expression ${name}: ${innerError.message}`);
                    }
                });
            } catch (e) {
                console.log(`Expression reset error: ${e.message}`);
            }
        }

        // VRM 0.x表情のリセット
        if (currentVrm.blendShapeProxy) {
            // 標準プリセット
            const presets = ['joy', 'angry', 'sorrow', 'fun', 'blink', 'a', 'i', 'u', 'e', 'o'];

            // 標準プリセットを試す
            presets.forEach(preset => {
                try {
                    // 現在値をチェック
                    let currentValue = 0;
                    try {
                        currentValue = currentVrm.blendShapeProxy.getValue(preset);
                    } catch (e) {
                        // 値の取得に失敗した場合は無視
                    }

                    if (currentValue && currentValue > 0) {
                        currentVrm.blendShapeProxy.setValue(preset, 0);
                        resetExpressions.push(preset);
                        console.log(`Reset VRM 0.x preset: ${preset} (from ${currentValue} to 0)`);
                    }
                } catch (e) {
                    // 大文字でも試す
                    try {
                        const upperPreset = preset.toUpperCase();
                        let currentValue = 0;
                        try {
                            currentValue = currentVrm.blendShapeProxy.getValue(upperPreset);
                        } catch (e) {
                            // 値の取得に失敗した場合は無視
                        }

                        if (currentValue && currentValue > 0) {
                            currentVrm.blendShapeProxy.setValue(upperPreset, 0);
                            resetExpressions.push(upperPreset);
                            console.log(`Reset VRM 0.x preset (uppercase): ${upperPreset} (from ${currentValue} to 0)`);
                        }
                    } catch (innerE) {
                        console.log(`Failed to reset VRM 0.x expression ${preset}: ${e.message}`);
                    }
                }
            });

            // カスタムブレンドシェイプも探索して直接リセット
            try {
                if (currentVrm.blendShapeProxy._blendShapeGroups) {
                    const keys = Object.keys(currentVrm.blendShapeProxy._blendShapeGroups);
                    keys.forEach(key => {
                        try {
                            // 現在値をチェック
                            let currentValue = 0;
                            try {
                                currentValue = currentVrm.blendShapeProxy.getValue(key);
                            } catch (e) {
                                // 値の取得に失敗した場合は無視
                            }

                            if (currentValue && currentValue > 0) {
                                currentVrm.blendShapeProxy.setValue(key, 0);
                                resetExpressions.push(key);
                                console.log(`Reset custom VRM 0.x expression: ${key} (from ${currentValue} to 0)`);
                            }
                        } catch (e) {
                            console.log(`Failed to reset custom expression ${key}: ${e.message}`);
                        }
                    });
                }
            } catch (e) {
                console.log(`Error accessing blendShapeGroups: ${e.message}`);
            }
        }

        // 表情コントロール更新後に1フレームの強制更新を行う
        if (currentVrm.update) {
            currentVrm.update(0);
        }

        // アニメーション反映のため手動で更新を強制
        if (resetExpressions.length > 0 && currentVrm.expressionManager) {
            // 一度すべての表情を適用するよう明示的に指示
            if (typeof currentVrm.expressionManager.update === 'function') {
                currentVrm.expressionManager.update();
                console.log('Called expressionManager.update() to apply changes');
            }
        }

        // UI要素を更新
        const sliders = document.querySelectorAll('#expression-sliders input[type="range"]');
        sliders.forEach(slider => {
            try {
                slider.value = 0;
                // 対応する値表示も更新
                const valueId = `expression-value-${slider.id.replace('expression-', '')}`;
                const valueDisplay = document.getElementById(valueId);
                if (valueDisplay) {
                    valueDisplay.textContent = '0.00';
                } else {
                    // 古いDOMアクセス方法も残す
                    const labelValueDisplay = document.querySelector(`label[for="${slider.id}"]`)?.nextElementSibling;
                    if (labelValueDisplay) {
                        labelValueDisplay.textContent = '0.00';
                    }
                }
            } catch (e) {
                console.log(`Error updating slider UI: ${e.message}`);
            }
        });

        // 表情コントロールの表示を確保
        if (expressionControlsElement) {
            expressionControlsElement.style.display = 'block';
        }

        // 表情のリセット完了をログ出力
        console.log(`表情リセット完了: ${resetExpressions.length}個の表情をリセットしました`);
        sendDebugMessage(`表情リセット完了: ${resetExpressions.length}個の表情をリセットしました`);
    } catch (error) {
        console.log(`Error in reset expressions: ${error.message}`);
        sendDebugMessage(`表情リセットエラー: ${error.message}`);
    }
}

// 表情コントロールの要素スタイルを初期化する
function setupExpressionControlsStyle() {
    if (expressionControlsElement) {
        // コントロールのスタイルを直接設定        expressionControlsElement.style.position = 'absolute';
        expressionControlsElement.style.top = '10px';  // 下から上に変更
        expressionControlsElement.style.left = '10px';
        expressionControlsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        expressionControlsElement.style.padding = '10px';
        expressionControlsElement.style.borderRadius = '5px';
        expressionControlsElement.style.color = 'white';
        expressionControlsElement.style.fontSize = '12px';
        expressionControlsElement.style.maxHeight = '90vh';
        expressionControlsElement.style.overflowY = 'auto';
        expressionControlsElement.style.minWidth = '260px';
        expressionControlsElement.style.zIndex = '100';
        expressionControlsElement.style.display = 'none';
        // テキスト選択を防止するスタイルを追加
        expressionControlsElement.style.userSelect = 'none';
        expressionControlsElement.style.webkitUserSelect = 'none';
        expressionControlsElement.style.msUserSelect = 'none';
        // スライダー操作中のカーソルスタイルを変更しない
        expressionControlsElement.style.cursor = 'default';
    }
}

// モデル読み込み後に表情コントロールを確実に表示させる関数
function ensureExpressionControlsVisible() {
    // 少し遅らせて表示を確保
    setTimeout(() => {
        try {
            if (expressionControlsElement) {
                expressionControlsElement.style.display = 'block';
            } else {
                expressionControlsElement = document.getElementById('expression-controls');
                if (expressionControlsElement) {
                    expressionControlsElement.style.display = 'block';
                }
            }
        } catch (e) {
            console.log('Error showing expression controls');
        }
    }, 1000);
}

// 表情の詳細をログ出力する関数（簡略化）
function logExpressionDetails(expression, name) {
    // 表情処理が動作していることだけを確認するシンプルな出力
    console.log(`Expression: "${name}" available`);
}

// コンテナにスライダーを追加する関数
function addExpressionSliderToContainer(container, name, expression) {
    addExpressionSlider(container, name,
        (value) => {
            currentVrm.expressionManager.setValue(name, value);
        },
        () => currentVrm.expressionManager.getValue(name) || 0
    );
}