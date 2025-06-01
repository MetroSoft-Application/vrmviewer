const vscode = acquireVsCodeApi();

function sendDebugMessage(message) {
    console.log(message);
    vscode.postMessage({ type: 'debug', message: message });
}

window.addEventListener('message', event => {
    const message = event.data;
    if (message.type === 'loadVrm') {
        loadVrmFromBase64(message.data, message.fileName);
    }
});

function setupGlobalFunctions() {
    window.addVrmToScene = addVrmToScene;
    window.resetCamera = resetCamera;
    window.resetLights = resetLights;
    window.updateAmbientLight = updateAmbientLight;
    window.updateDirectionalLight = updateDirectionalLight;
    window.updateBackgroundColor = updateBackgroundColor;
    window.getCurrentVrm = getCurrentVrm;
    window.loadVrmFromBase64Data = loadVrmFromBase64Data;
    window.displayVrmMetadata = displayVrmMetadata;
    window.initExpressionControls = initExpressionControls;
    window.initializeExpressions = initializeExpressions;
    window.resetExpressions = resetExpressions;
    window.ensureExpressionControlsVisible = ensureExpressionControlsVisible;
    // ボーンコントローラー関連の関数をグローバルに公開
    window.initBoneController = initBoneController;
    window.setBoneControllerVRM = setBoneControllerVRM;
    window.getBoneController = getBoneController;
    // OrbitControlsアクセス用関数を公開
    window.getOrbitControls = getOrbitControls;
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        initLoaderElements();
        initVrmUIElements();
        initializeScene();
        setupGlobalFunctions();
        
        // ボーンコントローラーを初期化
        setTimeout(() => {
            initBoneController();
        }, 100);

        document.getElementById('reset-camera').addEventListener('click', resetCamera);
        document.getElementById('reset-lights').addEventListener('click', resetLights);
        document.getElementById('reset-expressions').addEventListener('click', resetExpressions);
        document.getElementById('ambient-light').addEventListener('input', updateAmbientLight);
        document.getElementById('directional-light').addEventListener('input', updateDirectionalLight);
        document.getElementById('background-color').addEventListener('input', updateBackgroundColor);
    } catch (error) {
        sendDebugMessage(`初期化エラー: ${error.message}`);
        console.error('Initialization error:', error);
    }
});

function onVrmLoadSuccess(vrm, fileName) {
    addVrmToScene(vrm);
    displayVrmMetadata(vrm);
    resetCamera();
    resetExpressions();

    // ボーンコントローラーにVRMモデルを設定
    setBoneControllerVRM(vrm);

    setTimeout(() => {
        try {
            initExpressionControls();
            ensureExpressionControlsVisible();
        } catch (e) {
            sendDebugMessage(`表情初期化エラー: ${e.message}`);
        }
    }, 800);

    vscode.postMessage({
        type: 'debug',
        message: `VRM ${vrm.vrmVersion || '1.0'} モデルが読み込まれました。`
    });
}

function onVrmLoadError(error, context) {
    sendDebugMessage(`VRM読み込みエラー (${context}): ${error.message || error}`);

    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    vscode.postMessage({
        type: 'error',
        message: `VRM読み込みに失敗しました: ${error.message || error}`
    });
}

function loadVrmFromBase64(base64String, fileName) {
    console.log(`VRM読み込み開始: ${fileName}`);
    sendDebugMessage(`VRM読み込み開始: ${fileName}`);

    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'block';
    }

    loadVrmFromBase64Data(
        base64String,
        fileName,
        onVrmLoadSuccess,
        onVrmLoadError
    );
}