class TimeoutError extends Error {
    constructor(message, options) {
        super(message, options)
        this.name = 'TimeoutError'
    }
}

const wait = (time) => new Promise((resolve) => setTimeout(resolve, time))

const doWhileUndefined = async (timeout, interval, callback) => {
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
