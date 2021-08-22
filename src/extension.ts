// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as isColor from 'is-color';
import { getValueKind, createCompletionItem } from './utils';

type Var = { name: string, value: string, uri: vscode.Uri, range: vscode.Range };
type Config = {
  include: vscode.GlobPattern
  exclude: vscode.GlobPattern | undefined
  autoCompleteOn: vscode.DocumentSelector
};

export async function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "styled-global-variable-autocomplete" is now active!');
  const config = vscode.workspace.getConfiguration('variablesAutocomplete');
  const includeFilesGlob = config.get<Config['include']>('include', '**/*.globals.{ts,js}');
  const excludeFilesGlob = config.get<Config['exclude']>('exclude');
  const autoCompleteOn = config.get<Config['autoCompleteOn']>('autoCompleteOn', ['javascript', 'typescript']);

  // Find all files that match configured criteria
  const filesUri = await vscode.workspace.findFiles(includeFilesGlob, excludeFilesGlob);

  // Read all found files
  const filesPromises = filesUri.map(file => vscode.workspace.openTextDocument(file));
  const documents = await Promise.all(filesPromises);

  // Get all variables from lines
  const finalItems = documents.flatMap(document => {
    const file = document.getText();
    const vars = new Map();

    return file.split(/\r?\n/)
      .map((line, i) => {
        const lineTrim = line.trim();
        const isVariable = line.trim().startsWith('--');
        if (!isVariable) { return; };

        const [name, value] = lineTrim.split(":");
        // Prevent duplicate or empty variables
        if (!value || vars.has(name)) { return; };

        vars.set(name, value);
        return {
          name,
          value,
          uri: document.uri,
          range: new vscode.Range(new vscode.Position(i, 4), new vscode.Position(i, name.length + 4))
        } as Var;
      })
      .filter(Boolean) as Var[];
  });

  // Support autocomplete
  const completionProvider = vscode.languages.registerCompletionItemProvider(autoCompleteOn, {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position) {
      const range = document.getWordRangeAtPosition(position, /\S+/);
      const currentLine = document.lineAt(position.line);
      const isCssPropLine = currentLine.text.includes('css={{');

      const variables = finalItems.map(({ name, value }) => createCompletionItem({
        name,
        value,
        range,
        isCssPropLine
      }));

      return variables;
    }
  });

  // Support go to definition
  const definitionProvider = vscode.languages.registerDefinitionProvider(autoCompleteOn, {
    async provideDefinition(document: vscode.TextDocument, position: vscode.Position) {
      const range = document.getWordRangeAtPosition(position, /\S+/);

      if (!range) { return []; };

      const variable = document.getText(range);

      if (!variable.includes("var(--")) { return []; };

      return finalItems
        .filter(({ name }) => variable.includes(name))
        .map(({ name, uri, range }) => new vscode.Location(uri, range));
    }
  });

  context.subscriptions.push(completionProvider);
  context.subscriptions.push(definitionProvider);

  return true;
}

// this method is called when your extension is deactivated
export function deactivate() { }
