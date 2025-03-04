import axios from 'axios'

export function nameCommaReverse(fullName) {
    const nameList = fullName.split(' ')

    const lastName = nameList[nameList.length - 1]
    const beginning = nameList.slice(0, nameList.length - 1).join(' ')

    const reversedName = `${lastName}, ${beginning}`

    return reversedName
}

export function l(inp) {
    console.log(JSON.stringify(inp, null, 2))
}

export function lm(inp) {
    console.log(inp)
}

export function el(error, message) {
    throw new Error(`${message}, Error msg: ${error.message}`)
}

export const encodeUrl = encodeURIComponent

export const SearchStatus = Object.freeze({
    ERROR: 'error',
    FOUND_MULTIPLE: 'found_multiple',
    FOUND_SINGLE: 'found_single',
    NONE: 'none',
})

export async function getWebpage(baseUrl, { queryParamList }) {
    let urlAppendage = ''
    if (queryParamList && queryParamList.length) {
        urlAppendage = `?${queryParamList.join('&')}`
    }

    const url = `${baseUrl}${urlAppendage}`
    const { data: response } = await axios.get(url)

    return response
}
