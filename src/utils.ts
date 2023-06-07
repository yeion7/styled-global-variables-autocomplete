import * as vscode from 'vscode';
import * as isColor from 'is-color';

// eslint-disable-next-line @typescript-eslint/naming-convention
const DatauriParser = require('datauri/parser');

type ItemBase = {
  name: string;
  value: string;
  range: vscode.Range | undefined;
  isCssPropLine: boolean;
  currentLine: vscode.TextLine;
};

export const logger = vscode.window.createOutputChannel(
  'Styled Global Variables Autocomplete'
);

export const getValueKind = (str: string): vscode.CompletionItemKind => {
  if (isColor(str)) {
    return vscode.CompletionItemKind.Color;
  }

  return vscode.CompletionItemKind.Variable;
};

export const getCompletionItem = ({
  name,
  value,
  range,
  isCssPropLine,
  currentLine,
}: ItemBase) => {
  const variable = name;
  const completion = new vscode.CompletionItem(variable);
  const isVarPresent = currentLine.text.includes('var(');

  completion.label = name;
  completion.filterText = variable;
  completion.documentation = value;
  completion.detail = value;
  completion.kind = getValueKind(value);
  completion.range = range || completion.range;
  
  if (range && isVarPresent) {
    const lineStart = currentLine.text.substring(0, range.start.character);
    const replaceStartIndex = lineStart.indexOf('var(');
    const startTranslate = range.start.character - (replaceStartIndex + 4);
    const lineEnd = currentLine.text.substring(range.end.character);
    completion.insertText = `${variable}`;
    if (!lineEnd.includes(')')) {
      completion.insertText += ')';
    }
    completion.range = isVarPresent
      ? range.with(
          range.start.translate(0, startTranslate),
          range.end.translate(0, -startTranslate)
        )
      : range;
  } else if (isVarPresent) {
    completion.insertText = `${variable}`;
  } else if (isCssPropLine) {
    completion.insertText = `'var(${variable})'`;
  } else {
    completion.insertText = `var(${variable})`;
  }
  return completion;
};

export function getVariableAtPosition(
  document: vscode.TextDocument,
  position: vscode.Position
) {
  const currentRange = document.getWordRangeAtPosition(position, /\S+/);

  if (!currentRange) {
    return;
  }

  const textAtPosition = document.getText(currentRange);

  if (!textAtPosition.includes('var(--')) {
    return;
  }

  const varRegExp = /\(([^)]+)\)/;
  const matches = varRegExp.exec(textAtPosition);
  const variable = matches?.[1];

  if (!variable) {
    return;
  }

  return variable;
}

/**
 * Return inline svg for hover preview if is a valid color
 * @param value;
 */
export function getHoverPreview(value: string) {
  if (!isColor(value)) {
    return value;
  }

  const datauri = new DatauriParser();
  const src = `<?xml version="1.0" encoding="utf-8"?>
  <!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
  <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px"
      width="200" height="100">
    <rect x="0" y="0" rx="5" ry="5" width="200" height="100" fill="${value}"/>
    <text x="50%" y="50%" alignment-baseline="middle" text-anchor="middle">${value}</text>
  </svg>
  `;

  datauri.format('.svg', src);
  return `![](${datauri.content})`;
}
