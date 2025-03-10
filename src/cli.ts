#!/usr/bin/env node

import { scrapeToMarkdown } from './index.js';
import { htmlToMarkdown } from './data_processing.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * CLI handler for website scraping and HTML conversion
 */
async function runCli() {
  const args = process.argv.slice(2);
  
  // Basic help
  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    console.log(`
Usage: scrape <url> [output_file]
   or: scrape --html-file <html_file> [output_file]
  
Options:
  --help, -h     Show this help message
  --html-file    Convert a local HTML file to Markdown instead of scraping a URL

Arguments:
  url/html_file  URL to scrape or path to HTML file (required)
  output_file    Output file path (optional, if not provided output is printed to stdout)
    `);
    process.exit(0);
  }

  // Check if we're converting a local HTML file
  const htmlFileMode = args.includes('--html-file');
  let targetInput: string;
  let outputFile: string | undefined;
  
  if (htmlFileMode) {
    const fileArgIndex = args.indexOf('--html-file') + 1;
    if (fileArgIndex >= args.length) {
      console.error('Error: No HTML file specified after --html-file');
      process.exit(1);
    }
    targetInput = args[fileArgIndex];
    outputFile = args[fileArgIndex + 1];
  } else {
    targetInput = args[0];
    outputFile = args[1];
  }
  
  try {
    let markdown: string;
    
    if (htmlFileMode) {
      // Direct HTML file to Markdown conversion
      try {
        const htmlContent = await fs.readFile(targetInput, 'utf-8');
        markdown = htmlToMarkdown(htmlContent);
      } catch (err: any) {
        throw new Error(`Error reading HTML file: ${err.message}`);
      }
    } else {
      // Web scraping mode
      markdown = await scrapeToMarkdown(targetInput);
    }
    
    if (outputFile) {
      await fs.writeFile(outputFile, markdown);
      console.error(`Markdown saved to: ${outputFile}`);
    } else {
      console.log(markdown);
    }
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}

// Run the CLI
runCli().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
}); 