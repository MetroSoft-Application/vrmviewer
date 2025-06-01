# VRM Viewer

Preview VRM files directly within the editor.

## Features

- Preview VRM 3D model files directly in VS Code
- Interactive 3D model viewer with camera controls
- Expression controls to manipulate facial expressions
- Bone manipulation for posing 3D avatar
- Support for VRM format (humanoid 3D avatar models)
- Built with Three.js and @pixiv/three-vrm

## Usage

1. Open a `.vrm` file
2. The VRM model will automatically be displayed in the VRM Viewer

![VRM Viewer Preview](./resources/img/vrm-preview-sample.gif)

## Controls

- **Rotate View**: Left-click and drag
- **Pan View**: Middle-click and drag or Shift + left-click and drag
- **Zoom**: Mouse wheel or right-click and drag
- **Expressions**: Use sliders to control facial expressions
- **Bone Manipulation**: 
  - Select bones by clicking on the model or using the dropdown menu
  - Manipulate selected bone using rotation controls
  - Reset all bones to original pose using the Reset Bones button

## Configuration

Currently no additional configuration is required. The viewer uses default settings for lighting and background.

## Requirements

- Visual Studio Code 1.60.0 or newer

## Libraries Used

This extension uses the following libraries:

- [Three.js](https://threejs.org/) - JavaScript 3D library (v0.137.5)
- [@pixiv/three-vrm](https://github.com/pixiv/three-vrm) - VRM loader for Three.js (v3.4.0)
- [GLTFLoader.js](https://threejs.org/docs/#examples/en/loaders/GLTFLoader) - GLTF loader for Three.js
- [OrbitControls.js](https://threejs.org/docs/#examples/en/controls/OrbitControls) - Camera controls for Three.js

## License

Licensed under MIT
