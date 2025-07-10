import Fuse from 'fuse.js'
import { select, search } from '@inquirer/prompts'

import { getInputData, confirm, logSep } from './io.js'

export default class InputLineIterator implements I_InputIterator<string> {
    #curLineNum = -1
    #offerEmptyLineSkip = true

    back() {
        if (this.#curLineNum < 0) {
            this.#curLineNum = -1
            return
        }
        this.#curLineNum -= 1
    }

    getItemList() {
        return (getInputData() || '').split('\n').map((l) => l.trim())
    }

    getItem(lineNum: number) {
        const inputList = this.getItemList()

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

    hasNext() {
        return this.#curLineNum + 1 < this.getItemList().length
    }

    async getNextItem() {
        let nextLine: string

        this.#curLineNum += 1
        nextLine = this.getItem(this.#curLineNum)

        const lineIsEmpty = () => !(nextLine || '').trim().length

        if (lineIsEmpty() && this.#offerEmptyLineSkip) {
            if (await confirm('Empty lines detected. Skip?')) {
                while (lineIsEmpty()) {
                    this.#curLineNum += 1
                    nextLine = this.getItem(this.#curLineNum)
                }
            }
        }

        return nextLine
    }

    async offerSkipSearch(): Promise<void> {
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
            if (!(searchTerm || '').trim().length) return lineSearchoptionList
            return fuse.search(searchTerm).map(({ item }) => item)
        }

        const selectedIndex: number = await search({
            message: 'Type a search for your desired line:',
            source: inquirerSearchCallback,
        })

        this.#curLineNum = selectedIndex - 1
    }

    constructor({ offerEmptyLineSkip } = { offerEmptyLineSkip: true }) {
        this.#offerEmptyLineSkip = offerEmptyLineSkip
    }
}
