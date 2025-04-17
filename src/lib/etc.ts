class TimeoutError extends Error {
    constructor(message?: string) {
        super(message)
        this.name = 'TimeoutError'
    }
}

const wait = (time: number) =>
    new Promise((resolve) => setTimeout(resolve, time))

const doWhileUndefined = async (
    timeout: number,
    interval: number,
    callback: (millisPassed: number, attemptNum: number) => any
) => {
    const startTime = Date.now()
    let millisPassed = 0
    let attemptNum = 0

    while (millisPassed < timeout) {
        const returnValue = await callback(millisPassed, attemptNum)

        if (returnValue !== undefined) {
            return returnValue
        } else {
            await wait(interval)
        }

        attemptNum += 1
        millisPassed = Date.now() - startTime
    }

    throw new TimeoutError()
}

export { doWhileUndefined, TimeoutError, wait }
