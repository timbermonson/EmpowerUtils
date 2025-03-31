#Requires AutoHotkey v2.0

ScanCursor(xStart, yStart, dir, dist, cursorOverride := 0) {
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
            throw ValueError("ScanCursor: Invalid Direction!")
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

StrJoin(arr, sep) {
    if (arr.Length = 0) {
        return ""
    }

    result := arr[1]

    for ind, str in arr {
        if (ind = 1) {
            continue
        }

        result .= sep
        result .= str
    }

    return result
}

esc(str) {
    return StrReplace(str, "`"", "\`"")
}

class FileLineReader {
    filePath := ""
    lineList := []
    firstLine := ""

    __New(filePath) {
        this.filePath := filePath
        this.readInput()
    }

    readInput() {
        fileContents := FileRead(this.filePath, "UTF-8")

        this.lineList := StrSplit(fileContents, "`n")
        if (this.lineList.length < 2) {
            MsgBox("AAA")
            return
        }
        this.firstLine := Trim(this.lineList[1])
    }

    removeFirstLine() {
        if (this.lineList.length < 1) {
            return
        }

        FileDelete(this.filePath)
        this.lineList.RemoveAt(1)
        FileAppend(StrJoin(this.lineList, "`n"), this.filePath)
        Sleep 100
        this.readInput()
    }
}

class Browser {
    static clipboardError := "$clipboardError"

    static clipboardInjector :=
        "function ctc(text) {{}    const input = document.createElement('input');    input.value = text;    document.body.appendChild(input);    input.select();    document.execCommand('copy');    document.body.removeChild(input);{}}"

    static jQueryInjector :=
        "var script = document.createElement('script'); script.src = `"https://code.jquery.com/jquery-3.7.1.min.js`"; document.getElementsByTagName('head')[0].appendChild(script);"

    static toggleConsole(wait := 600) {
        Send "{Ctrl down}{Shift down}j{Shift up}{Ctrl up}"
        Sleep wait
    }

    static setupConsole(initialToggle := true) {
        if (initialToggle) {
            this.toggleConsole(300)
        }

        winW := 0
        winH := 0
        WinGetPos(, , &winW, &winH, "A")

        if (!ScanCursor(60, winH - 30, "U", 800)) {
            this.toggleConsole(300)
            if (!ScanCursor(60, winH - 30, "U", 800)) {
                throw TargetError()
            }
        }

        Send("{LButton down}")
        MouseMove(60, winH - 165)
        Sleep 50

        Send("{LButton up}")
        Sleep 50

        MouseMove(60, winH - 60)
        Send "{LButton 2}"
    }

    static cmd(cmd, fromClipboard := true, useClipboardForErrors := true) {

        if (fromClipboard) {
            if (useClipboardForErrors) {
                cmd := "try{" . cmd . "}catch(e){ctc(`"" . this.clipboardError . "`")}"
            }
            A_Clipboard := cmd
            Send "^v"
        } else {
            SetKeyDelay(0)

            SendEvent cmd
            SendEvent "{Escape 2}"
        }
        Sleep 75
        Send "{Enter 3}"
        Sleep 75
    }

    static cmdToClipboard(cmd, useClipboard := true) {
        cmd := "ctc(" . cmd . ")"
        this.cmd(cmd, useClipboard, useClipboard)
    }

    static setupFunctions() {
        A_Clipboard := ""
        while (A_Clipboard != "$clipboardConfirm") {
            this.cmd(this.clipboardInjector, , false)
            this.cmdToClipboard("`"$clipboardConfirm`"", false)
        }

        this.cmd("allow pasting", false, false)
        this.cmd("allow pasting", false, false)

        A_Clipboard := ""
        while (A_Clipboard != "function") {
            this.cmd(this.jQueryInjector)
            this.cmdToClipboard("typeof jQuery")
        }
    }

    static setup() {
        this.setupConsole()
        this.setupFunctions()
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
                return
            }
        }

        throw TargetError()
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
        if (A_Clipboard = this.clipboardError) {
            throw TargetError()
        }
    }

    static waitClickQ(q) {
        this.waitForQ(q, , , this.clickQ)
    }

    static clickQ(q) {
        this.cmd(this.toQuery(q, ".click()"))
        if (A_Clipboard = this.clipboardError) {
            throw TargetError()
        }
    }

    static typeQ(q, input) {
        this.cmd(this.toQuery(q, ".value = `"") . input . "`"")

        this.cmd(this.toQuery(q, ".dispatchEvent(new KeyboardEvent(`"keyup`"))"))
    }

    static waitForQ(q, timeout := 8000, interval := 100, callback := -1, callbackParam := -1) {
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
                return
            }
            sleep interval
        }

        throw TargetError()
    }
}

class Xero {
    static dashOpAccBtn :=
        "div.mf-bank-widget-panel^h[h2:contains(`"Operating:`"):contains(`"2894`")].mf-bank-widget-touchtarget"

    static setup() {
        Browser.setup()
    }

    static switchToOrg(orgName) {
        Browser.setupConsole(false)

        Browser.clickQ(".xnav-appbutton--body")
        Browser.waitClickQ("[data-name=`"xnav-changeorgbutton`"]")

        Browser.typeQ("[title=`"Search organizations`"]", orgName)
        sleep(500)

        Browser.waitClickQ("ol[role=`"navigation`"].xnav-verticalmenu > li:nth-child(1) > a")
        Browser.waitForPageChange()

        Browser.waitForQ(this.dashOpAccBtn)
    }

    static openOperatingImports() {
        Browser.clickQ(this.dashOpAccBtn)
        Browser.waitClickQ("a.mf-bank-widget-text-minorlink:contains(`"Import a Statement`")")
        Browser.waitForPageChange()
    }
}
