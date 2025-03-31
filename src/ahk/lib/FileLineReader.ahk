#Requires AutoHotkey v2.0

#Include etc.ahk

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
