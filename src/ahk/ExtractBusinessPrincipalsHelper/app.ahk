#Requires AutoHotkey v2.0

inputPath := "../../../ioFiles/input.txt"
outputPath := "../../../ioFiles/output.txt"

FileInput := ""
BusinessList := ""
FirstBusiness := ""
CurPrincipalListParsed := ""

getInput()

^1:: {
    searchNextBusinessName()
}

^2:: {
    returnFromSearchTable()
}

^3:: {
    returnFromRecord()
    Sleep 500
    searchNextBusinessName()
}

^0:: {
    clearSearch()
}

^5:: {
    scrollToPrincipalTable()
}

^4:: {
    global
    CurPrincipalListRaw := getPrincipals()
    if (StrLen(CurPrincipalListRaw) > 1) {
        CurPrincipalListParsed := StrReplace(StrReplace(StrReplace(CurPrincipalListRaw, "`r", ""), "`n", "<newline>"),
        "`t",
        "<tab>")
    }
    MouseMove 0, 0
}

^+q:: {
    global
    addOut(CurPrincipalListParsed)
    addOut("`t")
    addOut(FirstBusiness)
    addOut(" `n")
    BusinessList.RemoveAt(1)
    FileDelete(inputPath)
    FileAppend(StrJoin(BusinessList, "`n"), inputPath)
    Sleep 100
    getInput()
    CurPrincipalListParsed := ""
}

^q:: {
    addOut(" `t")
    addOut(FirstBusiness)
    addOut(" `n")
    BusinessList.RemoveAt(1)
    FileDelete(inputPath)
    FileAppend(StrJoin(BusinessList, "`n"), inputPath)
    Sleep 100
    getInput()
}

searchNextBusinessName() {
    clearSearch()
    enterBusinessName(FirstBusiness)
    Sleep 100
    Send "{Enter 2}"

    ind := waitForImages(["bizSearchNoResults.png", "bizResultsTable.png"], 200, 8000)

    if (ind != 2) {
        if (ind = 1) {
            Sleep(500)
            SetKeyDelay 100
            SendEvent "{Tab}{Enter}"
            waitForImages(["bizSearchContains.png"], 100)
            Sleep 200
            putCursorAtEnd()
        }
        return
    }

    searchClickImage("bizResultsTable.png")
    Send "{Tab 2}"
}

getPrincipals() {
    list := getPrincipalTable()

    if (hasImage("bizRecordPrincipalsNext.png")) {
        searchClickImage("bizRecordPrincipalsNext.png", 5, 5)
        waitForImages(["bizRecordPrincipals.png"], 100)
        Sleep 500
        list .= "`n" . getPrincipalTable()
    }

    return list
}

getPrincipalTable() {
    if (!scrollToPrincipalTable()) {
        MsgBox("Not Found!")
        return
    }

    topX := -1
    topY := -1
    ImageSearch(&topX, &topY, 0, 0, 2000, 2000, "*n100 " . A_ScriptDir . "/images/" . "bizRecordPrincipals.png")

    bottomX := -1
    bottomY := -1
    foundTableBottom := ImageSearch(&bottomX, &bottomY, 0, topY, 2000, 2000, "*n100 " . A_ScriptDir . "/images/" .
        "bizRecordPrincipalsEnd.png")
    if (!foundTableBottom) {
        return
    }

    MouseMove topX + 5, topY + 45
    Send "{LButton down}"
    MouseMove bottomX, bottomY - 50
    Send "{LButton up}"
    A_Clipboard := ""
    Sleep 300
    Send "^c"
    Sleep 300
    Send "^c"
    Sleep 300
    return A_Clipboard
}

scrollToPrincipalTable() {
    found := false
    loop 6 {
        if (principalTableIsVisible()) {
            found := true
            break
        }
        Send "{WheelDown 3}"
        Sleep 100
    }
    return found
}

principalTableIsVisible() {
    topX := -1
    topY := -1
    foundTableTop := ImageSearch(&topX, &topY, 0, 0, 2000, 2000, "*n100 " . A_ScriptDir . "/images/" .
        "bizRecordPrincipals.png")
    if (!foundTableTop) {
        return false
    }

    bottomX := -1
    bottomY := -1
    foundTableBottom := ImageSearch(&bottomX, &y, 0, topY, 2000, 2000, "*n200 " . A_ScriptDir . "/images/" .
        "bizRecordPrincipalsEnd.png")

    if (!foundTableBottom) {
        return false
    }

    return true
}

addOut(out) {
    FileAppend(out, outputPath)
}

getInput() {
    global
    FileInput := FileRead(inputPath, "`n UTF-8")
    BusinessList := StrSplit(FileInput, "`n")
    FirstBusiness := Trim(BusinessList[1])
}

clearSearch() {
    Send "+{Tab}"
    Sleep 200
    searchClickImage("bizSearchTextbox.png", 5, -12)
    searchClickImage("bizSearchButtonSplit.png", 100, 10)
    searchClickImage("bizSearchTextbox.png", 5, -12)
}

putCursorAtEnd() {
    searchClickImage("bizSearchTextbox.png", 10, 20)
    Send "{End}"
}

returnFromRecord() {
    Send "{Ctrl down}{End}{Ctrl up}"
    Sleep(500)
    x := -1
    y := -1
    topY := -1
    firstButtons := ImageSearch(&x, &topY, 0, 0, 2000, 2000, "*n200 " . A_ScriptDir . "/images/" .
        "bizRecordReturnOtherButtons.png")

    exitButtons := ImageSearch(&x, &y, 0, topY + 20, 2000, 2000, "*n200 " . A_ScriptDir . "/images/" .
        "bizRecordReturn.png")
    MouseMove x + 240, y
    MouseClick
}

returnFromSearchTable() {
    Send "{Ctrl down}{End}{Ctrl up}"
    Sleep(500)
    searchClickImage("bizSearchResultsReturn.png", 200, 10)
    waitForImages(["bizSearchContains.png"], 100, 10000)
    putCursorAtEnd()
}

enterBusinessName(name) {
    if (!searchClickImage("bizSearchContains.png", 5, 5))
        return
    Sleep(100)
    if (!searchClickImage("bizSearchTextbox.png", 10, 20))
        return

    SetKeyDelay 5
    A_Clipboard := name
    Send "^v"
}

modifyVariable(x) {
    %x% := 555
}

waitForImages(imageNameList, interval := 200, timeout := 2000) {
    start := A_TickCount

    while (A_TickCount - start <= timeout) {
        for ind, imageName in imageNameList {
            if (hasImage(imageName))
                return ind
        }

        Sleep interval
    }

    return -1
}

hasImage(imageName, xBound := 2000, yBound := 2000) {
    x := -1
    y := -1
    return ImageSearch(&x, &y, 0, 0, xBound, yBound, "*n100 " . A_ScriptDir . "/images/" . imageName)
}

searchClickImage(imageName, xOffset := 0, yOffset := 0, xBound := 2000, yBound := 2000) {
    x := -1
    y := -1
    found := ImageSearch(&x, &y, 0, 0, xBound, yBound, "*n100 " . A_ScriptDir . "/images/" . imageName)
    if (!found) {
        MsgBox("Not found!")
        return false
    }

    MouseMove x + xOffset, y + yOffset
    MouseClick
    return true
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

^!+z:: ExitApp
^!+x:: Reload