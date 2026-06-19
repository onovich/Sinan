import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

interface BoundaryPattern {
  id: string;
  message: string;
  pattern: RegExp;
}

interface BoundaryCheck {
  title: string;
  roots: string[];
  extensions: ReadonlySet<string>;
  patterns: BoundaryPattern[];
}

interface BoundaryViolation {
  checkTitle: string;
  column: number;
  excerpt: string;
  filePath: string;
  line: number;
  patternId: string;
  message: string;
}

const repoRoot = process.cwd();
const codeExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const dataAndCodeExtensions = new Set([...codeExtensions, '.json']);
const skippedDirectories = new Set(['.git', 'coverage', 'dist', 'node_modules']);
const threeModuleSpecifier = String.raw`three(?:\/[^'"]*)?`;

const checks: BoundaryCheck[] = [
  {
    title: 'renderer-neutral layers must not depend on Three.js',
    roots: [
      'src/engine',
      'src/game',
      'src/events',
      'src/director',
      'src/world',
      'src/physics',
      'src/input',
      'src/ui',
      'src/renderer',
      'src/schemas',
      'src/data',
      'src/migrations',
    ],
    extensions: codeExtensions,
    patterns: [
      {
        id: 'three-import-from',
        message:
          'Move Three.js imports behind src/runtime/three or a documented editor glue boundary.',
        pattern: new RegExp(String.raw`\bfrom\s+['"]${threeModuleSpecifier}['"]`),
      },
      {
        id: 'three-side-effect-import',
        message:
          'Move Three.js imports behind src/runtime/three or a documented editor glue boundary.',
        pattern: new RegExp(String.raw`\bimport\s+['"]${threeModuleSpecifier}['"]`),
      },
      {
        id: 'three-dynamic-import',
        message: 'Runtime package selection must stay behind the runtime adapter.',
        pattern: new RegExp(String.raw`\bimport\s*\(\s*['"]${threeModuleSpecifier}['"]\s*\)`),
      },
      {
        id: 'three-require',
        message: 'Runtime package selection must stay behind the runtime adapter.',
        pattern: new RegExp(String.raw`\brequire\s*\(\s*['"]${threeModuleSpecifier}['"]\s*\)`),
      },
      {
        id: 'three-namespace-use',
        message: 'Renderer-neutral layers must not reference the Three namespace.',
        pattern: /\bTHREE\./,
      },
    ],
  },
  {
    title: 'JSON DSL and project code must not execute dynamic code',
    roots: ['src', 'data', 'scripts', 'tests'],
    extensions: dataAndCodeExtensions,
    patterns: [
      {
        id: 'eval-call',
        message: 'Use schema-backed registries instead of dynamic evaluation.',
        pattern: /\beval\s*\(/,
      },
      {
        id: 'function-constructor',
        message:
          'Use explicit registered callbacks instead of constructing functions from strings.',
        pattern: /\bnew\s+Function\b/,
      },
      {
        id: 'window-property-dispatch',
        message: 'Use whitelist registries instead of dispatching through window properties.',
        pattern: /\bwindow\s*\[/,
      },
    ],
  },
];

const violations = (await Promise.all(checks.flatMap((check) => checkRoots(check)))).flat();

if (violations.length > 0) {
  console.error(`Boundary checks failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(
      `${violation.filePath}:${violation.line}:${violation.column} ` +
        `[${violation.patternId}] ${violation.message}`,
    );
    console.error(`  ${violation.excerpt}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    'Boundary checks passed: no forbidden Three.js imports or dynamic-code patterns found.',
  );
}

async function checkRoots(check: BoundaryCheck): Promise<BoundaryViolation[]> {
  const files = (
    await Promise.all(check.roots.map((root) => collectFiles(root, check.extensions)))
  ).flat();

  return (await Promise.all(files.map((filePath) => checkFile(check, filePath)))).flat();
}

async function collectFiles(
  relativeRoot: string,
  extensions: ReadonlySet<string>,
): Promise<string[]> {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  const entries = await readDirectoryIfPresent(absoluteRoot);
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(absoluteRoot, entry.name);
    const relativePath = path.relative(repoRoot, absolutePath);

    if (entry.isDirectory()) {
      if (!skippedDirectories.has(entry.name)) {
        files.push(...(await collectFiles(relativePath, extensions)));
      }
      continue;
    }

    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

async function readDirectoryIfPresent(absoluteRoot: string) {
  try {
    return await readdir(absoluteRoot, { withFileTypes: true });
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function checkFile(check: BoundaryCheck, filePath: string): Promise<BoundaryViolation[]> {
  const text = await readFile(path.join(repoRoot, filePath), 'utf8');
  const violations: BoundaryViolation[] = [];

  for (const boundaryPattern of check.patterns) {
    const pattern = makeGlobalPattern(boundaryPattern.pattern);
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const location = locateMatch(text, match.index);
      violations.push({
        checkTitle: check.title,
        column: location.column,
        excerpt: location.lineText.trim(),
        filePath: normalizePath(filePath),
        line: location.line,
        patternId: boundaryPattern.id,
        message: boundaryPattern.message,
      });

      if (match[0].length === 0) {
        pattern.lastIndex += 1;
      }
    }
  }

  return violations;
}

function makeGlobalPattern(pattern: RegExp): RegExp {
  return new RegExp(
    pattern.source,
    pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`,
  );
}

function locateMatch(text: string, index: number) {
  let line = 1;
  let lineStart = 0;

  for (let i = 0; i < index; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      lineStart = i + 1;
    }
  }

  const lineEnd = text.indexOf('\n', index);
  const lineText = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);

  return {
    column: index - lineStart + 1,
    line,
    lineText,
  };
}

function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
