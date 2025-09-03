# ArcGIS Web Map Angular Application

This is a production-ready Angular 20 application that displays an Esri web map using the ArcGIS Maps SDK for JavaScript (ESM @arcgis/core).

## Features

- Angular 20 with standalone components
- ArcGIS Maps SDK integration using @arcgis/core (ESM)
- Clean, service-based architecture for scalable development
- Dynamic layer management via LayerService
- Interactive drawing tools with SketchService
- Programmatic segment creation
- Configurable map setup via dependency injection
- RTL support ready
- Comprehensive testing suite

## Architecture

The application follows a modular, service-based architecture:

### Core Services

- `ArcGISInitService`: Central source of truth for Map and MapView lifecycle
- `LayerService`: Manages layer addition/removal and layer state
- `SketchService`: Handles drawing operations with vertex control
- `MapStateService`: Manages map state and navigation
- `UIService`: Handles UI components and widgets
- `SegmentService`: Manages programmatic segment creation

### Key Components

- `MapPageComponent`: Main map container with view initialization
- `PointsToolComponent`: Example tool for point placement
- `LayersToggleComponent`: Example for layer management

### Features

- RxJS-based state management
- Promise-based drawing operations
- Type-safe configurations via DI tokens
- Proper cleanup and resource management
- Comprehensive test coverage

## Prerequisites

- Node.js (LTS version)
- npm (comes with Node.js)
- Angular CLI v20

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## ArcGIS API Key

To use services that require authentication:

1. Create a `.env` file in the root directory
2. Add your API key:
   ```
   NG_APP_ARCGIS_API_KEY=your_api_key_here
   ```
3. Uncomment the apiKey line in `src/main.ts`:
   ```typescript
   esriConfig.apiKey = import.meta.env['NG_APP_ARCGIS_API_KEY'] as string;
   ```

## RTL Support

To enable RTL support (e.g., for Hebrew):

1. Uncomment the locale line in `src/main.ts`:
   ```typescript
   esriConfig.locale = "he";
   ```

## Additional Resources

For more information:
- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [ArcGIS Maps SDK for JavaScript](https://developers.arcgis.com/javascript/latest/)
- [ArcGIS for Developers](https://developers.arcgis.com/)
