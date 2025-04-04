import { wait } from './etc.js'

export default class Xero {
    #autoBrowser
    constructor(autoBrowser) {
        this.autoBrowser = autoBrowser
    }

    async switchToOrg(orgName) {
        const { autoBrowser: ab } = this

        const orgChangeBtn = 'j{[data-name="xnav-changeorgbutton"]}'
        // Get the menu dropdown open & reset
        if (!(await ab.has(orgChangeBtn))) {
            await ab.click([
                'j{.xnav-appbutton}.n{.xnav-appbutton-is-active}',
                'j{.xnav-orgsearchcontainer > button.xnav-icon-orgsearchclear}',
            ])
        }

        // Type name, select, wait for pageload
        await ab.click(orgChangeBtn)

        await ab.w('j{.xnav-orgsearch--input}')
        await ab.type('j{input.xnav-orgsearch--input}', orgName)

        await wait(500)

        await ab.click(
            `j{ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a}`
        )

        await ab.waitPageLoad()
    }

    async navToImports() {
        const { autoBrowser: ab } = this

        await ab.click(
            'j{.mf-bank-widget-panel:contains("Operating"):contains("2894")>div>div>button}'
        )
        await ab.click('j{a:contains("Import a Statement")}')
    }
}
