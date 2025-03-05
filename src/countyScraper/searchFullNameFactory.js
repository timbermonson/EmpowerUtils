import { SearchStatus, lm } from '../utils/lib.js'

export default function searchFullNameFactory({
    getFullNameWebpageFactory,
    getUniqIdWebpageFactory,
    parseMultiResultUniqIdList,
    parseSearchStatus,
    parseSingleResultAddress,
}) {
    async function searchUniqId(id) {
        lm(`Getting address for unique identifier ${id}...`)
        const getUniqIdWebpage = getUniqIdWebpageFactory(id)
        let status = ''
        let addressList = []
        let resp

        try {
            resp = await getUniqIdWebpage()

            status = parseSearchStatus(resp)
            switch (status) {
                case SearchStatus.FOUND_SINGLE:
                    lm('Found!')
                    addressList = [parseSingleResultAddress(resp)]
                    break
                case SearchStatus.FOUND_MULTIPLE:
                    lm('Found Mulitple! Skipping...')
                    addressList = []
                    break
                case SearchStatus.NONE:
                    lm('No results.')
                    addressList = []
                    break
                case SearchStatus.ERROR:
                    lm('Search Failed!')
                    addressList = []
                    break
                default:
                    addressList = []
                    break
            }

            return { status, addressList }
        } catch (e) {
            lm(e.message)
            return { status: SearchStatus.ERROR, addressList: [] }
        }
    }

    async function searchFullName(fullName) {
        lm(`Getting address for ${fullName}...`)
        const getFullNameWebpage = getFullNameWebpageFactory(fullName)
        let status = ''
        let addressList = []
        let resp

        try {
            resp = await getFullNameWebpage()
            status = parseSearchStatus(resp)

            switch (status) {
                case SearchStatus.FOUND_SINGLE:
                    lm('Found!')
                    addressList = [parseSingleResultAddress(resp)]
                    break
                case SearchStatus.FOUND_MULTIPLE:
                    lm('Found Mulitple! Iterating...')
                    const uniqIdList = parseMultiResultUniqIdList(resp)
                    addressList = []
                    for (const uniqId of uniqIdList) {
                        const uniqIdResult = await searchUniqId(uniqId)
                        if (uniqIdResult.status === SearchStatus.FOUND_SINGLE) {
                            addressList.push(uniqIdResult.addressList[0])
                        }
                    }
                    break
                case SearchStatus.NONE:
                    lm('No results.')
                    addressList = []
                    break
                case SearchStatus.ERROR:
                    lm('Search Failed!')
                    addressList = []
                    break
                default:
                    addressList = []
                    break
            }

            return { fullName, status, addressList }
        } catch (e) {
            lm(e.message)
            return { fullName, status: SearchStatus.ERROR, addressList: [] }
        }
    }
    return searchFullName
}
