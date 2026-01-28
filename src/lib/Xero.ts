import dayjs from 'dayjs'

import { doWhileUndefined, wait } from './etc.js'
import { lm } from './io.js'
import AutoBrowser from './AutoBrowser.js'
import chalk from 'chalk'

const operatingButtonSelector =
    '.mf-bank-widget-panel:contains("Operating")>div>div>button'

const operatingButtonSelectorNew =
    '.homepage-banking-widget-mfe:contains("Operating") > header > div > div > div > button'

const reserveButtonSelector =
    '.mf-bank-widget-panel:contains("Reserv")>div>div>button'

type I_MatchAndSearch = {
    regex: RegExp
    searchTerm: string
    dayOffset: number
}

export default class Xero {
    autoBrowser: AutoBrowser

    static #reconciliationSearchObjList: I_MatchAndSearch[] = [
        {
            dayOffset: -1,
            regex: /PayLease\.com\s+Settlement/,
            searchTerm: 'ZACH',
        },
        { dayOffset: -1, regex: /PAYLEASE\.COM\s+CREDIT/, searchTerm: 'ZCC' },
        { dayOffset: 0, regex: /Image\s+Deposit/, searchTerm: 'check' },
        { dayOffset: 0, regex: /Lockbox\s+Deposit/, searchTerm: 'DOT' },
        { dayOffset: -1, regex: /HOA\s+DUES/, searchTerm: 'APIACH' },
        { dayOffset: 0, regex: /CCPAY/, searchTerm: 'DC' },
    ]

    static #reconciliationGetSearchObj(
        bankLine: string
    ): I_MatchAndSearch | null {
        for (const searchObject of this.#reconciliationSearchObjList) {
            if (searchObject.regex.test(bankLine)) {
                return searchObject
            }
        }

        return null
    }

    constructor(autoBrowser: AutoBrowser) {
        this.autoBrowser = autoBrowser
    }

    async mainPageIs2026Design() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        return await ab.waitForMult(
            [
                $('.xui-pageheading--title'),
                $('.header-and-quick-actions-mfe-MfeContainer'),
            ],
            15000
        )
    }

    async reconciliationUnselectAllTransactions() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        await ab.waitFor($('div#selectedTransactionList'))
        const numSelected = await ab.hasNumber(
            $('div#selectedTransactionList').find('div.transaction-row')
        )

        if (numSelected <= 0) {
            return
        }

        lm('• Detected alread-selected xactions!')
        lm('• Deselecting...')
        for (let i = 0; i < numSelected; i++) {
            await ab.clickInstance(
                $('div#selectedTransactionList')
                    .find('div.transaction-row')
                    .find('input.checkbox'),
                i
            )
        }
        await wait(500)
    }

    async reconciliationSelectDatedTransactions(
        searchObj: I_MatchAndSearch,
        dateString: string
    ) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        let searchDate = dayjs(dateString).add(searchObj.dayOffset, 'day')
        while (searchDate.day() > 5 || searchDate.day() < 1) {
            //If weekend, fit to prev business day
            searchDate = searchDate.subtract(1, 'day')
        }

        const searchDateString = searchDate.format('MMM D, YYYY')
        lm(`• Selecting all w/ date: ${searchDateString}`)

        const numMatchingRows = await ab.hasNumber(
            $('div#availableTransactionList')
                .find('div.transaction-row')
                .has(`div.date:contains("${searchDateString}")`)
        )
        lm(`• Found num: ${numMatchingRows}`)

        lm(`• Clicking all instances...`)
        for (let i = 0; i < numMatchingRows; i++) {
            await ab.clickInstance(
                $('div#availableTransactionList')
                    .find('div.transaction-row')
                    .has(`div.date:contains("${searchDateString}")`)
                    .find('input.checkbox'),
                i
            )
        }
        lm(`○ Done!`)
    }

    async reconciliationStart() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm('\n• Starting reconcile attempt!')
        await wait(500)

        if (!(await ab.has($('div.findMatch[style="visibility: visible;"]')))) {
            await ab.click($('a:contains("Find & Match")'))
        }
        await ab.waitFor($('div.findMatch[style="visibility: visible;"]'))

        const bankLine = await ab.getText(
            $('.line.opened').find('span[data-testid="payee"]')
        )
        const dateLine = await ab.getText(
            $('.line.opened').find('span[data-testid="posted-date"]')
        )

        const searchObj = Xero.#reconciliationGetSearchObj(bankLine)
        if (!searchObj) {
            lm('○ Could not identify reconciliation type!')
            return
        }
        lm(`• Identified: ${searchObj.searchTerm}`)

        await ab.type($('input#searchNameText'), searchObj.searchTerm)
        await wait(150)
        await ab.click($('.bankrec-search-form').find(".xbtn:contains('Go')"))

        await ab.waitFor(
            $('div#transactionListLoading[style="display: block;"]')
        )
        await ab.waitFor(
            $('div#transactionListLoading[style="display: none;"]'),
            20000
        )
        await wait(150)
        await ab.click($('.bankrec-search-form').find(".xbtn:contains('Go')"))

        await wait(500)
        if (await ab.has($('div#noTransactionAlert'))) {
            lm('No transactions detected.')
            return
        }
        await ab.waitFor(
            $('div#availableTransactionList').find('div.transaction-row')
        )

        await this.reconciliationUnselectAllTransactions()
        await this.reconciliationSelectDatedTransactions(searchObj, dateLine)
    }

    async switchToOrg(orgName: string) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm(`• Switching to ${chalk.greenBright(orgName)}...`)

        await ab.cons('location.reload()')
        await ab.cons('location.reload()')
        await ab.waitPageLoad()

        let orgSelectFirstResult

        if (
            await ab.has(
                $('[aria-label="Top navigation bar"] > div.x-nav--logo')
            )
        ) {
            const orgSearchQuery = $('input[aria-label="Search organizations"]')
            const orgSearchClearQuery = $('.x-nav--org-search-input-clear')
            const inactiveButtonQuery = $(
                'button.x-nav--tenant-menu-button'
            ).not('[aria-expanded="true"]')
            const hasInactiveButton = await ab.has(inactiveButtonQuery)

            if (hasInactiveButton) {
                await ab.click(
                    $('button.x-nav--tenant-menu-button').not(
                        '[aria-expanded="true"]'
                    )
                )
            } else if (await ab.has(orgSearchClearQuery)) {
                await ab.click(orgSearchClearQuery)
            }
            await ab.waitFor(
                $('button.x-nav--tenant-menu-button[aria-expanded="true"]')
            )
            await ab.waitFor(orgSearchQuery)
            await wait(250)

            // Type name, select, wait for pageload
            await ab.type(orgSearchQuery, orgName)

            await wait(650)

            orgSelectFirstResult = $(
                'ul[aria-label="Search results"].x-nav--nav-item-list > li:nth-child(1) > a'
            )
        } else {
            const orgChangeBtnQuery = $('[data-name="xnav-changeorgbutton"]')
            const hasChangeOrgButton = await ab.has(orgChangeBtnQuery)

            if (!hasChangeOrgButton) {
                await ab.clickFirstVisible([
                    $('button[aria-label="Main menu"]'),
                    $('.xnav-appbutton').not('.xnav-appbutton-is-active'),
                    $(
                        '.xnav-orgsearchcontainer > button.xnav-icon-orgsearchclear'
                    ),
                ])
            }

            // Type name, select, wait for pageload
            await ab.click(orgChangeBtnQuery)
            await ab.type($('input.xnav-orgsearch--input'), orgName)

            await wait(650)

            orgSelectFirstResult = $(
                'ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a'
            )
        }

        await ab.waitFor(orgSelectFirstResult)
        while (await ab.has(orgSelectFirstResult)) {
            await ab.click(orgSelectFirstResult)
            await wait(750)
        }

        await ab.waitPageLoad()

        if (await this.mainPageIs2026Design()) {
            await ab.waitFor($(operatingButtonSelectorNew))
        } else {
            await ab.waitFor($(operatingButtonSelector))
        }

        lm('○ Done!')
    }

    async openImports() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm('• Navigating to imports...')

        if (await this.mainPageIs2026Design()) {
            await ab.click($(operatingButtonSelectorNew))
            await ab.click(
                $(
                    '.homepage-banking-widget-mfe-Link > a:contains("Import bank statement")'
                )
            )
            await ab.waitPageLoad()
        } else {
            await ab.click($(operatingButtonSelector))
            await ab.click($('a:contains("Import a Statement")'))
        }

        await ab.waitFor(
            $(
                '.xui-pageheading--titlewrapper:contains("Import bank transactions")'
            )
        )
        await ab.waitFor(
            $('button[data-automationid="wizard-next-step-button"]')
        )

        const buttonSelectString = `${$(
            'button[data-automationid="wizard-next-step-button"]'
        )
            .get(0)
            .toString()}.focus()`

        await ab.cons(buttonSelectString)
        await ab.cons(buttonSelectString)
        lm('○ Done!')
    }

    async dropImportFile(filePath: string) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm('• Uploading import file...')

        await ab.dropFile(
            $('.xero-manual-transaction-upload-ui-SelectFileStep').find(
                '.xui-fileuploader--dropzone'
            ),
            filePath
        )

        await ab.waitFor($('.xui-fileuploader--fileitem--description'))
        await ab.click($('.xui-fixedfooter').find('button:contains("Next")'))
        await wait(500)
        await doWhileUndefined(10000, 500, async () => {
            const hasNextButton = await ab.has(
                $('.xui-fixedfooter').find('button:contains("Next")')
            )
            if (!hasNextButton) {
                return true
            }
            await ab.click(
                $('.xui-fixedfooter').find('button:contains("Next")')
            )
        })
        await ab.click(
            $('.xui-fixedfooter').find('button:contains("Complete import")')
        )
        await ab.waitPageLoad()
        lm('○ Done!')
    }

    async navToTransactionFilters() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm('• Opening account transaction search...')

        if (await this.mainPageIs2026Design()) {
            await ab.click($(operatingButtonSelectorNew))
            await ab.click(
                $(
                    '.homepage-banking-widget-mfe-Link:contains("View account transactions")'
                ).find('a')
            )
        } else {
            await ab.click($(operatingButtonSelector))
            await ab.click(
                $(
                    '.mf-bank-widget-text-minorlink:contains("Account Transactions")'
                )
            )
        }

        await ab.waitPageLoad()
        await ab.waitFor($('#removeAndRedoButton'))

        await ab.cons('window.Bank.toggleSearchForm();')
        await ab.waitFor($('.search.action.open'))
        lm('○ Done!')
    }

    async openAgedChecks(skipClear = false) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm('• Opening aged checks...')
        if (!skipClear) {
            await ab.cons("clearBankTran(); SubmitAction('Clear');")
            await ab.waitPageLoad()
        }

        await ab.type(
            $('#sb_dteEndDate'),
            `${dayjs().subtract(90, 'day').format('MMM D, YYYY')}`
        )

        await ab.cons('jQuery.noConflict()')
        await ab.type($('#sb_reconciledStatus_value'), 'Un')
        await wait(500)
        await ab.click(
            $(
                '#sb_reconciledStatus_suggestions>div>div.selected:contains("Unreconciled")'
            )
        )

        await ab.click($('#sbSubmit_BT'))
        await ab.waitPageLoad()
        await ab.waitFor($('#bankTransactions'))

        let numResults = 0
        if (await ab.has($('#bankTransactionListEmptyRow'))) {
            numResults = 0
        } else {
            numResults = await ab.hasNumber($('#bankTransactionList > tr'))
        }

        lm('○ Done!')
        return numResults
    }

    async openReconciliations() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm('• Opening reconciliations...')

        if (await this.mainPageIs2026Design()) {
            await ab.click(
                $('.homepage-banking-widget-mfe:contains("Operating")').find(
                    'a.homepage-banking-widget-mfe-button:contains("Reconcile")'
                )
            )
        } else {
            await ab.click(
                $('.mf-bank-widget-panel:contains("Operating")').find(
                    'a[data-automationid="reconcileBankItems"]'
                )
            )
        }
        await ab.waitPageLoad(true)
        lm('○ Done!')
    }

    async openAgedTransactions(skipClear = false) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm('• Opening aged Transactions...')
        if (!skipClear) {
            await ab.cons("clearBankTran(); SubmitAction('Clear');")
            await ab.waitPageLoad()
        }

        await ab.type(
            $('#sb_dteEndDate'),
            `${dayjs().subtract(11, 'day').format('MMM D, YYYY')}`
        )

        await ab.type($('#sb_reconciledStatus_value'), 'Un')
        await ab.cons('jQuery.noConflict()')
        await ab.type($('#sb_reconciledStatus_value'), 'Un')
        await wait(500)
        await ab.click(
            $(
                '#sb_reconciledStatus_suggestions>div>div:contains("Unreconciled")'
            )
        )

        await ab.click($('#sbSubmit_BT'))
        await ab.waitPageLoad()
        await ab.waitFor($('#bankTransactions'))

        let numResults = 0
        if (await ab.has($('#bankTransactionListEmptyRow'))) {
            numResults = 0
        } else {
            numResults = await ab.hasNumber(
                $('#bankTransactionList > tr')
                    .not(":contains('EmpHOA #')")
                    .not(":contains('INV-')")
            )
        }

        lm('○ Done!')
        return numResults
    }

    async enterRecReportEndDate(endDateString) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm(endDateString)

        await ab.doConsoleSetup()
        await wait(100)
        await ab.type($('#report-settings-custom-date-input-to'), endDateString)
        await wait(200)
        await ab.click($('[data-automationid="settings-panel-update-button"]'))
    }
}
