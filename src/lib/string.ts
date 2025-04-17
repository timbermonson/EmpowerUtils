import { compact, zipObject } from 'lodash-es'

function combineSpaces(str: string) {
    return str.replaceAll(/( )+/g, ' ')
}

function prepAddressSearchTerm(
    str: string,
    {
        removeStreetNum = true,
        removeSingleLetters = true,
    }: { removeStreetNum?: boolean; removeSingleLetters?: boolean } = {
        removeStreetNum: true,
        removeSingleLetters: true,
    }
) {
    let output = normalizeCardinalDirection(
        str
            .toLowerCase()
            .split('#')[0] // remove appt numbers
            .replaceAll(/[^A-ZA-z0-9\s]/g, '') // remove anything that isn't letters, numbers, or spaces
            .trim()
            .replaceAll(/( )+/g, ' ') // combine spaces
            .trim()
            .replace(/^(north|south|east|west)\s+/, '') // remove leftover direction from beginning of street address
    )

    if (removeSingleLetters) {
        output = output.replaceAll(/(^|(?<=\s))\w((?=\s)|$)/g, '') // remove any single letter bordered by spaces/starts
    }
    if (removeStreetNum) {
        output = output.replace(/^\s*\d+\s+(?=[\w\d])/, '') // remove street number
    }

    return output
}

function nameReverse(fullName: string, separator = ', ') {
    const nameList = compact(fullName.split(' '))

    const lastName = nameList[nameList.length - 1]
    const beginning = nameList.slice(0, nameList.length - 1).join(' ')

    const reversedName = `${lastName}${separator}${beginning}`

    return reversedName
}

function normalizeCardinalDirection(addr: string) {
    return addr
        .replaceAll(/west/gi, 'w')
        .replaceAll(/east/gi, 'e')
        .replaceAll(/north/gi, 'n')
        .replaceAll(/south/gi, 's')
}

function capitalizeName(fullName: string) {
    const nameList = combineSpaces(fullName).toLowerCase().split(' ')
    let capitalizedName = ''

    nameList.forEach((name) => {
        capitalizedName +=
            ' ' + `${name.charAt(0)}`.toUpperCase() + name.slice(1)
    })

    return capitalizedName.trim()
}

type JQueryTemplater = {
    has: (selector: string) => JQueryTemplater
    not: (selector: string) => JQueryTemplater
    find: (selector: string) => JQueryTemplater
    css: (selector: string) => JQueryTemplater

    get: (index: number) => JQueryTemplater

    parent: () => JQueryTemplater

    length: JQueryTemplater
    innerHTML: JQueryTemplater
    outerHTML: JQueryTemplater
    textContent: JQueryTemplater
}

function jqTemplaterFactory(entryFunctionName: string) {
    if (!entryFunctionName) {
        throw new Error(
            'jqTemplaterFactory constructor requires a jQuery entry function name!'
        )
    }

    const stringParamFnList = ['has', 'not', 'find', 'css']
    const numberParamFnList = ['get']
    const noParamFnList = ['parent']
    const propertyList = ['length', 'innerHTML', 'outerHTML', 'textContent']

    function esc(inp) {
        return inp.replaceAll('"', '\\"')
    }

    function validate(
        fnName: string,
        param: any,
        requiredParamType: string
    ): void {
        if (typeof param !== requiredParamType) {
            throw new Error(
                `jQuery.${fnName} requires param of type ${requiredParamType}! Received type  ${typeof param} with value ${JSON.stringify(
                    param
                )}.`
            )
        }
    }

    function zipMap<T>(arr: string[], callback: (arrVal: string) => any) {
        return zipObject(
            arr,
            arr.map((arrVal) => callback(arrVal))
        )
    }

    return function $(baseQuery: string, suffix = ''): JQueryTemplater {
        const jQueryObj = {
            toString: () =>
                `${entryFunctionName}("${esc(baseQuery)}")${suffix}`,

            ...zipMap<string>(stringParamFnList, (fnName) => (selector) => {
                validate(fnName, selector, 'string')
                return $(baseQuery, `${suffix}.${fnName}("${esc(selector)}")`)
            }),

            ...zipMap(numberParamFnList, (fnName) => (selector) => {
                validate(fnName, selector, 'number')
                return $(baseQuery, `${suffix}.${fnName}(${selector})`)
            }),

            ...zipMap(
                noParamFnList,
                (fnName) => () => $(baseQuery, `${suffix}.${fnName}()`)
            ),
        }

        propertyList.forEach((propName) =>
            Object.defineProperty(jQueryObj, propName, {
                get: () => {
                    return $(baseQuery, `${suffix}.${propName}`)
                },
            })
        )

        return jQueryObj as JQueryTemplater
    }
}

export {
    JQueryTemplater,
    jqTemplaterFactory,
    capitalizeName,
    combineSpaces,
    nameReverse,
    normalizeCardinalDirection,
    prepAddressSearchTerm,
}
