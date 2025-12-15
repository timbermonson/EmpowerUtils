import dayjs from 'dayjs'

import { doWhileUndefined, wait } from './etc.js'
import { lm } from './io.js'
import AutoBrowser from './AutoBrowser.js'

const operatingButtonSelector =
    '.mf-bank-widget-panel:contains("Operating")>div>div>button'

const operatingButtonSelectorNew =
    '.homepage-banking-widget-mfe:contains("Operating") > header > div > div > div > button'

const reserveButtonSelector =
    '.mf-bank-widget-panel:contains("Reserv")>div>div>button'

export default class Xero {
    autoBrowser: AutoBrowser

    constructor(autoBrowser: AutoBrowser) {
        this.autoBrowser = autoBrowser
    }

    async mainPageIs2026Design() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        return await ab.waitForMult([
            $('.xui-pageheading--title'),
            $('.header-and-quick-actions-mfe-MfeContainer'),
        ])
    }

    async switchToOrg(orgName: string) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm(`• Switching to ${orgName}...`)

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

    async openAgedChecks() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm('• Opening aged checks...')

        await ab.click($(operatingButtonSelector))
        await ab.click(
            $('.mf-bank-widget-text-minorlink:contains("Account Transactions")')
        )

        await ab.waitPageLoad()
        await ab.waitFor($('#removeAndRedoButton'))

        await ab.cons('window.Bank.toggleSearchForm();')
        await ab.waitFor($('.search.action.open'))

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

        lm('○ Done!')
    }

    async openReserveAgedTransactions() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm("• Opening resv aged trans'ns...")

        await ab.click(
            $('.mf-bank-widget-panel:contains("Reserv")')
                .not(':contains("CD")')
                .find('div>div>button')
        )
        await ab.click(
            $('.mf-bank-widget-text-minorlink:contains("Account Transactions")')
        )

        await ab.waitPageLoad()
        await ab.waitFor($('#removeAndRedoButton'))

        await ab.cons('window.Bank.toggleSearchForm();')
        await ab.waitFor($('.search.action.open'))

        await ab.type(
            $('#sb_dteEndDate'),
            `${dayjs().subtract(23, 'day').format('MMM D, YYYY')}`
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

        lm('○ Done!')
    }

    async openAgedTransactions(skipNav = false) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm('• Opening aged Transactions...')

        if (skipNav) {
            await ab.cons("clearBankTran(); SubmitAction('Clear');")
            await ab.waitPageLoad()
        } else {
            await ab.click($(operatingButtonSelector))
            await ab.click(
                $(
                    '.mf-bank-widget-text-minorlink:contains("Account Transactions")'
                )
            )
            await ab.waitPageLoad()
            await ab.waitFor($('#removeAndRedoButton'))
            await ab.cons('window.Bank.toggleSearchForm();')
            await ab.waitFor($('.search.action.open'))

            // TODO REMOVE
            await ab.cons('location.reload()')
            await ab.waitPageLoad()
            await ab.cons('window.Bank.toggleSearchForm();')
            await ab.waitFor($('.search.action.open'))
            //
        }

        await ab.cons('jQuery.noConflict()')
        await ab.cons('jQuery.noConflict()')
        await ab.type($('#sb_reconciledStatus_value'), 'Un')
        await ab.click(
            $(
                '#sb_reconciledStatus_suggestions>div>div:contains("Unreconciled")'
            )
        )

        await ab.type(
            $('#sb_dteEndDate'),
            `${dayjs().subtract(7, 'day').format('MMM D, YYYY')}`
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

        lm('○ Done!')
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
