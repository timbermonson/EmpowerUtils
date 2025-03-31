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

        if (!Browser.existsQ(".xnav-appmenu--body-is-open")) {
            Browser.clickQ(".xnav-appbutton--body")
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
}
