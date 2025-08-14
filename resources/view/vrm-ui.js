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
 * @param {Object} gltfData GLTFデータ（オプション）
 * @param {ArrayBuffer} fileData ファイルデータ（オプション）
 */
function displayVrmMetadata(vrm, gltfData = null, fileData = null) {
    const metadataElement = document.getElementById('metadata');
    metadataElement.innerHTML = '<div class="metadata-title">VRM Metadata</div>';

    // 既存のVRMメタデータを最初に表示
    displayBasicVrmMetadata(vrm);

    // GLBファイル情報を表示
    if (fileData) {
        displayGlbFileInfo(fileData);
    }

    // glTF概要情報を表示
    if (gltfData) {
        displayGltfSummary(gltfData);
    }

    // VRMセクション情報を表示
    displayVrmSection(vrm, gltfData);
}

/**
 * GLBファイル情報を表示
 * @param {ArrayBuffer} fileData ファイルデータ
 */
function displayGlbFileInfo(fileData) {
    const glbInfo = analyzeGlbFile(fileData);

    appendMetadataSection('GLB', {
        'File Size': formatBytes(glbInfo.fileSize),
        'Binary Chunk Size': formatBytes(glbInfo.binChunkBytes)
    });
}

/**
 * glTF概要情報を表示
 * @param {Object} gltfData GLTFデータ
 */
function displayGltfSummary(gltfData) {
    // Three.jsのGLTFResultオブジェクトから実際のglTFデータを取得
    let actualGltfData = gltfData;

    // GLTFResultオブジェクトの場合、parser.jsonに実際のglTFデータがある
    if (gltfData.parser && gltfData.parser.json) {
        actualGltfData = gltfData.parser.json;
    }
    // または直接jsonプロパティにある場合
    else if (gltfData.json) {
        actualGltfData = gltfData.json;
    }

    console.log('glTF data structure:', actualGltfData); // デバッグ用

    const summary = {
        asset: actualGltfData.asset || {},
        counts: {
            nodes: (actualGltfData.nodes || []).length,
            meshes: (actualGltfData.meshes || []).length,
            materials: (actualGltfData.materials || []).length,
            images: (actualGltfData.images || []).length,
            textures: (actualGltfData.textures || []).length,
            skins: (actualGltfData.skins || []).length,
            animations: (actualGltfData.animations || []).length,
            buffers: (actualGltfData.buffers || []).length,
            bufferViews: (actualGltfData.bufferViews || []).length,
            accessors: (actualGltfData.accessors || []).length
        }
    };

    const displayData = {};
    if (summary.asset.generator) displayData['Generator'] = summary.asset.generator;
    if (summary.asset.version) displayData['glTF Version'] = summary.asset.version;

    Object.entries(summary.counts).forEach(([key, value]) => {
        displayData[key.charAt(0).toUpperCase() + key.slice(1)] = value;
    });

    appendMetadataSection('glTF Summary', displayData);
}/**
 * VRMセクション情報を表示
 * @param {VRM} vrm VRMモデル
 * @param {Object} gltfData GLTFデータ
 */
function displayVrmSection(vrm, gltfData) {
    const vrmType = determineVrmType(vrm, gltfData);
    const vrmSummary = {
        'VRM Type': vrmType,
        'Version Family': vrmType === 'VRM1' ? 'VRM 1.0+' : 'VRM 0.x'
    };

    if (vrm && vrm.meta) {
        // ヒューマノイド情報（VRMメタデータには含まれない）
        const boneCount = countHumanoidBones(vrm);
        if (boneCount > 0) vrmSummary['Humanoid Bones'] = boneCount;

        // 表情情報（VRMメタデータには含まれない）
        const expressionInfo = analyzeExpressions(vrm);
        if (expressionInfo.groups.length > 0) {
            vrmSummary['Expression Groups'] = expressionInfo.groups.join(', ');
        }
        if (expressionInfo.count > 0) vrmSummary['Expression Count'] = expressionInfo.count;

        // 拡張機能の存在確認（VRMメタデータには含まれない）
        const extensions = analyzeVrmExtensions(gltfData);
        if (Object.keys(extensions).length > 0) {
            Object.entries(extensions).forEach(([ext, present]) => {
                vrmSummary[`Extension: ${ext}`] = present ? 'Present' : 'Not Present';
            });
        }
    }

    appendMetadataSection('VRM Section', vrmSummary);
}

/**
 * 基本的なVRMメタデータを表示
 * @param {VRM} vrm VRMモデル
 */
function displayBasicVrmMetadata(vrm) {
    if (!vrm.meta) {
        appendMetadataItem('No detailed metadata available');
        return;
    }

    // 基本メタデータセクションの開始
    const metadataElement = document.getElementById('metadata');
    const basicSectionDiv = document.createElement('div');
    basicSectionDiv.className = 'metadata-section';

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

    // VRM Version を最初に表示
    const versionDiv = document.createElement('div');
    versionDiv.className = 'metadata-item';
    versionDiv.innerHTML = `<span class="metadata-title">VRM Version:</span> ${vrmVersion}`;
    basicSectionDiv.appendChild(versionDiv);

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
            const itemDiv = document.createElement('div');
            itemDiv.className = 'metadata-item';

            if (item.isImage && meta[item.key]) {
                itemDiv.innerHTML = `<span class="metadata-title">${item.label}:</span>`;
                try {
                    const img = document.createElement('img');
                    img.src = meta[item.key];
                    img.style.maxWidth = '100px';
                    img.style.maxHeight = '100px';
                    img.style.display = 'block';
                    img.style.marginTop = '5px';
                    itemDiv.appendChild(img);
                } catch (error) {
                    itemDiv.innerHTML += ` Image load error`;
                }
            } else if (item.isArray && Array.isArray(meta[item.key])) {
                itemDiv.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key].join(', ')}`;
            } else {
                itemDiv.innerHTML = `<span class="metadata-title">${item.label}:</span> ${meta[item.key]}`;
            }

            basicSectionDiv.appendChild(itemDiv);
            metadataCount++;
        }
    });

    if (metadataCount === 0) {
        const noDataDiv = document.createElement('div');
        noDataDiv.className = 'metadata-item';
        noDataDiv.textContent = 'No detailed metadata available';
        basicSectionDiv.appendChild(noDataDiv);
    }

    metadataElement.appendChild(basicSectionDiv);
}

/**
 * メタデータセクションを追加
 * @param {string} sectionTitle セクションタイトル
 * @param {Object} data データオブジェクト
 */
function appendMetadataSection(sectionTitle, data) {
    const metadataElement = document.getElementById('metadata');

    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'metadata-section';

    const titleDiv = document.createElement('div');
    titleDiv.className = 'metadata-section-title';
    titleDiv.textContent = `${sectionTitle}`;
    sectionDiv.appendChild(titleDiv);

    Object.entries(data).forEach(([key, value]) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'metadata-item';
        itemDiv.innerHTML = `<span class="metadata-label">${key}:</span> <span class="metadata-value">${value}</span>`;
        sectionDiv.appendChild(itemDiv);
    });

    metadataElement.appendChild(sectionDiv);
}

/**
 * 画像メタデータを追加
 * @param {string} label ラベル
 * @param {string} imageSrc 画像ソース
 */
function appendImageMetadata(label, imageSrc) {
    const metadataElement = document.getElementById('metadata');
    const div = document.createElement('div');
    div.className = 'metadata-item';
    div.innerHTML = `<span class="metadata-label">${label}:</span>`;

    try {
        const img = document.createElement('img');
        img.src = imageSrc;
        img.style.maxWidth = '100px';
        img.style.maxHeight = '100px';
        img.style.display = 'block';
        img.style.marginTop = '5px';
        div.appendChild(img);
    } catch (error) {
        div.innerHTML += ` <span class="metadata-value">Image load error</span>`;
    }

    metadataElement.appendChild(div);
}

/**
 * GLBファイルを解析
 * @param {ArrayBuffer} fileData ファイルデータ
 * @returns {Object} GLBファイル情報
 */
function analyzeGlbFile(fileData) {
    const view = new DataView(fileData);
    const fileSize = fileData.byteLength;

    // GLB マジックナンバーの確認
    const magic = view.getUint32(0, true);
    if (magic !== 0x46546C67) { // "glTF"
        return { fileSize, binChunkBytes: 0 };
    }

    // バイナリチャンクサイズの計算
    const version = view.getUint32(4, true);
    const length = view.getUint32(8, true);

    let binChunkBytes = 0;
    let offset = 12;

    while (offset < length) {
        const chunkLength = view.getUint32(offset, true);
        const chunkType = view.getUint32(offset + 4, true);

        if (chunkType === 0x004E4942) { // "BIN\0"
            binChunkBytes = chunkLength;
            break;
        }

        offset += 8 + chunkLength;
    }

    return { fileSize, binChunkBytes };
}

/**
 * VRMタイプを決定
 * @param {VRM} vrm VRMモデル
 * @param {Object} gltfData GLTFデータ
 * @returns {string} VRMタイプ
 */
function determineVrmType(vrm, gltfData) {
    // Three.jsのGLTFResultオブジェクトから実際のglTFデータを取得
    let actualGltfData = gltfData;

    if (gltfData && gltfData.parser && gltfData.parser.json) {
        actualGltfData = gltfData.parser.json;
    } else if (gltfData && gltfData.json) {
        actualGltfData = gltfData.json;
    }

    if (actualGltfData && actualGltfData.extensions) {
        if (actualGltfData.extensions.VRMC_vrm) return 'VRM1';
        if (actualGltfData.extensions.VRM) return 'VRM0';
    }

    if (vrm && vrm.vrmVersion) {
        return vrm.vrmVersion.startsWith('1') ? 'VRM1' : 'VRM0';
    }

    return 'Unknown';
}

/**
 * ヒューマノイドボーン数をカウント
 * @param {VRM} vrm VRMモデル
 * @returns {number} ボーン数
 */
function countHumanoidBones(vrm) {
    if (!vrm) return 0;

    if (vrm.humanoid && vrm.humanoid.humanBones) {
        return Object.keys(vrm.humanoid.humanBones).length;
    }

    if (vrm.humanoid && vrm.humanoid.getBoneNode) {
        // VRM 0.x の場合の推定
        const commonBones = [
            'hips', 'spine', 'chest', 'neck', 'head',
            'leftShoulder', 'leftUpperArm', 'leftLowerArm', 'leftHand',
            'rightShoulder', 'rightUpperArm', 'rightLowerArm', 'rightHand',
            'leftUpperLeg', 'leftLowerLeg', 'leftFoot',
            'rightUpperLeg', 'rightLowerLeg', 'rightFoot'
        ];

        return commonBones.filter(bone => {
            try {
                return vrm.humanoid.getBoneNode(bone) !== null;
            } catch {
                return false;
            }
        }).length;
    }

    return 0;
}

/**
 * 表情情報を解析
 * @param {VRM} vrm VRMモデル
 * @returns {Object} 表情情報
 */
function analyzeExpressions(vrm) {
    const result = { groups: [], count: 0 };

    if (!vrm) return result;

    // VRM 1.0の場合
    if (vrm.expressionManager && vrm.expressionManager.expressionMap) {
        const expressions = Object.keys(vrm.expressionManager.expressionMap);
        result.count = expressions.length;

        const presetExpressions = ['happy', 'angry', 'sad', 'relaxed', 'surprised', 'aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'];
        const hasPreset = expressions.some(expr => presetExpressions.includes(expr));

        if (hasPreset) result.groups.push('preset');
        if (expressions.some(expr => !presetExpressions.includes(expr))) {
            result.groups.push('custom');
        }
    }
    // VRM 0.x の場合
    else if (vrm.blendShapeProxy && vrm.blendShapeProxy.blendShapeGroups) {
        result.count = vrm.blendShapeProxy.blendShapeGroups.length;
        result.groups.push('blendShape');
    }

    return result;
}

/**
 * VRM拡張機能を解析
 * @param {Object} gltfData GLTFデータ
 * @returns {Object} 拡張機能の存在情報
 */
function analyzeVrmExtensions(gltfData) {
    const extensions = {};

    // Three.jsのGLTFResultオブジェクトから実際のglTFデータを取得
    let actualGltfData = gltfData;

    if (gltfData && gltfData.parser && gltfData.parser.json) {
        actualGltfData = gltfData.parser.json;
    } else if (gltfData && gltfData.json) {
        actualGltfData = gltfData.json;
    }

    if (!actualGltfData || !actualGltfData.extensions) return extensions;

    const vrmExtensions = [
        'VRMC_springBone',
        'VRMC_node_collider',
        'VRMC_materials_mtoon',
        'VRMC_materials_hdr_emissiveMultiplier'
    ];

    vrmExtensions.forEach(ext => {
        extensions[ext] = actualGltfData.extensions.hasOwnProperty(ext);
    });

    return extensions;
}

/**
 * バイト数をフォーマット
 * @param {number} bytes バイト数
 * @returns {string} フォーマットされた文字列
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

    // VRM 1.0 expressionMap
    if (vrm.expressionManager && vrm.expressionManager.expressionMap) {
        Object.keys(vrm.expressionManager.expressionMap).forEach(expressionName => {
            if (vrm.expressionManager.expressionMap[expressionName]) {
                vrm.expressionManager.expressionMap[expressionName].weight = 0;
            }
        });
    }
    else if (vrm.expressionManager && vrm.expressionManager.expressions) {
        // VRM 1.0 カスタム互換レイヤー
        Object.keys(vrm.expressionManager.expressions).forEach(expressionName => {
            if (typeof vrm.expressionManager.setValue === 'function') {
                vrm.expressionManager.setValue(expressionName, 0);
            }
        });
    }
    else if (vrm.blendShapeProxy) {
        // VRM 0.x
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
        // VRMモデルがロードされたら左パネルを常に表示（ボーンコントロール用）
        if (window.currentVrm) {
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
