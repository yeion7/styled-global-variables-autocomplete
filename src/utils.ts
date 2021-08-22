import * as vscode from 'vscode';
import * as isColor from 'is-color';

type ItemBase = {
    name: string,
    value: string,
    range: vscode.Range | undefined
    isCssPropLine: boolean
};

export const getValueKind = (str: string): vscode.CompletionItemKind => {
    if (isColor(str)) {
        return vscode.CompletionItemKind.Color;
    }

    return vscode.CompletionItemKind.Variable;
};

export const createCompletionItem = ({
    name,
    value,
    range,
    isCssPropLine
}: ItemBase) => {
    const variable = name;
    const variableWithoutDash = variable.substring(2);
    const completion = new vscode.CompletionItem(variable);

    completion.label = name;
    completion.filterText = variableWithoutDash;
    completion.documentation = value;
    completion.insertText = isCssPropLine ? `'var(${variable})'` : `var(${variable})`;
    completion.detail = value;
    completion.kind = getValueKind(value);

    if (range) {
        completion.range = range;
    }

    return completion;
};