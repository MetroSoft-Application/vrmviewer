let loadingElement, metadataElement;
let onVrmLoadSuccessCallback = null;
let onVrmLoadErrorCallback = null;

function initLoaderElements() {
    loadingElement = document.getElementById('loading');
    metadataElement = document.getElementById('metadata');
}

function loadVrmFromBase64Data(base64String, fileName, onSuccessCallback, onErrorCallback) {
    onVrmLoadSuccessCallback = onSuccessCallback;
    onVrmLoadErrorCallback = onErrorCallback;

    loadingElement.style.display = 'block';

    try {
        const binary = atob(base64String);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        if (window.currentVrm) {
            scene.remove(window.currentVrm.scene);
            window.currentVrm = null;
        }

        const loader = new THREE.GLTFLoader();
        loader.register((parser) => new THREE.VRMLoaderPlugin(parser));

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

function handleGltfLoad(gltf) {
    const vrm = gltf.userData.vrm;

    if (vrm) {
        if (!vrm.vrmVersion) {
            if (vrm.meta && vrm.meta.metaVersion) {
                vrm.vrmVersion = vrm.meta.metaVersion;
            } else {
                vrm.vrmVersion = "1.0";
            }
        }
        handleVrm10Model(vrm);
    } else {
        handleVrm0xModel(gltf);
    }
}

function handleVrm10Model(vrm) {
    window.currentVrm = vrm;
    vrm.scene.rotation.y = determineModelOrientation(vrm);
    loadingElement.style.display = 'none';

    console.log('VRM 1.0 model loaded:', vrm);
    console.log('Expression manager:', vrm.expressionManager);

    // VRM 1.0表情システムの互換レイヤーを追加
    setupVrm10ExpressionManager(vrm);

    if (onVrmLoadSuccessCallback) {
        onVrmLoadSuccessCallback(vrm);
    }
}

function handleVrm0xModel(gltf) {
    THREE.VRM.from(gltf)
        .then((vrm) => {
            window.currentVrm = vrm;
            if (!vrm.vrmVersion) {
                vrm.vrmVersion = "0.x";
            }
            vrm.scene.rotation.y = determineModelOrientation(vrm);
            loadingElement.style.display = 'none';
            setupVrm0xExpressionManager(vrm);

            if (onVrmLoadSuccessCallback) {
                onVrmLoadSuccessCallback(vrm);
            }
        })
        .catch((error) => {
            scene.add(gltf.scene);
            loadingElement.style.display = 'none';

            if (onVrmLoadErrorCallback) {
                onVrmLoadErrorCallback(error, 'VRM conversion failed');
            }
        });
}

function handleLoadError(error, prefix = 'VRM Loading Error') {
    if (loadingElement) {
        loadingElement.textContent = `Error: ${error.message || 'Failed to load VRM model'}`;
        loadingElement.style.backgroundColor = 'rgba(220, 53, 69, 0.8)';
    }

    if (onVrmLoadErrorCallback) {
        onVrmLoadErrorCallback(error, prefix);
    }
}

function determineModelOrientation(vrm) {
    if (!vrm || !vrm.meta) {
        return 0;
    }

    if (vrm.vrmVersion && vrm.vrmVersion.startsWith('1')) {
        return 0;
    } else {
        return Math.PI;
    }
}

function setupVrm0xExpressionManager(vrm) {
    if (vrm.blendShapeProxy) {
        const expressions = {};
        const proxy = vrm.blendShapeProxy;

        if (proxy.blendShapeGroups) {
            proxy.blendShapeGroups.forEach(group => {
                if (group.name) {
                    expressions[group.name] = {
                        weight: 0,
                        setValue: (value) => {
                            proxy.setValue(group.name, value);
                        }
                    };
                }
            });
        }

        vrm.expressionManager = {
            expressions: expressions,
            getValue: (name) => {
                return expressions[name] ? expressions[name].weight : 0;
            },
            setValue: (name, value) => {
                if (expressions[name]) {
                    expressions[name].weight = value;
                    expressions[name].setValue(value);
                }
            },
            update: (deltaTime) => {
                if (proxy && typeof proxy.update === 'function') {
                    proxy.update();
                }
            }
        };
    }
}

function setupVrm10ExpressionManager(vrm) {
    if (vrm.expressionManager && vrm.expressionManager.expressionMap) {
        const expressions = {};
        const expressionMap = vrm.expressionManager.expressionMap;

        Object.keys(expressionMap).forEach(expressionName => {
            expressions[expressionName] = {
                weight: 0,
                setValue: (value) => {
                    if (expressionMap[expressionName]) {
                        expressionMap[expressionName].weight = value;
                    }
                }
            };
        });

        // 互換レイヤーを追加
        if (!vrm.expressionManager.expressions) {
            vrm.expressionManager.expressions = expressions;
        }

        if (!vrm.expressionManager.setValue) {
            vrm.expressionManager.setValue = (name, value) => {
                if (expressionMap[name]) {
                    expressionMap[name].weight = value;
                }
            };
        }

        if (!vrm.expressionManager.getValue) {
            vrm.expressionManager.getValue = (name) => {
                return expressionMap[name] ? expressionMap[name].weight : 0;
            };
        }
    }
}
