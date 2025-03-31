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
