import * as babelParser from '@babel/parser';
import crypto from 'crypto';
import { CodeSymbol, DeveloperHandoff, ExtractedDecision, FailedApproach, UnresolvedIssue } from '@/types';
import { generateContentWithGemini, DEFAULT_MODEL } from '../ai/gemini';
import { estimateTokenCount } from '../ingestion/normalizer';

export interface CodeAnalysisResult {
  symbols: CodeSymbol[];
  imports: string[];
  exports: string[];
  summary: string;
  language: string;
}

/**
 * Deterministic AST analysis for JavaScript / TypeScript / JSX / TSX
 */
export function parseSourceCode(sourceCode: string, filename: string = 'snippet.ts'): CodeAnalysisResult {
  const symbols: CodeSymbol[] = [];
  const imports: string[] = [];
  const exports: string[] = [];

  const isTs = filename.endsWith('.ts') || filename.endsWith('.tsx');
  const isJsx = filename.endsWith('.jsx') || filename.endsWith('.tsx');

  try {
    const ast = babelParser.parse(sourceCode, {
      sourceType: 'module',
      plugins: [
        ...(isTs ? (['typescript'] as babelParser.ParserPlugin[]) : []),
        ...(isJsx ? (['jsx'] as babelParser.ParserPlugin[]) : []),
      ],
      errorRecovery: true,
    });

    for (const node of ast.program.body) {
      // Imports
      if (node.type === 'ImportDeclaration') {
        imports.push(node.source.value);
      }

      // Export Named Declarations
      if (node.type === 'ExportNamedDeclaration' && node.declaration) {
        const decl = node.declaration;
        if (decl.type === 'FunctionDeclaration' && decl.id) {
          const fnName = decl.id.name;
          exports.push(fnName);
          symbols.push({
            name: fnName,
            kind: 'function',
            file: filename,
            line: decl.loc?.start.line,
            params: decl.params.map((p) => ('name' in p ? String(p.name) : 'param')),
          });
        } else if (decl.type === 'ClassDeclaration' && decl.id) {
          const clsName = decl.id.name;
          exports.push(clsName);
          symbols.push({
            name: clsName,
            kind: 'class',
            file: filename,
            line: decl.loc?.start.line,
          });
        } else if (decl.type === 'TSInterfaceDeclaration' && decl.id) {
          const ifName = decl.id.name;
          exports.push(ifName);
          symbols.push({
            name: ifName,
            kind: 'interface',
            file: filename,
            line: decl.loc?.start.line,
          });
        } else if (decl.type === 'TSTypeAliasDeclaration' && decl.id) {
          const typeName = decl.id.name;
          exports.push(typeName);
          symbols.push({
            name: typeName,
            kind: 'type',
            file: filename,
            line: decl.loc?.start.line,
          });
        } else if (decl.type === 'VariableDeclaration') {
          for (const d of decl.declarations) {
            if ('name' in d.id) {
              exports.push(String(d.id.name));
              symbols.push({
                name: String(d.id.name),
                kind: 'variable',
                file: filename,
                line: decl.loc?.start.line,
              });
            }
          }
        }
      }

      // Top-level function declarations
      if (node.type === 'FunctionDeclaration' && node.id) {
        if (!symbols.some((s) => s.name === node.id?.name)) {
          symbols.push({
            name: node.id.name,
            kind: 'function',
            file: filename,
            line: node.loc?.start.line,
            params: node.params.map((p) => ('name' in p ? String(p.name) : 'param')),
          });
        }
      }

      // Top-level class declarations
      if (node.type === 'ClassDeclaration' && node.id) {
        if (!symbols.some((s) => s.name === node.id?.name)) {
          symbols.push({
            name: node.id.name,
            kind: 'class',
            file: filename,
            line: node.loc?.start.line,
          });
        }
      }
    }

    return {
      symbols,
      imports,
      exports,
      summary: `Parsed ${symbols.length} code symbols (${exports.length} exported) across ${imports.length} dependencies.`,
      language: isTs ? 'TypeScript' : 'JavaScript',
    };
  } catch {
    // Fallback: regex token scanning for non-JS/TS or malformed code
    const fnRegex = /(?:def|fn|func|function)\s+([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = fnRegex.exec(sourceCode)) !== null) {
      symbols.push({
        name: match[1],
        kind: 'function',
        file: filename,
      });
    }

    return {
      symbols,
      imports: [],
      exports: [],
      summary: `Regex fallback parsed ${symbols.length} function declarations.`,
      language: 'Unknown/Generic',
    };
  }
}

/**
 * Combines Deterministic AST Code Structure + AI Conversation Decisions
 * to create a complete Developer Project Handoff package
 */
export async function createDeveloperHandoff(params: {
  userId: string;
  projectTitle: string;
  codeSnippets: Array<{ filename: string; code: string }>;
  decisions: ExtractedDecision[];
  failedApproaches: FailedApproach[];
  unresolvedIssues: UnresolvedIssue[];
}): Promise<DeveloperHandoff> {
  const {
    userId,
    projectTitle,
    codeSnippets,
    decisions,
    failedApproaches,
    unresolvedIssues,
  } = params;

  // 1. Run deterministic AST parsing on all supplied code
  const allSymbols: CodeSymbol[] = [];
  const allDependencies = new Set<string>();
  const importantFiles: string[] = [];

  for (const item of codeSnippets) {
    importantFiles.push(item.filename);
    const parsed = parseSourceCode(item.code, item.filename);
    allSymbols.push(...parsed.symbols);
    parsed.imports.forEach((dep) => allDependencies.add(dep));
  }

  // 2. Format AST structure for prompt
  const astStructureBlock = `
CODEBASE STRUCTURE (DETERMINISTIC AST EXTRACTION):
Files Analyzed: ${importantFiles.join(', ') || 'None provided'}
Dependencies: ${Array.from(allDependencies).join(', ') || 'Standard library'}
Symbols Discovered:
${allSymbols.map((s) => `- [${s.kind}] ${s.name} (${s.file}${s.line ? `:${s.line}` : ''})`).join('\n') || 'None'}
`;

  const decisionsBlock = `
KEY ARCHITECTURAL DECISIONS:
${decisions.map((d) => `- [${d.topic}] ${d.decision} (Reason: ${d.why}, Status: ${d.status})`).join('\n') || 'No decisions recorded'}

FAILED ATTEMPTS (DO NOT REPEAT):
${failedApproaches.map((f) => `- ${f.approach}: failed because ${f.whyFailed} (Lesson: ${f.lesson})`).join('\n') || 'None recorded'}

KNOWN BLOCKERS / OPEN ISSUES:
${unresolvedIssues.map((u) => `- [${u.urgency}] ${u.issue}: ${u.context}`).join('\n') || 'None'}
`;

  const prompt = `You are the Lead Principal Architect generating a comprehensive Developer Handoff Package for "${projectTitle}".
Combine the following deterministic code AST structure with historical architectural decisions to provide a complete, high-fidelity handoff guide for another engineer or AI:

${astStructureBlock}

${decisionsBlock}

Please construct a comprehensive developer handoff in Markdown:
1. Executive Technical Summary & Objective
2. Repository / Component Architecture (explaining the AST symbols and their roles)
3. Hard Constraints & Security Invariants
4. Critical Historical Decisions (and why alternatives were rejected)
5. Failed Approaches & Traps (crucial: tell the engineer what NOT to do)
6. Known Issues / Blockers
7. Immediate Actionable Next Steps to Continue Implementation`;

  let handoffMarkdown = '';
  try {
    const aiResult = await generateContentWithGemini(prompt, {
      model: DEFAULT_MODEL,
      temperature: 0.2,
      maxOutputTokens: 3072,
    });
    handoffMarkdown = aiResult.text.trim();
  } catch (err) {
    console.warn('Developer handoff synthesis fallback:', err);
    handoffMarkdown = `# ${projectTitle} - Developer Handoff

## Code Architecture & AST Symbols
- **Files:** ${importantFiles.join(', ')}
- **Symbols:** ${allSymbols.map((s) => s.name).join(', ')}

## Decisions & Constraints
${decisionsBlock}
`;
  }

  const tokenCount = estimateTokenCount(handoffMarkdown);

  return {
    id: `dev_${crypto.randomUUID()}`,
    userId,
    projectTitle,
    symbols: allSymbols,
    dependencies: Array.from(allDependencies),
    architectureOverview: `Analyzed ${importantFiles.length} file(s) and ${allSymbols.length} AST symbol(s)`,
    importantFiles,
    handoffMarkdown,
    tokenCount,
    createdAt: new Date().toISOString(),
  };
}
