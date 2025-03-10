import { htmlToMarkdown } from './data_processing.js';

describe('htmlToMarkdown', () => {
  test('converts basic HTML to markdown', () => {
    const html = '<p>Hello world</p>';
    expect(htmlToMarkdown(html)).toBe('Hello world');
  });

  test('converts headings', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2>';
    expect(htmlToMarkdown(html)).toBe('Title\n=====\n\nSubtitle\n--------');
  });

  test('converts emphasis using underscores', () => {
    const html = '<em>emphasized text</em>';
    expect(htmlToMarkdown(html)).toBe('_emphasized text_');
  });

  test('converts strong', () => {
    const html = '<strong>bold text</strong>';
    expect(htmlToMarkdown(html)).toBe('**bold text**');
  });

  test('converts code blocks with fencing', () => {
    const html = '<pre><code>const x = 1;</code></pre>';
    expect(htmlToMarkdown(html)).toBe('```\nconst x = 1;\n```');
  });

  test('converts links', () => {
    const html = '<a href="https://example.com">Example</a>';
    expect(htmlToMarkdown(html)).toBe('[Example](https://example.com)');
  });

  test('converts lists', () => {
    const html = '<ul><li>Item 1</li><li>Item 2</li></ul>';
    expect(htmlToMarkdown(html)).toBe('*   Item 1\n*   Item 2');
  });

  test('converts nested HTML structures', () => {
    const html = '<div><h1>Title</h1><p>Paragraph with <strong>bold</strong> and <em>emphasis</em>.</p></div>';
    expect(htmlToMarkdown(html)).toBe('Title\n=====\n\nParagraph with **bold** and _emphasis_.');
  });

  test('handles empty input', () => {
    expect(htmlToMarkdown('')).toBe('');
  });

  test('handles input with no HTML tags', () => {
    const text = 'Plain text without any HTML';
    expect(htmlToMarkdown(text)).toBe('Plain text without any HTML');
  });

  test('handles complex HTML page with script tags', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Test Page</title>
          <script>
            console.log("This script should be removed");
            function test() {
              return "Hello World";
            }
          </script>
          <style>
            body { font-family: Arial, sans-serif; }
          </style>
        </head>
        <body>
          <header>
            <h1>Page Header</h1>
            <nav>
              <ul>
                <li><a href="#section1">Section 1</a></li>
                <li><a href="#section2">Section 2</a></li>
              </ul>
            </nav>
          </header>
          <main>
            <section id="section1">
              <h2>Section 1 Title</h2>
              <p>This is <em>emphasized</em> and <strong>strong</strong> text.</p>
              <script>document.write("This should not appear in markdown");</script>
              <pre><code>const codeExample = "This should be formatted as code";</code></pre>
            </section>
            <section id="section2">
              <h2>Section 2 Title</h2>
              <p>Another paragraph with a <a href="https://example.com">link</a>.</p>
              <table>
                <tr>
                  <th>Header 1</th>
                  <th>Header 2</th>
                </tr>
                <tr>
                  <td>Cell 1</td>
                  <td>Cell 2</td>
                </tr>
              </table>
            </section>
          </main>
          <footer>
            <p>Page Footer</p>
            <script>
              // This script should also be removed
              const footer = document.querySelector('footer');
            </script>
          </footer>
        </body>
      </html>
    `;
    
    const expectedMarkdown = `Test Page body { font-family: Arial, sans-serif; }

Page Header
===========

*   [Section 1](#section1)
*   [Section 2](#section2)

Section 1 Title
---------------

This is _emphasized_ and **strong** text.

\`\`\`
const codeExample = "This should be formatted as code";
\`\`\`

Section 2 Title
---------------

Another paragraph with a [link](https://example.com).

Header 1

Header 2

Cell 1

Cell 2

Page Footer`.trim();

    const output = htmlToMarkdown(html).trim();
    expect(output).toBe(expectedMarkdown);
    
  });
}); 