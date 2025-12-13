# react-ai-guard

![Build Status](https://img.shields.io/github/actions/workflow/status/ShyamSathish005/ai-guard/ci.yml?branch=main&style=flat-square&label=Tests)
![Bundle Size](https://img.shields.io/bundlephobia/minzip/react-ai-guard?style=flat-square&label=Size)
![License](https://img.shields.io/npm/l/react-ai-guard?style=flat-square)
![NPM Version](https://img.shields.io/npm/v/react-ai-guard?style=flat-square)

**The Firewall for LLM Applications.**

`react-ai-guard` is a production-grade safety layer for AI applications, ensuring structured output, data privacy, and UI stability.

## Monorepo Structure

This repository is organized as a monorepo containing:

| Package | Description | Version |
| :--- | :--- | :--- |
| **[`@ai-guard/react`](./packages/react)** | **Main Entry Point.** React hooks (`useStreamingJson`, `useAIGuard`) for easy integration. | [![npm](https://img.shields.io/npm/v/@ai-guard/react)](https://www.npmjs.com/package/@ai-guard/react) |
| **[`@ai-guard/core`](./packages/core)** | **The Kernel.** Pure JS logic, Web Workers, and Schema Engine. Zero dependencies. | [![npm](https://img.shields.io/npm/v/@ai-guard/core)](https://www.npmjs.com/package/@ai-guard/core) |
| **[`@ai-guard/playground`](./packages/playground)** | **Demo App.** A Vite-based playground to test features and performance. | - |

## Key Features

- **🚀 Crash-Proof Streaming**: Automatically repairs broken JSON chunks from LLMs in real-time.
- **🛡️ PII Firewall**: Scans and redacts sensitive data (Credit Cards, Keys) client-side before it leaves the browser.
- **🧠 Reasoning Model Support**: Native handling for DeepSeek-R1 and OpenAI o1 thinking traces.
- **⚡ Zero Blocking**: All heavy validation runs in a dedicated Web Worker (via `@ai-guard/core`).

## Getting Started

If you are a React developer, you likely want to install the React package:

```bash
npm install @ai-guard/react
```

Check out the [React Package Documentation](./packages/react/README.md) for full usage guide.

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for details on how to set up the dev environment.

## License

MIT © [ShyamSathish005](https://github.com/ShyamSathish005)
