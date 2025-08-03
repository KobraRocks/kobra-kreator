function escapeHTML(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function processInlineElements(text) {
    // Code spans
    text = text.replace(/`([^\`]+)`/g, '<code>$1</code>');
    
    // Bold
    text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/__([^_]+)__/g, '<strong>$1</strong>');
    
    // Italic
    text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    text = text.replace(/_([^_]+)_/g, '<em>$1</em>');
    
    // Images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)"]+)(?:\s+"([^"]+)")?\)/g, (_, text, url, title) => {
        return title
            ? `<a href="${url}" target="_blank" title="${title}">${text}</a>`
            : `<a href="${url}" target="_blank">${text}</a>`;
    });
    
    // Footnotes
    text = text.replace(/\[\^([^\]]+)\](?!:)/g, '<sup><a href="#$1">$1</a></sup>');
    
    return text;
}

// Simple Markdown parser and HTML generator
export function markdownToHTML(markdown ="") {
    let html = '';
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let inTable = false;
    const tableHeaders = [];
    const tableAligns = [];
    let inList = false;
    let listType = '';
    let listIndent = 0;
    let inBlockquote = false;
    let blockquoteContent = '';
    
    function closeList() {
        if (inList) {
            html += `</${listType}>\n`;
            inList = false;
            listType = '';
            listIndent = 0;
        }
    }
    
    function closeBlockquote() {
        if (inBlockquote) {
            html += `<blockquote>${processInlineElements(blockquoteContent.trim())}</blockquote>\n`;
            inBlockquote = false;
            blockquoteContent = '';
        }
    }
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd();
        
        // Skip empty lines unless in a special block
        if (!line.trim() && !inCodeBlock && !inTable && !inBlockquote) {
            closeList();
            continue;
        }
        
        // Code blocks
        if (line.startsWith('```')) {
            if (!inCodeBlock) {
                codeLanguage = line.slice(3).trim();
                inCodeBlock = true;
                html += `<pre><code${codeLanguage ? ` class="language-${codeLanguage}"` : ''}>`;
            } else {
                html += '</code></pre>\n';
                inCodeBlock = false;
                codeLanguage = '';
            }
            continue;
        }
        
        if (inCodeBlock) {
            html += escapeHTML(line) + '\n';
            continue;
        }
        
        // Tables
        if (line.trim().startsWith('|') || inTable) {
            const cells = line.split('|')
                .map(cell => cell.trim())
                .filter(cell => cell);
            
            if (!inTable) {
                inTable = true;
                cells.forEach(header => tableHeaders.push(header));
                html += '<table>\n<thead>\n<tr>\n';
                cells.forEach(header => {
                    html += `<th>${processInlineElements(header)}</th>\n`;
                });
                html += '</tr>\n</thead>\n<tbody>\n';
                continue;
            }
            
            // Alignment row
            if (cells.every(cell => /^:?-+:?$/.test(cell))) {
                cells.forEach(cell => {
                    if (cell.startsWith(':') && cell.endsWith(':')) tableAligns.push('center');
                    else if (cell.endsWith(':')) tableAligns.push('right');
                    else tableAligns.push('left');
                });
                continue;
            }
            
            // Data row
            html += '<tr>\n';
            cells.forEach((cell, index) => {
                const align = tableAligns[index] || 'left';
                html += `<td align="${align}">${processInlineElements(cell)}</td>\n`;
            });
            html += '</tr>\n';
            
            // Check if table ends
            if (!lines[i + 1]?.trim().startsWith('|')) {
                html += '</tbody>\n</table>\n';
                inTable = false;
                tableHeaders.length = 0;
                tableAligns.length = 0;
            }
            continue;
        }
        
        // Headers
        const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
        if (headerMatch) {
            closeList();
            closeBlockquote();
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            html += `<h${level}>${processInlineElements(content)}</h${level}>\n`;
            continue;
        }
        
        // Blockquotes
        if (line.startsWith('>')) {
            if (!inBlockquote) {
                closeList();
                inBlockquote = true;
            }
            blockquoteContent += line.slice(1) + '\n';
            continue;
        } else if (inBlockquote) {
            closeBlockquote();
        }
        
        // Lists
        const ulMatch = line.match(/^(\s*)[*+-]\s+(.+)$/);
        const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
        const taskMatch = line.match(/^(\s*)-\s+\[([ x])\]\s+(.+)$/);
        
        if (ulMatch || olMatch || taskMatch) {
            const match = taskMatch || ulMatch || olMatch;
            if (!match) continue;
            
            const indent = match[1].length;
            const content = taskMatch 
                ? taskMatch[3]
                : match[2];
            const newListType = olMatch ? 'ol' : 'ul';
            
            if (!inList || indent !== listIndent || (listType !== newListType && !taskMatch)) {
                closeList();
                inList = true;
                listType = newListType;
                listIndent = indent;
                html += `<${listType}>\n`;
            }
            
            if (taskMatch) {
                const checked = taskMatch[2] === 'x';
                html += `<li><input type="checkbox" ${checked ? 'checked' : ''} disabled>${processInlineElements(content)}</li>\n`;
            } else {
                html += `<li>${processInlineElements(content)}</li>\n`;
            }
            continue;
        }
        
        // Horizontal rule
        if (line.match(/^([*-_])\1{2,}$/)) {
            closeList();
            closeBlockquote();
            html += '<hr>\n';
            continue;
        }
        
        // Footnotes
        const footnoteMatch = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/);
        if (footnoteMatch) {
            closeList();
            closeBlockquote();
            const [, id, content] = footnoteMatch;
            html += `<div class="footnote" id="${id}">${processInlineElements(content)}</div>\n`;
            continue;
        }
        
        // Regular paragraph
        if (line.trim()) {
            closeList();
            closeBlockquote();
            html += `<p>${processInlineElements(line)}</p>\n`;
        }
    }
    
    // Close any remaining blocks
    closeList();
    closeBlockquote();
    
    if (inCodeBlock) {
        html += '</code></pre>\n';
    }
    
    if (inTable) {
        html += '</tbody>\n</table>\n';
    }
    
    return html;
}


