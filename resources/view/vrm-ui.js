let expressionControlsElement;

/**
 * VRM UI要素を初期化
 */
function initVrmUIElements() {
    expressionControlsElement = document.getElementById('left-controls');
    setupExpressionControlsStyle();
}

/**
 * VRMメタデータを表示
 * @param {VRM} vrm VRMモデル
 */
function displayVrmMetadata(vrm) {
    const metadataElement = document.getElementById('metadata');
    metadataElement.innerHTML = '<div class="metadata-title">VRM Metadata</div>';

    if (!vrm.meta) {
        appendMetadataItem('No metadata available');
        return;
    }

    const meta = vrm.meta;
    let vrmVersion = "Unknown";

    if (vrm.vrmVersion) {
        vrmVersion = vrm.vrmVersion;
    } else if (meta.metaVersion) {
        vrmVersion = meta.metaVersion;
    } else if (meta.title && !meta.name) {
        vrmVersion = "0.x";
    } else {
        const isVrm1Structure = meta.name !== undefined && (meta.authors !== undefined || Array.isArray(meta.authors));
        vrmVersion = isVrm1Structure ? "1.0 (Estimated)" : "0.x (Estimated)";
    }

    appendMetadataItem({ label: 'VRM Version', key: '_version' }, { _version: vrmVersion });

    const metadataList = [
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

    let metadataCount = 0;
    metadataList.forEach(item => {
        if (meta[item.key] !== undefined && meta[item.key] !== null) {
            appendMetadataItem(item, meta);
            metadataCount++;
        }
    });

    if (metadataCount === 0) {
        appendMetadataItem('No detailed metadata available');
    }
}

/**
 * メタデータアイテムを追加
 * @param {string|Object} itemOrText アイテムまたはテキスト
 * @param {Object} meta メタデータオブジェクト
 */
function appendMetadataItem(itemOrText, meta) {
    const metadataElement = document.getElementById('metadata');
    const div = document.createElement('div');
    div.className = 'metadata-item';

    if (typeof itemOrText === 'string') {
        div.textContent = itemOrText;
    } else {
        const item = itemOrText;
        if (item.isImage && meta[item.key]) {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span>`;
            try {
                const img = document.createElement('img');
                img.src = meta[item.key];
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.display = 'block';
                img.style.marginTop = '5px';
                div.appendChild(img);
            } catch (error) {
                div.innerHTML += ` Image load error`;
            }
        } else if (item.isArray && Array.isArray(meta[item.key])) {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key].join(', ')}`;
        } else {
            div.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key]}`;
        }
    }

    metadataElement.appendChild(div);
}

/**
 * 表情コントロールを初期化
 */
function initExpressionControls() {
    const expressionControlsEl = document.getElementById('left-controls');
    const container = document.getElementById('expression-sliders');

    if (!expressionControlsEl || !container) {
        console.warn('Expression controls elements not found');
        return;
    }

    container.innerHTML = '';

    const vrm = window.currentVrm;
    if (!vrm) {
        console.warn('No VRM model loaded');
        return;
    }

    console.log('VRM object:', vrm);
    console.log('VRM expressionManager:', vrm.expressionManager);
    console.log('VRM blendShapeProxy:', vrm.blendShapeProxy); let expressions = {};

    if (vrm.expressionManager && vrm.expressionManager.expressionMap) {
        // VRM 1.0の場合
        expressions = vrm.expressionManager.expressionMap;
        console.log('Using VRM 1.0 expressionMap:', Object.keys(expressions));
    } else if (vrm.expressionManager && vrm.expressionManager.expressions) {
        // カスタム互換レイヤーの場合
        expressions = vrm.expressionManager.expressions;
        console.log('Using expressionManager expressions:', Object.keys(expressions));
    } else if (vrm.blendShapeProxy && vrm.blendShapeProxy.blendShapeGroups) {
        // VRM 0.xの場合
        vrm.blendShapeProxy.blendShapeGroups.forEach(group => {
            if (group.name) {
                expressions[group.name] = { weight: 0 };
            }
        });
        console.log('Using blendShapeProxy expressions:', Object.keys(expressions));
    } else {
        console.warn('No expression system found in VRM');
        return;
    }

    Object.keys(expressions).forEach(expressionName => {
        const controlDiv = document.createElement('div');
        controlDiv.className = 'expression-control';

        const label = document.createElement('label');
        label.textContent = expressionName;
        label.setAttribute('for', `expression-${expressionName}`);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.id = `expression-${expressionName}`;
        slider.min = '0';
        slider.max = '1';
        slider.step = '0.01';
        slider.value = '0'; slider.addEventListener('input', (event) => {
            const value = parseFloat(event.target.value);
            console.log(`Setting expression ${expressionName} to ${value}`);

            if (vrm.expressionManager) {
                if (typeof vrm.expressionManager.setValue === 'function') {
                    vrm.expressionManager.setValue(expressionName, value);
                } else if (vrm.expressionManager.expressionMap && vrm.expressionManager.expressionMap[expressionName]) {
                    // VRM 1.0の場合
                    vrm.expressionManager.expressionMap[expressionName].weight = value;
                }
            } else if (vrm.blendShapeProxy && typeof vrm.blendShapeProxy.setValue === 'function') {
                vrm.blendShapeProxy.setValue(expressionName, value);
            } else {
                console.warn(`No expression manager found for ${expressionName}`);
            }
        });

        controlDiv.appendChild(label);
        controlDiv.appendChild(slider);
        container.appendChild(controlDiv);
    }); ensureExpressionControlsVisible();
}

/**
 * 表情システムを初期化
 */
function initializeExpressions() {
    initExpressionControls();
}

/**
 * 表情をリセット
 */
function resetExpressions() {
    const vrm = window.currentVrm;
    if (!vrm) return;

    if (vrm.expressionManager && vrm.expressionManager.expressions) {
        Object.keys(vrm.expressionManager.expressions).forEach(expressionName => {
            if (typeof vrm.expressionManager.setValue === 'function') {
                vrm.expressionManager.setValue(expressionName, 0);
            }
        });
    } else if (vrm.blendShapeProxy) {
        if (vrm.blendShapeProxy.blendShapeGroups) {
            vrm.blendShapeProxy.blendShapeGroups.forEach(group => {
                if (group.name && typeof vrm.blendShapeProxy.setValue === 'function') {
                    vrm.blendShapeProxy.setValue(group.name, 0);
                }
            });
        }
    }

    const sliders = document.querySelectorAll('#expression-sliders input[type="range"]');
    sliders.forEach(slider => {
        slider.value = '0';
    });
}

/**
 * 表情コントロールの表示を確保
 */
function ensureExpressionControlsVisible() {
    if (expressionControlsElement) {
        const container = document.getElementById('expression-sliders');
        if (container && container.children.length > 0) {
            expressionControlsElement.style.display = 'block';
        } else {
            expressionControlsElement.style.display = 'none';
        }
    }
}

/**
 * 表情コントロールのスタイルを設定
 */
function setupExpressionControlsStyle() {
    if (!expressionControlsElement) return;

    expressionControlsElement.style.position = 'absolute';
    expressionControlsElement.style.top = '10px';
    expressionControlsElement.style.left = '10px';
    expressionControlsElement.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    expressionControlsElement.style.padding = '10px';
    expressionControlsElement.style.borderRadius = '5px';
    expressionControlsElement.style.color = 'white';
    expressionControlsElement.style.fontSize = '12px';
    expressionControlsElement.style.maxHeight = '90vh';
    expressionControlsElement.style.overflowY = 'auto';
    expressionControlsElement.style.display = 'none';
    expressionControlsElement.style.minWidth = '260px';
    expressionControlsElement.style.zIndex = '100';
}
