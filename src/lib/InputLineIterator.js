import Fuse from 'fuse.js'

import { getInputData, confirm, logSep } from './io.js'
import { select, search } from '@inquirer/prompts'

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

    async offerSkipSearch() {
        logSep()
        const optionSelect = await select({
            message: 'Where would you like to start in the input file?',
            choices: [
                {
                    name: 'First Line',
                    value: 0,
                },
                {
                    name: 'Search & Skip to later line',
                    value: 1,
                },
            ],
        })
        if (optionSelect !== 1) return

        const lineSearchoptionList = getInputData()
            .split('\n')
            .map((line, index) => {
                return { value: index, name: line.trim() }
            })
            .filter(({ name }) => name.length > 0)

        const fuseOptions = {
            isCaseSensitive: false,
            includeScore: true,
            ignoreDiacritics: true,
            shouldSort: true,
            includeMatches: false,
            findAllMatches: true,
            minMatchCharLength: 2,
            // location: 0,
            threshold: 0.35,
            // distance: 100,
            // useExtendedSearch: false,
            ignoreLocation: false,
            ignoreFieldNorm: false,
            // fieldNormWeight: 1,
            keys: ['name'],
        }

        const fuse = new Fuse(lineSearchoptionList, fuseOptions)
        const inquirerSearchCallback = async (searchTerm) => {
            if (!(searchTerm || '').trim().length) return []
            return fuse.search(searchTerm).map(({ item }) => item)
        }

        const selectedIndex = await search({
            message: 'Type a search for your desired line:',
            source: inquirerSearchCallback,
        })

        this.curLineNum = selectedIndex - 1
    }

    constructor({ offerEmptyLineSkip } = { offerEmptyLineSkip: true }) {
        this.offerEmptyLineSkip = offerEmptyLineSkip
    }
}
