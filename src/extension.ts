// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {
  getCompletionItem,
  getHoverPreview,
  getVariableAtPosition,
  logger,
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

function extractVarsFromDocument(document: vscode.TextDocument): Var[] {
  const file = document.getText();
  logger.appendLine(`\n  * ${document.fileName}`);
  const vars = new Map();
  const result: Var[] = [];
  const stringRegexp = /`[^`]+`|'[^']+'|"[^"]+"|\/\/.*$/ig;

  const parseString = (stringContent: string) => {
    const regexp = /(--[a-z0-9-]+):([^;]+)/ig;
    let currentMatch = regexp.exec(stringContent);
    const evaluateCurrentMatch = () => {
      if (!currentMatch) {
        return;
      }
      const [, varName, value] = currentMatch;
      if (!varName || !value || vars.has(varName)) {
        return;
      }
      vars.set(varName, value);
      logger.appendLine(`    ${varName}: ${value}`);
      result.push({
          name: varName,
          value: value.replace(/(?!<`)`$|(?!<")"$|(?!<')'$/ig, ''),
          uri: document.uri,
          range: new vscode.Range(
            new vscode.Position(stringRegexp.lastIndex + regexp.lastIndex, 4),
            new vscode.Position(stringRegexp.lastIndex + regexp.lastIndex, varName.length + 4)
          ),
        });
    };
    while (currentMatch) {
      evaluateCurrentMatch();
      currentMatch = regexp.exec(stringContent);
    }
  };
  let currentStringMatch = stringRegexp.exec(file);
  while (currentStringMatch) {
    if (currentStringMatch[0][0] !== '/') {
      const stringInner = currentStringMatch[0].substring(1, currentStringMatch[0].length - 1);
      parseString(stringInner);
    }
    currentStringMatch = stringRegexp.exec(file);
  }
  return result;
}

export async function activate(context: vscode.ExtensionContext) {
  logger.appendLine(
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
  logger.append('\nFound the following variables;');
  const finalItems = documents.flatMap(extractVarsFromDocument);

  logger.appendLine(
    '\nStart dynamically watching current file for local variables;'
  );

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
        const range = document.getWordRangeAtPosition(
          position,
          /(?<=[^\S]|['"`(:]|^)-+([a-z0-9-_]*)/i
        );
        if (!range) {
          return [];
        }
        const maybeQuotedText = document.getText(
          range.with(range.start.translate(0, -1), range.end.translate(0, 1))
        );
        const currentLine = document.lineAt(position.line);
        const isCssPropLine =
          !maybeQuotedText.match(/['"`]/) &&
          currentLine.text.includes('css={{');
        const itemsInThisDocument = extractVarsFromDocument(document);

        const variables = itemsInThisDocument
          .concat(finalItems)
          .map(({ name, value }) =>
            getCompletionItem({
              name,
              value,
              range,
              isCssPropLine,
              currentLine,
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

        const itemsInThisDocument = extractVarsFromDocument(document);
        return itemsInThisDocument
          .concat(finalItems)
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

      const itemsInThisDocument = extractVarsFromDocument(document);
      const variableItem = itemsInThisDocument
        .concat(finalItems)
        .find(({ name }) => name === variable);

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
export function deactivate() {}
