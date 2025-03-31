#Requires AutoHotkey v2.0

#Include etc.ahk

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

    static waitClickQ(qList) {
        if (!IsObject(qList)) {
            qList := [qList]
        }

        return this.waitForQ(qList, , , this.clickQ)
    }

    static existsQ(q) {
        Browser.cmdToClipboard(Browser.toQueryPlain(q,
            ".length"))

        if (A_Clipboard = "1") {
            return 1
        }
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
        this.cmd(this.toQuery(q, ".dispatchEvent(new KeyboardEvent(`"keyup`"))"))
    }

    static waitForQ(qList, timeout := 8000, interval := 100, callback := -1, callbackParam := -1) {
        start := A_TickCount

        if (!IsObject(qList)) {
            qList := [qList]
        }

        while (A_TickCount - start <= timeout) {
            for index, q in qList {
                Browser.cmdToClipboard(Browser.toQueryPlain(q,
                    ".length"))

                if (A_Clipboard = "1") {
                    if (callback != -1) {
                        if (callbackParam = -1) {
                            callbackParam := q
                        }
                        callback.Call(this, callbackParam)
                    }
                    return index
                }
            }
            sleep interval
        }

        throw TargetError()
    }
}
