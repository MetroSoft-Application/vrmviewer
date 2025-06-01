/**
 * VRMモデルのボーンを操作するためのコントローラークラス
 */
class BoneController {
    /**
     * コンストラクタ
     * @param {THREE.Scene} scene THREE.jsのシーンオブジェクト
     * @param {THREE.Camera} camera カメラオブジェクト
     * @param {HTMLCanvasElement} rendererElement レンダラーのcanvas要素
     */
    constructor(scene, camera, rendererElement) {
        this.scene = scene;
        this.camera = camera;
        this.rendererElement = rendererElement;
        this.currentVrm = null;
        this.selectedBone = null;
        this.transformControls = null;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.modelMeshes = [];
        this.clickListenerInitialized = false;
        this.debugMode = true;

        this.boneDefinitions = {
            hips: '腰',
            spine: '背骨',
            chest: '胸',
            upperChest: '上胸',
            neck: '首',
            head: '頭',
            leftShoulder: '左肩',
            leftUpperArm: '左上腕',
            leftLowerArm: '左前腕',
            leftHand: '左手',
            rightShoulder: '右肩',
            rightUpperArm: '右上腕',
            rightLowerArm: '右前腕',
            rightHand: '右手',
            leftUpperLeg: '左太もも',
            leftLowerLeg: '左すね',
            leftFoot: '左足',
            rightUpperLeg: '右太もも',
            rightLowerLeg: '右すね',
            rightFoot: '右足'
        };

        this.init();
    }

    /**
     * 初期化処理
     */
    init() {
        this.initTransformControls();
        this.setupBoneSelector();
        this.setupTransformModeButtons();
        
        if (this.debugMode) {
            console.log('ボーンコントローラーを初期化しました');
        }
    }    /**
     * TransformControlsの初期化
     */
    initTransformControls() {
        if (!window.THREE.TransformControls) {
            console.error('TransformControlsが読み込まれていません');
            return;
        }

        this.transformControls = new THREE.TransformControls(this.camera, this.rendererElement);
        this.transformControls.setMode('rotate');
        this.transformControls.setSize(0.8);
        this.scene.add(this.transformControls);

        // TransformControlsとOrbitControlsの競合を防ぐための設定
        this.transformControls.addEventListener('mouseDown', () => {
            const orbitControls = window.getOrbitControls ? window.getOrbitControls() : null;
            if (orbitControls) {
                orbitControls.enabled = false;
            }
        });

        this.transformControls.addEventListener('mouseUp', this.onMouseUp.bind(this));
        this.transformControls.addEventListener('change', this.onTransformChange.bind(this));
        this.transformControls.addEventListener('dragging-changed', this.onDraggingChanged.bind(this));

        if (this.debugMode) {
            console.log('TransformControlsを初期化しました');
        }
    }

    /**
     * ボーンセレクターのセットアップ
     */
    setupBoneSelector() {
        const existingSelector = document.getElementById('boneSelector');
        if (existingSelector) {
            return;
        }

        const controlsContainer = document.getElementById('controls');
        if (!controlsContainer) {
            console.error('コントロールコンテナが見つかりません');
            return;
        }

        const boneControlsDiv = document.createElement('div');
        boneControlsDiv.id = 'bone-controls';
        boneControlsDiv.style.cssText = `
            background-color: rgba(0, 0, 0, 0.7);
            padding: 10px;
            border-radius: 5px;
            color: white;
            font-size: 12px;
            margin-bottom: 8px;
        `;

        const title = document.createElement('div');
        title.textContent = 'ボーン操作';
        title.style.cssText = `
            font-weight: bold;
            color: #88ccff;
            margin-bottom: 8px;
            font-size: 14px;
        `;
        boneControlsDiv.appendChild(title);

        const selectorContainer = document.createElement('div');
        selectorContainer.style.cssText = 'margin-bottom: 8px;';

        const selectorLabel = document.createElement('label');
        selectorLabel.textContent = 'ボーン選択:';
        selectorLabel.style.cssText = 'display: block; margin-bottom: 3px;';
        selectorContainer.appendChild(selectorLabel);

        const selector = document.createElement('select');
        selector.id = 'boneSelector';
        selector.style.cssText = 'width: 100%; padding: 4px; border-radius: 3px; border: none;';

        Object.entries(this.boneDefinitions).forEach(([boneName, japaneseName]) => {
            const option = document.createElement('option');
            option.value = boneName;
            option.text = japaneseName;
            selector.appendChild(option);
        });

        selector.addEventListener('change', this.onBoneSelectorChange.bind(this));
        selectorContainer.appendChild(selector);
        boneControlsDiv.appendChild(selectorContainer);

        const modeButtonsContainer = document.createElement('div');
        modeButtonsContainer.style.cssText = 'display: flex; gap: 4px; margin-bottom: 8px;';

        const modes = [
            { id: 'rotateMode', text: '回転', mode: 'rotate' },
            { id: 'translateMode', text: '移動', mode: 'translate' },
            { id: 'scaleMode', text: '拡縮', mode: 'scale' }
        ];

        modes.forEach(({ id, text, mode }) => {
            const button = document.createElement('button');
            button.id = id;
            button.textContent = text;
            button.style.cssText = 'flex: 1; padding: 4px 8px; font-size: 11px;';
            button.addEventListener('click', () => {
                this.setTransformMode(mode);
                this.updateModeButtons(mode);
            });
            modeButtonsContainer.appendChild(button);
        });

        boneControlsDiv.appendChild(modeButtonsContainer);

        const instructionDiv = document.createElement('div');
        instructionDiv.style.cssText = 'font-size: 10px; color: #cccccc; margin-top: 5px;';
        instructionDiv.textContent = 'モデルをクリックしてボーンを選択できます';
        boneControlsDiv.appendChild(instructionDiv);

        controlsContainer.insertBefore(boneControlsDiv, controlsContainer.firstChild);

        this.updateModeButtons('rotate');
    }

    /**
     * トランスフォームモードボタンのセットアップ
     */
    setupTransformModeButtons() {
        this.updateModeButtons('rotate');
    }

    /**
     * トランスフォームモードを設定
     * @param {string} mode モード名 ('rotate', 'translate', 'scale')
     */
    setTransformMode(mode) {
        if (this.transformControls) {
            this.transformControls.setMode(mode);
            
            if (this.debugMode) {
                console.log(`トランスフォームモードを変更: ${mode}`);
            }
        }
    }

    /**
     * モードボタンの状態を更新
     * @param {string} activeMode アクティブなモード名
     */
    updateModeButtons(activeMode) {
        const modes = ['rotate', 'translate', 'scale'];

        modes.forEach(mode => {
            const button = document.getElementById(`${mode}Mode`);
            if (button) {
                if (mode === activeMode) {
                    button.style.backgroundColor = '#1177bb';
                } else {
                    button.style.backgroundColor = '#0e639c';
                }
            }
        });
    }

    /**
     * ボーンセレクターの変更イベント処理
     */
    onBoneSelectorChange() {
        const selector = document.getElementById('boneSelector');
        if (!selector) return;

        this.selectBone(selector.value);

        if (this.debugMode) {
            console.log('選択されたボーン:', selector.value);
        }
    }

    /**
     * 指定されたボーンを選択
     * @param {string} boneName ボーン名
     */
    selectBone(boneName) {
        if (!this.currentVrm || !this.currentVrm.humanoid) {
            console.warn('VRMモデルがロードされていないか、Humanoidが存在しません');
            return;
        }

        const bone = this.currentVrm.humanoid.getNormalizedBoneNode(boneName);
        if (!bone) {
            console.warn(`ボーン '${boneName}' が見つかりません`);
            return;
        }

        this.selectedBone = bone;
        this.transformControls.attach(bone);

        if (this.debugMode) {
            console.log(`ボーンを選択: ${boneName}`);
        }
    }

    /**
     * TransformControls変更イベントハンドラ
     */
    onTransformChange() {
        if (!this.selectedBone) return;

        const boneName = this.getBoneNameFromObject(this.selectedBone);
        if (boneName && this.debugMode) {
            const rotation = this.selectedBone.rotation;
            console.log(`ボーン回転変更: ${boneName} x=${(rotation.x * 180 / Math.PI).toFixed(1)}° y=${(rotation.y * 180 / Math.PI).toFixed(1)}° z=${(rotation.z * 180 / Math.PI).toFixed(1)}°`);
        }
    }    /**
     * ドラッグ状態変更イベントハンドラ
     * @param {object} event イベントオブジェクト
     */
    onDraggingChanged(event) {
        // OrbitControlsを取得してドラッグ中は無効化
        const orbitControls = window.getOrbitControls ? window.getOrbitControls() : null;
        if (orbitControls) {
            orbitControls.enabled = !event.value;
            
            if (this.debugMode) {
                console.log(`OrbitControls ${event.value ? '無効化' : '有効化'}`);
            }
        }
    }    /**
     * マウスリリースイベントハンドラ
     */
    onMouseUp() {
        // OrbitControlsを再有効化
        const orbitControls = window.getOrbitControls ? window.getOrbitControls() : null;
        if (orbitControls) {
            orbitControls.enabled = true;
        }

        if (!this.selectedBone) return;

        const boneName = this.getBoneNameFromObject(this.selectedBone);
        if (boneName && this.debugMode) {
            console.log(`ボーン操作完了: ${boneName}`);
        }
    }

    /**
     * オブジェクトからボーン名を取得
     * @param {THREE.Object3D} boneObject ボーンオブジェクト
     * @returns {string|null} ボーン名
     */
    getBoneNameFromObject(boneObject) {
        if (!this.currentVrm || !this.currentVrm.humanoid) return null;

        for (const boneName of Object.keys(this.boneDefinitions)) {
            const bone = this.currentVrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone === boneObject) {
                return boneName;
            }
        }
        return null;
    }

    /**
     * クリックリスナーのセットアップ
     */
    setupClickListener() {
        if (!this.rendererElement || this.clickListenerInitialized) {
            return;
        }

        this.rendererElement.addEventListener('click', this.onModelClick.bind(this));
        this.clickListenerInitialized = true;

        if (this.debugMode) {
            console.log('モデルクリック検出が有効になりました');
        }
    }    /**
     * モデルクリック時の処理
     * @param {MouseEvent} event マウスイベント
     */
    onModelClick(event) {
        if (!this.currentVrm || !this.camera || !this.rendererElement) {
            return;
        }

        // TransformControlsがドラッグ中の場合はクリック処理をスキップ
        if (this.transformControls && this.transformControls.dragging) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const rect = this.rendererElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        if (this.modelMeshes.length === 0 && this.currentVrm.scene) {
            this.modelMeshes = this.collectVRMMeshes(this.currentVrm.scene);
        }

        const intersects = this.raycaster.intersectObjects(this.modelMeshes, true);

        if (intersects.length > 0) {
            this.findAndSelectNearestBone(intersects[0].point);
        }
    }

    /**
     * VRMモデルからメッシュを収集
     * @param {THREE.Object3D} object スキャンする3Dオブジェクト
     * @returns {THREE.Mesh[]} メッシュの配列
     */
    collectVRMMeshes(object) {
        const meshes = [];

        object.traverse((child) => {
            if (child instanceof THREE.Mesh && child.visible) {
                if (child.geometry && child.material) {
                    meshes.push(child);
                }
            }
        });

        return meshes;
    }

    /**
     * クリック位置に最も近いボーンを見つけて選択
     * @param {THREE.Vector3} position クリック位置の3D座標
     */
    findAndSelectNearestBone(position) {
        if (!this.currentVrm || !this.currentVrm.humanoid) {
            return;
        }

        let closestBone = null;
        const maxDistance = 5.0;

        for (const boneName of Object.keys(this.boneDefinitions)) {
            const bone = this.currentVrm.humanoid.getNormalizedBoneNode(boneName);

            if (bone) {
                const worldPosition = new THREE.Vector3();
                bone.getWorldPosition(worldPosition);

                const distance = position.distanceTo(worldPosition);

                if ((!closestBone || distance < closestBone.distance) && distance < maxDistance) {
                    closestBone = {
                        boneName: boneName,
                        distance: distance,
                        worldPosition: worldPosition.clone()
                    };
                }
            }
        }

        if (closestBone) {
            const selector = document.getElementById('boneSelector');
            if (selector) {
                selector.value = closestBone.boneName;
                this.selectBone(closestBone.boneName);
            }

            if (this.debugMode) {
                console.log(`最も近いボーン: ${closestBone.boneName} (距離: ${closestBone.distance.toFixed(3)})`);
            }
        }
    }

    /**
     * VRMモデルを設定
     * @param {VRM} vrm VRMモデル
     */
    setVRM(vrm) {
        this.currentVrm = vrm;

        if (vrm) {
            if (vrm.scene) {
                this.modelMeshes = this.collectVRMMeshes(vrm.scene);
            }

            this.selectBone('hips');
            this.setupClickListener();

            if (this.debugMode) {
                console.log('VRMモデルを設定しました');
            }
        } else {
            if (this.transformControls) {
                this.transformControls.detach();
            }
            this.selectedBone = null;
            this.modelMeshes = [];
        }
    }

    /**
     * 更新処理
     */
    update() {
        if (this.currentVrm) {
            this.currentVrm.update(0.016);
        }
    }

    /**
     * リソースのクリーンアップ
     */
    dispose() {
        if (this.transformControls) {
            this.scene.remove(this.transformControls);
            this.transformControls.dispose();
        }
        
        if (this.clickListenerInitialized && this.rendererElement) {
            this.rendererElement.removeEventListener('click', this.onModelClick.bind(this));
        }
    }
}
