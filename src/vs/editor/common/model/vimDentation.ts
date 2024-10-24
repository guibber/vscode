/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CursorConfiguration, ICursorSimpleModel } from '../cursorCommon.js';
import { ITextBuffer } from '../model.js';
import { Selection } from '../core/selection.js';
import { ReplaceCommand, ReplaceCommandThatPreservesSelection } from '../commands/replaceCommand.js';
import { Range } from '../core/range.js';

export interface IVimIndentation {
	isVimOn: boolean;
	tabSize: number;
	softTabSize: number;
}

export function detectVimDentation(source: ITextBuffer): IVimIndentation {
	const MAX_LINE_FOR_VIM_DETECTION = 4;
	const DEFAULT_VIM_TABSTOP = 8;
	const DEFAULT_VIM_SOFT_TABSTOP = 4;
	const linesToCheck = Math.min(source.getLineCount(), MAX_LINE_FOR_VIM_DETECTION);
	for (let lineNumber = 1; lineNumber <= linesToCheck; lineNumber++) {
		const lineContent = source.getLineContent(lineNumber);
		if (lineContent.indexOf('vim') >= 0) {
			return {
				isVimOn: true,
				tabSize: extractSettingFromLineText(lineContent, 'ts', DEFAULT_VIM_TABSTOP),
				softTabSize: extractSettingFromLineText(lineContent, 'sts', DEFAULT_VIM_SOFT_TABSTOP),
			};
		}

	}
	return {
		isVimOn: false,
		tabSize: DEFAULT_VIM_TABSTOP,
		softTabSize: DEFAULT_VIM_SOFT_TABSTOP,
	};
}

function extractSettingFromLineText(lineText: string, key: string, defaultValue: number): number {
	let pos = lineText.indexOf(key);
	if (pos !== -1) {
		// find =
		for (pos += key.length; pos < lineText.length; pos++) {
			if (lineText.charAt(pos) !== '=') {
				continue;
			}
			break;
		}
		if (lineText.charAt(pos) !== '=') {
			return defaultValue;
		}
		pos++; // eat the =
		// skip spaces
		for (; pos < lineText.length; pos++) {
			if (lineText.charAt(pos) === ' ' || lineText.charAt(pos) === '/t') {
				continue;
			}
			break;
		}
		// extract single-digit setting
		const setting = pos < lineText.length ? Number(lineText.charAt(pos)) : NaN;
		return isNaN(setting) ? defaultValue : setting;
	}
	return defaultValue;
}

export function vimGetTabOperationReplaceCommandThatPreservesSelection(
	config: CursorConfiguration,
	model: ICursorSimpleModel,
	selection: Selection): ReplaceCommandThatPreservesSelection {

	const lineText = model.getLineContent(selection.startLineNumber);
	const desiredWsCount = vimCalculateWhitespaceCountWithIndent(lineText, config.tabSize, config.indentSize);
	const replaceText = vimGenerateWhitespaceText(desiredWsCount, config.tabSize, config.indentSize);
	const posOfFirstNonWs = vimIndexOfNonWhitespace(lineText) + 1;
	const posOfFirstNonWsNew = replaceText.length + 1;
	if (selection.getStartPosition().column === posOfFirstNonWs) {
		selection.setStartPosition(selection.startLineNumber, posOfFirstNonWsNew);
	}
	return new ReplaceCommandThatPreservesSelection(new Range(selection.startLineNumber, 1, selection.startLineNumber, posOfFirstNonWs), replaceText, selection, true);
}

export function vimGetTabOperationReplacementCommandWhenNoSelection(
	config: CursorConfiguration,
	model: ICursorSimpleModel,
	selection: Selection): ReplaceCommand {

	const lineText = model.getLineContent(selection.startLineNumber);
	const desiredWsCount = vimCalculateWhitespaceCountWithIndent(lineText, config.tabSize, config.indentSize);
	const replaceText = vimGenerateWhitespaceText(desiredWsCount, config.tabSize, config.indentSize);
	return new ReplaceCommand(new Range(selection.startLineNumber, 1, selection.startLineNumber, vimIndexOfNonWhitespace(lineText) + 1), replaceText, false);
}

export function vimGetDeleteLeftReplacementText(config: CursorConfiguration, model: ICursorSimpleModel, selection: Selection): string {
	const line = model.getLineContent(selection.startLineNumber);
	const current = vimGetLineLeftOfPosition(line, selection.positionColumn);
	const firstNonWs = model.getLineFirstNonWhitespaceColumn(selection.startLineNumber);
	return config.isVimDentation
		&& current.length > 0
		&& current.charAt(current.length - 1) === '\t'
		&& (selection.positionColumn <= firstNonWs || firstNonWs === 0)
		&& config.tabSize !== config.indentSize
		? cachedStringRepeat(' ', config.indentSize)
		: '';
}
export function vimCalculateWhitespaceCountWithIndent(lineText: string, tabSize: number, softTabSize: number): number {
	let actualws = softTabSize;
	for (let z = 0; z < lineText.length; z++) {
		const ch = lineText.charAt(z);
		if (ch === '\t') {
			actualws += tabSize;
		}
		else if (ch === ' ') {
			actualws++;
		}
		else {
			break;
		}
	}
	return actualws;
}

export function vimCalculateWhitespaceCountWithoutIndent(lineText: string, tabSize: number, softTabSize: number): number {
	let actualws = 0;
	for (let z = 0; z < lineText.length; z++) {
		const ch = lineText.charAt(z);
		if (ch === '\t') {
			actualws += tabSize;
		}
		else if (ch === ' ') {
			actualws++;
		}
		else {
			break;
		}
	}
	actualws = actualws - softTabSize;
	return actualws < 0 ? 0 : actualws;
}

export function vimIndexOfNonWhitespace(lineText: string): number {
	for (let z = 0; z < lineText.length; z++) {
		const ch = lineText.charAt(z);
		if (ch === '\t' || ch === ' ') {
			continue;
		}
		else {
			return z;
		}
	}
	return lineText.length;
}

export function vimGetLineLeftOfPosition(line: string, position: number): string {
	let current = '';
	for (let x = 0; x < position - 1; x++) {
		current += line.charAt(x);
	}
	return current;
}

export function vimGenerateWhitespaceText(desiredWsCount: number, tabSize: number, softTabSize: number): string {
	//const softtabs = tabSize === softTabSize ? 1 : 0;
	const fulltabs = (desiredWsCount / tabSize);// - softtabs;
	const spaces = (desiredWsCount % tabSize);// + (softtabs * tabSize);
	let ret = '';
	if (desiredWsCount <= 0) {
		return ret;
	}
	for (let z = 1; z <= fulltabs; z++) {
		ret += '\t';
	}
	for (let z = 1; z <= spaces; z++) {
		ret += ' ';
	}
	return ret;
}

const repeatCache: { [str: string]: string[] } = Object.create(null);
export function cachedStringRepeat(str: string, count: number): string {
	if (count <= 0) {
		return '';
	}
	if (!repeatCache[str]) {
		repeatCache[str] = ['', str];
	}
	const cache = repeatCache[str];
	for (let i = cache.length; i <= count; i++) {
		cache[i] = cache[i - 1] + str;
	}
	return cache[count];
}
