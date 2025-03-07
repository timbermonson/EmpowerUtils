# EmpowerUtils

A collection of utils written by Timber Monson for automating office tasks at Empowered HOA and Advanced Community Services.

Basic usage guides are below, and a developer guide is at `./src/README.md` (TODO)

# Initial Install

**nvm**

- Different for windows/macOS, google is your friend here.
- macOS' nvm should auto-install the correct version when you use `cd`
- otherwise, ensure you've installed the node.JS version specified in `./src/.nvmrc` by running `node -v`
- confirm `npm` has also been installed by running `npm --version`

**npm packages**

- Set your cwd with `cd ./src` (do this before doing anything else, really)
- Clear out old packages with `rm -Force node_modules` on Windows, or `rm -rf node_modules` on mac.
- run `npm i` to install all packages.

# Address Scraper

**This app**:

- _Intakes:_ A list of full names, formatted as below.
- _Does:_ A search for every person in every supported county (via real-estate parcel searches).
- _Outputs:_ For each county, a list of each person's address results.
- _Console-Logs:_ A "score" for each county. If a county has results for 4 inputted people, its score is 4. If none, its score is 0, and so on. Having multiple results for a single person does not increase the score.

### Input Format:

Names must be formatted like: `Title Firstname Lastname, Title Firstname Middlename Lastname`

- Titles are ignored, but must be present.
- Names must be separated by commas.
- Middlenames are optional, but if present, are always included in the search.

- Extra spaces are ignored.
- Duplicates are ignored.

Valid Examples:
`Director John G Smith, Treasurer Timber M Monson, President George Washington`
`D John     Smith, T Timber Monson   , P George Washington `

### Setup:

- `cd ./src`
- In `src/ioFiles`, create a `input.txt`.
- Put your name list into `input.txt`

### Execution:

- Ensure `cd ./src` has been run
- Run app with `npm run addr`
- Output will appear in `src/ioFiles/output.txt`

### Extra Options:

- `npm run addr json` Outputs a newline-less json blob of the results (with a bit more information)
- `num run addr both` Outputs both.

# Business Principal Extractor

This app is designed to help with copying business principals from Utah's business-search into the above-app's required format.

- _Intakes:_ (from `src/ioFiles/input.txt`) A click-drag copy-paste of the "Business Principals" table on the Utah Business Search website.
- _Outputs:_ (into `src/ioFiles/output.txt`) The list of business principals, formatted as above & with titles shortened.

**Execution**

- Ensure `cd ./src` has been run
- Run app with `npm run ebp`
- Output will appear in `src/ioFiles/output.txt`
