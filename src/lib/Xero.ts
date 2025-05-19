import { XeroClient } from 'xero-node'
import config from 'config'
import dayjs from 'dayjs'
import process from 'process'

import { wait } from './etc.js'
import { lm } from './io.js'
import AutoBrowser from './AutoBrowser.js'

const xeroClientId: string = config.get('xero.clientId')
const xeroClientSecret: string = config.get('xero.clientSecret')
const xeroClientCallbackUrl: string = config.get('xero.oauthRedirectUrl')

const operatingButtonSelector =
    '.mf-bank-widget-panel:contains("Operating")>div>div>button'

export default class Xero {
    autoBrowser: AutoBrowser
    apiClient: XeroClient

    constructor(autoBrowser: AutoBrowser) {
        this.autoBrowser = autoBrowser
        this.apiClient = new XeroClient({
            clientId: xeroClientId,
            clientSecret: xeroClientSecret,
            redirectUris: [xeroClientCallbackUrl],
            scopes: 'accounting.contacts'.split(' '),
            state: 'returnPage=my-sweet-dashboard', // custom params (optional)
            httpTimeout: 3000, // ms (optional)
            clockTolerance: 10, // seconds (optional)
        })
    }

    async clientLogin() {
        // TODO: finish
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
            apiClient: client,
        } = this
        const consentUrl = await client.buildConsentUrl()
        console.log(consentUrl)
        // await ab.cons(`window.open('${consentUrl}')`)
        // const tokenSet = await client.apiCallback(xeroClientCallbackUrl)
        // console.log(JSON.stringify(tokenSet, null, 2))
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

        const orgChangeBtnQuery = $('[data-name="xnav-changeorgbutton"]')

        if (!(await ab.has(orgChangeBtnQuery))) {
            await ab.clickFirstVisible([
                $('.xnav-appbutton').not('.xnav-appbutton-is-active'),
                $('.xnav-orgsearchcontainer > button.xnav-icon-orgsearchclear'),
            ])
        }

        // Type name, select, wait for pageload
        await ab.click(orgChangeBtnQuery)
        await ab.type($('input.xnav-orgsearch--input'), orgName)

        await wait(650)

        const orgSelectFirstResult = $(
            'ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a'
        )

        await ab.waitFor(orgSelectFirstResult)
        while (await ab.has(orgSelectFirstResult)) {
            await ab.click(orgSelectFirstResult)
            await wait(750)
        }

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

    async openAgedTransactions() {
        const {
            autoBrowser: ab,
            autoBrowser: { $ },
        } = this

        lm('• Opening aged Transactions...')

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
