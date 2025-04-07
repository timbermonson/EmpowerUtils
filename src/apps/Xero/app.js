import { select } from '@inquirer/prompts'
import lib from '../../lib/index.js'

const {
    confirm,
    lm,
    logSep,
    appendOutputData,
    commandLineArgsWrapper,
    getInputData,
    setupIOTextFiles,
    writeOutputData,
} = lib.io

const Xero = lib.Xero
const AutoBrowser = lib.AutoBrowser

import { compact } from 'lodash-es'

const debugPort = 9222

async function finish(autoBrowser) {
    await autoBrowser.close()
}

function init() {
    setupIOTextFiles()
    commandLineArgsWrapper()
    writeOutputData('')
}

function getInputLine(lineNum) {
    const inputLines = compact(
        getInputData()
            ?.split('\n')
            ?.map((l) => l.trim()) || []
    )

    if (!inputLines?.length) {
        throw new Error('No input!')
    }

    return inputLines[lineNum]
}

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
    init()
    const autoBrowser = new AutoBrowser()

    await autoBrowser.setup(
        debugPort,
        ({ url }) =>
            url.includes('go.xero.com/app/') ||
            url.includes('go.xero.com/Bank/')
    )

    const xero = new Xero(autoBrowser)
    const { actionName, actionCallback } = await pickActionCallback(xero)

    let curLineNum = 0
    while (true) {
        let curLine = ''
        try {
            curLine = getInputLine(curLineNum)
        } catch (e) {
            console.error(e.message)
            break
        }

        appendOutputData(curLine + '\n')
        if (await confirm(`${actionName}: [${curLine}]?`)) {
            let success = false

            while (!success) {
                try {
                    await actionCallback(curLine)

                    success = true
                } catch (e) {
                    console.error(e)
                    if (!(await confirm('Retry?'))) success = true
                }
            }
        }

        if (await confirm('Continue?')) {
            curLineNum += 1
            continue
        }

        break
    }

    await finish(autoBrowser)
}

run()
