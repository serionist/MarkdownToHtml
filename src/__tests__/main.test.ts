import { Converter } from './../converter';
const fs = require('fs');
const path = require('path');

test('Simple', () => {
    console.log(new Converter().convertToHtml(fs.readFileSync(path.join(__dirname, 'sample-markdown.md')).toString()));

  expect(true).toBe(true);
});
