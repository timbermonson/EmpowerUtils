/**
 * Returns the sum of all values in a number array.
 *
 * @param list
 * @returns the sum of all elements of (list).
 */
function listSum(list: Array<number>): number {
    return list.reduce((prev, cur) => prev + cur, 0)
}

/**
 * Searches a set of numbers for a subset that sums to the goal value.
 *
 * @param goal The goal value to search for subset-sums of.
 * @param sourceSet The parent set to construct a subset from.
 * @param maxDelta The maximum a subset-sum may differ from the goal value (needed for floating-point imprecision)
 * @param startIndex Used in recursion. Stores the starting index of the current nested-call search.
 * @param usedList Used in recursion. Stores the current subset as it is being built.
 * @returns the subset that sums to (goal), or false if none could be found.
 */
function combinationSumRecurse(
    goal: number,
    sourceSet: Array<number>,
    maxDelta: number = 0.00001, // Needed for floating-point math
    startIndex: number = 0,
    usedList: Array<number> = []
): false | Array<number> {
    const curSum = listSum(usedList)

    if (curSum > goal || startIndex >= sourceSet.length) return false

    if (Math.abs(goal - curSum) <= maxDelta) {
        return usedList
    }

    for (let i = startIndex; i < sourceSet.length; i++) {
        const newCheck = combinationSumRecurse(
            goal,
            sourceSet,
            maxDelta,
            i + 1,
            [...usedList, sourceSet[i]]
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
