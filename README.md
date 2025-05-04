# VRM Viewer

A Visual Studio Code extension that allows you to preview VRM files directly within the editor.

## Features

- Preview VRM 3D model files directly in VS Code
- Interactive 3D model viewer with camera controls
- Support for VRM format (humanoid 3D avatar models)
- Built with Three.js and @pixiv/three-vrm

## Usage

1. Open a `.vrm` file in VS Code
2. The VRM model will automatically be displayed in the VRM Viewer

![VRM Viewer Preview](./resources/img/vrm-preview-sample.png)

## Controls

- **Rotate**: Left-click and drag
- **Pan**: Middle-click and drag or Shift + left-click and drag
- **Zoom**: Mouse wheel or right-click and drag

## Configuration

Currently no additional configuration is required. The viewer uses default settings for lighting and background.

## Requirements

- Visual Studio Code 1.60.0 or newer

## Technical Details

This extension:

- Registers a custom editor for `.vrm` files
- Uses Three.js for 3D rendering
- Implements @pixiv/three-vrm for VRM file format support
- Renders the model in a VS Code WebView panel

## License

Licensed under MIT
