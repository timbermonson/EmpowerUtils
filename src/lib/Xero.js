import { wait } from './etc.js'
import { lm } from './io.js'

const operatingButton =
    'j{.mf-bank-widget-panel:contains("Operating"):contains("2894")>div>div>button}'

export default class Xero {
    #autoBrowser
    constructor(autoBrowser) {
        this.autoBrowser = autoBrowser
    }

    async switchToOrg(orgName) {
        lm(`Switching to ${orgName}...`)
        const { autoBrowser: ab } = this

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
        lm('Done!')
    }

    async navToImports() {
        lm('Navigating to imports...')
        const { autoBrowser: ab } = this
        await ab.click(operatingButton)
        await ab.click('j{a:contains("Import a Statement")}')
        await ab.w(
            'j{.xui-pageheading--titlewrapper:contains("Import bank transactions")}'
        )
        lm('Done!')
    }
}
