/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ParsedArgs } from 'minimist';
import { Application, Terminal, TerminalCommandId, TerminalCommandIdWithValue } from '../../../../automation/out';
import { afterSuite, beforeSuite } from '../../utils';

export function setup(opts: ParsedArgs) {
	describe('Terminal Persistence', () => {
		let terminal: Terminal;

		beforeSuite(opts);
		afterSuite(opts);

		before(async function () {
			const app = this.app as Application;
			terminal = app.workbench.terminal;

			// Always show tabs to make getting terminal groups easier
			await app.workbench.settingsEditor.addUserSetting('terminal.integrated.tabs.hideCondition', '"never"');
			await app.workbench.quickaccess.runCommand('workbench.action.closeAllEditors');
		});

		afterEach(async () => {
			await terminal.runCommand(TerminalCommandId.KillAll);
		});

		describe('detach/attach', () => {
			// https://github.com/microsoft/vscode/issues/137799
			it.skip('should support basic reconnection', async () => {
				await terminal.runCommand(TerminalCommandId.CreateNew);
				// TODO: Handle passing in an actual regex, not string
				await terminal.assertTerminalGroups([
					[{ name: '.*' }]
				]);

				// Get the terminal name
				await terminal.assertTerminalGroups([
					[{ name: '.*' }]
				]);
				const name = (await terminal.getTerminalGroups())[0][0].name!;

				// Detach
				await terminal.runCommand(TerminalCommandId.DetachSession);
				await terminal.assertTerminalViewHidden();

				// Attach
				await terminal.runCommandWithValue(TerminalCommandIdWithValue.AttachToSession, name);
				await terminal.assertTerminalGroups([
					[{ name }]
				]);
			});

			it('should persist buffer content', async () => {
				await terminal.runCommand(TerminalCommandId.CreateNew);
				// TODO: Handle passing in an actual regex, not string
				await terminal.assertTerminalGroups([
					[{ name: '.*' }]
				]);

				// Get the terminal name
				await terminal.assertTerminalGroups([
					[{ name: '.*' }]
				]);
				const name = (await terminal.getTerminalGroups())[0][0].name!;

				// Write in terminal
				await terminal.runCommandInTerminal('echo terminal_test_content');
				await terminal.waitForTerminalText(buffer => buffer.some(e => e.includes('terminal_test_content')));

				// Detach
				await terminal.runCommand(TerminalCommandId.DetachSession);
				await terminal.assertTerminalViewHidden();

				// Attach
				await terminal.runCommandWithValue(TerminalCommandIdWithValue.AttachToSession, name);
				await terminal.assertTerminalGroups([
					[{ name }]
				]);
				await terminal.waitForTerminalText(buffer => buffer.some(e => e.includes('terminal_test_content')));
			});

			// TODO: This is currently flaky because it takes time to send over the new icon to the backend
			it.skip('should persist terminal icon', async () => {
				await terminal.runCommand(TerminalCommandId.CreateNew);
				// TODO: Handle passing in an actual regex, not string
				await terminal.assertTerminalGroups([
					[{ name: '.*' }]
				]);

				// Get the terminal name
				const name = (await terminal.getTerminalGroups())[0][0].name!;

				// Set the icon
				await terminal.runCommandWithValue(TerminalCommandIdWithValue.ChangeIcon, 'symbol-method');
				await terminal.assertSingleTab({ icon: 'symbol-method' });

				// Detach
				await terminal.runCommand(TerminalCommandId.DetachSession);
				await terminal.assertTerminalViewHidden();

				// Attach
				await terminal.runCommandWithValue(TerminalCommandIdWithValue.AttachToSession, name);
				await terminal.assertTerminalGroups([
					[{ name }]
				]);
				// TODO: This fails due to a bug
				await terminal.assertSingleTab({ icon: 'symbol-method' });
			});
		});
	});
}
