const wait = (time) => new Promise((resolve) => setTimeout(resolve, time))

class Xero {
    #ws
    constructor(wrappedWebsocket) {
        this.ws = wrappedWebsocket
    }

    async switchToOrg(orgName) {
        const { ws } = this
        const { j, w, findAndDo: f } = ws

        // Get the menu dropdown open & reset
        await f(
            'j{.xnav-appbutton}.n{.xnav-appbutton-is-active}',
            async (q) => await j(`${q}.click()`),
            'j{.xnav-orgsearchcontainer:has(button.xnav-icon-orgsearchclear)}',
            async (q) =>
                await j(`${q}.f{button.xnav-icon-orgsearchclear}.click()`),
            'j{.xnav-appbutton.xnav-appbutton-is-active}',
            () => {}
        )

        // Type name, select, wait for pageload
        await j('j{[data-name="xnav-changeorgbutton"]}.click()')

        await w('j{.xnav-orgsearch--input}')
        await j(
            `j{input.xnav-orgsearch--input}.g{0}.value = ${JSON.stringify(
                orgName
            )}`
        )
        await j(
            `j{input.xnav-orgsearch--input}.g{0}.dispatchEvent(new KeyboardEvent("keyup"))`
        )
        const orgSearchFirst =
            'ol[role="navigation"].xnav-verticalmenu > li:nth-child(1) > a'
        await wait(500)
        await f(
            `j{${orgSearchFirst}}`,
            async (q) => await j(`${q}.g{0}.click()`)
        )

        await ws.waitLoad()
    }

    async navToImports() {
        const { ws } = this
        const { j, w, findAndDo: f } = ws

        await f(
            'j{.mf-bank-widget-panel:contains("Operating"):contains("2894")>div>div>button}',
            async (q) => await j(`${q}.click()`)
        )
        await f(
            'j{a:contains("Import a Statement")}',
            async (q) => await j(`${q}.g{0}.click()`)
        )
    }
}

export { Xero }
