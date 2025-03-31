#Requires AutoHotkey v2.0

#include "../lib.ahk"

inputPath := "./input.txt"
FileInput := ""
OrgList := ""
FirstOrg := ""

getInput()

^1:: {
    searchNextOrgName()
}

^2:: {
    testFn()
}

^!q:: {
    if (OrgList.length < 1) {
        return
    }
    OrgList.RemoveAt(1)
    FileDelete(inputPath)
    FileAppend(StrJoin(OrgList, "`n"), inputPath)
    Sleep 100
    getInput()
}

^!+z:: ExitApp
^!+x:: Reload

testFn() {
    Xero.setup()
    Xero.switchToOrg("Haven")
}

searchNextOrgName() {
    searchClickImage("orgselect.png", 20, 10)
    Sleep 100
    searchClickImage("orgselectselected.png", 20, 80)
    Sleep 100
    Send FirstOrg
    Sleep 1500
    Send "{Down}{Down}{Enter}"
    Sleep 750
    waitForImages(["areaTR.png"], 100, 8000)
    Sleep 500
    waitForImages(["dot.png"], 100, 8000)
    searchClickImage("areaTR.png", -40, 50)
    Sleep 200
    Send "{Down}{Enter}"
    Sleep 1000
    switch (waitForImages(["searchBtn.png", "searchBtnAlt.png"], 100, 8000)) {
        case 1:
            searchClickImage("searchBtn.png", 5, 10)
        case 2:
            searchClickImage("searchBtnAlt.png", 10, 10)
        default:
            return
    }
    Sleep 100
    Send "{Tab 6}"
    Sleep 200
    searchClickImage("textboxTLSelected.png", 75, 10)
    Sleep 200
    Send "{Ctrl down}{Left 3}{Ctrl Up}"
    Sleep 200
    Send "{Enter}"
    Sleep 300
    Send "{Tab}"
    Sleep 200
    Send "Un"
    Sleep 200
    Send "{Enter 2}"

}

waitForImages(imageNameList, interval := 200, timeout := 2000) {
    start := A_TickCount

    while (A_TickCount - start <= timeout) {
        for ind, imageName in imageNameList {
            if (hasImage(imageName) = 1)
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

getInput() {
    global
    FileInput := FileRead(inputPath, "`n UTF-8")
    OrgList := StrSplit(FileInput, "`n")
    if (orgList.length < 2) {
        return
    }
    FirstOrg := Trim(OrgList[1])
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
