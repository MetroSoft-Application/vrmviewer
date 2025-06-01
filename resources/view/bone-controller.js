/**
 * VRMモデルのボーン操作を行うコントローラクラス
 */
class BoneController {
    /**
     * コンストラクタ
     * @param {THREE.Scene} scene THREE.jsのシーンオブジェクト
     * @param {THREE.Camera} camera カメラオブジェクト
     * @param {HTMLCanvasElement} rendererElement レンダラーのキャンバス要素
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
        this.initialBoneRotations = new Map();
        this.init();
    }

    /**
     * Initialization process
     */
    init() {
        this.initTransformControls();
        this.setupBoneSelector();
        this.setupTransformModeButtons();
        this.setupResetButton();

        if (this.debugMode) {
            console.log('Bone controller initialized');
        }
    }

    /**
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
        const selector = document.getElementById('boneSelector');
        if (!selector) {
            console.error('ボーンセレクターが見つかりません');
            return;
        }

        selector.addEventListener('change', this.onBoneSelectorChange.bind(this));

        // 回転モードボタンのセットアップ
        const rotateButton = document.getElementById('rotateMode');
        if (rotateButton) {
            rotateButton.addEventListener('click', () => {
                this.setTransformMode('rotate');
                this.updateModeButtons('rotate');
            });
        }

        this.updateModeButtons('rotate');

        if (this.debugMode) {
            console.log('ボーンセレクターをセットアップしました');
        }
    }

    /**
     * ボーンリセットボタンのセットアップ
     */
    setupResetButton() {
        const resetButton = document.getElementById('reset-bones');
        if (!resetButton) {
            console.error('ボーンリセットボタンが見つかりません');
            return;
        }

        resetButton.addEventListener('click', this.resetAllBones.bind(this));

        if (this.debugMode) {
            console.log('ボーンリセットボタンをセットアップしました');
        }
    }

    /**
     * 初期ボーン回転値を保存
     */
    saveInitialBoneRotations() {
        if (!this.currentVrm || !this.currentVrm.humanoid) {
            return;
        }

        this.initialBoneRotations.clear();

        // HTMLの選択肢からボーン名リストを取得
        const selector = document.getElementById('boneSelector');
        if (!selector) return;

        const boneNames = Array.from(selector.options).map(option => option.value);

        for (const boneName of boneNames) {
            const bone = this.currentVrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                this.initialBoneRotations.set(boneName, {
                    x: bone.rotation.x,
                    y: bone.rotation.y,
                    z: bone.rotation.z
                });
            }
        }

        if (this.debugMode) {
            console.log('初期ボーン回転値を保存しました:', this.initialBoneRotations.size, 'bones');
        }
    }

    /**
     * 全てのボーンを初期状態にリセット
     */
    resetAllBones() {
        if (!this.currentVrm || !this.currentVrm.humanoid || this.initialBoneRotations.size === 0) {
            console.warn('VRMモデルがロードされていないか、初期回転値が保存されていません');
            return;
        }

        let resetCount = 0;

        for (const [boneName, initialRotation] of this.initialBoneRotations) {
            const bone = this.currentVrm.humanoid.getNormalizedBoneNode(boneName);
            if (bone) {
                bone.rotation.x = initialRotation.x;
                bone.rotation.y = initialRotation.y;
                bone.rotation.z = initialRotation.z;
                resetCount++;
            }
        }

        if (this.debugMode) {
            console.log(`${resetCount}個のボーンをリセットしました`);
        }
    }

    /**
     * トランスフォームモードボタンのセットアップ
     * 回転モード固定のため不要
     */
    setupTransformModeButtons() {
        this.updateModeButtons('rotate');
    }

    /**
     * トランスフォームモードを設定
     * @param {string} mode モード名
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
        const modes = ['rotate'];

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
    }

    /**
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
    }

    /**
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

        // HTMLの選択肢からボーン名リストを取得
        const selector = document.getElementById('boneSelector');
        if (!selector) return null;

        const boneNames = Array.from(selector.options).map(option => option.value);

        for (const boneName of boneNames) {
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
    }

    /**
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

        // HTMLの選択肢からボーン名リストを取得
        const selector = document.getElementById('boneSelector');
        if (!selector) return;

        const boneNames = Array.from(selector.options).map(option => option.value);

        for (const boneName of boneNames) {
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

            // 初期回転値を保存
            this.saveInitialBoneRotations();

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
            this.initialBoneRotations.clear();
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
