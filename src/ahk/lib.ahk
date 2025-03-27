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

    return 0
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

    static openMinimalConsole() {
        this.toggleConsole(300)

        winW := 0
        winH := 0
        WinGetPos(, , &winW, &winH, "A")

        if (!scanCursor(60, winH - 30, "U", 800)) {
            this.toggleConsole(300)
            if (!scanCursor(60, winH - 30, "U", 800)) {
                return 0
            }
        }

        Send("{LButton down}")
        MouseMove(60, winH - 165)
        Sleep 50
        Send("{LButton up}")
        return 1
    }

    static cmd(cmd, fromClipboard := true) {

        if (fromClipboard) {
            A_Clipboard := cmd
            Send "^v"
            Sleep 150
        } else {
            Send cmd
            sleep 1000
        }
        Send "{Enter}"
        Sleep 150
    }

    static cmdToClipboard(cmd) {
        cmd := "ctc(" . cmd . ")"
        this.cmd(cmd)
    }

    static prepForCommands() {
        if (!this.openMinimalConsole()) {
            return 0
        }
        this.cmd("allow pasting", true)
        this.cmd(this.jQueryInjector)
        this.cmd(this.clipboardInjector)
        return 1
    }

    static toQuery(q, cmd := "") {
        return "jQuery(`"" . esc(q) . "`").get(0)" . cmd
    }

    static copyQ(q) {
        this.cmdToClipboard(this.toQuery(q, ".textContent"))
    }

    static clickQ(q) {
        this.cmd(this.toQuery(q, ".click()"))
    }
}

class Xero {
    static prep() {
        if !(!Browser.prepForCommands()) {
            return 0
        }
        return 1
    }

    static switchToOrg(orgName := "") {
        Browser.clickQ(".xnav-appbutton--body")
        Browser.clickQ("[data-name=`"xnav-changeorgbutton`"]")
    }
}
