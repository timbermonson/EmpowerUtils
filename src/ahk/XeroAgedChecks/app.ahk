#Requires AutoHotkey v2.0
#SingleInstance

#include "../lib/index.ahk"

inputPath := "./input.txt"

inputFile := FileLineReader(inputPath)

^1:: {
    Xero.setup()
}

^3:: {
    if (StrLen(inputFile.firstLine) < 1) {
        return
    }
    Xero.switchToOrg(inputFile.firstLine)
}

^2:: {
    if (StrLen(inputFile.firstLine) < 1) {
        return
    }
    Xero.switchToOrg(inputFile.firstLine)
    Xero.openOperatingImports()
}

^!q:: {
    inputFile.removeFirstLine()
}

^!+z:: ExitApp
^!+x:: Reload

; waitForImages(imageNameList, interval := 200, timeout := 2000) {
;     start := A_TickCount

;     while (A_TickCount - start <= timeout) {
;         for ind, imageName in imageNameList {
;             if (hasImage(imageName) = 1)
;                 return ind
;         }

;         Sleep interval
;     }

;     return -1
; }

; hasImage(imageName, xBound := 2000, yBound := 2000) {
;     x := -1
;     y := -1
;     return ImageSearch(&x, &y, 0, 0, xBound, yBound, "*n100 " . A_ScriptDir . "/images/" . imageName)
; }

; searchClickImage(imageName, xOffset := 0, yOffset := 0, xBound := 2000, yBound := 2000) {
;     x := -1
;     y := -1
;     found := ImageSearch(&x, &y, 0, 0, xBound, yBound, "*n100 " . A_ScriptDir . "/images/" . imageName)
;     if (!found) {
;         MsgBox("Not found!")
;         return false
;     }

;     MouseMove x + xOffset, y + yOffset
;     MouseClick
;     return true
; }
