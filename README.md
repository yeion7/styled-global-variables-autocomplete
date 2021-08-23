# Styled Global Variables Autocomplete

![fields](media/telescope.png)

[Visual Studio Code](https://code.visualstudio.com) extension that provides autocomplete for CSS variables from styled-components global styles.

## Features

* CSS variables autocomplete
<!-- Insert gif -->
* Support Go to definition
<!-- Insert gif -->
* Preview variable value on hover
<!-- Insert gif -->

## Extension Settings

### `variablesAutocomplete.include` 
A glob pattern to find files where extract variables

default: `"**/*.globals.{ts,js,tsx,jsx}"`

> Tip: in order to keep the performance try to use a explicit pattern, otherwise we could retrieve so many files and having a bad performance

### `variablesAutocomplete.exclude`
A glob pattern to ignore

### `variablesAutocomplete.autoCompleteOn`
Languages to enable autocomplete. See https://code.visualstudio.com/Docs/extensionAPI/vscode-api#DocumentSelector

default: `["javascript", "typescript", "javascriptreact", "typescriptreact"]`

## Raising an issue

Please check the issues list to see if it has already been raised. If it has you can vote on it with a thumbsUp emoji. Issues with the most votes tend to be prioritised.