import {
    select as inquirerSelect,
    search as inquirerSearch,
    Separator as InquirerSeparator,
} from '@inquirer/prompts'

import { readdirSync } from 'fs'

import chalk from 'chalk'
import config from 'config'
import Fuse from 'fuse.js'

const ioFolder = config.get('io.files.ioFolder') as string

const importFileExtension = 'ofx'
const selectCancel = 'cancelSearch.notAFile'

async function selectFolder(): Promise<string> {
    // Get list of folders
    const folderList = readdirSync(ioFolder, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)

    // Map to console-select option list
    const folderSelectOptionList = folderList.map((folderName) => {
        return {
            name: folderName,
            value: `${ioFolder}/${folderName}`,
        }
    })

    // Preset option list
    return await inquirerSelect({
        message: 'Which "ioFiles" folder contains the imports?',
        choices: folderSelectOptionList,
    })
}

type D_SearchOption = {
    name: string
    value: string
    nameForSearch: string
    accountForSearch: string
}

function inquirerSearchCallback({
    searchOptionList,
    searchTerm,
    defaultSearch,
}: {
    searchOptionList: Array<D_SearchOption>
    searchTerm: string
    defaultSearch: string
}) {
    const fuseOptions = {
        isCaseSensitive: false,
        includeScore: true,
        ignoreDiacritics: true,
        shouldSort: true,
        includeMatches: false,
        findAllMatches: true,
        minMatchCharLength: 2,
        // location: 0,
        threshold: 0.2,
        // distance: 100,
        // useExtendedSearch: false,
        ignoreLocation: true,
        ignoreFieldNorm: true,
        // fieldNormWeight: 1,
        keys: ['nameForSearch'],
    }

    if (!(searchTerm || '').trim()) searchTerm = defaultSearch
    if (!(searchTerm || '').trim()) return searchOptionList

    const getResults = (s: string) =>
        new Fuse(searchOptionList, fuseOptions)
            .search(s)
            .map(({ item }) => item)
            .slice(0, 4)

    const resultList = getResults(searchTerm)

    let expandedSearch = false
    if (resultList.length === 0) {
        expandedSearch = true

        fuseOptions.threshold = 0.8
        const searchTermSplit = searchTerm.split(' ')

        while (searchTermSplit.length > 0 && resultList.length === 0) {
            searchTerm = searchTermSplit.join(' ')
            resultList.push(...getResults(searchTerm))

            searchTermSplit.pop()
        }
    }

    sortSameResultsByAccount(resultList)

    if (expandedSearch) {
        resultList.splice(0, 0, {
            name: chalk.redBright('Skip'),
            value: selectCancel,
        } as D_SearchOption)
    } else {
        resultList.splice(1, 0, {
            name: 'Skip',
            value: selectCancel,
        } as D_SearchOption)
    }
    return resultList
}

function sortSameResultsByAccount(resultList: Array<D_SearchOption>) {
    resultList.forEach((item, index) => {
        if (index >= resultList.length - 1) return

        const compareTo = resultList[index + 1]

        if (item.nameForSearch === compareTo.nameForSearch) {
            if (!item.accountForSearch.toLowerCase().includes('operating')) {
                resultList[index] = compareTo
                resultList[index + 1] = item
            }
        }
    })

    return resultList
}

function toPrettySearchOption(fileName: string): D_SearchOption {
    const fileNameSplit = fileName
        .replace(`.${importFileExtension}`, '')
        .split('_')

    const fileOrgName = standardizeOrgSearchTerm(
        fileNameSplit[0]
            .replaceAll(/(?<=[a-z])([A-Z])/g, ' $1') // BrownFoxat => Brown Foxat
            .replaceAll(/(?<=[a-z])(at\s)/g, ' $1') // Brown Foxat => Brown Fox at
    )

    const fileAccountName = fileNameSplit[2].replace(/([a-zA-Z]+).*/, '$1') // Operating123231 => Operating

    const fileNameForDisplay =
        chalk.greenBright(`[${fileOrgName}]`) +
        ' ' +
        (fileAccountName.toLowerCase().includes('operating')
            ? fileAccountName
            : chalk.redBright(fileAccountName))

    return {
        name: fileNameForDisplay,
        nameForSearch: fileOrgName,
        accountForSearch: fileAccountName,
        value: fileName,
    }
}

function standardizeOrgSearchTerm(searchTerm: string) {
    return searchTerm
        .replaceAll(/\s+/g, ' ')
        .replace(/ hoa/i, '')
        .replace(/ \([^\)]+\)/, '')
        .trim()
}

async function selectFile(
    folderPath: string,
    orgName: string
): Promise<string | false> {
    // Get list of filenames
    const fileNameList = readdirSync(folderPath, { withFileTypes: true })
        .filter(
            (entry) =>
                entry.isFile() && entry.name.endsWith(`.${importFileExtension}`)
        )
        .map((entry) => entry.name)

    // Map to option list (Parsing out names)
    const searchOptionList = fileNameList.map((fileName) =>
        toPrettySearchOption(fileName)
    )

    // Present Search
    const selectedFile = await inquirerSearch({
        message: 'Select upload:',
        pageSize: 2,
        source: (searchTerm) =>
            inquirerSearchCallback({
                searchOptionList,
                searchTerm,
                defaultSearch: standardizeOrgSearchTerm(orgName),
            }),
    })

    return selectedFile
}

export { selectCancel, selectFolder, selectFile }
