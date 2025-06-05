import FastPriorityQueue from 'fastpriorityqueue'

type T_TreeNode = {
    k: number
    v: number
}

/**
 * Generates pefect power numbers, as quickly as possible.
 *
 * @param n
 * @returns The first (n) perfect powers, in order.
 */
function getNPerfectPowers(n: number): Array<number> {
    if (n < 1) throw new Error()
    const max = n ** 2
    const resultList = new Array<number>(n)
    resultList[0] = 1

    const powerTree = new FastPriorityQueue(
        (a: T_TreeNode, b: T_TreeNode) => a.v < b.v
    )

    for (let i = 2; i <= n; i++) {
        powerTree.add({ k: i, v: i ** 2 })

        do {
            const next = powerTree.peek() as any
            resultList[i - 1] = next.v
            next.v *= next.k

            if (next.v > max) {
                powerTree.poll()
                continue
            }

            powerTree.replaceTop(next)
        } while (resultList[i - 1] === resultList[i - 2])
    }

    return resultList
}

function getAveragedTime(numPowers: number, numAverages: number): number {
    const result = Array<number>(numAverages)
    const startTime = Date.now()

    for (let i = 0; i < numAverages; i++) {
        // altering the "numpowers" by 1 per-run to make sure duplicate runs don't get optimized away
        // also pushing them onto an array for the same reason
        result[i] = getNPerfectPowers(numPowers + i)[numPowers + i - 1]
    }

    const duration = (Date.now() - startTime) / numAverages

    console.log(`Perfect power #${numPowers}: ${result[0]}`)
    console.log(`Time taken: ${duration}ms`)

    return duration
}

getAveragedTime(1000000, 60)
