import dayjs from 'dayjs'
import { wait } from './etc.js'
import { lm } from './io.js'

const operatingButtonSelector =
    '.mf-bank-widget-panel:contains("Operating")>div>div>button'

export default class Xero {
    autoBrowser
    constructor(autoBrowser) {
        this.autoBrowser = autoBrowser
    }

    async switchToOrg(orgName) {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm(`• Switching to ${orgName}...`)

        await ab.cons('location.reload()')
        await ab.waitPageLoad()

        const orgChangeBtnQuery = $('[data-name="xnav-changeorgbutton"]')

        if (!(await ab.has(orgChangeBtnQuery))) {
            await ab.click([
                $('.xnav-appbutton').not('.xnav-appbutton-is-active'),
                $('.xnav-orgsearchcontainer > button.xnav-icon-orgsearchclear'),
            ])
        }

        // Type name, select, wait for pageload
        await ab.click(orgChangeBtnQuery)
        await ab.type($('input.xnav-orgsearch--input'), orgName)

        await wait(500)

        await ab.click(
            $('ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a')
        )
        await ab.waitPageLoad()

        await ab.waitFor($('.xui-pageheading--title'))
        await ab.waitFor($(operatingButtonSelector))
        lm('○ Done!')
    }

    async openImports() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this
        lm('• Navigating to imports...')

        await ab.click($(operatingButtonSelector))
        await ab.click($('a:contains("Import a Statement")'))
        await ab.waitFor(
            $(
                '.xui-pageheading--titlewrapper:contains("Import bank transactions")'
            )
        )
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

        // TODO REMOVE
        await ab.cons('location.reload()')
        await ab.waitPageLoad()
        await ab.cons('window.Bank.toggleSearchForm();')
        await ab.waitFor($('.search.action.open'))
        //

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
            `${dayjs().subtract(90, 'day').format('MMM D, YYYY')}`
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
}
