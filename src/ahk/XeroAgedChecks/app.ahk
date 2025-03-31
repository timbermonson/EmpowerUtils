#Requires AutoHotkey v2.0
#SingleInstance

#include "../lib/index.ahk"

inputPath := "./input.txt"

inputFile := FileLineReader(inputPath)

^1:: {
    Xero.setup()
}

^3:: {
    Xero.openAgedChecks()
}

^2:: {
    if (StrLen(inputFile.firstLine) < 1) {
        return
    }
    Xero.switchToOrg(inputFile.firstLine)
    ; Xero.openAgedChecks()
}

^!q:: {
    inputFile.removeFirstLine()
}

^!+z:: ExitApp
^!+x:: Reload