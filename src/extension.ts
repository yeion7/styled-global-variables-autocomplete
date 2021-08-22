// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as isColor from 'is-color';

const vars = new Map();

type Value = { name: string, value: string };

export enum ValueKind {
  color,
  other,
}


export const getValueKind = (str: string): ValueKind => {
  if (isColor(str)) {
    return ValueKind.color;
  }

  return ValueKind.other;
};

export const createCompletionItem = (
  propertyName: string,
  propertyValue: string,
  previousStr: string
) => {
  const variable = propertyName;
  const variableWithoutDash = variable.substring(2);
  const completion = new vscode.CompletionItem(variable);

  completion.label = propertyName;
  completion.filterText = variableWithoutDash;
  completion.kind = vscode.CompletionItemKind.Variable;
  completion.documentation = propertyValue;

  completion.detail = propertyValue;

  if (previousStr === '--') {
    completion.insertText = variableWithoutDash;
  } else if (previousStr === 'r(') {
    completion.insertText = variable;
  } else {
    completion.insertText = `var(${variable})`;
  }

  if (getValueKind(propertyValue) === ValueKind.color) {
    completion.kind = vscode.CompletionItemKind.Color;
  }

  return completion;
};

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "styled-global-variable-autocomplete" is now active!');
  const filesUri = await vscode.workspace.findFiles('**/*.globals.{ts,js}', undefined);


  const filesPromises = filesUri.map(file => vscode.workspace.openTextDocument(file).then(document => document.getText()));

  const files = await Promise.all(filesPromises);

  const finalItems = files.flatMap(file => {
    return file.split(/\r?\n/)
      .filter(line => line.trim().startsWith('--'))
      .map(line => {
        const lineTrim = line.trim();
        const [name, value] = lineTrim.split(":");

        if (!value || vars.has(name)) { return; };

        vars.set(name, value);
        return { name, value };
      })
      .filter(Boolean) as Value[];
  });

  const provider = vscode.languages.registerCompletionItemProvider(['javascript', 'typescript'], {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
      const lastCharPos = new vscode.Position(
        position.line,
        0
      );

      const previousStr = document.getText(
        new vscode.Range(lastCharPos, position)
      );

      const variables = finalItems.map(({ name, value }) => createCompletionItem(name, value, previousStr));

      return variables;
    }
  });

  context.subscriptions.push(provider);

  return true;
}

// this method is called when your extension is deactivated
export function deactivate() { }
