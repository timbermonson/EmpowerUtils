export function nameCommaReverse(fullName) {
    const nameList = fullName.split(' ')
    const reversedName = `${nameList[nameList.length - 1]}, ${nameList.slice(
        1
    )}`
    return reversedName
}
