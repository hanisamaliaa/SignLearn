const fs = require("fs");
const path = require("path");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const srcDir = path.join(root, "src");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (entry.isFile() && /\.jsx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

function stripTypeBlocks(code) {
  let result = code;

  result = result.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]react['"]/g,
    (match, inner) => {
      const imports = inner
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^const\s+/, "").trim())
        .filter(Boolean);
      return imports.length
        ? `import { ${imports.join(", ")} } from 'react'`
        : "";
    },
  );

  result = result.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/\.\.\/context\/app['"]/g,
    (match, inner) => {
      const imports = inner
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^const\s+/, "").trim())
        .filter(Boolean);
      return imports.length
        ? `import { ${imports.join(", ")} } from '../../context/app'`
        : "";
    },
  );

  result = result.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/\.\.\/config\/navigation['"]/g,
    (match, inner) => {
      const imports = inner
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^const\s+/, "").trim())
        .filter(Boolean);
      return imports.length
        ? `import { ${imports.join(", ")} } from '../../config/navigation'`
        : "";
    },
  );

  result = result.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/context\/app['"]/g,
    (match, inner) => {
      const imports = inner
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^const\s+/, "").trim())
        .filter(Boolean);
      return imports.length
        ? `import { ${imports.join(", ")} } from '../context/app'`
        : "";
    },
  );

  result = result.replace(
    /import\s*\{([^}]*)\}\s*from\s*['"]\.\/context\/app['"]/g,
    (match, inner) => {
      const imports = inner
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => item.replace(/^const\s+/, "").trim())
        .filter(Boolean);
      return imports.length
        ? `import { ${imports.join(", ")} } from './context/app'`
        : "";
    },
  );

  result = result.replace(
    /^export\s+(Page|Role|LearningProfile|AppUser|NavItem)\s*=.*$/gm,
    "",
  );
  result = result.replace(
    /^function\s+(RegisterData|AppState)\s*\{[\s\S]*?^\}/gm,
    "",
  );

  const propBlockRegex =
    /\nfunction\s+\w+Props(?:\s+extends\s+[^{]+)?\s*\{[\s\S]*?^\}/gm;
  result = result.replace(propBlockRegex, "");

  return result;
}

for (const file of walk(srcDir)) {
  const text = fs.readFileSync(file, "utf8");
  const preprocessed = stripTypeBlocks(text);
  const output = ts.transpileModule(preprocessed, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      allowJs: true,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: path.basename(file).replace(/\.jsx?$/, ".tsx"),
  }).outputText;
  fs.writeFileSync(file, output);
}

console.log("Processed JS/JSX files");
