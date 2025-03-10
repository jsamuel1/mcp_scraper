#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';
import { htmlToMarkdown } from './data_processing.js';

/**
 * Scrapes a website and converts the HTML content to markdown
 * @param url The URL to scrape
 * @returns The markdown content as a string
 */
export async function scrapeToMarkdown(url: string): Promise<string> {
  try {
    // Fetch the HTML content from the provided URL with proper headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }
    
    // Get content type to check encoding
    const contentType = response.headers.get('content-type') || '';
    const htmlContent = await response.text();

    // Parse the HTML using JSDOM with the URL to resolve relative links
    const dom = new JSDOM(htmlContent, { 
      url,
      pretendToBeVisual: true, // This helps with some interactive content
    });
    
    // Extract the main content using Readability
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    
    if (!article || !article.content) {
      throw new Error("Failed to parse article content");
    }
    
    // Convert the cleaned article HTML to Markdown using htmlToMarkdown
    let markdown = htmlToMarkdown(article.content);
    
    // Simple post-processing to improve code blocks with language hints
    markdown = markdown.replace(/```\n(class|function|import|const|let|var|if|for|while)/g, '```javascript\n$1');
    markdown = markdown.replace(/```\n(def|class|import|from|with|if|for|while)(\s+)/g, '```python\n$1$2');
    
    return markdown;
  } catch (error: any) {
    throw new Error(`Scraping error: ${error.message}`);
  }
}




// Create an MCP server instance
const server = new McpServer({
  name: "ScrapeServer",
  version: "1.0.0"
});

// Register the "scrape-to-markdown" tool
server.tool(
  "scrape-to-markdown",
  { url: z.string().url() },
  async ({ url }) => {
    try {
      const markdown = await scrapeToMarkdown(url);
      
      // Return the markdown as the tool result
      return {
        content: [{ type: "text", text: markdown }]
      };
    } catch (error: any) {
      // Handle errors gracefully
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
);

// Start the MCP server using stdio transport
// const transport = new StdioServerTransport();
// await server.connect(transport);

async function main() {
  // Create a stdio transport for communication
  // This allows the server to communicate with clients via standard input/output
  const transport = new StdioServerTransport();

  // Connect the server to the transport
  // This starts listening for incoming messages and enables communication
  await server.connect(transport);

  // Log a message to indicate the server is running
  // Note: Using console.error instead of console.log because stdout is used for MCP communication
  console.error("Weather MCP Server running on stdio");
}

// Call the main function and handle any fatal errors
main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1); // Exit with error code 1 if there's a fatal error
});
