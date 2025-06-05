import { cloneDeep } from 'lodash-es'

function listSum(list: Array<number>): number {
    return list.reduce((prev, cur) => prev + cur, 0)
}

function combinationSumRecurse(
    goal: number,
    sourceList: Array<number>,
    maxDelta: number = 0.003,
    startIndex: number = 0,
    usedList: Array<number> = []
): false | Array<number> {
    const prevSum = listSum(usedList)

    if (prevSum > goal || startIndex >= sourceList.length) return false

    for (let i = startIndex; i < sourceList.length; i++) {
        const newList = [...cloneDeep(usedList), sourceList[i]]

        if (
            listSum(newList) >= goal - maxDelta &&
            listSum(newList) <= goal + maxDelta
        ) {
            return newList
        }

        const newCheck = combinationSumRecurse(
            goal,
            sourceList,
            maxDelta,
            i + 1,
            newList
        )

        if (!!newCheck) return newCheck
    }

    return false
}

const src = [
    362.55, 182.7, 83.61, 185.37, 186.01, 183.47, 76.5, 319.81, 93.27, 1182.36,
    258.53, 76.5, 990.84, 80.77, 157.27, 172.74, 617.37, 184.35, 180.09, 535.58,
    76.5,
]

const goal = 1690.53

console.log(combinationSumRecurse(goal, src))
