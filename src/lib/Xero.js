import { wait } from './etc.js'

export default class Xero {
    #autoBrowser
    constructor(autoBrowser) {
        this.autoBrowser = autoBrowser
    }

    async switchToOrg(orgName) {
        const { autoBrowser: ab } = this

        // Get the menu dropdown open & reset
        await ab.f(
            'j{.xnav-appbutton}.n{.xnav-appbutton-is-active}',
            async (q) => await ab.j(`${q}.click()`),
            'j{.xnav-orgsearchcontainer:has(button.xnav-icon-orgsearchclear)}',
            async (q) =>
                await ab.j(`${q}.f{button.xnav-icon-orgsearchclear}.click()`),
            'j{.xnav-appbutton.xnav-appbutton-is-active}',
            () => {}
        )

        // Type name, select, wait for pageload
        await ab.j('j{[data-name="xnav-changeorgbutton"]}.click()')

        await ab.w('j{.xnav-orgsearch--input}')
        await ab.j(
            `j{input.xnav-orgsearch--input}.g{0}.value = ${JSON.stringify(
                orgName
            )}`
        )
        await ab.j(
            `j{input.xnav-orgsearch--input}.g{0}.dispatchEvent(new KeyboardEvent("keyup"))`
        )
        const orgSearchFirst =
            'ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a'

        await wait(500)

        await ab.f(
            `j{${orgSearchFirst}}`,
            async (q) => await ab.j(`${q}.g{0}.click()`)
        )

        await ab.waitPageLoad()
    }

    async navToImports() {
        const { autoBrowser: ab } = this

        await ab.f(
            'j{.mf-bank-widget-panel:contains("Operating"):contains("2894")>div>div>button}',
            async (q) => await ab.j(`${q}.click()`)
        )
        await ab.f(
            'j{a:contains("Import a Statement")}',
            async (q) => await ab.j(`${q}.g{0}.click()`)
        )
    }
}
