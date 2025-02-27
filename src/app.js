const axios = require('axios')
const name = 'Rhem%2C+Sandra'
const url = `http://apps.saltlakecounty.gov/assessor/new/resultsMain.cfm?itemname=${name}&street_Num=&street_dir=&street_name=&street_type=&parcelid=&propType=&yearbuilt=`

axios.get(url).then((resp) => {
    // TODO: Get resp synchronously, then 3 possible states: success, multiple results, err
    const street = `${resp.data}`.match(
        /Address<\/td>(.+)right;\"\>(.+)<\/td>/
    )[2]
    const city = `${resp.data}`.match(
        /Tax District location<\/td>(.+)right;\"\>(.+)<\/td>/
    )[2]

    console.log(`Street: ${street}, City: ${city}`)
})
