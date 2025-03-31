#Requires AutoHotkey v2.0

#Include Browser.ahk
#Include etc.ahk

class Xero {
    static dashOpAccBtn :=
        "div.mf-bank-widget-panel^h[h2:contains(`"Operating:`"):contains(`"2894`")].mf-bank-widget-touchtarget"
    static orgSearchNone := ".xnav-orgsearch--message:contains(`"No results found.`")"
    static orgSearchFirst := "ol[role=`"navigation`"].xnav-verticalmenu > li:nth-child(1) > a"

    static setup() {
        Browser.setup()
    }

    static switchToOrg(orgName) {
        Browser.setupConsole(false)

        if (!Browser.existsQ("button.xnav-appbutton-is-active")) {
            Browser.clickQ("span.xnav-appbutton--text")
        }

        if (Browser.existsQ(".xnav-orgsearch--input")) {
            Browser.clickQ(".xnav-icon-orgsearchclear")
        }

        Browser.waitClickQ("[data-name=`"xnav-changeorgbutton`"]")
        Browser.typeQ("[title=`"Search organizations`"]", orgName)
        Browser.waitForQ(".xnav-loader-wrapper")
        if (Browser.waitForQ([this.orgSearchNone, this.orgSearchFirst]) = 1) {
            throw Error("No results for " . orgName)
        }

        Browser.waitClickQ(this.orgSearchFirst)
        Browser.waitForPageChange()

        Browser.waitForQ(this.dashOpAccBtn)
    }

    static openOperatingImports() {
        Browser.clickQ(this.dashOpAccBtn)
        Browser.waitClickQ("a.mf-bank-widget-text-minorlink:contains(`"Import a Statement`")")
        Browser.waitForPageChange()
    }

    static openAgedChecks() {
        Browser.clickQ(this.dashOpAccBtn)
        Browser.waitClickQ("a.mf-bank-widget-text-minorlink:contains(`"Account Transactions`")")
        Browser.waitForPageChange()
        Browser.cmd("window.Bank.toggleSearchForm()")
        if (A_Clipboard = Browser.clipboardError) {
            return
        }
        Browser.waitClickQ("#sb_reconciledStatus_toggle")
        Browser.waitClickQ("#sb_reconciledStatus_suggestions>div>div:contains(`"Unreconciled`")")

        Browser.waitClickQ("#endDate^f[img]")
        Sleep 200

        Browser.cmd(Browser.toQuery("div.x-date-menu^n[.x-hide-offsets]td.x-date-left > a",
            ".dispatchEvent(new Event(`"mousedown`"))") . ";" . Browser.toQuery(
                "div.x-date-menu^n[.x-hide-offsets]td.x-date-left > a",
                ".dispatchEvent(new Event(`"mouseout`"))"))
        Sleep 150
        Browser.cmd(Browser.toQuery("div.x-date-menu^n[.x-hide-offsets]td.x-date-left > a",
            ".dispatchEvent(new Event(`"mousedown`"))") . ";" . Browser.toQuery(
                "div.x-date-menu^n[.x-hide-offsets]td.x-date-left > a",
                ".dispatchEvent(new Event(`"mouseout`"))"))
        Sleep 150
        Browser.cmd(Browser.toQuery("div.x-date-menu^n[.x-hide-offsets]td.x-date-left > a",
            ".dispatchEvent(new Event(`"mousedown`"))") . ";" . Browser.toQuery(
                "div.x-date-menu^n[.x-hide-offsets]td.x-date-left > a",
                ".dispatchEvent(new Event(`"mouseout`"))"))
        Sleep 150
        Browser.waitClickQ("td.x-date-selected > a")
        Browser.waitClickQ("#sbSubmit_BT")
        Browser.waitForPageChange()

        dateHeader := "#bankTransactions>thead>tr>td:nth-child(2)"

        if (Browser.waitForQ([dateHeader . "^n[.selected]", dateHeader . ".selected"]) = 1) {
            Browser.clickQ(dateHeader " > a")
            Browser.waitForPageChange()
        }
        if (Browser.waitForQ([dateHeader . " > span.icons.ascend", dateHeader . ">span.icons.descend"]) = 1) {
            Browser.clickQ(dateHeader . " > a")
            Browser.waitForPageChange()
        }
        return
    }
}
