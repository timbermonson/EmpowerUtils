export function nameCommaReverse(fullName) {
    const nameList = fullName.split(' ')
    const reversedName = `${nameList[nameList.length - 1]}, ${nameList.slice(
        1
    )}`
    return reversedName
}

export function l(inp) {
    console.log(JSON.stringify(inp, null, 2))
}

export function el(error, message) {
    throw new Error(`${message}, Error msg: ${error.message}`)
}
