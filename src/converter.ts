import { ConverterOptions } from "./converter.options";

export class Converter {
  
    private readonly defaultConverterOptions: ConverterOptions = {};

    convertToHtml(markdown: string, options?: ConverterOptions) {
        const o = options ?? this.defaultConverterOptions;
        return new ConvertInstance(markdown, o).convert();
    }
   
}

class ConvertInstance {
    output: string = '';
    isInParagraph = false;
    blockQuoteDepth = 0;
    currentListItems: ['ol'|'ul'] = [];
    constructor(private markdown: string, private options: ConverterOptions) {

    }

    convert(): string {
        const lines = this.markdown.split('\r').join('').split('\n');
        for (let i = 0; i < lines.length; i++) {
            let currentLine = lines[i];
            let trimmedLine = currentLine.trim();
            const nextLine = lines.length <= i + 1 ? '' : lines[i + 1] || '';
            // if line is empty, skip
            if (!trimmedLine) {
                this.closeBlockQuoteIfAny(true);
                this.closeListIfAny(true);
                this.closeParagraphIfAny();
               
                // if (!nextLine.trim()) {
                //     this.output += '<p></p>';
                // }
                continue;
            }
            // if html, add as raw
            const html = /^<[^>]+>$/.exec(trimmedLine);
            if (html) {
                this.output += `${trimmedLine}\n`;
            }

            // do headings
            const heading = /^(#{1,6}) *([^#\n]+)/.exec(trimmedLine);
            if (heading && heading[1] && heading[2]) {
                this.closeParagraphIfAny();
                const tagName = `h${heading[1].length}`;
                this.output += `<${tagName}>${this.processTextToken(heading[2])}</${tagName}>\n`;
                continue;
            }
            // do horizontal lines
            if (/^(---)|(___)|(\*\*\*)$/.exec(trimmedLine)) {
                this.closeParagraphIfAny();
                this.output += `<hr>\n`;
                continue;
            }


            // do block quotes
            const blockQuoteRegex = /^((> ?)+) +([^\n]+)/.exec(trimmedLine);
            if (blockQuoteRegex) {
                this.closeParagraphIfAny();
                const requiredDepth = blockQuoteRegex[1].split(' ').join('').length;
                if (requiredDepth <= this.blockQuoteDepth) {
                    this.closeBlockQuoteIfAny(false);
                }
                this.output += `\n<blockquote>\n`;
                this.blockQuoteDepth++;
                currentLine = blockQuoteRegex[3];
                trimmedLine = blockQuoteRegex[3].trim();
            }

            // lists
            const ul = /^(\+|-|\*) ([^\n]+)/gm.exec(trimmedLine);
            const ol  = /^\d+\. +([^\n]+)/gm.exec(trimmedLine);
            if (ol || ul) {
                this.closeParagraphIfAny();
                let requiredDepth = Math.floor((/^( *)/.exec(currentLine)![1] || '').length / 2);
                const tabRegex = /^(\t+)/.exec(currentLine);
                if (tabRegex && tabRegex[1]) {
                    requiredDepth = tabRegex[1].length;
                }
                if (requiredDepth <= this.currentListItems.length) {
                    // TODO: we can not just close one list item, we might need to close X number
                    this.closeListIfAny(false);
                }
                const type = !!ol ? 'ol': 'ul';
                this.output += `\n<${type}>\n`;
                this.currentListItems

            }
            
            if (this.isInParagraph) {
               this.output += `\n\t<br>\n\t${this.processTextToken(currentLine)}`;
                continue;
            } else {
                this.output += `<p>\n\t${this.processTextToken(currentLine)}`;
                if (i === lines.length - 1) {
                    this.output += '</p>';
                } else {
                    this.isInParagraph = true;
                }
                continue;
            }


            // output += currentLine + '\n';
        }

        return this.output;
    }
    private closeListIfAny(closeall: boolean) {
        if (this.currentListItems.length > 0) {
            for (let i = 0; i < (closeall ? this.currentListItems.length: 1); i++) {
                this.closeParagraphIfAny();
                const i2 = this.currentListItems.length - 1 - i;
                this.output += `</${this.currentListItems[i2]}>\n`;
                this.currentListItems.splice(i2, 1);
            }
        }
    }
    private closeBlockQuoteIfAny(closeall: boolean) {
        if (this.blockQuoteDepth > 0) {
            for (let i = 0; i < (closeall ? this.blockQuoteDepth: 1); i++) {
                this.closeParagraphIfAny();
                this.output += '</blockquote>\n';
                this.blockQuoteDepth--;
            }
        }
    }
    private closeParagraphIfAny() {
        if (this.isInParagraph) {
            this.output += '\n</p>\n';
            this.isInParagraph = false;
        }
    }
    private processTextToken(token: string) {
        // bold tokens
        token = token.replace(/\*\*([^\*\*]+)\*\*/gm, '<strong>$1</strong>');
        token = token.replace(/__([^__]+)__/gm, '<strong>$1</strong>');
        // italic tokens
        token = token.replace(/\*([^\*]+)\*/gm, '<em>$1</em>');
        token = token.replace(/_([^_]+)_/gm, '<em>$1</em>');
        // strikethrough
        token = token.replace(/~~([^~~]+)~~/gm, '<s>$1</s>');
        // code
        token = token.replace(/`([^`]+)`/gm, '<code>$1</code>');
        // image 
        token = token.replace(/!\[([^\]]+)\]\(([^ )]+)( "(.+)")?\)/gm, `<img src="$2" alt="$1" title="$4">`);
        // links
        token = token.replace(/\[([^\]]+)\]\(([^)]+)\)/gm, `<a href="$2">$1</a>`);
        // typographic replacements
        token = token.replace(/\((c|C)\)/gm, '©');
        token = token.replace(/\((r|R)\)/gm, '®');
        token = token.replace(/\((tm|TM)\)/gm, '™');
        token = token.replace(/\+-/gm, '±');
        token = token.replace(/\.{2,}/gm, '...');
        token = token.replace(/!{3,}/gm, '!!!');
        token = token.replace(/\?{3,}/gm, '???');
        token = token.replace(/,{2,}/gm, ',');
        token = token.replace(/---/gm, '—');
        token = token.replace(/--/gm, '–');
        return token;
    }
}
