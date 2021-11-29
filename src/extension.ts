// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
  getCompletionItem,
  getHoverPreview,
  getVariableAtPosition,
} from './utils';

type Var = {
  name: string;
  value: string;
  uri: vscode.Uri;
  range: vscode.Range;
};
type Config = {
  include: vscode.GlobPattern;
  exclude: vscode.GlobPattern | undefined;
  autoCompleteOn: vscode.DocumentSelector;
};

const defaultConfig: Config = {
  include: '**/*.globals.{ts,js,tsx,jsx}',
  exclude: undefined,
  autoCompleteOn: [
    'javascript',
    'typescript',
    'javascriptreact',
    'typescriptreact',
  ],
};

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "styled-global-variable-autocomplete" is now active!'
  );
  const config = vscode.workspace.getConfiguration('variablesAutocomplete');
  const includeFilesGlob = config.get<Config['include']>(
    'include',
    defaultConfig.include
  );
  const excludeFilesGlob = config.get<Config['exclude']>(
    'exclude',
    defaultConfig.exclude
  );
  const autoCompleteOn = config.get<Config['autoCompleteOn']>(
    'autoCompleteOn',
    defaultConfig.autoCompleteOn
  );

  // Find all files that match configured criteria
  const filesUri = await vscode.workspace.findFiles(
    includeFilesGlob,
    excludeFilesGlob
  );

  // Read all found files
  const filesPromises = filesUri.map((file) =>
    vscode.workspace.openTextDocument(file)
  );
  const documents = await Promise.all(filesPromises);

  // Get all variables from lines
  const finalItems = documents.flatMap((document) => {
    const file = document.getText();
    const vars = new Map();

    return file
      .split(/\r?\n/)
      .map((line, i) => {
        const lineTrim = line.trim();
        const isVariable = line.trim().startsWith('--');
        if (!isVariable) {
          return;
        }

        const [name, rawValue] = lineTrim.split(':');
        const value = rawValue.trim().replace(';', '');

        // Prevent duplicate or empty variables
        if (!value || vars.has(name)) {
          return;
        }

        vars.set(name, value);
        return {
          name,
          value,
          uri: document.uri,
          range: new vscode.Range(
            new vscode.Position(i, 4),
            new vscode.Position(i, name.length + 4)
          ),
        } as Var;
      })
      .filter(Boolean) as Var[];
  });

  // Support autocomplete
  const completionProvider = vscode.languages.registerCompletionItemProvider(
    autoCompleteOn,
    {
      provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position,
        token,
        context
      ) {
        const range = document.getWordRangeAtPosition(position, /\S+/);
        const currentLine = document.lineAt(position.line);
        const isCssPropLine = currentLine.text.includes('css={{');
        const isVarPresent = currentLine.text.includes('var(');

        const variables = finalItems.map(({ name, value }) =>
          getCompletionItem({
            name,
            value,
            range,
            isCssPropLine,
            isVarPresent,
          })
        );

        return variables;
      },
    }
  );

  // Support go to definition
  const definitionProvider = vscode.languages.registerDefinitionProvider(
    autoCompleteOn,
    {
      async provideDefinition(
        document: vscode.TextDocument,
        position: vscode.Position
      ) {
        const variable = getVariableAtPosition(document, position);

        if (!variable) {
          return [];
        }

        return finalItems
          .filter(({ name }) => variable === name)
          .map(({ name, uri, range }) => new vscode.Location(uri, range));
      },
    }
  );

  const hoverProvider = vscode.languages.registerHoverProvider(autoCompleteOn, {
    async provideHover(
      document: vscode.TextDocument,
      position: vscode.Position
    ) {
      const variable = getVariableAtPosition(document, position);

      if (!variable) {
        return null;
      }

      const variableItem = finalItems.find(({ name }) => name === variable);

      if (!variableItem) {
        return null;
      }

      return new vscode.Hover(getHoverPreview(variableItem.value));
    },
  });

  context.subscriptions.push(completionProvider);
  context.subscriptions.push(definitionProvider);
  context.subscriptions.push(hoverProvider);

  return true;
}

// this method is called when your extension is deactivated
export function deactivate() { }
