import { select, input } from '@inquirer/prompts'
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
                    logVerb: 'Open Imports:',
                    actionCallback: async (orgName) => {
                        await xeroObject.switchToOrg(orgName)
                        await xeroObject.openImports()
                    },
                },
            },

            {
                name: 'Open Aged Checks',

                value: {
                    logVerb: 'Open Aged Checks:',
                    actionCallback: async (orgName) => {
                        await xeroObject.switchToOrg(orgName)
                        await xeroObject.openAgedChecks()
                    },
                },
            },

            {
                name: 'Reconciliation Report: Slide date',

                value: {
                    logVerb: 'Reconciliation Report - Slide date:',
                    actionCallback: async (orgName) => {
                        const startInput = await input({
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
                            await xeroObject.enterRecReportEndDate(
                                endDateString
                            )
                            iter += 1
                        }
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
    lm('')

    const autoBrowser = new AutoBrowser()
    const iterator = new InputLineIterator()

    await autoBrowser.connect(
        debugPort,
        ({ url, type }) =>
            type === 'page' &&
            (url.includes('reporting.xero.com') || url.includes('go.xero.com'))
    )
    const xero = new Xero(autoBrowser)
    lm('')

    logSep('<Automation Settings>', '-')
    await iterator.offerSkipSearch()
    const { logVerb, actionCallback } = await pickActionCallback(xero)
    logSep()

    do {
        const curLine = await iterator.getNextLine()
        appendOutputData(curLine + '\n')

        if (await confirm(`${logVerb} ` + chalk.green(`[${curLine}]?`))) {
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
    } while (await confirm('Continue?'))

    await autoBrowser.close()
}

run()
