#Requires AutoHotkey v2.0

^1:: {
    sw(1)
}

^2:: {
    sw(2)

}

^3:: {
    sw(3)
}

^4:: {
    sw(4)
}

sw(numTabs) {
    Send "{alt down}"
    Sleep 30
    loop numTabs {
        Send "{tab}"
        Sleep 80
    }
    Send "{alt up}"
    Sleep 100
}

^!+z:: ExitApp
^!+x:: Reload