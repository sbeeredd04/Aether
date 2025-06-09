# Contributing to Aether AI

Thank you for your interest in contributing to Aether AI! We welcome contributions from everyone. This guide will help you get started.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Issue Guidelines](#issue-guidelines)
- [Community](#community)

## 📜 Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- A Google AI API key (for testing AI features)

### Development Setup

1. **Fork the repository**
   
   Click the "Fork" button at the top right of the repository page.

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Aether.git
cd Aether
   ```

3. **Add the original repository as upstream**
   ```bash
   git remote add upstream https://github.com/sbeeredd04/Aether.git
   ```

4. **Install dependencies**
   ```bash
   cd aether
   npm install
   ```

5. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Add your API keys to `.env.local`:
   ```env
   GOOGLE_AI_API_KEY=your_gemini_api_key_here
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

## 🤝 How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Reports**: Help us identify and fix issues
- **Feature Requests**: Suggest new features or improvements
- **Code Contributions**: Submit bug fixes or new features
- **Documentation**: Improve our docs, tutorials, or examples
- **Design**: Contribute UI/UX improvements
- **Testing**: Help us improve test coverage

### Before You Start

1. **Check existing issues**: Look for existing issues or discussions about your contribution
2. **Create an issue**: For significant changes, create an issue first to discuss your approach
3. **Get feedback**: Wait for maintainer feedback before starting work on large features

## 🔄 Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Keep commits focused and atomic
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run lint
   npm run build
   npm run test
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing new feature"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Use a clear title and description
   - Reference any related issues
   - Include screenshots for UI changes
   - Ensure all CI checks pass

### Pull Request Guidelines

- **Keep PRs focused**: One feature or fix per PR
- **Write clear descriptions**: Explain what changes you made and why
- **Include tests**: Add tests for new features or bug fixes
- **Update documentation**: Update relevant docs and README if needed
- **Respond to feedback**: Be responsive to review comments

## 🎨 Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define proper types for all functions and components
- Avoid `any` types when possible

### React/Next.js

- Use functional components with hooks
- Follow React best practices
- Use Next.js App Router conventions

### Styling

- Use Tailwind CSS for styling
- Follow the existing design system
- Keep responsive design in mind

### Code Quality

```typescript
// Good: Clear, typed function
interface User {
  id: string;
  name: string;
  email: string;
}

function getUserById(id: string): Promise<User | null> {
  // Implementation
}

// Bad: Unclear, untyped function
function getUser(id: any): any {
  // Implementation
}
```

### File Structure

```
src/
├── components/
│   ├── ui/           # Reusable UI components
│   ├── nodes/        # Node-specific components
│   └── [feature]/    # Feature-specific components
├── app/
│   ├── page.tsx      # Landing page
│   └── workspace/    # App pages
├── store/            # State management
├── utils/            # Utility functions
└── types/            # TypeScript type definitions
```

## 📝 Commit Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect code meaning (formatting, etc.)
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes that affect the build system or external dependencies
- `ci`: Changes to CI configuration files and scripts

### Examples

```bash
git commit -m "feat: add conversation export functionality"
git commit -m "fix: resolve node positioning issue in graph view"
git commit -m "docs: update installation instructions"
git commit -m "style: format code with prettier"
```

## 🐛 Issue Guidelines

### Bug Reports

When reporting bugs, please include:

- **Clear title**: Descriptive summary of the issue
- **Environment**: OS, browser, Node.js version
- **Steps to reproduce**: Detailed steps to reproduce the bug
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Screenshots**: If applicable
- **Additional context**: Any other relevant information

### Feature Requests

When requesting features, please include:

- **Clear title**: Descriptive summary of the feature
- **Problem statement**: What problem does this solve?
- **Proposed solution**: How would you like this to work?
- **Alternatives considered**: Other solutions you've considered
- **Additional context**: Any other relevant information

## 🏷️ Labels

We use labels to categorize issues and PRs:

- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: High priority issue
- `status: needs review`: Needs review from maintainers

## 💬 Community

- **GitHub Discussions**: For questions and general discussion
- **Issues**: For bug reports and feature requests
- **Discord**: [Join our Discord server](https://discord.gg/aether-ai) for real-time chat

## 🙏 Recognition

Contributors are recognized in:

- README.md contributor section
- Release notes for significant contributions
- Special mentions in our Discord community

## 📚 Resources

- [React Documentation](https://react.dev)
- [Next.js Documentation](https://nextjs.org/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [React Flow Documentation](https://reactflow.dev/docs)

## ❓ Questions?

If you have questions about contributing, feel free to:

- Open a discussion on GitHub
- Ask in our Discord server
- Reach out to the maintainers

Thank you for contributing to Aether AI! 🚀 