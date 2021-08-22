// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as isColor from 'is-color';
import { getValueKind, createCompletionItem } from './utils';

type Var = { name: string, value: string };
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
  const filesPromises = filesUri.map(file => vscode.workspace.openTextDocument(file).then(document => document.getText()));
  const files = await Promise.all(filesPromises);

  // Get all variables from lines
  const finalItems = files.flatMap(file => {
    const vars = new Map();

    return file.split(/\r?\n/)
      .filter(line => line.trim().startsWith('--'))
      .map(line => {
        const lineTrim = line.trim();
        const [name, value] = lineTrim.split(":");

        // Prevent duplicate or empty variables
        if (!value || vars.has(name)) { return; };

        vars.set(name, value);
        return { name, value };
      })
      .filter(Boolean) as Var[];
  });

  const provider = vscode.languages.registerCompletionItemProvider(autoCompleteOn, {
    provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken) {
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

  context.subscriptions.push(provider);

  return true;
}

// this method is called when your extension is deactivated
export function deactivate() { }
