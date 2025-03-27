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

class Browser {
    static jQueryInjector :=
        "var script = document.createElement('script'); script.src = `"https://code.jquery.com/jquery-3.7.1.min.js`"; document.getElementsByTagName('head')[0].appendChild(script);"

    static toggleConsole() {
        Send "{Ctrl down}{Shift down}j{Shift up}{Ctrl up}"
        Sleep 600
    }
    static executeConsoleSingle(js, timeOut := "5000") {
        this.toggleConsole()
        Send "setTimeout(()=>`{"
        Send js
        Send "`}," . timeout . "){Enter}"
        Sleep 200
        this.toggleConsole()
    }

    static injectJQuery() {
        this.executeConsoleSingle(this.jQueryInjector)
    }
}

class Xero {
    static openOrg(orgName) {

    }
}
