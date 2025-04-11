import { select } from '@inquirer/prompts'
import lib from '../../lib/index.js'
import { lm } from '../../lib/io.js'

import chalk from 'chalk'

const {
    appendOutputData,
    commandLineArgsWrapper,
    confirm,
    logSep,
    setupIOTextFiles,
    writeOutputData,
} = lib.io

const Xero = lib.Xero
const AutoBrowser = lib.AutoBrowser
const InputLineIterator = lib.InputLineIterator

const debugPort = 9222

async function pickActionCallback(xeroObject) {
    return await select({
        message: 'What would you like to do per-community?',

        choices: [
            {
                name: 'Open Imports',

                value: {
                    actionName: 'Open Imports',
                    actionCallback: async (orgName) => {
                        await xeroObject.switchToOrg(orgName)
                        await xeroObject.openImports()
                    },
                },
            },

            {
                name: 'Open Aged Checks',

                value: {
                    actionName: 'Open Aged Checks',
                    actionCallback: async (orgName) => {
                        await xeroObject.switchToOrg(orgName)
                        await xeroObject.openAgedChecks()
                    },
                },
            },
        ],
    })
}

async function run() {
    setupIOTextFiles()
    commandLineArgsWrapper()
    writeOutputData('')
    lm('\n')

    const autoBrowser = new AutoBrowser()
    const iterator = new InputLineIterator()

    await autoBrowser.connect(
        debugPort,
        ({ url, type }) => url.includes('go.xero.com') && type === 'page'
    )

    const xero = new Xero(autoBrowser)

    lm('')
    logSep('<Automation Settings>', '-')
    await iterator.offerSkipSearch()
    const { actionName, actionCallback } = await pickActionCallback(xero)
    logSep()

    while (true) {
        let curLine = ''

        try {
            curLine = await iterator.getNextLine()
        } catch (e) {
            console.error(e.message)
            break
        }

        appendOutputData(curLine + '\n')

        if (await confirm(`${actionName}: ` + chalk.green(`[${curLine}]?`))) {
            let retry = true

            while (retry) {
                try {
                    await autoBrowser.showHeader()
                    await actionCallback(curLine)
                    retry = false
                    await autoBrowser.hideHeader()
                } catch (e) {
                    console.error(e)
                    await autoBrowser.hideHeader()
                    retry = await confirm('Retry?')
                }
            }
        }

        if (await confirm('Continue?')) {
            continue
        }

        break
    }

    await autoBrowser.close()
}

run()
