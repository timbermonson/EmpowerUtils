import {
    select as inquirerSelect,
    input as inquirerInput,
} from '@inquirer/prompts'
import dayjs from 'dayjs'
import chalk from 'chalk'

import lib from '../../lib/index.js'

const {
    appendOutputData,
    commandLineArgsWrapper,
    confirm,
    logSep,
    setupIOTextFiles,
    writeOutputData,
    lm,
} = lib.io

import T_Xero from '../../lib/Xero.js'

const Xero = lib.Xero
const AutoBrowser = lib.AutoBrowser
const InputLineIterator = lib.InputLineIterator

const debugPort = 9222

import config from 'config'
import { readdirSync } from 'fs'
import { search as inquirerSearch } from '@inquirer/prompts'
import Fuse from 'fuse.js'
const importFileExtension = 'ofx'
const ioFolder = config.get('io.files.ioFolder') as string
async function selectFolder(): Promise<any> {
    const folderList = readdirSync(ioFolder, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)

    const folderSelectOptionList = folderList.map((folderName) => {
        return {
            name: folderName,
            value: `${ioFolder}/${folderName}`,
        }
    })

    return await inquirerSelect({
        message: 'In "ioFiles", which folder contains your import files?',
        choices: folderSelectOptionList,
    })
}

function getSearchResults(
    searchOptionList: Array<{ name: string; value: string }>,
    searchTerm: string
) {}

async function selectFile(
    folderPath: string,
    orgName: string
): Promise<string | false> {
    const fileNameList = readdirSync(folderPath, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isFile() && entry.name.endsWith(`.${importFileExtension}`)
        )
        .map((entry) => entry.name)

    const searchOptionList = fileNameList.map((fileName) => {
        return {
            name: fileName
                .replace(`.${importFileExtension}`, '')
                .split('_')[0]
                .replace('HOA', '')
                .replaceAll(/(?<=[a-z])([A-Z])/g, ' $1') // TitleCase => Spaced Title Case
                .replaceAll(/\s+/g, ' ')
                .trim(),
            value: fileName,
        }
    })
    searchOptionList.push({ name: '$~Cancel', value: 'cancelSearch.notAFile' })

    return false
}

type D_AutomationChoice = {
    name: string
    value: {
        setup?: () => Promise<any>
        logVerb: string
        actionCallback: (target: string, setupState?: any) => Promise<void>
    }
}

async function pickActionCallback(
    xeroObject: T_Xero
): Promise<D_AutomationChoice['value']> {
    const automationChoiceList: Array<D_AutomationChoice> = [
        {
            name: 'Open Imports',

            value: {
                logVerb: 'Open Imports:',
                actionCallback: async (orgName: string) => {
                    await xeroObject.switchToOrg(orgName)
                    await xeroObject.openImports()
                },
            },
        },
        {
            name: 'Auto Import',

            value: {
                logVerb: 'Auto Import:',
                setup: selectFolder,
                actionCallback: async (orgName: string, setupState: any) => {
                    const folderPath = setupState
                    console.log(
                        `importing ${orgName} using file from folder ${folderPath}`
                    )
                    await selectFile(folderPath, orgName)
                    return
                    await xeroObject.switchToOrg(orgName)
                    await xeroObject.openImports()
                },
            },
        },

        {
            name: 'Open Aged Checks',

            value: {
                logVerb: 'Open Aged Checks:',
                actionCallback: async (orgName: string) => {
                    await xeroObject.switchToOrg(orgName)
                    await xeroObject.openAgedChecks()
                },
            },
        },
        {
            name: 'Open Aged Transactions',

            value: {
                logVerb: 'Open Aged Transactions:',
                actionCallback: async (orgName: string) => {
                    await xeroObject.switchToOrg(orgName)
                    await xeroObject.openAgedTransactions()
                },
            },
        },

        {
            name: 'Reconciliation Report: Slide date',

            value: {
                logVerb: 'Reconciliation Report - Slide date:',
                actionCallback: async () => {
                    const startInput = await inquirerInput({
                        message: '(ex. May 5, 2020) Input a starting date:',
                    })

                    let iter = 0
                    while (true) {
                        const endDateString = dayjs(startInput)
                            .add(iter, 'day')
                            .format('MMM D, YYYY')
                        if (
                            !(await confirm(
                                `Continue using date ${endDateString}?`
                            ))
                        ) {
                            break
                        }
                        await xeroObject.enterRecReportEndDate(endDateString)
                        iter += 1
                    }
                },
            },
        },
    ]

    return await inquirerSelect({
        message: 'What would you like to do per-community?',
        choices: automationChoiceList,
    })
}

async function run() {
    // Setup logging
    setupIOTextFiles()
    commandLineArgsWrapper()
    writeOutputData('')
    lm('')

    // Autobrowser setup
    const autoBrowser = new AutoBrowser()
    await autoBrowser.connect(
        debugPort,
        ({ url, type }) =>
            type === 'page' &&
            (url.includes('reporting.xero.com') || url.includes('go.xero.com'))
    )
    const xero = new Xero(autoBrowser)
    lm('')

    // Setup automation
    logSep('<Automation Settings>', '-')
    const iterator: I_InputIterator<string> = new InputLineIterator()
    await iterator.offerSkipSearch()
    const {
        logVerb,
        actionCallback,
        setup: actionSetup,
    } = await pickActionCallback(xero)
    logSep()

    // Perform action setup if needed
    let actionSetupState: any
    if (actionSetup) {
        actionSetupState = await actionSetup()
    }

    // Loop through list
    do {
        const curLine = await iterator.getNextItem()
        appendOutputData(curLine + '\n')

        if (await confirm(`${logVerb} ` + chalk.green(`[${curLine}]?`))) {
            let retry = true

            while (retry) {
                try {
                    await autoBrowser.showHeader()
                    await actionCallback(curLine, actionSetupState)
                    retry = false
                    await autoBrowser.hideHeader()
                } catch (e) {
                    console.error(e)
                    await autoBrowser.hideHeader()
                    retry = await confirm('Retry?')
                }
            }
        }
    } while (await confirm('Continue?'))

    await autoBrowser.close()
}

run()
