import dayjs from 'dayjs'
import { wait } from './etc.js'
import { lm } from './io.js'

const operatingButton =
    'j{.mf-bank-widget-panel:contains("Operating")>div>div>button}'

export default class Xero {
    autoBrowser
    constructor(autoBrowser) {
        this.autoBrowser = autoBrowser
    }

    async switchToOrg(orgName) {
        const { autoBrowser: ab } = this
        lm(`• Switching to ${orgName}...`)

        await ab.cons('location.reload()')
        await ab.waitPageLoad()

        const orgChangeBtn = 'j{[data-name="xnav-changeorgbutton"]}'

        if (!(await ab.has(orgChangeBtn))) {
            await ab.click([
                'j{.xnav-appbutton}.n{.xnav-appbutton-is-active}',
                'j{.xnav-orgsearchcontainer > button.xnav-icon-orgsearchclear}',
            ])
        }

        // Type name, select, wait for pageload
        await ab.click(orgChangeBtn)
        await ab.type('j{input.xnav-orgsearch--input}', orgName)

        await wait(500)

        await ab.click(
            `j{ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a}`
        )
        await ab.waitPageLoad()

        await ab.w(operatingButton)
        lm('○ Done!')
    }

    async openImports() {
        const { autoBrowser: ab } = this
        lm('• Navigating to imports...')

        await ab.click(operatingButton)
        await ab.click('j{a:contains("Import a Statement")}')
        await ab.w(
            'j{.xui-pageheading--titlewrapper:contains("Import bank transactions")}'
        )
        lm('○ Done!')
    }

    async openAgedChecks() {
        const { autoBrowser: ab } = this
        lm('• Opening aged checks...')

        await ab.click(operatingButton)
        await ab.click(
            'j{.mf-bank-widget-text-minorlink:contains("Account Transactions")}'
        )

        await ab.waitPageLoad()
        await ab.w('j{#removeAndRedoButton}')

        await ab.cons('window.Bank.toggleSearchForm();')
        await ab.w('j{.search.action.open}')

        await ab.cons('jQuery.noConflict()')
        await ab.cons('jQuery.noConflict()')
        await ab.type('j{#sb_reconciledStatus_value}', 'Un')
        await ab.click(
            'j{#sb_reconciledStatus_suggestions>div>div:contains("Unreconciled")}'
        )

        await ab.type(
            'j{#sb_dteEndDate}',
            `${dayjs().subtract(90, 'day').format('MMM D, YYYY')}`
        )

        await ab.type('j{#sb_reconciledStatus_value}', 'Un')
        await ab.cons('jQuery.noConflict()')
        await ab.type('j{#sb_reconciledStatus_value}', 'Un')
        await wait(500)
        await ab.click(
            'j{#sb_reconciledStatus_suggestions>div>div:contains("Unreconciled")}'
        )

        await ab.click('j{#sbSubmit_BT}')
        await ab.waitPageLoad()
        await ab.w('j{#bankTransactions}')

        await lm('○ Done!')
    }
}
