import { getInputData, confirm, lm, lo } from './io.js'

export default class InputLineIterator {
    curLineNum = -1
    curLine = ''
    offerEmptyLineSkip = true

    getInputLine(lineNum) {
        const inputList = (getInputData() || '').split('\n')
        if (!inputList?.length) {
            throw new Error('getInputLine: empty input!')
        }
        if (lineNum < 0) {
            throw new Error(`getInputLine: lineNum < 0!`)
        }
        if (lineNum > inputList.length - 1) {
            throw new Error(`getInputLine: reached end of file!`)
        }
        return (inputList[lineNum] || '').trim()
    }

    async getNextLine() {
        let nextLine

        this.curLineNum += 1
        nextLine = this.getInputLine(this.curLineNum)

        if (!this.offerEmptyLineSkip || (nextLine || '').trim().length)
            return nextLine

        if (await confirm('Empty lines detected. Skip?')) {
            while (!(nextLine || '').trim().length) {
                this.curLineNum += 1
                nextLine = this.getInputLine(this.curLineNum)
            }
        }

        return nextLine
    }

    constructor({ offerEmptyLineSkip } = { offerEmptyLineSkip: true }) {
        this.offerEmptyLineSkip = offerEmptyLineSkip
    }
}
