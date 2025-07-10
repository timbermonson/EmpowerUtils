import {
    select as inquirerSelect,
    input as inquirerInput,
} from '@inquirer/prompts'
import chalk from 'chalk'
// import dayjs from 'dayjs'

import lib from '../../lib/index.js'
import T_Xero from '../../lib/Xero.js'
const {
    appendOutputData,
    commandLineArgsWrapper,
    confirm,
    confirmWithOption,
    logSep,
    setupIOTextFiles,
    writeOutputData,
    lm,
} = lib.io

import { selectCancel, selectFile, selectFolder } from './xeroLib.js'
import path from 'path'

const Xero = lib.Xero
const AutoBrowser = lib.AutoBrowser
const InputLineIterator = lib.InputLineIterator

const debugPort = 9222

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
                logVerb: 'Auto Import:\n ',
                setup: async () => {
                    const folderPath = await selectFolder()
                    return { folderPath }
                },
                actionCallback: async (orgName: string, setupState: any) => {
                    // Choose File
                    const { folderPath, fileServer } = setupState
                    const selectedFileName = await selectFile(
                        folderPath,
                        orgName
                    )

                    lm('')
                    logSep()

                    // Exit if skip selected
                    if (selectedFileName === selectCancel) {
                        lm('\nCanceled! Skipping...\n')
                        return
                    }
                    const filePath = path.join(
                        path.resolve(folderPath),
                        selectedFileName
                    )

                    // Otherwise, perform file import
                    await xeroObject.switchToOrg(orgName)
                    await xeroObject.openImports()
                    await xeroObject.dropImportFile(filePath)

                    logSep()
                    lm('')

                    return
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
                    await confirm('Press enter to open Aged Transactions.')
                    await xeroObject.openAgedTransactions(true)
                },
            },
        },

        // {
        //     name: 'Reconciliation Report: Slide date',

        //     value: {
        //         logVerb: 'Reconciliation Report - Slide date:',
        //         actionCallback: async () => {
        //             const startInput = await inquirerInput({
        //                 message: '(ex. May 5, 2020) Input a starting date:',
        //             })

        //             let iter = 0
        //             while (true) {
        //                 const endDateString = dayjs(startInput)
        //                     .add(iter, 'day')
        //                     .format('MMM D, YYYY')
        //                 if (
        //                     !(await confirm(
        //                         `Continue using date ${endDateString}?`
        //                     ))
        //                 ) {
        //                     break
        //                 }
        //                 await xeroObject.enterRecReportEndDate(endDateString)
        //                 iter += 1
        //             }
        //         },
        //     },
        // },
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
    logSep('<Automation Settings>', '-', 'green')
    const iterator = new InputLineIterator()
    await iterator.offerSkipSearch()
    const {
        logVerb,
        actionCallback,
        setup: actionSetup,
    } = await pickActionCallback(xero)

    // Perform action setup if needed
    let actionSetupState: any
    if (actionSetup) {
        actionSetupState = await actionSetup()
    }
    logSep()
    lm('')

    // Loop through list
    do {
        const curLine = await iterator.getNextItem()
        appendOutputData(curLine + '\n')

        const resp = await confirmWithOption(
            `${logVerb} ` + chalk.green(`[${curLine}]?`),
            'back'
        )
        if (resp.trim().toLowerCase() === 'back') {
            iterator.back()
            iterator.back()
            continue
        }
        if (resp) {
            let retry = true

            while (retry) {
                try {
                    await autoBrowser.headerShow()
                    await actionCallback(curLine, actionSetupState)
                    retry = false
                    await autoBrowser.headerHide()
                } catch (e) {
                    console.error(e)
                    await autoBrowser.headerHide()
                    retry = await confirm('Retry?')
                }
            }
        }
    } while (/*await confirm('Continue?')*/ true)

    await autoBrowser.close()
}

run()
