import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUTPUT_FILE = path.join(__dirname, 'combined_source_code.txt');

// Directories and configuration files to include in concatenation
const INCLUDE_PATHS = [
  'index.html',
  'vite.config.ts',
  'package.json',
  'public/manifest.json',
  'public/sw.js',
  'src',
];

/**
 * Recursively scans directory and collects all file paths
 */
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

function runConcatenation() {
  let fileList = [];

  INCLUDE_PATHS.forEach((relPath) => {
    const fullPath = path.join(__dirname, relPath);
    if (!fs.existsSync(fullPath)) return;

    if (fs.statSync(fullPath).isDirectory()) {
      fileList = getAllFiles(fullPath, fileList);
    } else {
      fileList.push(fullPath);
    }
  });

  // Filter out node_modules, build outputs, git files, and output file itself
  fileList = fileList.filter((f) => {
    const rel = path.relative(__dirname, f);
    return (
      !rel.startsWith('node_modules') &&
      !rel.startsWith('dist') &&
      !rel.startsWith('.git') &&
      !rel.endsWith('combined_source_code.txt') &&
      !rel.endsWith('concat-source.js')
    );
  });

  // Sort files deterministically
  fileList.sort();

  let outputContent = `================================================================================\n`;
  outputContent += ` RUMMIKUB PRO - COMBINED SOURCE CODE BUNDLE\n`;
  outputContent += ` Generated on: ${new Date().toISOString()}\n`;
  outputContent += ` Total Source Files: ${fileList.length}\n`;
  outputContent += `================================================================================\n\n`;

  fileList.forEach((filePath) => {
    const relativePath = path.relative(__dirname, filePath);
    const content = fs.readFileSync(filePath, 'utf-8');

    outputContent += `\n`;
    outputContent += `/* =============================================================================\n`;
    outputContent += ` * FILE: ${relativePath}\n`;
    outputContent += ` * ============================================================================= */\n\n`;
    outputContent += content;
    outputContent += `\n\n`;
  });

  fs.writeFileSync(OUTPUT_FILE, outputContent, 'utf-8');
  console.log(`Successfully concatenated ${fileList.length} source files into:`);
  console.log(` -> ${OUTPUT_FILE}`);
}

runConcatenation();
