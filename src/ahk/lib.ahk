#Requires AutoHotkey v2.0

scanCursor(xStart, yStart, dir, dist, cursorOverride := 0) {
    CoordMode("Mouse", "Window")
    stepDistance := 5
    curs := ""
    xStep := 0
    yStep := 0
    switch (StrUpper(dir)) {
        case "U":
            yStep := -stepDistance
            curs := "SizeNS"
        case "D":
            yStep := stepDistance
            curs := "SizeNS"
        case "L":
            xStep := -stepDistance
            curs := "SizeWE"
        case "R":
            xStep := stepDistance
            curs := "SizeWE"
        default:
            Throw ValueError("aaaa")
    }
    if (cursorOverride != 0) {
        curs := cursorOverride
    }

    x := xStart
    y := yStart

    loop dist / stepDistance {
        MouseMove(x, y)
        Sleep 1

        if (A_Cursor = curs) {
            return 1
        }
        x += xStep
        y += yStep
    }

    return
}

esc(str) {
    return StrReplace(str, "`"", "\`"")
}

class Browser {
    static clipboardInjector :=
        "function ctc(text) {{}    const input = document.createElement('input');    input.value = text;    document.body.appendChild(input);    input.select();    document.execCommand('copy');    document.body.removeChild(input);{}}"

    static jQueryInjector :=
        "var script = document.createElement('script'); script.src = `"https://code.jquery.com/jquery-3.7.1.min.js`"; document.getElementsByTagName('head')[0].appendChild(script);"

    static toggleConsole(wait := 600) {
        Send "{Ctrl down}{Shift down}j{Shift up}{Ctrl up}"
        Sleep wait
    }

    static setupConsole() {
        this.toggleConsole(300)

        winW := 0
        winH := 0
        WinGetPos(, , &winW, &winH, "A")

        if (!scanCursor(60, winH - 30, "U", 800)) {
            this.toggleConsole(300)
            if (!scanCursor(60, winH - 30, "U", 800)) {
                return
            }
        }

        Send("{LButton down}")
        MouseMove(60, winH - 165)
        Sleep 50

        Send("{LButton up}")
        Sleep 50

        MouseMove(60, winH - 60)
        Send "{LButton 2}"
        return 1
    }

    static cmd(cmd, fromClipboard := true, useClipboardForErrors := true) {

        if (useClipboardForErrors) {
            cmd := "try{{}" . cmd . "{}}catch(e){{}ctc(`"err`"){}}"
        }
        if (fromClipboard) {
            A_Clipboard := cmd
            Send "^v"
            Sleep 150
            Send "{Enter 3}"
            Sleep 150
        } else {
            Send cmd
            sleep 300
            Send "{Escape 2}"
            Send "{Enter 5}"
        }
    }

    static cmdToClipboard(cmd, useClipboard := true) {
        cmd := "ctc(" . cmd . ")"
        this.cmd(cmd, useClipboard, useClipboard)
    }

    static setupFunctions() {
        this.cmd("allow pasting", false, false)
        this.cmd("allow pasting", false, false)

        A_Clipboard := ""
        while (A_Clipboard != "$clipboardConfirm") {
            this.cmd(this.clipboardInjector, , false)
            this.cmdToClipboard("`"$clipboardConfirm`"", false)
        }

        A_Clipboard := ""
        while (A_Clipboard != "function") {
            this.cmd(this.jQueryInjector, , false)
            this.cmdToClipboard("typeof jQuery", false)
        }

        return 1
    }

    static setup() {
        if (!this.setupConsole()) {
            return
        }

        this.setupFunctions()
        return 1
    }

    static waitForPageChange(timeout := 5000) {
        this.cmdToClipboard("`"$clipboardConfirm`"", false)
        this.cmdToClipboard("`"$clipboardConfirm`"", false)
        start := A_TickCount

        while (A_TickCount - start <= timeout) {
            A_Clipboard := ""

            this.cmdToClipboard("`"$clipboardConfirm`"", false)
            this.cmdToClipboard("`"$clipboardConfirm`"", false)

            if (A_Clipboard != "`"$clipboardConfirm`"") {
                this.setupFunctions()
                return 1
            }
        }

        return
    }

    static toQuery(q, cmd := "") {
        return this.toQueryPlain(q) . ".get(0)" . cmd
    }

    static toQueryPlain(q, cmd := "") {
        replacedQ := RegExReplace(esc(q), "i)\^h\[([^]]+)\]", "`").has(`"$1`").find(`"")

        return fullQuery := "jQuery(`"" . replacedQ . "`")" . cmd
    }

    static copyQ(q) {
        this.cmdToClipboard(this.toQuery(q, ".textContent"))
    }

    static clickQ(q) {
        this.cmd(this.toQuery(q, ".click()"))
    }

    static typeQ(q, input) {
        this.cmd(this.toQuery(q, ".value = `"") . input . "`"")

        this.cmd(this.toQuery(q, ".dispatchEvent(new KeyboardEvent(`"keyup`"))"))
    }

    static waitForQ(q, timeout := 4000, interval := 100, callback := -1, callbackParam := -1) {
        start := A_TickCount

        while (A_TickCount - start <= timeout) {
            Browser.cmdToClipboard(Browser.toQueryPlain(q,
                ".length"))

            if (A_Clipboard = "1") {
                if (callback != -1) {
                    if (callbackParam = -1) {
                        callbackParam := q
                    }
                    callback.Call(this, callbackParam)
                }
                return 1
            }
            sleep interval
        }

        return
    }
}

class Xero {
    static prep() {
        if !(!Browser.setup()) {
            return
        }
        return 1
    }

    static switchToOrg(orgName) {
        Browser.clickQ(".xnav-appbutton--body")
        Browser.clickQ("[data-name=`"xnav-changeorgbutton`"]")

        Browser.typeQ("[title=`"Search organizations`"]", orgName)
        sleep(500)
        if (!Browser.waitForQ("ol[role=`"navigation`"].xnav-verticalmenu > li:nth-child(1) > a", , , Browser.clickQ)) {
            return
        }

        if (!Browser.waitForPageChange()) {
            return
        }

        if (!Browser.waitForQ(
            "div.mf-bank-widget-panel^h[a:contains(`"Operating:`")].mf-bank-widget-touchtarget")) {
            return
        }
        MsgBox("Done!")
    }
}
